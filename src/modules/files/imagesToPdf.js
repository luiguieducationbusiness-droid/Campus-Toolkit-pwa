import { PDFDocument } from 'pdf-lib';
import { createDropZone, downloadBlob, setStatus } from '../shared.js';

export function mountImagesToPdf(container) {
  let queue = []; // { file, name }

  container.innerHTML = `
    <p class="module-title">Imágenes a PDF</p>
    <p class="module-sub">Sube fotos de tus apuntes (JPG, PNG o WebP) y arma un solo PDF, en el orden que quieras. Todo se procesa en tu equipo.</p>
    <div id="dz-slot"></div>
    <ul id="queue-list" class="mt-4 space-y-2"></ul>
    <div class="flex items-center gap-3 mt-5">
      <button id="generate" class="btn-primary" disabled>Generar PDF</button>
      <button id="clear" class="btn-secondary">Vaciar lista</button>
    </div>
    <p id="status"></p>
  `;

  const dzSlot = container.querySelector('#dz-slot');
  const queueList = container.querySelector('#queue-list');
  const generateBtn = container.querySelector('#generate');
  const clearBtn = container.querySelector('#clear');
  const status = container.querySelector('#status');

  const dz = createDropZone({
    accept: 'image/png,image/jpeg,image/webp',
    multiple: true,
    hint: 'imágenes',
    onFiles: files => {
      files.filter(f => f.type.startsWith('image/')).forEach(f => queue.push(f));
      renderQueue();
    }
  });
  dzSlot.appendChild(dz);

  function renderQueue() {
    queueList.innerHTML = '';
    queue.forEach((file, i) => {
      const li = document.createElement('li');
      li.className = 'flex items-center justify-between text-sm border border-line rounded px-3 py-2 bg-white';
      li.innerHTML = `
        <span class="truncate">${i + 1}. ${file.name}</span>
        <button data-i="${i}" class="text-bad text-xs hover:underline">Quitar</button>
      `;
      queueList.appendChild(li);
    });
    generateBtn.disabled = queue.length === 0;
    queueList.querySelectorAll('button[data-i]').forEach(btn => {
      btn.addEventListener('click', () => {
        queue.splice(Number(btn.dataset.i), 1);
        renderQueue();
      });
    });
  }

  clearBtn.addEventListener('click', () => { queue = []; renderQueue(); setStatus(status, ''); });

  generateBtn.addEventListener('click', async () => {
    if (!queue.length) return;
    generateBtn.disabled = true;
    setStatus(status, 'Generando PDF…');
    try {
      const pdfDoc = await PDFDocument.create();
      for (const file of queue) {
        const bytes = await file.arrayBuffer();
        let image;
        if (file.type === 'image/png') {
          image = await pdfDoc.embedPng(bytes);
        } else {
          // JPEG y WebP -> se normalizan a JPEG vía canvas antes de incrustar
          image = await pdfDoc.embedJpg(await toJpegBytes(file));
        }
        const page = pdfDoc.addPage([image.width, image.height]);
        page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
      }
      const bytes = await pdfDoc.save();
      downloadBlob(new Blob([bytes], { type: 'application/pdf' }), 'apuntes.pdf');
      setStatus(status, `Listo: PDF generado con ${queue.length} página(s).`, 'good');
    } catch (err) {
      console.error(err);
      setStatus(status, 'No se pudo generar el PDF: ' + err.message, 'bad');
    } finally {
      generateBtn.disabled = false;
    }
  });

  renderQueue();
}

/** Convierte cualquier imagen soportada por el navegador a bytes JPEG usando <canvas>. */
async function toJpegBytes(file) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0);
  const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.92));
  return new Uint8Array(await blob.arrayBuffer());
}
