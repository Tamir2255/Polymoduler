const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const studio=fs.readFileSync(path.join(root,'studio-workspaces.js'),'utf8');
const modifiers=fs.readFileSync(path.join(root,'mesh-modifiers.js'),'utf8');
const modifierWorkspace=fs.readFileSync(path.join(root,'modifier-workspace.js'),'utf8');
const initialScript=html.slice(html.indexOf('<script>')+8,html.indexOf('</script>',html.indexOf('<script>')));
function harness(saved=null){
  const nodes=new Map(),tabs=[],downloads=[],captures=[],fills=[],alerts=[],events=new Map(),storage=new Map(saved?[['polymoduler.autosave.v1',JSON.stringify(saved)]]:[]);
  let savedBlob=null;
  const noop=()=>{};
  function node(id){
    if(nodes.has(id))return nodes.get(id);
    const el={
      id,value:'',type:'',textContent:'',innerHTML:'',hidden:false,checked:false,disabled:false,style:{},
      dataset:{},children:[],listeners:{},lastElementChild:{textContent:''},
      classList:{add:noop,remove:noop,toggle:noop},
      addEventListener(type,fn){this.listeners[type]=fn;},
      appendChild(child){this.children.push(child);this.lastElementChild=child;return child;},
      setAttribute:noop,setPointerCapture:noop,
      getBoundingClientRect(){return {width:640,height:450,left:0,top:0};},
      click(){if(this.listeners.click)this.listeners.click({target:this});if(typeof this.onclick==='function')this.onclick();}
    };
    nodes.set(id,el);return el;
  }
  const panel=node('workspacePanel');
  panel.querySelector=selector=>node(selector.slice(1));
  panel.querySelectorAll=selector=>selector==='[data-studio-view]'?['front','top','right','isometric'].map(k=>{const v=node('view-'+k);v.dataset.studioView=k;return v;}):[];
  const canvas=node('viewport');canvas.clientWidth=640;canvas.clientHeight=450;
  const ctx=new Proxy({fillStyle:''},{
    get(target,key){
      if(key==='fill')return ()=>fills.push(target.fillStyle);
      if(key==='fillRect')return ()=>fills.push(target.fillStyle);
      if(key==='isPointInPath')return ()=>false;
      if(key in target)return target[key];
      return noop;
    },set(target,key,val){target[key]=val;return true;}
  });
  canvas.getContext=()=>ctx;
  canvas.toBlob=(cb,type)=>{captures.push({width:canvas.width,height:canvas.height,type,fillCount:fills.length});cb(new Blob(['fake-png'],{type:'image/png'}));};
  for(const name of ['modeling','modifiers','animation','materials','lighting','rendering','scene']){
    const tab=node('tab-'+name);tab.dataset.workspace=name;tabs.push(tab);
  }
  const document={
    body:{dataset:{}},activeElement:{tagName:'DIV'},
    getElementById:node,
    createElement(tag){
      const el=node('new-'+tag+'-'+Math.random());
      if(tag==='a')el.click=()=>downloads.push({filename:el.download,url:el.href});
      return el;
    },
    querySelectorAll:selector=>selector==='.workspace-tab'?tabs:[],
    querySelector:selector=>selector.startsWith('[data-workspace="')?tabs.find(t=>t.dataset.workspace===selector.split('"')[1]):null,
    addEventListener:noop
  };
  const window={devicePixelRatio:1,addEventListener:(type,fn)=>events.set(type,fn)};
  const context={document,window,Blob,alert:message=>alerts.push(String(message)),
    URL:{createObjectURL:blob=>{savedBlob=blob;return 'blob:fake';},revokeObjectURL:noop},
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
    setTimeout:()=>1,clearTimeout:noop,
    FileReader:class{readAsText(file){this.result=file.text;this.onload();}}
  };
  vm.runInNewContext(modifiers,context,{filename:'mesh-modifiers.js'});
  vm.runInNewContext(app,context,{filename:'app.js'});
  vm.runInNewContext(studio,context,{filename:'studio-workspaces.js'});
  vm.runInNewContext(modifierWorkspace,context,{filename:'modifier-workspace.js'});
  vm.runInNewContext(initialScript,context,{filename:'inline-workspace.js'});
  return {
    window,document,nodes,canvas,fills,captures,downloads,alerts,storage,events,ctx,
    api:window.polymodulerStudio,
    node,
    tab:name=>tabs.find(t=>t.dataset.workspace===name),
    async savedJSON(){node('saveBtn').click();return JSON.parse(await savedBlob.text());},
    async latestBlobText(){return savedBlob?await savedBlob.text():'';},
    importJSON(data){const file={size:500,text:JSON.stringify(data)};node('fileInput').onchange({target:{files:[file],value:''}});}
  };
}
test('Render tab exports a PNG at the chosen resolution and restores viewport size',async()=>{
  const ui=harness();ui.tab('rendering').click();
  assert.equal(ui.document.body.dataset.workspace,'rendering');
  assert.match(ui.node('workspacePanel').innerHTML,/Render and download PNG/);
  const preset=ui.node('renderPreset');preset.value='1280x720';preset.listeners.change({target:preset});
  const grid=ui.node('renderGrid');grid.checked=true;grid.listeners.change({target:grid});
  assert.equal(ui.api.getScene().renderSettings.width,1280);
  assert.equal(ui.api.getScene().renderSettings.includeGrid,true);
  const previous=[ui.canvas.width,ui.canvas.height];
  const result=await ui.api.renderStill();
  assert.equal(result.width,1280);assert.equal(result.height,720);
  assert.deepEqual([ui.canvas.width,ui.canvas.height],previous);
  assert.equal(ui.captures.at(-1).type,'image/png');
  assert.match(ui.downloads.at(-1).filename,/1280x720\.png$/);
});
test('Scene tab renames projects and objects, sets units, toggles visibility and selects objects',()=>{
  const ui=harness();ui.tab('scene').click();
  const project=ui.node('studioSceneName');project.value='My Low Poly World';project.listeners.change({target:project});
  const units=ui.node('studioUnits');units.value='centimeters';units.listeners.change({target:units});
  assert.equal(ui.api.getScene().name,'My Low Poly World');
  assert.equal(ui.api.getScene().units,'centimeters');
  assert.equal(ui.api.renameObject(1,'Hero'),true);
  assert.equal(ui.api.getScene().objects[0].name,'Hero');
  assert.equal(ui.api.setObjectVisibility(1,false),true);
  assert.equal(ui.api.getScene().objects[0].visible,false);
  const before=ui.fills.length;ui.api.setCameraPreset('front');
  assert.equal(ui.fills.slice(before).filter(s=>String(s).startsWith('rgb(')).length,0);
  assert.equal(ui.api.setObjectVisibility(1,true),true);
  assert.ok(ui.fills.slice(before).some(s=>String(s).startsWith('rgb(')));
});
test('Torus generation, triangulation, normal flipping and transform baking are undoable',()=>{
  const ui=harness();
  ui.api.addPrimitive('torus');
  let torus=ui.api.getScene().objects.at(-1);
  assert.equal(torus.name,'Torus');assert.equal(torus.vertices.length,128);assert.equal(torus.faces.length,128);
  assert.equal(ui.api.triangulateMesh(),true);
  torus=ui.api.getScene().objects.at(-1);assert.equal(torus.faces.length,256);
  const first=torus.faces[0];ui.api.flipNormals();
  assert.equal(JSON.stringify(ui.api.getScene().objects.at(-1).faces[0]),JSON.stringify(first.slice().reverse()));
  ui.node('posX').value=2;ui.node('applyTransformBtn').click();
  torus=ui.api.getScene().objects.at(-1);
  const before=torus.vertices[0][0]+torus.position[0];
  ui.api.bakeTransforms();torus=ui.api.getScene().objects.at(-1);
  assert.equal(torus.position[0],0);assert.equal(torus.vertices[0][0],before);
  ui.node('undoBtn').click();
  assert.equal(ui.api.getScene().objects.at(-1).position[0],2);
});
test('Color and roughness change actual CPU face fills, not just controls',()=>{
  const ui=harness();
  const previous=ui.fills.slice(-100).filter(c=>String(c).startsWith('rgb('));
  assert.equal(ui.window.polymodulerSetMaterialColor('#fa2424'),true);
  const after=ui.fills.slice(-100).filter(c=>String(c).startsWith('rgb('));
  assert.notDeepEqual(after.slice(-6),previous.slice(-6));
  assert.equal(ui.api.getSelectedMaterial().baseColor,'#fa2424');
  ui.window.polymodulerSetMaterialRoughness(0);
  const shiny=ui.fills.slice(-6);
  ui.window.polymodulerSetMaterialRoughness(1);
  assert.notDeepEqual(shiny,ui.fills.slice(-6));
});
test('JSON and autosave round-trip camera, project settings, hidden objects and rendering options',async()=>{
  const ui=harness();
  ui.api.renameScene('Export Test');
  ui.api.setUnits('feet');
  ui.api.setRenderSettings({width:640,height:360,includeOutline:true});
  ui.api.setCameraPreset('top');
  ui.api.setObjectVisibility(1,false);
  const data=await ui.savedJSON();
  assert.equal(data.scene.name,'Export Test');assert.equal(data.scene.units,'feet');
  assert.equal(data.scene.objects[0].visible,false);
  assert.equal(data.scene.renderSettings.width,640);
  assert.equal(data.camera.pitch,1.35);
  ui.events.get('pagehide')();
  const recovered=harness(JSON.parse(ui.storage.get('polymoduler.autosave.v1')));
  assert.equal(recovered.api.getScene().name,'Export Test');
  assert.equal(recovered.api.getScene().objects[0].visible,false);
  const imported=harness();imported.importJSON(data);
  assert.equal(imported.api.getScene().renderSettings.includeOutline,true);
  const importedData=await imported.savedJSON();
  assert.equal(importedData.camera.pitch,1.35);
  const oldData=structuredClone(data);delete oldData.scene.renderSettings;delete oldData.scene.name;delete oldData.camera;
  imported.importJSON(oldData);
  assert.equal(imported.api.getScene().name,'Untitled Scene');
  assert.equal(imported.api.getScene().renderSettings.width,960);
});

test('OBJ import creates named low-poly meshes with indexed and negative-index faces',()=>{
  const ui=harness();
  const result=ui.api.importOBJText([
    '# Wavefront OBJ with two object groups',
    'v 10 0 0','v 11 0 0','v 11 1 0','v 10 1 0',
    'o Floor','f 1/1/1 2/2/1 3/3/1 4/4/1',
    'o Triangle','f -3 -2 -1'
  ].join('\n'));
  assert.equal(result.objects,2);
  const objects=ui.api.getScene().objects;
  assert.equal(objects.length,3);
  assert.equal(objects[1].name,'Floor');
  assert.equal(objects[1].vertices.length,4);
  assert.equal(objects[1].faces.length,1);
  assert.equal(objects[2].name,'Triangle');
  assert.equal(objects[2].faces[0].length,3);
  assert.equal(objects[2].visible,true);
  ui.node('undoBtn').click();
  assert.equal(ui.api.getScene().objects.length,1);
});
test('OBJ parser rejects bad geometry and does not partially mutate the scene',()=>{
  const ui=harness(),before=JSON.stringify(ui.api.getScene());
  for(const input of ['v 0 0 0\nf 1 2 3',
    'v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 1 3',
    'v NaN 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3',
    'f -1 -2 -3']) {
    assert.throws(()=>ui.api.importOBJText(input));
    assert.equal(JSON.stringify(ui.api.getScene()),before);
  }
});
test('OBJ file picker imports geometry and focus camera centers on selected mesh',async()=>{
  const ui=harness();
  const contents='o FocusPiece\nv 10 0 0\nv 12 0 0\nv 12 2 0\nv 10 2 0\nf 1 2 3 4\n';
  ui.node('objFileInput').onchange({target:{files:[{size:contents.length,text:contents}],value:''}});
  assert.equal(ui.api.getScene().objects.length,2);
  assert.equal(ui.api.focusSelected(),true);
  const saved=await ui.savedJSON();
  assert.equal(saved.camera.target[0],11);
  assert.equal(saved.camera.target[1],1);
});
test('OBJ export after import creates a file containing mesh vertices and faces',async()=>{
  const ui=harness();
  ui.api.importOBJText('o Polygon\nv 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3');
  const original=ui.downloads.length;
  ui.node('exportObjBtn').click();
  assert.equal(ui.downloads.length,original+1);
  assert.match(ui.downloads.at(-1).filename,/\.obj$/);
});

test('Materials workspace inputs update selected object and real CPU shading',()=>{
  const ui=harness();
  ui.tab('materials').click();
  assert.equal(ui.document.body.dataset.workspace,'materials');
  const color=ui.node('materialWorkspaceColor');
  color.value='#23ca87';
  const initial=ui.fills.slice(-6);
  color.listeners.input();
  assert.equal(ui.api.getSelectedMaterial().baseColor,'#23ca87');
  assert.notDeepEqual(ui.fills.slice(-6),initial);
  const roughness=ui.node('materialWorkspaceRoughness');
  roughness.value='0.25';
  roughness.listeners.input();
  assert.equal(ui.api.getSelectedMaterial().roughness,.25);
  ui.node('undoBtn').click();
  assert.equal(ui.api.getSelectedMaterial().roughness,.7);
});
test('Importing an OBJ while Scene workspace is open refreshes the visible object hierarchy',()=>{
  const ui=harness();
  ui.tab('scene').click();
  assert.equal(ui.node('objectCount').textContent,'1 total');
  const data='o NewMesh\nv 0 0 0 # origin\nv 2 0 0\nv 0 2 0\nf 1 2 3 # valid triangle';
  ui.node('objFileInput').onchange({target:{files:[{size:data.length,text:data}],value:''}});
  assert.equal(ui.node('objectCount').textContent,'2 total');
  assert.equal(ui.api.getScene().objects[1].name,'NewMesh');
});

test('Modifiers workspace is navigable and Add builds a real evaluated stack',()=>{
  const ui=harness();
  ui.tab('modifiers').click();
  assert.equal(ui.document.body.dataset.workspace,'modifiers');
  assert.match(ui.node('workspacePanel').innerHTML,/Modifier stack/);
  const type=ui.node('modifierType');type.value='array';
  ui.node('modifierAdd').click();
  const info=ui.api.getModifiers();
  assert.equal(info.modifiers.length,1);
  assert.equal(info.modifiers[0].type,'array');
  assert.equal(info.base.faces,6);
  assert.equal(info.evaluated.faces,18);
  assert.match(ui.node('modifierMeshCounts').textContent,/Preview: 24 vertices \/ 18 faces/);
});
test('Modifier values, reordering, visibility and Undo/Redo update evaluated mesh',()=>{
  const ui=harness();
  ui.api.addModifier('array');
  ui.api.updateModifier(0,{count:4,offset:[4,0,0]});
  assert.equal(ui.api.getEvaluatedMesh(1).vertices.length,32);
  ui.api.addModifier('mirror');
  assert.equal(ui.api.getEvaluatedMesh(1).vertices.length,64);
  ui.api.updateModifier(1,{enabled:false});
  assert.equal(ui.api.getEvaluatedMesh(1).vertices.length,32);
  ui.api.moveModifier(1,-1);
  assert.equal(ui.api.getModifiers().modifiers[0].type,'mirror');
  ui.node('undoBtn').click();
  assert.equal(ui.api.getModifiers().modifiers[0].type,'array');
  ui.node('redoBtn').click();
  assert.equal(ui.api.getModifiers().modifiers[0].type,'mirror');
});
test('Over-budget modifier updates are rejected without modifying the stack',()=>{
  const ui=harness();
  ui.api.addModifier('array');
  ui.api.updateModifier(0,{count:8});
  ui.api.addModifier('array');
  ui.api.updateModifier(1,{count:8});
  ui.api.addModifier('array');
  ui.api.updateModifier(2,{count:8});
  const before=JSON.stringify(ui.api.getScene());
  assert.throws(()=>ui.api.addModifier('subdivide'),/12,000/);
  assert.equal(JSON.stringify(ui.api.getScene()),before);
  assert.equal(ui.api.getModifiers().modifiers.length,3);
});
test('Applying modifiers bakes geometry, leaves it editable and supports undo',()=>{
  const ui=harness();
  ui.api.addModifier('array');
  const preview=ui.api.getEvaluatedMesh(1);
  assert.equal(preview.vertices.length,24);
  const applied=ui.api.applyModifiers();
  assert.equal(applied.modifiers.length,0);
  assert.equal(ui.api.getScene().objects[0].vertices.length,24);
  assert.equal(ui.api.getScene().objects[0].faces.length,18);
  ui.node('undoBtn').click();
  assert.equal(ui.api.getScene().objects[0].vertices.length,8);
  assert.equal(ui.api.getModifiers().modifiers[0].type,'array');
});
test('Object mode previews modifiers while edit mode keeps original selectable topology',()=>{
  const ui=harness();
  ui.api.addModifier('array');
  assert.match(ui.node('stats').textContent,/F: 18/);
  ui.node('modeFace').click();
  assert.match(ui.node('stats').textContent,/F: 6/);
  ui.node('modeObject').click();
  assert.match(ui.node('stats').textContent,/F: 18/);
});
test('Modifier geometry is included in OBJ export and persists through JSON and autosave',async()=>{
  const ui=harness();
  ui.api.addModifier('array');
  ui.api.updateModifier(0,{count:4,offset:[3,0,0]});
  ui.api.addModifier('subdivide');
  const expected=ui.api.getEvaluatedMesh(1);
  ui.node('exportObjBtn').click();
  const obj=await ui.latestBlobText();
  assert.equal(obj.split('\n').filter(line=>line.startsWith('v ')).length,expected.vertices.length);
  assert.equal(obj.split('\n').filter(line=>line.startsWith('f ')).length,expected.faces.length);
  const exported=await ui.savedJSON();
  assert.equal(exported.scene.objects[0].vertices.length,8);
  assert.equal(exported.scene.objects[0].modifiers.length,2);
  ui.events.get('pagehide')();
  const restored=harness(JSON.parse(ui.storage.get('polymoduler.autosave.v1')));
  assert.equal(restored.api.getEvaluatedMesh(1).vertices.length,expected.vertices.length);
  const imported=harness();
  imported.importJSON(exported);
  assert.equal(imported.api.getEvaluatedMesh(1).faces.length,expected.faces.length);
});
test('Modifier stack import validation rejects unsupported types and oversized geometry',async()=>{
  const ui=harness(),data=await ui.savedJSON();
  data.scene.objects[0].modifiers=[{type:'unknown'}];
  ui.importJSON(data);
  assert.match(ui.alerts.at(-1),/Could not open scene/);
  assert.equal(ui.api.getScene().objects[0].modifiers.length,0);
  const bad=await ui.savedJSON();
  bad.scene.objects[0].modifiers=[
    {type:'array',count:8,offset:[1,0,0]},
    {type:'array',count:8,offset:[0,1,0]},
    {type:'array',count:8,offset:[0,0,1]},
    {type:'subdivide',levels:2}
  ];
  ui.importJSON(bad);
  assert.match(ui.alerts.at(-1),/12,000/);
  assert.equal(ui.api.getScene().objects[0].modifiers.length,0);
});
test('Modifier workspace button toggles and Apply all changes the same selected object',()=>{
  const ui=harness();
  ui.tab('modifiers').click();
  ui.node('modifierType').value='array';
  ui.node('modifierAdd').click();
  assert.equal(ui.api.getScene().objects[0].vertices.length,8);
  ui.node('modifierApplyAll').click();
  assert.equal(ui.api.getScene().objects[0].vertices.length,24);
  assert.equal(ui.api.getModifiers().modifiers.length,0);
  assert.match(ui.node('modifierStatus').textContent,/applied/i);
});

test('PNG export includes modifiers even when a mesh edit mode was active',async()=>{
  const ui=harness();
  ui.api.addModifier('array');
  ui.api.setRenderSettings({includeOutline:true});
  ui.node('modeFace').click();
  const before=ui.fills.length;
  await ui.api.renderStill();
  const atCapture=ui.captures.at(-1).fillCount;
  assert.ok(atCapture-before>=19,'PNG should render the 18 generated faces plus background');
  assert.match(ui.node('stats').textContent,/F: 6/,'restored viewport remains in face-edit mode');
});
test('Changing Mirror plane offset affects evaluated mesh and is undoable',()=>{
  const ui=harness();
  ui.api.addModifier('mirror');
  ui.api.updateModifier(0,{center:1.5});
  const geometry=ui.api.getEvaluatedMesh(1);
  assert.equal(geometry.vertices[8][0],4);
  assert.equal(geometry.vertices[9][0],2);
  ui.node('undoBtn').click();
  assert.equal(ui.api.getModifiers().modifiers[0].center,0);
});

test('Mirror controls respond to user changes and the Remove button clears the stack',()=>{
  const ui=harness();
  ui.tab('modifiers').click();
  ui.node('modifierType').value='mirror';
  ui.node('modifierAdd').click();
  const children=node=>[node,...(node.children||[]).flatMap(children)];
  let card=ui.node('modifierStack').children.at(-1);
  const input=children(card).find(el=>el.type==='number');
  assert.ok(input,'mirror offset field must be created');
  input.value='1.5';
  input.listeners.change();
  assert.equal(ui.api.getModifiers().modifiers[0].center,1.5);
  card=ui.node('modifierStack').children.at(-1);
  const checkbox=children(card).find(el=>el.type==='checkbox');
  assert.ok(checkbox,'mirror enable checkbox must exist');
  checkbox.checked=false;
  checkbox.listeners.change();
  assert.equal(ui.api.getEvaluatedMesh(1).vertices.length,8);
  card=ui.node('modifierStack').children.at(-1);
  const remove=children(card).find(el=>el.textContent==='Remove');
  assert.ok(remove,'remove button must exist');
  remove.click();
  assert.equal(ui.api.getModifiers().modifiers.length,0);
});
