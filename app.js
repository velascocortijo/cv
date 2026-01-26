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

    // Cerrar menú móvil al cambiar de sección
    document.getElementById('main-nav').classList.remove('show');

    if (sectionId === 'expenses') renderExpenses();
    if (sectionId === 'calendar') renderCalendar();
    if (sectionId === 'tasks') renderTasks();
    if (sectionId === 'documents') renderDocuments();
    if (sectionId === 'profile') renderProfile();
}

function toggleMobileMenu() {
    const nav = document.getElementById('main-nav');
    nav.classList.toggle('show');
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
        const data = await CortijoAPI.getExpenses(currentExpYear);
        if (data.error) throw new Error(data.error);
        cachedExpenses = data;
        filterExpenses(document.getElementById('expense-search')?.value || '');
    } catch (e) {
        console.error("renderExpenses Error:", e);
        list.innerHTML = `<tr><td colspan="5" style="color:red">Error: ${e.message}. Verifica que ejecutaste 'authorize' en Google Script.</td></tr>`;
    }
}

function filterExpenses(query) {
    const list = document.getElementById('expenses-body');
    const filtered = cachedExpenses.filter(e => String(e.concepto).toLowerCase().includes(query.toLowerCase()));
    let total = 0;
    list.innerHTML = filtered.map(e => {
        total += parseFloat(e.cantidad);
        return `<tr>
            <td data-label="Fecha" onclick="openEditExpenseModal(${e.id})" style="cursor:pointer;">${formatDateDisplay(e.fecha)}</td>
            <td data-label="Concepto" onclick="openEditExpenseModal(${e.id})" style="cursor:pointer;">${e.concepto} ${e.url_drive ? `<a href="${e.url_drive}" target="_blank" onclick="event.stopPropagation()">📎</a>` : ''}</td>
            <td data-label="Usuario">${e.user_id}</td>
            <td data-label="Importe" class="amount">${parseFloat(e.cantidad).toFixed(2)}€</td>
            <td data-label="Acciones"><button class="btn-icon" onclick="confirmDeleteExpense('${e.id}')">🗑️</button></td>
        </tr>`;
    }).join('');
    document.getElementById('total-balance').textContent = `${total.toFixed(2)} €`;
}

function openEditExpenseModal(id) {
    const exp = cachedExpenses.find(e => e.id == id);
    if (!exp) return;

    openModal('Editar Gasto', `
        <form id="edit-ex-form">
            <div class="form-group"><label>Concepto</label><input type="text" id="eexc" value="${exp.concepto}" required></div>
            <div class="form-group"><label>Importe</label><input type="number" step="0.01" id="eexa" value="${exp.cantidad}" required></div>
            <div class="form-group"><label>Fecha</label><input type="date" id="eexd" value="${new Date(exp.fecha).toISOString().split('T')[0]}" required></div>
            <button type="submit" class="btn-primary" style="width:100%">Guardar Cambios</button>
        </form>
    `);
    document.getElementById('edit-ex-form').onsubmit = async (e) => {
        e.preventDefault();
        const data = {
            concepto: document.getElementById('eexc').value,
            cantidad: document.getElementById('eexa').value,
            fecha: document.getElementById('eexd').value
        };
        await CortijoAPI.updateExpense(id, data);
        renderExpenses(); closeModal();
    };
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

async function confirmDeleteExpense(id) { if (confirm("¿Eliminar este gasto?")) { await CortijoAPI.deleteExpense(id); renderExpenses(); } }

// --- DOCUMENTS ---
function changeDocYear(year) { currentDocYear = year; document.getElementById('doc-year-display').textContent = year; renderDocuments(); }

let cachedDocs = [];
async function renderDocuments() {
    const list = document.getElementById('document-list');
    if (!list) return;
    list.innerHTML = '<p>Cargando...</p>';
    try {
        const data = await CortijoAPI.getDocuments(currentDocYear);
        if (data.error) throw new Error(data.error);
        cachedDocs = data;
        if (!data || !data.length) { list.innerHTML = '<p>No hay documentos para este año.</p>'; return; }
        list.innerHTML = data.map(d => {
            const url = d.url_drive || '';
            return `<div class="document-item">
                <span class="doc-icon" onclick="openEditDocModal(${d.id})">${d.type === 'pdf' ? '📄' : '🖼️'}</span>
                <h4 onclick="openEditDocModal(${d.id})" style="cursor:pointer;">${d.name}</h4>
                <p>${d.size} • ${formatDateDisplay(d.date)}</p>
                <div style="display:flex;gap:5px;margin-top:10px;justify-content:center;flex-wrap:wrap;">
                    <button class="btn-small" onclick="previewDocument('${url}')">👁️ Ver</button>
                    <button class="btn-small" onclick="downloadDocument('${url}')">⬇️ Bajar</button>
                    <button class="btn-small btn-danger" onclick="confirmDeleteDocument(${d.id})" style="padding: 4px 8px; background:var(--danger); color:white; border:none;">🗑️</button>
                </div>
            </div>`;
        }).join('');
    } catch (e) {
        console.error("renderDocuments Error:", e);
        list.innerHTML = `<p style="color:red">Error: ${e.message}</p>`;
    }
}

function openEditDocModal(id) {
    const doc = cachedDocs.find(d => d.id == id);
    if (!doc) return;

    openModal('Editar Documento', `
        <form id="edit-doc-form">
            <div class="form-group"><label>Nombre del Archivo</label><input type="text" id="edon" value="${doc.name}" required></div>
            <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:1rem;">Subido el: ${formatDateDisplay(doc.date)}</p>
            <button type="submit" class="btn-primary" style="width:100%">Guardar Cambios</button>
        </form>
    `);
    document.getElementById('edit-doc-form').onsubmit = async (e) => {
        e.preventDefault();
        await CortijoAPI.updateDocument(id, { name: document.getElementById('edon').value });
        renderDocuments(); closeModal();
    };
}

async function confirmDeleteDocument(id) {
    if (confirm("¿Seguro que quieres eliminar este documento? Se borrará de la lista (el archivo seguirá en Drive).")) {
        await CortijoAPI.deleteDocument(id);
        renderDocuments();
    }
}

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    document.getElementById('loader').style.display = 'flex';
    try {
        const docData = {
            id: Date.now(),
            name: file.name,
            type: file.type.split('/')[1] || 'doc',
            size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
            date: new Date().toISOString(),
            year: currentDocYear
        };

        await CortijoAPI.uploadAndRecordDocument(docData, file);
        alert("¡Documento subido y registrado con éxito!");
        renderDocuments();
    } catch (e) {
        alert("Fallo al subir: " + e.message);
    } finally {
        document.getElementById('loader').style.display = 'none';
        event.target.value = ''; // Limpiar input
    }
}

function previewDocument(url) {
    if (!url) return alert("Enlace no disponible");
    const match = url.match(/[-\w]{25,}/);
    if (!match) return window.open(url, '_blank');
    const id = match[0];
    openModal('Vista Previa', `<iframe src="https://drive.google.com/file/d/${id}/preview" style="width:100%;height:500px;border:none;border-radius:12px;"></iframe>`);
}

function downloadDocument(url) {
    if (!url) return alert("Enlace no disponible");
    const match = url.match(/[-\w]{25,}/);
    if (match) {
        // Enlace de descarga directa de Google Drive
        window.open(`https://drive.google.com/uc?export=download&id=${match[0]}`, '_blank');
    } else {
        window.open(url, '_blank');
    }
}

// --- TASKS ---
function changeTaskYear(year) { currentTaskYear = year; document.getElementById('task-year-display').textContent = year; renderTasks(); }

async function renderTasks() {
    const lists = { waiting: document.getElementById('list-waiting'), running: document.getElementById('list-running'), completed: document.getElementById('list-completed') };
    Object.values(lists).forEach(l => l.innerHTML = '...');
    try {
        const data = await CortijoAPI.getTasks(currentTaskYear);

        if (!Array.isArray(data)) {
            console.error("Respuesta del servidor no es un array:", data);
            throw new Error((data && data.error) ? data.error : "Error desconocido al obtener tareas");
        }

        cachedTasks = data.map(t => {
            let subs = [];
            try {
                if (t.subtasks && typeof t.subtasks === 'string' && t.subtasks.trim() !== "") {
                    subs = JSON.parse(t.subtasks);
                } else if (Array.isArray(t.subtasks)) {
                    subs = t.subtasks;
                }
            } catch (e) { console.warn("Error parseando subtasks:", e); }
            // Asegurar que cada subtask tenga campo notes
            subs = subs.map(s => typeof s === 'string' ? { text: s, completed: false, notes: '' } : { notes: '', ...s });
            return { ...t, subtasks: subs, notes: t.notes || '' };
        });

        Object.values(lists).forEach(l => l.innerHTML = '');
        let counts = { waiting: 0, running: 0, completed: 0 };

        cachedTasks.forEach(task => {
            counts[task.status]++;
            const completedSubs = task.subtasks.filter(s => s.completed).length;
            const totalSubs = task.subtasks.length;
            const percent = totalSubs > 0 ? Math.round((completedSubs / totalSubs) * 100) : 0;

            const card = document.createElement('div');
            card.className = 'task-card'; card.dataset.id = task.id;
            card.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                    <span class="task-title" onclick="openEditTaskModal(${task.id})">${task.title}</span>
                    <span class="priority-badge ${task.priority}">${task.priority}</span>
                </div>
                ${task.notes ? `<p class="task-card-notes" style="font-size:0.8rem; color:var(--text-muted); font-style:italic; margin: 4px 0 8px 0;">"${task.notes}"</p>` : ''}
                ${task.subtasks.length > 0 ? `
                <div class="card-subtasks" style="margin: 10px 0; display: grid; gap: 6px;">
                    ${task.subtasks.map((s, idx) => `
                        <div class="subtask-item-container">
                            <label class="subtask-label" style="display:flex; align-items:center; gap:8px; font-size:0.85rem; cursor:pointer; background:rgba(0,0,0,0.02); padding:4px 8px; border-radius:6px;">
                                <input type="checkbox" ${s.completed ? 'checked' : ''} onchange="updateSubtaskStatus(${task.id}, ${idx}, this.checked)" style="width:14px; height:14px;">
                                <span style="${s.completed ? 'text-decoration:line-through; opacity:0.5;' : ''}">${s.text}</span>
                            </label>
                            ${s.notes ? `<div style="font-size:0.75rem; color:var(--text-muted); padding-left:24px; margin-top:-2px;">• ${s.notes}</div>` : ''}
                        </div>
                    `).join('')}
                </div>` : ''}
                <div class="task-meta">Por: ${task.user}</div>
            `;
            lists[task.status].appendChild(card);
        });
        Object.keys(counts).forEach(s => document.getElementById(`count-${s}`).textContent = counts[s]);
        initSortable();
        if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (e) {
        console.error("Error tasks:", e);
        Object.values(lists).forEach(l => l.innerHTML = 'Error');
    }
}

function initSortable() {
    ['list-waiting', 'list-running', 'list-completed'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        new Sortable(el, {
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
            <div class="form-group"><label>Observaciones de la Tarea</label>
                <textarea id="tnotes" placeholder="Detalles adicionales..." rows="2"></textarea>
            </div>
            <div class="form-group"><label>Subprocesos (uno por línea)</label>
                <textarea id="tsubs" placeholder="Ej:\nComprar material\nLlamar al fontanero" rows="3"></textarea>
            </div>
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
        const subLines = document.getElementById('tsubs').value.split('\n').filter(l => l.trim() !== '');
        const subtasks = subLines.map(text => ({ text: text.trim(), completed: false, notes: '' }));

        await CortijoAPI.addTask({
            id: Date.now(),
            title: document.getElementById('tn').value,
            notes: document.getElementById('tnotes').value,
            status: 'waiting',
            user: currentUser.name,
            priority: document.getElementById('tp').value,
            year: currentTaskYear,
            subtasks: JSON.stringify(subtasks)
        });
        renderTasks(); closeModal();
    };
}

function openEditTaskModal(id) {
    const task = cachedTasks.find(t => t.id == id);
    if (!task) return;

    openModal('Editar Tarea', `
        <form id="et-form">
            <div class="form-group"><label>Título</label><input type="text" id="etn" value="${task.title}" required></div>
            
            <div class="form-group"><label>Observaciones</label>
                <textarea id="etnotes" rows="2" style="font-size:0.9rem;">${task.notes || ''}</textarea>
            </div>

            <div class="subtasks-editor" style="margin: 1rem 0;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
                    <label style="margin:0;">Subprocesos</label>
                    <button type="button" class="btn-small" onclick="addNewSubtaskField()">+ Añadir</button>
                </div>
                <div id="sub-edit-list" style="display:grid; gap:12px;">
                    ${task.subtasks.map((s, idx) => `
                        <div class="subtask-edit-row" style="background:var(--bg-main); padding:10px; border-radius:10px; border:1px solid var(--border);">
                            <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                                <input type="checkbox" class="sub-check" ${s.completed ? 'checked' : ''} style="width:18px;height:18px;">
                                <input type="text" class="sub-text" value="${s.text}" style="flex:1; padding:6px; border-radius:6px; border:1px solid var(--border);" placeholder="Nombre del subproceso">
                                <button type="button" class="btn-icon" onclick="this.closest('.subtask-edit-row').remove()" style="font-size:1rem;">🗑️</button>
                            </div>
                            <input type="text" class="sub-obs" value="${s.notes || ''}" style="width:100%; border:none; background:transparent; border-bottom:1px dashed var(--border); font-size:0.8rem; padding:4px;" placeholder="Observaciones de este subproceso...">
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="form-group"><label>Prioridad</label>
                <select id="etp">
                    <option value="low" ${task.priority === 'low' ? 'selected' : ''}>Baja</option>
                    <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>Media</option>
                    <option value="high" ${task.priority === 'high' ? 'selected' : ''}>Alta</option>
                </select>
            </div>
            <div style="display:flex;gap:10px;margin-top:1.5rem;">
                <button type="submit" class="btn-primary" style="flex:1">Guardar Todo</button>
                <button type="button" onclick="confirmDeleteTask(${id})" class="btn-danger" style="flex:1">Eliminar Tarea</button>
            </div>
        </form>
    `);

    document.getElementById('et-form').onsubmit = async (e) => {
        e.preventDefault();

        // Recoger todos los subprocesos de la interfaz
        const subRows = document.querySelectorAll('.subtask-edit-row');
        const updatedSubtasks = Array.from(subRows).map(row => ({
            text: row.querySelector('.sub-text').value.trim(),
            completed: row.querySelector('.sub-check').checked,
            notes: row.querySelector('.sub-obs').value.trim()
        })).filter(s => s.text !== "");

        await CortijoAPI.updateTask(id, {
            title: document.getElementById('etn').value,
            notes: document.getElementById('etnotes').value,
            priority: document.getElementById('etp').value,
            subtasks: JSON.stringify(updatedSubtasks)
        });

        renderTasks();
        closeModal();
    };
}

function addNewSubtaskField() {
    const container = document.getElementById('sub-edit-list');
    const div = document.createElement('div');
    div.className = 'subtask-edit-row';
    div.style.cssText = 'background:var(--bg-main); padding:10px; border-radius:10px; border:1px solid var(--border);';
    div.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
            <input type="checkbox" class="sub-check" style="width:18px;height:18px;">
            <input type="text" class="sub-text" style="flex:1; padding:6px; border-radius:6px; border:1px solid var(--border);" placeholder="Nuevo subproceso">
            <button type="button" class="btn-icon" onclick="this.closest('.subtask-edit-row').remove()" style="font-size:1rem;">🗑️</button>
        </div>
        <input type="text" class="sub-obs" style="width:100%; border:none; background:transparent; border-bottom:1px dashed var(--border); font-size:0.8rem; padding:4px;" placeholder="Observaciones de este subproceso...">
    `;
    container.appendChild(div);
}

async function updateSubtaskStatus(taskId, subIdx, isCompleted) {
    const task = cachedTasks.find(t => t.id == taskId);
    if (!task) return;

    task.subtasks[subIdx].completed = isCompleted;
    await CortijoAPI.updateTask(taskId, { subtasks: JSON.stringify(task.subtasks) });
    renderTasks();
}

async function confirmDeleteTask(id) {
    if (confirm("¿Seguro que quieres borrar esta tarea?")) {
        await CortijoAPI.deleteTask(id);
        renderTasks(); closeModal();
    }
}

// --- AUTH ---
async function handleCredentialResponse(r) {
    const p = JSON.parse(atob(r.credential.split('.')[1]));
    const email = p.email;

    document.getElementById('loader').style.display = 'flex';
    try {
        const auth = await CortijoAPI.checkEmail(email);

        if (auth.authorized) {
            currentUser = { name: p.name, avatar: p.picture, email: p.email };
            localStorage.setItem('user', JSON.stringify(currentUser));
            showAuthenticatedUI();
        } else {
            alert("Acceso Denegado: Tu correo (" + email + ") no está en la lista de usuarios autorizados. Contacta con el administrador del Cortijo.");
            signOut();
        }
    } catch (e) {
        alert("Error verificando permisos: " + e.message);
    } finally {
        document.getElementById('loader').style.display = 'none';
    }
}
function showAuthenticatedUI() {
    ['login-section', 'auth-container'].forEach(id => document.getElementById(id).classList.add('hidden'));
    ['main-nav', 'user-info', 'mobile-menu-btn'].forEach(id => document.getElementById(id)?.classList.remove('hidden'));
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
