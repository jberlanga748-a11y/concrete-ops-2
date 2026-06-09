import assert from "node:assert/strict";
import test from "node:test";

import {
  APEX_OS_AFFECTIVE_FOCUS,
  APEX_OS_AFFECTIVE_LEVEL,
  APEX_OS_AFFECTIVE_MODE,
  APEX_OS_AFFECTIVE_SIGNAL,
  APEX_OS_AFFECTIVE_TONE,
  APEX_OS_RESPONSE_STYLE,
  buildApexOsAffectiveStateSummary,
  classifyApexOsAffectiveState,
  detectApexOsAffectiveSignals,
  normalizeApexOsAffectiveFocus,
  normalizeApexOsAffectiveLevel,
  normalizeApexOsAffectiveMode,
  normalizeApexOsAffectiveTone,
  normalizeApexOsResponseStyle,
} from "./apexOsAffectiveState.js";

test("Apex OS Affective State exposes stable constants and normalization", () => {
  assert.equal(APEX_OS_AFFECTIVE_MODE.STEADY, "steady");
  assert.equal(APEX_OS_AFFECTIVE_TONE.CALM, "calm");
  assert.equal(APEX_OS_AFFECTIVE_LEVEL.HIGH, "high");
  assert.equal(APEX_OS_AFFECTIVE_FOCUS.BLOCKED, "blocked");
  assert.equal(APEX_OS_RESPONSE_STYLE.CALM_DIRECT, "calm-direct");
  assert.equal(normalizeApexOsAffectiveMode("not-real"), "steady");
  assert.equal(normalizeApexOsAffectiveTone("not-real"), "practical");
  assert.equal(normalizeApexOsAffectiveLevel("not-real"), "normal");
  assert.equal(normalizeApexOsAffectiveFocus("not-real"), "clear");
  assert.equal(normalizeApexOsResponseStyle("not-real"), "collaborative");
});

test("Affective State keeps neutral turns practical and non-diagnostic", () => {
  const state = classifyApexOsAffectiveState("What should we work on next?");
  const summary = buildApexOsAffectiveStateSummary(state);

  assert.equal(state.mode, "focused");
  assert.equal(state.tone, "practical");
  assert.equal(state.urgency, "normal");
  assert.equal(state.frustration, "low");
  assert.equal(summary.diagnostic, false);
  assert.equal(summary.clinical, false);
  assert.equal(summary.storesRawText, false);
  assert.equal(summary.storesPsychProfile, false);
  assert.equal(summary.safeToStoreDurably, false);
  assert.equal(summary.requiresMemoryReview, true);
  assert.equal(summary.operatorOnly, true);
  assert.equal(summary.canExecuteNow, false);
  assert.match(summary.safeSummary, /diagnosis=false/);
});

test("Affective State detects frustration and chooses calm direct response style", () => {
  const state = classifyApexOsAffectiveState("I'm not happy with how this looks. It still looks like a basic blob and we need to fix it now.");

  assert.equal(state.mode, "frustrated");
  assert.equal(state.tone, "calm");
  assert.equal(state.urgency, "medium");
  assert.equal(state.frustration, "medium");
  assert.equal(state.responseStyle, "calm-direct");
  assert.equal(state.signalIds.includes(APEX_OS_AFFECTIVE_SIGNAL.FRUSTRATION), true);
  assert.equal(state.signalIds.includes(APEX_OS_AFFECTIVE_SIGNAL.URGENCY), true);
  assert.match(state.safeGuidance, /calm, direct/i);
  assert.doesNotMatch(JSON.stringify(state.metadata), /basic blob|not happy|fix it now/i);
});

test("Affective State detects overwhelmed or low-energy turns without profiling John", () => {
  const state = classifyApexOsAffectiveState("I'm overwhelmed and exhausted. Give me one clear next step.");

  assert.equal(state.mode, "overloaded");
  assert.equal(state.energy, "low");
  assert.equal(state.focus, "scattered");
  assert.equal(state.responseStyle, "step-by-step");
  assert.equal(state.signalIds.includes(APEX_OS_AFFECTIVE_SIGNAL.OVERWHELMED), true);
  assert.equal(state.signalIds.includes(APEX_OS_AFFECTIVE_SIGNAL.LOW_ENERGY), true);
  assert.equal(state.storesPsychProfile, false);
  assert.equal(state.safeToStoreDurably, false);
});

test("Affective State detects exploratory and concise style requests", () => {
  const signals = detectApexOsAffectiveSignals("I'm curious what you think. Give me the short version with options.");
  const state = classifyApexOsAffectiveState("I'm curious what you think. Give me the short version with options.");

  assert.equal(signals.includes(APEX_OS_AFFECTIVE_SIGNAL.EXPLORATORY), true);
  assert.equal(signals.includes(APEX_OS_AFFECTIVE_SIGNAL.CONCISE_STYLE_REQUEST), true);
  assert.equal(state.focus, "exploratory");
  assert.equal(state.responseStyle, "concise");
  assert.match(state.safeGuidance, /short, concrete/i);
});

test("Affective State detects stuck/confused turns and uses explainer style", () => {
  const state = classifyApexOsAffectiveState("I'm confused and don't know how this works. Explain why.");

  assert.equal(state.mode, "stuck");
  assert.equal(state.focus, "blocked");
  assert.equal(state.responseStyle, "explainer");
  assert.equal(state.signalIds.includes(APEX_OS_AFFECTIVE_SIGNAL.STUCK_OR_CONFUSED), true);
  assert.equal(state.signalIds.includes(APEX_OS_AFFECTIVE_SIGNAL.EXPLAINER_REQUEST), true);
});

test("Affective State summary is compact and content-free", () => {
  const state = classifyApexOsAffectiveState("This is garbage and I am exhausted, but let's do it right now.");
  const summary = buildApexOsAffectiveStateSummary(state);
  const serialized = JSON.stringify(summary);

  assert.equal(summary.signalCount >= 3, true);
  assert.equal(summary.canExecuteNow, false);
  assert.equal(summary.storesRawText, false);
  assert.equal(summary.storesPsychProfile, false);
  assert.doesNotMatch(serialized, /garbage|exhausted|right now/i);
  assert.match(summary.safeSummary, /Affective state:/);
});
