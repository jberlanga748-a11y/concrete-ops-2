#!/usr/bin/env node
import fs from "node:fs/promises";
import fsSync from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import net from "node:net";

import { chromium } from "playwright";

const rootDir = process.cwd();
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const outputDir = path.join(rootDir, "outputs", "apex-live-voice-body-qa", timestamp);
const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "apex-live-voice-body-"));
const sqliteFile = path.join(dataDir, "app-data.sqlite");
const port = await findFreePort();
const baseUrl = `http://127.0.0.1:${port}`;
const serverLogPath = path.join(outputDir, "server.log");
const progressLogPath = path.join(outputDir, "progress.log");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function mark(step) {
  const line = `${new Date().toISOString()} ${step}\n`;
  await fs.mkdir(outputDir, { recursive: true });
  await fs.appendFile(progressLogPath, line);
  console.log(step);
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

async function waitForReady() {
  let last = "";
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/ready`, { signal: AbortSignal.timeout(2_000) });
      last = `${response.status} ${await response.text().catch(() => "")}`;
      if (response.ok) return;
    } catch (error) {
      last = error?.message || String(error);
    }
    await sleep(500);
  }
  throw new Error(`Local Apex HQ server did not become ready. ${last}`);
}

function setTempDemoOperatorAccess() {
  const database = new DatabaseSync(sqliteFile);
  try {
    const result = database.prepare("UPDATE users SET operator_access = 1 WHERE lower(email) = lower(?)").run("demo.admin@apexhq.app");
    if (!result.changes) throw new Error("Demo admin user was not seeded in the temp QA database.");
  } finally {
    database.close();
  }
}

async function loginContext(context) {
  const response = await context.request.post(`${baseUrl}/api/auth/login`, {
    data: { email: "demo.admin@apexhq.app", password: "apexdemo123" },
  });
  if (!response.ok()) throw new Error(`QA login failed: ${response.status()} ${await response.text()}`);
}

function browserVoiceHarness() {
  if (window.__apexVoiceBodyQaInstalled) return;
  window.__apexVoiceBodyQaInstalled = true;
  window.__apexVoiceBodyQa = {
    spoken: [],
    recognitionStarts: 0,
    recognitionStops: 0,
    emittedTranscripts: [],
    bodyStates: [],
    recognitionInstance: null,
    emitTranscript(text) {
      const transcript = String(text || "").trim();
      if (!transcript || !this.recognitionInstance?.onresult) return false;
      const result = [{ transcript, confidence: 0.98 }];
      result.isFinal = true;
      this.emittedTranscripts.push(transcript);
      this.recognitionInstance.onresult({ resultIndex: 0, results: [result] });
      return true;
    },
  };

  class FakeSpeechSynthesisUtterance {
    constructor(text) {
      this.text = String(text || "");
      this.lang = "en-US";
      this.rate = 1;
      this.pitch = 1;
      this.volume = 1;
      this.voice = null;
      this.onstart = null;
      this.onend = null;
      this.onerror = null;
    }
  }

  class FakeSpeechRecognition {
    constructor() {
      this.continuous = false;
      this.interimResults = false;
      this.lang = "en-US";
      this.maxAlternatives = 1;
      this.onstart = null;
      this.onresult = null;
      this.onerror = null;
      this.onend = null;
      window.__apexVoiceBodyQa.recognitionInstance = this;
    }

    start() {
      window.__apexVoiceBodyQa.recognitionStarts += 1;
      setTimeout(() => this.onstart?.(), 20);
    }

    stop() {
      window.__apexVoiceBodyQa.recognitionStops += 1;
      setTimeout(() => this.onend?.(), 20);
    }
  }

  Object.defineProperty(window, "SpeechSynthesisUtterance", {
    value: FakeSpeechSynthesisUtterance,
    configurable: true,
  });
  Object.defineProperty(window, "SpeechRecognition", {
    value: FakeSpeechRecognition,
    configurable: true,
  });
  Object.defineProperty(window, "webkitSpeechRecognition", {
    value: FakeSpeechRecognition,
    configurable: true,
  });
  Object.defineProperty(window, "speechSynthesis", {
    value: {
      speaking: false,
      pending: false,
      paused: false,
      getVoices() {
        return [{ name: "Apex Desktop Voice", lang: "en-US" }];
      },
      cancel() {
        this.speaking = false;
        this.pending = false;
      },
      resume() {
        this.paused = false;
        return Promise.resolve();
      },
      speak(utterance) {
        const text = String(utterance?.text || "");
        window.__apexVoiceBodyQa.spoken.push(text);
        this.speaking = true;
        setTimeout(() => utterance?.onstart?.(), 25);
        setTimeout(() => {
          this.speaking = false;
          utterance?.onend?.();
        }, Math.min(1400, Math.max(520, text.length * 10)));
      },
    },
    configurable: true,
  });
}

async function waitForApexRoom(page) {
  await mark("opening /apex-control-room");
  await page.goto(`${baseUrl}/apex-control-room`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /^APEX$/i }).waitFor({ timeout: 30_000 });
  await page.getByPlaceholder("Ask Apex anything...").waitFor({ timeout: 30_000 });
  await mark("apex room loaded");
  await page.evaluate(() => {
    if (window.__apexBodyStateSampler) return;
    window.__apexBodyStateSampler = setInterval(() => {
      const body = document.querySelector('[aria-label="Apex digital body"]');
      const state = body?.getAttribute("data-voice-state") || "";
      if (state && window.__apexVoiceBodyQa?.bodyStates.at(-1) !== state) {
        window.__apexVoiceBodyQa.bodyStates.push(state);
      }
    }, 50);
  });
}

async function clickFirstVisible(page, selectorDescription, locators) {
  for (const locator of locators) {
    const count = await locator.count().catch(() => 0);
    for (let index = 0; index < count; index += 1) {
      const candidate = locator.nth(index);
      if (await candidate.isVisible().catch(() => false)) {
        await mark(`clicking ${selectorDescription}`);
        await candidate.click();
        return true;
      }
    }
  }
  return false;
}

async function runDesktopPass(browser) {
  await mark("creating browser context");
  const context = await browser.newContext({
    baseURL: baseUrl,
    viewport: { width: 1440, height: 920 },
  });
  await mark("browser context created");
  await context.grantPermissions(["microphone"], { origin: baseUrl });
  await mark("microphone permission granted");
  await context.addInitScript(browserVoiceHarness);
  await mark("voice harness installed");
  const page = await context.newPage();
  await mark("page created");
  page.setDefaultTimeout(15_000);
  const logs = [];
  const failedRequests = [];
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) logs.push(`${message.type()}: ${message.text()}`);
  });
  page.on("pageerror", (error) => logs.push(`pageerror: ${error.message}`));
  page.on("requestfailed", (request) => {
    if (!request.url().startsWith(baseUrl)) return;
    failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText || "failed"}`);
  });

  await mark("logging in");
  await loginContext(context);
  await waitForApexRoom(page);

  await mark("running sound check");
  await page.getByRole("button", { name: /Sound Check/i }).first().click();
  await page.waitForFunction(() => (window.__apexVoiceBodyQa?.spoken || []).some((text) => /Apex audio is on/i.test(text)), null, { timeout: 10_000 });
  await page.waitForFunction(() => document.querySelector('[aria-label="Apex digital body"]')?.getAttribute("data-voice-state") === "speaking", null, { timeout: 10_000 });
  const soundCheckScreenshotPath = path.join(outputDir, "desktop-sound-check-speaking.png");
  await page.screenshot({ path: soundCheckScreenshotPath, fullPage: true });
  await mark("sound check screenshot captured");
  await mark("waiting for natural listening after sound check");
  await page.waitForFunction(() => {
    const text = document.body.textContent || "";
    const state = document.querySelector('[aria-label="Apex digital body"]')?.getAttribute("data-voice-state") || "";
    return /Voice Open|Apex is listening|Live captions active/i.test(text) || state !== "speaking";
  }, null, { timeout: 8_000 }).catch(() => {});
  let voiceOpen = await page.evaluate(() => /Voice Open|Apex is listening|Live captions active/i.test(document.body.textContent || ""));
  if (!voiceOpen) {
    const interruptedSoundCheck = await clickFirstVisible(page, "Interrupt Voice", [
      page.getByRole("button", { name: /Interrupt Voice/i }),
      page.locator("button").filter({ hasText: /Interrupt/i }),
    ]);
    if (interruptedSoundCheck) await page.waitForTimeout(500);
    voiceOpen = await page.evaluate(() => /Voice Open|Apex is listening|Live captions active/i.test(document.body.textContent || ""));
  }
  if (!voiceOpen) {
    const wokeApex = await clickFirstVisible(page, "Wake, Resume, or Recover Voice", [
      page.getByRole("button", { name: /Wake Apex|Resume Voice|Recover Voice/i }),
      page.locator('[aria-label="Apex focus controls"] button').filter({ hasText: /Wake Apex|Resume Voice|Wake|Resume|Recover Voice/i }),
      page.locator("button").filter({ hasText: /Wake Apex|Resume Voice|Wake|Resume|Recover Voice/i }),
    ]);
    if (!wokeApex) {
      const buttonLabels = await page.evaluate(() => Array.from(document.querySelectorAll("button"))
        .map((button) => (button.textContent || "").replace(/\s+/g, " ").trim())
        .filter(Boolean));
      await page.screenshot({ path: path.join(outputDir, "after-sound-check-no-wake.png"), fullPage: true });
      throw new Error(`Could not find a visible voice wake/recover button after sound check. Visible buttons: ${buttonLabels.join(" | ")}`);
    }
  }
  await mark("waiting for voice open");
  await page.waitForFunction(() => /Voice Open|Apex is listening|Live captions active/i.test(document.body.textContent || ""), null, { timeout: 20_000 });
  await mark("emitting fake voice transcript");
  await page.evaluate(() => window.__apexVoiceBodyQa.emitTranscript("what's blocked today"));
  await page.waitForFunction(() => {
    const qa = window.__apexVoiceBodyQa || {};
    const body = document.body.textContent || "";
    return qa.spoken?.length >= 2 && /what's blocked today/i.test(body) && !/Apex is thinking/i.test(body);
  }, null, { timeout: 45_000 });
  const voiceTurnScreenshotPath = path.join(outputDir, "desktop-voice-turn-talkback.png");
  await page.screenshot({ path: voiceTurnScreenshotPath, fullPage: true });
  await mark("voice turn screenshot captured");
  await mark("waiting for post-answer listening handoff");
  await page.waitForFunction(() => {
    const text = document.body.textContent || "";
    const state = document.querySelector('[aria-label="Apex digital body"]')?.getAttribute("data-voice-state") || "";
    return /Voice Open|Apex is listening|Live captions active/i.test(text) && state === "listening";
  }, null, { timeout: 20_000 });
  const postAnswerListeningScreenshotPath = path.join(outputDir, "desktop-post-answer-listening.png");
  await page.screenshot({ path: postAnswerListeningScreenshotPath, fullPage: true });
  await mark("post-answer listening screenshot captured");

  const evidence = await page.evaluate(() => {
    const qa = window.__apexVoiceBodyQa || {};
    const body = document.querySelector('[aria-label="Apex digital body"]');
    const rect = body?.getBoundingClientRect();
    const text = (document.body.textContent || "").replace(/\s+/g, " ").trim();
    return {
      spokenCount: qa.spoken?.length || 0,
      spokenSamples: (qa.spoken || []).map((item) => String(item).slice(0, 220)),
      recognitionStarts: qa.recognitionStarts || 0,
      emittedTranscripts: qa.emittedTranscripts || [],
      bodyStates: qa.bodyStates || [],
      currentBodyState: body?.getAttribute("data-voice-state") || "",
      hasApexBody: Boolean(body && rect?.width && rect?.height),
      hasAura: Boolean(document.querySelector(".co-apex-life-aura")),
      hasNeuralGrid: Boolean(document.querySelector(".co-apex-life-neural-grid")),
      hasVoiceBand: Boolean(document.querySelector(".co-apex-life-voice-band")),
      soundCheckVisible: /Sound Check/i.test(text),
      soundCheckPassedNotice: /Sound check passed|desktop voice is audible/i.test(text),
      voiceOpenVisible: /Voice Open|Apex is listening/i.test(text),
      transcriptVisible: /what's blocked today/i.test(text),
      speakerReadyVisible: /Speaker\s*Unlocked|Speaker\s*Talking|Sound check passed|desktop voice is audible/i.test(text),
      horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
    };
  });

  const pass = evidence.spokenCount >= 2
    && evidence.spokenSamples.some((sample) => /Apex audio is on/i.test(sample))
    && evidence.recognitionStarts >= 1
    && evidence.emittedTranscripts.includes("what's blocked today")
    && evidence.bodyStates.includes("speaking")
    && (evidence.bodyStates.includes("listening") || evidence.bodyStates.includes("hearing"))
    && evidence.hasApexBody
    && evidence.hasAura
    && evidence.hasNeuralGrid
    && evidence.hasVoiceBand
    && evidence.soundCheckVisible
    && evidence.voiceOpenVisible
    && evidence.transcriptVisible
    && evidence.horizontalOverflow === 0
    && logs.length === 0
    && failedRequests.length === 0;

  await context.close();
  return {
    name: "desktop-live-voice-body",
    pass,
    soundCheckScreenshotPath,
    voiceTurnScreenshotPath,
    postAnswerListeningScreenshotPath,
    evidence,
    logs,
    failedRequests,
  };
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });
  await mark(`starting local server on ${baseUrl}`);
  const logStream = fsSync.createWriteStream(serverLogPath, { flags: "a" });
  const server = spawn(process.execPath, ["server/index.js"], {
    cwd: rootDir,
    env: {
      ...process.env,
      PORT: String(port),
      DATA_DIR: dataDir,
      DEMO_MODE: "true",
      SEED_DEMO_DATA: "true",
      DEMO_PACKAGE_ID: "elite",
      LOG_LEVEL: "warn",
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  server.stdout.pipe(logStream);
  server.stderr.pipe(logStream);

  async function stopServer() {
    if (process.platform === "win32" && server.pid) {
      spawnSync("taskkill", ["/PID", String(server.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
    } else {
      server.kill("SIGTERM");
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
    logStream.end();
  }

  let browser;
  try {
    await waitForReady();
    await mark("local server ready");
    setTempDemoOperatorAccess();
    await mark("temp demo operator access enabled");
    await mark("launching chromium");
    browser = await chromium.launch({
      args: [
        "--use-fake-device-for-media-stream",
        "--use-fake-ui-for-media-stream",
        "--autoplay-policy=no-user-gesture-required",
      ],
    });
    await mark("chromium launched");
    const result = await runDesktopPass(browser);
    const summary = {
      baseUrl,
      dataDir,
      outputDir,
      serverLogPath,
      results: [result],
      pass: result.pass,
    };
    await fs.writeFile(path.join(outputDir, "summary.json"), JSON.stringify(summary, null, 2));
    await mark(result.pass ? "desktop live voice/body QA passed" : "desktop live voice/body QA failed");
    console.log(JSON.stringify(summary, null, 2));
    if (!result.pass) process.exitCode = 1;
  } finally {
    if (browser) await browser.close().catch(() => {});
    await stopServer();
  }
}

await main();
