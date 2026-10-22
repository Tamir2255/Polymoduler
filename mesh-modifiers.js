(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PolymodulerModifiers = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  const MAX_VERTICES = 12000, MAX_FACES = 12000, MAX_STACK = 8;
  const types = ['mirror', 'array', 'subdivide'];
  const copyMesh = mesh => ({
    vertices: mesh.vertices.map(point => point.slice()),
    faces: mesh.faces.map(face => face.slice())
  });
  const count = (value, defaultValue, min, max) =>
    Number.isInteger(value) ? Math.max(min, Math.min(max, value)) : defaultValue;
  function defaultModifier(type) {
    if (type === 'mirror') return {type, enabled: true, axis: 'x', center: 0};
    if (type === 'array') return {type, enabled: true, count: 3, offset: [2.5, 0, 0]};
    if (type === 'subdivide') return {type, enabled: true, levels: 1};
    throw Error('Unsupported modifier: ' + String(type).slice(0, 50));
  }
  function normalizeModifier(value) {
    if (!value || typeof value !== 'object' || !types.includes(value.type)) {
      throw Error('Unrecognized modifier type');
    }
    const mod = defaultModifier(value.type);
    mod.enabled = value.enabled !== false;
    if (mod.type === 'mirror') {
      mod.axis = ['x', 'y', 'z'].includes(value.axis) ? value.axis : 'x';
      mod.center = Number.isFinite(value.center) ? Math.max(-10, Math.min(10, value.center)) : 0;
    } else if (mod.type === 'array') {
      mod.count = count(value.count, 3, 2, 8);
      if (Array.isArray(value.offset) && value.offset.length === 3 &&
          value.offset.every(Number.isFinite)) {
        mod.offset = value.offset.map(n => Math.max(-10, Math.min(10, n)));
      }
    } else {
      mod.levels = count(value.levels, 1, 1, 2);
    }
    return mod;
  }
  function normalizeStack(raw) {
    if (raw == null) return [];
    if (!Array.isArray(raw) || raw.length > MAX_STACK) throw Error('Modifier stack exceeds 8 entries');
    return raw.map(normalizeModifier);
  }
  function guard(vertices, faces) {
    if (vertices > MAX_VERTICES || faces > MAX_FACES) {
      throw Error('Modifier preview exceeds 12,000 vertices or faces. Reduce Array count or subdivision level.');
    }
  }
  function mirror(mesh, axis, center) {
    guard(mesh.vertices.length * 2, mesh.faces.length * 2);
    const coord = ['x', 'y', 'z'].indexOf(axis), n = mesh.vertices.length;
    return {
      vertices: mesh.vertices.concat(mesh.vertices.map(p => p.map((v, i) => i === coord ? 2 * center - v : v))),
      faces: mesh.faces.concat(mesh.faces.map(face => face.map(index => index + n).reverse()))
    };
  }
  function array(mesh, repetitions, offset) {
    guard(mesh.vertices.length * repetitions, mesh.faces.length * repetitions);
    const vertices = [], faces = [], size = mesh.vertices.length;
    for (let i = 0; i < repetitions; i++) {
      for (const point of mesh.vertices) vertices.push(point.map((n, axis) => n + offset[axis] * i));
      for (const face of mesh.faces) faces.push(face.map(index => index + size * i));
    }
    return {vertices, faces};
  }
  function subdivideOnce(mesh) {
    const edgeKeys = new Map(), vertices = mesh.vertices.map(p => p.slice()), faces = [];
    const maxFaceVertices = mesh.faces.reduce((sum, f) => sum + f.length, 0);
    guard(vertices.length + maxFaceVertices + mesh.faces.length, maxFaceVertices);
    for (const face of mesh.faces) {
      const midpoints = [];
      for (let i = 0; i < face.length; i++) {
        const a = face[i], b = face[(i + 1) % face.length];
        const key = Math.min(a, b) + ':' + Math.max(a, b);
        let mid = edgeKeys.get(key);
        if (mid === undefined) {
          mid = vertices.length;
          vertices.push(mesh.vertices[a].map((n, axis) => (n + mesh.vertices[b][axis]) / 2));
          edgeKeys.set(key, mid);
        }
        midpoints.push(mid);
      }
      const center = vertices.length;
      vertices.push([0, 1, 2].map(axis =>
        face.reduce((sum, index) => sum + mesh.vertices[index][axis], 0) / face.length));
      for (let i = 0; i < face.length; i++) {
        faces.push([
          face[i], midpoints[i], center,
          midpoints[(i + face.length - 1) % face.length]
        ]);
      }
    }
    guard(vertices.length, faces.length);
    return {vertices, faces};
  }
  function evaluate(object, stackOverride) {
    const stack = normalizeStack(stackOverride === undefined ? object.modifiers : stackOverride);
    const enabled = stack.filter(mod => mod.enabled);
    if (!enabled.length) return copyMesh(object);
    let mesh = copyMesh(object);
    guard(mesh.vertices.length, mesh.faces.length);
    for (const mod of enabled) {
      if (mod.type === 'mirror') mesh = mirror(mesh, mod.axis, mod.center);
      if (mod.type === 'array') mesh = array(mesh, mod.count, mod.offset);
      if (mod.type === 'subdivide') {
        for (let i = 0; i < mod.levels; i++) mesh = subdivideOnce(mesh);
      }
    }
    return mesh;
  }
  return Object.freeze({
    MAX_VERTICES, MAX_FACES, MAX_STACK,
    defaultModifier, normalizeModifier, normalizeStack, evaluate
  });
});
