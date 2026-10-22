# Polymoduler

Polymoduler is an independent, **web-first, CPU-rendered low-poly 3D editor**. It is inspired by Blender-style workflows but does not depend on EffectCraft, WebGL, or a dedicated graphics card.

## Run

Open `index.html` in Chrome or Edge. There is **no installation, package manager, build step, account, or cloud backend**. Keep the JavaScript and CSS files alongside `index.html`.

Your scenes are stored in the browser's local autosave and can be downloaded as editable JSON project files. Back up important work using **Save scene**.

## Workspaces

- **Modeling** — Cube, plane, UV sphere, cylinder, cone, torus; object/vertex/edge/face modes; transforms, duplicate/delete, face inset/extrusion, edge tools and loop selection, mesh cleanup/validation, triangulation, normal flipping, transform baking, OBJ import/export and Undo/Redo.
- **Modifiers** — Non-destructive Mirror (X/Y/Z and plane offset), Array (2–8 copies with XYZ spacing) and linear Subdivide (1–2 levels), in an ordered and toggleable stack. Reorder, remove or apply modifiers to make the geometry editable.
- **Animation** — Object transform and camera keyframes, interpolated timeline, frame stepping, playback and WebM recording when the browser supports MediaRecorder and canvas capture.
- **Materials** — Per-object hex base color and roughness; live flat-shaded CPU preview.
- **Lighting** — Directional light vector, brightness, ambient fill and world background color.
- **Rendering** — CPU viewport PNG export at 640×360, 960×540 or 1280×720, optionally including the grid and selected-object outline.
- **Scene** — Project name, units, object names and visibility, camera presets and JSON/OBJ file operations.

## Modifiers: quick start

1. Open the **Modifiers** tab and select an object.
2. Choose **Array**, click **+ Add modifier**, then change the copy count or X/Y/Z spacing. Its original mesh remains unchanged.
3. Add **Subdivide**, move it above/below Array, or uncheck a modifier to compare the previews.
4. For **Mirror**, a cube centered on the origin mirrors on top of itself. Set **Mirror plane offset = 1.5** to see the second cube beside it.
5. Click **Apply all to mesh** to permanently make the generated geometry editable. **Undo** restores the non-destructive stack.

Modifiers are previewed in Object mode. In vertex, edge and face modes, the **original base topology** is shown so you do not accidentally edit generated vertices. PNG still renders the modifiers; OBJ exports the evaluated geometry. Existing scene JSON files without modifiers remain supported.

For stability on low-memory computers: at most **8 modifiers per object** and **12,000 evaluated vertices or faces** per object. Higher complexity is rejected before changing the scene. Mirror copies do not weld seams; linear subdivision increases polygon density without smoothing. These are intentional low-poly behaviors, not full Blender modifiers.

## Project files and navigation

- **Save scene** or **Ctrl+S** — downloads JSON containing objects, materials, lighting, modifiers, animation and camera.
- **Open scene** or **Ctrl+O** — imports saved JSON and validates its geometry.
- **Export OBJ / Import OBJ** — move polygon models between tools. OBJ export includes all scene objects, including those hidden in the viewport.
- **F** — focus the selected object; **Numpad 1 / 3 / 7** — front/right/top views.
- **Ctrl+Z / Ctrl+Y** — undo and redo supported scene edits.
- Drag to orbit, right/middle-drag to pan, mouse wheel to zoom.

## Development checks

Run in this folder:

```cmd
node --check app.js
node --check mesh-modifiers.js
node --check modifier-workspace.js
node --check studio-workspaces.js
node --test tests\*.test.cjs
git diff --check
```

The suite exercises modifier geometry and limits, non-destructive Apply/Undo, project persistence, CPU rendering, OBJ import/export, live material and light controls, animation wiring, and existing mesh editing.

## Not implemented yet

This is **not a feature-complete Blender replacement**. Advanced bevel/boolean/geometry-node modifiers, UV unwrapping, rigging/skinning, physics and particles, shadow-casting lights, photorealistic ray tracing, and an AI-controllable Windows desktop application are still future work. The browser editor comes first; a native desktop build will follow later.
