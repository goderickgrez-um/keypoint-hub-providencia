// Plano del Hub: vista de calor sobre las zonas y editor de rectángulos por capas.
import { KINDS, MODES, PALETTE } from '../core/catalog.js';
import * as Q from '../core/queries.js';
import { confirmBox, S, db, can, screens, actions, go, run, toast, esc, icon, btn, seg, pill, empty, back, fmtN, val, fill, field, select, swatches } from './kit.js';

const W = 1000, H = 600;
/** Pestañas con los pisos que existen. */
export const floorSeg = (act, cur) => seg(act, cur, Q.floorsOf(db()).map(f => [f, 'Piso ' + f]));
const shapesOf = floor => db().where('plan_shapes', s => s.floor === floor).sort((a, b) => a.z - b.z);

/** Plano con cada zona teñida según su valor (0 a 1). values: { space_id: { v, text } } */
export function heatPlan(floor, values = {}) {
  const shapes = shapesOf(floor);
  if (!shapes.length) return empty('Aún no hay plano para este piso. Administración puede dibujarlo en Espacios › Editar el plano.');
  const labeled = new Set();
  return `<svg class="plan" viewBox="0 0 ${W} ${H}" role="img" aria-label="Plano del piso ${floor}">${shapes.map(s => {
    const v = s.space_id != null ? values[s.space_id] : null, first = !labeled.has(s.group_id || 'x' + s.id); labeled.add(s.group_id || 'x' + s.id);
    const op = v ? .18 + .82 * Math.min(1, v.v) : .14;
    return `<g><rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" rx="10" fill="var(--ac)" fill-opacity="${op.toFixed(2)}" stroke="var(--ln)"><title>${esc(s.label || '')}${v ? ' · ' + esc(v.text) : ''}</title></rect>
      ${first ? `<text x="${s.x + 14}" y="${s.y + 32}" fill="var(--tx)">${esc(s.label || '')}</text>${v ? `<text x="${s.x + 14}" y="${s.y + 58}" fill="var(--tx)" style="font-weight:400;font-size:17px">${esc(v.text)}</text>` : ''}` : ''}</g>`;
  }).join('')}</svg><p class="sm mu">Un tono más intenso indica más uso.</p>`;
}

// ---------------------------------------------------------------- Editor
const ed = () => (S.plan ||= { floor: 1, shapes: null, sel: null, drag: null });
function load(floor) { const p = ed(); p.floor = floor; p.shapes = shapesOf(floor).map(s => ({ ...s })); p.sel = null; }
const cur = () => ed().shapes?.find(s => s.id === ed().sel);
let tmp = -1;

screens['a-plano'] = { roles: ['admin'], render() {
  const p = ed(); if (!Q.floorsOf(db()).includes(p.floor)) p.shapes = null, p.floor = Q.floorsOf(db())[0]; if (!p.shapes) load(p.floor);
  const s = cur(), spaces = db().all('spaces');
  if (s && S.planLoaded !== s.id) { fill({ pl_label: s.label || '', pl_kind: s.kind, pl_cap: s.capacity, pl_space: s.space_id ?? '' }); S.planLoaded = s.id; }
  return `${back('a-esp', 'Espacios')}<div class="head"><h1>Plano del Hub</h1>${floorSeg('pl-floor', p.floor)}</div>
    <div class="row w">${btn('Agregar piso', 'fl-add', { cls: 's plain', icon: 'plus' })}${Q.floorsOf(db()).length > 1 ? btn('Eliminar piso ' + p.floor, 'fl-del', { v: p.floor, cls: 's plain danger', icon: 'trash' }) : ''}</div>
    <p class="mu">Agrega rectángulos, arrástralos y cambia su tamaño desde la esquina. Dos rectángulos del mismo color se pueden unir en una sola zona.</p>
    <p class="sm mu" style="margin:0">Con el teclado: Tab llega a cada zona, Enter la selecciona, las flechas la mueven y Mayús + flechas cambian su tamaño.</p>
    <div class="row w">${btn('Agregar rectángulo', 'pl-add', { cls: 's sec', icon: 'plus' })}${s ? btn('Traer al frente', 'pl-z', { v: 1, cls: 's plain' }) + btn('Enviar atrás', 'pl-z', { v: -1, cls: 's plain' }) + btn('Duplicar', 'pl-dup', { cls: 's plain' }) + btn('Unir con el mismo color', 'pl-join', { cls: 's plain' }) + (s.group_id ? btn('Separar', 'pl-split', { cls: 's plain' }) : '') + btn('Borrar', 'pl-del', { cls: 's danger' }) : ''}</div>
    <div class="grid" style="grid-template-columns:minmax(0,3fr) minmax(240px,1fr)"><div class="card" style="padding:8px">
      <svg id="plan-ed" class="plan" viewBox="0 0 ${W} ${H}" role="group" aria-label="Editor del plano">${p.shapes.map(r => `<g data-shape="${r.id}" style="cursor:move" tabindex="0" role="button" aria-pressed="${r.id === p.sel}" aria-label="Zona ${esc(r.label || 'sin nombre')}, ${r.w} × ${r.h}, posición ${r.x}, ${r.y}"><rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="8" fill="${r.color}" stroke="${r.id === p.sel ? 'var(--tx)' : 'none'}" stroke-width="3" ${r.group_id ? 'stroke-dasharray="0"' : ''}/>
        <text x="${r.x + 12}" y="${r.y + 28}" fill="${r.text_color || '#fff'}">${esc(r.label || '')}</text>${r.capacity ? `<text x="${r.x + 12}" y="${r.y + 52}" fill="${r.text_color || '#fff'}" style="font-weight:400;font-size:16px">${r.capacity} personas</text>` : ''}
        ${r.id === p.sel ? `<rect class="hd" data-handle="${r.id}" x="${r.x + r.w - 14}" y="${r.y + r.h - 14}" width="22" height="22" rx="5"/>` : ''}</g>`).join('')}</svg></div>
    <div class="card stack">${s ? `<h3>Zona seleccionada</h3>${field('pl_label', 'Nombre', { live: true })}${select('pl_space', 'Vincular con el espacio (completa nombre, tipo y aforo)', spaces.filter(x => x.active || x.id === s.space_id).map(x => [x.id, x.name + ' · piso ' + x.floor]), { raw: true, blank: 'Sin vincular', live: true })}
      ${select('pl_kind', 'Tipo de espacio', [...Object.entries(MODES), ['otro', 'Otro']], { raw: true, live: true })}${field('pl_cap', 'Aforo (personas)', { type: 'number', live: true, attrs: 'min="0"' })}
      <span class="sm b">Color</span>${swatches('pl-color', s.color, [...PALETTE.accent, '#7D8790', '#9AA3A8'])}<span class="sm b">Color del texto</span>${swatches('pl-tcolor', s.text_color || '#FFFFFF', PALETTE.onColor)}
      ${s.group_id ? pill('Unida con otras zonas del mismo color', 'info') : ''}<p class="sm mu">Vincular la zona con un espacio permite pintarla con la ocupación y el mapa de calor.</p>` : '<p class="mu">Toca un rectángulo para editarlo.</p>'}
      ${btn('Guardar plano', 'pl-save', { cls: 'block' })}</div></div>`;
} };

const sync = () => { const s = cur(); if (!s) return; s.label = val('pl_label'); s.kind = val('pl_kind'); s.capacity = Math.max(0, Math.floor(+val('pl_cap') || 0)); s.space_id = val('pl_space') ? +val('pl_space') : null; if (s.group_id) ed().shapes.filter(x => x.group_id === s.group_id).forEach(x => Object.assign(x, { label: s.label, kind: s.kind, capacity: s.capacity, space_id: s.space_id })); };
actions['pl-floor'] = v => { load(+v); go(S.k); };
actions['pl-add'] = () => { const p = ed(), r = { id: tmp--, x: 60 + (p.shapes.length % 6) * 30, y: 60 + (p.shapes.length % 6) * 30, w: 260, h: 160, color: PALETTE.accent[p.shapes.length % PALETTE.accent.length], text_color: '#FFFFFF', label: 'Nueva zona', kind: 'libre', capacity: 0, space_id: null, group_id: null }; p.shapes.push(r); p.sel = r.id; S.planLoaded = null; go(S.k); };
actions['pl-z'] = d => { const p = ed(), i = p.shapes.findIndex(s => s.id === p.sel), [r] = p.shapes.splice(i, 1); +d > 0 ? p.shapes.push(r) : p.shapes.unshift(r); go(S.k); };
actions['pl-dup'] = () => { sync(); const p = ed(), r = { ...cur(), id: tmp--, x: cur().x + 30, y: cur().y + 30 }; p.shapes.push(r); p.sel = r.id; S.planLoaded = null; go(S.k); };
actions['pl-del'] = () => { const p = ed(); p.shapes = p.shapes.filter(s => s.id !== p.sel); p.sel = null; go(S.k); };
actions['pl-join'] = () => { sync(); const p = ed(), s = cur(), same = p.shapes.filter(x => x.color === s.color && x.id !== s.id);
  if (!same.length) return toast('No hay otro rectángulo del mismo color');
  const g = s.group_id || Math.max(0, ...p.shapes.map(x => x.group_id || 0)) + 1; [s, ...same].forEach(x => Object.assign(x, { group_id: g, label: s.label, kind: s.kind, capacity: s.capacity, space_id: s.space_id })); toast('Zonas unidas'); };
actions['pl-split'] = () => { cur().group_id = null; go(S.k); };
actions['pl-color'] = c => { const s = cur(); s.color = c; go(S.k); };
actions['pl-tcolor'] = c => { const s = cur(); s.text_color = c; go(S.k); };
actions['pl-save'] = async () => { sync(); const p = ed(); const r = await run('plan.save', { floor: p.floor, shapes: p.shapes }, 'Plano guardado'); if (r) load(p.floor); };
actions['plan-live'] = () => { const s = cur(), v = val('pl_space'); // al vincular un espacio, la zona toma sus datos
  if (s && v && +v !== s.space_id) { const sp = db().get('spaces', +v); if (sp) { Object.assign(S.f, { pl_label: sp.name, pl_kind: sp.mode, pl_cap: sp.capacity }); if (sp.color) s.color = sp.color; if (sp.floor !== ed().floor) toast(`Ojo: ${sp.name} está registrado en el piso ${sp.floor}`); } }
  sync(); };
actions['fl-add'] = () => confirmBox({ title: '¿Agregar un piso?', text: `<p>Se creará el piso ${Math.max(...Q.floorsOf(db())) + 1}, con su plano vacío. Su aforo se ajusta en Reglas.</p>`, ok: 'Agregar piso',
  fn: async () => { const r = await run('floor.add', { capacity: 0 }); if (r) { load(r.floor); toast('Piso ' + r.floor + ' agregado'); go(S.k); } } });
actions['fl-del'] = f => { const n = db().where('spaces', s => s.floor === +f && s.active).length;
  confirmBox({ title: `¿Eliminar el piso ${f}?`, danger: true, ok: 'Eliminar piso', text: `<p>Se borra su plano${n ? ` y se <b>desactivan sus ${n} espacios</b>. Las reservas futuras en ellos se cancelan con aviso; el historial se conserva` : ''}.</p><p>No se puede deshacer.</p>`,
    fn: async () => { const r = await run('floor.remove', { floor: +f }); if (r) { ed().shapes = null; ed().floor = Q.floorsOf(db())[0]; toast(`Piso eliminado${r.deactivated ? ` · ${r.deactivated} espacios desactivados` : ''}`); go(S.k); } } }); };

const refocus = id => requestAnimationFrame(() => document.querySelector(`#plan-ed [data-shape="${id}"]`)?.focus());
/** Arrastre y cambio de tamaño con puntero (mouse o dedo) y con teclado. */
export function bindPlan() {
  const svg = document.getElementById('plan-ed'); if (!svg) return;
  const pt = e => { const b = svg.getBoundingClientRect(); return { x: (e.clientX - b.left) * W / b.width, y: (e.clientY - b.top) * H / b.height }; };
  svg.onpointerdown = e => {
    const p = ed(), h = e.target.closest('[data-handle]'), g = e.target.closest('[data-shape]');
    if (!g) { if (p.sel != null) { sync(); p.sel = null; go(S.k); } return; }
    const id = +g.dataset.shape; if (p.sel !== id) { sync(); p.sel = id; S.planLoaded = null; }
    const s = cur(), o = pt(e); p.drag = { mode: h ? 'size' : 'move', o, x: s.x, y: s.y, w: s.w, h: s.h };
    svg.setPointerCapture(e.pointerId);
    if (!h) go(S.k);
  };
  svg.onpointermove = e => { const p = ed(), d = p.drag, s = cur(); if (!d || !s) return; const q = pt(e), dx = q.x - d.o.x, dy = q.y - d.o.y, snap = v => Math.round(v / 10) * 10;
    if (d.mode === 'move') { s.x = Math.max(0, Math.min(W - s.w, snap(d.x + dx))); s.y = Math.max(0, Math.min(H - s.h, snap(d.y + dy))); }
    else { s.w = Math.max(60, Math.min(W - s.x, snap(d.w + dx))); s.h = Math.max(50, Math.min(H - s.y, snap(d.h + dy))); }
    const g = svg.querySelector(`[data-shape="${s.id}"]`);
    g.querySelector('rect').setAttribute('x', s.x); g.querySelector('rect').setAttribute('y', s.y); g.querySelector('rect').setAttribute('width', s.w); g.querySelector('rect').setAttribute('height', s.h);
    g.querySelectorAll('text').forEach((t, i) => { t.setAttribute('x', s.x + 12); t.setAttribute('y', s.y + (i ? 52 : 28)); });
    const hd = g.querySelector('.hd'); if (hd) { hd.setAttribute('x', s.x + s.w - 14); hd.setAttribute('y', s.y + s.h - 14); }
  };
  svg.onpointerup = () => { if (ed().drag) { ed().drag = null; go(S.k); } };
  // Teclado: Enter o espacio selecciona; flechas mueven 10 px; Mayús + flechas cambian el tamaño
  svg.onkeydown = e => {
    const g = e.target.closest?.('[data-shape]'); if (!g) return;
    const p = ed(), id = +g.dataset.shape, keys = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (p.sel !== id) { sync(); p.sel = id; S.planLoaded = null; } go(S.k); return refocus(id); }
    if (!keys[e.key]) return; e.preventDefault();
    if (p.sel !== id) { sync(); p.sel = id; S.planLoaded = null; }
    const s = cur(), [dx, dy] = keys[e.key].map(v => v * 10);
    if (e.shiftKey) { s.w = Math.max(60, Math.min(W - s.x, s.w + dx)); s.h = Math.max(50, Math.min(H - s.y, s.h + dy)); }
    else { s.x = Math.max(0, Math.min(W - s.w, s.x + dx)); s.y = Math.max(0, Math.min(H - s.h, s.y + dy)); }
    go(S.k); refocus(id);
  };
}
