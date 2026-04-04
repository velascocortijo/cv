// VERSION: V1.4.0 - Totales Anuales Centralizados y Reparto Inteligente

// App State
let currentUser = null;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let currentTaskYear = new Date().getFullYear();
let currentDocYear = new Date().getFullYear();
let currentExpYear = new Date().getFullYear();
let currentIncYear = new Date().getFullYear();

// Algoritmos delegados completamente al backend (V3)

let auditLog = [{ date: new Date().toLocaleString(), user: 'Sistema', action: 'Sesión iniciada' }];
let cachedExpenses = [];
let cachedIncome = [];
let cachedInventory = [];
let cachedInvCategories = [];
let cachedLocations = [];
let cachedTasks = [];
let cachedMembers = []; // Precargado desde Google Sheets
let bookings = [
    { id: 1, start: '2026-01-15', end: '2026-01-18', user: 'Juan', title: 'Fin de semana' },
    { id: 2, start: '2026-01-24', end: '2026-01-26', user: 'Admin', title: 'Mantenimiento' }
];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initYearSelectors();
    if (typeof lucide !== 'undefined') lucide.createIcons();
    setTimeout(() => {
        const loader = document.getElementById('loader');
        if (loader) loader.style.display = 'none';
    }, 1000);

    if (localStorage.getItem('user')) {
        currentUser = JSON.parse(localStorage.getItem('user'));
        showAuthenticatedUI();
    } else {
        showSection('home');
        initAuth(); // Inicializar Google Identity si no hay sesión
    }

    document.getElementById('expense-search')?.addEventListener('input', (e) => filterExpenses(e.target.value));
    document.getElementById('income-search')?.addEventListener('input', (e) => filterIncome(e.target.value));
    document.getElementById('inventory-search')?.addEventListener('input', (e) => filterInventory());
});

function initYearSelectors() {
    const years = [2024, 2025, 2026, 2027, 2028, 2029, 2030];
    const selectors = ['exp-year-selector', 'task-year-selector', 'doc-year-selector', 'inc-year-selector', 'split-year-select'];
    selectors.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.innerHTML = years.map(y => `<option value="${y}" ${y === currentYear ? 'selected' : ''}>Año ${y}</option>`).join('');
    });
}

// Utils
function getDriveDirectLink(url) {
    if (!url) return 'https://via.placeholder.com/60?text=Sin+Foto';
    if (url.includes('drive.google.com')) {
        const id = url.match(/[-\w]{25,}/);
        if (id) return `https://lh3.googleusercontent.com/u/0/d/${id[0]}`;
    }
    return url;
}

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
    document.querySelectorAll('.content-section, .hero-section').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById(sectionId + '-section') || document.getElementById(sectionId);
    if (target) target.classList.remove('hidden');

    // Deactivate all buttons in both navs
    document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));

    // Activate current button
    document.querySelectorAll('nav button').forEach(b => {
        if (b.getAttribute('onclick')?.includes(`'${sectionId}'`)) {
            b.classList.add('active');
        }
    });

    // Cerrar menú móvil al cambiar de sección
    document.getElementById('public-nav')?.classList.remove('show');
    document.getElementById('private-nav')?.classList.remove('show');

    // Cargas específicas
    if (sectionId === 'expenses') renderExpenses();
    if (sectionId === 'income') renderIncome();
    if (sectionId === 'inventory') {
        if (cachedInventory.length === 0) loadInventoryData().then(() => renderInventory());
        else renderInventory();
    }
    if (sectionId === 'calendar') renderCalendar();
    if (sectionId === 'tasks') renderTasks();
    if (sectionId === 'documents') renderDocuments();
    if (sectionId === 'profile') renderProfile();
    if (sectionId === 'split') renderPersonalZone(currentYear);
}

function showLogin() {
    document.getElementById('auth-container')?.classList.remove('hidden');
}

function hideLogin() {
    document.getElementById('auth-container')?.classList.add('hidden');
}

function toggleMobileMenu() {
    const navId = currentUser ? 'private-nav' : 'public-nav';
    const nav = document.getElementById(navId);
    if (nav) nav.classList.toggle('show');
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
    const display = document.getElementById('current-month-display');
    if (display) display.textContent = `${monthNames[currentMonth]} ${currentYear} `;

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
        addAudit(`Reserva: ${title} `);
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
function changeExpYear(year) { currentExpYear = year; const el = document.getElementById('exp-year-display'); if (el) el.textContent = year; renderExpenses(); }

async function renderExpenses() {
    const list = document.getElementById('expenses-body');
    if (!list) return;
    list.innerHTML = '<tr><td colspan="6">Cargando...</td></tr>';
    try {
        const data = await CortijoAPI.getExpenses(currentExpYear);
        cachedExpenses = data;
        filterExpenses(document.getElementById('expense-search')?.value || '');
    } catch (e) { list.innerHTML = '<tr><td colspan="6">Error de conexión</td></tr>'; }
}

async function filterExpenses(query) {
    const list = document.getElementById('expenses-body');
    const filtered = cachedExpenses.filter(e => String(e.concepto).toLowerCase().includes(query.toLowerCase()));
    let total = 0;
    list.innerHTML = filtered.map(e => {
        total += parseFloat(e.cantidad);
        return `<tr>
            <td>${formatDateDisplay(e.fecha)}</td>
            <td>${e.concepto} ${e.url_drive ? `<a href="${e.url_drive}" target="_blank" onclick="event.stopPropagation()">📎</a>` : ''}</td>
            <td class="amount">${parseFloat(e.cantidad).toFixed(2)}€</td>
            <td>${e.pagado_por || '-'}</td>
            <td>${e.notas || ''}</td>
            <td>
                <div style="display:flex; gap:8px;">
                    <button class="btn-icon" onclick="openEditExpenseModal('${e.id}')">✏️</button>
                    <button class="btn-icon" onclick="confirmDeleteExpense('${e.id}')">🗑️</button>
                </div>
            </td>
        </tr>`;
    }).join('');
    const balEl = document.getElementById('total-balance');
    if (balEl) balEl.textContent = `${total.toFixed(2)} €`;
}

// --- ZONA PERSONAL (NUEVO MOTOR V3) ---
async function renderPersonalZone(year) {
    const container = document.getElementById('personal-zone-container');
    if (!container) return;

    container.innerHTML = '<p style="text-align:center; grid-column:1/-1;">Sincronizando balances con el motor central...</p>';

    try {
        const balances = await CortijoAPI.getBalances(year);

        if (balances.length === 0) {
            container.innerHTML = '<p style="text-align:center; grid-column:1/-1;">No se encontraron operaciones para este año.</p>';
            return;
        }

        container.innerHTML = balances.map(b => {
            const isPositive = b.saldo > 0;
            const isNegative = b.saldo < 0;
            const colorClass = isPositive ? 'var(--success)' : (isNegative ? 'var(--danger)' : 'var(--text-muted)');
            const bgBadge = isPositive ? 'rgba(52, 211, 153, 0.1)' : (isNegative ? 'rgba(239, 68, 68, 0.1)' : 'rgba(156, 163, 175, 0.1)');

            return `
            <div class="card" style="padding:1.5rem; border-top: 4px solid ${colorClass}; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1); border-radius:12px;">
                <div style="display:flex; align-items:center; gap:15px; margin-bottom:1rem; border-bottom:1px solid var(--border); padding-bottom:1rem;">
                    <div style="width:50px; height:50px; border-radius:50%; background:var(--bg-main); color:var(--text-main); display:flex; align-items:center; justify-content:center; font-size:1.5rem; font-weight:bold;">
                        ${b.nombre.charAt(0).toUpperCase()}
                    </div>
                    <h3 style="margin:0;">${b.nombre}</h3>
                </div>
                
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:1rem;">
                    <div style="background:var(--bg-main); padding:10px; border-radius:8px;">
                        <small style="color:var(--text-muted); display:block; font-size:0.75rem;">Aportado (Ingresos)</small>
                        <strong style="color:var(--success);">${parseFloat(b.ingresos).toFixed(2)}€</strong>
                    </div>
                    <div style="background:var(--bg-main); padding:10px; border-radius:8px;">
                        <small style="color:var(--text-muted); display:block; font-size:0.75rem;">Le corresponde pagar</small>
                        <strong style="color:var(--text-main);">${parseFloat(b.parte).toFixed(2)}€</strong>
                    </div>
                </div>

                <div style="text-align:center; padding:15px; background:${bgBadge}; border-radius:8px; margin-top:auto;">
                    <small style="text-transform:uppercase; font-size:0.75rem; font-weight:bold; color:${colorClass};">
                        ${isPositive ? 'El cortijo te debe' : (isNegative ? 'Debes ingresar a la hucha' : 'Cuentas al día')}
                    </small>
                    <h2 style="margin:5px 0 0 0; color:${colorClass}; font-size:1.8rem;">
                        ${Math.abs(b.saldo).toFixed(2)}€
                    </h2>
                </div>
            </div>`;
        }).join('');

    } catch (error) {
        container.innerHTML = '<p style="color:var(--danger); grid-column:1/-1;">Error conectando con la Bóveda Central de Balances.</p>';
        console.error("Error en Balances V3:", error);
    }
}

function openExpenseModal() {
    const membersOpts = (cachedMembers || []).map(m => `<option value="${m}">${m}</option>`).join('');
    openModal('Añadir Gasto', `
        <form id="ex-form">
            <div class="form-group"><label>Concepto</label><input type="text" id="exc" placeholder="Ej: Pintura Fachada" required></div>
            <div class="form-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:15px;">
                <div class="form-group"><label>Importe (€)</label><input type="number" step="0.01" id="exa" required></div>
                <div class="form-group"><label>Fecha</label><input type="date" id="exd" value="${new Date().toISOString().split('T')[0]}" required></div>
            </div>
            <div class="form-group">
                <label>Pagado por</label>
                <select id="exp">${membersOpts}</select>
            </div>
            <div class="form-group"><label>Notas</label><textarea id="exn"></textarea></div>
            <div class="form-group">
                <label>Factura / Justificante (Opcional)</label>
                <input type="file" id="exf" accept="image/*,.pdf" style="font-size:0.8rem;">
            </div>
            <button type="submit" id="exb" class="btn-primary" style="width:100%">💾 Guardar Gasto Inteligente</button>
        </form>
    `);

    document.getElementById('ex-form').onsubmit = async (e) => {
        e.preventDefault();
        const btn = document.getElementById('exb');
        btn.disabled = true;
        btn.textContent = 'Guardando...';

        const file = document.getElementById('exf').files[0];

        const data = {
            id: Date.now(),
            user_id: currentUser ? currentUser.name : '',
            concepto: document.getElementById('exc').value,
            cantidad: document.getElementById('exa').value,
            fecha: document.getElementById('exd').value,
            pagado_por: document.getElementById('exp').value,
            notas: document.getElementById('exn').value,
            year: currentExpYear
        };

        if (file) {
            const base64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result.split(',')[1]);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
            data.fileBase64 = base64;
            data.fileName = file.name;
            data.mimeType = file.type || 'application/octet-stream';
        }

        await CortijoAPI.createExpense(data);
        renderExpenses();
        closeModal();
    };
}

function openEditExpenseModal(id) {
    const exp = cachedExpenses.find(e => e.id == id);
    openModal('Editar Gasto', `
        <form id="ee-form">
            <div class="form-group"><label>Concepto</label><input type="text" id="eec" value="${exp.concepto}"></div>
            <div class="form-group"><label>Importe</label><input type="number" step="0.01" id="eea" value="${exp.cantidad}"></div>
            <div class="form-group"><label>Pagado por</label><select id="eep">${cachedMembers.map(m => `<option value="${m}" ${m == exp.pagado_por ? 'selected' : ''}>${m}</option>`).join('')}</select></div>
            <div class="form-group"><label>Notas</label><textarea id="een">${exp.notas || ''}</textarea></div>
            <button type="submit" class="btn-primary" style="width:100%">Guardar Cambios</button>
        </form>`);
    document.getElementById('ee-form').onsubmit = async (e) => {
        e.preventDefault();
        await CortijoAPI.updateExpense(id, {
            concepto: document.getElementById('eec').value,
            cantidad: document.getElementById('eea').value,
            pagado_por: document.getElementById('eep').value,
            notas: document.getElementById('een').value
        });
        renderExpenses(); closeModal();
    };
}

async function confirmDeleteExpense(id) { if (confirm("¿Eliminar?")) { await CortijoAPI.deleteExpense(id); renderExpenses(); } }

// --- INCOME ---
function changeIncYear(year) {
    currentIncYear = year;
    const el = document.getElementById('inc-year-display');
    if (el) el.textContent = year;
    renderIncome();
}

async function renderIncome() {
    const list = document.getElementById('income-body');
    if (!list) return;
    list.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:2rem;">Cargando ingresos...</td></tr>';
    try {
        const data = await CortijoAPI.getIncome(currentIncYear);
        cachedIncome = data;
        filterIncome(document.getElementById('income-search')?.value || '');
    } catch (e) {
        list.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:2rem; color:var(--danger);">Error al cargar ingresos</td></tr>';
    }
}

function filterIncome(query) {
    const list = document.getElementById('income-body');
    const filtered = cachedIncome.filter(e =>
        String(e.concepto).toLowerCase().includes(query.toLowerCase()) ||
        String(e.categoria).toLowerCase().includes(query.toLowerCase()) ||
        String(e.recibido_de).toLowerCase().includes(query.toLowerCase())
    );

    let total = 0;
    list.innerHTML = filtered.length === 0 ?
        '<tr><td colspan="6" style="text-align:center; padding:2rem; color:var(--text-muted);">No se encontraron ingresos</td></tr>' :
        filtered.map(e => {
            const importe = parseFloat(e.importe) || 0;
            total += importe;
            const catLower = String(e.categoria).toLowerCase();
            const badgeColor = catLower.includes('aportaci') ? 'var(--primary)' : (catLower.includes('extra') ? 'var(--secondary)' : 'var(--accent)');
            return `
            <tr>
                <td>${formatDateDisplay(e.fecha)}</td>
                <td>
                    <div style="font-weight:600;">${e.concepto}</div>
                    ${e.notas ? `<div style="font-size:0.75rem; color:var(--text-muted);">${e.notas}</div>` : ''}
                </td>
                <td><span class="badge" style="background:${badgeColor}; color:white; font-size:0.7rem; font-weight:normal;">${e.categoria}</span></td>
                <td class="amount" style="color:var(--success); font-weight:700;">+${importe.toFixed(2)}€</td>
                <td>${e.recibido_de || '-'}</td>
                <td>
                    <div style="display:flex; gap:8px;">
                        ${e.url_drive ? `<button class="btn-icon" onclick="window.open('${e.url_drive}', '_blank')" title="Ver Factura/Justificante">📄</button>` : ''}
                        <button class="btn-icon" onclick="openEditIncomeModal('${e.id}')" title="Editar">✏️</button>
                        <button class="btn-icon" onclick="confirmDeleteIncome('${e.id}')" title="Borrar">🗑️</button>
                    </div>
                </td>
            </tr>`;
        }).join('');

    const el = document.getElementById('total-income');
    if (el) el.textContent = `${total.toFixed(2)} €`;
}

function openIncomeModal() {
    openModal('Añadir Ingreso', `
        <form id="in-form">
            <div class="form-group">
                <label>Concepto / Referencia</label>
                <input type="text" id="inc-c" placeholder="Ej: Venta Aceituna Coop." required>
            </div>
            <div class="form-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
                <div class="form-group">
                    <label>Importe Bruto</label>
                    <input type="number" step="0.01" id="inc-a" placeholder="0.00" required>
                </div>
                <div class="form-group">
                    <label>Fecha del Ingreso</label>
                    <input type="date" id="inc-d" value="${new Date().toISOString().split('T')[0]}" required>
                </div>
            </div>
            <div class="form-group">
                <label>Categoría</label>
                <select id="inc-cat">
                    ${['Aportación Familiar', 'Ingreso Extra', 'Otros'].map(c => `<option value="${c}">${c}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Origen (Recibido de)</label>
                <input type="text" id="inc-r" placeholder="Ej: Cooperativa Nuestra Sra. del Rosario">
            </div>
            <div class="form-group">
                <label>Notas adicionales</label>
                <textarea id="inc-n" placeholder="Detalles de la liquidación, kilos, etc."></textarea>
            </div>
            <div class="form-group">
                <label>Documento / Justificante (Opcional)</label>
                <input type="file" id="inc-f" accept="image/*,.pdf">
                <p style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">Se subirá automáticamente a tu Google Drive.</p>
            </div>
            <button type="submit" id="inc-btn" class="btn-primary" style="width:100%; margin-top:10px;">💾 Guardar Ingreso</button>
        </form>
    `);

    document.getElementById('in-form').onsubmit = async (e) => {
        e.preventDefault();
        const btn = document.getElementById('inc-btn');
        btn.disabled = true;
        btn.textContent = 'Subiendo a Drive...';

        const file = document.getElementById('inc-f').files[0];

        const data = {
            id: Date.now(),
            user_id: currentUser ? currentUser.name : '',
            concepto: document.getElementById('inc-c').value,
            importe: document.getElementById('inc-a').value,
            fecha: document.getElementById('inc-d').value,
            categoria: document.getElementById('inc-cat').value,
            recibido_de: document.getElementById('inc-r').value,
            notas: document.getElementById('inc-n').value,
            year: currentIncYear
        };

        await CortijoAPI.createIncome(data, file);
        renderIncome();
        closeModal();
    };
}

function openEditIncomeModal(id) {
    const inc = cachedIncome.find(i => i.id == id);
    if (!inc) return;

    openModal('Editar Ingreso', `
        <form id="ei-form">
            <div class="form-group">
                <label>Concepto</label>
                <input type="text" id="eic-c" value="${inc.concepto || ''}" required>
            </div>
            <div class="form-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
                <div class="form-group">
                    <label>Importe</label>
                    <input type="number" step="0.01" id="eic-a" value="${inc.importe || 0}" required>
                </div>
                <div class="form-group">
                    <label>Categoría</label>
                    <select id="eic-cat">
                        ${['Aportación Familiar', 'Ingreso Extra', 'Otros'].map(c => `<option value="${c}" ${c === inc.categoria ? 'selected' : ''}>${c}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Recibido de</label>
                <input type="text" id="eic-r" value="${inc.recibido_de || ''}">
            </div>
            <div class="form-group">
                <label>Notas adicionales</label>
                <textarea id="eic-n">${inc.notas || ''}</textarea>
            </div>
            <button type="submit" class="btn-primary" style="width:100%; margin-top:10px;">Actualizar Ingreso</button>
        </form>
    `);

    document.getElementById('ei-form').onsubmit = async (e) => {
        e.preventDefault();
        const data = {
            concepto: document.getElementById('eic-c').value,
            importe: document.getElementById('eic-a').value,
            categoria: document.getElementById('eic-cat').value,
            recibido_de: document.getElementById('eic-r').value,
            notas: document.getElementById('eic-n').value
        };
        await CortijoAPI.updateIncome(id, data);
        renderIncome();
        closeModal();
    };
}

async function confirmDeleteIncome(id) {
    if (confirm("¿Estás seguro de que deseas eliminar este ingreso? Esta acción no se puede deshacer.")) {
        await CortijoAPI.deleteIncome(id);
        renderIncome();
    }
}

function exportIncome() {
    if (cachedIncome.length === 0) return alert("No hay datos para exportar");
    const headers = ["Fecha", "Concepto", "Categoría", "Importe", "Recibido de", "Notas"];
    const rows = cachedIncome.map(i => [
        formatDateDisplay(i.fecha),
        i.concepto,
        i.categoria,
        i.importe,
        i.recibido_de,
        i.notas || ""
    ]);

    let csvContent = "data:text/csv;charset=utf-8," +
        headers.join(",") + "\n" +
        rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Ingresos_${currentIncYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --- INVENTORY ---
async function loadInventoryData() { try { cachedInventory = await CortijoAPI.getInventory(); } catch (e) { } }
function renderInventory() {
    const list = document.getElementById('inventory-body');
    if (!list) return;
    list.innerHTML = cachedInventory.map(i => `<tr><td><img src="${getDriveDirectLink(i.foto_url)}" style="width:40px;height:40px;border-radius:4px;"></td><td>${i.articulo}</td><td>${i.categoria}</td><td>${i.cantidad}</td><td>${i.estado}</td><td>${i.ubicacion}</td><td><button class="btn-icon" onclick="deleteInventoryItem('${i.id}')">🗑️</button></td></tr>`).join('');
}
async function deleteInventoryItem(id) { if (confirm("¿Borrar?")) { await CortijoAPI.deleteInventory(id); loadInventoryData().then(() => renderInventory()); } }
function openInventoryModal() {
    openModal('Añadir Inventario', `
        <form id="inv-form">
            <div class="form-group"><label>Artículo</label><input type="text" id="inva" required></div>
            <div class="form-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:15px;">
                <div class="form-group"><label>Categoría</label><select id="invc"><option value="Herramientas">Herramientas</option><option value="Muebles">Muebles</option><option value="Cocina">Cocina</option></select></div>
                <div class="form-group"><label>Cantidad</label><input type="number" id="invq" value="1" required></div>
            </div>
            <div class="form-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:15px;">
                <div class="form-group"><label>Estado</label><select id="inve"><option value="Bueno">Bueno</option><option value="Regular">Regular</option><option value="Malo">Malo</option></select></div>
                <div class="form-group"><label>Ubicación</label><input type="text" id="invu" placeholder="Ej: Trastero superior"></div>
            </div>
            <button type="submit" class="btn-primary" style="width:100%; margin-top:10px;">Guardar Objeto</button>
        </form>
    `);
    document.getElementById('inv-form').onsubmit = async (e) => {
        e.preventDefault();
        await CortijoAPI.createInventory({ id: Date.now(), articulo: document.getElementById('inva').value, categoria: document.getElementById('invc').value, cantidad: document.getElementById('invq').value, estado: document.getElementById('inve').value, ubicacion: document.getElementById('invu').value, timestamp: new Date().toISOString() });
        loadInventoryData().then(() => renderInventory());
        closeModal();
    };
}

// --- DOCUMENTS ---
function changeDocYear(year) { currentDocYear = year; renderDocuments(); }
async function renderDocuments() {
    const list = document.getElementById('document-list');
    if (!list) return;
    try {
        const data = await CortijoAPI.getDocuments(currentDocYear);
        list.innerHTML = data.map(d => `<div class="document-item"><span>📄</span><h4>${d.name}</h4><button class="btn-small" onclick="window.open('${d.url_drive}', '_blank')">Ver</button></div>`).join('');
    } catch (e) { }
}
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    openModal('Nombrar Documento', `
       <form id="doc-form">
           <div class="form-group"><label>Nombre del Documento</label><input type="text" id="docn" value="${file.name.split('.')[0]}" required></div>
           <button type="submit" id="docbtn" class="btn-primary" style="width:100%">Subir Documento</button>
       </form>
    `);
    document.getElementById('doc-form').onsubmit = async (e) => {
        e.preventDefault();
        const btn = document.getElementById('docbtn');
        btn.disabled = true; btn.textContent = 'Subiendo al Cortijo...';
        await CortijoAPI.uploadAndRecordDocument({ id: Date.now(), name: document.getElementById('docn').value, year: currentDocYear, date: new Date().toISOString() }, file);
        renderDocuments();
        closeModal();
    };
}

// --- TASKS ---
function changeTaskYear(year) { currentTaskYear = year; renderTasks(); }
function openTaskModal() {
    openModal('Nueva Tarea', `
        <form id="t-form">
            <div class="form-group"><label>Misión/Tarea</label><input type="text" id="tt" placeholder="Ej: Reparar tejado" required></div>
            <div class="form-group"><label>Prioridad</label><select id="tp"><option value="Alta">Alta</option><option value="Media">Media</option><option value="Baja">Baja</option></select></div>
            <button type="submit" class="btn-primary" style="width:100%">Crear Tarea</button>
        </form>
    `);
    document.getElementById('t-form').onsubmit = async (e) => {
        e.preventDefault();
        await CortijoAPI.createTask({ id: Date.now(), title: document.getElementById('tt').value, priority: document.getElementById('tp').value, status: 'waiting', year: currentTaskYear, date: new Date().toISOString() });
        renderTasks();
        closeModal();
    };
}
async function renderTasks() {
    const lists = { waiting: document.getElementById('list-waiting'), running: document.getElementById('list-running'), completed: document.getElementById('list-completed') };
    try {
        const data = await CortijoAPI.getTasks(currentTaskYear);
        Object.values(lists).forEach(l => l.innerHTML = '');
        data.forEach(t => {
            const card = document.createElement('div'); card.className = 'task-card'; card.innerHTML = `<strong>${t.title}</strong><br><small>${t.priority}</small>`;
            if (lists[t.status]) lists[t.status].appendChild(card);
        });
    } catch (e) { }
}

// --- AUTH & UI ---
function initAuth() {
    if (typeof google === 'undefined') return;
    google.accounts.id.initialize({
        client_id: window.CONFIG?.GOOGLE_CLIENT_ID || '991206649735-8h0psdve7tkhpghr6g8e55e5u5r2dkhl.apps.googleusercontent.com',
        callback: handleCredentialResponse
    });
}

async function handleCredentialResponse(r) {
    const p = JSON.parse(atob(r.credential.split('.')[1]));
    const auth = await CortijoAPI.checkEmail(p.email);
    if (auth.authorized) {
        currentUser = { name: p.name, avatar: p.picture, email: p.email };
        localStorage.setItem('user', JSON.stringify(currentUser));
        showAuthenticatedUI();
    } else { alert("Usuario no autorizado"); }
}

async function showAuthenticatedUI() {
    ['login-section', 'auth-container', 'public-nav'].forEach(id => document.getElementById(id)?.classList.add('hidden'));
    ['private-nav', 'user-info', 'mobile-menu-btn'].forEach(id => document.getElementById(id)?.classList.remove('hidden'));
    document.getElementById('user-name').textContent = currentUser.name;
    document.getElementById('user-avatar').src = currentUser.avatar;

    try {
        cachedMembers = await CortijoAPI.getConfiguracion();
    } catch (e) {
        cachedMembers = ["Antonio", "Jorge", "Raquel", "Rebeca", "Tete", "Angelita"];
    }

    showSection('calendar');
}

function signOut() { localStorage.removeItem('user'); location.reload(); }
function openModal(t, c) { document.getElementById('modal-title').textContent = t; document.getElementById('modal-content').innerHTML = c; document.getElementById('modal-container').classList.remove('hidden'); }
function closeModal() { document.getElementById('modal-container').classList.add('hidden'); }

function renderProfile() {
    if (!currentUser) return;
    document.getElementById('profile-name').textContent = currentUser.name;
    document.getElementById('profile-email').textContent = currentUser.email;
    document.getElementById('profile-avatar').src = currentUser.avatar;
}

async function manualBackup() { await CortijoAPI.triggerBackup(currentUser.email); alert("Copia iniciada"); }
async function loadAuditLog() {
    const data = await CortijoAPI.listAudit(currentUser.email);
    const container = document.getElementById('audit-log-container');
    if (container) container.innerHTML = data.map(r => `<div style="font-size:0.8rem;">${r.timestamp}: ${r.accion}</div>`).join('');
}
