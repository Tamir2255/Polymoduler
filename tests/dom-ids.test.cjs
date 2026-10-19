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
