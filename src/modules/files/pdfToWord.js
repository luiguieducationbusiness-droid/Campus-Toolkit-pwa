import { createDropZone, downloadBlob, setStatus } from '../shared.js';

const STORAGE_KEY = 'campus-toolkit:proxy-url';

export function mountPdfToWord(container) {
  container.innerHTML = `
    <p class="module-title">PDF a Word</p>
    <p class="module-sub">
      Este módulo necesita un servicio externo (ej. CloudConvert) porque el navegador no puede
      convertir PDF a .docx por sí solo. Para no exponer tu API key, la petición pasa por un
      <strong>proxy propio</strong> (Cloudflare Worker) — plantilla lista en
      <code class="text-xs">/cloudflare-worker</code>.
    </p>

    <div class="card mb-5">
      <label class="field-label" for="proxy-url">URL de tu proxy (Cloudflare Worker)</label>
      <input id="proxy-url" type="url" class="field" placeholder="https://tu-worker.tu-cuenta.workers.dev/pdf-to-word" />
      <p class="text-xs text-graphite mt-1.5">Se guarda solo en este navegador (localStorage). Nunca coloques aquí una API key directamente.</p>
    </div>

    <div id="dz-slot"></div>
    <p id="status"></p>
  `;

  const proxyInput = container.querySelector('#proxy-url');
  proxyInput.value = localStorage.getItem(STORAGE_KEY) || '';
  proxyInput.addEventListener('change', () => localStorage.setItem(STORAGE_KEY, proxyInput.value.trim()));

  const status = container.querySelector('#status');
  const dzSlot = container.querySelector('#dz-slot');

  const dz = createDropZone({
    accept: 'application/pdf',
    multiple: false,
    hint: 'un PDF',
    onFiles: async ([file]) => {
      const proxyUrl = proxyInput.value.trim();
      if (!proxyUrl) {
        setStatus(status, 'Primero configura la URL de tu proxy arriba.', 'bad');
        return;
      }
      setStatus(status, 'Enviando a conversión… esto puede tardar unos segundos.');
      try {
        const form = new FormData();
        form.append('file', file, file.name);
        const res = await fetch(proxyUrl, { method: 'POST', body: form });
        if (!res.ok) throw new Error(`El servicio respondió ${res.status}`);
        const blob = await res.blob();
        downloadBlob(blob, file.name.replace(/\.pdf$/i, '.docx'));
        setStatus(status, 'Listo: documento convertido.', 'good');
      } catch (err) {
        console.error(err);
        setStatus(status, 'No se pudo convertir: ' + err.message + '. Revisa que tu Worker esté desplegado y la URL sea correcta.', 'bad');
      }
    }
  });
  dzSlot.appendChild(dz);
}
