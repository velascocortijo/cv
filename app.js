// VERSION: V2.2.0 - Reparación Master: Calendario + Edición + Redirección
/**
 * MOTOR DE GESTIÓN INTEGRAL - CORTIJO VELASCO V2.2.0
 */

let currentUser = null;
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();
let currentMonthYear = new Date().getFullYear();
let cachedExpenses = [], cachedIncomes = [];

// --- NAVEGACIÓN ---
function showSection(name) {
    document.querySelectorAll('.content-section').forEach(s => {
        s.classList.add('hidden');
        s.style.display = 'none'; // Por si acaso
    });
    const target = document.getElementById(name + '-section') || document.getElementById(name);
    if (target) {
        target.classList.remove('hidden');
        target.style.display = 'block';
        window.scrollTo(0,0);
    }
    
    // Renders Automáticos
    if (name === 'expenses') renderExpenses();
    if (name === 'income') renderIncomes();
    if (name === 'split' || name === 'balance') renderPersonalZone(currentYear);
    if (name === 'calendar') renderCalendar();
    
    lucide.createIcons();
}

// --- LOGIN & REDIRECCIÓN ---
function showLogin() { 
    const auth = document.getElementById('auth-container');
    if (auth) auth.classList.remove('hidden'); 
}
function hideLogin() { 
    const auth = document.getElementById('auth-container');
    if (auth) auth.classList.add('hidden'); 
}

function handleCredentialResponse(response) {
    // Simulación de Auth decodificando el JWT (para tu Client ID)
    const payload = JSON.parse(atob(response.credential.split('.')[1]));
    currentUser = { 
        email: payload.email, 
        name: payload.name, 
        picture: payload.picture 
    };
    
    // UI Update
    document.getElementById('public-nav').classList.add('hidden');
    document.getElementById('private-nav').classList.remove('hidden');
    document.getElementById('user-info').classList.remove('hidden');
    document.getElementById('user-avatar').src = currentUser.picture;
    document.getElementById('user-name').textContent = currentUser.name;
    hideLogin();
    
    // REDIRECCIÓN MAESTRA: IR A CALENDARIO
    showSection('calendar');
}

// --- CALENDARIO REAL V2.2.0 ---
function changeMonth(dir) {
    currentMonth += dir;
    if (currentMonth < 0) { currentMonth = 11; currentMonthYear--; }
    else if (currentMonth > 11) { currentMonth = 0; currentMonthYear++; }
    renderCalendar();
}

function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const monthDisplay = document.getElementById('current-month-display');
    if (!grid) return;

    const names = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    monthDisplay.textContent = `${names[currentMonth]} ${currentMonthYear}`;

    const firstDay = new Date(currentMonthYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentMonthYear, currentMonth + 1, 0).getDate();
    
    // Ajustar lunes como primer día (ISO)
    let offset = firstDay === 0 ? 6 : firstDay - 1;
    
    let html = '<div class="calendar-header-days"><div>Lu</div><div>Ma</div><div>Mi</div><div>Ju</div><div>Vi</div><div>Sa</div><div>Do</div></div><div class="calendar-days-grid">';
    
    for (let i = 0; i < offset; i++) html += '<div class="day empty"></div>';
    for (let d = 1; d <= daysInMonth; d++) {
        html += `<div class="day">${d}</div>`;
    }
    html += '</div>';
    grid.innerHTML = html;
}

// --- GASTOS (CON EDICIÓN Y CORRECCIÓN) ---
async function renderExpenses() {
    const list = document.getElementById('expense-list') || document.getElementById('expenses-body');
    if (!list) return;
    list.innerHTML = '<tr><td colspan="6">Cargando facturas...</td></tr>';
    try {
        const data = await CortijoAPI.getExpenses(currentYear);
        cachedExpenses = data;
        let total = 0;
        list.innerHTML = data.map(e => {
            const cant = parseFloat(e.cantidad) || 0;
            total += cant;
            return `<tr>
                <td>${fmtDate(e.fecha)}</td>
                <td>${e.concepto}</td>
                <td><span class="badge">${e.categoria || 'Gral'}</span></td>
                <td class="amount-negative">-${cant.toFixed(2)}€</td>
                <td><div class="user-chip">${e.pagado_por || '-'}</div></td>
                <td class="actions-cell">
                    <button class="btn-icon" onclick="openEditExpenseModal('${e.id}')"><i data-lucide="edit-3"></i></button>
                    <button class="btn-icon danger" onclick="deleteExpense('${e.id}')"><i data-lucide="trash-2"></i></button>
                </td>
            </tr>`;
        }).join('');
        const totalEl = document.getElementById('total-balance');
        if (totalEl) totalEl.textContent = `${total.toFixed(2)} €`;
        lucide.createIcons();
    } catch (e) { list.innerHTML = '<tr><td colspan="6">Error de servidor</td></tr>'; }
}

// --- INGRESOS ---
async function renderIncomes() {
    const list = document.getElementById('income-list') || document.getElementById('income-body');
    if (!list) return;
    list.innerHTML = '<tr><td colspan="6">Sincronizando hucha...</td></tr>';
    try {
        const data = await CortijoAPI.getIncomes(currentYear);
        list.innerHTML = data.map(e => {
            const imp = parseFloat(e.importe) || 0;
            return `<tr>
                <td>${fmtDate(e.fecha)}</td>
                <td>${e.concepto}</td>
                <td><span class="badge-category-income">${e.categoria || 'Hucha'}</span></td>
                <td class="amount-positive">+${imp.toFixed(2)}€</td>
                <td><div class="user-chip green">${e.recibido_de || '-'}</div></td>
                <td class="actions-cell">
                    <button class="btn-icon" onclick="openEditIncomeModal('${e.id}')"><i data-lucide="edit-3"></i></button>
                    <button class="btn-icon danger" onclick="deleteIncome('${e.id}')"><i data-lucide="trash-2"></i></button>
                </td>
            </tr>`;
        }).join('');
        lucide.createIcons();
    } catch (e) { list.innerHTML = '<tr><td colspan="6">Error al cargar ingresos</td></tr>'; }
}

// --- ZONA PERSONAL / CUENTAS ---
async function renderPersonalZone(year) {
    const grid = document.getElementById('personal-zone-grid');
    const table = document.getElementById('annual-totals-list');
    if (!grid) return;
    try {
        grid.innerHTML = '<p style="grid-column:1/-1; text-align:center;">Calculando balances familiares...</p>';
        const data = await CortijoAPI.getMemberStatus(year);
        
        grid.innerHTML = data.map(m => `
            <div class="personal-card ${m.saldo >= 0 ? 'positive' : 'negative'}">
                <div class="card-header"><div class="avatar">${m.persona.charAt(0)}</div><h3>${m.persona}</h3></div>
                <div class="card-body">
                    <div class="stat-unit"><span>Ingresado</span><strong>+${(parseFloat(m.ingresos)||0).toFixed(2)}€</strong></div>
                    <div class="stat-unit"><span>Cuota %</span><strong>-${(parseFloat(m.gastos)||0).toFixed(2)}€</strong></div>
                    <div class="balance-hero"><h2>${(parseFloat(m.saldo)||0).toFixed(2)}€</h2></div>
                </div>
            </div>
        `).join('');

        if (table) {
            table.innerHTML = `<table class="premium-table">
                <thead><tr><th>Miembro</th><th>Pagado</th><th>Cuota</th><th>Saldo</th></tr></thead>
                <tbody>${data.map(m => `<tr><td>${m.persona}</td><td>${m.ingresos.toFixed(2)}€</td><td>${m.gastos.toFixed(2)}€</td><td style="font-weight:bold; color:${m.saldo>=0?'var(--success)':'var(--danger)'}">${m.saldo.toFixed(2)}€</td></tr>`).join('')}</tbody>
            </table>`;
        }
        lucide.createIcons();
    } catch (e) { grid.innerHTML = '<p>Error al cargar cuentasfamiliares.</p>'; }
}

// --- MODALES GASTOS ---
function openExpenseModal() {
    const hoy = new Date().toISOString().split('T')[0];
    openModal('Añadir Nuevo Gasto', `
        <form onsubmit="saveExpense(event)">
            <div class="form-group"><label>Concepto</label><input type="text" id="m-concepto" required></div>
            <div class="form-group"><label>Importe (€)</label><input type="number" id="m-cantidad" step="0.01" required></div>
            <div class="form-group"><label>Fecha</label><input type="date" id="m-fecha" value="${hoy}" required></div>
            <div class="form-group"><label>Pagado por</label>
                <select id="m-pagador">
                    <option value="Antonio">Antonio</option><option value="Raquel">Raquel</option>
                    <option value="Rebeca">Rebeca</option><option value="Jorge">Jorge</option>
                    <option value="Tete">Tete</option><option value="Jose">Jose</option><option value="Pepi">Pepi</option>
                </select>
            </div>
            <button type="submit" class="btn-primary">Guardar Factura</button>
        </form>
    `);
}

async function openEditExpenseModal(id) {
    const e = cachedExpenses.find(x => x.id == id);
    if (!e) return;
    openModal('Editar Gasto', `
        <form onsubmit="saveExpense(event, '${id}')">
            <div class="form-group"><label>Concepto</label><input type="text" id="m-concepto" value="${e.concepto}" required></div>
            <div class="form-group"><label>Importe (€)</label><input type="number" id="m-cantidad" step="0.01" value="${e.cantidad}" required></div>
            <div class="form-group"><label>Fecha</label><input type="date" id="m-fecha" value="${new Date(e.fecha).toISOString().split('T')[0]}" required></div>
            <div class="form-group"><label>Pagado por</label>
                <select id="m-pagador">
                    <option value="Antonio" ${e.pagado_por=='Antonio'?'selected':''}>Antonio</option>
                    <option value="Raquel" ${e.pagado_por=='Raquel'?'selected':''}>Raquel</option>
                    <option value="Rebeca" ${e.pagado_por=='Rebeca'?'selected':''}>Rebeca</option>
                    <option value="Jorge" ${e.pagado_por=='Jorge'?'selected':''}>Jorge</option>
                    <option value="Tete" ${e.pagado_por=='Tete'?'selected':''}>Tete</option>
                    <option value="Jose" ${e.pagado_por=='Jose'?'selected':''}>Jose</option>
                    <option value="Pepi" ${e.pagado_por=='Pepi'?'selected':''}>Pepi</option>
                </select>
            </div>
            <button type="submit" class="btn-primary">Actualizar Cambios</button>
        </form>
    `);
}

async function saveExpense(evt, id = null) {
    evt.preventDefault();
    const data = {
        concepto: document.getElementById('m-concepto').value,
        cantidad: document.getElementById('m-cantidad').value,
        fecha: document.getElementById('m-fecha').value,
        pagado_por: document.getElementById('m-pagador').value,
        year: currentYear
    };
    if (id) await CortijoAPI.updateExpense({ id, ...data });
    else await CortijoAPI.createExpense(data);
    closeModal(); renderExpenses();
}

// --- UTILIDADES ---
function openModal(title, content) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-content').innerHTML = content;
    document.getElementById('modal-container').classList.remove('hidden');
}
function closeModal() { document.getElementById('modal-container').classList.add('hidden'); }
async function deleteExpense(id) { if (confirm('¿Borrar definitivamente?')) { await CortijoAPI.deleteExpense(id); renderExpenses(); } }
async function deleteIncome(id) { if (confirm('¿Borrar definitivamente?')) { await CortijoAPI.deleteIncome(id); renderIncomes(); } }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('es-ES') : '-'; }

// Init
document.addEventListener('DOMContentLoaded', () => { 
    lucide.createIcons();
    setTimeout(() => { document.getElementById('loader').classList.add('hidden'); }, 800);
});
