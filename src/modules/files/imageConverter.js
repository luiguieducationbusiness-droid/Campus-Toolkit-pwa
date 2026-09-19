import { createDropZone, downloadBlob, setStatus } from '../shared.js';

const FORMATS = [
  { value: 'image/png', label: 'PNG', ext: 'png' },
  { value: 'image/jpeg', label: 'JPG', ext: 'jpg' },
  { value: 'image/webp', label: 'WebP', ext: 'webp' }
];

export function mountImageConverter(container) {
  container.innerHTML = `
    <p class="module-title">Convertir imágenes</p>
    <p class="module-sub">Cambia el formato de tus imágenes (PNG, JPG, WebP) directamente en el navegador, sin subirlas a ningún servidor.</p>

    <label class="field-label" for="format">Formato de salida</label>
    <select id="format" class="field mb-4" style="max-width:220px">
      ${FORMATS.map(f => `<option value="${f.value}" data-ext="${f.ext}">${f.label}</option>`).join('')}
    </select>

    <div id="dz-slot"></div>
    <ul id="results" class="mt-4 space-y-2"></ul>
    <p id="status"></p>
  `;

  const dzSlot = container.querySelector('#dz-slot');
  const results = container.querySelector('#results');
  const status = container.querySelector('#status');
  const formatSelect = container.querySelector('#format');

  const dz = createDropZone({
    accept: 'image/*',
    multiple: true,
    hint: 'imágenes',
    onFiles: async files => {
      setStatus(status, 'Convirtiendo…');
      const opt = formatSelect.selectedOptions[0];
      let ok = 0;
      for (const file of files) {
        if (!file.type.startsWith('image/')) continue;
        try {
          const blob = await convert(file, opt.value);
          const name = file.name.replace(/\.[^.]+$/, '') + '.' + opt.dataset.ext;
          addResult(name, blob);
          ok++;
        } catch (err) {
          console.error(err);
        }
      }
      setStatus(status, `Listo: ${ok} de ${files.length} imagen(es) convertida(s).`, ok ? 'good' : 'bad');
    }
  });
  dzSlot.appendChild(dz);

  function addResult(name, blob) {
    const li = document.createElement('li');
    li.className = 'flex items-center justify-between text-sm border border-line rounded px-3 py-2 bg-white';
    li.innerHTML = `<span class="truncate">${name}</span>`;
    const btn = document.createElement('button');
    btn.className = 'btn-secondary text-xs py-1 px-3';
    btn.textContent = 'Descargar';
    btn.addEventListener('click', () => downloadBlob(blob, name));
    li.appendChild(btn);
    results.prepend(li);
  }

  async function convert(file, mime) {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    // Fondo blanco para formatos sin transparencia (ej. JPG)
    if (mime === 'image/jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(bitmap, 0, 0);
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Conversión no soportada por este navegador')), mime, 0.92);
    });
  }
}
