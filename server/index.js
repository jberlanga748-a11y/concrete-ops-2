import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";

import { DEMO_CREDENTIALS } from "./seed-data.js";
import { serverConfig } from "./config.js";
import {
  cleanupExpiredSessions,
  createSeedState,
  ensureDb,
  generateToken,
  hashToken,
  leadProjectName,
  makeId,
  publicUser,
  readDb,
  nextSessionExpiry,
  timestamp,
  updateDb,
  verifyPassword,
} from "./store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const { port } = serverConfig;
const LEAD_PRIORITIES = new Set(["Low", "Normal", "High"]);
const LEAD_STATUSES = new Set(["New", "Contacted", "Site Visit", "Estimate Sent", "Approved"]);
const JOB_STAGES = new Set(["Scheduled", "In Progress", "Waiting", "Ready to Bill", "Complete"]);
const QUEUE_STATUSES = new Set(["Due today", "Ready", "This week", "Blocked"]);

const app = express();

app.use(cors());
app.use(express.json());

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function asyncRoute(handler) {
  return async function routeHandler(req, res, next) {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

function requiredString(value, fieldName) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    throw new ApiError(400, `${fieldName} is required.`);
  }
  return normalized;
}

function optionalString(value, fallback) {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function optionalEnum(value, allowedValues, fieldName, fallback) {
  const normalized = value == null ? fallback : String(value).trim();
  if (!allowedValues.has(normalized)) {
    throw new ApiError(400, `${fieldName} must be one of: ${Array.from(allowedValues).join(", ")}.`);
  }
  return normalized;
}

function optionalNonNegativeNumber(value, fieldName, fallback = 0) {
  if (value == null || value === "") return fallback;
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized < 0) {
    throw new ApiError(400, `${fieldName} must be a non-negative number.`);
  }
  return normalized;
}

function optionalProgressNumber(value, fallback = 0) {
  if (value == null || value === "") return fallback;
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized < 0 || normalized > 100) {
    throw new ApiError(400, "Progress must be a number between 0 and 100.");
  }
  return normalized;
}

function findRequiredRecord(records, id, resourceName) {
  const record = records.find((entry) => entry.id === id);
  if (!record) {
    throw new ApiError(404, `${resourceName} not found.`);
  }
  return record;
}

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
  const now = new Date().toISOString();
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token) {
    return res.status(401).json({ error: "Authentication required." });
  }

  await cleanupExpiredSessions(now);
  const state = await readDb();
  const tokenHash = hashToken(token);
  const session = state.sessions.find((entry) => entry.tokenHash === tokenHash);

  if (!session) {
    return res.status(401).json({ error: "Session expired." });
  }

  if (session.expiresAt && session.expiresAt <= now) {
    await updateDb((draft) => {
      draft.sessions = draft.sessions.filter((entry) => entry.tokenHash !== tokenHash);
      return draft;
    });
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
      liveSession.lastSeenAt = now;
      liveSession.expiresAt = nextSessionExpiry();
    }
    return draft;
  });

  return next();
}

app.get("/api/health", asyncRoute(async (_req, res) => {
  await ensureDb();
  res.json({ ok: true });
}));

app.post("/api/auth/login", asyncRoute(async (req, res) => {
  await cleanupExpiredSessions();
  const email = requiredString(req.body?.email, "Email").toLowerCase();
  const password = requiredString(req.body?.password, "Password");
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
      expiresAt: nextSessionExpiry(),
    });
    return draft;
  });

  return res.json({
    token,
    user: publicUser(user),
    demoCredentials: DEMO_CREDENTIALS,
  });
}));

app.get("/api/auth/me", requireAuth, asyncRoute(async (req, res) => {
  res.json({ user: publicUser(req.auth.user) });
}));

app.post("/api/auth/logout", requireAuth, asyncRoute(async (req, res) => {
  await updateDb((draft) => {
    draft.sessions = draft.sessions.filter((entry) => entry.tokenHash !== req.auth.tokenHash);
    return draft;
  });

  res.status(204).end();
}));

app.get("/api/bootstrap", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  res.json(sanitizeBootstrap(state, req.auth.user));
}));

app.post("/api/leads", requireAuth, asyncRoute(async (req, res) => {
  const payload = req.body || {};
  const newLead = {
    id: makeId("L"),
    customer: requiredString(payload.customer, "Customer"),
    city: requiredString(payload.city, "City"),
    project: requiredString(payload.project, "Project"),
    status: "New",
    priority: optionalEnum(payload.priority, LEAD_PRIORITIES, "Priority", "Normal"),
    value: optionalNonNegativeNumber(payload.value, "Value"),
    owner: optionalString(payload.owner, "Office"),
    age: "Just now",
    nextStep: optionalString(payload.nextStep, "Initial call"),
    notes: optionalString(payload.notes, "No notes yet."),
  };

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
}));

app.patch("/api/leads/:id", requireAuth, asyncRoute(async (req, res) => {
  const { id } = req.params;
  const updates = req.body || {};

  const nextState = await updateDb((draft) => {
    const lead = findRequiredRecord(draft.leads, id, "Lead");

    Object.assign(lead, {
      project: updates.project == null ? lead.project : requiredString(updates.project, "Project"),
      status: updates.status == null ? lead.status : optionalEnum(updates.status, LEAD_STATUSES, "Status", lead.status),
      priority: updates.priority == null ? lead.priority : optionalEnum(updates.priority, LEAD_PRIORITIES, "Priority", lead.priority),
      value: updates.value == null ? lead.value : optionalNonNegativeNumber(updates.value, "Value", lead.value),
      owner: updates.owner == null ? lead.owner : requiredString(updates.owner, "Owner"),
      nextStep: updates.nextStep == null ? lead.nextStep : requiredString(updates.nextStep, "Next step"),
      notes: updates.notes == null ? lead.notes : requiredString(updates.notes, "Notes"),
    });

    appendActivity(draft, "Lead updated", `${lead.customer} details were updated.`);
    return draft;
  });

  return res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/leads/:id/convert", requireAuth, asyncRoute(async (req, res) => {
  const { id } = req.params;

  const nextState = await updateDb((draft) => {
    const lead = findRequiredRecord(draft.leads, id, "Lead");

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
}));

app.post("/api/jobs", requireAuth, asyncRoute(async (req, res) => {
  const payload = req.body || {};
  const newJob = {
    id: makeId("J"),
    job: requiredString(payload.job, "Job name"),
    customer: requiredString(payload.customer, "Customer"),
    stage: optionalEnum(payload.stage, JOB_STAGES, "Stage", "Scheduled"),
    crew: optionalString(payload.crew, "Assign crew"),
    next: optionalString(payload.next, "Set field kickoff"),
    due: optionalString(payload.due, "TBD"),
    progress: optionalProgressNumber(payload.progress, 0),
    notes: optionalString(payload.notes, "No notes yet."),
  };

  const nextState = await updateDb((draft) => {
    draft.jobs.unshift(newJob);
    appendActivity(draft, "Job created", `${newJob.job} added for ${newJob.customer}.`);
    return draft;
  });

  return res.status(201).json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.patch("/api/jobs/:id", requireAuth, asyncRoute(async (req, res) => {
  const { id } = req.params;
  const updates = req.body || {};

  const nextState = await updateDb((draft) => {
    const job = findRequiredRecord(draft.jobs, id, "Job");

    Object.assign(job, {
      customer: updates.customer == null ? job.customer : requiredString(updates.customer, "Customer"),
      crew: updates.crew == null ? job.crew : requiredString(updates.crew, "Crew"),
      stage: updates.stage == null ? job.stage : optionalEnum(updates.stage, JOB_STAGES, "Stage", job.stage),
      due: updates.due == null ? job.due : requiredString(updates.due, "Due"),
      progress: updates.progress == null ? job.progress : optionalProgressNumber(updates.progress, job.progress),
      next: updates.next == null ? job.next : requiredString(updates.next, "Next step"),
      notes: updates.notes == null ? job.notes : requiredString(updates.notes, "Notes"),
    });

    appendActivity(draft, "Job updated", `${job.job} field details were updated.`);
    return draft;
  });

  return res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/queue-items", requireAuth, asyncRoute(async (req, res) => {
  const payload = req.body || {};
  const newTask = {
    id: makeId("Q"),
    title: requiredString(payload.title, "Task title"),
    meta: optionalString(payload.meta, "General operations follow-up"),
    status: optionalEnum(payload.status, QUEUE_STATUSES, "Status", "Due today"),
    done: false,
  };

  const nextState = await updateDb((draft) => {
    draft.queueItems.unshift(newTask);
    appendActivity(draft, "Queue item added", newTask.title);
    return draft;
  });

  return res.status(201).json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.patch("/api/queue-items/:id/toggle", requireAuth, asyncRoute(async (req, res) => {
  const { id } = req.params;

  const nextState = await updateDb((draft) => {
    const task = findRequiredRecord(draft.queueItems, id, "Queue item");
    task.done = !task.done;
    appendActivity(draft, task.done ? "Queue item completed" : "Queue item reopened", task.title);
    return draft;
  });

  return res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/reset", requireAuth, asyncRoute(async (req, res) => {
  const nextState = await updateDb(() => {
    const seed = createSeedState();
    seed.sessions = [
      {
        id: makeId("S"),
        userId: req.auth.user.id,
        tokenHash: req.auth.tokenHash,
        createdAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
        expiresAt: nextSessionExpiry(),
      },
    ];
    return seed;
  });
  const user = nextState.users.find((entry) => entry.id === req.auth.user.id) || nextState.users.find((entry) => entry.email === DEMO_CREDENTIALS.email);
  res.json(sanitizeBootstrap(nextState, user));
}));

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

app.use((error, _req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof SyntaxError && "body" in error) {
    return res.status(400).json({ error: "Request body must be valid JSON." });
  }

  if (error instanceof ApiError) {
    return res.status(error.status).json({ error: error.message });
  }

  console.error(error);
  return res.status(500).json({ error: "Internal server error." });
});

await ensureDb();

app.listen(port, () => {
  console.log(`Concrete Ops API listening on http://localhost:${port}`);
});
