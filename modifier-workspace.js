(() => {
  'use strict';
  const api = window.polymodulerStudio;
  let activePanel = null;
  const byId = (root, id) => root.querySelector('#' + id);
  const make = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  function showStatus(message, error = false) {
    if (!activePanel) return;
    const status = byId(activePanel, 'modifierStatus');
    if (!status) return;
    status.textContent = message;
    status.classList.toggle('error', error);
  }
  function perform(fn, success = 'Modifier preview updated.') {
    try {
      fn();
      if (activePanel) draw(activePanel);
      showStatus(success);
    } catch (error) {
      if (activePanel) draw(activePanel);
      showStatus(error && error.message ? error.message : 'Modifier operation failed.', true);
    }
  }
  function labeled(parent, label, input, cssClass = 'modifier-field') {
    const wrapper = make('label', undefined, cssClass);
    wrapper.appendChild(make('span', label));
    wrapper.appendChild(input);
    parent.appendChild(wrapper);
    return input;
  }
  function numberControl(parent, title, value, min, max, step, handler) {
    const input = make('input');
    input.type = 'number';
    input.value = String(value);
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.setAttribute('aria-label', title);
    labeled(parent, title, input);
    input.addEventListener('change', () => perform(() => handler(Number(input.value))));
    return input;
  }
  function selectControl(parent, label, value, options, handler) {
    const input = make('select');
    for (const [id, name] of options) {
      const option = make('option', name);
      option.value = id;
      input.appendChild(option);
    }
    input.value = String(value);
    labeled(parent, label, input);
    input.addEventListener('change', () => perform(() => handler(input.value)));
    return input;
  }
  function button(parent, title, action, disabled, label) {
    const control = make('button', title);
    control.type = 'button';
    control.disabled = Boolean(disabled);
    if (label) control.setAttribute('aria-label', label);
    control.addEventListener('click', action);
    parent.appendChild(control);
    return control;
  }
  function buildModifierCard(root, mod, index, count) {
    const item = make('article', undefined, 'modifier-card');
    const header = make('div', undefined, 'modifier-card-header');
    const name = mod.type === 'mirror' ? 'Mirror' : mod.type === 'array' ? 'Array' : 'Subdivide';
    header.appendChild(make('strong', (index + 1) + '. ' + name));
    const actions = make('div', undefined, 'modifier-card-actions');
    button(actions, '↑', () => perform(() => api.moveModifier(index, -1), 'Modifier moved up.'), index === 0, 'Move ' + name + ' up');
    button(actions, '↓', () => perform(() => api.moveModifier(index, 1), 'Modifier moved down.'), index === count - 1, 'Move ' + name + ' down');
    button(actions, 'Remove', () => perform(() => api.removeModifier(index), 'Modifier removed.'), false, 'Remove ' + name);
    header.appendChild(actions);
    item.appendChild(header);
    const checkbox = make('input');
    checkbox.type = 'checkbox';
    checkbox.checked = mod.enabled;
    checkbox.addEventListener('change', () => perform(() => api.updateModifier(index, {enabled: checkbox.checked})));
    labeled(item, 'Show modifier preview', checkbox, 'modifier-toggle');
    if (mod.type === 'mirror') {
      selectControl(item, 'Mirror axis', mod.axis, [['x','X · Left / right'],['y','Y · Front / back'],['z','Z · Up / down']],
        value => api.updateModifier(index, {axis: value}));
      numberControl(item, 'Mirror plane offset', mod.center, -10, 10, .25, value => api.updateModifier(index, {center: value}));
      item.appendChild(make('p', 'Mirror plane offset 0 uses the local origin. Try 1.5 with a centered cube to see its mirrored copy beside it. Seams are not welded.', 'modifier-note'));
    } else if (mod.type === 'array') {
      numberControl(item, 'Copy count', mod.count, 2, 8, 1, value => api.updateModifier(index, {count: value}));
      const axes = make('div', undefined, 'modifier-axis-grid');
      for (let axis = 0; axis < 3; axis++) {
        const label = ['X offset','Y offset','Z offset'][axis];
        numberControl(axes, label, mod.offset[axis], -10, 10, .25, value => {
          const offset = mod.offset.slice();
          offset[axis] = value;
          return api.updateModifier(index, {offset});
        });
      }
      item.appendChild(axes);
      item.appendChild(make('p', 'Copies are offset along the object’s local axes.', 'modifier-note'));
    } else {
      selectControl(item, 'Subdivisions', mod.levels, [['1','1 level'],['2','2 levels']],
        value => api.updateModifier(index, {levels: Number(value)}));
      item.appendChild(make('p', 'Splits faces into smaller flat-shaded quads without smoothing their positions.', 'modifier-note'));
    }
    root.appendChild(item);
  }
  function draw(panel) {
    activePanel = panel;
    const scene = api.getScene();
    const info = api.getModifiers();
    panel.innerHTML =
      '<div class="section-kicker">GEOMETRY WORKSPACE · CPU</div><h1>Modifiers</h1>' +
      '<p class="workspace-intro">Build low-poly shapes using reversible geometry operations. The original mesh stays untouched until you apply the stack.</p>' +
      '<div class="studio-card"><h2>Selected object</h2><label class="studio-field">Object<select id="modifierObject"></select></label>' +
      '<div id="modifierMeshCounts" class="modifier-mesh-counts"></div></div>' +
      '<div class="studio-card"><h2>Modifier stack</h2><div class="studio-actions">' +
      '<select id="modifierType" aria-label="Modifier type"><option value="mirror">Mirror</option><option value="array">Array</option><option value="subdivide">Subdivide</option></select>' +
      '<button id="modifierAdd" class="studio-primary">+ Add modifier</button></div>' +
      '<div id="modifierStack" class="modifier-stack"></div>' +
      '<button id="modifierApplyAll" class="modifier-apply">Apply all to mesh</button>' +
      '<p class="modifier-note">Applying is undoable. To edit generated faces individually, apply the modifiers first.</p>' +
      '<div id="modifierStatus" class="studio-status" role="status" aria-live="polite">Ready.</div></div>' +
      '<p class="workspace-note">Stack order affects the result. Max 8 modifiers; previews are limited to 12,000 generated vertices or faces for lightweight CPU rendering.</p>';
    const picker = byId(panel, 'modifierObject');
    for (const object of scene.objects) {
      const option = make('option', object.name);
      option.value = String(object.id);
      picker.appendChild(option);
    }
    const counts = byId(panel, 'modifierMeshCounts');
    const stackRoot = byId(panel, 'modifierStack');
    const add = byId(panel, 'modifierAdd');
    const apply = byId(panel, 'modifierApplyAll');
    if (!info) {
      counts.textContent = 'No selected object.';
      stackRoot.textContent = 'Select an object in Scene or add a primitive in Modeling.';
      picker.disabled = true;
      add.disabled = true;
      apply.disabled = true;
      return;
    }
    picker.value = String(info.objectId);
    picker.addEventListener('change', () => perform(() => api.selectObject(picker.value), 'Selected object changed.'));
    counts.textContent = 'Base: ' + info.base.vertices + ' vertices / ' + info.base.faces +
      ' faces  →  Preview: ' + info.evaluated.vertices + ' vertices / ' + info.evaluated.faces + ' faces';
    add.disabled = info.modifiers.length >= 8;
    apply.disabled = info.modifiers.length === 0;
    add.addEventListener('click', () =>
      perform(() => api.addModifier(byId(panel, 'modifierType').value), 'Modifier added.'));
    apply.addEventListener('click', () =>
      perform(() => api.applyModifiers(), 'Modifier stack applied. Use Undo to restore it.'));
    if (!info.modifiers.length) stackRoot.textContent = 'No modifiers yet. Start with Mirror, Array, or Subdivide.';
    info.modifiers.forEach((mod, index) => buildModifierCard(stackRoot, mod, index, info.modifiers.length));
  }
  window.polymodulerOpenModifierWorkspace = panel => {
    if (!api || !panel) return;
    api.enterModifiers();
    draw(panel);
  };
  window.polymodulerRefreshModifierWorkspace = () => {
    if (activePanel && document.body.dataset.workspace === 'modifiers') draw(activePanel);
  };
})();