
/* ===============================
   Interactive To‑Do List (Vanilla JS)
   - CRUD: create, read, update, delete
   - Persist to localStorage
   - Filters, search, sort, categories, deadlines
   - Light/Dark theme with persistence
=================================== */
(() => {
  const STORAGE_KEY = 'todo.tasks.v1';
  const THEME_KEY = 'todo.theme.v1';

  /** @type {Array<{id:string,title:string,description:string,category:string,due:string|null,completed:boolean,created:number}>} */
  let tasks = [];

  // Elements
  const els = {
    form: document.getElementById('taskForm'),
    title: document.getElementById('title'),
    category: document.getElementById('category'),
    due: document.getElementById('due'),
    description: document.getElementById('description'),
    list: document.getElementById('taskList'),
    count: document.getElementById('count'),
    clearCompleted: document.getElementById('clearCompleted'),
    markAllDone: document.getElementById('markAllDone'),
    unmarkAll: document.getElementById('unmarkAll'),
    filterChips: Array.from(document.querySelectorAll('.chip')),
    search: document.getElementById('search'),
    categoryFilter: document.getElementById('categoryFilter'),
    sort: document.getElementById('sort'),
    themeToggle: document.getElementById('themeToggle'),
    exportBtn: document.getElementById('exportBtn'),
    importBtn: document.getElementById('importBtn'),
    importFile: document.getElementById('importFile'),
    editDialog: document.getElementById('editDialog'),
    editForm: document.getElementById('editForm'),
    editId: document.getElementById('editId'),
    editTitle: document.getElementById('editTitle'),
    editCategory: document.getElementById('editCategory'),
    editDue: document.getElementById('editDue'),
    editDescription: document.getElementById('editDescription'),
    saveEdit: document.getElementById('saveEdit')
  };

  // State
  let currentFilter = 'all';

  // Utilities
  const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
  const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  const load = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  const byId = id => tasks.find(t => t.id === id);
  const normalize = s => (s || '').toLowerCase();

  // Theme
  function applyTheme(theme) {
    const isLight = theme === 'light';
    document.documentElement.setAttribute('data-theme', isLight ? 'light' : 'dark');
    els.themeToggle.setAttribute('aria-pressed', String(isLight));
  }
  function loadTheme() {
    const saved = localStorage.getItem(THEME_KEY) || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    applyTheme(saved);
  }
  function toggleTheme() {
    const cur = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    const next = cur === 'light' ? 'dark' : 'light';
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  }

  // Rendering
  const template = document.getElementById('taskItemTemplate');
  function render() {
    const query = normalize(els.search.value);
    const cat = els.categoryFilter.value;
    const sort = els.sort.value;

    let filtered = tasks.filter(t => {
      if (currentFilter === 'active' && t.completed) return false;
      if (currentFilter === 'completed' && !t.completed) return false;
      if (cat && normalize(t.category) !== normalize(cat)) return false;
      if (query && !(normalize(t.title).includes(query) || normalize(t.description).includes(query))) return false;
      return true;
    });

    filtered.sort((a,b) => {
      switch (sort) {
        case 'created_asc': return a.created - b.created;
        case 'due_asc': return (a.due||'9999-12-31').localeCompare(b.due||'9999-12-31');
        case 'due_desc': return (b.due||'0000-01-01').localeCompare(a.due||'0000-01-01');
        case 'created_desc':
        default: return b.created - a.created;
      }
    });

    els.list.innerHTML = '';
    for (const t of filtered) {
      const node = template.content.firstElementChild.cloneNode(true);
      node.dataset.id = t.id;
      if (t.completed) node.classList.add('completed');

      const titleEl = node.querySelector('.title');
      titleEl.textContent = t.title;

      const descEl = node.querySelector('.desc');
      descEl.textContent = t.description || '';

      const badgesEl = node.querySelector('.badges');
      // Category badge
      if (t.category) {
        const b = document.createElement('span');
        b.className = 'badge category';
        b.textContent = t.category;
        badgesEl.appendChild(b);
      }
      // Due badge
      if (t.due) {
        const today = new Date().toISOString().slice(0,10);
        const dueBadge = document.createElement('span');
        const overdue = t.due < today && !t.completed;
        dueBadge.className = 'badge ' + (overdue ? 'overdue' : 'due');
        dueBadge.textContent = overdue ? `Overdue: ${t.due}` : `Due: ${t.due}`;
        badgesEl.appendChild(dueBadge);
      }

      node.querySelector('.toggle').checked = !!t.completed;
      els.list.appendChild(node);
    }

    const remaining = tasks.filter(t => !t.completed).length;
    els.count.textContent = `${tasks.length} task${tasks.length!==1?'s':''} • ${remaining} pending`;

    refreshCategoryFilter();
  }

  function refreshCategoryFilter() {
    const cats = Array.from(new Set(tasks.map(t => t.category).filter(Boolean))).sort();
    const current = els.categoryFilter.value;
    els.categoryFilter.innerHTML = '<option value="">All categories</option>' + cats.map(c => `<option value="${c}">${c}</option>`).join('');
    // try to keep the previous selection
    if ([...els.categoryFilter.options].some(o => o.value === current)) {
      els.categoryFilter.value = current;
    }
  }

  // CRUD
  function addTask(data) {
    const t = {
      id: uid(),
      title: data.title.trim(),
      description: (data.description||'').trim(),
      category: (data.category||'').trim(),
      due: data.due || null,
      completed: false,
      created: Date.now()
    };
    if (!t.title) return;
    tasks.unshift(t);
    save();
    render();
  }

  function updateTask(id, patch) {
    const t = byId(id);
    if (!t) return;
    Object.assign(t, patch);
    save();
    render();
  }

  function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    save();
    render();
  }

  // Event handlers
  els.form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(els.form).entries());
    addTask(data);
    els.form.reset();
    els.title.focus();
  });

  els.list.addEventListener('click', (e) => {
    const li = e.target.closest('.task');
    if (!li) return;
    const id = li.dataset.id;

    if (e.target.matches('.delete')) {
      if (confirm('Delete this task?')) deleteTask(id);
    }
    if (e.target.matches('.edit')) {
      const t = byId(id);
      if (!t) return;
      els.editId.value = t.id;
      els.editTitle.value = t.title;
      els.editCategory.value = t.category || '';
      els.editDue.value = t.due || '';
      els.editDescription.value = t.description || '';
      els.editDialog.showModal();
    }
  });

  els.list.addEventListener('change', (e) => {
    if (e.target.matches('.toggle')) {
      const li = e.target.closest('.task');
      const id = li.dataset.id;
      updateTask(id, { completed: e.target.checked });
    }
  });

  els.editForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = els.editId.value;
    const patch = {
      title: els.editTitle.value.trim(),
      category: els.editCategory.value.trim(),
      due: els.editDue.value || null,
      description: els.editDescription.value.trim()
    };
    if (!patch.title) return alert('Title is required');
    updateTask(id, patch);
    els.editDialog.close();
  });

  // Filters
  els.filterChips.forEach(chip => chip.addEventListener('click', () => {
    els.filterChips.forEach(c => { c.classList.remove('active'); c.setAttribute('aria-pressed','false'); });
    chip.classList.add('active');
    chip.setAttribute('aria-pressed','true');
    currentFilter = chip.dataset.filter;
    render();
  }));

  // Toolbar
  ['input','change','keyup'].forEach(ev => {
    els.search.addEventListener(ev, render);
  });
  els.categoryFilter.addEventListener('change', render);
  els.sort.addEventListener('change', render);

  els.clearCompleted.addEventListener('click', () => {
    if (tasks.some(t => t.completed) && confirm('Clear all completed tasks?')) {
      tasks = tasks.filter(t => !t.completed);
      save(); render();
    }
  });
  els.markAllDone.addEventListener('click', () => {
    tasks.forEach(t => t.completed = true); save(); render();
  });
  els.unmarkAll.addEventListener('click', () => {
    tasks.forEach(t => t.completed = false); save(); render();
  });

  // Import/Export
  els.exportBtn.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: 'tasks-backup.json' });
    a.click();
    URL.revokeObjectURL(url);
  });
  els.importBtn.addEventListener('click', () => els.importFile.click());
  els.importFile.addEventListener('change', async () => {
    const file = els.importFile.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data)) throw new Error('Invalid file');
      // Basic sanitization
      const cleaned = data.map(x => ({
        id: String(x.id || uid()),
        title: String(x.title || '').slice(0,200),
        description: String(x.description || ''),
        category: String(x.category || ''),
        due: x.due ? String(x.due).slice(0,10) : null,
        completed: !!x.completed,
        created: Number(x.created || Date.now())
      }));
      tasks = cleaned;
      save(); render();
      alert('Import successful');
    } catch (err) {
      alert('Import failed: ' + err.message);
    } finally {
      els.importFile.value = '';
    }
  });

  // Theme
  els.themeToggle.addEventListener('click', toggleTheme);

  // Init
  function init() {
    loadTheme();
    tasks = load();
    render();
    els.title.focus();
  }
  document.addEventListener('DOMContentLoaded', init);
})();

