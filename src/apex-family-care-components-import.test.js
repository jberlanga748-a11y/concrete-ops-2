import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("Apex Family Care page is wired as a private Apex operator route", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const routeSource = fs.readFileSync(new URL("./app-routing.js", import.meta.url), "utf8");
  const navSource = fs.readFileSync(new URL("./navigation-utils.js", import.meta.url), "utf8");
  const componentSource = fs.readFileSync(new URL("./apex-family-care-components.jsx", import.meta.url), "utf8");

  assert.match(appSource, /const ApexFamilyCarePage = lazyRouteComponent\(\(\) => import\("\.\/apex-family-care-components"\), "ApexFamilyCarePage"\);/);
  assert.match(appSource, /\{ id: "familyCare", label: "Family Care", icon: "users" \}/);
  assert.match(appSource, /if \(active === "familyCare"\) return <ApexFamilyCarePage \{\.\.\.props\}\s*\/>;/);
  assert.match(routeSource, /familyCare: "\/family-care"/);
  assert.match(navSource, /"familyCare"/);
  assert.match(componentSource, /export function ApexFamilyCarePage/);
});

test("Apex Family Care page contains Phase 1 screens and no hidden mic APIs", () => {
  const componentSource = fs.readFileSync(new URL("./apex-family-care-components.jsx", import.meta.url), "utf8");

  for (const label of ["Today", "Add Update", "Care Timeline", "Doctor Summary", "Family Summary", "Settings", "Family Access", "Apex Health"]) {
    assert.match(componentSource, new RegExp(label));
  }

  assert.match(componentSource, /No raw audio/);
  assert.match(componentSource, /No diagnosis/);
  assert.doesNotMatch(componentSource, /getUserMedia|MediaRecorder|navigator\.mediaDevices|ApexMciWave|windows-mci-waveaudio|native-voice/i);
  assert.doesNotMatch(componentSource, /fetch\(/);
});

test("Apex Family Care page surfaces Phase 2 care signals through shared helpers", () => {
  const componentSource = fs.readFileSync(new URL("./apex-family-care-components.jsx", import.meta.url), "utf8");

  for (const helperName of [
    "addApexFamilyCareNote",
    "buildApexFamilyCareDoctorSummary",
    "buildApexFamilyCareFamilySummary",
    "buildApexFamilyCareTodaySummary",
    "listApexFamilyCareNotes",
  ]) {
    assert.match(componentSource, new RegExp(helperName));
  }

  assert.match(componentSource, /Care Signals/);
  assert.match(componentSource, /Missing update detector/);
  assert.match(componentSource, /Pattern detector/);
  assert.match(componentSource, /Medical diagnosis/);
  assert.match(componentSource, /Emergency replacement/);
  assert.doesNotMatch(componentSource, /getUserMedia|MediaRecorder|navigator\.mediaDevices|fetch\(/i);
});

test("Apex Family Care page surfaces Phase 3 brain readiness without voice capture", () => {
  const componentSource = fs.readFileSync(new URL("./apex-family-care-components.jsx", import.meta.url), "utf8");

  assert.match(componentSource, /getApexFamilyCareBrainInterfaceSummary/);
  assert.match(componentSource, /Apex care brain/);
  assert.match(componentSource, /Medication control/);
  assert.doesNotMatch(componentSource, /getUserMedia|MediaRecorder|navigator\.mediaDevices|ApexMciWave|windows-mci-waveaudio|native-voice|fetch\(/i);
});
