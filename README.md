# Polymoduler

Polymoduler is an independent, browser-first low-poly 3D modelling project. It does not import or depend on EffectCraft.

## Current prototype
- Canvas 2D software renderer (no WebGL or dedicated GPU requirement)
- Orbit camera with drag and zoom
- Low-poly cube objects, selection, duplicate and delete
- Basic object transforms and wireframe view
- Undo/redo
- Save and load scene JSON

## Run
Open `index.html` in a modern browser. No package installation or build step is required.

## Roadmap
1. Scene and mesh data integrity, camera and viewport interaction
2. Editable vertices/edges/faces and modelling operations
3. Better CPU rasterization, materials, lights and selection tools
4. Browser persistence, import/export and project files
5. Animation, modifiers and scripting/AI-assisted workflows
6. Windows EXE packaging after the web version is stable

This is an early prototype, not yet a full Blender replacement. The renderer prioritizes broad compatibility over speed and visual fidelity.
