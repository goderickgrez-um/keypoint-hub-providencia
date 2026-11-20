// Diploma de certificación: se dibuja en un lienzo y se entrega como PDF (A4 horizontal) sin bibliotecas externas.
import { db } from './kit.js';
import * as R from '../core/rules.js';

const W = 2339, H = 1654; // A4 horizontal a 200 ppp
const loadImg = src => new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });
const fmtDate = d => new Date(d).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });

/** Dibuja el diploma de un registro de user_certs. */
async function draw(uc, logo) {
  const d = db(), u = d.get('users', uc.user_id), c = d.get('certifications', uc.certification_id), sp = d.get('spaces', c.space_id);
  const by = uc.granted_by && d.get('users', uc.granted_by), ac = d.cfg('theme')?.light?.accent || '#0E7C86', hub = d.cfg('system_name') || 'Hub Providencia';
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  g.fillStyle = '#FBFAF7'; g.fillRect(0, 0, W, H);
  g.strokeStyle = ac; g.lineWidth = 10; g.strokeRect(70, 70, W - 140, H - 140); g.lineWidth = 2; g.strokeRect(96, 96, W - 192, H - 192);
  const img = await loadImg(logo); if (img) { const h = 190, w = img.width * h / img.height; g.drawImage(img, (W - w) / 2, 170, w, h); }
  const text = (s, y, font, color = '#1D1D1F') => { g.font = font; g.fillStyle = color; g.textAlign = 'center'; let f = font; while (g.measureText(s).width > W - 360) { f = f.replace(/(\d+)px/, (_, n) => (n - 4) + 'px'); g.font = f; } g.fillText(s, W / 2, y); };
  const serif = 'Georgia, "Times New Roman", serif', sans = '-apple-system, "Segoe UI", Roboto, Arial, sans-serif';
  text('CERTIFICADO DE APROBACIÓN', 470, `600 46px ${sans}`, ac);
  text(`${hub} certifica que`, 590, `400 44px ${serif}`, '#555');
  text(u?.name || 'Usuario', 720, `700 104px ${serif}`);
  if (u?.doc_number) text(`${u.doc_type === 'pasaporte' ? 'Pasaporte' : 'RUT'} ${R.fmtDoc(u.doc_number, u.doc_type)}`, 790, `400 38px ${sans}`, '#666');
  text('aprobó la certificación', 900, `400 44px ${serif}`, '#555');
  text(c.name, 1010, `700 72px ${serif}`, ac);
  text(`${sp?.name || ''} · Nivel ${c.level || 1}`, 1080, `400 40px ${sans}`, '#444');
  text(`Otorgada el ${fmtDate(uc.granted_at)}${uc.expires_at ? ` · Vigente hasta el ${fmtDate(uc.expires_at)}` : ''}`, 1170, `400 36px ${sans}`, '#555');
  g.strokeStyle = '#999'; g.lineWidth = 2; g.beginPath(); g.moveTo(W / 2 - 330, 1390); g.lineTo(W / 2 + 330, 1390); g.stroke();
  text(by?.name || 'Encargado del laboratorio', 1440, `600 36px ${sans}`);
  text('Encargado de laboratorio · ' + hub, 1488, `400 30px ${sans}`, '#666');
  g.textAlign = 'right'; g.font = `400 26px ${sans}`; g.fillStyle = '#888'; g.fillText(`Código ${uc.user_id}-C${uc.id}`, W - 140, H - 130);
  return cv;
}

/** PDF de una página con una imagen JPEG a toda página (A4 horizontal: 842 × 595 pt). */
function pdfFromJpeg(bytes, w, h) {
  const enc = new TextEncoder(), parts = [], offs = []; let len = 0;
  const push = x => { const b = typeof x === 'string' ? enc.encode(x) : x; parts.push(b); len += b.length; };
  const obj = (n, body, stream) => { offs[n] = len; push(`${n} 0 obj\n${body}\n`); if (stream) { push('stream\n'); push(stream); push('\nendstream\n'); } push('endobj\n'); };
  const content = enc.encode('q 842 0 0 595 0 0 cm /Im1 Do Q');
  push('%PDF-1.4\n');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  obj(3, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /XObject << /Im1 4 0 R >> >> /Contents 5 0 R >>');
  obj(4, `<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>`, bytes);
  obj(5, `<< /Length ${content.length} >>`, content);
  const xref = len; push(`xref\n0 6\n0000000000 65535 f \n${offs.slice(1).map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(parts, { type: 'application/pdf' });
}

/** Genera el diploma en PDF. */
export async function diplomaPdf(uc, logo) {
  const cv = await draw(uc, logo), url = cv.toDataURL('image/jpeg', 0.92), bin = atob(url.split(',')[1]), bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return pdfFromJpeg(bytes, W, H);
}
