#!/usr/bin/env node

import process from "node:process";
import { pathToFileURL } from "node:url";

import {
  MATERIAL_PREP_REVIEW_ONLY_GUARDRAILS,
  buildMaterialListSummary,
  buildMaterialPrepChecklist,
  buildMaterialPrepCopyText,
  buildMaterialPrepPrintPacket,
  buildPurchasingPrepPacket,
} from "../src/material-prep-utils.js";

function includesUnsafeAction(value = "") {
  return /\border now\b|\bsend to vendor\b|\bcreate purchase order\b|\btake payment\b|\bcollect payment\b|\bauthorize payment\b/i.test(String(value));
}

function includesPricingLeak(value = "") {
  return /\$\s*\d|unitPrice|lineTotal|Unit price:|Line total:|Unit cost:|Markup:|Margin:|Profit:/i.test(String(value));
}

export function checkMaterialPurchasingPrepReadiness() {
  const failures = [];
  const packet = buildPurchasingPrepPacket({
    id: "EST-BUILD-4A",
    title: "Build 4A material prep proof",
    status: "approved",
    customerId: "C-1",
    jobId: "J-1",
    items: [
      { id: "I-1", description: "4000 PSI concrete material", quantity: 12, unit: "CY", unitPrice: 190, lineTotal: 2280 },
      { id: "I-2", description: "Pump rental", quantity: 1, unit: "Day", unitPrice: 650, lineTotal: 650 },
      { id: "I-3", description: "Trucking subcontractor", quantity: 1, unit: "LS", unitPrice: 900, lineTotal: 900 },
      { id: "I-4", description: "Special site allowance", quantity: 1, unit: "EA", unitPrice: 250, lineTotal: 250 },
    ],
  }, {
    customers: [{ id: "C-1", name: "Customer" }],
    jobs: [{ id: "J-1", title: "Linked job" }],
  });
  const summary = buildMaterialListSummary(packet);
  const checklist = buildMaterialPrepChecklist(packet);
  const copyText = buildMaterialPrepCopyText(packet);
  const printPacket = buildMaterialPrepPrintPacket(packet);
  const combinedOutput = JSON.stringify({ packet, summary, checklist, copyText, printPacket });

  if (!packet.ready) failures.push("Approved linked estimate should produce a ready manual purchasing prep packet.");
  for (const category of ["material", "equipment", "subcontractor", "review"]) {
    if (!summary.some((section) => section.category === category)) failures.push(`Missing material prep summary category ${category}.`);
  }
  if (!checklist.some((item) => item.id === "external_action_lock" && item.status === "locked")) {
    failures.push("Manual prep checklist must keep external purchasing actions locked.");
  }
  if (MATERIAL_PREP_REVIEW_ONLY_GUARDRAILS.length < 3) failures.push("Review-only guardrails are incomplete.");
  if (includesUnsafeAction(combinedOutput)) failures.push("Material prep output includes unsafe action language.");
  if (includesPricingLeak(JSON.stringify({ summary, copyText, printPacket }))) failures.push("Customer-copy or print-safe material prep output leaks pricing/cost fields.");
  if (!/No vendor order, supplier message, purchase order, payment, or billing action/i.test(copyText)) {
    failures.push("Copy packet missing no-order/no-payment boundary.");
  }
  if (!/does not order materials, send supplier messages, create purchase orders, authorize payments/i.test(printPacket.disclaimerNote || "")) {
    failures.push("Print packet missing explicit external-action disclaimer.");
  }

  return {
    ok: failures.length === 0,
    readyPacket: packet.ready,
    summaryCategories: summary.map((section) => section.category),
    checklistItems: checklist.length,
    guardrails: MATERIAL_PREP_REVIEW_ONLY_GUARDRAILS.length,
    failures,
  };
}

export function formatMaterialPurchasingPrepReadiness(result) {
  const lines = [
    `Material purchasing prep readiness: ${result.ok ? "GO" : "NO-GO"}`,
    `Ready packet: ${result.readyPacket ? "yes" : "no"}`,
    `Summary categories: ${result.summaryCategories.join(", ") || "none"}`,
    `Checklist items: ${result.checklistItems}`,
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
  const result = checkMaterialPurchasingPrepReadiness();
  console.log(formatMaterialPurchasingPrepReadiness(result));
  if (!result.ok) process.exitCode = 1;
}
