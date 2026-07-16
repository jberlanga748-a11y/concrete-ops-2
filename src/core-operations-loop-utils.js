import { deriveChangeOrderMoneyState } from "./change-order-utils.js";
import { deriveCommandCenterState } from "./command-center-utils.js";
import { buildJobCloseoutBillingReviewPacket } from "./job-closeout-billing-utils.js";
import { deriveMaterialPrepState } from "./material-prep-utils.js";

const BLOCKED_ACTIONS = Object.freeze([
  "No lead, estimate, job, schedule, crew assignment, report, ticket, change order, invoice, payment, material order, or customer message is created from the Core Operations Loop panel",
  "No job status, field visibility, billing state, closeout approval, profit/loss result, purchasing action, or accounting entry is changed",
  "No field user receives leads, estimates, pricing, billing, margins, profit, payroll, company setup, AI office controls, or office-only notes",
  "No customer, GC, vendor, supplier, ad platform, payment provider, or portal action runs automatically",
]);

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function num(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function text(value = "") {
  return String(value ?? "").trim();
}

function hasOfficeOperationsAccess(permissions = {}) {
  return Boolean(
    permissions?.jobs?.canManageAll
      || permissions?.leads?.canView
      || permissions?.estimates?.canView
      || permissions?.reports?.canView
      || permissions?.uploads?.canView
      || permissions?.deliveryTickets?.canView
      || permissions?.changeOrders?.canView
      || permissions?.materialPrep?.canView,
  );
}

function hasFieldOnlyAccess(permissions = {}) {
  return Boolean(
    permissions?.jobs?.canManageField
      && !permissions?.jobs?.canManageAll
      && !permissions?.leads?.canView
      && !permissions?.estimates?.canView,
  );
}

function statusForCount(count, readyLabel = "Ready", needsLabel = "Needs review") {
  return num(count) > 0 ? needsLabel : readyLabel;
}

function toneForCount(count, readyTone = "green", needsTone = "amber") {
  return num(count) > 0 ? needsTone : readyTone;
}

function buildStage({ id, label, count = 0, ready = false, helper = "", moduleId = "dashboard", actionLabel = "Review", route = "", tone = "" }) {
  const numericCount = num(count);
  const isReady = Boolean(ready);
  return {
    id,
    label,
    count: numericCount,
    status: isReady ? "Ready" : "Needs review",
    ready: isReady,
    helper,
    moduleId,
    route,
    actionLabel,
    tone: tone || (isReady ? "green" : "amber"),
  };
}

function emptyMaterialPrepState() {
  return {
    packets: [],
    readyPackets: [],
    blockedPackets: [],
    queue: [],
    kpis: [],
  };
}

function emptyChangeOrderMoneyState() {
  return {
    packets: [],
    pricedPackets: [],
    readyForBillingHandoff: [],
    lockedPackets: [],
    revenuePendingManualReview: 0,
    kpis: [],
  };
}

function stagePriority(stage = {}) {
  const order = {
    lead_intake: 10,
    estimate_proposal: 20,
    approved_job_handoff: 25,
    schedule_crew: 30,
    field_proof: 40,
    material_prep: 50,
    change_orders: 60,
    closeout_billing: 70,
  };
  return order[stage.id] || 99;
}

export function deriveCoreOperationsLoopState(source = {}, options = {}) {
  const permissions = source.permissions || {};
  if (!hasOfficeOperationsAccess(permissions) || hasFieldOnlyAccess(permissions)) {
    return {
      mode: "blocked_core_operations_loop",
      canView: false,
      title: "From Lead To Paid",
      summary: "Core operations loop is office-only. Field users stay in assigned field work and cannot access leads, estimates, pricing, billing, margins, profit, payroll, or office-only controls.",
      status: "Locked",
      tone: "slate",
      stages: [],
      nextAction: null,
      metrics: {
        stagesReady: 0,
        totalStages: 0,
        blockerCount: 0,
        readyMoneyItems: 0,
        closeoutCandidates: 0,
        materialReadyPackets: 0,
      },
      blockedActions: BLOCKED_ACTIONS.slice(),
      safetyBoundary: "Field users remain blocked from office operations, money, growth, estimates, billing, and internal controls.",
    };
  }

  const commandCenter = source.commandCenter || deriveCommandCenterState(source, options);
  const stats = commandCenter.stats || {};
  const closeoutPacket = buildJobCloseoutBillingReviewPacket({
    ...source,
    permissions,
  }, { maxJobs: 6 });
  const materialPrep = permissions?.materialPrep?.canView
    ? deriveMaterialPrepState({
      estimates: source.estimates,
      jobs: source.jobs,
      customers: source.customers,
      rateBookItems: source.rateBookItems,
    })
    : emptyMaterialPrepState();
  const changeOrderMoney = permissions?.changeOrders?.canView
    ? deriveChangeOrderMoneyState(source.changeOrderRequests)
    : emptyChangeOrderMoneyState();

  const leadWorkCount = num(stats.followUpsDueToday)
    + num(stats.overdueFollowUps)
    + num(stats.leadsNotContacted)
    + num(stats.sourceChecksNeeded);
  const estimateWorkCount = num(stats.draftEstimates)
    + num(stats.sentEstimatesWaiting);
  const approvedHandoffCount = num(stats.approvedEstimatesReadyToConvert);
  const scheduleCrewCount = num(stats.jobsNeedingStartupReview)
    + num(stats.jobsMissingCrew)
    + num(stats.jobsMissingStartDate);
  const fieldProofCount = num(stats.fieldProofGaps);
  const materialBlockedCount = asArray(materialPrep.blockedPackets).length;
  const materialReadyCount = asArray(materialPrep.readyPackets).length;
  const changeOrderReviewCount = num(stats.openChangeOrders)
    + asArray(changeOrderMoney.lockedPackets).filter((packet) => !packet.readyForBillingHandoff).length;
  const closeoutRows = asArray(closeoutPacket.rows);
  const closeoutBlockedCount = closeoutRows.filter((row) => !row.readyForBillingReview).length
    + num(closeoutPacket.metrics?.jobCostingInputWarnings)
    + num(closeoutPacket.metrics?.profitLossInputWarnings);
  const closeoutReadyCount = num(closeoutPacket.metrics?.readyForBillingReview);

  const stages = [
    buildStage({
      id: "lead_intake",
      label: "Lead intake / follow-up",
      count: leadWorkCount,
      ready: leadWorkCount === 0,
      helper: leadWorkCount
        ? `${leadWorkCount} lead, source, or follow-up action is waiting on a look from the office.`
        : "Lead follow-up and source checks are clear in the current command view.",
      moduleId: "leads",
      actionLabel: "Open leads",
      tone: toneForCount(leadWorkCount, "green", "orange"),
    }),
    buildStage({
      id: "estimate_proposal",
      label: "Estimate / proposal",
      count: estimateWorkCount,
      ready: estimateWorkCount === 0,
      helper: estimateWorkCount
        ? `${num(stats.draftEstimates)} draft and ${num(stats.sentEstimatesWaiting)} sent estimate${estimateWorkCount === 1 ? "" : "s"} need pricing, packet, or manual follow-up review.`
        : "No draft or sent estimate is blocking the current loop.",
      moduleId: "estimates",
      actionLabel: "Open estimates",
      tone: toneForCount(estimateWorkCount, "green", "amber"),
    }),
    buildStage({
      id: "approved_job_handoff",
      label: "Approved job handoff",
      count: approvedHandoffCount,
      ready: approvedHandoffCount === 0,
      helper: approvedHandoffCount
        ? `${approvedHandoffCount} approved estimate${approvedHandoffCount === 1 ? "" : "s"} need manual convert-to-job review.`
        : "No approved estimate is waiting on job handoff.",
      moduleId: "estimates",
      actionLabel: "Review handoff",
      tone: approvedHandoffCount ? "blue" : "green",
    }),
    buildStage({
      id: "schedule_crew",
      label: "Schedule / crew setup",
      count: scheduleCrewCount,
      ready: scheduleCrewCount === 0,
      helper: scheduleCrewCount
        ? `${scheduleCrewCount} startup, crew, or start-date blocker${scheduleCrewCount === 1 ? "" : "s"} remain before field work is clean.`
        : `${num(stats.scheduledTodayJobs)} job${num(stats.scheduledTodayJobs) === 1 ? "" : "s"} scheduled today and ${num(stats.scheduledTomorrowJobs)} tomorrow.`,
      moduleId: "schedule",
      actionLabel: "Open schedule",
      tone: toneForCount(scheduleCrewCount, "green", "amber"),
    }),
    buildStage({
      id: "field_proof",
      label: "Field proof / daily work",
      count: fieldProofCount,
      ready: fieldProofCount === 0,
      helper: fieldProofCount
        ? `${fieldProofCount} report, photo, ticket, checklist, time, safety, or proof gap${fieldProofCount === 1 ? "" : "s"} need review.`
        : "Daily reports, photos, tickets, checklists, safety, and time have no current command blockers.",
      moduleId: commandCenter.proofChainSummary?.nextModuleId || "reports",
      actionLabel: "Open proof",
      tone: toneForCount(fieldProofCount, "green", "amber"),
    }),
    buildStage({
      id: "material_prep",
      label: "Material prep",
      count: materialBlockedCount,
      ready: materialBlockedCount === 0,
      helper: permissions?.materialPrep?.canView
        ? materialBlockedCount
          ? `${materialBlockedCount} material prep packet${materialBlockedCount === 1 ? "" : "s"} need job linkage, quantity review, or manual prep before vendor contact.`
          : `${materialReadyCount} material prep packet${materialReadyCount === 1 ? "" : "s"} ready for manual review only.`
        : "Material prep is not enabled for this package or role.",
      moduleId: "materialPrep",
      actionLabel: "Open material prep",
      tone: permissions?.materialPrep?.canView ? toneForCount(materialBlockedCount, materialReadyCount ? "blue" : "slate", "amber") : "slate",
    }),
    buildStage({
      id: "change_orders",
      label: "Change orders",
      count: changeOrderReviewCount,
      ready: changeOrderReviewCount === 0,
      helper: changeOrderReviewCount
        ? `${changeOrderReviewCount} change-order pricing, acceptance, or billing-handoff review item${changeOrderReviewCount === 1 ? "" : "s"} remain.`
        : `${asArray(changeOrderMoney.readyForBillingHandoff).length} change order${asArray(changeOrderMoney.readyForBillingHandoff).length === 1 ? "" : "s"} are ready for manual billing handoff.`,
      moduleId: "changeOrders",
      actionLabel: "Open changes",
      tone: toneForCount(changeOrderReviewCount, "green", "amber"),
    }),
    buildStage({
      id: "closeout_billing",
      label: "Closeout / billing readiness",
      count: closeoutBlockedCount,
      ready: closeoutBlockedCount === 0,
      helper: closeoutRows.length
        ? closeoutBlockedCount
          ? `${closeoutBlockedCount} closeout, proof, costing, or profit/loss warning${closeoutBlockedCount === 1 ? "" : "s"} remain before manual billing review can be trusted.`
          : `${closeoutReadyCount} job${closeoutReadyCount === 1 ? "" : "s"} look clean for manual billing review.`
        : "No field-complete, completed, billing-ready, or closed job is currently in closeout review.",
      moduleId: "jobs",
      actionLabel: "Review closeout",
      tone: closeoutRows.length ? toneForCount(closeoutBlockedCount, "green", "orange") : "slate",
    }),
  ];

  const actionableStages = stages
    .filter((stage) => !stage.ready && stage.count > 0)
    .sort((left, right) => stagePriority(left) - stagePriority(right));
  const nextAction = actionableStages[0] || stages.find((stage) => stage.id === "closeout_billing" && closeoutReadyCount > 0) || stages[0];
  const blockerCount = actionableStages.reduce((sum, stage) => sum + stage.count, 0);
  const stagesReady = stages.filter((stage) => stage.ready).length;
  const status = blockerCount
    ? "Needs next action"
    : closeoutReadyCount || materialReadyCount
      ? "Ready for office review"
      : "Loop clear";

  return {
    mode: "review_first_core_operations_loop",
    canView: true,
    title: "From Lead To Paid",
    status,
    tone: blockerCount ? "amber" : closeoutReadyCount || materialReadyCount ? "green" : "slate",
    summary: blockerCount
      ? `${stagesReady} of ${stages.length} steps are in good shape. Next up: ${nextAction.label}. ${nextAction.helper}`
      : `${stagesReady} of ${stages.length} steps are in good shape. Nothing is sent or changed from here without you.`,
    coreLoopLabel: "Lead -> estimate -> proposal -> approved job -> schedule -> field proof -> change orders -> closeout -> billing readiness",
    stages,
    nextAction,
    metrics: {
      stagesReady,
      totalStages: stages.length,
      blockerCount,
      readyMoneyItems: num(stats.moneyReadyItems),
      closeoutCandidates: closeoutRows.length,
      closeoutReadyForBillingReview: closeoutReadyCount,
      materialReadyPackets: materialReadyCount,
      materialBlockedPackets: materialBlockedCount,
      changeOrdersReadyForBillingHandoff: asArray(changeOrderMoney.readyForBillingHandoff).length,
      jobCostingWarnings: num(closeoutPacket.metrics?.jobCostingInputWarnings),
      profitLossWarnings: num(closeoutPacket.metrics?.profitLossInputWarnings),
    },
    closeoutSummaryItems: asArray(closeoutPacket.summaryItems).slice(0, 4),
    materialQueue: asArray(materialPrep.queue).slice(0, 3),
    changeOrderKpis: asArray(changeOrderMoney.kpis),
    blockedActions: BLOCKED_ACTIONS.slice(),
    safetyBoundary: "This panel is a guide, not a robot. Apex HQ never creates, sends, or changes anything from here. Open the full module to take each action yourself.",
  };
}
