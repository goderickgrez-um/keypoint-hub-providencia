// Lectura de códigos QR con la cámara (usa la biblioteca jsQR incluida en vendor/).
// La ventana vive fuera del área que se redibuja, para no perder el video en cada cambio de pantalla.
import { t } from './i18n.js';

let stream = null, timer = null, box = null;
export function closeCamera() { clearInterval(timer); stream?.getTracks().forEach(x => x.stop()); stream = null; box?.remove(); box = null; }

/** Abre la cámara y entrega cada código leído. Con continuous queda abierta para leer varios seguidos. */
export async function openCamera(onCode, { continuous = false } = {}) {
  closeCamera();
  box = document.createElement('div'); box.className = 'modal';
  box.innerHTML = `<div><div class="row between"><h2 style="margin:0">${t('Escanear código QR')}</h2><button class="btn s plain">${t('Cerrar')}</button></div><video class="cam" playsinline muted></video><p class="sm mu">${t('Apunta la cámara al código QR.')}</p></div>`;
  document.body.append(box);
  box.querySelector('button').onclick = closeCamera;
  const video = box.querySelector('video'), msg = box.querySelector('p');
  try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); }
  catch { msg.textContent = t('No se pudo abrir la cámara. Usa el lector USB o escribe el código.'); return; }
  video.srcObject = stream; await video.play().catch(() => {});
  const cv = document.createElement('canvas'), cx = cv.getContext('2d', { willReadFrequently: true });
  let last = '', lastAt = 0;
  timer = setInterval(() => {
    if (!video.videoWidth || !window.jsQR) return;
    const k = Math.min(1, 640 / video.videoWidth); cv.width = video.videoWidth * k; cv.height = video.videoHeight * k;
    cx.drawImage(video, 0, 0, cv.width, cv.height);
    const d = cx.getImageData(0, 0, cv.width, cv.height), r = window.jsQR(d.data, d.width, d.height);
    if (!r?.data || (r.data === last && Date.now() - lastAt < 4000)) return;
    last = r.data; lastAt = Date.now();
    if (continuous) msg.textContent = `${t('Leído')}: ${r.data}`; else closeCamera();
    onCode(r.data.trim());
  }, 220);
}
