// App State
let currentUser = null;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let currentTaskYear = 2026;
let currentDocYear = 2026;
let currentExpYear = 2026;

let auditLog = [{ date: '2026-01-24 10:00', user: 'Admin', action: 'Inició el sistema' }];
let cachedExpenses = [];
let bookings = [
    { id: 1, start: '2026-01-15', end: '2026-01-18', user: 'Juan', title: 'Fin de semana' },
    { id: 2, start: '2026-01-24', end: '2026-01-26', user: 'Admin', title: 'Mantenimiento' }
];
let tasks = [{ id: 1, title: 'Arreglar fuga en riego', status: 'running', user: 'Juan', priority: 'high', dueDate: '2026-01-20', year: 2026, history: [], subtasks: [] }];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (typeof lucide !== 'undefined') lucide.createIcons();
    setTimeout(() => { document.getElementById('loader').style.display = 'none'; }, 1000);
    if (localStorage.getItem('user')) {
        currentUser = JSON.parse(localStorage.getItem('user'));
        showAuthenticatedUI();
    }
    document.getElementById('expense-search')?.addEventListener('input', (e) => filterExpenses(e.target.value));
});

// Utils
function formatDateDisplay(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.includes('T') ? dateStr.split('T')[0].split('-') : dateStr.split('-');
    return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : dateStr;
}

function addAudit(action) {
    auditLog.unshift({ date: new Date().toLocaleString(), user: currentUser?.name || 'Sistema', action });
    renderAuditLog();
}

function renderAuditLog() {
    const list = document.getElementById('audit-list');
    if (list) list.innerHTML = auditLog.map(l => `<li><span class="audit-date">[${l.date}]</span> <span class="audit-user">${l.user}</span>: ${l.action}</li>`).join('');
}

// Section Management
function showSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
    document.getElementById(sectionId + '-section')?.classList.remove('hidden');
    document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
    document.querySelector(`nav button[onclick*="${sectionId}"]`)?.classList.add('active');
    if (sectionId === 'expenses') renderExpenses();
    if (sectionId === 'calendar') renderCalendar();
    if (sectionId === 'tasks') { renderTasks(); initSortable(); }
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
    firstDay = firstDay === 0 ? 6 : firstDay - 1;
    let html = '<div class="days-grid">';
    ['L', 'M', 'X', 'J', 'V', 'S', 'D'].forEach(d => html += `<div class="day-header" style="font-weight:700; color:var(--accent); text-align:center;">${d}</div>`);
    for (let i = 0; i < firstDay; i++) html += `<div class="day-cell empty"></div>`;
    for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const booking = bookings.find(b => dateStr >= b.start && dateStr <= b.end);
        let rangeClass = booking ? 'booked' : '';
        html += `<div class="day-cell ${rangeClass}" onclick="handleDateClick('${dateStr}', ${booking ? booking.id : 'null'})">${i}${booking ? `<div class="calendar-event-text">${booking.title}</div>` : ''}</div>`;
    }
    grid.innerHTML = html + '</div>';
    renderAuditLog();
}

function handleDateClick(date, id) { if (!currentUser) return; if (id) openEditBookingModal(id); else openBookingModal(date); }

function openBookingModal(date) {
    openModal('Nueva Reserva', `<form id="booking-form"><div class="form-group"><label>Entrada</label><input type="date" id="book-start" value="${date}" required></div><div class="form-group"><label>Salida</label><input type="date" id="book-end" value="${date}" required></div><div class="form-group"><label>Reserva</label><input type="text" id="book-title" required></div><button type="submit" class="btn-primary" style="width:100%">Confirmar</button></form>`);
    document.getElementById('booking-form').onsubmit = (e) => {
        e.preventDefault();
        const start = document.getElementById('book-start').value, end = document.getElementById('book-end').value, title = document.getElementById('book-title').value;
        if (bookings.some(b => start <= b.end && end >= b.start)) return alert("Ocupado");
        bookings.push({ id: Date.now(), start, end, title, user: currentUser.name });
        addAudit(`Añadió reserva: ${title}`);
        renderCalendar(); closeModal();
    };
}

function openEditBookingModal(id) {
    const b = bookings.find(x => x.id === id);
    openModal('Editar Reserva', `<form id="edit-booking-form"><div class="form-group"><label>Entrada</label><input type="date" id="eb-start" value="${b.start}"></div><div class="form-group"><label>Salida</label><input type="date" id="eb-end" value="${b.end}"></div><div class="form-group"><label>Reserva</label><input type="text" id="eb-title" value="${b.title}"></div><div style="display:flex;gap:10px;"><button type="submit" class="btn-primary" style="flex:1">Guardar</button><button type="button" onclick="deleteBooking(${id})" class="btn-danger" style="flex:1">Eliminar</button></div></form>`);
    document.getElementById('edit-booking-form').onsubmit = (e) => {
        e.preventDefault();
        b.start = document.getElementById('eb-start').value; b.end = document.getElementById('eb-end').value; b.title = document.getElementById('eb-title').value;
        addAudit(`Editó reserva: ${b.title}`);
        renderCalendar(); closeModal();
    };
}

function deleteBooking(id) { if (confirm("¿Borrar reserva?")) { bookings = bookings.filter(b => b.id !== id); addAudit("Eliminó reserva"); renderCalendar(); closeModal(); } }

// --- EXPENSES ---
function changeExpYear(year) {
    currentExpYear = year;
    document.getElementById('exp-year-display').textContent = year;
    renderExpenses();
}

async function renderExpenses() {
    const list = document.getElementById('expenses-body');
    if (!list) return;
    list.innerHTML = '<tr><td colspan="5">Cargando...</td></tr>';
    try {
        cachedExpenses = await CortijoAPI.getExpenses({ year: currentExpYear });
        filterExpenses(document.getElementById('expense-search').value);
    } catch (e) { list.innerHTML = '<tr><td colspan="5" style="color:red">Error de conexión</td></tr>'; }
}

function filterExpenses(query) {
    const list = document.getElementById('expenses-body');
    const filtered = cachedExpenses.filter(e => e.concepto.toLowerCase().includes(query.toLowerCase()) || e.user_id.toLowerCase().includes(query.toLowerCase()));
    let total = 0;
    list.innerHTML = filtered.map(e => {
        total += parseFloat(e.cantidad);
        return `<tr><td>${formatDateDisplay(e.fecha)}</td><td>${e.concepto} ${e.url_drive ? `<a href="${e.url_drive}" target="_blank">📎</a>` : ''}</td><td>${e.user_id}</td><td class="amount">${parseFloat(e.cantidad).toFixed(2)}€</td><td><button class="btn-icon" onclick="editExpense('${e.id}')">✏️</button><button class="btn-icon" onclick="confirmDeleteExpense('${e.id}')">🗑️</button></td></tr>`;
    }).join('');
    document.getElementById('total-balance').textContent = `${total.toFixed(2)} €`;
}

function openExpenseModal() {
    openModal('Añadir Gasto', `<form id="exp-form"><div class="form-group"><label>Concepto</label><input type="text" id="ex-concept" required></div><div class="form-group"><label>Importe</label><input type="number" step="0.01" id="ex-amount" required></div><div class="form-group"><label>Fecha</label><input type="date" id="ex-date" value="${new Date().toISOString().split('T')[0]}" required></div><div class="form-group"><label>Categoría</label><select id="ex-cat"><option>Suministros</option><option>Mantenimiento</option><option>Otros</option></select></div><div class="form-group"><label>Ticket (Opcional)</label><input type="file" id="ex-file"></div><button type="submit" id="ex-btn" class="btn-primary" style="width:100%">Guardar</button></form>`);
    document.getElementById('exp-form').onsubmit = async (e) => {
        e.preventDefault();
        const btn = document.getElementById('ex-btn'); btn.disabled = true; btn.textContent = 'Guardando...';
        const date = document.getElementById('ex-date').value;
        const year = new Date(date).getFullYear();
        const data = { user_id: currentUser.name, concepto: document.getElementById('ex-concept').value, cantidad: document.getElementById('ex-amount').value, fecha: date, categoria: document.getElementById('ex-cat').value };
        try {
            await CortijoAPI.createExpense(data, document.getElementById('ex-file').files[0], `Gastos-${year}`);
            renderExpenses(); closeModal();
        } catch (err) { alert(err.message); btn.disabled = false; btn.textContent = 'Guardar'; }
    };
}

function editExpense(id) {
    const e = cachedExpenses.find(x => x.id == id);
    openModal('Editar Gasto', `<form id="edit-exp-form"><div class="form-group"><label>Concepto</label><input type="text" id="edex-concept" value="${e.concepto}"></div><div class="form-group"><label>Importe</label><input type="number" step="0.01" id="edex-amount" value="${e.cantidad}"></div><div class="form-group"><label>Fecha</label><input type="date" id="edex-date" value="${e.fecha.split('T')[0]}"></div><button type="submit" class="btn-primary" style="width:100%">Actualizar</button></form>`);
    document.getElementById('edit-exp-form').onsubmit = async (evt) => {
        evt.preventDefault();
        const data = { id, user_id: currentUser.name, concepto: document.getElementById('edex-concept').value, cantidad: document.getElementById('edex-amount').value, fecha: document.getElementById('edex-date').value, categoria: e.categoria };
        await CortijoAPI.updateExpense(data);
        renderExpenses(); closeModal();
    };
}

async function confirmDeleteExpense(id) { if (confirm("¿Eliminar gasto de la nube?")) { await CortijoAPI.deleteExpense(id, currentUser.name); renderExpenses(); } }

function exportExpenses() {
    const query = document.getElementById('expense-search').value;
    const filtered = cachedExpenses.filter(e => e.concepto.toLowerCase().includes(query.toLowerCase()));
    let csv = "Fecha,Concepto,Usuario,Importe,Categoria\n";
    filtered.forEach(e => csv += `${formatDateDisplay(e.fecha)},"${e.concepto}",${e.user_id},${e.cantidad},${e.categoria}\n`);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `Gastos_Cortijo_${currentExpYear}.csv`; link.click();
}

// --- DOCUMENTS ---
function changeDocYear(year) { currentDocYear = year; document.getElementById('doc-year-display').textContent = year; renderDocuments(); }

async function renderDocuments() {
    const list = document.getElementById('document-list');
    list.innerHTML = '<p>Cargando archivos compartidos...</p>';
    try {
        const docs = await CortijoAPI.getDocuments(currentDocYear);
        if (!docs.length) { list.innerHTML = '<p style="grid-column:1/-1;text-align:center;">Carpeta vacía.</p>'; return; }
        list.innerHTML = docs.map(d => `<div class="document-item"><span class="doc-icon">${d.type === 'pdf' ? '📄' : '🖼️'}</span><h4>${d.name}</h4><p>${d.size} • ${formatDateDisplay(d.date)}</p><div style="display:flex;gap:5px;margin-top:10px;"><button class="btn-small" onclick="previewDocument('${d.url_drive}')">👁️ Ver</button><button class="btn-small" onclick="window.open('${d.url_drive}')">⬇️ Bajar</button></div></div>`).join('');
    } catch (e) { list.innerHTML = '<p>Error cargando documentos.</p>'; }
}

async function handleFileUpload(event) {
    const file = event.target.files[0]; if (!file) return;
    document.getElementById('loader').style.display = 'flex';
    try {
        const url = await CortijoAPI.uploadToDrive(file);
        const data = { name: file.name, type: file.type.includes('pdf') ? 'pdf' : 'image', size: (file.size / 1024 / 1024).toFixed(1) + 'MB', date: new Date().toISOString(), year: currentDocYear, url_drive: url };
        await CortijoAPI.addDocument(data);
        renderDocuments(); addAudit(`Subió archivo: ${file.name}`);
    } catch (e) { alert(e.message); }
    document.getElementById('loader').style.display = 'none';
}

function previewDocument(url) {
    const id = url.match(/[-\w]{25,}/)[0];
    openModal('Vista Previa', `<iframe src="https://drive.google.com/file/d/${id}/preview" style="width:100%;height:500px;border:none;"></iframe>`);
}

// --- TASKS ---
function changeTaskYear(year) {
    currentTaskYear = parseInt(year);
    document.getElementById('task-year-display').textContent = year;
    renderTasks();
}

function renderTasks() {
    const lists = { waiting: document.getElementById('list-waiting'), running: document.getElementById('list-running'), completed: document.getElementById('list-completed') };
    if (!lists.waiting) return;
    Object.values(lists).forEach(l => l.innerHTML = '');
    const counts = { waiting: 0, running: 0, completed: 0 };
    const today = new Date().toISOString().split('T')[0];

    tasks.filter(t => t.year === currentTaskYear).forEach(task => {
        counts[task.status]++;
        const isOverdue = task.dueDate && task.dueDate < today && task.status !== 'completed';
        const card = document.createElement('div');
        card.className = `task-card ${isOverdue ? 'overdue' : ''}`;
        card.dataset.id = task.id;

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between;">
                <span class="task-title" onclick="editTask(${task.id})">${task.title}</span>
                <span class="priority-${task.priority}">${task.priority.toUpperCase()}</span>
            </div>
            <div class="task-meta">Asignado a: ${task.user}</div>
            <div class="task-date ${isOverdue ? 'priority-high' : ''}"><i data-lucide="calendar" style="width:14px"></i> ${formatDateDisplay(task.dueDate) || 'Sin fecha'}</div>
        `;
        lists[task.status].appendChild(card);
    });
    if (typeof lucide !== 'undefined') lucide.createIcons();
    ['waiting', 'running', 'completed'].forEach(s => {
        const el = document.getElementById(`count-${s}`);
        if (el) el.textContent = counts[s];
    });
}

function initSortable() {
    ['list-waiting', 'list-running', 'list-completed'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        new Sortable(el, {
            group: 'tasks',
            animation: 150,
            onEnd: async (evt) => {
                const taskId = parseInt(evt.item.dataset.id);
                const newStatus = evt.to.id.replace('list-', '');
                const task = tasks.find(t => t.id === taskId);
                if (task && task.status !== newStatus) {
                    task.status = newStatus;
                    addAudit(`Movió tarea "${task.title}" a ${newStatus}`);
                    renderTasks();
                }
            }
        });
    });
}

function openTaskModal() {
    openModal('Nueva Tarea', `
        <form id="task-form">
            <div class="form-group"><label>Título</label><input type="text" id="t-title" required></div>
            <div class="form-group"><label>Prioridad</label><select id="t-prio"><option value="low">Baja</option><option value="medium">Media</option><option value="high">Alta</option></select></div>
            <div class="form-group"><label>Fecha</label><input type="date" id="t-date"></div>
            <button type="submit" class="btn-primary" style="width:100%">Crear</button>
        </form>
    `);
    document.getElementById('task-form').onsubmit = (e) => {
        e.preventDefault();
        tasks.push({
            id: Date.now(),
            title: document.getElementById('t-title').value,
            status: 'waiting',
            user: currentUser.name,
            priority: document.getElementById('t-prio').value,
            dueDate: document.getElementById('t-date').value,
            year: currentTaskYear
        });
        addAudit(`Creó tarea: ${document.getElementById('t-title').value}`);
        renderTasks();
        closeModal();
    };
}

function editTask(id) {
    const task = tasks.find(t => t.id === id);
    openModal('Editar Tarea', `
        <form id="edit-task-form">
            <div class="form-group"><label>Título</label><input type="text" id="et-title" value="${task.title}"></div>
            <div style="display:flex;gap:10px;">
                <button type="submit" class="btn-primary" style="flex:1">Guardar</button>
                <button type="button" onclick="deleteTask(${id})" class="btn-danger" style="flex:1">Eliminar</button>
            </div>
        </form>
    `);
    document.getElementById('edit-task-form').onsubmit = (e) => {
        e.preventDefault();
        task.title = document.getElementById('et-title').value;
        addAudit(`Editó tarea: ${task.title}`);
        renderTasks();
        closeModal();
    };
}

function deleteTask(id) {
    if (confirm("¿Borrar tarea?")) {
        tasks = tasks.filter(t => t.id !== id);
        addAudit("Eliminó tarea");
        renderTasks();
        closeModal();
    }
}

// --- AUTH ---
function handleCredentialResponse(r) {
    const payload = JSON.parse(atob(r.credential.split('.')[1]));
    currentUser = { name: payload.name, avatar: payload.picture, email: payload.email };
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
function renderProfile() { document.getElementById('profile-name').textContent = currentUser.name; document.getElementById('profile-avatar').src = currentUser.avatar; }
