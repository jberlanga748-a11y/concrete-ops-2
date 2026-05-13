const LEGACY_BRAND_PATTERN = ["Concrete", "Ops"].join("\\s+");
const GC_PACKET_LITE_BLOCK_START = "[Apex HQ GC Packet Lite]";
const GC_PACKET_LITE_BLOCK_END = "[/Apex HQ GC Packet Lite]";
const GC_PACKET_LITE_BLOCK_PATTERN = new RegExp(`\\n?\\[(?:Apex HQ|${LEGACY_BRAND_PATTERN}) GC Packet Lite\\]\\n([\\s\\S]*?)\\n\\[\\/(?:Apex HQ|${LEGACY_BRAND_PATTERN}) GC Packet Lite\\]\\n?`, "g");

function textBlock(value) {
  return String(value ?? "").replace(/\r\n/g, "\n").trim();
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function gcPacketLiteHasContent(gcPacketLite = {}) {
  return Boolean(
    textBlock(gcPacketLite?.proposalCoverNote)
    || textBlock(gcPacketLite?.proposalSummary)
    || textBlock(gcPacketLite?.qualifications)
    || textBlock(gcPacketLite?.scheduleNotes)
    || textBlock(gcPacketLite?.addendaRfiReferences)
    || textBlock(gcPacketLite?.gcReviewNotes)
    || textBlock(gcPacketLite?.internalPacketNotes),
  );
}

function parseGcPacketLiteBlock(internalNotes = "") {
  const text = String(internalNotes ?? "").replace(/\r\n/g, "\n");
  const matches = [...text.matchAll(GC_PACKET_LITE_BLOCK_PATTERN)];
  const lastMatch = matches.at(-1);
  if (!lastMatch?.[1]) return {};

  try {
    const parsed = JSON.parse(lastMatch[1]);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function normalizeEstimateGcPacketLite(gcPacketLite = {}) {
  return {
    proposalCoverNote: textBlock(gcPacketLite?.proposalCoverNote),
    proposalSummary: textBlock(gcPacketLite?.proposalSummary),
    qualifications: textBlock(gcPacketLite?.qualifications),
    scheduleNotes: textBlock(gcPacketLite?.scheduleNotes),
    addendaRfiReferences: textBlock(gcPacketLite?.addendaRfiReferences),
    gcReviewNotes: textBlock(gcPacketLite?.gcReviewNotes),
    internalPacketNotes: textBlock(gcPacketLite?.internalPacketNotes),
  };
}

export function deriveEstimateGcPacketLite(estimateOrNotes = {}) {
  const internalNotes = typeof estimateOrNotes === "string"
    ? estimateOrNotes
    : estimateOrNotes?.internalNotes;
  return normalizeEstimateGcPacketLite(parseGcPacketLiteBlock(internalNotes));
}

export function serializeEstimateGcPacketLite(gcPacketLite = {}) {
  const normalized = normalizeEstimateGcPacketLite(gcPacketLite);
  if (!gcPacketLiteHasContent(normalized)) return "";
  return [
    GC_PACKET_LITE_BLOCK_START,
    JSON.stringify(normalized),
    GC_PACKET_LITE_BLOCK_END,
  ].join("\n");
}

export function getEstimateInternalNotesWithoutGcPacketLite(internalNotes = "") {
  return textBlock(String(internalNotes ?? "").replace(GC_PACKET_LITE_BLOCK_PATTERN, "\n"));
}
