const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const lines = app.split(String.fromCharCode(10));
const edgesSource = lines.find(line => line.includes('function edgesOf('))?.trim();
const loopSource = lines.find(line => line.includes('function selectEdgeLoop()'))?.trim();
assert.ok(edgesSource, 'edgesOf helper must exist');
assert.ok(loopSource, 'selectEdgeLoop implementation must exist');

function runLoop(mesh, startingEdge) {
  const state = {
    scene: { objects: [mesh] }, selectedId: mesh.id, mode: 'edge',
    elementSelection: { vertex: null, edge: startingEdge, face: null },
    syncCount: 0, renderCount: 0
  };
  const context = vm.createContext({
    Math, Map, Set, Number,
    selected: () => state.scene.objects.find(o => o.id === state.selectedId),
    mode: state.mode,
    elementSelection: state.elementSelection,
    syncUI: () => { state.syncCount++; },
    render: () => { state.renderCount++; }
  });
  vm.runInContext(edgesSource + String.fromCharCode(10) + loopSource, context);
  vm.runInContext('selectEdgeLoop()', context);
  return { state, edges: vm.runInContext('edgesOf(selected())', context) };
}

function cube() {
  return {
    id: 1,
    vertices: [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]],
    faces: [[0,3,2,1],[4,5,6,7],[0,1,5,4],[2,3,7,6],[1,2,6,5],[0,4,7,3]]
  };
}

test('selecting a cube edge loop returns the four parallel edges', () => {
  const mesh = cube();
  const allEdges = (() => {
    const map = new Map();
    for (const face of mesh.faces) for (let i = 0; i < face.length; i++) {
      const a = face[i], b = face[(i + 1) % face.length];
      const key = Math.min(a,b) + ':' + Math.max(a,b);
      if (!map.has(key)) map.set(key, [Math.min(a,b), Math.max(a,b)]);
    }
    return [...map.values()];
  })();
  const start = allEdges.findIndex(([a,b]) => a === 0 && b === 4);
  assert.notEqual(start, -1);
  const { state, edges } = runLoop(mesh, start);
  assert.equal(state.elementSelection.edges.length, 4);
  assert.ok(state.elementSelection.edges.includes(start));
  assert.equal(new Set(state.elementSelection.edges).size, 4);
  assert.equal(state.syncCount, 1);
  assert.equal(state.renderCount, 1);
  assert.ok(state.elementSelection.edges.every(i => edges[i]));
});

test('loop selection on a single quad includes its opposite edge and stops', () => {
  const mesh = { id: 2, vertices: [[0,0,0],[1,0,0],[1,1,0],[0,1,0]], faces: [[0,1,2,3]] };
  const { state } = runLoop(mesh, 0);
  assert.equal(state.elementSelection.edges.length, 2);
});

test('loop selection on a triangle safely keeps only the selected edge', () => {
  const mesh = { id: 3, vertices: [[0,0,0],[1,0,0],[0,1,0]], faces: [[0,1,2]] };
  const { state } = runLoop(mesh, 0);
  assert.deepEqual(Array.from(state.elementSelection.edges), [0]);
});
