const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const htmlIds = new Set([...html.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]));
const staticReferences = [...js.matchAll(/\$\('([^']+)'\)/g)].map(match => match[1]);

test('all statically referenced DOM IDs exist in index.html', () => {
  const missing = [...new Set(staticReferences)].filter(id => !htmlIds.has(id));
  assert.deepEqual(missing, []);
});

test('the quad edge-loop control is present and wired to the implementation', () => {
  assert.ok(htmlIds.has('selectEdgeLoopBtn'));
  assert.match(js, /\$\('selectEdgeLoopBtn'\)\.onclick=selectEdgeLoop/);
  assert.match(js, /function selectEdgeLoop\(\)/);
});

test('Wavefront OBJ export button is connected to transformed scene geometry', () => {
  assert.ok(htmlIds.has('exportObjBtn'));
  assert.match(js, /\$\('exportObjBtn'\)\.onclick=exportOBJ/);
  assert.match(js, /function exportOBJ\(\)/);
  assert.match(js, /out\.push\('v '\+p\.map/);
  assert.match(js, /out\.push\('f '\+f\.map/);
});
test('scene import rejects oversized files and excessive mesh sizes', () => {
  assert.match(js, /file\.size>10\*1024\*1024/);
  assert.match(js, /data\.scene\.objects\.length>500/);
  assert.match(js, /o\.vertices\.length>100000\|\|o\.faces\.length>100000/);
  assert.match(js, /f\.length>10000/);
});
