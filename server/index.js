import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";

import { DEMO_CREDENTIALS } from "./seed-data.js";
import {
  createSeedState,
  ensureDb,
  generateToken,
  hashToken,
  leadProjectName,
  makeId,
  publicUser,
  readDb,
  timestamp,
  updateDb,
  verifyPassword,
} from "./store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const port = Number(process.env.PORT || 4000);

const app = express();

app.use(cors());
app.use(express.json());

function appendActivity(state, title, detail) {
  state.activity.unshift({
    id: makeId("A"),
    time: timestamp(),
    title,
    detail,
  });
  state.activity = state.activity.slice(0, 12);
}

function statsFromState(state) {
  const newLeads = state.leads.filter((lead) => lead.status === "New").length;
  const highPriorityLeads = state.leads.filter((lead) => lead.priority === "High").length;
  const pipelineValue = state.leads.reduce((sum, lead) => sum + Number(lead.value || 0), 0);
  const activeJobs = state.jobs.filter((job) => job.stage === "In Progress").length;
  const scheduledJobs = state.jobs.filter((job) => job.stage === "Scheduled").length;
  const reportsDue = state.queueItems.filter((item) => !item.done && item.status === "Due today").length;
  const queueBlocked = state.queueItems.filter((item) => !item.done && item.status === "Blocked").length;

  return {
    newLeads,
    highPriorityLeads,
    pipelineValue,
    activeJobs,
    scheduledJobs,
    reportsDue,
    queueBlocked,
  };
}

function sanitizeBootstrap(state, user) {
  return {
    user: publicUser(user),
    leads: state.leads,
    jobs: state.jobs,
    queueItems: state.queueItems,
    activity: state.activity,
    stats: statsFromState(state),
  };
}

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token) {
    return res.status(401).json({ error: "Authentication required." });
  }

  const state = await readDb();
  const tokenHash = hashToken(token);
  const session = state.sessions.find((entry) => entry.tokenHash === tokenHash);

  if (!session) {
    return res.status(401).json({ error: "Session expired." });
  }

  const user = state.users.find((entry) => entry.id === session.userId);
  if (!user) {
    return res.status(401).json({ error: "Account missing." });
  }

  req.auth = {
    token,
    tokenHash,
    user,
  };

  await updateDb((draft) => {
    const liveSession = draft.sessions.find((entry) => entry.tokenHash === tokenHash);
    if (liveSession) {
      liveSession.lastSeenAt = new Date().toISOString();
    }
    return draft;
  });

  return next();
}

app.get("/api/health", async (_req, res) => {
  await ensureDb();
  res.json({ ok: true });
});

app.post("/api/auth/login", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  const state = await readDb();
  const user = state.users.find((entry) => entry.email.toLowerCase() === email);

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const token = generateToken();
  const tokenHash = hashToken(token);

  await updateDb((draft) => {
    draft.sessions = draft.sessions.filter((entry) => entry.userId !== user.id);
    draft.sessions.push({
      id: makeId("S"),
      userId: user.id,
      tokenHash,
      createdAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
    });
    return draft;
  });

  return res.json({
    token,
    user: publicUser(user),
    demoCredentials: DEMO_CREDENTIALS,
  });
});

app.get("/api/auth/me", requireAuth, async (req, res) => {
  res.json({ user: publicUser(req.auth.user) });
});

app.post("/api/auth/logout", requireAuth, async (req, res) => {
  await updateDb((draft) => {
    draft.sessions = draft.sessions.filter((entry) => entry.tokenHash !== req.auth.tokenHash);
    return draft;
  });

  res.status(204).end();
});

app.get("/api/bootstrap", requireAuth, async (req, res) => {
  const state = await readDb();
  res.json(sanitizeBootstrap(state, req.auth.user));
});

app.post("/api/leads", requireAuth, async (req, res) => {
  const payload = req.body || {};
  const newLead = {
    id: makeId("L"),
    customer: String(payload.customer || "").trim(),
    city: String(payload.city || "").trim(),
    project: String(payload.project || "").trim(),
    status: "New",
    priority: payload.priority || "Normal",
    value: Number(payload.value) || 0,
    owner: String(payload.owner || "").trim() || "Office",
    age: "Just now",
    nextStep: String(payload.nextStep || "").trim() || "Initial call",
    notes: String(payload.notes || "").trim() || "No notes yet.",
  };

  if (!newLead.customer || !newLead.city || !newLead.project) {
    return res.status(400).json({ error: "Customer, city, and project are required." });
  }

  const nextState = await updateDb((draft) => {
    draft.leads.unshift(newLead);
    draft.queueItems.unshift({
      id: makeId("Q"),
      title: `Call ${newLead.customer}`,
      meta: `${newLead.project} - ${newLead.city}`,
      status: "Due today",
      done: false,
    });
    appendActivity(draft, "Lead created", `${newLead.customer} entered for ${newLead.project}.`);
    return draft;
  });

  return res.status(201).json(sanitizeBootstrap(nextState, req.auth.user));
});

app.patch("/api/leads/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const updates = req.body || {};

  const nextState = await updateDb((draft) => {
    const lead = draft.leads.find((entry) => entry.id === id);
    if (!lead) return draft;

    Object.assign(lead, {
      project: updates.project ?? lead.project,
      status: updates.status ?? lead.status,
      priority: updates.priority ?? lead.priority,
      value: updates.value ?? lead.value,
      owner: updates.owner ?? lead.owner,
      nextStep: updates.nextStep ?? lead.nextStep,
      notes: updates.notes ?? lead.notes,
    });

    appendActivity(draft, "Lead updated", `${lead.customer} details were updated.`);
    return draft;
  });

  return res.json(sanitizeBootstrap(nextState, req.auth.user));
});

app.post("/api/leads/:id/convert", requireAuth, async (req, res) => {
  const { id } = req.params;

  const nextState = await updateDb((draft) => {
    const lead = draft.leads.find((entry) => entry.id === id);
    if (!lead) return draft;

    const newJob = {
      id: makeId("J"),
      job: leadProjectName(lead),
      customer: lead.customer,
      stage: "Scheduled",
      crew: "Assign crew",
      next: lead.nextStep || "Confirm start date",
      due: "This week",
      progress: 10,
      notes: lead.notes,
    };

    draft.jobs.unshift(newJob);
    lead.status = "Approved";
    lead.nextStep = "Moved into job schedule";
    appendActivity(draft, "Lead converted to job", `${lead.customer} moved into ${newJob.job}.`);
    return draft;
  });

  return res.json(sanitizeBootstrap(nextState, req.auth.user));
});

app.post("/api/jobs", requireAuth, async (req, res) => {
  const payload = req.body || {};
  const newJob = {
    id: makeId("J"),
    job: String(payload.job || "").trim(),
    customer: String(payload.customer || "").trim(),
    stage: payload.stage || "Scheduled",
    crew: String(payload.crew || "").trim() || "Assign crew",
    next: String(payload.next || "").trim() || "Set field kickoff",
    due: String(payload.due || "").trim() || "TBD",
    progress: Number(payload.progress) || 0,
    notes: String(payload.notes || "").trim() || "No notes yet.",
  };

  if (!newJob.job || !newJob.customer) {
    return res.status(400).json({ error: "Job name and customer are required." });
  }

  const nextState = await updateDb((draft) => {
    draft.jobs.unshift(newJob);
    appendActivity(draft, "Job created", `${newJob.job} added for ${newJob.customer}.`);
    return draft;
  });

  return res.status(201).json(sanitizeBootstrap(nextState, req.auth.user));
});

app.patch("/api/jobs/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const updates = req.body || {};

  const nextState = await updateDb((draft) => {
    const job = draft.jobs.find((entry) => entry.id === id);
    if (!job) return draft;

    Object.assign(job, {
      customer: updates.customer ?? job.customer,
      crew: updates.crew ?? job.crew,
      stage: updates.stage ?? job.stage,
      due: updates.due ?? job.due,
      progress: updates.progress ?? job.progress,
      next: updates.next ?? job.next,
      notes: updates.notes ?? job.notes,
    });

    appendActivity(draft, "Job updated", `${job.job} field details were updated.`);
    return draft;
  });

  return res.json(sanitizeBootstrap(nextState, req.auth.user));
});

app.post("/api/queue-items", requireAuth, async (req, res) => {
  const payload = req.body || {};
  const newTask = {
    id: makeId("Q"),
    title: String(payload.title || "").trim(),
    meta: String(payload.meta || "").trim() || "General operations follow-up",
    status: payload.status || "Due today",
    done: false,
  };

  if (!newTask.title) {
    return res.status(400).json({ error: "Task title is required." });
  }

  const nextState = await updateDb((draft) => {
    draft.queueItems.unshift(newTask);
    appendActivity(draft, "Queue item added", newTask.title);
    return draft;
  });

  return res.status(201).json(sanitizeBootstrap(nextState, req.auth.user));
});

app.patch("/api/queue-items/:id/toggle", requireAuth, async (req, res) => {
  const { id } = req.params;

  const nextState = await updateDb((draft) => {
    const task = draft.queueItems.find((entry) => entry.id === id);
    if (!task) return draft;
    task.done = !task.done;
    appendActivity(draft, task.done ? "Queue item completed" : "Queue item reopened", task.title);
    return draft;
  });

  return res.json(sanitizeBootstrap(nextState, req.auth.user));
});

app.post("/api/reset", requireAuth, async (req, res) => {
  const nextState = await updateDb(() => {
    const seed = createSeedState();
    seed.sessions = [
      {
        id: makeId("S"),
        userId: req.auth.user.id,
        tokenHash: req.auth.tokenHash,
        createdAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
      },
    ];
    return seed;
  });
  const user = nextState.users.find((entry) => entry.id === req.auth.user.id) || nextState.users.find((entry) => entry.email === DEMO_CREDENTIALS.email);
  res.json(sanitizeBootstrap(nextState, user));
});

app.use("/assets", express.static(path.join(distDir, "assets")));

app.use(async (req, res, next) => {
  if (req.path.startsWith("/api")) return next();

  try {
    const html = await fs.readFile(path.join(distDir, "index.html"), "utf8");
    return res.type("html").send(html);
  } catch {
    return res.status(404).send("Build the client first with `npm run build`.");
  }
});

await ensureDb();

app.listen(port, () => {
  console.log(`Concrete Ops API listening on http://localhost:${port}`);
});
