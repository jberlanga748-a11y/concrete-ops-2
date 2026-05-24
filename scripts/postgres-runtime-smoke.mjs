#!/usr/bin/env node
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_DATABASE_URL || "";
if (!databaseUrl.trim()) {
  console.error(JSON.stringify({
    ok: false,
    error: "DATABASE_URL or POSTGRES_DATABASE_URL is required for Postgres runtime smoke.",
  }, null, 2));
  process.exit(1);
}

process.env.DATA_PROVIDER = "postgres";

const {
  ensureDb,
  readDb,
  insertAuditEventRecord,
  findUserAuthRecordByEmail,
  findSessionAuthRecordByTokenHash,
  replaceSessionForUser,
  updateSessionCurrentCompanyByTokenHash,
  touchSessionByTokenHash,
  deleteSessionByTokenHash,
  hashToken,
  makeId,
} = await import("../server/store.js");

function tableCounts(state) {
  return {
    companies: state.companies.length,
    users: state.users.length,
    customers: state.customers.length,
    jobs: state.jobs.length,
    auditEvents: state.auditEvents.length,
  };
}

async function deleteAuditEvent(id) {
  const pool = new Pool({
    connectionString: databaseUrl,
    application_name: "apex-hq-postgres-runtime-smoke-cleanup",
    ssl: process.env.POSTGRES_SSL_MODE === "disable" ? false : { rejectUnauthorized: false },
    max: 1,
  });
  try {
    await pool.query("DELETE FROM public.audit_events WHERE id = $1", [id]);
  } finally {
    await pool.end();
  }
}

try {
  await ensureDb();
  const state = await readDb();
  const user = state.users[0];
  if (!user?.email) {
    throw new Error("Postgres runtime smoke requires at least one user row.");
  }

  const authUser = await findUserAuthRecordByEmail(user.email);
  if (authUser?.id !== user.id) {
    throw new Error("Postgres auth lookup did not return the first imported user.");
  }

  const createdAt = new Date().toISOString();
  const tokenHash = hashToken(`postgres-runtime-smoke-${createdAt}`);
  const sessionId = makeId("S-SMOKE");
  await replaceSessionForUser(user.id, {
    sessionId,
    tokenHash,
    currentCompanyId: user.companyId,
    createdAt,
    lastSeenAt: createdAt,
  });

  const sessionRecord = await findSessionAuthRecordByTokenHash(tokenHash);
  if (sessionRecord?.session?.id !== sessionId) {
    throw new Error("Postgres session lookup did not return the smoke session.");
  }
  await touchSessionByTokenHash(tokenHash, { lastSeenAt: new Date().toISOString() });
  await updateSessionCurrentCompanyByTokenHash(tokenHash, user.companyId, { lastSeenAt: new Date().toISOString() });
  const deletedSessions = await deleteSessionByTokenHash(tokenHash);
  if (deletedSessions !== 1) {
    throw new Error("Postgres smoke session cleanup did not delete exactly one row.");
  }

  const auditId = `AU-postgres-runtime-smoke-${Date.now()}`;
  await insertAuditEventRecord({
    id: auditId,
    companyId: user.companyId,
    entityType: "system",
    entityId: "postgres-runtime-smoke",
    action: "verified",
    summary: "Postgres runtime smoke verified",
    detail: "Temporary runtime smoke event; deleted after verification.",
    actorUserId: user.id,
    actorName: user.name,
    changedFields: ["postgresRuntime"],
    createdAt: new Date().toISOString(),
  });
  await deleteAuditEvent(auditId);

  console.log(JSON.stringify({
    ok: true,
    dataProvider: "postgres",
    counts: tableCounts(state),
  }, null, 2));
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    error: error instanceof Error ? error.message : String(error),
    stack: process.env.NODE_ENV === "test" && error instanceof Error ? error.stack : undefined,
  }, null, 2));
  process.exitCode = 1;
}
