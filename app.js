// VERSION: V1.1.7 - Base original restaurada con lógica de Angelita integrada

// App State
let currentUser = null;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let currentTaskYear = new Date().getFullYear();
let currentDocYear = new Date().getFullYear();
let currentExpYear = new Date().getFullYear();
let currentIncYear = new Date().getFullYear();

let auditLog = [{ date: new Date().toLocaleString(), user: 'Sistema', action: 'Sesión iniciada' }];
let cachedExpenses = [];
let cachedIncome = [];
let cachedInventory = [];
let cachedInvCategories = [];
let cachedLocations = [];
let cachedTasks = [];
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
    if (sectionId === 'split') renderExpenseSplit();
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

// --- REPARTO DE GASTOS (CON LÓGICA DE ANGELITA INTEGRADA) ---
async function renderExpenseSplit() {
    const yearSelect = document.getElementById('split-year-select');
    if (!yearSelect) return;
    const selectedYear = yearSelect.value;
    
    const summaryBox = document.getElementById('split-summary-box');
    const balancesContainer = document.getElementById('split-balances-container');
    const debtsContainer = document.getElementById('split-debts-container');

    if (!summaryBox || !balancesContainer || !debtsContainer) return;

    summaryBox.innerHTML = '<p>Cargando datos...</p>';
    balancesContainer.innerHTML = '<p>Calculando saldos...</p>';
    debtsContainer.innerHTML = '<p>Buscando deudas...</p>';

    document.getElementById('loader').style.display = 'flex';
    let expenses = [];
    try {
        expenses = await CortijoAPI.getExpenses(selectedYear);
    } catch (e) {
        summaryBox.innerHTML = '<p style="color:var(--danger)">Error al cargar gastos.</p>';
        document.getElementById('loader').style.display = 'none';
        return;
    }
    document.getElementById('loader').style.display = 'none';

    let totalExpenses = 0;
    const paidByPerson = {};
    const percentages = window.CONFIG.EXPENSE_PERCENTAGES || {};
    
    Object.keys(percentages).forEach(person => { paidByPerson[person] = 0; });

    expenses.forEach(exp => {
        const amount = parseFloat(exp.cantidad) || 0;
        totalExpenses += amount;
        const payer = exp.pagado_por || 'Otros';
        if (paidByPerson[payer] !== undefined) paidByPerson[payer] += amount;
    });

    const activeBalances = [];
    const excludedData = [];

    Object.keys(paidByPerson).forEach(person => {
        const paid = paidByPerson[person];
        const percentage = percentages[person] || 0;
        const shouldHavePaid = (totalExpenses * percentage) / 100;
        const balance = paid - shouldHavePaid;
        const status = window.CONFIG.FAMILY_STATUS[person] || 'activo';

        if (status === 'excluida_gastos') {
            if (percentage > 0) {
                excludedData.push({ person, percentage, totalExpenses, shouldHavePaid, year: selectedYear });
                saveExcludedPending(person, selectedYear, shouldHavePaid);
            }
        } else {
            if (percentage > 0 || paid > 0) {
                activeBalances.push({ person, paid, shouldHavePaid, balance });
            }
        }
    });

    summaryBox.innerHTML = `
        <h3 style="font-size:2rem; color:var(--primary); margin-bottom:0.5rem;">${totalExpenses.toFixed(2)} €</h3>
        <p style="color:var(--text-muted);">Gasto total familiar en ${selectedYear}</p>
    `;

    balancesContainer.innerHTML = activeBalances.map(b => {
        const color = b.balance >= 0 ? 'var(--success)' : 'var(--danger)';
        return `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid var(--bg-main);">
                <div><strong>${b.person}</strong><div style="font-size:0.8rem; color:var(--text-muted);">Pagado: ${b.paid.toFixed(2)}€ | Debería: ${b.shouldHavePaid.toFixed(2)}€</div></div>
                <div style="font-weight:bold; color:${color};">${b.balance >= 0 ? '+' : ''}${b.balance.toFixed(2)} €</div>
            </div>`;
    }).join('');

    renderExcludedBalances(excludedData);

    // Algoritmo de reembolsos optimizado
    const payments = generarReembolsos(activeBalances);
    debtsContainer.innerHTML = payments.length === 0 ? 
        '<p style="text-align:center; padding:2rem; color:var(--text-muted);">✅ Cuentas equilibradas</p>' :
        payments.map(p => `
            <div style="background:var(--bg-main); padding:1rem; border-radius:8px; margin-bottom:10px; display:flex; justify-content:space-between; border-left: 4px solid var(--primary);">
                <span><strong>${p.from}</strong> → <strong>${p.to}</strong></span>
                <strong>${p.amount.toFixed(2)} €</strong>
            </div>`).join('');
}

function renderExcludedBalances(data) {
    const container = document.getElementById('excluded-balances-container');
    if (!container) return;
    container.innerHTML = data.map(ex => `
        <div style="background:var(--bg-main); padding:1rem; border-radius:12px; border-left:4px solid var(--accent); margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
            <div><strong>${ex.person}</strong><div style="font-size:0.8rem; color:var(--text-muted);">Aportación Teórica (${ex.percentage}%)</div></div>
            <div style="font-size:1.2rem; font-weight:700; color:var(--accent);">${ex.shouldHavePaid.toFixed(2)} €</div>
        </div>`).join('');
}

async function saveExcludedPending(person, year, amount) {
    try { await CortijoAPI.savePendingBalance({ año: year, familiar: person, aportacionIdeal: amount, fechaActualizacion: new Date().toISOString(), notas: 'Cálculo automático' }); } catch (e) {}
}

async function calculateFinalLiquidation() {
    const resultContainer = document.getElementById('final-liquidation-result');
    if (!resultContainer) return;
    resultContainer.classList.remove('hidden');
    resultContainer.innerHTML = '<p>Calculando liquidación final...</p>';
    try {
        const res = await CortijoAPI.calculateSettlement(currentYear);
        const color = res.liquidacionFinal >= 0 ? 'var(--success)' : 'var(--danger)';
        resultContainer.innerHTML = `
            <div style="text-align:center; padding:1.5rem; background:var(--bg-card); border-radius:16px;">
                <h4>Liquidación Anual Angelita (${currentYear})</h4>
                <div style="font-size:2rem; font-weight:700; color:${color}; margin:1rem 0;">${res.liquidacionFinal.toFixed(2)} €</div>
                <p style="font-size:0.8rem; color:var(--text-muted);">Base: ${res.parteAngelita.toFixed(2)}€ | Pendiente: ${res.saldoPendiente.toFixed(2)}€</p>
            </div>`;
    } catch (e) { resultContainer.innerHTML = '<p>Error.</p>'; }
}

function generarReembolsos(balances) {
    let debtors = balances.filter(b => b.balance < -0.01).map(b => ({ person: b.person, amount: Math.abs(b.balance) }));
    let creditors = balances.filter(b => b.balance > 0.01).map(b => ({ person: b.person, amount: b.balance }));
    const payments = [];
    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
        let settled = Math.min(debtors[i].amount, creditors[j].amount);
        payments.push({ from: debtors[i].person, to: creditors[j].person, amount: settled });
        debtors[i].amount -= settled; creditors[j].amount -= settled;
        if (debtors[i].amount < 0.01) i++;
        if (creditors[j].amount < 0.01) j++;
    }
    return payments;
}

// --- EXPENSES ---
function changeExpYear(year) { currentExpYear = year; const el = document.getElementById('exp-year-display'); if(el) el.textContent = year; renderExpenses(); }

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
                    <button class="btn-icon" onclick="openEditExpenseModal(${e.id})">✏️</button>
                    <button class="btn-icon" onclick="confirmDeleteExpense('${e.id}')">🗑️</button>
                </div>
            </td>
        </tr>`;
    }).join('');
    const balEl = document.getElementById('total-balance');
    if (balEl) balEl.textContent = `${total.toFixed(2)} €`;
}

function openExpenseModal() {
    openModal('Añadir Gasto', `<form id="ex-form"><div class="form-group"><label>Concepto</label><input type="text" id="exc" required></div><div class="form-group"><label>Importe</label><input type="number" step="0.01" id="exa" required></div><div class="form-group"><label>Fecha</label><input type="date" id="exd" value="${new Date().toISOString().split('T')[0]}" required></div><div class="form-group"><label>Pagado por</label><select id="exp">${CONFIG.FAMILY_MEMBERS.map(m => `<option value="${m}">${m}</option>`).join('')}</select></div><div class="form-group"><label>Notas</label><textarea id="exn"></textarea></div><div class="form-group"><label>Ticket</label><input type="file" id="exf"></div><button type="submit" id="exb" class="btn-primary" style="width:100%">Guardar</button></form>`);
    document.getElementById('ex-form').onsubmit = async (e) => {
        e.preventDefault();
        const btn = document.getElementById('exb'); btn.disabled = true; btn.textContent = 'Guardando...';
        const data = { id: Date.now(), concepto: document.getElementById('exc').value, cantidad: document.getElementById('exa').value, fecha: document.getElementById('exd').value, pagado_por: document.getElementById('exp').value, notas: document.getElementById('exn').value, year: currentExpYear };
        await CortijoAPI.createExpense(data, document.getElementById('exf').files[0]);
        renderExpenses(); closeModal();
    };
}

function openEditExpenseModal(id) {
    const exp = cachedExpenses.find(e => e.id == id);
    openModal('Editar Gasto', `<form id="ee-form"><div class="form-group"><label>Concepto</label><input type="text" id="eec" value="${exp.concepto}"></div><div class="form-group"><label>Importe</label><input type="number" step="0.01" id="eea" value="${exp.cantidad}"></div><div class="form-group"><label>Pagado por</label><select id="eep">${CONFIG.FAMILY_MEMBERS.map(m => `<option value="${m}" ${m==exp.pagado_por ? 'selected' : ''}>${m}</option>`).join('')}</select></div><button type="submit" class="btn-primary" style="width:100%">Guardar</button></form>`);
    document.getElementById('ee-form').onsubmit = async (e) => {
        e.preventDefault();
        await CortijoAPI.updateExpense(id, { concepto: document.getElementById('eec').value, cantidad: document.getElementById('eea').value, pagado_por: document.getElementById('eep').value });
        renderExpenses(); closeModal();
    };
}

async function confirmDeleteExpense(id) { if (confirm("¿Eliminar?")) { await CortijoAPI.deleteExpense(id); renderExpenses(); } }

// --- INCOME ---
function changeIncYear(year) { currentIncYear = year; const el = document.getElementById('inc-year-display'); if(el) el.textContent = year; renderIncome(); }

async function renderIncome() {
    const list = document.getElementById('income-body');
    if (!list) return;
    list.innerHTML = '<tr><td colspan="6">Cargando...</td></tr>';
    try {
        const data = await CortijoAPI.getIncome(currentIncYear);
        cachedIncome = data;
        filterIncome(document.getElementById('income-search')?.value || '');
    } catch (e) { list.innerHTML = '<tr><td colspan="6">Error</td></tr>'; }
}

function filterIncome(query) {
    const list = document.getElementById('income-body');
    const filtered = cachedIncome.filter(e => String(e.concepto).toLowerCase().includes(query.toLowerCase()));
    let total = 0;
    list.innerHTML = filtered.map(e => {
        total += parseFloat(e.importe);
        return `<tr><td>${formatDateDisplay(e.fecha)}</td><td>${e.concepto}</td><td>${e.categoria}</td><td class="amount" style="color:var(--success);">+${parseFloat(e.importe).toFixed(2)}€</td><td>${e.recibido_de}</td><td><button class="btn-icon" onclick="confirmDeleteIncome(${e.id})">🗑️</button></td></tr>`;
    }).join('');
    const el = document.getElementById('total-income'); if(el) el.textContent = `${total.toFixed(2)} €`;
}

function openIncomeModal() {
    openModal('Añadir Ingreso', `<form id="in-form"><div class="form-group"><label>Concepto</label><input type="text" id="inc" required></div><div class="form-group"><label>Importe</label><input type="number" step="0.01" id="ina" required></div><div class="form-group"><label>Origen</label><input type="text" id="inf"></div><button type="submit" class="btn-primary" style="width:100%">Guardar</button></form>`);
    document.getElementById('in-form').onsubmit = async (e) => {
        e.preventDefault();
        await CortijoAPI.createIncome({ id: Date.now(), concepto: document.getElementById('inc').value, importe: document.getElementById('ina').value, recibido_de: document.getElementById('inf').value, fecha: new Date().toISOString(), year_selector: currentIncYear });
        renderIncome(); closeModal();
    };
}

async function confirmDeleteIncome(id) { if(confirm("¿Eliminar?")) { await CortijoAPI.deleteIncome(id); renderIncome(); } }

// --- INVENTORY ---
async function loadInventoryData() { try { cachedInventory = await CortijoAPI.getInventory(); } catch(e){} }
function renderInventory() {
    const list = document.getElementById('inventory-body');
    if (!list) return;
    list.innerHTML = cachedInventory.map(i => `<tr><td><img src="${getDriveDirectLink(i.foto_url)}" style="width:40px;height:40px;border-radius:4px;"></td><td>${i.articulo}</td><td>${i.categoria}</td><td>${i.cantidad}</td><td>${i.estado}</td><td>${i.ubicacion}</td><td><button class="btn-icon" onclick="deleteInventoryItem(${i.id})">🗑️</button></td></tr>`).join('');
}
async function deleteInventoryItem(id) { if(confirm("¿Borrar?")) { await CortijoAPI.deleteInventory(id); loadInventoryData().then(() => renderInventory()); } }

// --- DOCUMENTS ---
function changeDocYear(year) { currentDocYear = year; renderDocuments(); }
async function renderDocuments() {
    const list = document.getElementById('document-list');
    if (!list) return;
    try {
        const data = await CortijoAPI.getDocuments(currentDocYear);
        list.innerHTML = data.map(d => `<div class="document-item"><span>📄</span><h4>${d.name}</h4><button class="btn-small" onclick="window.open('${d.url_drive}', '_blank')">Ver</button></div>`).join('');
    } catch(e){}
}
async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    await CortijoAPI.uploadAndRecordDocument({ id: Date.now(), name: file.name, year: currentDocYear, date: new Date().toISOString() }, file);
    renderDocuments();
}

// --- TASKS ---
function changeTaskYear(year) { currentTaskYear = year; renderTasks(); }
async function renderTasks() {
    const lists = { waiting: document.getElementById('list-waiting'), running: document.getElementById('list-running'), completed: document.getElementById('list-completed') };
    try {
        const data = await CortijoAPI.getTasks(currentTaskYear);
        Object.values(lists).forEach(l => l.innerHTML = '');
        data.forEach(t => {
            const card = document.createElement('div'); card.className = 'task-card'; card.innerHTML = `<strong>${t.title}</strong><br><small>${t.priority}</small>`;
            if (lists[t.status]) lists[t.status].appendChild(card);
        });
    } catch(e){}
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

function showAuthenticatedUI() {
    ['login-section', 'auth-container', 'public-nav'].forEach(id => document.getElementById(id)?.classList.add('hidden'));
    ['private-nav', 'user-info', 'mobile-menu-btn'].forEach(id => document.getElementById(id)?.classList.remove('hidden'));
    document.getElementById('user-name').textContent = currentUser.name;
    document.getElementById('user-avatar').src = currentUser.avatar;
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
