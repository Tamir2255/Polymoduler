(() => {
  'use strict';
  const api = window.polymodulerStudio;
  const lookup = (panel,id) => panel.querySelector('#'+id);
  const formatCount = n => String(n);
  function rendering(panel) {
    const scene=api.getScene(),settings=scene.renderSettings;
    panel.innerHTML =
      '<div class="section-kicker">OUTPUT WORKSPACE · CPU</div><h1>Rendering</h1>'+
      '<p class="workspace-intro">Export a clean, CPU-rendered PNG of the current camera view. No dedicated graphics hardware or server required.</p>'+
      '<div class="studio-card"><h2>Still image</h2><p>Frames use the active camera angle and your current lighting and materials.</p>'+
      '<label class="studio-field">Output resolution<select id="renderPreset">'+
      '<option value="640x360">640 × 360 · Quick preview</option><option value="960x540">960 × 540 · Standard</option>'+
      '<option value="1280x720">1280 × 720 · HD</option></select></label>'+
      '<label class="studio-check"><input id="renderGrid" type="checkbox">Include construction grid</label>'+
      '<label class="studio-check"><input id="renderOutline" type="checkbox">Include selected object outline</label>'+
      '<button id="renderPngBtn" class="studio-primary">Render and download PNG</button>'+
      '<div id="renderStatus" role="status" aria-live="polite" class="studio-status">Ready to render '+formatCount(scene.objects.length)+' objects.</div></div>'+
      '<div class="studio-card"><h2>Animation output</h2><p>WebM recording is available in the Animation workspace once you set object or camera keyframes.</p>'+
      '<button id="goAnimationBtn">Open animation controls</button></div>'+
      '<p class="workspace-note">This software renderer exports the viewport shading. Ray tracing, advanced shadows, transparency and physically based path tracing are not yet supported.</p>';
    lookup(panel,'renderPreset').value=settings.width+'x'+settings.height;
    lookup(panel,'renderGrid').checked=settings.includeGrid;
    lookup(panel,'renderOutline').checked=settings.includeOutline;
    lookup(panel,'renderPreset').addEventListener('change',event=>{
      const [width,height]=event.target.value.split('x').map(Number);
      api.setRenderSettings({width,height});
    });
    lookup(panel,'renderGrid').addEventListener('change',event=>api.setRenderSettings({includeGrid:event.target.checked}));
    lookup(panel,'renderOutline').addEventListener('change',event=>api.setRenderSettings({includeOutline:event.target.checked}));
    lookup(panel,'renderPngBtn').addEventListener('click',async()=>{
      const button=lookup(panel,'renderPngBtn'),status=lookup(panel,'renderStatus');
      button.disabled=true;status.textContent='Rendering PNG on CPU…';
      try{const result=await api.renderStill();status.textContent='Downloaded '+result.width+' × '+result.height+' PNG.';}
      catch(error){status.textContent='Render failed: '+error.message;}
      finally{button.disabled=false;}
    });
    lookup(panel,'goAnimationBtn').addEventListener('click',()=>{
      const tab=document.querySelector('[data-workspace="animation"]');
      if(tab)tab.click();
    });
  }
  function sceneWorkspace(panel) {
    const scene=api.getScene(),selected=api.getSelectedId();
    panel.innerHTML=
      '<div class="section-kicker">PROJECT WORKSPACE</div><h1>Scene</h1>'+
      '<p class="workspace-intro">Organize objects, name your project, choose display units and manage project files.</p>'+
      '<div class="studio-card"><h2>Project</h2>'+
      '<label class="studio-field">Scene name<input type="text" id="studioSceneName" maxlength="80"></label>'+
      '<label class="studio-field">Measurement units<select id="studioUnits"><option value="meters">Meters</option>'+
      '<option value="centimeters">Centimeters</option><option value="inches">Inches</option><option value="feet">Feet</option></select></label>'+
      '<p class="studio-hint">Units describe measurements; they do not rescale existing mesh geometry.</p>'+
      '<div class="studio-actions"><button id="sceneSaveBtn">Save JSON</button><button id="sceneOpenBtn">Open JSON</button>'+
      '<button id="sceneExportBtn">Export OBJ</button><button id="sceneImportObjBtn">Import OBJ</button></div></div>'+
      '<div class="studio-card"><h2>Object hierarchy <small id="objectCount"></small></h2>'+
      '<div class="studio-actions"><select id="studioPrimitive" aria-label="Primitive">'+
      '<option value="cube">Cube</option><option value="plane">Plane</option><option value="uvsphere">UV Sphere</option>'+
      '<option value="cylinder">Cylinder</option><option value="cone">Cone</option><option value="torus">Torus</option></select>'+
      '<button id="studioAddObject">Add object</button></div><div id="sceneObjectRows" class="scene-object-rows"></div>'+
      '<p class="studio-hint">Select a row to edit its mesh or material. The eye control hides objects from the viewport and PNG renders.</p></div>'+
      '<div class="studio-card"><h2>View camera</h2><div class="studio-actions">'+
      '<button data-studio-view="front">Front</button><button data-studio-view="top">Top</button>'+
      '<button data-studio-view="right">Right</button><button data-studio-view="isometric">Perspective</button><button id="sceneFocusBtn">Focus selected</button></div></div>';
    lookup(panel,'studioSceneName').value=scene.name;
    lookup(panel,'studioUnits').value=scene.units;
    lookup(panel,'studioSceneName').addEventListener('change',e=>{if(!api.renameScene(e.target.value))e.target.value=api.getScene().name;});
    lookup(panel,'studioUnits').addEventListener('change',e=>api.setUnits(e.target.value));
    lookup(panel,'sceneSaveBtn').addEventListener('click',()=>api.saveScene());
    lookup(panel,'sceneOpenBtn').addEventListener('click',()=>api.openScene());
    lookup(panel,'sceneExportBtn').addEventListener('click',()=>api.exportOBJ());
    lookup(panel,'sceneImportObjBtn').addEventListener('click',()=>document.getElementById('objFileInput').click());
    lookup(panel,'sceneFocusBtn').addEventListener('click',()=>api.focusSelected());
    lookup(panel,'studioAddObject').addEventListener('click',()=>{
      api.addPrimitive(lookup(panel,'studioPrimitive').value);sceneWorkspace(panel);
    });
    panel.querySelectorAll('[data-studio-view]').forEach(button=>
      button.addEventListener('click',()=>api.setCameraPreset(button.dataset.studioView)));
    const root=lookup(panel,'sceneObjectRows');
    lookup(panel,'objectCount').textContent=scene.objects.length+' total';
    if(!scene.objects.length){root.textContent='No objects yet. Add a primitive above.';return;}
    for(const object of scene.objects){
      const row=document.createElement('div');
      row.className='studio-object-row'+(object.id===selected?' selected':'');
      const name=document.createElement('input');
      name.type='text';name.maxLength=80;name.value=object.name;name.title='Rename '+object.name;
      name.setAttribute('aria-label','Object name '+object.id);
      name.addEventListener('change',e=>{if(api.renameObject(object.id,e.target.value))sceneWorkspace(panel);});
      const select=document.createElement('button');
      select.type='button';select.className='studio-object-select';select.textContent=object.id===selected?'● Selected':'Select';
      select.addEventListener('click',()=>{api.selectObject(object.id);sceneWorkspace(panel);});
      const visible=document.createElement('button');
      visible.type='button';visible.className='studio-eye';
      visible.textContent=object.visible===false?'◌ Hidden':'◉ Visible';
      visible.setAttribute('aria-label',(object.visible===false?'Show ':'Hide ')+object.name);
      visible.addEventListener('click',()=>{api.setObjectVisibility(object.id,object.visible===false);sceneWorkspace(panel);});
      row.appendChild(name);row.appendChild(select);row.appendChild(visible);
      root.appendChild(row);
    }
  }
  window.polymodulerRefreshWorkspace=()=>{if(document.body.dataset.workspace==='scene'){const panel=document.getElementById('workspacePanel');if(panel)sceneWorkspace(panel);}};
  window.polymodulerOpenStudioWorkspace=(workspace,panel)=>{
    if(!api||!panel)return;
    if(workspace==='rendering')rendering(panel);
    if(workspace==='scene')sceneWorkspace(panel);
  };
})();