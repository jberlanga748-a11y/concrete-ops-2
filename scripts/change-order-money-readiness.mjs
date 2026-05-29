#!/usr/bin/env node

import process from "node:process";
import { pathToFileURL } from "node:url";

import {
  CHANGE_ORDER_MONEY_GUARDRAILS,
  buildChangeOrderMoneyCopyText,
  buildChangeOrderMoneyPacket,
  deriveChangeOrderMoneyState,
} from "../src/change-order-utils.js";

function includesUnsafeAction(value = "") {
  return /\bauto[- ]?send\b|\bsend to customer\b|\bsubmit to gc\b|\bcreate invoice\b|\bcollect payment\b|\bcharge card\b|\bmark paid\b/i.test(String(value));
}

function includesPrivateLeak(value = "") {
  return /officeNotes|internal margin|gross margin|profit margin|private url|raw cost/i.test(String(value));
}

export function checkChangeOrderMoneyReadiness() {
  const failures = [];
  const readyPacket = buildChangeOrderMoneyPacket({
    id: "COR-BUILD-5A",
    status: "approved_for_pricing",
    reason: "Extra concrete",
    scopeDescription: "Add driveway apron extension.",
    priceAmount: 1850,
    customerReviewStatus: "accepted_manually",
    officeNotes: "Internal margin note.",
    jobId: "J-1",
    job: { title: "Driveway", customer: "Customer" },
  }, { companyName: "Apex HQ" });
  const lockedPacket = buildChangeOrderMoneyPacket({
    id: "COR-BUILD-5B",
    status: "under_review",
    reason: "Extra base rock",
    scopeDescription: "Add base rock at soft area.",
    jobId: "J-2",
  }, { companyName: "Apex HQ" });
  const state = deriveChangeOrderMoneyState([readyPacket, lockedPacket]);
  const copyText = buildChangeOrderMoneyCopyText(readyPacket);
  const safeOutput = JSON.stringify({ readyPacket, lockedPacket, state, copyText });

  if (!readyPacket.readyForBillingHandoff) failures.push("Accepted priced change should be ready for manual billing handoff.");
  if (lockedPacket.readyForBillingHandoff) failures.push("Unpriced or unaccepted change should stay locked.");
  if (state.readyForBillingHandoff.length !== 1) failures.push("Money state should count one manual billing handoff packet.");
  if (state.revenuePendingManualReview !== 1850) failures.push("Money state should summarize priced revenue under manual review.");
  if (CHANGE_ORDER_MONEY_GUARDRAILS.length < 3) failures.push("Change-order money guardrails are incomplete.");
  if (includesUnsafeAction(safeOutput)) failures.push("Change-order money output appears to enable external send, invoice, or payment action.");
  if (includesPrivateLeak(JSON.stringify({ readyPacket: readyPacket.customerSafeSummary, copyText }))) failures.push("Customer-safe change-order money output leaks private office/cost language.");
  if (!/No customer send, GC submission, invoice, payment collection/i.test(copyText)) failures.push("Copy text missing no-send/no-payment boundary.");

  return {
    ok: failures.length === 0,
    readyForBillingHandoff: state.readyForBillingHandoff.length,
    lockedPackets: state.lockedPackets.length,
    revenuePendingManualReview: state.revenuePendingManualReview,
    guardrails: CHANGE_ORDER_MONEY_GUARDRAILS.length,
    failures,
  };
}

export function formatChangeOrderMoneyReadiness(result) {
  const lines = [
    `Change order money readiness: ${result.ok ? "GO" : "NO-GO"}`,
    `Manual billing handoff packets: ${result.readyForBillingHandoff}`,
    `Locked packets: ${result.lockedPackets}`,
    `Revenue pending manual review: ${result.revenuePendingManualReview}`,
    `Guardrails: ${result.guardrails}`,
  ];
  if (result.failures.length > 0) {
    lines.push("Failures:");
    for (const failure of result.failures) lines.push(`- ${failure}`);
  }
  return lines.join("\n");
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  const result = checkChangeOrderMoneyReadiness();
  console.log(formatChangeOrderMoneyReadiness(result));
  if (!result.ok) process.exitCode = 1;
}
