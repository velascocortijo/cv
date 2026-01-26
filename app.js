// App State
let currentUser = null;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let currentTaskYear = new Date().getFullYear();
let currentDocYear = new Date().getFullYear();
let currentExpYear = new Date().getFullYear();

let auditLog = [{ date: new Date().toLocaleString(), user: 'Sistema', action: 'Sesión iniciada' }];
let cachedExpenses = [];
let cachedTasks = [];
let bookings = [
    { id: 1, start: '2026-01-15', end: '2026-01-18', user: 'Juan', title: 'Fin de semana' },
    { id: 2, start: '2026-01-24', end: '2026-01-26', user: 'Admin', title: 'Mantenimiento' }
];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initYearSelectors();
    if (typeof lucide !== 'undefined') lucide.createIcons();
    setTimeout(() => { document.getElementById('loader').style.display = 'none'; }, 1000);
    if (localStorage.getItem('user')) {
        currentUser = JSON.parse(localStorage.getItem('user'));
        showAuthenticatedUI();
    }
    document.getElementById('expense-search')?.addEventListener('input', (e) => filterExpenses(e.target.value));
});

function initYearSelectors() {
    const years = [2026, 2027, 2028, 2029, 2030];
    const selectors = ['exp-year-selector', 'task-year-selector', 'doc-year-selector'];
    selectors.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.innerHTML = years.map(y => `<option value="${y}" ${y === currentYear ? 'selected' : ''}>Año ${y}</option>`).join('');
    });
}

// Utils
function formatDateDisplay(dateStr) {
    if (!dateStr || dateStr === "undefined") return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    return `${d}-${m}-${y}`;
}

function addAudit(action) {
    auditLog.unshift({ date: new Date().toLocaleString(), user: currentUser?.name || 'Sistema', action });
    renderAuditLog();
}

function renderAuditLog() {
    const list = document.getElementById('audit-list');
    if (list) list.innerHTML = auditLog.map(l => `<li><span class="audit-date">[${l.date.split(' ')[1]}]</span> <span class="audit-user">${l.user}</span>: ${l.action}</li>`).join('');
}

// Section Management
function showSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
    document.getElementById(sectionId + '-section')?.classList.remove('hidden');
    document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
    document.querySelector(`nav button[onclick*="${sectionId}"]`)?.classList.add('active');

    if (sectionId === 'expenses') renderExpenses();
    if (sectionId === 'calendar') renderCalendar();
    if (sectionId === 'tasks') renderTasks();
    if (sectionId === 'documents') renderDocuments();
    if (sectionId === 'profile') renderProfile();
}

// --- CALENDAR ---
function changeMonth(delta) {
    currentMonth += delta;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    renderCalendar();
}

function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    document.getElementById('current-month-display').textContent = `${monthNames[currentMonth]} ${currentYear}`;
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    let firstDay = new Date(currentYear, currentMonth, 1).getDay();
    firstDay = (firstDay === 0) ? 6 : firstDay - 1;
    let html = '<div class="days-grid">';
    ['L', 'M', 'X', 'J', 'V', 'S', 'D'].forEach(d => html += `<div class="day-header">${d}</div>`);
    for (let i = 0; i < firstDay; i++) html += `<div class="day-cell empty"></div>`;
    for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const booking = bookings.find(b => dateStr >= b.start && dateStr <= b.end);
        let rangeClass = booking ? 'booked' : '';
        html += `<div class="day-cell ${rangeClass}" onclick="handleDateClick('${dateStr}', ${booking ? booking.id : 'null'})">${i}${booking ? `<div class="calendar-event-text">${booking.title}</div>` : ''}</div>`;
    }
    grid.innerHTML = html + '</div>';
}

function handleDateClick(date, id) { if (!currentUser) return; if (id) openEditBookingModal(id); else openBookingModal(date); }

function openBookingModal(date) {
    openModal('Nueva Reserva', `<form id="booking-form"><div class="form-group"><label>Entrada</label><input type="date" id="book-start" value="${date}" required></div><div class="form-group"><label>Salida</label><input type="date" id="book-end" value="${date}" required></div><div class="form-group"><label>Reserva</label><input type="text" id="book-title" required></div><button type="submit" class="btn-primary" style="width:100%">Confirmar</button></form>`);
    document.getElementById('booking-form').onsubmit = (e) => {
        e.preventDefault();
        const start = document.getElementById('book-start').value, end = document.getElementById('book-end').value, title = document.getElementById('book-title').value;
        bookings.push({ id: Date.now(), start, end, title, user: currentUser.name });
        addAudit(`Reserva: ${title}`);
        renderCalendar(); closeModal();
    };
}

function openEditBookingModal(id) {
    const b = bookings.find(x => x.id === id);
    openModal('Editar Reserva', `<form id="eb-form"><div class="form-group"><label>Entrada</label><input type="date" id="ebs" value="${b.start}"></div><div class="form-group"><label>Salida</label><input type="date" id="ebe" value="${b.end}"></div><div class="form-group"><label>Reserva</label><input type="text" id="ebt" value="${b.title}"></div><div style="display:flex;gap:10px;"><button type="submit" class="btn-primary" style="flex:1">Guardar</button><button type="button" onclick="deleteBooking(${id})" class="btn-danger" style="flex:1">Eliminar</button></div></form>`);
    document.getElementById('eb-form').onsubmit = (e) => {
        e.preventDefault();
        b.start = document.getElementById('ebs').value; b.end = document.getElementById('ebe').value; b.title = document.getElementById('ebt').value;
        renderCalendar(); closeModal();
    };
}

function deleteBooking(id) { if (confirm("¿Borrar reserva?")) { bookings = bookings.filter(b => b.id !== id); renderCalendar(); closeModal(); } }

// --- EXPENSES ---
function changeExpYear(year) { currentExpYear = year; document.getElementById('exp-year-display').textContent = year; renderExpenses(); }

async function renderExpenses() {
    const list = document.getElementById('expenses-body');
    if (!list) return;
    list.innerHTML = '<tr><td colspan="5">Cargando...</td></tr>';
    try {
        cachedExpenses = await CortijoAPI.getExpenses(currentExpYear);
        filterExpenses(document.getElementById('expense-search')?.value || '');
    } catch (e) { list.innerHTML = '<tr><td colspan="5" style="color:red">Error al cargar datos</td></tr>'; }
}

function filterExpenses(query) {
    const list = document.getElementById('expenses-body');
    const filtered = cachedExpenses.filter(e => String(e.concepto).toLowerCase().includes(query.toLowerCase()));
    let total = 0;
    list.innerHTML = filtered.map(e => {
        total += parseFloat(e.cantidad);
        return `<tr><td>${formatDateDisplay(e.fecha)}</td><td>${e.concepto} ${e.url_drive ? `<a href="${e.url_drive}" target="_blank">📎</a>` : ''}</td><td>${e.user_id}</td><td class="amount">${parseFloat(e.cantidad).toFixed(2)}€</td><td><button class="btn-icon" onclick="confirmDeleteExpense('${e.id}')">🗑️</button></td></tr>`;
    }).join('');
    document.getElementById('total-balance').textContent = `${total.toFixed(2)} €`;
}

function openExpenseModal() {
    openModal('Añadir Gasto', `<form id="ex-form"><div class="form-group"><label>Concepto</label><input type="text" id="exc" required></div><div class="form-group"><label>Importe</label><input type="number" step="0.01" id="exa" required></div><div class="form-group"><label>Fecha</label><input type="date" id="exd" value="${new Date().toISOString().split('T')[0]}" required></div><div class="form-group"><label>Ticket</label><input type="file" id="exf"></div><button type="submit" id="exb" class="btn-primary" style="width:100%">Guardar</button></form>`);
    document.getElementById('ex-form').onsubmit = async (e) => {
        e.preventDefault();
        const btn = document.getElementById('exb'); btn.disabled = true; btn.textContent = 'Guardando...';
        const data = { id: Date.now(), user_id: currentUser.name, concepto: document.getElementById('exc').value, cantidad: document.getElementById('exa').value, fecha: document.getElementById('exd').value, year: currentExpYear };
        await CortijoAPI.createExpense(data, document.getElementById('exf').files[0], `Gastos-${currentExpYear}`);
        renderExpenses(); closeModal();
    };
}

async function confirmDeleteExpense(id) { if (confirm("¿Eliminar?")) { await CortijoAPI.deleteExpense(id); renderExpenses(); } }

// --- DOCUMENTS ---
function changeDocYear(year) { currentDocYear = year; document.getElementById('doc-year-display').textContent = year; renderDocuments(); }

async function renderDocuments() {
    const list = document.getElementById('document-list');
    list.innerHTML = '<p>Cargando...</p>';
    try {
        const docs = await CortijoAPI.getDocuments(currentDocYear);
        if (!docs.length) { list.innerHTML = '<p>No hay documentos para este año.</p>'; return; }
        list.innerHTML = docs.map(d => `<div class="document-item"><span class="doc-icon">${d.type === 'pdf' ? '📄' : '🖼️'}</span><h4>${d.name}</h4><p>${d.size} • ${formatDateDisplay(d.date)}</p><div style="display:flex;gap:5px;margin-top:10px;"><button class="btn-small" onclick="previewDocument('${d.url_drive}')">👁️ Ver</button><button class="btn-small" onclick="window.open('${d.url_drive}')">⬇️ Bajar</button></div></div>`).join('');
    } catch (e) { list.innerHTML = '<p>Sin documentos.</p>'; }
}

async function handleFileUpload(event) {
    const file = event.target.files[0]; if (!file) return;
    document.getElementById('loader').style.display = 'flex';
    try {
        const driveUrl = await CortijoAPI.uploadToDrive(file, currentDocYear);
        const data = { id: Date.now(), name: file.name, type: file.type.includes('pdf') ? 'pdf' : 'image', size: (file.size / 1024 / 1024).toFixed(1) + 'MB', date: new Date().toISOString(), year: currentDocYear, url_drive: driveUrl };
        await CortijoAPI.addDocument(data);
        renderDocuments();
    } catch (e) { alert(e.message); }
    document.getElementById('loader').style.display = 'none';
}

function previewDocument(url) {
    const match = url.match(/[-\w]{25,}/);
    if (!match) return;
    const id = match[0];
    openModal('Vista Previa', `<iframe src="https://drive.google.com/file/d/${id}/preview" style="width:100%;height:500px;border:none;"></iframe>`);
}

// --- TASKS ---
function changeTaskYear(year) { currentTaskYear = year; document.getElementById('task-year-display').textContent = year; renderTasks(); }

async function renderTasks() {
    const lists = { waiting: document.getElementById('list-waiting'), running: document.getElementById('list-running'), completed: document.getElementById('list-completed') };
    Object.values(lists).forEach(l => l.innerHTML = '...');
    try {
        cachedTasks = await CortijoAPI.getTasks(currentTaskYear);
        Object.values(lists).forEach(l => l.innerHTML = '');
        let counts = { waiting: 0, running: 0, completed: 0 };
        cachedTasks.forEach(task => {
            counts[task.status]++;
            const card = document.createElement('div');
            card.className = 'task-card'; card.dataset.id = task.id;
            card.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                    <span class="task-title" onclick="openEditTaskModal(${task.id})">${task.title}</span>
                    <span class="priority-badge ${task.priority}">${task.priority}</span>
                </div>
                <div class="task-meta">Por: ${task.user}</div>
            `;
            lists[task.status].appendChild(card);
        });
        Object.keys(counts).forEach(s => document.getElementById(`count-${s}`).textContent = counts[s]);
        initSortable();
        if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (e) { Object.values(lists).forEach(l => l.innerHTML = 'Error'); }
}

function initSortable() {
    ['list-waiting', 'list-running', 'list-completed'].forEach(id => {
        new Sortable(document.getElementById(id), {
            group: 'tasks', animation: 150, onEnd: async (evt) => {
                const taskId = evt.item.dataset.id;
                const newStatus = evt.to.id.replace('list-', '');
                await CortijoAPI.updateTask(taskId, { status: newStatus });
                renderTasks();
            }
        });
    });
}

function openTaskModal() {
    openModal('Nueva Tarea', `
        <form id="t-form">
            <div class="form-group"><label>Tarea</label><input type="text" id="tn" required placeholder="¿Qué hay que hacer?"></div>
            <div class="form-group"><label>Prioridad</label>
                <select id="tp">
                    <option value="low">Baja</option>
                    <option value="medium" selected>Media</option>
                    <option value="high">Alta</option>
                </select>
            </div>
            <button type="submit" class="btn-primary" style="width:100%">Crear Tarea</button>
        </form>
    `);
    document.getElementById('t-form').onsubmit = async (e) => {
        e.preventDefault();
        await CortijoAPI.addTask({ id: Date.now(), title: document.getElementById('tn').value, status: 'waiting', user: currentUser.name, priority: document.getElementById('tp').value, year: currentTaskYear });
        renderTasks(); closeModal();
    };
}

function openEditTaskModal(id) {
    const task = cachedTasks.find(t => t.id == id);
    openModal('Editar Tarea', `
        <form id="et-form">
            <div class="form-group"><label>Título</label><input type="text" id="etn" value="${task.title}" required></div>
            <div class="form-group"><label>Prioridad</label>
                <select id="etp">
                    <option value="low" ${task.priority === 'low' ? 'selected' : ''}>Baja</option>
                    <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>Media</option>
                    <option value="high" ${task.priority === 'high' ? 'selected' : ''}>Alta</option>
                </select>
            </div>
            <div style="display:flex;gap:10px;margin-top:1rem;">
                <button type="submit" class="btn-primary" style="flex:1">Guardar</button>
                <button type="button" onclick="confirmDeleteTask(${id})" class="btn-danger" style="flex:1">Eliminar</button>
            </div>
        </form>
    `);
    document.getElementById('et-form').onsubmit = async (e) => {
        e.preventDefault();
        await CortijoAPI.updateTask(id, { title: document.getElementById('etn').value, priority: document.getElementById('etp').value });
        renderTasks(); closeModal();
    };
}

async function confirmDeleteTask(id) {
    if (confirm("¿Seguro que quieres borrar esta tarea?")) {
        await CortijoAPI.deleteTask(id);
        renderTasks(); closeModal();
    }
}

// --- AUTH ---
function handleCredentialResponse(r) {
    const p = JSON.parse(atob(r.credential.split('.')[1]));
    currentUser = { name: p.name, avatar: p.picture, email: p.email };
    localStorage.setItem('user', JSON.stringify(currentUser));
    showAuthenticatedUI();
}
function showAuthenticatedUI() {
    ['login-section', 'auth-container'].forEach(id => document.getElementById(id).classList.add('hidden'));
    ['main-nav', 'user-info'].forEach(id => document.getElementById(id).classList.remove('hidden'));
    document.getElementById('user-name').textContent = currentUser.name;
    document.getElementById('user-avatar').src = currentUser.avatar;
    showSection('calendar');
}
function signOut() { localStorage.removeItem('user'); location.reload(); }
function openModal(t, c) { document.getElementById('modal-title').textContent = t; document.getElementById('modal-content').innerHTML = c; document.getElementById('modal-container').classList.remove('hidden'); }
function closeModal() { document.getElementById('modal-container').classList.add('hidden'); }
function renderProfile() {
    document.getElementById('profile-name').textContent = currentUser.name;
    document.getElementById('profile-email').textContent = currentUser.email;
    document.getElementById('profile-avatar').src = currentUser.avatar;
}
