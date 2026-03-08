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
    setTimeout(() => { document.getElementById('loader').style.display = 'none'; }, 1000);
    if (localStorage.getItem('user')) {
        currentUser = JSON.parse(localStorage.getItem('user'));
        showAuthenticatedUI();
    }
    document.getElementById('expense-search')?.addEventListener('input', (e) => filterExpenses(e.target.value));
    document.getElementById('income-search')?.addEventListener('input', (e) => filterIncome(e.target.value));
    document.getElementById('inventory-search')?.addEventListener('input', (e) => filterInventory());
});

function initYearSelectors() {
    const years = [2026, 2027, 2028, 2029, 2030];
    const selectors = ['exp-year-selector', 'task-year-selector', 'doc-year-selector', 'inc-year-selector'];
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
    document.querySelector(`nav button[onclick *= "${sectionId}"]`)?.classList.add('active');

    // Cerrar menú móvil al cambiar de sección
    document.getElementById('main-nav').classList.remove('show');

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
    document.getElementById('current-month-display').textContent = `${monthNames[currentMonth]} ${currentYear} `;
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
        list.innerHTML = `<tr><td colspan="6" style="color:red">Error: ${e.message}. Verifica que ejecutaste 'authorize' en Google Script.</td></tr>`;
    }
}

async function filterExpenses(query) {
    const list = document.getElementById('expenses-body');
    const filtered = cachedExpenses.filter(e => String(e.concepto).toLowerCase().includes(query.toLowerCase()));
    let total = 0;
    list.innerHTML = filtered.map(e => {
        total += parseFloat(e.cantidad);
        return `<tr>
            <td data-label="Fecha" onclick="openEditExpenseModal(${e.id})" style="cursor:pointer;">${formatDateDisplay(e.fecha)}</td>
            <td data-label="Concepto" onclick="openEditExpenseModal(${e.id})" style="cursor:pointer;">${e.concepto} ${e.url_drive ? `<a href="${e.url_drive}" target="_blank" onclick="event.stopPropagation()">📎</a>` : ''}</td>
            <td data-label="Importe" class="amount">${parseFloat(e.cantidad).toFixed(2)}€</td>
            <td data-label="Pagado por">${e.pagado_por || '-'}</td>
            <td data-label="Notas" style="font-size:0.85rem; color:var(--text-muted);">${e.notas || ''}</td>
            <td data-label="Acciones">
                <div style="display:flex; gap:8px;">
                    <button class="btn-icon" onclick="openEditExpenseModal(${e.id})" title="Editar">✏️</button>
                    <button class="btn-icon" onclick="confirmDeleteExpense('${e.id}')" title="Eliminar">🗑️</button>
                </div>
            </td>
        </tr>`;
    }).join('');
    try {
        const balance = await CortijoAPI.getBalance(currentExpYear);
        document.getElementById('total-balance').innerHTML = `
            <div style="font-size: 0.9rem; color: var(--text-muted);">Balance Neto: <span style="color: ${balance.balanceNeto >= 0 ? 'var(--success)' : 'var(--danger)'}">${balance.balanceNeto.toFixed(2)}€</span></div>
            <div>Gastos: ${total.toFixed(2)} €</div>
        `;
    } catch (e) {
        document.getElementById('total-balance').textContent = `${total.toFixed(2)} €`;
    }
}

function openEditExpenseModal(id) {
    const exp = cachedExpenses.find(e => e.id == id);
    if (!exp) return;

    openModal('Editar Gasto', `
        <form id="edit-ex-form">
            <div class="form-group"><label>Concepto</label><input type="text" id="eexc" value="${exp.concepto}" required></div>
            <div class="form-group"><label>Importe</label><input type="number" step="0.01" id="eexa" value="${exp.cantidad}" required></div>
            <div class="form-group"><label>Fecha</label><input type="date" id="eexd" value="${new Date(exp.fecha).toISOString().split('T')[0]}" required></div>
            <div class="form-group"><label>Pagado por</label><select id="eexp">${CONFIG.FAMILY_MEMBERS.map(m => `<option value="${m}" ${m === exp.pagado_por ? 'selected' : ''}>${m}</option>`).join('')}</select></div>
            <div class="form-group"><label>Notas</label><textarea id="eexn">${exp.notas || ''}</textarea></div>
            <button type="submit" class="btn-primary" style="width:100%">Guardar Cambios</button>
        </form >
    `);
    document.getElementById('edit-ex-form').onsubmit = async (e) => {
        e.preventDefault();
        const data = {
            concepto: document.getElementById('eexc').value,
            cantidad: document.getElementById('eexa').value,
            fecha: document.getElementById('eexd').value,
            pagado_por: document.getElementById('eexp').value,
            notas: document.getElementById('eexn').value
        };
        await CortijoAPI.updateExpense(id, data);
        renderExpenses(); closeModal();
    };
}

function openExpenseModal() {
    try {
        if (!currentUser) {
            alert("Por favor, inicia sesión para añadir gastos.");
            return;
        }
        if (typeof CONFIG === 'undefined' || !CONFIG.FAMILY_MEMBERS) {
            console.error("CONFIG no está disponible");
            alert("Error de configuración: No se pudo cargar la lista de miembros.");
            return;
        }

        openModal('Añadir Gasto', `<form id="ex-form"><div class="form-group"><label>Concepto</label><input type="text" id="exc" required></div><div class="form-group"><label>Importe</label><input type="number" step="0.01" id="exa" required></div><div class="form-group"><label>Fecha</label><input type="date" id="exd" value="${new Date().toISOString().split('T')[0]}" required></div><div class="form-group"><label>Pagado por</label><select id="exp">${CONFIG.FAMILY_MEMBERS.map(m => `<option value="${m}">${m}</option>`).join('')}</select></div><div class="form-group"><label>Notas</label><textarea id="exn"></textarea></div><div class="form-group"><label>Ticket</label><input type="file" id="exf"></div><button type="submit" id="exb" class="btn-primary" style="width:100%">Guardar</button></form>`);

        const form = document.getElementById('ex-form');
        if (form) {
            form.onsubmit = async (e) => {
                e.preventDefault();
                const btn = document.getElementById('exb'); btn.disabled = true; btn.textContent = 'Guardando...';
                const data = { id: Date.now(), user_id: currentUser.name, concepto: document.getElementById('exc').value, cantidad: document.getElementById('exa').value, fecha: document.getElementById('exd').value, pagado_por: document.getElementById('exp').value, notas: document.getElementById('exn').value, year: currentExpYear };
                await CortijoAPI.createExpense(data, document.getElementById('exf').files[0], `Gastos - ${currentExpYear}`);
                renderExpenses(); closeModal();
            };
        }
    } catch (e) {
        console.error("Error al abrir modal de gastos:", e);
        alert("Ocurrió un error al abrir el formulario de gastos.");
    }
}

async function confirmDeleteExpense(id) { if (confirm("¿Eliminar este gasto?")) { await CortijoAPI.deleteExpense(id); renderExpenses(); } }

// --- INCOME ---
function changeIncYear(year) { currentIncYear = year; document.getElementById('inc-year-display').textContent = year; renderIncome(); }

async function renderIncome() {
    const list = document.getElementById('income-body');
    if (!list) return;
    list.innerHTML = '<tr><td colspan="6">Cargando...</td></tr>';
    try {
        const data = await CortijoAPI.getIncome(currentIncYear);
        if (data.error) throw new Error(data.error);
        cachedIncome = data;
        filterIncome(document.getElementById('income-search')?.value || '');
    } catch (e) {
        console.error("renderIncome Error:", e);
        list.innerHTML = `<tr><td colspan="6" style="color:red">Error: ${e.message}</td></tr>`;
    }
}

function filterIncome(query) {
    const list = document.getElementById('income-body');
    const filtered = cachedIncome.filter(e => String(e.concepto).toLowerCase().includes(query.toLowerCase()));
    let total = 0;
    list.innerHTML = filtered.map(e => {
        total += parseFloat(e.importe);
        return `<tr>
            <td data-label="Fecha" onclick="openEditIncomeModal(${e.id})" style="cursor:pointer;">${formatDateDisplay(e.fecha)}</td>
            <td data-label="Concepto" onclick="openEditIncomeModal(${e.id})" style="cursor:pointer;">${e.concepto} ${e.url_drive ? `<a href="${e.url_drive}" target="_blank" onclick="event.stopPropagation()">📎</a>` : ''}</td>
            <td data-label="Categoría">${e.categoria || '-'}</td>
            <td data-label="Importe" class="amount" style="color:var(--success); font-weight:bold;">+${parseFloat(e.importe).toFixed(2)}€</td>
            <td data-label="Recibido de">${e.recibido_de || '-'}</td>
            <td data-label="Acciones">
                <div style="display:flex; gap:8px;">
                    <button class="btn-icon" onclick="openEditIncomeModal(${e.id})" title="Editar">✏️</button>
                    <button class="btn-icon" onclick="confirmDeleteIncome('${e.id}')" title="Eliminar">🗑️</button>
                </div>
            </td>
        </tr>`;
    }).join('');
    document.getElementById('total-income').textContent = `${total.toFixed(2)} €`;
}

function openIncomeModal() {
    try {
        if (!currentUser) {
            alert("Por favor, inicia sesión para añadir ingresos.");
            return;
        }
        if (typeof CONFIG === 'undefined' || !CONFIG.INCOME_CATEGORIES) {
            console.error("CONFIG no está disponible");
            alert("Error de configuración: No se pudo cargar las categorías de ingreso.");
            return;
        }

        openModal('Añadir Ingreso', `
            <form id="inc-form">
                <div class="form-group"><label>Concepto</label><input type="text" id="incc" required></div>
                <div class="form-group"><label>Importe</label><input type="number" step="0.01" id="inca" required></div>
                <div class="form-group"><label>Fecha</label><input type="date" id="incd" value="${new Date().toISOString().split('T')[0]}" required></div>
                <div class="form-group"><label>Categoría</label><select id="inccat">${CONFIG.INCOME_CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('')}</select></div>
                <div class="form-group"><label>Recibido de</label><select id="incfrom">${CONFIG.FAMILY_MEMBERS.map(m => `<option value="${m}">${m}</option>`).join('')}</select></div>
                <div class="form-group"><label>Notas</label><textarea id="incn"></textarea></div>
                <div class="form-group"><label>Comprobante</label><input type="file" id="incf"></div>
                <button type="submit" id="incb" class="btn-primary" style="width:100%">Guardar</button>
            </form>
        `);

        const form = document.getElementById('inc-form');
        if (form) {
            form.onsubmit = async (e) => {
                e.preventDefault();
                const btn = document.getElementById('incb'); btn.disabled = true; btn.textContent = 'Guardando...';
                const data = {
                    id: Date.now(),
                    concepto: document.getElementById('incc').value,
                    importe: document.getElementById('inca').value,
                    fecha: document.getElementById('incd').value,
                    categoria: document.getElementById('inccat').value,
                    recibido_de: document.getElementById('incfrom').value,
                    notas: document.getElementById('incn').value,
                    year_selector: currentIncYear
                };
                await CortijoAPI.createIncome(data, document.getElementById('incf').files[0], `Ingresos - ${currentIncYear} `);
                renderIncome(); closeModal();
            };
        }
    } catch (e) {
        console.error("Error al abrir modal de ingresos:", e);
        alert("Ocurrió un error al abrir el formulario de ingresos.");
    }
}

function openEditIncomeModal(id) {
    const inc = cachedIncome.find(e => e.id == id);
    if (!inc) return;
    openModal('Editar Ingreso', `
        <form id="edit-inc-form">
            <div class="form-group"><label>Concepto</label><input type="text" id="eincc" value="${inc.concepto}" required></div>
            <div class="form-group"><label>Importe</label><input type="number" step="0.01" id="einca" value="${inc.importe}" required></div>
            <div class="form-group"><label>Fecha</label><input type="date" id="eincd" value="${new Date(inc.fecha).toISOString().split('T')[0]}" required></div>
            <div class="form-group"><label>Categoría</label><select id="einccat">${CONFIG.INCOME_CATEGORIES.map(c => `<option value="${c}" ${c === inc.categoria ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
            <div class="form-group"><label>Recibido de</label><select id="eincfrom">${CONFIG.FAMILY_MEMBERS.map(m => `<option value="${m}" ${m === inc.recibido_de ? 'selected' : ''}>${m}</option>`).join('')}</select></div>
            <div class="form-group"><label>Notas</label><textarea id="eincn">${inc.notes || ''}</textarea></div>
            <button type="submit" class="btn-primary" style="width:100%">Guardar Cambios</button>
        </form>
    `);
    document.getElementById('edit-inc-form').onsubmit = async (e) => {
        e.preventDefault();
        const data = {
            concepto: document.getElementById('eincc').value,
            importe: document.getElementById('einca').value,
            fecha: document.getElementById('eincd').value,
            categoria: document.getElementById('einccat').value,
            recibido_de: document.getElementById('eincfrom').value,
            notas: document.getElementById('eincn').value
        };
        await CortijoAPI.updateIncome(id, data);
        renderIncome(); closeModal();
    };
}

async function confirmDeleteIncome(id) { if (confirm("¿Eliminar este ingreso?")) { await CortijoAPI.deleteIncome(id); renderIncome(); } }

async function exportIncome() {
    const csv = [
        ['Fecha', 'Concepto', 'Categoría', 'Importe', 'Recibido de'].join(','),
        ...cachedIncome.map(e => [e.fecha, `"${e.concepto}"`, e.categoria, e.importe, e.recibido_de].join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `ingresos_${currentIncYear}.csv`; a.click();
}

// --- INVENTARIO ---
async function loadInventoryData() {
    try {
        const fetchFile = async (name, fallback) => {
            try {
                const res = await fetch(name);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return await res.json();
            } catch (e) {
                console.warn(`No se pudo cargar ${name}, usando datos por defecto o vacíos.`, e);
                return fallback;
            }
        };

        const [inv, cats, locs] = await Promise.all([
            fetchFile('inventario.json', []),
            fetchFile('categorias.json', ["Herramientas", "Camping", "Jardín", "Otros"]),
            fetchFile('ubicaciones.json', ["Taller", "Trastero", "Exterior"])
        ]);

        cachedInventory = inv;
        cachedInvCategories = cats;
        cachedLocations = locs;

        // Populate filters
        const catFilter = document.getElementById('inv-filter-category');
        if (catFilter) catFilter.innerHTML = '<option value="">Todas las categorías</option>' + cats.map(c => `<option value="${c}">${c}</option>`).join('');

        const locFilter = document.getElementById('inv-filter-location');
        if (locFilter) locFilter.innerHTML = '<option value="">Todas las ubicaciones</option>' + locs.map(l => `<option value="${l}">${l}</option>`).join('');

    } catch (e) {
        console.error("Error crítico cargando datos de inventario:", e);
    }
}

function renderInventory() {
    filterInventory();
}

function filterInventory() {
    const list = document.getElementById('inventory-body');
    if (!list) return;

    const query = document.getElementById('inventory-search')?.value.toLowerCase() || '';
    const cat = document.getElementById('inv-filter-category')?.value || '';
    const status = document.getElementById('inv-filter-status')?.value || '';
    const loc = document.getElementById('inv-filter-location')?.value || '';

    const filtered = cachedInventory.filter(item => {
        const matchesQuery = item.articulo.toLowerCase().includes(query) || item.id.toLowerCase().includes(query);
        const matchesCat = !cat || item.categoria === cat;
        const matchesStatus = !status || item.estado === status;
        const matchesLoc = !loc || item.ubicacion === loc;
        return matchesQuery && matchesCat && matchesStatus && matchesLoc;
    });

    list.innerHTML = filtered.map(item => `
        <tr>
            <td><img src="${item.foto_url || 'https://via.placeholder.com/60?text=Sin+Foto'}" class="inv-photo" alt="Foto"></td>
            <td>
                <span class="inv-id">${item.id}</span>
                <span class="inv-name" onclick="openEditInventoryModal('${item.id}')" style="cursor:pointer;">${item.articulo}</span>
            </td>
            <td><span class="badge" style="background:#f0f0f0; color:var(--text-main); border:1px solid var(--border);">${item.categoria}</span></td>
            <td><strong>${item.cantidad}</strong> <small>${item.unidad}</small></td>
            <td><span class="status-badge status-${item.estado.toLowerCase()}">${item.estado}</span></td>
            <td>
                <div class="inv-location-tag">
                    <i data-lucide="map-pin" style="width:14px;"></i>
                    ${item.ubicacion}
                </div>
            </td>
            <td>
                <div style="display:flex; gap:8px;">
                    <button class="btn-icon" onclick="openEditInventoryModal('${item.id}')" title="Editar">✏️</button>
                    <button class="btn-icon" onclick="deleteInventoryItem('${item.id}')" title="Eliminar">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// --- INVENTARIO MODALS & CRUD ---
function openInventoryModal() {
    openModal('Añadir Artículo al Inventario', `
        <form id="inv-form">
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
                <div class="form-group"><label>ID Artículo</label><input type="text" id="invid" placeholder="HERR-001" required></div>
                <div class="form-group"><label>Categoría</label><select id="invcat">${cachedInvCategories.map(c => `<option value="${c}">${c}</option>`).join('')}</select></div>
            </div>
            <div class="form-group"><label>Nombre Artículo</label><input type="text" id="invart" required></div>
            <div class="form-group"><label>Marca / Modelo</label><input type="text" id="invmm"></div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
                <div class="form-group"><label>Cantidad</label><input type="number" id="invq" value="1" required></div>
                <div class="form-group"><label>Unidad</label><input type="text" id="invu" value="Unidades"></div>
            </div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
                <div class="form-group"><label>Estado</label><select id="invst"><option value="Nuevo">Nuevo</option><option value="Bueno">Bueno</option><option value="Usado">Usado</option><option value="Dañado">Dañado</option></select></div>
                <div class="form-group"><label>Ubicación</label><select id="invloc">${cachedLocations.map(l => `<option value="${l}">${l}</option>`).join('')}</select></div>
            </div>
            <div class="form-group"><label>Responsable</label><input type="text" id="invres" value="${currentUser.name}"></div>
            <div class="form-group"><label>URL Foto</label><input type="url" id="invf" placeholder="https://..."></div>
            <div class="form-group"><label>Observaciones</label><textarea id="invobs"></textarea></div>
            <button type="submit" class="btn-primary" style="width:100%">Guardar Artículo</button>
        </form>
    `);

    document.getElementById('inv-form').onsubmit = (e) => {
        e.preventDefault();
        const newItem = {
            id: document.getElementById('invid').value,
            categoria: document.getElementById('invcat').value,
            articulo: document.getElementById('invart').value,
            marca_modelo: document.getElementById('invmm').value,
            cantidad: parseInt(document.getElementById('invq').value),
            unidad: document.getElementById('invu').value,
            estado: document.getElementById('invst').value,
            ubicacion: document.getElementById('invloc').value,
            responsible: document.getElementById('invres').value,
            foto_url: document.getElementById('invf').value,
            fecha_revision: new Date().toISOString().split('T')[0],
            observaciones: document.getElementById('invobs').value
        };
        cachedInventory.unshift(newItem);
        renderInventory(); closeModal();
    };
}

function openEditInventoryModal(id) {
    const item = cachedInventory.find(i => i.id === id);
    if (!item) return;

    openModal('Editar Artículo', `
        <form id="edit-inv-form">
             <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
                <div class="form-group"><label>ID Artículo</label><input type="text" id="einvid" value="${item.id}" readonly></div>
                <div class="form-group"><label>Categoría</label><select id="einvcat">${cachedInvCategories.map(c => `<option value="${c}" ${c === item.categoria ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
            </div>
            <div class="form-group"><label>Nombre Artículo</label><input type="text" id="einvart" value="${item.articulo}" required></div>
            <div class="form-group"><label>Marca / Modelo</label><input type="text" id="einvmm" value="${item.marca_modelo || ''}"></div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
                <div class="form-group"><label>Cantidad</label><input type="number" id="einvq" value="${item.cantidad}" required></div>
                <div class="form-group"><label>Unidad</label><input type="text" id="einvu" value="${item.unidad || 'Unidades'}"></div>
            </div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
                <div class="form-group"><label>Estado</label><select id="einvst"><option value="Nuevo" ${item.estado === 'Nuevo' ? 'selected' : ''}>Nuevo</option><option value="Bueno" ${item.estado === 'Bueno' ? 'selected' : ''}>Bueno</option><option value="Usado" ${item.estado === 'Usado' ? 'selected' : ''}>Usado</option><option value="Dañado" ${item.estado === 'Dañado' ? 'selected' : ''}>Dañado</option></select></div>
                <div class="form-group"><label>Ubicación</label><select id="einvloc">${cachedLocations.map(l => `<option value="${l}" ${l === item.ubicacion ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
            </div>
            <div class="form-group"><label>Responsable</label><input type="text" id="einvres" value="${item.responsible || ''}"></div>
            <div class="form-group"><label>URL Foto</label><input type="url" id="einvf" value="${item.foto_url || ''}"></div>
            <div class="form-group"><label>Observaciones</label><textarea id="einvobs">${item.observaciones || ''}</textarea></div>
            <button type="submit" class="btn-primary" style="width:100%">Actualizar Artículo</button>
        </form>
    `);

    document.getElementById('edit-inv-form').onsubmit = (e) => {
        e.preventDefault();
        const index = cachedInventory.findIndex(i => i.id === id);
        if (index > -1) {
            cachedInventory[index] = {
                ...cachedInventory[index],
                categoria: document.getElementById('einvcat').value,
                articulo: document.getElementById('einvart').value,
                marca_modelo: document.getElementById('einvmm').value,
                cantidad: parseInt(document.getElementById('einvq').value),
                unidad: document.getElementById('einvu').value,
                estado: document.getElementById('einvst').value,
                ubicacion: document.getElementById('einvloc').value,
                responsible: document.getElementById('einvres').value,
                foto_url: document.getElementById('einvf').value,
                observaciones: document.getElementById('einvobs').value
            };
            renderInventory(); closeModal();
        }
    };
}

function deleteInventoryItem(id) {
    if (confirm("¿Estás seguro de que deseas eliminar este artículo del inventario?")) {
        cachedInventory = cachedInventory.filter(i => i.id !== id);
        renderInventory();
    }
}

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
                <textarea id="tnotes" placeholder="Detalles generales..." rows="2"></textarea>
            </div>
            
            <div class="subtasks-editor" style="margin: 1rem 0;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.8rem;">
                    <label style="margin:0;">Subprocesos</label>
                    <button type="button" class="btn-small" onclick="addNewSubtaskFieldCreate()">+ Añadir</button>
                </div>
                <div id="sub-create-list" style="display:grid; gap:12px;">
                    <div class="subtask-edit-row" style="background:var(--bg-main); padding:10px; border-radius:10px; border:1px solid var(--border);">
                        <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                            <input type="checkbox" class="sub-check" style="width:18px;height:18px;">
                            <input type="text" class="sub-text" style="flex:1; padding:6px; border-radius:6px; border:1px solid var(--border);" placeholder="Nombre del subproceso" required>
                        </div>
                        <input type="text" class="sub-obs" style="width:100%; border:none; background:transparent; border-bottom:1px dashed var(--border); font-size:0.8rem; padding:4px;" placeholder="Observaciones de este subproceso...">
                    </div>
                </div>
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

        const subRows = document.querySelectorAll('#sub-create-list .subtask-edit-row');
        const subtasks = Array.from(subRows).map(row => ({
            text: row.querySelector('.sub-text').value.trim(),
            completed: row.querySelector('.sub-check').checked,
            notes: row.querySelector('.sub-obs').value.trim()
        })).filter(s => s.text !== "");

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

function addNewSubtaskFieldCreate() {
    const container = document.getElementById('sub-create-list');
    const div = document.createElement('div');
    div.className = 'subtask-edit-row';
    div.style.cssText = 'background:var(--bg-main); padding:10px; border-radius:10px; border:1px solid var(--border);';
    div.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
            <input type="checkbox" class="sub-check" style="width:18px;height:18px;">
            <input type="text" class="sub-text" style="flex:1; padding:6px; border-radius:6px; border:1px solid var(--border);" placeholder="Nombre del subproceso" required>
            <button type="button" class="btn-icon" onclick="this.closest('.subtask-edit-row').remove()" style="font-size:1rem;">🗑️</button>
        </div>
        <input type="text" class="sub-obs" style="width:100%; border:none; background:transparent; border-bottom:1px dashed var(--border); font-size:0.8rem; padding:4px;" placeholder="Observaciones de este subproceso...">
    `;
    container.appendChild(div);
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
        console.log("Verificando permisos para:", email);
        const auth = await CortijoAPI.checkEmail(email);
        console.log("Respuesta de autorización:", auth);

        if (auth.authorized) {
            currentUser = { name: p.name, avatar: p.picture, email: p.email };
            localStorage.setItem('user', JSON.stringify(currentUser));
            showAuthenticatedUI();
        } else {
            alert("Acceso Denegado: Tu correo (" + email + ") no está en la lista de usuarios autorizados. Contacta con el administrador del Cortijo.");
            signOut();
        }
    } catch (e) {
        alert("Error verificando permisos (Failed to fetch).\n\nDetalles: " + e.message + "\n\nIMPORTANTE: Asegúrate de que:\n1. Has desplegado el Google Script como 'Aplicación Web'.\n2. 'Quién tiene acceso' está configurado como 'Cualquier persona'.\n3. La URL en api.js termina en /exec.");
        console.error("Fetch Error:", e);
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
