import { setStatus } from '../shared.js';

const SOURCE_TYPES = [
  { value: 'libro', label: 'Libro' },
  { value: 'articulo', label: 'Artículo de revista' },
  { value: 'web', label: 'Página web' }
];

export function mountApaGenerator(container) {
  const history = [];

  container.innerHTML = `
    <p class="module-title">Generador de referencias APA / Harvard</p>
    <p class="module-sub">Completa los datos de la fuente y arma la referencia lista para copiar. Todo el cálculo ocurre en este dispositivo.</p>

    <div class="card">
      <div class="grid sm:grid-cols-2 gap-4">
        <div>
          <label class="field-label" for="style">Estilo</label>
          <select id="style" class="field">
            <option value="apa">APA (7.ª edición)</option>
            <option value="harvard">Harvard</option>
          </select>
        </div>
        <div>
          <label class="field-label" for="type">Tipo de fuente</label>
          <select id="type" class="field">${SOURCE_TYPES.map(t => `<option value="${t.value}">${t.label}</option>`).join('')}</select>
        </div>
      </div>

      <div class="mt-4">
        <label class="field-label" for="authors">Autor(es) — formato: Apellido, N.; Apellido, N.</label>
        <input id="authors" class="field" placeholder="Vallejo, C.; Ramírez, J." />
      </div>

      <div class="grid sm:grid-cols-3 gap-4 mt-4">
        <div>
          <label class="field-label" for="year">Año</label>
          <input id="year" class="field" placeholder="2026" />
        </div>
        <div class="sm:col-span-2">
          <label class="field-label" for="title">Título</label>
          <input id="title" class="field" placeholder="Título de la obra o artículo" />
        </div>
      </div>

      <div id="extra-fields" class="grid sm:grid-cols-2 gap-4 mt-4"></div>

      <button id="generate" class="btn-primary mt-5">Generar referencia</button>
    </div>

    <div class="card mt-5">
      <p class="field-label mb-0">Referencia generada</p>
      <p id="output" class="text-sm mt-2 min-h-[1.5em]"></p>
      <button id="copy" class="btn-secondary mt-3" disabled>Copiar al portapapeles</button>
      <p id="status"></p>
    </div>

    <div class="mt-5">
      <p class="field-label">Historial de esta sesión</p>
      <ul id="history" class="space-y-2 text-sm"></ul>
    </div>
  `;

  const styleSel = container.querySelector('#style');
  const typeSel = container.querySelector('#type');
  const extraFields = container.querySelector('#extra-fields');
  const output = container.querySelector('#output');
  const copyBtn = container.querySelector('#copy');
  const status = container.querySelector('#status');
  const historyEl = container.querySelector('#history');

  function renderExtraFields() {
    const t = typeSel.value;
    const fields = {
      libro: [{ id: 'publisher', label: 'Editorial', placeholder: 'Editorial UCV' }],
      articulo: [
        { id: 'journal', label: 'Revista', placeholder: 'Nombre de la revista' },
        { id: 'volume', label: 'Volumen (número)', placeholder: '12(3)' },
        { id: 'pages', label: 'Páginas', placeholder: '45-60' }
      ],
      web: [
        { id: 'site', label: 'Nombre del sitio', placeholder: 'Nombre del sitio web' },
        { id: 'url', label: 'URL', placeholder: 'https://...' }
      ]
    }[t] || [];
    extraFields.innerHTML = fields.map(f => `
      <div>
        <label class="field-label" for="f-${f.id}">${f.label}</label>
        <input id="f-${f.id}" class="field" placeholder="${f.placeholder}" />
      </div>
    `).join('');
  }
  typeSel.addEventListener('change', renderExtraFields);
  renderExtraFields();

  function val(id) { return (container.querySelector('#' + id)?.value || '').trim(); }

  function buildReference() {
    const style = styleSel.value;
    const type = typeSel.value;
    const authors = val('authors');
    const year = val('year');
    const title = val('title');

    if (!authors || !year || !title) return null;

    const yearPart = style === 'apa' ? `(${year}).` : `${year}.`;
    let rest = '';
    if (type === 'libro') {
      const publisher = val('f-publisher');
      rest = `${title}. ${publisher}.`;
    } else if (type === 'articulo') {
      const journal = val('f-journal');
      const volume = val('f-volume');
      const pages = val('f-pages');
      rest = `${title}. ${journal}${volume ? ', ' + volume : ''}${pages ? ', ' + pages : ''}.`;
    } else {
      const site = val('f-site');
      const url = val('f-url');
      rest = style === 'apa'
        ? `${title}. ${site}. ${url}`
        : `${title} [en línea]. ${site}. Disponible en: ${url}`;
    }

    return `${authors} ${yearPart} ${rest}`.replace(/\s+/g, ' ').trim();
  }

  container.querySelector('#generate').addEventListener('click', () => {
    const ref = buildReference();
    if (!ref) { setStatus(status, 'Completa al menos autor, año y título.', 'bad'); return; }
    output.textContent = ref;
    copyBtn.disabled = false;
    setStatus(status, '');
    history.unshift(ref);
    renderHistory();
  });

  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(output.textContent);
      setStatus(status, 'Copiado al portapapeles.', 'good');
    } catch {
      setStatus(status, 'No se pudo copiar automáticamente; selecciona el texto manualmente.', 'bad');
    }
  });

  function renderHistory() {
    historyEl.innerHTML = history.map(ref => `<li class="card py-2">${ref}</li>`).join('');
  }
}
