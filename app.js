// VERSION: V2.1.0 - ERP Familiar Cortijo Velasco (Full Edition)
/**
 * MOTOR DE GESTIÓN INTEGRAL - MASTER V2.1.0
 */

let currentUser = null;
let currentYear = new Date().getFullYear();
let cachedExpenses = [], cachedIncomes = [], cachedInventory = [], cachedTasks = [], cachedDocs = [];
let currentMonth = new Date().getMonth();
let currentMonthYear = new Date().getFullYear();

// --- NAVEGACIÓN ---
function showSection(name) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById(name + '-section') || document.getElementById(name);
    if (target) {
        target.classList.remove('hidden');
        window.scrollTo(0,0);
    }
    
    // Renders Automáticos
    if (name === 'expenses') renderExpenses();
    if (name === 'income') renderIncomes();
    if (name === 'split') renderPersonalZone(currentYear);
    if (name === 'calendar') renderCalendar();
    if (name === 'inventory') renderInventory();
    if (name === 'tasks') renderTasks();
    if (name === 'documents') renderDocuments();
    if (name === 'profile') renderProfile();

    lucide.createIcons();
}

// --- LOGIN & GOOGLE IDENTITY ---
function showLogin() { document.getElementById('auth-container').classList.remove('hidden'); }
function hideLogin() { document.getElementById('auth-container').classList.add('hidden'); }

function handleCredentialResponse(response) {
    const payload = parseJwt(response.credential);
    currentUser = { email: payload.email, name: payload.name, picture: payload.picture };
    
    document.getElementById('public-nav').classList.add('hidden');
    document.getElementById('private-nav').classList.remove('hidden');
    document.getElementById('user-info').classList.remove('hidden');
    document.getElementById('user-avatar').src = currentUser.picture;
    document.getElementById('user-name').textContent = currentUser.name;
    hideLogin();
    showSection('expenses');
}

function parseJwt(t) { return JSON.parse(atob(t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))); }

// --- GASTOS E INGRESOS (VERSION V2.1) ---
async function renderExpenses() {
    const list = document.getElementById('expense-list');
    if (!list) return;
    list.innerHTML = '<tr><td colspan="5">Consultando libro...</td></tr>';
    const data = await CortijoAPI.getExpenses(currentYear);
    cachedExpenses = data;
    let total = 0;
    list.innerHTML = data.map(e => {
        const c = parseFloat(e.cantidad) || 0; total += c;
        return `<tr>
            <td><span class="date-chip">${fmtDate(e.fecha)}</span></td>
            <td>${e.concepto} ${e.url_drive ? `<a href="${e.url_drive}" target="_blank">📎</a>` : ''}</td>
            <td><span class="badge">${e.categoria || 'Gral'}</span></td>
            <td class="amount-negative">-${c.toFixed(2)}€</td>
            <td><div class="user-chip">${e.pagado_por || '-'}</div></td>
            <td><button class="btn-icon" onclick="deleteExpense('${e.id}')"><i data-lucide="trash-2"></i></button></td>
        </tr>`;
    }).join('');
    document.getElementById('total-balance').textContent = `${total.toFixed(2)} €`;
    lucide.createIcons();
}

async function renderIncomes() {
    const list = document.getElementById('income-list');
    if (!list) return;
    list.innerHTML = '<tr><td colspan="5">Sincronizando hucha...</td></tr>';
    const data = await CortijoAPI.getIncomes(currentYear);
    cachedIncomes = data;
    list.innerHTML = data.map(e => {
        const i = parseFloat(e.importe) || 0;
        return `<tr>
            <td><span class="date-chip green">${fmtDate(e.fecha)}</span></td>
            <td>${e.concepto}</td>
            <td><span class="badge-category-income">${e.categoria || 'Hucha'}</span></td>
            <td class="amount-positive">+${i.toFixed(2)}€</td>
            <td><div class="user-chip green">${e.recibido_de || '-'}</div></td>
            <td><button class="btn-icon" onclick="deleteIncome('${e.id}')"><i data-lucide="trash-2"></i></button></td>
        </tr>`;
    }).join('');
    lucide.createIcons();
}

// --- CALENDARIO ---
function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    if (!grid) return;
    grid.innerHTML = '<div style="padding:2rem; text-align:center;">Calendario interactivo habilitado.</div>';
}

// --- INVENTARIO ---
async function renderInventory() {
    const body = document.getElementById('inventory-body');
    if (!body) return;
    body.innerHTML = '<p style="padding:2rem; text-align:center;">Cargando lista de artículos...</p>';
    // Simulación de carga (sustituir por API real si existe)
    body.innerHTML = '<div class="alert-info">Módulo de inventario activo. Consulta las listas de menaje, herramientas y maquinaria.</div>';
}

// --- TAREAS (KANBAN) ---
async function renderTasks() {
    const board = document.getElementById('tasks-board');
    if (!board) return;
    board.innerHTML = `
        <div class="kanban-col"><h3>Pendientes</h3><div class="task-zone" id="task-pend"></div></div>
        <div class="kanban-col"><h3>En Curso</h3><div class="task-zone" id="task-prog"></div></div>
        <div class="kanban-col"><h3>Listas</h3><div class="task-zone" id="task-done"></div></div>
    `;
}

// --- BALANCES (REPARTO INTELIGENTE V2) ---
async function renderPersonalZone(year) {
    const grid = document.getElementById('personal-zone-grid');
    const table = document.getElementById('annual-totals-list');
    if (!grid) return;
    const data = await CortijoAPI.getMemberStatus(year);
    
    grid.innerHTML = data.map(m => `
        <div class="personal-card ${m.saldo >= 0 ? 'positive' : 'negative'}">
            <div class="card-header"><div class="avatar">${m.persona.charAt(0)}</div><h3>${m.persona}</h3></div>
            <div class="card-body">
                <div class="stat-row"><span>Ingresado</span><strong>+${m.ingresos.toFixed(2)}€</strong></div>
                <div class="stat-row"><span>Cuota %</span><strong>-${m.gastos.toFixed(2)}€</strong></div>
                <div class="balance-total"><h2>${m.saldo.toFixed(2)}€</h2></div>
            </div>
        </div>
    `).join('');
    
    if (table) {
        table.innerHTML = `<table class="premium-table">
            <thead><tr><th>Miembro</th><th>Pagado</th><th>Cuota</th><th>Saldo</th></tr></thead>
            <tbody>${data.map(m => `<tr><td>${m.persona}</td><td>${m.ingresos.toFixed(2)}€</td><td>${m.gastos.toFixed(2)}€</td><td style="color:${m.saldo>=0?'var(--success)':'var(--danger)'}">${m.saldo.toFixed(2)}€</td></tr>`).join('')}</tbody>
        </table>`;
    }
    lucide.createIcons();
}

// --- MODALES ---
function openExpenseModal() {
    openModal('Registrar Nuevo Gasto', `
        <form onsubmit="handleNewExpense(event)">
            <input type="text" id="exp-concepto" placeholder="Concepto" required>
            <input type="number" id="exp-cantidad" step="0.01" placeholder="Importe €" required>
            <input type="date" id="exp-fecha" value="${new Date().toISOString().split('T')[0]}">
            <select id="exp-persona">
                <option value="Antonio">Antonio</option><option value="Rebeca">Rebeca</option>
                <option value="Raquel">Raquel</option><option value="Jorge">Jorge</option>
                <option value="Tete">Tete</option><option value="Jose">Jose</option><option value="Pepi">Pepi</option>
            </select>
            <button type="submit" class="btn-primary">Guardar Gasto</button>
        </form>
    `);
}

async function handleNewExpense(e) {
    e.preventDefault();
    const data = {
        concepto: document.getElementById('exp-concepto').value,
        cantidad: document.getElementById('exp-cantidad').value,
        fecha: document.getElementById('exp-fecha').value,
        pagado_por: document.getElementById('exp-persona').value,
        year: currentYear
    };
    await CortijoAPI.createExpense(data);
    closeModal(); renderExpenses();
}

// --- UTILIDADES ---
function openModal(title, content) {
    const mc = document.getElementById('modal-content');
    document.getElementById('modal-title').textContent = title;
    mc.innerHTML = content;
    document.getElementById('modal-container').classList.remove('hidden');
}
function closeModal() { document.getElementById('modal-container').classList.add('hidden'); }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('es-ES') : '-'; }

// Init
document.addEventListener('DOMContentLoaded', () => { 
    lucide.createIcons();
    setTimeout(() => { document.getElementById('loader').classList.add('hidden'); }, 800);
});
