const STORAGE_KEY = 'campus-toolkit:kanban';
const COLUMNS = [
  { id: 'pendiente', label: 'Pendiente' },
  { id: 'en-progreso', label: 'En progreso' },
  { id: 'entregado', label: 'Entregado' }
];

export function mountKanban(container) {
  let cards = load();

  container.innerHTML = `
    <p class="module-title">Tablero Kanban</p>
    <p class="module-sub">Organiza tus entregas por curso. Se guarda automáticamente en este dispositivo (sin conexión ni servidor).</p>

    <form id="new-card" class="card flex flex-col sm:flex-row gap-3 mb-6">
      <input id="new-title" class="field flex-1" placeholder="Ej: Ensayo — Legislación Aplicada al Marketing" required />
      <button class="btn-primary shrink-0" type="submit">Agregar tarjeta</button>
    </form>

    <div class="grid sm:grid-cols-3 gap-4" id="board"></div>
  `;

  const board = container.querySelector('#board');
  const form = container.querySelector('#new-card');
  const newTitle = container.querySelector('#new-title');

  form.addEventListener('submit', e => {
    e.preventDefault();
    const title = newTitle.value.trim();
    if (!title) return;
    cards.push({ id: crypto.randomUUID(), title, status: 'pendiente' });
    newTitle.value = '';
    save(cards);
    render();
  });

  function render() {
    board.innerHTML = '';
    COLUMNS.forEach(col => {
      const colEl = document.createElement('div');
      colEl.className = 'bg-white border border-line rounded p-3 min-h-[200px]';
      colEl.dataset.col = col.id;
      colEl.innerHTML = `<p class="text-sm font-medium mb-3">${col.label} <span class="text-graphite font-normal">(${cards.filter(c => c.status === col.id).length})</span></p>`;

      cards.filter(c => c.status === col.id).forEach(c => {
        const cardEl = document.createElement('div');
        cardEl.className = 'card py-2 mb-2 cursor-grab';
        cardEl.draggable = true;
        cardEl.dataset.id = c.id;
        cardEl.innerHTML = `
          <div class="flex items-start justify-between gap-2">
            <p class="text-sm">${c.title}</p>
            <button data-del="${c.id}" class="text-bad text-xs shrink-0">✕</button>
          </div>
        `;
        cardEl.addEventListener('dragstart', e => {
          e.dataTransfer.setData('text/plain', c.id);
        });
        colEl.appendChild(cardEl);
      });

      colEl.addEventListener('dragover', e => e.preventDefault());
      colEl.addEventListener('drop', e => {
        e.preventDefault();
        const id = e.dataTransfer.getData('text/plain');
        const card = cards.find(c => c.id === id);
        if (card) { card.status = col.id; save(cards); render(); }
      });

      board.appendChild(colEl);
    });

    board.querySelectorAll('button[data-del]').forEach(btn => {
      btn.addEventListener('click', () => {
        cards = cards.filter(c => c.id !== btn.dataset.del);
        save(cards);
        render();
      });
    });
  }

  render();
}

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}
function save(cards) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}
