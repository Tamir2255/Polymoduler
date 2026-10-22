const test = require('node:test');
const assert = require('node:assert/strict');
const {defaultModifier, normalizeModifier, normalizeStack, evaluate, MAX_VERTICES, MAX_FACES} =
  require('../mesh-modifiers.js');

const cube = () => ({
  vertices:[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]],
  faces:[[0,3,2,1],[4,5,6,7],[0,1,5,4],[2,3,7,6],[1,2,6,5],[0,4,7,3]],
  modifiers:[]
});
test('disabled and absent modifiers leave mesh geometry unchanged',()=>{
  const object=cube();
  assert.deepEqual(evaluate(object),{vertices:object.vertices,faces:object.faces});
  object.modifiers=[{type:'array',count:8,offset:[8,0,0],enabled:false}];
  assert.deepEqual(evaluate(object),{vertices:object.vertices,faces:object.faces});
  assert.notStrictEqual(evaluate(object).vertices,object.vertices,'evaluate must not share mutable arrays');
});
test('Mirror produces geometrically reflected vertices and reversed face winding',()=>{
  const object=cube(),original=JSON.stringify(object);
  const evaluated=evaluate(object,[{type:'mirror',axis:'x'}]);
  assert.equal(evaluated.vertices.length,16);
  assert.equal(evaluated.faces.length,12);
  assert.deepEqual(evaluated.vertices[8],[1,-1,-1]);
  assert.deepEqual(evaluated.faces[6],object.faces[0].map(i=>i+8).reverse());
  assert.equal(JSON.stringify(object),original);
});
test('Mirror supports all axes about object-local origin',()=>{
  const mesh={vertices:[[3,4,5],[5,4,5],[3,8,5]],faces:[[0,1,2]]};
  assert.deepEqual(evaluate(mesh,[{type:'mirror',axis:'x'}]).vertices[3],[-3,4,5]);
  assert.deepEqual(evaluate(mesh,[{type:'mirror',axis:'y'}]).vertices[3],[3,-4,5]);
  assert.deepEqual(evaluate(mesh,[{type:'mirror',axis:'z'}]).vertices[3],[3,4,-5]);
});
test('Array repeats the mesh with the correct offset and face indexes',()=>{
  const object=cube();
  const mesh=evaluate(object,[{type:'array',count:3,offset:[3,1,-2]}]);
  assert.equal(mesh.vertices.length,24);
  assert.equal(mesh.faces.length,18);
  assert.deepEqual(mesh.vertices[16],object.vertices[0].map((v,i)=>v+[3,1,-2][i]*2));
  assert.deepEqual(mesh.faces[12],object.faces[0].map(i=>i+16));
});
test('Stack ordering is meaningful and operations remain non-destructive',()=>{
  const object={vertices:[[2,0,0],[3,0,0],[2,1,0]],faces:[[0,1,2]]};
  const first=evaluate(object,[{type:'array',count:2,offset:[1,0,0]},{type:'mirror',axis:'x'}]);
  const second=evaluate(object,[{type:'mirror',axis:'x'},{type:'array',count:2,offset:[1,0,0]}]);
  assert.notDeepEqual(first.vertices,second.vertices);
  assert.equal(first.faces.length,4);
  assert.equal(second.faces.length,4);
  assert.equal(object.vertices.length,3);
});
test('Single subdivision preserves shared edge midpoints and creates flat quads',()=>{
  const object=cube();
  const mesh=evaluate(object,[{type:'subdivide',levels:1}]);
  assert.equal(mesh.vertices.length,26,'8 corners + 12 shared midpoints + 6 centers');
  assert.equal(mesh.faces.length,24);
  assert.ok(mesh.faces.every(face=>face.length===4));
  assert.equal(new Set(mesh.faces.flat()).size,26);
});
test('Two subdivision levels increase resolution within CPU budget',()=>{
  const mesh=evaluate(cube(),[{type:'subdivide',levels:2}]);
  assert.equal(mesh.vertices.length,98);
  assert.equal(mesh.faces.length,96);
});
test('Limit prevents abusive modifier stacks before mutating original mesh',()=>{
  const object=cube();
  const snapshot=JSON.stringify(object);
  assert.throws(()=>evaluate(object,[
    {type:'array',count:8,offset:[1,0,0]},
    {type:'array',count:8,offset:[0,1,0]},
    {type:'array',count:8,offset:[0,0,1]},
    {type:'subdivide',levels:2}
  ]),/12,000/);
  assert.equal(JSON.stringify(object),snapshot);
  assert.equal(MAX_VERTICES,12000);assert.equal(MAX_FACES,12000);
});
test('Normalizer bounds values and rejects unsupported or oversized stacks',()=>{
  assert.deepEqual(defaultModifier('array'),{type:'array',enabled:true,count:3,offset:[2.5,0,0]});
  assert.deepEqual(normalizeModifier({type:'array',count:999,offset:[-200,15,0]}),{
    type:'array',enabled:true,count:8,offset:[-10,10,0]});
  assert.deepEqual(normalizeModifier({type:'subdivide',levels:999}),{type:'subdivide',enabled:true,levels:2});
  assert.deepEqual(normalizeModifier({type:'mirror',axis:'garbage'}),{type:'mirror',enabled:true,axis:'x',center:0});
  assert.deepEqual(normalizeStack(null),[]);
  assert.throws(()=>normalizeStack([{type:'bevel'}]),/Unrecognized/);
  assert.throws(()=>normalizeStack(Array(9).fill({type:'mirror'})),/8 entries/);
});

test('Mirror plane offset makes reflected copy of a centered cube visibly separate',()=>{
  const object=cube();
  const mesh=evaluate(object,[{type:'mirror',axis:'x',center:1.5}]);
  assert.equal(mesh.vertices[8][0],4);
  assert.equal(mesh.vertices[9][0],2);
  assert.equal(mesh.faces.length,12);
  assert.equal(normalizeModifier({type:'mirror',axis:'y',center:55}).center,10);
});
