import { downloadBlob, setStatus } from '../shared.js';

const WORKER_KEY = 'campus-toolkit:youtube-transcript-worker-url';
const LANGS = [
  ['es', 'Español'], ['en', 'Inglés'], ['pt', 'Portugués'],
  ['fr', 'Francés'], ['de', 'Alemán']
];

function clean(value) {
  return String(value || '').trim();
}

export function mountYoutubeTranscript(container) {
  container.innerHTML = `
    <p class="module-title">Transcriptor de videos de YouTube</p>
    <p class="module-sub">Pega un enlace para recuperar los subtítulos disponibles y convertirlos en texto, como material de estudio.</p>
    <div class="card">
      <label class="field-label" for="youtube-url">Enlace del video</label>
      <input id="youtube-url" class="field" type="url" placeholder="https://www.youtube.com/watch?v=..." />
      <div class="grid sm:grid-cols-2 gap-4 mt-4">
        <div>
          <label class="field-label" for="youtube-lang">Idioma de subtítulos</label>
          <select id="youtube-lang" class="field">${LANGS.map(([code, label]) => `<option value="${code}">${label}</option>`).join('')}</select>
        </div>
        <div>
          <label class="field-label" for="youtube-worker">URL del Worker</label>
          <input id="youtube-worker" class="field" type="url" placeholder="https://tu-worker.workers.dev" />
        </div>
      </div>
      <p class="field-help mt-2">La PWA no puede leer los subtítulos directamente por las restricciones CORS de YouTube. Usa la ruta del Worker incluido en el proyecto.</p>
      <button id="youtube-transcribe" class="btn-primary mt-5">Obtener transcripción</button>
    </div>
    <div class="card mt-5">
      <p class="field-label mb-0">Transcripción</p>
      <p id="youtube-title" class="text-sm text-graphite mt-2"></p>
      <p id="youtube-output" class="text-sm leading-relaxed whitespace-pre-wrap min-h-[8rem] mt-3"></p>
      <button id="youtube-download" class="btn-secondary mt-3" disabled>Descargar .txt</button>
      <p id="youtube-status"></p>
    </div>
  `;

  const urlInput = container.querySelector('#youtube-url');
  const workerInput = container.querySelector('#youtube-worker');
  const language = container.querySelector('#youtube-lang');
  const transcribeButton = container.querySelector('#youtube-transcribe');
  const output = container.querySelector('#youtube-output');
  const title = container.querySelector('#youtube-title');
  const downloadButton = container.querySelector('#youtube-download');
  const status = container.querySelector('#youtube-status');

  workerInput.value = localStorage.getItem(WORKER_KEY) || '';
  workerInput.addEventListener('change', () => localStorage.setItem(WORKER_KEY, workerInput.value.trim()));

  transcribeButton.addEventListener('click', async () => {
    const videoUrl = clean(urlInput.value);
    const workerUrl = clean(workerInput.value).replace(/\/$/, '').replace(/\/youtube-transcript$/, '');
    if (!videoUrl || !workerUrl) {
      setStatus(status, 'Completa el enlace de YouTube y la URL del Worker.', 'bad');
      return;
    }

    transcribeButton.disabled = true;
    setStatus(status, 'Buscando subtítulos disponibles…', 'good');
    output.textContent = '';
    title.textContent = '';
    try {
      const response = await fetch(`${workerUrl}/youtube-transcript`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: videoUrl, lang: language.value })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `El servicio respondió ${response.status}`);
      title.textContent = data.title ? `Video: ${data.title}` : '';
      output.textContent = data.transcript || '(El video no tiene subtítulos disponibles en ese idioma.)';
      downloadButton.disabled = !data.transcript;
      downloadButton.dataset.text = data.transcript || '';
      setStatus(status, 'Transcripción lista.', 'good');
    } catch (error) {
      output.textContent = '';
      downloadButton.disabled = true;
      setStatus(status, `No se pudo obtener la transcripción: ${error.message}`, 'bad');
    } finally {
      transcribeButton.disabled = false;
    }
  });

  downloadButton.addEventListener('click', () => {
    const text = downloadButton.dataset.text || '';
    if (text) downloadBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), 'transcripcion-youtube.txt');
  });
}
