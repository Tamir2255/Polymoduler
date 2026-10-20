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

test('animation timeline controls are present and connected', () => {
  for (const id of ['currentFrame', 'animationFps', 'animationEnd', 'timelineScrub', 'setKeyframeBtn', 'setCameraKeyframeBtn', 'playAnimationBtn', 'stopAnimationBtn', 'prevKeyframeBtn', 'recordMovieBtn', 'keyframeStatus', 'timelineMarkers']) assert.ok(htmlIds.has(id), 'missing animation control: ' + id);
  assert.match(js, /function setKeyframe\(\)/);
  assert.match(js, /function setCameraKeyframe\(\)/);
  assert.match(js, /cameraKeyframes/);
  assert.match(js, /function validCameraKeyframes\(keys,endFrame\)/);
  assert.match(js, /target:before\.target\.map/);
  assert.match(js, /angleDelta=\(\(after\.yaw-before\.yaw\+Math\.PI\*3\)%\(Math\.PI\*2\)\)-Math\.PI/);
  assert.match(js, /setCameraKeyframeBtn'\)\.onclick=setCameraKeyframe/);
  assert.match(js, /cameraKeyframes\|\|\[\]\)\.length/);
  assert.match(js, /function applyAnimationFrame\(frame/);
  assert.match(js, /function playAnimation\(\)/);
  assert.match(js, /function recordMovie\(\)/);
  assert.match(js, /markerRoot\.innerHTML=''/);
  assert.match(js, /marker\.onclick=\(\)=>applyAnimationFrame\(markerFrame\)/);
  assert.match(js, /\$\('recordMovieBtn'\)\.onclick=recordMovie/);
  assert.match(js, /animation,currentFrame/);
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


test('material controls are present and connected to per-object CPU shading and scene persistence', () => {
  for (const id of ['materialColor', 'materialRoughness', 'materialRoughnessValue']) assert.ok(htmlIds.has(id), 'missing material control: ' + id);
  assert.match(js, /function validColor\(value\)/);
  assert.match(js, /function validRoughness\(value\)/);
  assert.match(js, /shadeColor\(wp\[f\[0\]\],wp\[f\[1\]\],wp\[f\[2\]\],o\.baseColor\|\|colors/);
  assert.match(js, /baseColor:validColor\(o\.baseColor\)\?o\.baseColor:'#8d98b4'/);
  assert.match(js, /roughness:validRoughness\(o\.roughness\)/);
  assert.match(js, /\$\('materialColor'\)\.addEventListener\('input'/);
  assert.match(js, /\$\('materialRoughness'\)\.addEventListener\('input'/);
  assert.match(html, /name==='materials'\?'MATERIAL CONTROLS AVAILABLE'/);
});

test('workspace navigation exposes modeling, animation, and planned production sections', () => {
  for (const name of ['modeling', 'animation', 'materials', 'lighting', 'rendering', 'scene']) assert.match(html, new RegExp('data-workspace=\"' + name + '\"'), 'missing workspace tab: ' + name);
  assert.ok(html.includes('id=\"workspacePanel\"'));
  assert.match(html, /function showWorkspace\(name\)/);
  assert.match(html, /document\.body\.dataset\.workspace = name/);
  assert.match(html, /name === 'modeling' \|\| name === 'animation'/);
});
