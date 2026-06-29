import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import { Icon } from "./app-shell-components";

const APEX_AVATAR_MODEL_URL = "/assets/apex-avatar/apex-intelligence-live-web-1536.glb";
const APEX_AVATAR_MASTER_MODEL_URL = "/assets/apex-avatar/apex-intelligence-idle-app-ready.glb";
const APEX_AVATAR_FALLBACK_MODEL_URL = "/assets/apex-avatar/apex-assistant.glb";
const APEX_OPERATOR_MODEL_STATS = Object.freeze({
  label: "Apex Intelligence 01",
  triangles: "125k",
  size: "10.9 MB",
  textureMaps: "1536 runtime",
  animation: "7 state clips",
});
const APEX_AVATAR_CLIP_BY_MODE = Object.freeze({
  standby: "Idle",
  listening: "Listening",
  hearing: "Hearing",
  thinking: "Thinking",
  speaking: "Speaking",
  blocked: "Alert",
});
const APEX_AVATAR_REQUIRED_CLIPS = Object.freeze(["Idle", "Listening", "Hearing", "Thinking", "Speaking", "Blocked", "Alert"]);

const AVATAR_MODES = Object.freeze({
  standby: {
    label: "Standby",
    tone: "slate",
    color: 0x94a3b8,
    accent: 0x38bdf8,
    energy: 0.18,
    status: "Quiet shell",
  },
  listening: {
    label: "Listening",
    tone: "cyan",
    color: 0x67e8f9,
    accent: 0xfb923c,
    energy: 0.34,
    status: "Input open",
  },
  hearing: {
    label: "Hearing",
    tone: "green",
    color: 0x6ee7b7,
    accent: 0x67e8f9,
    energy: 0.62,
    status: "Voice capture",
  },
  thinking: {
    label: "Thinking",
    tone: "blue",
    color: 0x38bdf8,
    accent: 0xa5f3fc,
    energy: 0.48,
    status: "Processing",
  },
  speaking: {
    label: "Speaking",
    tone: "orange",
    color: 0xfb923c,
    accent: 0x67e8f9,
    energy: 0.78,
    status: "Talking back",
  },
  blocked: {
    label: "Blocked",
    tone: "red",
    color: 0xf87171,
    accent: 0xfca5a5,
    energy: 0.28,
    status: "Safety lock",
  },
});

const AVATAR_MODE_ORDER = Object.freeze(["standby", "listening", "hearing", "thinking", "speaking", "blocked"]);

function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}

function createHologramMaterial(color = 0x67e8f9, opacity = 0.28) {
  return new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      color: { value: new THREE.Color(color) },
      opacity: { value: opacity },
      energy: { value: 0.4 },
    },
    vertexShader: `
      varying vec3 vPosition;
      varying vec3 vNormal;

      void main() {
        vPosition = position;
        vNormal = normal;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform vec3 color;
      uniform float opacity;
      uniform float energy;
      varying vec3 vPosition;
      varying vec3 vNormal;

      void main() {
        float scan = 0.5 + 0.5 * sin((vPosition.y * 18.0) + (time * (4.5 + energy * 5.0)));
        float rim = pow(1.0 - abs(vNormal.z), 1.7);
        float band = smoothstep(0.2, 0.92, scan);
        float alpha = opacity * (0.36 + band * 0.42 + rim * 0.72 + energy * 0.2);
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}

function createLineMaterial(color = 0x67e8f9, opacity = 0.5) {
  return new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

function createGlowMaterial(color = 0x67e8f9, opacity = 0.42) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

function cloneImportedMaterial(material, { preserveTexture = true } = {}) {
  const cloned = material?.clone ? material.clone() : new THREE.MeshStandardMaterial({ color: 0x101827, metalness: 0.74, roughness: 0.42 });
  cloned.side = THREE.DoubleSide;
  if (preserveTexture) {
    if ("metalness" in cloned) cloned.metalness = Math.max(cloned.metalness ?? 0, 0.58);
    if ("roughness" in cloned) cloned.roughness = Math.min(Math.max(cloned.roughness ?? 0.42, 0.28), 0.62);
    if ("emissive" in cloned) {
      cloned.emissive = cloned.emissive || new THREE.Color(0x000000);
      cloned.emissiveIntensity = Math.max(cloned.emissiveIntensity ?? 0, 0.08);
    }
    cloned.transparent = false;
    cloned.opacity = 1;
    cloned.depthWrite = true;
    cloned.needsUpdate = true;
    return cloned;
  }

  cloned.color = new THREE.Color(0x67e8f9);
  cloned.transparent = true;
  cloned.opacity = 0.22;
  cloned.blending = THREE.AdditiveBlending;
  cloned.depthWrite = false;
  cloned.needsUpdate = true;
  return cloned;
}

function createWireObject(geometry, color, opacity = 0.52) {
  const edges = new THREE.EdgesGeometry(geometry, 18);
  const line = new THREE.LineSegments(edges, createLineMaterial(color, opacity));
  line.userData.disposeGeometry = edges;
  return line;
}

function createExtrudedShapeGeometry(points, depth = 0.14) {
  const shape = new THREE.Shape();
  points.forEach(([x, y], index) => {
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  });
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    curveSegments: 1,
    steps: 1,
  });
  geometry.center();
  geometry.computeVertexNormals();
  return geometry;
}

function createRing(radius, color, opacity = 0.42) {
  const geometry = new THREE.TorusGeometry(radius, 0.006, 8, 144);
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  return new THREE.Mesh(geometry, material);
}

function createDataParticleSystem(count = 460) {
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  for (let index = 0; index < count; index += 1) {
    const row = index * 3;
    positions[row] = (Math.random() - 0.5) * 5.8;
    positions[row + 1] = (Math.random() - 0.5) * 5.1;
    positions[row + 2] = (Math.random() - 0.5) * 2.4;
    seeds[index] = Math.random();
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0x67e8f9,
    size: 0.018,
    transparent: true,
    opacity: 0.68,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const points = new THREE.Points(geometry, material);
  points.userData.seeds = seeds;
  return points;
}

function tintObjectMaterials(object, color, opacity) {
  object.traverse((node) => {
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.filter(Boolean).forEach((material) => {
      if (material.color) material.color.copy(color);
      if (typeof material.opacity === "number") material.opacity = opacity;
    });
  });
}

function disposeSceneObject(object) {
  object.traverse((node) => {
    if (node.geometry) node.geometry.dispose();
    if (node.userData?.disposeGeometry) node.userData.disposeGeometry.dispose();
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.filter(Boolean).forEach((material) => material.dispose());
  });
}

function toneClass(tone) {
  if (tone === "green") return "border-emerald-300/30 bg-emerald-500/12 text-emerald-100";
  if (tone === "orange") return "border-orange-300/40 bg-orange-500/14 text-orange-100";
  if (tone === "red") return "border-red-300/34 bg-red-500/12 text-red-100";
  if (tone === "blue") return "border-sky-300/30 bg-sky-500/12 text-sky-100";
  if (tone === "cyan") return "border-cyan-300/32 bg-cyan-500/12 text-cyan-100";
  return "border-slate-400/22 bg-slate-500/10 text-slate-100";
}

function ApexAvatarLabSlider({ label, value, min = 0, max = 1, step = 0.01, onChange }) {
  return (
    <label className="co-apex-avatar-lab-slider grid min-w-0 gap-2">
      <span className="flex min-w-0 items-center justify-between gap-3">
        <span className="truncate text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{label}</span>
        <strong className="text-[10px] font-black text-cyan-200">{Math.round(value * 100)}%</strong>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(clampNumber(event.target.value, min, max))}
        className="co-apex-avatar-lab-range"
      />
    </label>
  );
}

function ApexAvatarLabToggle({ label, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`co-apex-avatar-lab-toggle ${checked ? "is-on" : ""}`}
      aria-pressed={checked}
    >
      <span aria-hidden="true" />
      <strong>{label}</strong>
    </button>
  );
}

function ApexAvatarLabScene({ mode, voiceEnergy, scanDepth, particleDensity, autoPulse, hudShell, particles }) {
  const canvasRef = useRef(null);
  const modeRef = useRef(mode);
  const voiceEnergyRef = useRef(voiceEnergy);
  const scanDepthRef = useRef(scanDepth);
  const particleDensityRef = useRef(particleDensity);
  const autoPulseRef = useRef(autoPulse);
  const hudShellRef = useRef(hudShell);
  const particlesRef = useRef(particles);

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { voiceEnergyRef.current = voiceEnergy; }, [voiceEnergy]);
  useEffect(() => { scanDepthRef.current = scanDepth; }, [scanDepth]);
  useEffect(() => { particleDensityRef.current = particleDensity; }, [particleDensity]);
  useEffect(() => { autoPulseRef.current = autoPulse; }, [autoPulse]);
  useEffect(() => { hudShellRef.current = hudShell; }, [hudShell]);
  useEffect(() => { particlesRef.current = particles; }, [particles]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 80);
    camera.position.set(0, 0.26, 6.4);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x020617, 0);

    const root = new THREE.Group();
    root.position.y = -0.18;
    root.userData.mobile = false;
    scene.add(root);

    const ambient = new THREE.AmbientLight(0x67e8f9, 0.85);
    scene.add(ambient);
    const keyLight = new THREE.PointLight(0xfb923c, 3.1, 12);
    keyLight.position.set(1.9, 2.2, 3.6);
    scene.add(keyLight);
    const cyanLight = new THREE.PointLight(0x67e8f9, 2.5, 12);
    cyanLight.position.set(-2.2, 1.5, 2.8);
    scene.add(cyanLight);

    const assetRigGroup = new THREE.Group();
    assetRigGroup.name = "ApexAvatarAssetRig";
    assetRigGroup.visible = false;
    root.add(assetRigGroup);
    let assetMixer = null;
    let assetReady = false;
    let assetLoadError = false;
    const assetMaterials = [];
    const assetWireMaterials = [];
    const assetActions = new Map();
    let activeAssetAction = null;
    let activeAssetClipName = "";
    const assetOverlayGroup = new THREE.Group();
    assetOverlayGroup.name = "ApexOperatorLightRig";
    assetOverlayGroup.visible = false;
    root.add(assetOverlayGroup);
    const assetEyeMaterial = createGlowMaterial(0x67e8f9, 0.9);
    const assetEyeGlowMaterial = createGlowMaterial(0x67e8f9, 0.18);
    const assetMouthMaterial = createGlowMaterial(0x67e8f9, 0.34);
    const assetCoreMaterial = createGlowMaterial(0x67e8f9, 0.58);
    const assetOrangeCoreMaterial = createGlowMaterial(0xfb923c, 0.36);
    const assetEyes = [0].map((x) => {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.024, 0.018), assetEyeMaterial.clone());
      eye.position.set(x, 1.15, 0.69);
      assetOverlayGroup.add(eye);
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.08, 0.12), assetEyeGlowMaterial.clone());
      glow.position.set(x, 1.15, 0.685);
      assetOverlayGroup.add(glow);
      return { eye, glow };
    });
    const assetMouthBars = Array.from({ length: 13 }, (_, index) => {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.052, 0.016), assetMouthMaterial.clone());
      bar.position.set((index - 6) * 0.048, 1.15, 0.715);
      bar.userData.index = index;
      bar.userData.phase = index * 0.52;
      assetOverlayGroup.add(bar);
      return bar;
    });
    const assetMouthRail = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.01, 0.014), createGlowMaterial(0x67e8f9, 0.06));
    assetMouthRail.position.set(0, 1.15, 0.718);
    assetOverlayGroup.add(assetMouthRail);
    const assetCore = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.014, 10, 96), assetCoreMaterial.clone());
    assetCore.position.set(0, 0.02, 0.72);
    assetOverlayGroup.add(assetCore);
    const assetCoreInner = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.007, 8, 72), assetOrangeCoreMaterial.clone());
    assetCoreInner.position.copy(assetCore.position);
    assetOverlayGroup.add(assetCoreInner);
    const assetCoreDot = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 8), createGlowMaterial(0x67e8f9, 0.86));
    assetCoreDot.position.set(0, 0.02, 0.735);
    assetOverlayGroup.add(assetCoreDot);
    const assetBaseRingGroup = new THREE.Group();
    assetBaseRingGroup.position.set(0, -1.2, 0);
    assetOverlayGroup.add(assetBaseRingGroup);
    const assetBaseRings = [0.74, 1.08, 1.42].map((radius, index) => {
      const ring = createRing(radius, index === 1 ? 0xfb923c : 0x67e8f9, 0.14);
      ring.rotation.x = Math.PI / 2;
      ring.userData.index = index;
      assetBaseRingGroup.add(ring);
      return ring;
    });
    const assetShoulderScan = new THREE.Mesh(new THREE.TorusGeometry(1.18, 0.006, 8, 128, Math.PI * 1.04), createGlowMaterial(0x67e8f9, 0.2));
    assetShoulderScan.position.set(0, 0.34, 0.58);
    assetShoulderScan.rotation.set(Math.PI, 0, 0);
    assetShoulderScan.scale.set(1, 0.24, 1);
    assetOverlayGroup.add(assetShoulderScan);

    const shaderMaterial = createHologramMaterial(0x67e8f9, 0.24);
    const androidRigGroup = new THREE.Group();
    root.add(androidRigGroup);

    const facetedHelmetGroup = new THREE.Group();
    androidRigGroup.add(facetedHelmetGroup);
    const headGeometry = createExtrudedShapeGeometry([
      [-0.54, 0.26],
      [-0.42, 0.55],
      [-0.16, 0.72],
      [0.16, 0.72],
      [0.42, 0.55],
      [0.54, 0.26],
      [0.48, -0.28],
      [0.24, -0.58],
      [0, -0.72],
      [-0.24, -0.58],
      [-0.48, -0.28],
    ], 0.18);
    const headBaseScale = new THREE.Vector3(1.05, 1.04, 1);
    const headMesh = new THREE.Mesh(headGeometry, shaderMaterial.clone());
    headMesh.scale.copy(headBaseScale);
    headMesh.position.set(0, 1.68, 0.44);
    facetedHelmetGroup.add(headMesh);
    const headWire = createWireObject(headGeometry, 0x67e8f9, 0.58);
    headWire.scale.copy(headMesh.scale).multiplyScalar(1.012);
    headWire.position.copy(headMesh.position);
    facetedHelmetGroup.add(headWire);

    const helmetPanelMaterial = createGlowMaterial(0x67e8f9, 0.2);
    const browArmor = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.09, 0.04), helmetPanelMaterial.clone());
    browArmor.position.set(0, 1.92, 0.56);
    const chinGuard = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.1, 0.04), helmetPanelMaterial.clone());
    chinGuard.position.set(0, 1.17, 0.56);
    const leftJawPlate = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.46, 0.04), helmetPanelMaterial.clone());
    leftJawPlate.position.set(-0.45, 1.42, 0.55);
    leftJawPlate.rotation.z = -0.22;
    const rightJawPlate = leftJawPlate.clone();
    rightJawPlate.material = helmetPanelMaterial.clone();
    rightJawPlate.position.x = 0.45;
    rightJawPlate.rotation.z = 0.22;
    const leftTempleFin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.52, 0.05), helmetPanelMaterial.clone());
    leftTempleFin.position.set(-0.66, 1.66, 0.47);
    leftTempleFin.rotation.z = 0.18;
    const rightTempleFin = leftTempleFin.clone();
    rightTempleFin.material = helmetPanelMaterial.clone();
    rightTempleFin.position.x = 0.66;
    rightTempleFin.rotation.z = -0.18;
    facetedHelmetGroup.add(browArmor, chinGuard, leftJawPlate, rightJawPlate, leftTempleFin, rightTempleFin);

    const neckGeometry = new THREE.CylinderGeometry(0.18, 0.26, 0.45, 6, 1, true);
    const neck = new THREE.Mesh(neckGeometry, shaderMaterial.clone());
    neck.position.set(0, 0.94, 0.2);
    androidRigGroup.add(neck);
    const neckWire = createWireObject(neckGeometry, 0x67e8f9, 0.42);
    neckWire.position.copy(neck.position);
    androidRigGroup.add(neckWire);

    const angularTorsoGeometry = createExtrudedShapeGeometry([
      [-0.74, 0.92],
      [0.74, 0.92],
      [1.05, -0.58],
      [0.72, -1.12],
      [0.26, -1.24],
      [-0.26, -1.24],
      [-0.72, -1.12],
      [-1.05, -0.58],
    ], 0.22);
    const torsoGeometry = angularTorsoGeometry;
    const torso = new THREE.Mesh(torsoGeometry, shaderMaterial.clone());
    torso.position.set(0, -0.08, 0.28);
    androidRigGroup.add(torso);
    const torsoWire = createWireObject(torsoGeometry, 0x67e8f9, 0.54);
    torsoWire.scale.copy(torso.scale).multiplyScalar(1.01);
    torsoWire.position.copy(torso.position);
    androidRigGroup.add(torsoWire);

    const shoulderGeometry = new THREE.TorusGeometry(1.38, 0.012, 8, 120, Math.PI);
    const shoulder = new THREE.Mesh(shoulderGeometry, new THREE.MeshBasicMaterial({
      color: 0x67e8f9,
      transparent: true,
      opacity: 0.62,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));
    shoulder.position.set(0, 0.67, 0);
    shoulder.rotation.set(Math.PI, 0, 0);
    shoulder.scale.set(1, 0.28, 1);
    androidRigGroup.add(shoulder);

    const silhouetteGroup = new THREE.Group();
    androidRigGroup.add(silhouetteGroup);
    const shoulderBladeGeometry = new THREE.BoxGeometry(0.82, 0.16, 0.04);
    const leftShoulderBlade = new THREE.Mesh(shoulderBladeGeometry, createGlowMaterial(0x67e8f9, 0.18));
    leftShoulderBlade.position.set(-0.88, 0.67, 0.5);
    leftShoulderBlade.rotation.z = -0.12;
    const rightShoulderBlade = leftShoulderBlade.clone();
    rightShoulderBlade.material = leftShoulderBlade.material.clone();
    rightShoulderBlade.position.x = 0.88;
    rightShoulderBlade.rotation.z = 0.12;
    silhouetteGroup.add(leftShoulderBlade, rightShoulderBlade);
    const shoulderCapGeometry = new THREE.BoxGeometry(0.36, 0.11, 0.022);
    const leftShoulderCap = new THREE.Mesh(shoulderCapGeometry, createGlowMaterial(0x67e8f9, 0.24));
    leftShoulderCap.position.set(-0.94, 0.56, 0.5);
    leftShoulderCap.rotation.z = -0.2;
    const rightShoulderCap = leftShoulderCap.clone();
    rightShoulderCap.material = leftShoulderCap.material.clone();
    rightShoulderCap.position.x = 0.94;
    rightShoulderCap.rotation.z = 0.2;
    silhouetteGroup.add(leftShoulderCap, rightShoulderCap);
    const spineLine = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.86, 0.02), createGlowMaterial(0x67e8f9, 0.2));
    spineLine.position.set(0, -0.06, 0.68);
    silhouetteGroup.add(spineLine);
    const hipBridge = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.032, 0.02), createGlowMaterial(0x67e8f9, 0.22));
    hipBridge.position.set(0, -1.02, 0.56);
    silhouetteGroup.add(hipBridge);

    const armMaterial = createLineMaterial(0x67e8f9, 0.38);
    const armGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-1.08, 0.48, 0),
      new THREE.Vector3(-1.46, -0.18, 0.06),
      new THREE.Vector3(-1.24, -0.9, 0),
      new THREE.Vector3(-0.82, -1.28, -0.02),
    ]);
    const leftArm = new THREE.Line(armGeometry, armMaterial);
    const rightArm = new THREE.Line(armGeometry.clone(), armMaterial.clone());
    rightArm.scale.x = -1;
    androidRigGroup.add(leftArm, rightArm);
    const forearmAccentGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-1.36, -0.22, 0.18),
      new THREE.Vector3(-1.12, -0.86, 0.18),
      new THREE.Vector3(-0.72, -1.2, 0.16),
    ]);
    const leftForearmAccent = new THREE.Line(forearmAccentGeometry, createLineMaterial(0xfb923c, 0.2));
    const rightForearmAccent = new THREE.Line(forearmAccentGeometry.clone(), createLineMaterial(0xfb923c, 0.2));
    rightForearmAccent.scale.x = -1;
    silhouetteGroup.add(leftForearmAccent, rightForearmAccent);

    const reactorCoreGeometry = new THREE.OctahedronGeometry(0.28, 0);
    const coreGeometry = reactorCoreGeometry;
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0xfb923c,
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    core.position.set(0, -0.08, 0.55);
    androidRigGroup.add(core);

    const coreHalo = createRing(0.56, 0xfb923c, 0.54);
    coreHalo.position.copy(core.position);
    androidRigGroup.add(coreHalo);
    const coreHaloTwo = createRing(0.78, 0x67e8f9, 0.34);
    coreHaloTwo.position.copy(core.position);
    coreHaloTwo.rotation.x = Math.PI / 2;
    androidRigGroup.add(coreHaloTwo);

    const eyeGeometry = new THREE.BoxGeometry(0.28, 0.024, 0.025);
    const eyeMaterial = new THREE.MeshBasicMaterial({
      color: 0xfb923c,
      transparent: true,
      opacity: 0.94,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.28, 1.73, 0.51);
    const rightEye = new THREE.Mesh(eyeGeometry.clone(), eyeMaterial.clone());
    rightEye.position.set(0.28, 1.73, 0.51);
    root.add(leftEye, rightEye);

    const mouthBars = [];
    const mouthMaterial = new THREE.MeshBasicMaterial({
      color: 0xfb923c,
      transparent: true,
      opacity: 0.76,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    for (let index = 0; index < 9; index += 1) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.16, 0.022), mouthMaterial.clone());
      bar.position.set((index - 4) * 0.06, 1.47, 0.55);
      bar.userData.index = index;
      bar.userData.phase = index * 0.7;
      mouthBars.push(bar);
      root.add(bar);
    }
    const mouthEnvelope = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.032, 0.018), createGlowMaterial(0xfb923c, 0.32));
    mouthEnvelope.position.set(0, 1.48, 0.565);
    root.add(mouthEnvelope);

    const faceDetailGroup = new THREE.Group();
    root.add(faceDetailGroup);
    const facePlate = new THREE.Mesh(new THREE.PlaneGeometry(0.98, 0.52), createGlowMaterial(0x67e8f9, 0.12));
    facePlate.position.set(0, 1.66, 0.535);
    faceDetailGroup.add(facePlate);
    const browBridge = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.018, 0.018), createGlowMaterial(0xfb923c, 0.72));
    browBridge.position.set(0, 1.84, 0.58);
    faceDetailGroup.add(browBridge);
    const jawArc = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.006, 8, 88, Math.PI * 0.86), createGlowMaterial(0x67e8f9, 0.4));
    jawArc.position.set(0.17, 1.43, 0.57);
    jawArc.rotation.z = Math.PI + 0.28;
    jawArc.scale.set(1, 0.34, 1);
    faceDetailGroup.add(jawArc);
    const cheekLineGeometry = new THREE.BoxGeometry(0.25, 0.014, 0.018);
    const leftCheek = new THREE.Mesh(cheekLineGeometry, createGlowMaterial(0x67e8f9, 0.46));
    leftCheek.position.set(-0.31, 1.55, 0.575);
    leftCheek.rotation.z = -0.18;
    const rightCheek = leftCheek.clone();
    rightCheek.material = leftCheek.material.clone();
    rightCheek.position.x = 0.31;
    rightCheek.rotation.z = 0.18;
    faceDetailGroup.add(leftCheek, rightCheek);
    const templeGeometry = new THREE.BoxGeometry(0.12, 0.22, 0.018);
    const leftTemple = new THREE.Mesh(templeGeometry, createGlowMaterial(0x67e8f9, 0.34));
    leftTemple.position.set(-0.55, 1.7, 0.48);
    leftTemple.rotation.z = 0.2;
    const rightTemple = leftTemple.clone();
    rightTemple.material = leftTemple.material.clone();
    rightTemple.position.x = 0.55;
    rightTemple.rotation.z = -0.2;
    faceDetailGroup.add(leftTemple, rightTemple);

    const armorDetailGroup = new THREE.Group();
    root.add(armorDetailGroup);
    const chestPlateGeometry = new THREE.BoxGeometry(0.46, 0.72, 0.018);
    const leftChestPlate = new THREE.Mesh(chestPlateGeometry, createGlowMaterial(0x67e8f9, 0.18));
    leftChestPlate.position.set(-0.32, 0.13, 0.58);
    leftChestPlate.rotation.z = -0.11;
    const rightChestPlate = leftChestPlate.clone();
    rightChestPlate.material = leftChestPlate.material.clone();
    rightChestPlate.position.x = 0.32;
    rightChestPlate.rotation.z = 0.11;
    armorDetailGroup.add(leftChestPlate, rightChestPlate);
    const sternum = new THREE.Mesh(new THREE.BoxGeometry(0.052, 1.18, 0.024), createGlowMaterial(0xfb923c, 0.32));
    sternum.position.set(0, 0.02, 0.62);
    armorDetailGroup.add(sternum);
    const collarGeometry = new THREE.BoxGeometry(0.58, 0.02, 0.02);
    const leftCollar = new THREE.Mesh(collarGeometry, createGlowMaterial(0x67e8f9, 0.42));
    leftCollar.position.set(-0.33, 0.72, 0.55);
    leftCollar.rotation.z = -0.2;
    const rightCollar = leftCollar.clone();
    rightCollar.material = leftCollar.material.clone();
    rightCollar.position.x = 0.33;
    rightCollar.rotation.z = 0.2;
    armorDetailGroup.add(leftCollar, rightCollar);
    const ribBars = [];
    for (let index = 0; index < 6; index += 1) {
      const width = 0.66 - index * 0.058;
      const rib = new THREE.Mesh(new THREE.BoxGeometry(width, 0.012, 0.018), createGlowMaterial(0x67e8f9, 0.28));
      rib.position.set(0, 0.38 - index * 0.18, 0.63);
      rib.userData.index = index;
      ribBars.push(rib);
      armorDetailGroup.add(rib);
    }
    const waistRing = createRing(0.72, 0x67e8f9, 0.24);
    waistRing.position.set(0, -1, 0.1);
    waistRing.scale.set(1, 0.26, 1);
    armorDetailGroup.add(waistRing);

    const jointNodeGeometry = new THREE.OctahedronGeometry(0.07, 0);
    const jointNodes = [
      [-1.08, 0.48, 0.08],
      [1.08, 0.48, 0.08],
      [-1.46, -0.18, 0.12],
      [1.46, -0.18, 0.12],
      [-0.82, -1.28, 0.08],
      [0.82, -1.28, 0.08],
    ].map(([x, y, z], index) => {
      const node = new THREE.Mesh(jointNodeGeometry, createGlowMaterial(index < 2 ? 0xfb923c : 0x67e8f9, 0.46));
      node.position.set(x, y, z);
      node.userData.base = { x, y, z };
      armorDetailGroup.add(node);
      return node;
    });

    const voiceRingGroup = new THREE.Group();
    voiceRingGroup.position.set(0, 1.48, 0.59);
    root.add(voiceRingGroup);
    const voiceRings = [0.35, 0.48, 0.62].map((radius, index) => {
      const ring = createRing(radius, index === 1 ? 0xfb923c : 0x67e8f9, 0.12);
      ring.scale.set(1, 0.24, 1);
      ring.userData.index = index;
      voiceRingGroup.add(ring);
      return ring;
    });

    const thoughtOrbitGroup = new THREE.Group();
    thoughtOrbitGroup.position.set(0, 1.62, 0.02);
    root.add(thoughtOrbitGroup);
    const thoughtNodeGeometry = new THREE.OctahedronGeometry(0.042, 0);
    const thoughtNodes = Array.from({ length: 9 }, (_, index) => {
      const node = new THREE.Mesh(thoughtNodeGeometry, createGlowMaterial(index % 2 ? 0xfb923c : 0x67e8f9, 0.22));
      node.userData.angle = (index / 9) * Math.PI * 2;
      thoughtOrbitGroup.add(node);
      return node;
    });

    const safetyLockGroup = new THREE.Group();
    root.add(safetyLockGroup);
    const safetyVerticalGeometry = new THREE.BoxGeometry(0.026, 2.68, 0.026);
    const safetyHorizontalGeometry = new THREE.BoxGeometry(2.22, 0.026, 0.026);
    [
      [-1.15, 0.18, 0.7, safetyVerticalGeometry],
      [1.15, 0.18, 0.7, safetyVerticalGeometry],
      [0, 1.52, 0.7, safetyHorizontalGeometry],
      [0, -1.16, 0.7, safetyHorizontalGeometry],
    ].forEach(([x, y, z, geometry]) => {
      const bar = new THREE.Mesh(geometry, createGlowMaterial(0xf87171, 0));
      bar.position.set(x, y, z);
      safetyLockGroup.add(bar);
    });

    const shellGroup = new THREE.Group();
    scene.add(shellGroup);
    const shellRings = [
      createRing(1.82, 0x38bdf8, 0.28),
      createRing(2.34, 0xfb923c, 0.22),
      createRing(2.78, 0x67e8f9, 0.18),
    ];
    shellRings.forEach((ring, index) => {
      ring.rotation.x = Math.PI / 2.7;
      ring.rotation.z = index * 0.9;
      shellGroup.add(ring);
    });

    const scanPlaneGeometry = new THREE.PlaneGeometry(3.8, 4.6, 1, 1);
    const scanPlaneMaterial = new THREE.MeshBasicMaterial({
      color: 0x67e8f9,
      transparent: true,
      opacity: 0.07,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const scanPlane = new THREE.Mesh(scanPlaneGeometry, scanPlaneMaterial);
    scanPlane.position.z = -0.22;
    root.add(scanPlane);

    const particleSystem = createDataParticleSystem(560);
    scene.add(particleSystem);

    const assetLoader = new GLTFLoader();

    function resolveAssetClipName(currentMode) {
      const preferred = APEX_AVATAR_CLIP_BY_MODE[currentMode] || "Idle";
      if (assetActions.has(preferred)) return preferred;
      if (currentMode === "blocked" && assetActions.has("Blocked")) return "Blocked";
      if (assetActions.has("Idle")) return "Idle";
      return assetActions.keys().next().value || "";
    }

    function playAssetModeClip(currentMode, { immediate = false } = {}) {
      if (!assetMixer || !assetActions.size) return;
      const nextClipName = resolveAssetClipName(currentMode);
      if (!nextClipName || nextClipName === activeAssetClipName) return;
      const nextAction = assetActions.get(nextClipName);
      if (!nextAction) return;

      nextAction.enabled = true;
      nextAction.reset();
      nextAction.setEffectiveTimeScale(1);
      nextAction.setEffectiveWeight(1);
      nextAction.play();

      if (activeAssetAction && activeAssetAction !== nextAction) {
        activeAssetAction.enabled = true;
        activeAssetAction.crossFadeTo(nextAction, immediate ? 0 : 0.36, false);
      } else {
        nextAction.setEffectiveWeight(1);
      }

      activeAssetAction = nextAction;
      activeAssetClipName = nextClipName;
    }

    function loadAvatarAsset(url, { preserveTexture = true, fallback = false } = {}) {
      assetLoader.load(
        url,
        (gltf) => {
        if (disposed) return;
        const model = gltf.scene;
        model.name = fallback ? "ApexAvatarFallbackGLBModel" : "ApexOperatorMeshyGLBModel";
        const modelBox = new THREE.Box3().setFromObject(model);
        const modelSize = modelBox.getSize(new THREE.Vector3());
        const modelCenter = modelBox.getCenter(new THREE.Vector3());
        const modelHeight = preserveTexture ? 3.25 : 2.3;
        const modelScale = modelSize.y > 0 ? modelHeight / modelSize.y : 1;
        model.scale.setScalar(modelScale);
        model.position.set(-modelCenter.x * modelScale, -modelBox.min.y * modelScale - 1.28, -modelCenter.z * modelScale + (preserveTexture ? 0.02 : 0.05));

        model.traverse((node) => {
          if (!node.isMesh) return;
          node.castShadow = false;
          node.receiveShadow = false;
          const sourceMaterialNames = (Array.isArray(node.material) ? node.material : [node.material])
            .filter(Boolean)
            .map((material) => material.name || "")
            .join(" ");
          const materialSignature = `${node.name || ""} ${sourceMaterialNames}`;
          const isEnergySurface = /Visor|Mouth|Jaw|Core|Halo|Ring|Panel|Signal|Line/i.test(materialSignature);
          const isLargePanel = /HoloPanel|EnergyRing|BootHalo/i.test(materialSignature);
          const surface = isLargePanel ? "panel" : isEnergySurface ? "energy" : "armor";
          const materials = Array.isArray(node.material) ? node.material : [node.material];
          const preparedMaterials = materials.map((material) => {
            const prepared = cloneImportedMaterial(material, { preserveTexture });
            prepared.userData.apexAvatarSurface = preserveTexture ? "textured" : surface;
            prepared.userData.apexBaseColor = prepared.color?.clone?.() || new THREE.Color(0x101827);
            prepared.userData.apexBaseEmissive = prepared.emissive?.clone?.() || new THREE.Color(0x000000);
            prepared.userData.apexBaseOpacity = typeof prepared.opacity === "number" ? prepared.opacity : 1;
            assetMaterials.push(prepared);
            return prepared;
          });
          node.material = Array.isArray(node.material) ? preparedMaterials : preparedMaterials[0];
          if (!preserveTexture && node.geometry) {
            const wire = createWireObject(node.geometry, isEnergySurface ? 0x67e8f9 : 0x38bdf8, isEnergySurface ? 0.26 : 0.18);
            wire.name = "ApexAvatarModelWire";
            wire.scale.setScalar(1.006);
            if (wire.material) wire.material.userData.apexAvatarSurface = surface;
            node.add(wire);
            if (wire.material) assetWireMaterials.push(wire.material);
          }
        });

        assetRigGroup.add(model);
        assetMixer = gltf.animations?.length ? new THREE.AnimationMixer(model) : null;
        assetActions.clear();
        activeAssetAction = null;
        activeAssetClipName = "";
        if (assetMixer) {
          gltf.animations.forEach((clip) => {
            const clipName = clip.name || `clip-${assetActions.size}`;
            const action = assetMixer.clipAction(clip);
            action.enabled = true;
            action.clampWhenFinished = false;
            action.setLoop(THREE.LoopRepeat, Infinity);
            action.setEffectiveWeight(0);
            assetActions.set(clipName, action);
          });
          playAssetModeClip(modeRef.current, { immediate: true });
        }
        assetReady = true;
        assetRigGroup.visible = true;
        assetLoadError = false;
      },
        undefined,
        () => {
          if (!fallback && url !== APEX_AVATAR_MASTER_MODEL_URL && APEX_AVATAR_MASTER_MODEL_URL) {
            loadAvatarAsset(APEX_AVATAR_MASTER_MODEL_URL, { preserveTexture: true, fallback: true });
            return;
          }
          if (url !== APEX_AVATAR_FALLBACK_MODEL_URL && APEX_AVATAR_FALLBACK_MODEL_URL) {
            loadAvatarAsset(APEX_AVATAR_FALLBACK_MODEL_URL, { preserveTexture: false, fallback: true });
            return;
          }
          assetLoadError = true;
        },
      );
    }

    loadAvatarAsset(APEX_AVATAR_MODEL_URL, { preserveTexture: true });

    const startTime = performance.now();
    let smoothedEnergy = voiceEnergyRef.current;
    let frame = 0;
    let animationFrame = 0;
    let lastFrameElapsed = 0;
    let disposed = false;

    function resize() {
      if (!canvas.parentElement) return;
      const rect = canvas.parentElement.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      const mobileFrame = width < 620;
      root.userData.mobile = mobileFrame;
      camera.position.z = mobileFrame ? 9 : 6.4;
      camera.position.y = mobileFrame ? 0.12 : 0.26;
      camera.updateProjectionMatrix();
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas.parentElement || canvas);
    resize();

    function applyModeVisuals(currentMode, currentEnergy, scanDepthValue, densityValue, elapsed) {
      const modeConfig = AVATAR_MODES[currentMode] || AVATAR_MODES.listening;
      const color = new THREE.Color(modeConfig.color);
      const accent = new THREE.Color(modeConfig.accent);
      const finalEnergy = clampNumber(Math.max(modeConfig.energy, currentEnergy), 0, 1);

      [headMesh, neck, torso].forEach((mesh) => {
        mesh.material.uniforms.time.value = elapsed;
        mesh.material.uniforms.energy.value = finalEnergy;
        mesh.material.uniforms.opacity.value = 0.17 + (finalEnergy * 0.26);
        mesh.material.uniforms.color.value.copy(color);
      });
      [headWire, neckWire, torsoWire, leftArm, rightArm].forEach((line) => {
        line.material.color.copy(color);
        line.material.opacity = 0.25 + (finalEnergy * 0.44);
      });
      tintObjectMaterials(facetedHelmetGroup, color, currentMode === "standby" ? 0.14 : 0.22 + finalEnergy * 0.32);
      tintObjectMaterials(silhouetteGroup, color, currentMode === "standby" ? 0.12 : 0.18 + finalEnergy * 0.28);
      [leftForearmAccent, rightForearmAccent, mouthEnvelope].forEach((line) => {
        line.material.color.copy(accent);
        line.material.opacity = currentMode === "standby" ? 0.08 : 0.22 + finalEnergy * 0.38;
      });
      shoulder.material.color.copy(color);
      shoulder.material.opacity = 0.3 + (finalEnergy * 0.38);
      core.material.color.copy(accent);
      core.material.opacity = 0.72 + (finalEnergy * 0.24);
      coreHalo.material.color.copy(accent);
      coreHalo.material.opacity = 0.24 + (finalEnergy * 0.36);
      coreHaloTwo.material.color.copy(color);
      coreHaloTwo.material.opacity = 0.2 + (finalEnergy * 0.28);
      leftEye.material.color.copy(accent);
      rightEye.material.color.copy(accent);
      mouthEnvelope.material.color.copy(accent);
      mouthBars.forEach((bar) => {
        bar.material.color.copy(accent);
        bar.material.opacity = currentMode === "standby" ? 0.18 : 0.45 + (finalEnergy * 0.42);
      });
      const detailOpacity = currentMode === "standby" ? 0.16 : 0.2 + finalEnergy * 0.34;
      tintObjectMaterials(faceDetailGroup, accent, detailOpacity);
      tintObjectMaterials(armorDetailGroup, color, 0.16 + finalEnergy * 0.28);
      ribBars.forEach((rib, index) => {
        rib.material.color.copy(index % 2 ? accent : color);
        rib.material.opacity = 0.16 + finalEnergy * 0.22;
      });
      jointNodes.forEach((node, index) => {
        node.material.color.copy(index < 2 ? accent : color);
        node.material.opacity = 0.3 + finalEnergy * 0.34;
      });
      const voiceOpacity = currentMode === "speaking" || currentMode === "hearing"
        ? 0.22 + finalEnergy * 0.32
        : currentMode === "listening"
          ? 0.14 + finalEnergy * 0.12
          : 0.04;
      voiceRingGroup.visible = currentMode !== "standby";
      tintObjectMaterials(voiceRingGroup, accent, voiceOpacity);
      const thinkingOpacity = currentMode === "thinking"
        ? 0.34 + finalEnergy * 0.34
        : currentMode === "listening"
          ? 0.18
          : 0.07;
      thoughtOrbitGroup.visible = currentMode !== "standby";
      tintObjectMaterials(thoughtOrbitGroup, currentMode === "thinking" ? accent : color, thinkingOpacity);
      safetyLockGroup.visible = currentMode === "blocked";
      tintObjectMaterials(safetyLockGroup, new THREE.Color(0xf87171), currentMode === "blocked" ? 0.72 : 0);
      shellRings.forEach((ring, index) => {
        ring.material.color.copy(index === 1 ? accent : color);
        ring.material.opacity = hudShellRef.current ? (0.13 + (finalEnergy * 0.24) - (index * 0.035)) : 0;
      });
      scanPlane.material.color.copy(color);
      scanPlane.material.opacity = 0.025 + (scanDepthValue * 0.11);
      particleSystem.material.color.copy(color);
      particleSystem.material.opacity = particlesRef.current ? (0.18 + (densityValue * 0.6)) : 0;
      keyLight.color.copy(accent);
      cyanLight.color.copy(color);
      keyLight.intensity = 1.2 + finalEnergy * 4.4;
      cyanLight.intensity = 1.1 + finalEnergy * 3.8;
      return finalEnergy;
    }

    function animate() {
      if (disposed) return;
      const elapsed = (performance.now() - startTime) / 1000;
      const delta = Math.max(0.001, Math.min(0.05, elapsed - lastFrameElapsed || 0.016));
      lastFrameElapsed = elapsed;
      const modeConfig = AVATAR_MODES[modeRef.current] || AVATAR_MODES.listening;
      const autopulse = autoPulseRef.current ? (0.5 + (Math.sin(elapsed * 2.4) * 0.5)) * 0.18 : 0;
      const rawEnergy = clampNumber(voiceEnergyRef.current + autopulse, 0, 1);
      smoothedEnergy += (rawEnergy - smoothedEnergy) * 0.08;
      const currentEnergy = smoothedEnergy;
      const finalEnergy = applyModeVisuals(modeRef.current, currentEnergy, scanDepthRef.current, particleDensityRef.current, elapsed);
      const talkingBoost = modeRef.current === "speaking" || modeRef.current === "hearing" ? 1 : 0.38;
      const speechMode = modeRef.current === "speaking" || modeRef.current === "hearing";
      const thinkingMode = modeRef.current === "thinking";
      const safetyMode = modeRef.current === "blocked";
      const mobileFrame = Boolean(root.userData.mobile);
      const targetScale = mobileFrame ? 0.58 : 1;
      const assetMode = assetReady && !assetLoadError;

      root.scale.setScalar(targetScale);
      const nativeMotionFactor = assetMode && assetMixer ? 0.28 : 1;
      root.rotation.y = Math.sin(elapsed * 0.42) * (0.14 + finalEnergy * 0.07) * nativeMotionFactor;
      root.rotation.x = Math.sin(elapsed * 0.33) * 0.045 * nativeMotionFactor;
      root.position.y = (mobileFrame ? 0.42 : -0.18) + Math.sin(elapsed * 1.4) * (assetMode && assetMixer ? 0.01 : 0.035);
      assetRigGroup.visible = assetMode;
      assetOverlayGroup.visible = assetMode;
      androidRigGroup.visible = !assetMode;
      faceDetailGroup.visible = !assetMode;
      armorDetailGroup.visible = !assetMode;
      [leftEye, rightEye, mouthEnvelope, ...mouthBars].forEach((object) => {
        object.visible = !assetMode;
      });
      const signalPulse = 0.5 + Math.sin(elapsed * (2.6 + finalEnergy * 2.4)) * 0.5;
      if (assetMode) {
        const modeConfig = AVATAR_MODES[modeRef.current] || AVATAR_MODES.speaking;
        const color = new THREE.Color(modeConfig.color);
        const accent = new THREE.Color(modeConfig.accent);
        playAssetModeClip(modeRef.current);
        assetRigGroup.rotation.y = Math.sin(elapsed * 0.46) * (assetMixer ? 0.028 : 0.16 + finalEnergy * 0.08);
        assetRigGroup.position.y = Math.sin(elapsed * 1.2) * (assetMixer ? 0.008 : 0.035);
        assetRigGroup.scale.setScalar(1 + Math.sin(elapsed * 1.8) * (assetMixer ? 0.002 : 0.01));
        assetOverlayGroup.rotation.copy(assetRigGroup.rotation);
        assetOverlayGroup.position.y = assetRigGroup.position.y;
        assetOverlayGroup.scale.copy(assetRigGroup.scale);
        assetMaterials.forEach((material, index) => {
          const surface = material.userData.apexAvatarSurface || "armor";
          if (surface === "textured") {
            const baseColor = material.userData.apexBaseColor || new THREE.Color(0x101827);
            const baseEmissive = material.userData.apexBaseEmissive || new THREE.Color(0x000000);
            if (material.color) material.color.copy(baseColor).lerp(color, 0.035 + finalEnergy * 0.045);
            if (material.emissive) {
              material.emissive.copy(baseEmissive).lerp(accent, 0.035 + finalEnergy * 0.08 + signalPulse * 0.035);
              material.emissiveIntensity = 0.1 + finalEnergy * 0.32;
            }
            material.opacity = material.userData.apexBaseOpacity || 1;
            material.transparent = false;
            material.depthWrite = true;
          } else if (surface === "armor") {
            material.color.copy(color).lerp(new THREE.Color(0x0f172a), 0.42);
            material.opacity = 0.16 + finalEnergy * 0.22;
          } else if (surface === "panel") {
            material.color.copy(index % 2 ? accent : color);
            material.opacity = 0.16 + finalEnergy * 0.24;
          } else {
            material.color.copy(index % 2 ? accent : color);
            material.opacity = 0.3 + finalEnergy * 0.34;
          }
        });
        assetWireMaterials.forEach((material, index) => {
          const surface = material.userData.apexAvatarSurface || "armor";
          material.color.copy(index % 2 ? color : accent);
          material.opacity = surface === "armor" ? 0.1 + finalEnergy * 0.16 : 0.14 + finalEnergy * 0.26;
        });
        if (assetMixer) {
          assetMixer.update(delta * (0.78 + finalEnergy * 0.42));
        }
        assetRigGroup.traverse((node) => {
          if (!node.morphTargetInfluences?.length) return;
          node.morphTargetInfluences.forEach((_, index) => {
            const wave = 0.5 + Math.sin(elapsed * (speechMode ? 6.4 : 2.2) + index * 0.7) * 0.5;
            node.morphTargetInfluences[index] = speechMode ? wave * 0.35 * finalEnergy : thinkingMode ? wave * 0.12 : 0;
          });
        });
        assetEyes.forEach(({ eye, glow }, index) => {
          const eyeWave = 0.5 + Math.sin(elapsed * (speechMode ? 5.8 : 2.4) + index * 0.4) * 0.5;
          eye.material.color.copy(accent);
          eye.material.opacity = 0.42 + finalEnergy * 0.28 + eyeWave * 0.05;
          eye.scale.x = 0.88 + eyeWave * 0.16 + finalEnergy * 0.08;
          glow.material.color.copy(accent);
          glow.material.opacity = 0.02 + finalEnergy * 0.06 + eyeWave * 0.025;
          glow.scale.set(1 + finalEnergy * 0.08, 1 + eyeWave * 0.12, 1);
        });
        assetMouthBars.forEach((bar) => {
          const primary = 0.5 + Math.sin(elapsed * (speechMode ? 9.2 : 3.4) + bar.userData.phase) * 0.5;
          const secondary = 0.5 + Math.sin(elapsed * (speechMode ? 14.6 : 5.1) + bar.userData.phase * 1.8) * 0.5;
          const centerFalloff = 1 - Math.min(0.78, Math.abs(bar.userData.index - 6) * 0.095);
          const target = 0.08 + ((primary * 0.58 + secondary * 0.42) * (0.16 + finalEnergy * 0.44) * talkingBoost * centerFalloff);
          bar.material.color.copy(accent);
          bar.material.opacity = speechMode ? 0.12 + finalEnergy * 0.22 : 0.04 + finalEnergy * 0.08;
          bar.scale.y = THREE.MathUtils.lerp(bar.scale.y, target, 0.24);
        });
        assetMouthRail.material.color.copy(accent);
        assetMouthRail.material.opacity = speechMode ? 0.05 + signalPulse * 0.08 : 0.02 + finalEnergy * 0.05;
        assetMouthRail.scale.x = 0.94 + finalEnergy * 0.1 + signalPulse * 0.08;
        assetCore.material.color.copy(color);
        assetCore.material.opacity = 0.22 + finalEnergy * 0.42;
        assetCore.rotation.z += 0.016 + finalEnergy * 0.026;
        assetCore.scale.setScalar(1 + signalPulse * (0.08 + finalEnergy * 0.12));
        assetCoreInner.material.color.copy(accent);
        assetCoreInner.material.opacity = 0.24 + finalEnergy * 0.32;
        assetCoreInner.rotation.z -= 0.012 + finalEnergy * 0.02;
        assetCoreInner.scale.setScalar(1 + Math.sin(elapsed * 4.4) * 0.08);
        assetCoreDot.material.color.copy(accent);
        assetCoreDot.material.opacity = 0.5 + finalEnergy * 0.38;
        assetCoreDot.scale.setScalar(0.82 + signalPulse * 0.42 + finalEnergy * 0.2);
        assetShoulderScan.material.color.copy(color);
        assetShoulderScan.material.opacity = 0.08 + finalEnergy * 0.22;
        assetShoulderScan.rotation.z = Math.sin(elapsed * 0.74) * 0.06;
        assetBaseRingGroup.rotation.y = Math.sin(elapsed * 0.24) * 0.08;
        assetBaseRings.forEach((ring, index) => {
          ring.material.color.copy(index === 1 ? accent : color);
          ring.material.opacity = 0.06 + finalEnergy * (0.17 - index * 0.02);
          ring.rotation.z += (0.006 + finalEnergy * 0.016) * (index % 2 ? -1 : 1);
          ring.scale.setScalar(1 + Math.sin(elapsed * (1.1 + index * 0.28)) * 0.025);
        });
      }
      facePlate.scale.set(1 + finalEnergy * 0.04, 1 + signalPulse * 0.035, 1);
      browBridge.scale.x = 0.92 + signalPulse * 0.16 + finalEnergy * 0.04;
      jawArc.scale.set(1 + signalPulse * 0.04, 0.34 + signalPulse * 0.04 + (speechMode ? finalEnergy * 0.08 : 0), 1);
      leftTemple.scale.y = 0.9 + signalPulse * 0.12;
      rightTemple.scale.y = 0.9 + signalPulse * 0.12;
      facetedHelmetGroup.rotation.z = Math.sin(elapsed * 0.8) * 0.012;
      browArmor.scale.x = 0.92 + signalPulse * 0.08 + finalEnergy * 0.05;
      chinGuard.scale.x = 0.92 + (speechMode ? signalPulse * 0.12 : signalPulse * 0.04);
      leftJawPlate.rotation.z = -0.22 - (speechMode ? signalPulse * 0.02 : 0);
      rightJawPlate.rotation.z = 0.22 + (speechMode ? signalPulse * 0.02 : 0);
      leftTempleFin.scale.y = 0.95 + signalPulse * 0.08;
      rightTempleFin.scale.y = 0.95 + signalPulse * 0.08;
      leftShoulderBlade.rotation.z = -0.12 - Math.sin(elapsed * 1.1) * 0.012;
      rightShoulderBlade.rotation.z = 0.12 + Math.sin(elapsed * 1.1) * 0.012;
      leftShoulderCap.rotation.z = -0.2 - Math.sin(elapsed * 1.1) * 0.018 - finalEnergy * 0.014;
      rightShoulderCap.rotation.z = 0.2 + Math.sin(elapsed * 1.1) * 0.018 + finalEnergy * 0.014;
      spineLine.scale.y = 0.94 + finalEnergy * 0.12 + signalPulse * 0.025;
      hipBridge.scale.x = 0.94 + Math.sin(elapsed * 1.4) * 0.018;
      leftForearmAccent.material.opacity = speechMode ? 0.3 + finalEnergy * 0.34 : 0.16 + finalEnergy * 0.18;
      rightForearmAccent.material.opacity = leftForearmAccent.material.opacity;
      leftChestPlate.scale.y = 1 + Math.sin(elapsed * 1.7) * 0.02;
      rightChestPlate.scale.y = 1 + Math.sin((elapsed * 1.7) + 0.35) * 0.02;
      sternum.scale.y = 0.94 + finalEnergy * 0.11 + signalPulse * 0.04;
      leftCollar.rotation.z = -0.2 - finalEnergy * 0.02;
      rightCollar.rotation.z = 0.2 + finalEnergy * 0.02;
      ribBars.forEach((rib) => {
        const ribWave = 0.5 + Math.sin(elapsed * (2.2 + finalEnergy) + rib.userData.index * 0.6) * 0.5;
        rib.scale.x = 0.88 + ribWave * 0.12 + finalEnergy * 0.06;
      });
      jointNodes.forEach((node, index) => {
        const base = node.userData.base;
        const nodePulse = 0.5 + Math.sin(elapsed * (2.8 + finalEnergy * 2) + index * 0.7) * 0.5;
        node.position.y = base.y + Math.sin(elapsed * 1.2 + index) * 0.018;
        node.scale.setScalar(0.82 + nodePulse * 0.18 + finalEnergy * 0.14);
        node.rotation.y += 0.012 + finalEnergy * 0.024;
      });
      headMesh.scale.x = headBaseScale.x * (1 + signalPulse * 0.01);
      headMesh.scale.y = headBaseScale.y * (1 + Math.sin(elapsed * 2.1) * 0.016);
      headMesh.scale.z = headBaseScale.z;
      headWire.scale.copy(headMesh.scale).multiplyScalar(1.012);
      torso.scale.y = 1 + Math.sin(elapsed * 1.8) * 0.012;
      torsoWire.scale.y = torso.scale.y * 1.01;
      core.scale.setScalar(1 + Math.sin(elapsed * (3.2 + finalEnergy * 3.4)) * (0.1 + finalEnergy * 0.18));
      coreHalo.rotation.z += 0.01 + finalEnergy * 0.03;
      coreHaloTwo.rotation.z -= 0.007 + finalEnergy * 0.022;
      waistRing.rotation.z -= 0.004 + finalEnergy * 0.012;
      shellGroup.visible = hudShellRef.current;
      shellRings.forEach((ring, index) => {
        ring.rotation.z += (0.0015 + finalEnergy * 0.006) * (index + 1) * (index === 1 ? -1 : 1);
        ring.scale.setScalar(1 + Math.sin(elapsed * (0.72 + index * 0.16)) * 0.022);
      });
      if (assetMode) {
        voiceRingGroup.position.set(0, 0.84, 0.74);
        voiceRingGroup.scale.setScalar(0.68);
      } else {
        voiceRingGroup.position.set(0, 1.48, 0.59);
        voiceRingGroup.scale.setScalar(1);
      }
      voiceRingGroup.rotation.z += speechMode ? 0.01 + finalEnergy * 0.025 : 0.003;
      voiceRings.forEach((ring, index) => {
        const wave = 0.5 + Math.sin(elapsed * (4.2 + finalEnergy * 6) - index * 0.62) * 0.5;
        const scale = 1 + index * 0.16 + (speechMode ? wave * (0.18 + finalEnergy * 0.3) : wave * 0.04);
        ring.scale.set(scale, 0.24 + index * 0.035 + (speechMode ? wave * 0.08 : 0.01), 1);
        ring.rotation.z += (0.003 + finalEnergy * 0.01) * (index % 2 ? -1 : 1);
      });
      thoughtOrbitGroup.rotation.y += thinkingMode ? 0.014 + finalEnergy * 0.018 : 0.004;
      thoughtNodes.forEach((node, index) => {
        const angle = node.userData.angle + elapsed * (thinkingMode ? 1.15 + finalEnergy : 0.28);
        const orbit = thinkingMode ? 1.1 + finalEnergy * 0.18 : 0.76;
        node.position.set(Math.cos(angle) * orbit, Math.sin(angle * 1.7) * 0.22, Math.sin(angle) * 0.38);
        const nodeScale = thinkingMode ? 0.9 + Math.sin(elapsed * 3 + index) * 0.24 + finalEnergy * 0.18 : 0.6;
        node.scale.setScalar(Math.max(0.42, nodeScale));
        node.rotation.x += 0.013 + finalEnergy * 0.02;
        node.rotation.y -= 0.011 + finalEnergy * 0.015;
      });
      if (safetyMode) {
        safetyLockGroup.scale.setScalar(1 + Math.sin(elapsed * 3.1) * 0.018);
        safetyLockGroup.rotation.z = Math.sin(elapsed * 0.7) * 0.012;
      } else {
        safetyLockGroup.scale.setScalar(1);
        safetyLockGroup.rotation.z = 0;
      }
      leftEye.scale.x = 0.82 + Math.sin(elapsed * (2.8 + finalEnergy * 3)) * 0.12;
      rightEye.scale.x = 0.82 + Math.sin((elapsed * (2.8 + finalEnergy * 3)) - 0.32) * 0.12;
      mouthBars.forEach((bar) => {
        const primary = 0.5 + Math.sin(elapsed * (3.6 + finalEnergy * 4.8) + bar.userData.phase) * 0.5;
        const secondary = 0.5 + Math.sin(elapsed * (6.8 + finalEnergy * 6.4) + bar.userData.phase * 1.7) * 0.5;
        const centerFalloff = 1 - Math.min(0.72, Math.abs(bar.userData.index - 4) * 0.11);
        const target = 0.26 + ((primary * 0.62 + secondary * 0.38) * (0.34 + finalEnergy * 0.92) * talkingBoost * centerFalloff);
        bar.scale.y = THREE.MathUtils.lerp(bar.scale.y, target, 0.22);
      });
      mouthEnvelope.scale.set(0.92 + finalEnergy * 0.12, 0.64 + (speechMode ? signalPulse * 0.8 : signalPulse * 0.2), 1);
      scanPlane.position.y = Math.sin(elapsed * (0.7 + scanDepthRef.current * 1.6)) * 0.24;
      scanPlane.rotation.z = Math.sin(elapsed * 0.24) * 0.09;

      const positions = particleSystem.geometry.attributes.position.array;
      const seeds = particleSystem.userData.seeds;
      const visibleCount = Math.floor((positions.length / 3) * particleDensityRef.current);
      for (let index = 0; index < positions.length / 3; index += 1) {
        const row = index * 3;
        if (index > visibleCount) {
          positions[row + 1] = 20;
          continue;
        }
        positions[row + 1] -= 0.006 + seeds[index] * (0.014 + finalEnergy * 0.025);
        if (positions[row + 1] < -2.8) {
          positions[row] = (seeds[index] - 0.5) * 5.8 + Math.sin(frame * 0.001 + index) * 0.6;
          positions[row + 1] = 2.8 + seeds[index] * 0.8;
          positions[row + 2] = (Math.sin(index * 17.31) - 0.5) * 2.3;
        }
      }
      particleSystem.geometry.attributes.position.needsUpdate = true;
      particleSystem.visible = particlesRef.current;

      renderer.render(scene, camera);
      frame += 1;
      animationFrame = window.requestAnimationFrame(animate);
    }

    animate();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      disposeSceneObject(scene);
      renderer.dispose();
    };
  }, []);

  return (
    <div className="co-apex-avatar-lab-scene" data-avatar-lab-canvas="true">
      <canvas ref={canvasRef} aria-label="Apex Avatar Lab Three.js hologram scene" />
      <div className="co-apex-avatar-lab-vignette" aria-hidden="true" />
    </div>
  );
}

export function ApexAvatarLabPage({ setActive }) {
  const [mode, setMode] = useState("speaking");
  const [voiceEnergy, setVoiceEnergy] = useState(0.72);
  const [scanDepth, setScanDepth] = useState(0.68);
  const [particleDensity, setParticleDensity] = useState(0.76);
  const [autoPulse, setAutoPulse] = useState(true);
  const [hudShell, setHudShell] = useState(true);
  const [particles, setParticles] = useState(true);
  const activeMode = AVATAR_MODES[mode] || AVATAR_MODES.speaking;

  const metrics = useMemo(() => ([
    { label: "State", value: activeMode.status, tone: activeMode.tone },
    { label: "Energy", value: `${Math.round(voiceEnergy * 100)}%`, tone: voiceEnergy > 0.65 ? "orange" : "cyan" },
    { label: "Rig", value: APEX_OPERATOR_MODEL_STATS.triangles, tone: "green" },
    { label: "Asset", value: APEX_OPERATOR_MODEL_STATS.size, tone: "green" },
    { label: "Texture", value: APEX_OPERATOR_MODEL_STATS.textureMaps, tone: "green" },
    { label: "Motion", value: APEX_OPERATOR_MODEL_STATS.animation, tone: "orange" },
  ]), [activeMode.status, activeMode.tone, voiceEnergy]);

  const openControlRoom = () => {
    if (typeof setActive === "function") {
      setActive("apexControlRoom");
      return;
    }
    if (typeof window !== "undefined") window.location.assign("/apex-control-room");
  };

  return (
    <main className="co-apex-avatar-lab min-h-screen overflow-hidden bg-slate-950 text-white" aria-label="Apex Avatar Lab">
      <ApexAvatarLabScene
        mode={mode}
        voiceEnergy={voiceEnergy}
        scanDepth={scanDepth}
        particleDensity={particleDensity}
        autoPulse={autoPulse}
        hudShell={hudShell}
        particles={particles}
      />

      <header className="co-apex-avatar-lab-topbar">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-300">Apex OS</p>
          <h1 className="truncate text-2xl font-black tracking-normal text-white sm:text-3xl">Operator Lab</h1>
        </div>
        <div className="co-apex-avatar-lab-top-actions">
          <button type="button" onClick={openControlRoom} className="co-apex-avatar-lab-icon-button">
            <Icon name="spark" className="h-4 w-4" /> Control Room
          </button>
        </div>
      </header>

      <section className="co-apex-avatar-lab-mode-dock" aria-label="Avatar state controls">
        {AVATAR_MODE_ORDER.map((modeId) => {
          const item = AVATAR_MODES[modeId];
          const active = mode === modeId;
          return (
            <button
              key={modeId}
              type="button"
              onClick={() => setMode(modeId)}
              className={`co-apex-avatar-lab-mode ${active ? "is-active" : ""} ${toneClass(item.tone)}`}
              aria-pressed={active}
            >
              <span>{item.label}</span>
            </button>
          );
        })}
      </section>

      <aside className="co-apex-avatar-lab-panel co-apex-avatar-lab-panel--left" aria-label="Avatar rig controls">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-300">Rig Controls</p>
          <span className={`rounded-md border px-2 py-1 text-[9px] font-black uppercase tracking-[0.1em] ${toneClass(activeMode.tone)}`}>{activeMode.label}</span>
        </div>
        <ApexAvatarLabSlider label="Voice Energy" value={voiceEnergy} onChange={setVoiceEnergy} />
        <ApexAvatarLabSlider label="Scan Depth" value={scanDepth} onChange={setScanDepth} />
        <ApexAvatarLabSlider label="Data Density" value={particleDensity} onChange={setParticleDensity} />
        <div className="grid min-w-0 gap-2">
          <ApexAvatarLabToggle label="Auto Pulse" checked={autoPulse} onChange={setAutoPulse} />
          <ApexAvatarLabToggle label="HUD Shell" checked={hudShell} onChange={setHudShell} />
          <ApexAvatarLabToggle label="Particles" checked={particles} onChange={setParticles} />
        </div>
      </aside>

      <aside className="co-apex-avatar-lab-panel co-apex-avatar-lab-panel--right" aria-label="Avatar candidate telemetry">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-orange-300">{APEX_OPERATOR_MODEL_STATS.label}</p>
        <div className="grid min-w-0 gap-2">
          {metrics.map((item) => (
            <div key={item.label} className="co-apex-avatar-lab-metric">
              <span>{item.label}</span>
              <strong className={item.tone === "green" ? "text-emerald-300" : item.tone === "orange" ? "text-orange-300" : item.tone === "red" ? "text-red-300" : "text-cyan-300"}>{item.value}</strong>
            </div>
          ))}
        </div>
      </aside>

      <footer className="co-apex-avatar-lab-footer" aria-label="Avatar lab status">
        <span className="h-2 w-2 rounded-full bg-orange-300 shadow-[0_0_18px_rgba(251,146,60,0.9)]" aria-hidden="true" />
        <strong>{activeMode.status}</strong>
      </footer>
    </main>
  );
}
