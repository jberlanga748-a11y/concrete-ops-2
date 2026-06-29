import fs from "node:fs/promises";
import path from "node:path";

import {
  APEX_KOKORO_ONNX_DEFAULT_DTYPE,
  APEX_KOKORO_ONNX_DEFAULT_PROCESSOR,
  APEX_KOKORO_ONNX_DEFAULT_VOICE_ID,
  APEX_KOKORO_ONNX_MALE_VOICE_IDS,
  APEX_KOKORO_ONNX_MODEL_ID,
  generateApexKokoroVoiceAuditions,
  speakWithApexLightweightVoice,
} from "../server/apexLightweightVoiceProvider.js";

function timestampSlug(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    outputDir: "",
    voiceId: APEX_KOKORO_ONNX_DEFAULT_VOICE_ID,
    text: "Apex local voice test. John, this is the Apex daily voice running through Kokoro ONNX on CPU.",
    auditionText: "Apex voice audition. John, this is a local Kokoro ONNX male voice sample for the Apex daily voice.",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--output-dir") options.outputDir = argv[++index] || "";
    if (arg === "--voice-id") options.voiceId = argv[++index] || options.voiceId;
    if (arg === "--text") options.text = argv[++index] || options.text;
    if (arg === "--audition-text") options.auditionText = argv[++index] || options.auditionText;
  }
  return options;
}

const options = parseArgs();
const outputDir = options.outputDir || path.join(process.cwd(), "outputs", `apex-kokoro-onnx-tts-v4-${timestampSlug()}`);
await fs.mkdir(outputDir, { recursive: true });

const auditionManifest = await generateApexKokoroVoiceAuditions({
  outputDir,
  text: options.auditionText,
  voiceIds: APEX_KOKORO_ONNX_MALE_VOICE_IDS,
});

const proofPath = path.join(outputDir, `proof_${options.voiceId}.wav`);
const proof = await speakWithApexLightweightVoice({
  text: options.text,
  outputPath: proofPath,
  provider: "kokoro-onnx",
  voiceId: options.voiceId,
  loadPersistedConfig: false,
  persistedVoiceConfig: {
    provider: "kokoro-onnx",
    modelId: APEX_KOKORO_ONNX_MODEL_ID,
    voiceId: options.voiceId,
    dtype: APEX_KOKORO_ONNX_DEFAULT_DTYPE,
    processor: APEX_KOKORO_ONNX_DEFAULT_PROCESSOR,
  },
});

const receipt = {
  provider: "kokoro-onnx",
  modelId: APEX_KOKORO_ONNX_MODEL_ID,
  voiceId: proof.voiceId || options.voiceId,
  dtype: APEX_KOKORO_ONNX_DEFAULT_DTYPE,
  processor: APEX_KOKORO_ONNX_DEFAULT_PROCESSOR,
  sampleRate: proof.sampleRate || 24000,
  outputFormat: proof.outputFormat || "wav",
  proofFileName: path.basename(proofPath),
  proofOk: Boolean(proof.ok),
  generationTimingMs: Number(proof.generationTimingMs || 0) || 0,
  fallbackUsed: Boolean(proof.fallbackUsed || proof.providerFallback),
  fallbackReason: proof.fallbackReason || proof.error || "",
  auditionManifestFileName: "apex-kokoro-onnx-tts-v4-manifest.json",
  auditionCount: auditionManifest.voices.length,
  outputDir,
  openAiAudioUsed: false,
  cloudAudioAllowed: false,
  voiceboxUsed: false,
  generatedAt: new Date().toISOString(),
};

await fs.writeFile(path.join(outputDir, "apex-kokoro-onnx-tts-v4-proof-receipt.json"), JSON.stringify(receipt, null, 2), "utf8");
console.log(JSON.stringify(receipt, null, 2));
