# Polymoduler

Polymoduler is an independent, browser-first low-poly 3D modelling project. Its implementation does not import or depend on EffectCraft.

## Current prototype
- Canvas 2D software viewport; no WebGL or dedicated GPU requirement
- Orbit camera, zoom and ground grid
- Independent mesh data per object (vertices and polygon faces)
- Object, vertex, edge and face selection modes
- Face extrusion with generated side faces
- Face inset with a new inner face and connecting border faces
- Move a selected vertex using numeric X/Y/Z coordinates or keyboard nudges
- Move a selected edge by applying X/Y/Z offsets to both endpoints; the operation is undoable
- Shift-click two separate boundary edges and bridge them with a connecting quad; unsupported edge pairs are rejected
- Select a quad edge loop by traversing opposite edges across connected quad faces; traversal stops at boundaries and non-quad faces
- Validate selected mesh structure, reporting degenerate/duplicate faces, invalid vertex references, boundary and non-manifold edges, and unused vertices
- Safely remove unused vertices while preserving face connectivity; the cleanup is undoable
- Keyboard vertex nudging: Left/Right = X, Up/Down = Y, Page Up/Down = Z; hold Shift for 0.5-unit steps instead of 0.1
- Delete selected faces and vertices with unused-vertex cleanup; safely dissolve an edge shared by exactly two faces, refusing unsupported boundary/non-manifold cases
- Add, select, duplicate and delete objects
- Basic object transforms and wireframe overlay
- Undo/redo for scene and mesh operations
- Save and load scene JSON, with basic mesh-structure validation
- Export all scene objects to Wavefront OBJ, baking object transforms into vertex coordinates and keeping face indices valid across multiple objects
- Transform animation timeline with per-object keyframes for location, rotation and scale, interpolated playback, frame scrubbing, adjustable frame rate and end frame; clickable timeline markers jump directly to keyed frames
- Record the software-rendered viewport to a downloadable WebM movie in browsers that support canvas capture and MediaRecorder; this is an early animation foundation, not a full video editor

## Run
Open `index.html` in a modern browser. No package installation or build step is required.

## Development checks
- `node --check app.js` — passed
- `node --test tests/*.test.cjs` — 7 tests cover quad edge-loop traversal, DOM-ID integrity, OBJ export wiring, and scene-import size guards
- Scene import rejects files over 10 MB, scenes over 500 objects, meshes over 100,000 vertices/faces per object, and faces over 10,000 vertices
- `git diff --check` — passed
- Project owner reports that the interactive editor works as expected; automated checks are run before each milestone push.

## Roadmap
1. Expand regression tests for topology operations and selection
2. Add safe mesh repair and additional edge/loop tools
3. Improve CPU viewport shading, clipping and picking
4. Add autosave/project recovery and robust import/export
5. Add materials, lights, animation, modifiers and AI-assisted workflows
6. Package a Windows EXE only after the web version is stable

This is an early prototype, not yet a full Blender replacement. The renderer prioritizes broad compatibility over speed and visual fidelity.
