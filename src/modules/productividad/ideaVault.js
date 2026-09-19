const STORAGE_KEY = 'campus-toolkit:ideas';

export function mountIdeaVault(container) {
  let ideas = load();

  container.innerHTML = `
    <p class="module-title">Bóveda de ideas</p>
    <p class="module-sub">Guarda notas, enlaces o ideas sueltas para tus proyectos de branding y marketing. Se queda en este dispositivo.</p>

    <form id="new-idea" class="card mb-6">
      <label class="field-label" for="idea-text">Nueva idea</label>
      <textarea id="idea-text" class="field" rows="3" placeholder="Ej: link de referencia, concepto de campaña, idea de naming..." required></textarea>
      <button class="btn-primary mt-3" type="submit">Guardar idea</button>
    </form>

    <ul id="list" class="space-y-3"></ul>
  `;

  const list = container.querySelector('#list');
  const form = container.querySelector('#new-idea');
  const textarea = container.querySelector('#idea-text');

  form.addEventListener('submit', e => {
    e.preventDefault();
    const text = textarea.value.trim();
    if (!text) return;
    ideas.unshift({ id: crypto.randomUUID(), text, date: new Date().toLocaleDateString('es-PE') });
    textarea.value = '';
    save(ideas);
    render();
  });

  function render() {
    list.innerHTML = '';
    if (!ideas.length) {
      list.innerHTML = '<li class="text-sm text-graphite">Todavía no guardas ninguna idea.</li>';
      return;
    }
    ideas.forEach(idea => {
      const li = document.createElement('li');
      li.className = 'card';
      li.innerHTML = `
        <div class="flex items-start justify-between gap-3">
          <p class="text-sm whitespace-pre-wrap">${escapeHtml(idea.text)}</p>
          <button data-del="${idea.id}" class="text-bad text-xs shrink-0">Eliminar</button>
        </div>
        <p class="text-xs text-graphite mt-2">${idea.date}</p>
      `;
      list.appendChild(li);
    });
    list.querySelectorAll('button[data-del]').forEach(btn => {
      btn.addEventListener('click', () => {
        ideas = ideas.filter(i => i.id !== btn.dataset.del);
        save(ideas);
        render();
      });
    });
  }

  render();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}
function save(ideas) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ideas));
}
