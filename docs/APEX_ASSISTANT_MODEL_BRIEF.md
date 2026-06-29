# Apex Assistant Model Brief

## Goal

Create a serious, original 3D body for the Apex HQ live operator experience. The current avatar lab can load a GLB, play animations, apply hologram materials, and visually react to Apex states. The next asset must replace the temporary robot with a premium Apex HQ assistant that looks like a real command-center AI, not a blob, toy, mascot, or static picture.

## Product Direction

The assistant should feel like a private contractor operations operator inside Apex HQ:

- Built for command, scheduling, risk, proof, and jobsite decisions.
- Calm, sharp, capable, and industrial rather than cute or cartoonish.
- Original intellectual property. Do not copy Iron Man, JARVIS, Marvel UI, movie armor, celebrity likenesses, or any protected character.
- Visually compatible with Apex HQ: dark charcoal, clean whites, contractor orange accents, cool hologram cyan, and subtle electric blue.

Working name for the asset: `Apex Assistant`.

## Visual Target

The strongest direction is a humanoid-mech hologram bust or full-body operator with a clear head, torso, shoulders, chest core, visor/face plane, and layered armor/tech panels.

Required visual qualities:

- Strong silhouette from far away: recognizable head, shoulders, torso, and core.
- Premium command-center look: angular, technical, refined, and high trust.
- Holographic energy layer: translucent outer glow, scan lines, luminous core, small floating panels or orbit rings.
- Contractor/field undertone: durable industrial shapes, rugged utility details, subtle measuring/grid motifs, not sci-fi fantasy armor.
- Expressive face area: visor, mouth light, jaw plate, or face screen that can visibly react while speaking.
- Avoid round primary shapes. A sphere/orb-only body will be rejected.

## Deliverables

Primary deliverable:

- `apex-assistant.glb`

Preferred source deliverables:

- `.blend` source file
- optional `.fbx`
- texture source files if not embedded
- license or work-for-hire note proving commercial use rights

The final web asset should be stored at:

`public/assets/apex-avatar/apex-assistant.glb`

## Technical Requirements

Format:

- GLB / glTF 2.0 compatible with Three.js `GLTFLoader`.
- Single-file GLB preferred so the app does not need extra texture request handling.
- No required proprietary runtime, viewer, external API, or paid frontend SDK.

Size and performance:

- Target file size: 5-10 MB.
- Hard limit: 20 MB unless we explicitly approve a heavier asset.
- Target triangle count: under 80k for the main assistant.
- Textures: 2k max where possible; 1k acceptable for most panels.
- Transparent/hologram materials should be simple enough for mobile WebGL.

Scene setup:

- Centered origin.
- Upright, web-ready scale.
- Clean transforms applied.
- Document whether the model faces +Z or -Z.
- Named mesh groups for easy material and animation targeting:
  - `Head`
  - `Visor`
  - `Mouth` or `Jaw`
  - `Torso`
  - `ChestCore`
  - `Shoulders`
  - `Arms`
  - `HoloPanels`
  - `EnergyRings`

Materials:

- Dark graphite / gunmetal base.
- Orange or amber Apex HQ accent channels.
- Cyan or blue emissive hologram channels.
- Separate material names for face/visor/core so the app can pulse them while speaking.

## Animation Requirements

Minimum clips:

- `Idle`: calm breathing/hover, 4-8 seconds, seamless loop.
- `Listening`: slight forward attention, subtle visor/core pulse, seamless loop.
- `Thinking`: scanning panels, head/torso micro movement, seamless loop.
- `Speaking`: mouth/visor/core activity, 1-3 seconds, seamless loop.
- `Blocked`: safety lock or guarded posture, seamless loop.

Preferred clips:

- `Boot`: 1-3 second appearance sequence.
- `Confirmed`: quick positive acknowledgement.
- `Error`: short warning or denial pulse.

Animation notes:

- Animation clips should be named exactly and exported inside the GLB when possible.
- Idle and Speaking are the two non-negotiable clips.
- If the asset is a bust only, shoulders/head/visor/core should still move.
- If the asset is full-body, include a clean skeleton and stable weight painting.

## Speaking And Face Requirements

The app can already pulse materials and can read morph targets when a model includes them. The serious version should support at least one of these:

- Morph target `mouthOpen` or `jawOpen`.
- A named `Mouth` or `Jaw` mesh that can be animated/pulsed.
- Viseme-style morph targets if available.
- A face/visor material that can pulse separately from the body.

Ideal morph target set:

- `mouthOpen`
- `jawOpen`
- `mouthSmile`
- `blinkLeft`
- `blinkRight`
- `viseme_aa`
- `viseme_E`
- `viseme_O`
- `viseme_FV`
- `viseme_L`
- `viseme_MBP`
- `viseme_WQ`

Ready Player Me can export ARKit-compatible blend shapes and Oculus visemes, so it is a viable fast path for lip-sync style movement if we choose an avatar-based direction.

## Acceptance Checklist

The asset passes only if:

- It looks serious from desktop and mobile screenshots.
- It has a clear body/head/face silhouette, not a blob, floating ball, or generic placeholder.
- It is original or license-safe for commercial Apex HQ use.
- It loads locally from `public/assets/apex-avatar/apex-assistant.glb`.
- The GLB request returns 200 in browser QA.
- The model is visible in `/apex-avatar-lab` on desktop and mobile.
- Idle animation plays through Three.js `AnimationMixer`, or the model still looks alive through material/morph/mesh controls.
- Speaking mode visibly changes the face/core/mouth/visor.
- Mobile viewport keeps the assistant framed without covering controls.
- No console errors, failed model requests, or blank canvas.

## Sourcing Recommendation

### Tier 1: Custom Model Commission

Best route for the final Apex HQ identity.

Ask for a custom original humanoid-mech hologram GLB with the named clips and mesh groups above. This avoids copyright risk and gets us the exact serious contractor-command look John wants.

### Tier 2: Ready Player Me Based Prototype

Good for faster mouth/face movement.

Use a stylized operator avatar, export GLB with ARKit and Oculus viseme morph targets, then apply Apex HQ hologram materials. This is less unique than a custom mech, but it gives a strong talking-face pipeline quickly.

### Tier 3: CC0 Mech/Robot Base

Good for license-safe intermediate work.

Quaternius has CC0 mech assets with glTF/Blend/FBX/OBJ formats and animations. These can be used as a safe starting point, but they will need visual treatment so Apex HQ does not look like a generic game asset.

### Tier 4: Marketplace GLB

Use only when the license is clear.

Marketplace assets can save time, but editorial-only or unclear licenses are not acceptable for Apex HQ. We need commercial rights, no restricted brand/character likeness, and no stand-alone redistribution issue.

## Artist Or Marketplace Message

Use this as the starting request:

```text
I need an original web-ready GLB character for Apex HQ, a contractor operations command-center AI. The character should be a serious humanoid-mech hologram operator, not a cartoon mascot and not a copy of Iron Man/JARVIS/Marvel.

Deliver a commercial-use original asset named apex-assistant.glb, target 5-10 MB, max 20 MB, under about 80k triangles, with embedded or provided textures. It should have a clear head, visor/face area, torso, shoulders, chest core, subtle orange/cyan emissive accents, and separate named mesh/material groups for Head, Visor, Mouth/Jaw, Torso, ChestCore, HoloPanels, and EnergyRings.

Required animations: Idle, Listening, Thinking, Speaking, Blocked. Preferred: Boot, Confirmed, Error. Speaking should visibly move or pulse the mouth, jaw, visor, or core. Morph targets like mouthOpen/jawOpen or visemes are a strong plus.

The model must load in Three.js GLTFLoader, work on desktop and mobile WebGL, and include clear commercial-use rights or work-for-hire ownership.
```

## 3D Generator Prompt

Use this when testing a 3D generation workflow:

```text
Original serious humanoid-mech hologram AI operator for a contractor operations command center, premium industrial SaaS style, dark graphite armor frame, clear head and shoulders, angular visor face, glowing cyan face plane, amber-orange chest core, subtle floating data panels and energy rings, rugged construction-tech details, high-trust professional assistant, web game-ready 3D model, clean silhouette, not cartoon, not superhero, not Iron Man, not Marvel, not a sphere or blob.
```

After generation, the model still must be retopologized/optimized, rigged or animated, licensed for commercial use, and exported as a clean GLB.

## Implementation Handoff

When the asset is ready:

1. Add `public/assets/apex-avatar/apex-assistant.glb`.
2. Update `APEX_AVATAR_MODEL_URL` in `src/apex-avatar-lab-components.jsx`.
3. Update `public/assets/apex-avatar/README.md` with source, author, license, and modification notes.
4. Run:
   - `node --test --test-concurrency=1 src/apex-avatar-lab-components-import.test.js`
   - `npm.cmd run verify:roles`
   - `npm.cmd run build`
   - `git diff --check -- src/apex-avatar-lab-components.jsx public/assets/apex-avatar/README.md docs/APEX_ASSISTANT_MODEL_BRIEF.md`
5. Open `/apex-avatar-lab` and capture desktop/mobile visual QA.
6. Confirm the GLB request is 200, canvas is nonblank, and speaking/listening/thinking/blocked states are visibly different.

## Research References

- Three.js `GLTFLoader` supports loading glTF/GLB assets and returns animation clips for `AnimationMixer`: https://threejs.org/docs/pages/GLTFLoader.html
- Khronos glTF 2.0 defines morph targets, animation channels, and binary `.glb` structure: https://www.khronos.org/files/gltf20-reference-guide.pdf
- Ready Player Me documents ARKit blend shapes and Oculus LipSync blend shapes: https://docs.readyplayer.me/ready-player-me/api-reference/avatars/morph-targets
- Ready Player Me avatar export API supports morph target groups, texture options, LOD, and compression options: https://docs.readyplayer.me/ready-player-me/api-reference/rest-api/avatars/get-3d-avatars
- Quaternius Animated Mech Pack lists glTF support, animations, and CC0 licensing: https://quaternius.com/packs/animatedmech.html
- Three.js RobotExpressive is the current temporary CC0 placeholder model reference: https://threejs.org/examples/models/gltf/RobotExpressive/
- Sketchfab's license page distinguishes standard and editorial restrictions; editorial assets are not acceptable for Apex HQ commercial/product use: https://sketchfab.com/licenses

## Risks

- A generated asset may look good in a still image but fail as a rigged web GLB.
- Marketplace assets can carry unclear license or IP risk.
- Too much transparency/emissive geometry can hurt mobile performance.
- A model without mouth/face/core separation will still feel static while speaking.
- A good character with weak mobile framing can still feel unprofessional in the actual Apex HQ lab.

## Next Phase

Source one candidate asset using this brief, place it as `public/assets/apex-avatar/apex-assistant.glb`, then run the avatar lab visual QA. After the model passes, tune the hologram shader and state animations around that final body instead of continuing to perfect the old placeholder.
