# Polymoduler

Polymoduler is an independent, browser-first low-poly 3D modelling project. Its implementation does not import or depend on EffectCraft.

## Current prototype
- Canvas 2D software viewport; no WebGL or dedicated GPU requirement
- Orbit camera, zoom and ground grid
- Independent mesh data per object (vertices and polygon faces)
- Object, vertex, edge and face selection modes
- Face extrusion with generated side faces
- Face inset with a new inner face and connecting border faces
- Move a selected vertex using numeric X/Y/Z coordinates
- Delete selected mesh elements with basic unused-vertex cleanup
- Add, select, duplicate and delete objects
- Basic object transforms and wireframe overlay
- Undo/redo for scene and mesh operations
- Save and load scene JSON, with basic mesh-structure validation

## Run
Open `index.html` in a modern browser. No package installation or build step is required.

## Development checks
- `node --check app.js` — passed
- Static check of JavaScript-referenced DOM IDs — passed
- `git diff --check` — passed
- A full interactive browser QA pass is still outstanding.

## Roadmap
1. Validate topology operations and selection through interactive browser testing
2. Add edge movement, bridge/loop tools and stronger mesh repair
3. Improve CPU viewport shading, clipping and picking
4. Add autosave/project recovery and robust import/export
5. Add materials, lights, animation, modifiers and AI-assisted workflows
6. Package a Windows EXE only after the web version is stable

This is an early prototype, not yet a full Blender replacement. The renderer prioritizes broad compatibility over speed and visual fidelity.
