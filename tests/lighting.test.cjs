const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const modifiers = fs.readFileSync(path.join(root, 'mesh-modifiers.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');

function launch(saved = null) {
  const records = new Map(), nodes = new Map(), frames = [];
  let lastBlob;
  const storage = new Map(saved ? [['polymoduler.autosave.v1', JSON.stringify(saved)]] : []);
  const classList = {add(){},remove(){},toggle(){}};
  function element(id) {
    if (!nodes.has(id)) nodes.set(id, {
      id, value:'', style:{}, classList, disabled:false, hidden:false,
      addEventListener(){}, appendChild(){}, setAttribute(){}, click(){},
      lastElementChild:{textContent:''}, parentElement:{},
      getBoundingClientRect(){return {width:640,height:450,left:0,top:0};},
      setPointerCapture(){}
    });
    return nodes.get(id);
  }
  const fills = [];
  const ctx = new Proxy({}, {
    get(target, key) {
      if (key === 'fillStyle') return target.fillStyle;
      if (key === 'fill') return () => fills.push(target.fillStyle);
      return () => {};
    },
    set(target, key, val){target[key]=val;return true;}
  });
  const canvas=element('viewport');
  canvas.getContext=()=>ctx;
  canvas.clientWidth=640;canvas.clientHeight=450;
  const document = {
    getElementById:element,
    createElement:tag=>element('created-'+tag),
    addEventListener(){},
    activeElement:{tagName:'DIV'}
  };
  const window = {devicePixelRatio:1,addEventListener:(type,fn)=>{records.set(type,fn);}};
  const context = {document,window,localStorage:{
    getItem:k=>storage.get(k)||null,
    setItem:(k,v)=>storage.set(k,v),
    removeItem:k=>storage.delete(k)
  },setTimeout:()=>1,clearTimeout(){},alert(){},Blob,URL:{
    createObjectURL(blob){lastBlob=blob;return 'blob:test';},revokeObjectURL(){}
  },FileReader:class {
    readAsText(file){this.result=file.text;this.onload();}
  }};
  vm.runInNewContext(modifiers,context,{filename:'mesh-modifiers.js'});
  vm.runInNewContext(app,context,{filename:'app.js'});
  return {window,fills,storage,records,load:(data)=>{
    element('fileInput').files=[{size:1000,text:JSON.stringify(data)}];
    const reader=new context.FileReader();
    // Trigger the real load-button listener installed by the application.
    element('fileInput').onchange({target:{files:[{size:1000,text:JSON.stringify(data)}],value:''}});
  },save:async()=>{
    element('saveBtn').onclick();
    return JSON.parse(await lastBlob.text());
  }};
}

test('Lighting navigation builds real sliders instead of planned placeholder cards',()=>{
  assert.match(html,/if \(name === 'lighting'\)/);
  for (const id of ['lightDirectionX','lightDirectionY','lightDirectionZ','lightIntensity','lightAmbient','worldColor','resetLightingBtn']) {
    assert.ok(html.includes(id),id);
  }
  assert.match(html,/polymodulerSetLighting/);
  assert.match(html,/polymodulerResetLighting/);
  assert.match(css,/body\[data-workspace="lighting"\] \.workspace-panel/);
});
test('Lighting API updates CPU face shading and world color without dedicated GPU',()=>{
  const app=launch();
  const original=app.window.polymodulerGetLighting();
  assert.equal(original.worldColor,'#171a21');
  assert.equal(app.window.polymodulerSetLighting('worldColor','#245678'),true);
  assert.equal(app.window.polymodulerGetLighting().worldColor,'#245678');
  assert.equal(app.fills[app.fills.length-1]!==undefined,true);
  const lastBefore=app.fills.slice(-10).join('|');
  assert.equal(app.window.polymodulerSetLighting('intensity',0),true);
  assert.equal(app.window.polymodulerSetLighting('ambient',.9),true);
  assert.equal(app.window.polymodulerGetLighting().intensity,0);
  assert.notEqual(app.fills.slice(-10).join('|'),lastBefore);
  assert.equal(app.window.polymodulerSetLighting('worldColor','invalid'),false);
  assert.equal(app.window.polymodulerGetLighting().worldColor,'#245678');
  app.window.polymodulerResetLighting();
  assert.equal(app.window.polymodulerGetLighting().worldColor,original.worldColor);
});
test('Lighting survives JSON scene export, import and autosave restoration',async()=>{
  const studio=launch();
  studio.window.polymodulerSetLighting('worldColor','#123456');
  studio.window.polymodulerSetLighting('directionY',.85);
  studio.window.polymodulerSetLighting('ambient',.55);
  const exported=await studio.save();
  assert.equal(exported.scene.lighting.worldColor,'#123456');
  studio.records.get('pagehide')();
  const saved=JSON.parse(studio.storage.get('polymoduler.autosave.v1'));
  assert.equal(saved.scene.lighting.worldColor,'#123456');
  const recovered=launch(saved);
  assert.equal(recovered.window.polymodulerGetLighting().ambient,.55);
  recovered.load(exported);
  assert.equal(recovered.window.polymodulerGetLighting().direction[1],.85);
  const older=structuredClone(exported);delete older.scene.lighting;
  recovered.load(older);
  assert.equal(recovered.window.polymodulerGetLighting().worldColor,'#171a21');
});

test('Opening Lighting attaches working event handlers; reset restores defaults',()=>{
  const scriptStart=html.indexOf('<script>'),scriptEnd=html.indexOf('</script>',scriptStart);
  assert.ok(scriptStart>=0&&scriptEnd>scriptStart,'missing workspace script');
  const inline=html.slice(scriptStart+8,scriptEnd);
  const tabs=['modeling','animation','materials','lighting','rendering','scene'].map(name=>({
    dataset:{workspace:name},classList:{toggle(){}},setAttribute(){},
    addEventListener(type,fn){this[type]=fn;}
  }));
  const controls=new Map();
  const panel={
    hidden:true,innerHTML:'',
    querySelector(selector){
      if (!controls.has(selector)) controls.set(selector,{
        value:'',textContent:'',listeners:{},
        addEventListener(type,fn){this.listeners[type]=fn;}
      });
      return controls.get(selector);
    },
    querySelectorAll(){return [];}
  };
  const defaults={direction:[.38,-.46,.8],intensity:1,ambient:.24,worldColor:'#171a21'};
  let lighting=structuredClone(defaults);
  const window={
    polymodulerGetLighting:()=>structuredClone(lighting),
    polymodulerSetLighting:(key,val)=>{
      if(key.startsWith('direction')) lighting.direction['XYZ'.indexOf(key.slice(-1))]=Number(val);
      else if(key==='worldColor')lighting.worldColor=val;
      else lighting[key]=Number(val);
    },
    polymodulerResetLighting:()=>{lighting=structuredClone(defaults);}
  };
  const document={
    body:{dataset:{}},
    getElementById:id=>id==='workspacePanel'?panel:null,
    querySelectorAll:selector=>selector==='.workspace-tab'?tabs:[]
  };
  vm.runInNewContext(inline,{window,document},{filename:'workspace-inline.js'});
  tabs.find(t=>t.dataset.workspace==='lighting').click();
  assert.equal(document.body.dataset.workspace,'lighting');
  assert.equal(panel.hidden,false);
  assert.match(panel.innerHTML,/id="lightIntensity"/);
  const intensity=panel.querySelector('#lightIntensity');
  intensity.value='1.75';intensity.listeners.input();
  assert.equal(lighting.intensity,1.75);
  const world=panel.querySelector('#worldColor');
  world.listeners.input({target:{value:'#345678'}});
  assert.equal(lighting.worldColor,'#345678');
  panel.querySelector('#resetLightingBtn').listeners.click();
  assert.equal(lighting.intensity,1);
  assert.equal(lighting.worldColor,'#171a21');
  tabs.find(t=>t.dataset.workspace==='modeling').click();
  assert.equal(panel.hidden,true);
});
