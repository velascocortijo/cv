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

    const savedSection = localStorage.getItem('activeSection') || 'home';

    if (localStorage.getItem('user')) {
        currentUser = JSON.parse(localStorage.getItem('user'));
        showAuthenticatedUI();
        // Restaurar sección previa tras login automático
        if (savedSection !== 'home') showSection(savedSection);
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

    // Persistencia de sección
    localStorage.setItem('activeSection', sectionId);

    // Gestión del HERO: solo mostrar en la Home o si explícito
    const hero = document.getElementById('hero-section');
    if (hero) {
        if (sectionId === 'home') hero.classList.remove('hidden');
        else hero.classList.add('hidden');
    }

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
    const tableContainer = document.getElementById('resumen-tabla-container');
    const globalContainer = document.getElementById('resumen-global-container');
    if (!tableContainer || !globalContainer) return;

    tableContainer.innerHTML = '<p style="text-align:center;">Sincronizando la Bóveda de Reparto...</p>';
    globalContainer.innerHTML = '';

    try {
        const [pagos, teorico, ingresosData] = await Promise.all([
            CortijoAPI.getOrdenPagos(year),
            CortijoAPI.getRepartoTeorico(year),
            CortijoAPI.getIncome(year)
        ]);

        if (pagos.length === 0) {
            tableContainer.innerHTML = '<p style="text-align:center; padding: 2rem;">No hay operaciones avanzadas registradas. Añade nuevos gastos o transferencias primero.</p>';
            return;
        }

        const totalGastos = teorico.length > 0 ? parseFloat(teorico[0].totalgastosaño || 0) : 0;
        const totalIngresos = ingresosData.reduce((s,i) => s + parseFloat(i.importe||0), 0);
        const resultado = totalIngresos - totalGastos;
        
        const trs = pagos.map(p => {
            const gastoNeto = parseFloat(p.gastoneto) || 0;
            const parte = parseFloat(p.parteteorica) || 0;
            const dif = parseFloat(p.diferencia) || 0;
            
            const isOwe = dif > 0.01;
            const isReceive = dif < -0.01;
            
            let saldoText, bgClass;
            if (isOwe) {
                saldoText = `Debe pagar ${dif.toFixed(2)}€`;
                bgClass = 'color: #ef4444; font-weight: bold;'; 
            } else if (isReceive) {
                saldoText = `Debe recibir ${Math.abs(dif).toFixed(2)}€`;
                bgClass = 'color: #3b82f6; font-weight: bold;'; 
            } else {
                saldoText = `Cuentas al día`;
                bgClass = 'color: #9ca3af;'; 
            }
            
            return `<tr style="border-bottom:1px solid var(--border);">
                <td style="padding:12px;"><strong>${p.persona}</strong></td>
                <td style="padding:12px;">${parte.toFixed(2)}€</td>
                <td style="padding:12px;">${gastoNeto.toFixed(2)}€</td>
                <td style="padding:12px; ${bgClass}">${saldoText}</td>
            </tr>`;
        }).join('');

        const resText = resultado >= 0 ? `+${resultado.toFixed(2)}€` : `${resultado.toFixed(2)}€`;
        const resColor = resultado >= 0 ? 'var(--success)' : 'var(--danger)';

        globalContainer.innerHTML = `
            <div style="background:var(--bg-main); padding:15px; border-radius:8px; text-align:center; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
                <small style="color:var(--text-muted); display:block; text-transform:uppercase; font-size:0.75rem; font-weight:bold;">Total Gastos Año</small>
                <strong style="color:var(--danger); font-size:1.5rem; display:block; margin-top:5px;">${totalGastos.toFixed(2)}€</strong>
            </div>
            <div style="background:var(--bg-main); padding:15px; border-radius:8px; text-align:center; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
                <small style="color:var(--text-muted); display:block; text-transform:uppercase; font-size:0.75rem; font-weight:bold;">Total Ingresos Año</small>
                <strong style="color:var(--success); font-size:1.5rem; display:block; margin-top:5px;">${totalIngresos.toFixed(2)}€</strong>
            </div>
            <div style="background:var(--bg-main); padding:15px; border-radius:8px; text-align:center; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
                <small style="color:var(--text-muted); display:block; text-transform:uppercase; font-size:0.75rem; font-weight:bold;">Resultado del Año</small>
                <strong style="color:${resColor}; font-size:1.5rem; display:block; margin-top:5px;">${resText}</strong>
            </div>
        `;

        tableContainer.innerHTML = `
            <table style="width:100%; border-collapse:collapse; background:white; font-size:0.95rem;">
                <thead style="background:var(--bg-main); text-align:left; border-bottom:2px solid var(--border);">
                    <tr>
                        <th style="padding:15px 12px; white-space:nowrap;">Persona</th>
                        <th style="padding:15px 12px; white-space:nowrap;">Le corresponde pagar</th>
                        <th style="padding:15px 12px; white-space:nowrap;">Ha soportado</th>
                        <th style="padding:15px 12px; white-space:nowrap;">Diferencia</th>
                    </tr>
                </thead>
                <tbody>${trs}</tbody>
            </table>
        `;

        const trfData = await CortijoAPI.getTransferencias(year);
        window._cachedTransferencias = trfData;
        const trfContainer = document.getElementById('transferencias-inline-container');
        if (trfContainer) {
            let trfTrs = trfData.map(r => {
                 let driveLink = r.url_drive ? `<a href="${r.url_drive}" target="_blank" style="text-decoration:none; font-size:1.2rem;">📎 Ver</a>` : '-';
                 return `<tr style="border-bottom:1px solid var(--border);">
                    <td style="padding:10px;">${formatDateDisplay(r.fecha)}</td>
                    <td style="padding:10px;">${r.de}</td>
                    <td style="padding:10px;">${r.a}</td>
                    <td style="padding:10px; font-weight:bold;">${(parseFloat(r.importe)||0).toFixed(2)}€</td>
                    <td style="padding:10px; text-align:center;">${driveLink}</td>
                    <td style="padding:10px;">
                        <button class="btn-icon" onclick="openEditTransferenciaModal('${r.id}')" title="Editar">✏️</button>
                        <button class="btn-icon" onclick="confirmarBorrarTransferencia('${r.id}')" title="Borrar">🗑️</button>
                    </td>
                 </tr>`;
            }).join('');
            
            trfContainer.innerHTML = `
            <table style="width:100%; border-collapse:collapse; background:white; font-size:0.9rem;">
                <thead style="background:var(--bg-main); text-align:left;">
                    <tr>
                        <th style="padding:12px;">Fecha</th>
                        <th style="padding:12px;">De</th>
                        <th style="padding:12px;">A</th>
                        <th style="padding:12px;">Importe</th>
                        <th style="padding:12px; text-align:center;">Justificante</th>
                        <th style="padding:12px;">Acciones</th>
                    </tr>
                </thead>
                <tbody>${trfTrs || '<tr><td colspan="6" style="padding:15px; text-align:center; color:var(--text-muted);">No hay transferencias este año</td></tr>'}</tbody>
            </table>`;
        }

    } catch (error) {
        tableContainer.innerHTML = '<p style="color:var(--danger); text-align:center;">Error conectando con la Bóveda Central.</p>';
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
        renderPersonalZone(currentYear); // <--- Refresco de Zona 1
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
            notas: document.getElementById('een').value,
            year: currentExpYear
        });
        renderExpenses();
        renderPersonalZone(currentExpYear);
        closeModal();
    };
}

async function confirmDeleteExpense(id) { 
    if (confirm("¿Estás seguro de eliminar este gasto?\nSe recalcularán todos los balances automáticamente.")) { 
        await CortijoAPI.deleteExpense(id, currentExpYear); 
        renderExpenses(); 
        renderPersonalZone(currentExpYear);
    } 
}

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
        renderPersonalZone(currentYear); // <--- Refresco de Zona 1
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
    if (confirm("¿Estás seguro de que deseas eliminar este ingreso? Se recalcularán los balances.")) {
        await CortijoAPI.deleteIncome(id, currentIncYear);
        renderIncome();
        renderPersonalZone(currentYear);
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
    list.innerHTML = cachedInventory.map(i => `<tr>
        <td>${i.foto_url ? `<img src="${getDriveDirectLink(i.foto_url)}" style="width:40px;height:40px;border-radius:4px;object-fit:cover;">` : '📦'}</td>
        <td>${i.articulo} ${i.marca_modelo ? `<br><small style="color:gray;">${i.marca_modelo}</small>` : ''}</td>
        <td>${i.categoria}</td>
        <td>${i.cantidad} ${i.unidad}</td>
        <td>${i.estado}</td>
        <td style="font-weight:bold;">${i.precio ? parseFloat(i.precio).toFixed(2) + '€' : '-'}</td>
        <td>${i.ubicacion}</td>
        <td>
            <div style="display:flex; gap:8px;">
                <button class="btn-icon" onclick="openEditInventoryModal('${i.id}')" title="Editar">✏️</button>
                <button class="btn-icon" onclick="deleteInventoryItem('${i.id}')" title="Borrar">🗑️</button>
            </div>
        </td>
    </tr>`).join('');
}
async function deleteInventoryItem(id) { 
    if (confirm("¿Estás seguro de eliminar este artículo del inventario?")) { 
        await CortijoAPI.deleteInventory(id); 
        loadInventoryData().then(() => renderInventory()); 
    } 
}

function openEditInventoryModal(id) {
    const i = cachedInventory.find(item => item.id == id);
    if (!i) return;
    openModal('Editar Artículo', `
        <form id="einv-form">
            <div class="form-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:15px;">
                <div class="form-group"><label>Artículo</label><input type="text" id="einva" value="${i.articulo}" required></div>
                <div class="form-group"><label>Marca / Modelo</label><input type="text" id="einvm" value="${i.marca_modelo||''}"></div>
            </div>
            <div class="form-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:15px;">
                <div class="form-group"><label>Cantidad</label><input type="number" id="einvq" value="${i.cantidad}" required></div>
                <div class="form-group"><label>Ubicación</label><input type="text" id="einvu" value="${i.ubicacion||''}"></div>
            </div>
            <div class="form-group"><label>Precio (€)</label><input type="number" step="0.01" id="einvp" value="${i.precio||''}"></div>
            <button type="submit" class="btn-primary" style="width:100%; margin-top:10px;">Guardar Cambios</button>
        </form>
    `);
    document.getElementById('einv-form').onsubmit = async (e) => {
        e.preventDefault();
        await CortijoAPI.updateInventory(id, {
            articulo: document.getElementById('einva').value,
            marca_modelo: document.getElementById('einvm').value,
            cantidad: document.getElementById('einvq').value,
            ubicacion: document.getElementById('einvu').value,
            precio: document.getElementById('einvp').value
        });
        loadInventoryData().then(() => renderInventory());
        closeModal();
    };
}
function openInventoryModal() {
    openModal('Añadir Inventario', `
        <form id="inv-form">
            <div class="form-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:15px;">
                <div class="form-group"><label>Artículo</label><input type="text" id="inva" required></div>
                <div class="form-group"><label>Marca / Modelo</label><input type="text" id="invm"></div>
            </div>
            <div class="form-grid" style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:15px;">
                <div class="form-group"><label>Categoría</label><select id="invc"><option value="Herramientas">Herramientas</option><option value="Muebles">Muebles</option><option value="Maquinaria">Maquinaria</option><option value="Seguridad">Seguridad</option></select></div>
                <div class="form-group"><label>Cantidad</label><input type="number" id="invq" value="1" required></div>
                <div class="form-group"><label>Unidad</label><input type="text" id="invun" value="Unidades"></div>
            </div>
            <div class="form-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:15px;">
                <div class="form-group"><label>Estado</label><select id="inve"><option value="Nuevo">Nuevo</option><option value="Bueno">Bueno</option><option value="Regular">Regular</option><option value="Malo">Malo</option></select></div>
                <div class="form-group"><label>Ubicación</label><input type="text" id="invu" placeholder="Ej: Trastero superior"></div>
            </div>
            <div class="form-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:15px;">
                <div class="form-group"><label>Fecha Revisión</label><input type="date" id="invd" value="${new Date().toISOString().split('T')[0]}"></div>
                <div class="form-group"><label>Precio (€)</label><input type="number" step="0.01" id="invp"></div>
            </div>
            <div class="form-group"><label>Observaciones</label><textarea id="invo"></textarea></div>
            <div class="form-group"><label>Foto (Opcional)</label><input type="file" id="invf" accept="image/*"></div>
            <button type="submit" id="invb" class="btn-primary" style="width:100%; margin-top:10px;">Guardar Objeto</button>
        </form>
    `);
    document.getElementById('inv-form').onsubmit = async (e) => {
        e.preventDefault();
        const btn = document.getElementById('invb');
        btn.disabled = true; btn.textContent = 'Guardando...';
        
        const data = {
            id: 'INV-' + Date.now().toString().substring(8),
            articulo: document.getElementById('inva').value,
            marca_modelo: document.getElementById('invm').value,
            categoria: document.getElementById('invc').value,
            cantidad: document.getElementById('invq').value,
            unidad: document.getElementById('invun').value,
            estado: document.getElementById('inve').value,
            ubicacion: document.getElementById('invu').value,
            fecha_revision: document.getElementById('invd').value,
            observaciones: document.getElementById('invo').value,
            precio: document.getElementById('invp').value,
            timestamp: new Date().toLocaleString()
        };
        const file = document.getElementById('invf').files[0];
        if (file) {
            data.fileBase64 = await new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result.split(',')[1]); r.readAsDataURL(file); });
            data.fileName = file.name;
            data.mimeType = file.type;
        }
        await CortijoAPI.createInventory(data);
        loadInventoryData().then(() => renderInventory());
        closeModal();
    };
}

// --- DOCUMENTS ---
let cachedDocs = [];
function changeDocYear(year) { currentDocYear = year; renderDocuments(); }
async function renderDocuments() {
    const list = document.getElementById('document-list');
    if (!list) return;
    try {
        cachedDocs = await CortijoAPI.getDocuments(currentDocYear);
        if (cachedDocs.length === 0) {
            list.innerHTML = '<p style="text-align:center; grid-column:1/-1; padding:2rem; color:var(--text-muted);">No hay documentos registrados para este año.</p>';
            return;
        }
        list.innerHTML = cachedDocs.map(d => {
            const ext = String(d.type).toLowerCase();
            let iconHtml = '<div style="font-size:3rem; margin:auto;">📄</div>';
            
            if (ext === 'pdf') {
                iconHtml = `<img src="https://upload.wikimedia.org/wikipedia/commons/8/87/PDF_file_icon.svg" style="width:55px;height:55px;margin:auto;display:block;">`;
            } else if (['xls','xlsx','csv'].includes(ext)) {
                iconHtml = `<img src="https://upload.wikimedia.org/wikipedia/commons/3/34/Microsoft_Office_Excel_%282019%E2%80%93present%29.svg" style="width:55px;height:55px;margin:auto;display:block;">`;
            } else if (['doc','docx'].includes(ext)) {
                iconHtml = `<img src="https://upload.wikimedia.org/wikipedia/commons/f/fd/Microsoft_Office_Word_%282019%E2%80%93present%29.svg" style="width:55px;height:55px;margin:auto;display:block;">`;
            } else if (['png','jpg','jpeg','gif','webp'].includes(ext)) {
                iconHtml = `<img src="${getDriveDirectLink(d.url_drive)}" style="width:65px;height:65px;object-fit:cover;border-radius:8px;margin:auto;display:block;box-shadow:0 2px 4px rgba(0,0,0,0.1);">`;
            }
            
            return `<div class="card" style="display:flex; flex-direction:column; justify-content:space-between; height:100%; padding:0; overflow:hidden; border:none; box-shadow:0 4px 10px rgba(0,0,0,0.05); transition:transform 0.2s, box-shadow 0.2s;">
                <div style="flex:1; padding: 1.5rem; text-align:center; cursor:pointer;" onclick="window.open('${d.url_drive}', '_blank')" onmouseover="this.parentElement.style.transform='translateY(-3px)'; this.parentElement.style.boxShadow='0 8px 15px rgba(0,0,0,0.1)';" onmouseout="this.parentElement.style.transform='none'; this.parentElement.style.boxShadow='0 4px 10px rgba(0,0,0,0.05)';">
                   <div style="margin-bottom: 1rem; height:65px; display:flex; align-items:center;">${iconHtml}</div>
                   <h4 style="margin:0; font-size:1rem; font-weight:600; color:var(--text-main); word-break: break-word; line-height:1.3;">${d.name}</h4>
                   <p style="margin:8px 0 0 0; font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; font-weight:600; letter-spacing:0.5px;">${ext.toUpperCase()} • ${d.size}</p>
                   <p style="margin:4px 0 0 0; font-size:0.7rem; color:var(--text-muted);">${formatDateDisplay(d.date || d.timestamp)}</p>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr 1fr; border-top:1px solid var(--border); background:var(--bg-card);">
                   <button style="background:transparent; border:none; border-right:1px solid var(--border); padding:0.75rem; color:var(--text-main); font-size:0.85rem; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:5px;" onclick="window.open('${d.url_drive}', '_blank')" onmouseover="this.style.background='var(--bg-main)'" onmouseout="this.style.background='transparent'">
                       👁️ Ver
                   </button>
                   <button style="background:transparent; border:none; border-right:1px solid var(--border); padding:0.75rem; color:var(--text-main); font-size:0.85rem; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:5px;" onclick="openEditDocNameModal('${d.id}')" onmouseover="this.style.background='var(--bg-main)'" onmouseout="this.style.background='transparent'">
                       ✏️ Renombrar
                   </button>
                   <button style="background:transparent; border:none; padding:0.75rem; color:#ef4444; font-size:0.85rem; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:5px;" onclick="confirmDeleteDoc('${d.id}')" onmouseover="this.style.background='var(--bg-main)'" onmouseout="this.style.background='transparent'">
                       🗑️ Borrar
                   </button>
                </div>
            </div>`;
        }).join('');
    } catch (e) { }
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    openModal('Finalizar Subida', `
       <form id="doc-form" style="text-align:left;">
           <div class="form-group" style="background:var(--bg-main); padding:10px; border-radius:8px; margin-bottom:15px; border:1px dashed var(--primary);">
               <p style="margin:0; font-size:0.85rem; color:var(--text-muted);">Archivo seleccionado:</p>
               <strong style="font-size:0.95rem; color:var(--primary);">${file.name}</strong>
           </div>
           <div class="form-group">
               <label>Nombre del Documento (Cómo se verá en la lista)</label>
               <input type="text" id="docn" value="${file.name.split('.')[0]}" required>
           </div>
           <button type="submit" id="docbtn" class="btn-primary" style="width:100%; margin-top:10px;">💾 Guardar en el Cortijo</button>
       </form>
    `);
    
    document.getElementById('doc-form').onsubmit = async (e) => {
        e.preventDefault();
        const btn = document.getElementById('docbtn');
        btn.disabled = true; btn.textContent = 'Subiendo al Drive familiar...';
        
        let name = document.getElementById('docn').value.trim();
        if (!name) name = file.name.split('.')[0];
        
        await CortijoAPI.uploadAndRecordDocument({ 
            id: Date.now(), 
            name: name, 
            type: file.name.split('.').pop() || 'file',
            size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
            year: currentDocYear, 
            date: new Date().toISOString() 
        }, file);
        
        // Limpiar el input hidden para permitir subir el mismo archivo después si se desea
        event.target.value = '';
        renderDocuments();
        closeModal();
    };
}

function openEditDocNameModal(id) {
    const doc = cachedDocs.find(d => d.id == id);
    if (!doc) return;
    openModal('Renombrar Documento', `
        <form id="doc-edit-form">
            <div class="form-group"><label>Nuevo Nombre para el Documento</label><input type="text" id="edocn" value="${doc.name}" required></div>
            <button type="submit" id="edocbtn" class="btn-primary" style="width:100%; margin-top:10px;">Guardar Cambios</button>
        </form>
    `);
    document.getElementById('doc-edit-form').onsubmit = async (e) => {
        e.preventDefault();
        document.getElementById('edocbtn').disabled = true;
        document.getElementById('edocbtn').textContent = 'Guardando...';
        await CortijoAPI.updateDoc(id, { name: document.getElementById('edocn').value });
        renderDocuments();
        closeModal();
    };
}

async function confirmDeleteDoc(id) {
    if (confirm("¿Seguro que quieres quitar este documento de la lista?\n\nNota: El archivo físico NO se borrará de tu Google Drive por seguridad.")) {
        await CortijoAPI.deleteDoc(id);
        renderDocuments();
    }
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

// --- REPARTO AVANZADO & TRANSFERENCIAS ---
async function confirmarBorrarTransferencia(id) {
    if(confirm("¿Eliminar bizum/transferencia?")) {
        const year = document.getElementById('split-year-select')?.value || new Date().getFullYear();
        await CortijoAPI.deleteTransferencia(id, year);
        renderPersonalZone(year);
    }
}

function openAddTransferenciaModal() {
    const year = document.getElementById('split-year-select')?.value || new Date().getFullYear();
    const membersOpts = (cachedMembers || []).map(m => `<option value="${m}">${m}</option>`).join('');
    openModal('Añadir Transferencia (BIZUM)', `
        <form id="transf-form">
            <div class="form-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:15px;">
                <div class="form-group"><label>Origen (Sale de)</label><select id="tr-de">${membersOpts}</select></div>
                <div class="form-group"><label>Destino (Llega a)</label><select id="tr-a">${membersOpts}</select></div>
            </div>
            <div class="form-group"><label>Importe (€) o Bizum</label><input type="number" step="0.01" id="tr-imp" required></div>
            <div class="form-group"><label>Fecha</label><input type="date" id="tr-f" value="${new Date().toISOString().split('T')[0]}" required></div>
            <div class="form-group"><label>Captura de Pantalla/Justificante</label><input type="file" id="tr-file" accept="image/*,.pdf"></div>
            <button type="submit" id="tr-btn" class="btn-primary" style="width:100%; margin-top:10px;">Guardar Bizum</button>
        </form>
    `);
    document.getElementById('transf-form').onsubmit = async (e) => {
        e.preventDefault();
        const btn = document.getElementById('tr-btn');
        btn.disabled = true;
        btn.textContent = 'Subiendo a Drive y Registrando...';
        
        const data = {
             id: 'TRF-' + Date.now().toString().substring(8),
             fecha: document.getElementById('tr-f').value,
             de: document.getElementById('tr-de').value,
             a: document.getElementById('tr-a').value,
             importe: document.getElementById('tr-imp').value,
             year: year,
             timestamp: new Date().toLocaleString()
        };
        const file = document.getElementById('tr-file').files[0];
        if (file) {
            data.fileBase64 = await new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result.split(',')[1]); r.readAsDataURL(file); });
            data.fileName = file.name;
            data.mimeType = file.type;
        }

        await CortijoAPI.createTransferencia(data);
        closeModal();
        renderPersonalZone(year);
    };
}

function openEditTransferenciaModal(id) {
    const year = document.getElementById('split-year-select')?.value || new Date().getFullYear();
    const trf = window._cachedTransferencias?.find(t => t.id == id);
    if (!trf) return;
    
    const membersOptsDe = (cachedMembers || []).map(m => `<option value="${m}" ${m == trf.de ? 'selected' : ''}>${m}</option>`).join('');
    const membersOptsA = (cachedMembers || []).map(m => `<option value="${m}" ${m == trf.a ? 'selected' : ''}>${m}</option>`).join('');
    
    openModal('Editar Transferencia', `
        <form id="tr-edit-form">
            <div class="form-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:15px;">
                <div class="form-group"><label>Origen (Sale de)</label><select id="te-de">${membersOptsDe}</select></div>
                <div class="form-group"><label>Destino (Llega a)</label><select id="te-a">${membersOptsA}</select></div>
            </div>
            <div class="form-group"><label>Importe (€)</label><input type="number" step="0.01" id="te-imp" value="${trf.importe || 0}" required></div>
            <div class="form-group"><label>Fecha</label><input type="date" id="te-f" value="${(trf.fecha && trf.fecha.includes('T')) ? trf.fecha.split('T')[0] : trf.fecha}" required></div>
            <button type="submit" id="te-btn" class="btn-primary" style="width:100%; margin-top:10px;">Actualizar Transferencia</button>
        </form>
    `);
    
    document.getElementById('tr-edit-form').onsubmit = async (e) => {
        e.preventDefault();
        const btn = document.getElementById('te-btn');
        btn.disabled = true;
        btn.textContent = 'Actualizando...';
        
        await CortijoAPI.updateTransferencia(id, {
             fecha: document.getElementById('te-f').value,
             de: document.getElementById('te-de').value,
             a: document.getElementById('te-a').value,
             importe: document.getElementById('te-imp').value,
             year: year
        });
        
        closeModal();
        renderPersonalZone(year);
    };
}
