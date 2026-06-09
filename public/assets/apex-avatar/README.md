# Apex Avatar Assets

This folder contains local GLB assets used by the private Apex Avatar Lab.

## Apex intelligence live runtime assets

The live Apex Control Room uses optimized standard GLB files generated from the approved master avatar with `gltf-transform optimize` and no required compression extensions:

- `apex-intelligence-live-web-1536.glb`: desktop/runtime default, 10.9 MB, 1536px packed PNG texture ceiling, state clips preserved.
- `apex-intelligence-live-web-1024.glb`: mobile/runtime default for small viewports, 7.6 MB, 1024px packed PNG texture ceiling, state clips preserved.

The original 32.6 MB `apex-intelligence-idle-app-ready.glb` remains in this folder as the high-detail master/fallback and is not the default runtime asset.

## apex-intelligence-idle-app-ready.glb

- Source: Meshy textured GLB from the approved Apex intelligence direction, downloaded as `Meshy_AI_Apex_HQ_Intelligence__0606030612_texture.glb`.
- Preserved master source: `outputs/apex-operator-direction/apex-intelligence/apex-intelligence-meshy-source.glb`.
- Editable source file: `outputs/apex-operator-direction/apex-intelligence/apex-intelligence-idle-app-ready.blend`.
- Preview render: `outputs/apex-operator-direction/apex-intelligence/apex-intelligence-idle-app-ready-preview.png`.
- Format: GLB / glTF 2.0, exported by Blender 5.1.
- App-ready budget: about 125k triangles.
- Texture payload: packed Meshy PBR maps, including a 4096px base color map and 2048px emission/metallic-roughness maps.
- Exported animation tracks: `Idle`, `Listening`, `Hearing`, `Thinking`, `Speaking`, `Blocked`, and `Alert`, built in Blender from hover, scan, pulse, and safety-lock transform actions so the floating intelligence does not stretch like a rigged soldier.

This is the current approved Apex intelligence avatar. The model supplies the black-glass head, cyan awareness line, chest core, and holographic lower body. The app crossfades the native state clips while still owning live state-reactive effects such as voice pulse, thinking rings, tool-use arcs, and blocked/alert emphasis.

## apex-operator-meshy-app-ready.glb

- Source: Meshy image-to-3D textured result from the approved Apex Operator concept direction.
- Editable source file: `outputs/apex-operator-direction/meshy/apex-operator-meshy-app-ready.blend`.
- Preserved master source: `outputs/apex-operator-direction/meshy/apex-operator-meshy-textured.glb`.
- Format: GLB / glTF 2.0, optimized through Blender 5.1.
- App-ready budget: about 120k triangles, reduced from the 601k-triangle master.
- Texture payload: four packed 2048px PBR maps.

This is the current serious Apex Operator body used by the private Operator Lab. The lab adds runtime eye, mouth, chest-core, base-ring, and HUD motion over this textured model so the assistant can visually react while speaking or thinking.

## apex-assistant.glb

- Source: generated in Blender from `scripts/build-apex-assistant-blender.py`.
- Editable source file: `outputs/apex-avatar-source/apex-assistant.blend`.
- Ownership/license: original Apex HQ procedural model generated for this repo; no third-party character, brand, or marketplace asset is included.
- Format: GLB / glTF 2.0, exported by Blender 5.1.
- Named groups/parts include: `ApexAssistantRig`, `Head`, `Visor`, `Mouth`, `Jaw`, `Torso`, `ChestCore`, `Shoulders`, `Arms`, `HoloPanels`, and `EnergyRings`.
- Shape keys: `mouthOpen` and `jawOpen`.
- Animation tracks: `Idle`, `Listening`, `Thinking`, `Speaking`, `Blocked`, and `Boot`.

This is the first original Apex HQ assistant body. It is meant to replace the temporary RobotExpressive placeholder while we continue improving the model shape, proportions, materials, and state-specific movement.

## robot-expressive.glb

- Source: https://threejs.org/examples/models/gltf/RobotExpressive/RobotExpressive.glb
- Source page: https://threejs.org/examples/models/gltf/RobotExpressive/
- Model credit: Tomás Laulhé; modifications by Don McCurdy.
- License: CC0 1.0, per the three.js RobotExpressive source page.

This is a temporary, license-safe model for proving the GLB loader, animation mixer, and hologram treatment. Replace it with a custom Apex HQ assistant model when the final branded avatar asset is ready.
