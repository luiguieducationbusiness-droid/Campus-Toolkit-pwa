import { PDFDocument } from 'pdf-lib';
import { createDropZone, downloadBlob, setStatus } from '../shared.js';

export function mountMergePdf(container) {
  let queue = [];

  container.innerHTML = `
    <p class="module-title">Unir PDFs</p>
    <p class="module-sub">Combina varios PDF (por ejemplo, separatas de distintos cursos) en un solo archivo, en el orden de la lista.</p>
    <div id="dz-slot"></div>
    <ul id="queue-list" class="mt-4 space-y-2"></ul>
    <div class="flex items-center gap-3 mt-5">
      <button id="generate" class="btn-primary" disabled>Unir PDFs</button>
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
    accept: 'application/pdf',
    multiple: true,
    hint: 'archivos PDF',
    onFiles: files => {
      files.filter(f => f.type === 'application/pdf').forEach(f => queue.push(f));
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
        <span class="flex gap-2">
          <button data-up="${i}" class="text-xs text-graphite hover:text-ink" ${i === 0 ? 'disabled style="opacity:.3"' : ''}>↑</button>
          <button data-down="${i}" class="text-xs text-graphite hover:text-ink" ${i === queue.length - 1 ? 'disabled style="opacity:.3"' : ''}>↓</button>
          <button data-remove="${i}" class="text-xs text-bad hover:underline">Quitar</button>
        </span>
      `;
      queueList.appendChild(li);
    });
    generateBtn.disabled = queue.length < 2;

    queueList.querySelectorAll('button[data-remove]').forEach(btn =>
      btn.addEventListener('click', () => { queue.splice(Number(btn.dataset.remove), 1); renderQueue(); })
    );
    queueList.querySelectorAll('button[data-up]').forEach(btn =>
      btn.addEventListener('click', () => {
        const i = Number(btn.dataset.up);
        if (i > 0) [queue[i - 1], queue[i]] = [queue[i], queue[i - 1]];
        renderQueue();
      })
    );
    queueList.querySelectorAll('button[data-down]').forEach(btn =>
      btn.addEventListener('click', () => {
        const i = Number(btn.dataset.down);
        if (i < queue.length - 1) [queue[i + 1], queue[i]] = [queue[i], queue[i + 1]];
        renderQueue();
      })
    );
  }

  clearBtn.addEventListener('click', () => { queue = []; renderQueue(); setStatus(status, ''); });

  generateBtn.addEventListener('click', async () => {
    if (queue.length < 2) return;
    generateBtn.disabled = true;
    setStatus(status, 'Uniendo PDFs…');
    try {
      const merged = await PDFDocument.create();
      for (const file of queue) {
        const bytes = await file.arrayBuffer();
        const src = await PDFDocument.load(bytes);
        const pages = await merged.copyPages(src, src.getPageIndices());
        pages.forEach(p => merged.addPage(p));
      }
      const bytes = await merged.save();
      downloadBlob(new Blob([bytes], { type: 'application/pdf' }), 'documento-unido.pdf');
      setStatus(status, `Listo: se unieron ${queue.length} archivos.`, 'good');
    } catch (err) {
      console.error(err);
      setStatus(status, 'No se pudo unir los PDF: ' + err.message, 'bad');
    } finally {
      generateBtn.disabled = false;
    }
  });

  renderQueue();
}
