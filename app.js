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
let tasks = []; // Cargadas por año

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
    if (!dateStr || dateStr === "undefined") return '';
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
    const dVal = date || new Date().toISOString().split('T')[0];
    openModal('Nueva Reserva', `<form id="booking-form"><div class="form-group"><label>Entrada</label><input type="date" id="book-start" value="${dVal}" required></div><div class="form-group"><label>Salida</label><input type="date" id="book-end" value="${dVal}" required></div><div class="form-group"><label>Reserva</label><input type="text" id="book-title" required></div><button type="submit" class="btn-primary" style="width:100%">Confirmar</button></form>`);
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
    if (!b) return;
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
    currentExpYear = parseInt(year);
    const el = document.getElementById('exp-year-display');
    if (el) el.textContent = year;
    renderExpenses();
}

async function renderExpenses() {
    const list = document.getElementById('expenses-body');
    if (!list) return;
    list.innerHTML = '<tr><td colspan="5">Cargando...</td></tr>';
    try {
        cachedExpenses = await CortijoAPI.getExpenses({ year: currentExpYear });
        if (cachedExpenses.error) throw new Error(cachedExpenses.error);
        filterExpenses(document.getElementById('expense-search')?.value || '');
    } catch (e) {
        console.error("Error renderExpenses:", e);
        list.innerHTML = `<tr><td colspan="5" style="color:red">Error: ${e.message}</td></tr>`;
    }
}

function filterExpenses(query) {
    const list = document.getElementById('expenses-body');
    if (!list) return;
    const filtered = cachedExpenses.filter(e => String(e.concepto).toLowerCase().includes(query.toLowerCase()) || String(e.user_id).toLowerCase().includes(query.toLowerCase()));
    let total = 0;
    list.innerHTML = filtered.map(e => {
        total += parseFloat(e.cantidad);
        return `<tr><td>${formatDateDisplay(e.fecha)}</td><td>${e.concepto} ${e.url_drive ? `<a href="${e.url_drive}" target="_blank">📎</a>` : ''}</td><td>${e.user_id}</td><td class="amount">${parseFloat(e.cantidad).toFixed(2)}€</td><td><button class="btn-icon" onclick="editExpense('${e.id}')">✏️</button><button class="btn-icon" onclick="confirmDeleteExpense('${e.id}')">🗑️</button></td></tr>`;
    }).join('');
    const balanceEl = document.getElementById('total-balance');
    if (balanceEl) balanceEl.textContent = `${total.toFixed(2)} €`;
}

function openExpenseModal() {
    const dVal = new Date().toISOString().split('T')[0];
    openModal('Añadir Gasto', `<form id="exp-form"><div class="form-group"><label>Concepto</label><input type="text" id="ex-concept" required></div><div class="form-group"><label>Importe</label><input type="number" step="0.01" id="ex-amount" required></div><div class="form-group"><label>Fecha</label><input type="date" id="ex-date" value="${dVal}" required></div><div class="form-group"><label>Categoría</label><select id="ex-cat"><option>Suministros</option><option>Mantenimiento</option><option>Otros</option></select></div><div class="form-group"><label>Ticket (Opcional)</label><input type="file" id="ex-file"></div><button type="submit" id="ex-btn" class="btn-primary" style="width:100%">Guardar</button></form>`);
    document.getElementById('exp-form').onsubmit = async (e) => {
        e.preventDefault();
        const btn = document.getElementById('ex-btn'); btn.disabled = true; btn.textContent = 'Guardando...';
        const date = document.getElementById('ex-date').value;
        const year = new Date(date).getFullYear();
        const data = { user_id: currentUser.name, concepto: document.getElementById('ex-concept').value, cantidad: document.getElementById('ex-amount').value, fecha: date, categoria: document.getElementById('ex-cat').value };
        try {
            const res = await CortijoAPI.createExpense(data, document.getElementById('ex-file').files[0], `Gastos-${year}`);
            if (res.error) throw new Error(res.error);
            renderExpenses(); closeModal();
        } catch (err) { alert("Error al guardar: " + err.message); btn.disabled = false; btn.textContent = 'Guardar'; }
    };
}

function editExpense(id) {
    const e = cachedExpenses.find(x => x.id == id);
    if (!e) return;
    const dateVal = e.fecha ? (e.fecha.includes('T') ? e.fecha.split('T')[0] : e.fecha) : new Date().toISOString().split('T')[0];
    openModal('Editar Gasto', `<form id="edit-exp-form"><div class="form-group"><label>Concepto</label><input type="text" id="edex-concept" value="${e.concepto}"></div><div class="form-group"><label>Importe</label><input type="number" step="0.01" id="edex-amount" value="${e.cantidad}"></div><div class="form-group"><label>Fecha</label><input type="date" id="edex-date" value="${dateVal}"></div><button type="submit" class="btn-primary" style="width:100%">Actualizar</button></form>`);
    document.getElementById('edit-exp-form').onsubmit = async (evt) => {
        evt.preventDefault();
        const data = { id, user_id: currentUser.name, concepto: document.getElementById('edex-concept').value, cantidad: document.getElementById('edex-amount').value, fecha: document.getElementById('edex-date').value, categoria: e.categoria };
        const res = await CortijoAPI.updateExpense(data);
        if (res.error) alert(res.error);
        renderExpenses(); closeModal();
    };
}

async function confirmDeleteExpense(id) { if (confirm("¿Eliminar gasto?")) { const res = await CortijoAPI.deleteExpense(id, currentUser.name); if (res.error) alert(res.error); renderExpenses(); } }

function exportExpenses() {
    let csv = "Fecha,Concepto,Usuario,Importe,Categoria\n";
    cachedExpenses.forEach(e => csv += `${formatDateDisplay(e.fecha)},"${e.concepto}",${e.user_id},${e.cantidad},${e.categoria}\n`);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `Gastos_Cortijo_${currentExpYear}.csv`; link.click();
}

// --- DOCUMENTS ---
function changeDocYear(year) { currentDocYear = year; const el = document.getElementById('doc-year-display'); if (el) el.textContent = year; renderDocuments(); }

async function renderDocuments() {
    const list = document.getElementById('document-list');
    if (!list) return;
    list.innerHTML = '<p>Cargando archivos compartidos...</p>';
    try {
        const docs = await CortijoAPI.getDocuments(currentDocYear);
        if (docs.error) throw new Error(docs.error);

        if (!docs || docs.length === 0) {
            list.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:2rem;">No hay documentos en esta carpeta anual.</p>';
            return;
        }

        list.innerHTML = docs.map(d => {
            const url = d.url_drive || '';
            return `
            <div class="document-item">
                <span class="doc-icon">${d.type === 'pdf' ? '📄' : '🖼️'}</span>
                <h4>${d.name}</h4>
                <p>${d.size} • ${formatDateDisplay(d.date)}</p>
                <div class="doc-item-actions" style="margin-top: 10px; display: flex; gap: 8px; justify-content: center;">
                    <button class="btn-small" onclick="previewDocument('${url}')">👁️ Ver</button>
                    <button class="btn-small" onclick="downloadDocument('${url}')">⬇️ Bajar</button>
                </div>
            </div>`;
        }).join('');
    } catch (e) {
        console.error("Error renderDocuments:", e);
        list.innerHTML = `<p style="color:red">Error: ${e.message}</p>`;
    }
}

async function handleFileUpload(event) {
    const file = event.target.files[0]; if (!file) return;
    document.getElementById('loader').style.display = 'flex';
    try {
        const url = await CortijoAPI.uploadToDrive(file);
        const data = { name: file.name, type: file.type.includes('pdf') ? 'pdf' : 'image', size: (file.size / 1024 / 1024).toFixed(1) + 'MB', date: new Date().toISOString(), year: currentDocYear, url_drive: url };
        const res = await CortijoAPI.addDocument(data);
        if (res.error) throw new Error(res.error);
        renderDocuments(); addAudit(`Subió archivo: ${file.name}`);
    } catch (e) { alert("Error: " + e.message); }
    document.getElementById('loader').style.display = 'none';
}

function previewDocument(url) {
    if (!url) return alert("Este documento no tiene enlace de visualización.");
    const match = url.match(/[-\w]{25,}/);
    if (!match) return window.open(url, '_blank');

    const previewUrl = `https://drive.google.com/file/d/${match[0]}/preview`;
    openModal('Vista Previa', `
        <div style="text-align:center;">
            <iframe src="${previewUrl}" style="width:100%;height:500px;border:none;border-radius:12px;background:#f0f0f0;"></iframe>
            <div style="margin-top:1rem;">
                <a href="${url}" target="_blank" class="btn-primary" style="text-decoration:none;display:inline-block;padding:8px 16px;">Ver en Google Drive</a>
            </div>
        </div>
    `);
}

function downloadDocument(url) {
    if (!url) return alert("URL no válida.");
    const match = url.match(/[-\w]{25,}/);
    if (match) {
        window.open(`https://drive.google.com/uc?export=download&id=${match[0]}`, '_blank');
    } else {
        window.open(url, '_blank');
    }
}

// --- TASKS ---
function changeTaskYear(year) { currentTaskYear = parseInt(year); const el = document.getElementById('task-year-display'); if (el) el.textContent = year; renderTasks(); }
function renderTasks() {
    const lists = { waiting: document.getElementById('list-waiting'), running: document.getElementById('list-running'), completed: document.getElementById('list-completed') };
    if (!lists.waiting) return;
    Object.values(lists).forEach(l => l.innerHTML = '');
    const counts = { waiting: 0, running: 0, completed: 0 };
    const today = new Date().toISOString().split('T')[0];
    tasks.filter(t => t.year === currentTaskYear).forEach(task => {
        counts[task.status]++;
        const div = document.createElement('div'); div.className = 'task-card'; div.dataset.id = task.id;
        div.innerHTML = `<div style="display:flex;justify-content:space-between;"><span class="task-title" onclick="editTask(${task.id})">${task.title}</span><span class="priority-${task.priority}">${task.priority}</span></div><div class="task-meta">Por: ${task.user}</div>`;
        lists[task.status].appendChild(div);
    });
    ['waiting', 'running', 'completed'].forEach(s => { const el = document.getElementById(`count-${s}`); if (el) el.textContent = counts[s]; });
    if (typeof lucide !== 'undefined') lucide.createIcons();
}
function initSortable() {
    ['list-waiting', 'list-running', 'list-completed'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        new Sortable(el, {
            group: 'tasks', animation: 150, onEnd: (evt) => {
                const taskId = parseInt(evt.item.dataset.id);
                const task = tasks.find(t => t.id === taskId);
                if (task) { task.status = evt.to.id.replace('list-', ''); renderTasks(); }
            }
        });
    });
}
function openTaskModal() {
    if (!currentUser) return alert("Error: Inicia sesión de nuevo.");
    openModal('Nueva Tarea', `
        <form id="t-form">
            <div class="form-group"><label>Tarea</label><input type="text" id="tn" required placeholder="Ej: Pintar fachada"></div>
            <div class="form-group"><label>Prioridad</label>
                <select id="tp">
                    <option value="low">Baja</option>
                    <option value="medium" selected>Media</option>
                    <option value="high">Alta</option>
                </select>
            </div>
            <button type="submit" class="btn-primary" style="width:100%; margin-top:1rem;">Crear Ahora</button>
        </form>
    `);

    const form = document.getElementById('t-form');
    if (form) {
        form.onsubmit = (e) => {
            e.preventDefault();
            const title = document.getElementById('tn').value;
            tasks.push({
                id: Date.now(),
                title: title,
                status: 'waiting',
                user: currentUser.name,
                priority: document.getElementById('tp').value,
                year: currentTaskYear
            });
            addAudit(`Creó tarea: ${title}`);
            renderTasks();
            closeModal();
        };
    }
}
function editTask(id) {
    const t = tasks.find(x => x.id === id);
    openModal('Editar Tarea', `<form id="et-form"><div class="form-group"><label>Tarea</label><input type="text" id="etn" value="${t.title}"></div><button type="submit" class="btn-primary">Guardar</button></form>`);
    document.getElementById('et-form').onsubmit = (e) => { e.preventDefault(); t.title = document.getElementById('etn').value; renderTasks(); closeModal(); };
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
    const el = document.getElementById('profile-name');
    if (el) el.textContent = currentUser.name;
    const av = document.getElementById('profile-avatar');
    if (av) av.src = currentUser.avatar;
}
