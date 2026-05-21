import test from "node:test";
import assert from "node:assert/strict";

import {
  estimateRoughNotesBullets,
  estimateRoughNotesHasSuggestions,
  estimateRoughNotesText,
  hasMeaningfulEstimateItems,
} from "./estimate-rough-notes-utils.js";

test("rough notes text trims sparse values safely", () => {
  assert.equal(estimateRoughNotesText("  demo sidewalk  "), "demo sidewalk");
  assert.equal(estimateRoughNotesText(null), "");
  assert.equal(estimateRoughNotesText(undefined), "");
});

test("rough notes bullets ignore blank values", () => {
  assert.equal(estimateRoughNotesBullets(["Demo", "", " Pour  "]), "- Demo\n- Pour");
  assert.equal(estimateRoughNotesBullets("not an array"), "");
});

test("meaningful estimate items require description or pricing", () => {
  assert.equal(hasMeaningfulEstimateItems([{ description: "Prep forms", unitPrice: "" }]), true);
  assert.equal(hasMeaningfulEstimateItems([{ description: "", unitPrice: "1200" }]), true);
  assert.equal(hasMeaningfulEstimateItems([{ description: "", unitPrice: "" }]), false);
});

test("rough notes suggestions require ok plus useful extracted content", () => {
  assert.equal(estimateRoughNotesHasSuggestions({ ok: false, scopeOfWork: "Pour slab" }), false);
  assert.equal(estimateRoughNotesHasSuggestions({ ok: true, scopeOfWork: "" }), false);
  assert.equal(estimateRoughNotesHasSuggestions({ ok: true, inclusions: ["Base rock"] }), true);
});
