// App State
let currentUser = null;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let currentTaskYear = 2026;
let currentDocYear = 2026;

let auditLog = [
    { date: '2026-01-24 10:00', user: 'Admin', action: 'Inició el sistema' }
];

let expenses = []; // Loaded via API
let bookings = [
    { id: 1, start: '2026-01-15', end: '2026-01-18', user: 'Juan', title: 'Fin de semana' },
    { id: 2, start: '2026-01-24', end: '2026-01-26', user: 'Admin', title: 'Mantenimiento' }
];

let documents = [
    { id: 1, name: 'Escrituras_Cortijo.pdf', type: 'pdf', size: '2.4 MB', date: '2023-12-01', year: 2024 },
    { id: 2, name: 'Plano_Finca_V2.jpg', type: 'image', size: '1.8 MB', date: '2024-01-15', year: 2024 }
];

let tasks = [
    {
        id: 1,
        title: 'Arreglar fuga en riego',
        status: 'running',
        user: 'Juan',
        priority: 'high',
        dueDate: '2026-01-20',
        year: 2026,
        history: [{ user: 'Juan', date: '2026-01-20', action: 'Empezó tarea' }],
        subtasks: [
            { text: 'Comprar tubería 20mm', completed: true },
            { text: 'Sellar junta principal', completed: false }
        ]
    }
];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (typeof lucide !== 'undefined') lucide.createIcons();
    setTimeout(() => {
        const loader = document.getElementById('loader');
        if (loader) loader.style.display = 'none';
    }, 1000);

    if (localStorage.getItem('user')) {
        currentUser = JSON.parse(localStorage.getItem('user'));
        showAuthenticatedUI();
    }
});

// Section Management
function showSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById(sectionId + '-section');
    if (target) target.classList.remove('hidden');

    document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
    const activeBtn = document.querySelector(`nav button[onclick*="${sectionId}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    if (sectionId === 'expenses') renderExpenses();
    if (sectionId === 'calendar') renderCalendar();
    if (sectionId === 'tasks') {
        renderTasks();
        initSortable();
    }
    if (sectionId === 'documents') renderDocuments();
    if (sectionId === 'profile') renderProfile();
}

// Helpers
function formatDateDisplay(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

// --- CALENDAR LOGIC ---
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
    const display = document.getElementById('current-month-display');
    if (display) display.textContent = `${monthNames[currentMonth]} ${currentYear}`;

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    let firstDayRaw = new Date(currentYear, currentMonth, 1).getDay();
    let firstDay = firstDayRaw === 0 ? 6 : firstDayRaw - 1;

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    let html = '<div class="days-grid">';
    ['L', 'M', 'X', 'J', 'V', 'S', 'D'].forEach(d => {
        html += `<div class="day-header" style="font-weight:700; color:var(--accent); text-align:center;">${d}</div>`;
    });

    for (let i = 0; i < firstDay; i++) html += `<div class="day-cell empty"></div>`;

    for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const isToday = dateStr === todayStr;

        const booking = bookings.find(b => dateStr >= b.start && dateStr <= b.end);

        let rangeClass = '';
        if (booking) {
            rangeClass = 'booked';
            if (dateStr === booking.start && dateStr === booking.end) rangeClass += ' range-single';
            else if (dateStr === booking.start) rangeClass += ' range-start';
            else if (dateStr === booking.end) rangeClass += ' range-end';
        }

        html += `
            <div class="day-cell ${rangeClass} ${isToday ? 'today' : ''}" onclick="handleDateClick('${dateStr}', ${booking ? booking.id : 'null'})">
                ${i}
                ${booking ? `<div class="calendar-event-text">${booking.title}</div>` : ''}
                ${booking ? `<div class="booking-tooltip">${booking.title} (${booking.user}) - ${formatDateDisplay(booking.start)} al ${formatDateDisplay(booking.end)}</div>` : ''}
            </div>`;
    }
    html += `</div>`;
    grid.innerHTML = html;
    renderAuditLog();
}

function handleDateClick(date, bookingId) {
    if (!currentUser) return;
    if (bookingId) {
        openEditBookingModal(bookingId);
    } else {
        openBookingModal(date);
    }
}

function renderAuditLog() {
    const list = document.getElementById('audit-list');
    if (!list) return;
    list.innerHTML = auditLog.map(log => `<li><span class="audit-date">[${log.date}]</span> <span class="audit-user">${log.user}</span>: ${log.action}</li>`).join('');
}

function openBookingModal(defaultDate = '') {
    openModal('Nueva Reserva', `
        <form id="booking-form">
            <div class="form-group"><label>Entrada</label><input type="date" id="book-start" value="${defaultDate}" required></div>
            <div class="form-group"><label>Salida</label><input type="date" id="book-end" value="${defaultDate}" required></div>
            <div class="form-group"><label>Nombre reserva</label><input type="text" id="book-title" required placeholder="Ej: Familia García"></div>
            <button type="submit" class="btn-primary" style="width: 100%;">Confirmar</button>
        </form>
    `);

    document.getElementById('booking-form').onsubmit = (e) => {
        e.preventDefault();
        const start = document.getElementById('book-start').value;
        const end = document.getElementById('book-end').value;
        const title = document.getElementById('book-title').value;

        if (isRangeBooked(start, end)) {
            alert("⚠️ Esas fechas ya están ocupadas.");
            return;
        }

        bookings.push({ id: Date.now(), start, end, title, user: currentUser.name });
        addAudit(`Añadió reserva: ${title} (${formatDateDisplay(start)} al ${formatDateDisplay(end)})`);
        renderCalendar();
        closeModal();
    };
}

function openEditBookingModal(id) {
    const booking = bookings.find(b => b.id === id);
    if (!booking) return;

    openModal('Editar Reserva', `
        <form id="edit-booking-form">
            <div class="form-group"><label>Entrada</label><input type="date" id="edit-book-start" value="${booking.start}" required></div>
            <div class="form-group"><label>Salida</label><input type="date" id="edit-book-end" value="${booking.end}" required></div>
            <div class="form-group"><label>Nombre reserva</label><input type="text" id="edit-book-title" value="${booking.title}" required></div>
            <div style="display:flex; gap:10px; margin-top:1rem;">
                <button type="submit" class="btn-primary" style="flex:1;">Guardar Cambios</button>
                <button type="button" class="btn-danger-outline" onclick="deleteBooking(${booking.id})" style="flex:1; border: 1px solid var(--danger); color: var(--danger); background: none; border-radius: 12px; cursor: pointer; font-weight: 600;">Eliminar</button>
            </div>
        </form>
    `);

    document.getElementById('edit-booking-form').onsubmit = (e) => {
        e.preventDefault();
        const start = document.getElementById('edit-book-start').value;
        const end = document.getElementById('edit-book-end').value;
        const title = document.getElementById('edit-book-title').value;

        if (isRangeBooked(start, end, id)) {
            alert("⚠️ Rango ocupado.");
            return;
        }

        booking.start = start;
        booking.end = end;
        booking.title = title;

        addAudit(`Editó reserva: ${title} (${formatDateDisplay(start)} al ${formatDateDisplay(end)})`);
        renderCalendar();
        closeModal();
    };
}

function deleteBooking(id) {
    const booking = bookings.find(b => b.id === id);
    if (!booking) return;

    if (confirm(`¿Borrar la reserva "${booking.title}"?`)) {
        addAudit(`Eliminó reserva: ${booking.title}`);
        bookings = bookings.filter(b => b.id !== id);
        renderCalendar();
        closeModal();
    }
}

function isRangeBooked(start, end, excludeId = null) {
    return bookings.some(b => {
        if (excludeId && b.id === excludeId) return false;
        return (start <= b.end && end >= b.start);
    });
}

function addAudit(action) {
    auditLog.unshift({
        date: new Date().toLocaleString(),
        user: currentUser ? currentUser.name : 'Sistema',
        action: action
    });
}

// --- TASKS LOGIC ---
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
            <div class="subtasks-list">
                ${task.subtasks.map((st, idx) => `
                    <div class="subtask-item">
                        <input type="checkbox" ${st.completed ? 'checked' : ''} onchange="toggleSubtask(${task.id}, ${idx})">
                        <span style="${st.completed ? 'text-decoration: line-through;' : ''}">${st.text}</span>
                    </div>`).join('')}
            </div>
            ${task.photo ? `<img src="${task.photo}" class="task-photo">` : ''}
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
            onEnd: (evt) => {
                const taskId = parseInt(evt.item.dataset.id);
                const newStatus = evt.to.id.replace('list-', '');
                const task = tasks.find(t => t.id === taskId);
                if (task && task.status !== newStatus) {
                    task.status = newStatus;
                    task.history.push({ user: currentUser.name, date: new Date().toLocaleString(), action: `Movió a ${newStatus}` });
                    renderTasks();
                }
            }
        });
    });
}

function editTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    openModal('Editar Tarea', `
        <form id="edit-task-form">
            <div class="form-group"><label>Título</label><input type="text" id="edit-title" value="${task.title}"></div>
            <div class="form-group"><label>Prioridad</label>
                <select id="edit-priority">
                    <option value="low" ${task.priority === 'low' ? 'selected' : ''}>Baja</option>
                    <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>Media</option>
                    <option value="high" ${task.priority === 'high' ? 'selected' : ''}>Alta</option>
                </select>
            </div>
            <div class="form-group"><label>Fecha Límite</label><input type="date" id="edit-date" value="${task.dueDate}"></div>
            <div class="form-group"><label>Subir Foto (Simulado)</label><input type="file" onchange="taskPhotoUpload(event, ${task.id})"></div>
            <div style="display:flex; gap:10px; margin-top:1rem;">
                <button type="submit" class="btn-primary" style="flex:1;">Guardar Cambios</button>
                <button type="button" onclick="deleteTask(${task.id})" style="flex:1; border: 1px solid var(--danger); color: var(--danger); background: none; border-radius: 12px; cursor: pointer; font-weight: 600;">Eliminar</button>
            </div>
        </form>
    `);
    document.getElementById('edit-task-form').onsubmit = (e) => {
        e.preventDefault();
        task.title = document.getElementById('edit-title').value;
        task.priority = document.getElementById('edit-priority').value;
        task.dueDate = document.getElementById('edit-date').value;
        task.history.push({ user: currentUser.name, date: new Date().toLocaleString(), action: 'Editó detalles' });
        renderTasks();
        closeModal();
    };
}

function deleteTask(id) {
    if (confirm('¿Borrar tarea?')) {
        tasks = tasks.filter(t => t.id !== id);
        renderTasks();
        closeModal();
    }
}

function openTaskModal() {
    openModal('Nueva Tarea', `
        <form id="task-form">
            <div class="form-group"><label>Título</label><input type="text" id="task-title" required></div>
            <div class="form-group"><label>Prioridad</label><select id="task-prio"><option value="low">Baja</option><option value="medium">Media</option><option value="high">Alta</option></select></div>
            <div class="form-group"><label>Fecha Límite</label><input type="date" id="task-date"></div>
            <div class="form-group"><label>Subprocesos (uno por línea)</label><textarea id="task-subs"></textarea></div>
            <button type="submit" class="btn-primary" style="width: 100%;">Crear</button>
        </form>
    `);
    document.getElementById('task-form').onsubmit = (e) => {
        e.preventDefault();
        const subs = document.getElementById('task-subs').value.split('\n').filter(x => x.trim()).map(x => ({ text: x.trim(), completed: false }));
        tasks.push({
            id: Date.now(), title: document.getElementById('task-title').value, status: 'waiting', user: currentUser.name, priority: document.getElementById('task-prio').value, dueDate: document.getElementById('task-date').value, year: currentTaskYear, history: [{ user: currentUser.name, date: new Date().toLocaleString(), action: 'Creó tarea' }], subtasks: subs
        });
        renderTasks();
        closeModal();
    };
}

function toggleSubtask(id, idx) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.subtasks[idx].completed = !task.subtasks[idx].completed;
        renderTasks();
    }
}

// --- DOCUMENTS LOGIC ---
function changeDocYear(year) {
    currentDocYear = parseInt(year);
    document.getElementById('doc-year-display').textContent = year;
    renderDocuments();
}

function renderDocuments() {
    const list = document.getElementById('document-list');
    if (!list) return;
    list.innerHTML = '';
    const filteredDocs = documents.filter(doc => doc.year === currentDocYear);
    if (filteredDocs.length === 0) {
        list.innerHTML = '<p style="grid-column:1/-1; text-align:center; padding:2rem;">No hay documentos este año.</p>';
        return;
    }
    list.innerHTML = filteredDocs.map(doc => `
        <div class="document-item">
            <span class="doc-icon">${doc.type === 'pdf' ? '📄' : '🖼️'}</span>
            <h4>${doc.name}</h4>
            <p>${doc.size} • ${formatDateDisplay(doc.date)}</p>
            <div class="doc-item-actions" style="margin-top: 1rem; display: flex; gap: 8px; justify-content: center;">
                <button class="btn-small" onclick="previewDocument('${doc.id}')">👁️ Ver</button>
                <button class="btn-small" onclick="downloadDocument('${doc.id}')">⬇️ Bajar</button>
            </div>
        </div>`).join('');
}

function previewDocument(id) {
    const doc = documents.find(d => d.id == id);
    if (!doc) return;

    if (!doc.url_drive) {
        alert("Sin URL de Drive.");
        return;
    }

    // Extraemos el ID de Drive de la URL
    const driveIdMatch = doc.url_drive.match(/[-\w]{25,}/);
    if (!driveIdMatch) {
        alert("URL de Drive no válida.");
        return;
    }
    const driveId = driveIdMatch[0];
    const previewUrl = `https://drive.google.com/file/d/${driveId}/preview`;

    openModal(`Vista previa: ${doc.name}`, `
        <div style="text-align:center;">
            <iframe src="${previewUrl}" style="width:100%; height:500px; border:none; border-radius:12px; background:#f0f0f0;"></iframe>
            <div style="margin-top: 1.5rem;">
                <a href="${doc.url_drive}" target="_blank" class="btn-primary" style="text-decoration:none; display:inline-block; padding: 10px 20px;">Abrir pantalla completa</a>
            </div>
        </div>
    `);
}

function downloadDocument(id) {
    const doc = documents.find(d => d.id == id);
    if (!doc || !doc.url_drive) {
        alert("No se puede descargar: URL no encontrada.");
        return;
    }
    // Abrimos el enlace de descarga directa de Drive
    const downloadUrl = doc.url_drive.replace('/view', '/view?export=download');
    window.open(downloadUrl, '_blank');
}

async function handleFileUpload(event) {
    const files = event.target.files;
    if (!files.length) return;

    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'flex';

    for (let file of files) {
        try {
            const driveUrl = await CortijoAPI.uploadToDrive(file);
            documents.unshift({
                id: Date.now(),
                name: file.name,
                type: file.type.includes('pdf') ? 'pdf' : 'image',
                size: (file.size / 1024 / 1024).toFixed(1) + ' MB',
                date: new Date().toISOString().split('T')[0],
                year: currentDocYear,
                url_drive: driveUrl
            });
            addAudit(`Subió documento: ${file.name}`);
        } catch (err) {
            alert(`Error subiendo ${file.name}: ${err.message}`);
        }
    }

    if (loader) loader.style.display = 'none';
    renderDocuments();
}

// --- EXPENSES LOGIC ---
async function renderExpenses(filters = {}) {
    const body = document.getElementById('expenses-body');
    if (!body) return;
    body.innerHTML = '<tr><td colspan="5">Cargando...</td></tr>';
    try {
        const data = await CortijoAPI.getExpenses(filters);
        body.innerHTML = '';
        let total = 0;
        data.forEach(exp => {
            total += parseFloat(exp.cantidad);
            body.innerHTML += `
                <tr>
                    <td>${formatDateDisplay(exp.fecha)}</td>
                    <td>${exp.concepto} ${exp.url_drive ? `<a href="${exp.url_drive}" target="_blank">📎</a>` : ''}</td>
                    <td>${exp.user_id}</td>
                    <td class="amount">${parseFloat(exp.cantidad).toFixed(2)} €</td>
                    <td><button class="btn-icon" onclick="confirmDeleteExpense('${exp.id}')">🗑️</button></td>
                </tr>`;
        });
        document.getElementById('total-balance').textContent = `${total.toFixed(2)} €`;
    } catch (e) {
        body.innerHTML = '<tr><td colspan="5" style="color:red">Error API.</td></tr>';
    }
}

function openExpenseModal() {
    openModal('Añadir Gasto', `
        <form id="expense-form">
            <div class="form-group"><label>Concepto</label><input type="text" id="exp-concept" required></div>
            <div class="form-group"><label>Importe (€)</label><input type="number" step="0.01" id="exp-amount" required></div>
            <div class="form-group"><label>Fecha</label><input type="date" id="exp-date" value="${new Date().toISOString().split('T')[0]}" required></div>
            <div class="form-group"><label>Categoría</label><select id="exp-cat"><option>Suministros</option><option>Mantenimiento</option><option>Otros</option></select></div>
            <div class="form-group"><label>Ticket (Opcional)</label><input type="file" id="exp-file"></div>
            <button type="submit" id="submit-expense" class="btn-primary" style="width:100%;">Guardar</button>
        </form>
    `);
    document.getElementById('expense-form').onsubmit = async (e) => {
        e.preventDefault();
        const btn = document.getElementById('submit-expense');
        btn.disabled = true; btn.textContent = 'Subiendo...';
        const expenseData = {
            user_id: currentUser.name,
            concepto: document.getElementById('exp-concept').value,
            cantidad: parseFloat(document.getElementById('exp-amount').value),
            fecha: document.getElementById('exp-date').value,
            categoria: document.getElementById('exp-cat').value
        };
        try {
            await CortijoAPI.createExpense(expenseData, document.getElementById('exp-file').files[0]);
            renderExpenses();
            closeModal();
        } catch (err) { alert(err.message); btn.disabled = false; btn.textContent = 'Guardar'; }
    };
}

async function confirmDeleteExpense(id) {
    if (confirm('¿Borrar gasto?')) {
        await CortijoAPI.deleteExpense(id, currentUser.name);
        renderExpenses();
    }
}

// --- AUTH & MISC ---
function parseJwt(token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
}

function handleCredentialResponse(response) {
    const responsePayload = parseJwt(response.credential);

    currentUser = {
        name: responsePayload.name,
        email: responsePayload.email,
        avatar: responsePayload.picture,
        role: 'usuario' // Por defecto
    };

    // Si es tu email, podrías ponerte como Admin
    if (currentUser.email === 'tuemail@gmail.com') {
        currentUser.role = 'admin';
    }

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
    document.getElementById('profile-avatar').src = currentUser.avatar;
}
window.simulateLogin = () => handleCredentialResponse();
