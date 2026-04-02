// VERSION: V2.5.0 - ERP Familiar Cortijo Velasco (Dynamic & Fully Integrated)
/**
 * MOTOR DE GESTIÓN TOTAL - MASTER V2.5.0
 */

let currentUser = null;
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();
let currentMonthYear = new Date().getFullYear();
let cachedExpenses = [], cachedIncomes = [], cachedInventory = [];

// --- NAVEGACIÓN Y CARGA DE SECCIONES ---
function showSection(name) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById(name + '-section') || document.getElementById(name);
    if (target) {
        target.classList.remove('hidden');
        window.scrollTo(0,0);
    }
    
    // Renders Automáticos
    if (name === 'calendar') renderCalendar();
    if (name === 'expenses') renderExpenses();
    if (name === 'income') renderIncomes();
    if (name === 'split') renderPersonalZone(currentYear);
    if (name === 'inventory') renderInventory();
    if (name === 'tasks') renderTasks();
    if (name === 'documents') renderDocuments();

    lucide.createIcons();
}

// --- LOGIN (GOOGLE IDENTITY CALLBACK) ---
function handleCredentialResponse(response) {
    const payload = JSON.parse(atob(response.credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    currentUser = { email: payload.email, name: payload.name, picture: payload.picture };
    
    document.getElementById('public-nav').classList.add('hidden');
    document.getElementById('private-nav').classList.remove('hidden');
    document.getElementById('user-info').classList.remove('hidden');
    document.getElementById('user-avatar').src = currentUser.picture;
    document.getElementById('user-name').textContent = currentUser.name;
    document.getElementById('auth-container').classList.add('hidden');
    
    showSection('calendar'); // Redirección automática al Calendario
}

// --- CALENDARIO V2.5.0 ---
function changeMonth(dir) {
    currentMonth += dir;
    if (currentMonth < 0) { currentMonth = 11; currentMonthYear--; }
    else if (currentMonth > 11) { currentMonth = 0; currentMonthYear++; }
    renderCalendar();
}

function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const display = document.getElementById('current-month-display');
    if (!grid || !display) return;

    const names = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    display.textContent = `${names[currentMonth]} ${currentMonthYear}`;

    const days = new Date(currentMonthYear, currentMonth + 1, 0).getDate();
    const first = new Date(currentMonthYear, currentMonth, 1).getDay();
    let offset = (first === 0) ? 6 : first - 1;
    
    let html = '<div class="calendar-grid-header"><div>Lu</div><div>Ma</div><div>Mi</div><div>Ju</div><div>Vi</div><div>Sa</div><div>Do</div></div><div class="days-container">';
    for (let i = 0; i < offset; i++) html += '<div class="day empty"></div>';
    for (let d = 1; d <= days; d++) html += `<div class="day active-day">${d}</div>`;
    html += '</div>';
    grid.innerHTML = html;
}

// --- GASTOS ---
async function renderExpenses() {
    const list = document.getElementById('expenses-body');
    if (!list) return;
    list.innerHTML = '<tr><td colspan="6">Consultando libro...</td></tr>';
    const data = await CortijoAPI.getExpenses(currentYear);
    cachedExpenses = data;
    let total = 0;
    list.innerHTML = data.map(e => {
        const cant = parseFloat(e.cantidad) || 0; total += cant;
        return `<tr>
            <td>${fmtDate(e.fecha)}</td>
            <td>${e.concepto}</td>
            <td class="amount-negative">-${cant.toFixed(2)}€</td>
            <td><div class="user-chip">${e.pagado_por || '-'}</div></td>
            <td>${e.notas || ''}</td>
            <td class="actions-cell">
                <button class="btn-icon" onclick="openExpenseModal('${e.id}')"><i data-lucide="edit-3"></i></button>
                <button class="btn-icon danger" onclick="deleteExpense('${e.id}')"><i data-lucide="trash-2"></i></button>
            </td>
        </tr>`;
    }).join('');
    if (document.getElementById('total-balance')) document.getElementById('total-balance').textContent = `${total.toFixed(2)} €`;
    lucide.createIcons();
}

function openExpenseModal(id = null) {
    const edit = id ? cachedExpenses.find(x => x.id == id) : null;
    const title = edit ? 'Editar Gasto' : 'Nuevo Gasto';
    const memOptions = CONFIG.FAMILY_MEMBERS.map(m => `<option value="${m}" ${edit && edit.pagado_por==m?'selected':''}>${m}</option>`).join('');

    openModal(title, `
        <form onsubmit="saveExpense(event, '${id || ''}')">
            <div class="form-group"><label>Concepto</label><input type="text" id="m-concepto" value="${edit?edit.concepto:''}" required></div>
            <div class="form-group"><label>Importe (€)</label><input type="number" id="m-cantidad" step="0.01" value="${edit?edit.cantidad:''}" required></div>
            <div class="form-group"><label>Fecha</label><input type="date" id="m-fecha" value="${edit ? new Date(edit.fecha).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}" required></div>
            <div class="form-group"><label>Pagado por</label><select id="m-pagador">${memOptions}</select></div>
            <button type="submit" class="btn-primary">${edit ? 'Actualizar' : 'Guardar'}</button>
        </form>`);
}

async function saveExpense(evt, id) {
    evt.preventDefault();
    const data = { concepto: document.getElementById('m-concepto').value, cantidad: document.getElementById('m-cantidad').value, fecha: document.getElementById('m-fecha').value, pagado_por: document.getElementById('m-pagador').value, year: currentYear };
    if (id) await CortijoAPI.updateExpense({ id, ...data });
    else await CortijoAPI.createExpense(data);
    closeModal(); renderExpenses();
}

// --- INGRESOS ---
async function renderIncomes() {
    const list = document.getElementById('income-body');
    if (!list) return;
    const data = await CortijoAPI.getIncomes(currentYear);
    list.innerHTML = data.map(e => `
        <tr>
            <td>${fmtDate(e.fecha)}</td>
            <td>${e.concepto}</td>
            <td>${e.categoria || 'Aportación'}</td>
            <td class="amount-positive">+${parseFloat(e.importe||0).toFixed(2)}€</td>
            <td><div class="user-chip green">${e.recibido_de || '-'}</div></td>
            <td><button class="btn-icon danger" onclick="deleteIncome('${e.id}')"><i data-lucide="trash-2"></i></button></td>
        </tr>`).join('');
    lucide.createIcons();
}

function openIncomeModal() {
    const memOptions = CONFIG.FAMILY_MEMBERS.map(m => `<option value="${m}">${m}</option>`).join('');
    openModal('Nueva Aportación', `
        <form onsubmit="saveIncome(event)">
            <input type="text" id="i-concepto" placeholder="Concepto" required>
            <input type="number" id="i-importe" step="0.01" placeholder="Importe €" required>
            <input type="date" id="i-fecha" value="${new Date().toISOString().split('T')[0]}" required>
            <select id="i-persona">${memOptions}</select>
            <button type="submit" class="btn-primary">Registrar Ingreso</button>
        </form>`);
}

async function saveIncome(evt) {
    evt.preventDefault();
    const data = { concepto: document.getElementById('i-concepto').value, importe: document.getElementById('i-importe').value, fecha: document.getElementById('i-fecha').value, recibido_de: document.getElementById('i-persona').value, year: currentYear };
    await CortijoAPI.addIncome(data);
    closeModal(); renderIncomes();
}

// --- INVENTARIO V2.5 ---
async function renderInventory() {
    const list = document.getElementById('inventory-body');
    if (!list) return;
    list.innerHTML = '<tr><td colspan="8">Consultando...</td></tr>';
    const data = await CortijoAPI.getInventory();
    list.innerHTML = data.map(i => `
        <tr>
            <td>${i.foto_url ? `<img src="${i.foto_url}" width="40" height="40" style="border-radius:4px;object-fit:cover;">` : '-'}</td>
            <td><strong>${i.articulo}</strong><br><small>${i.marca_modelo || ''}</small></td>
            <td>${i.categoria}</td>
            <td>${i.cantidad} ${i.unidad || ''}</td>
            <td>${i.estado}</td>
            <td>${parseFloat(i.precio||0).toFixed(2)}€</td>
            <td>${i.ubicacion}</td>
            <td><button class="btn-icon danger" onclick="deleteInv('${i.id}')"><i data-lucide="trash-2"></i></button></td>
        </tr>`).join('');
    lucide.createIcons();
}

// --- TAREAS (KANBAN V2.5) ---
async function renderTasks() {
    const colWaiting = document.getElementById('list-waiting') || document.getElementById('col-waiting');
    const colRunning = document.getElementById('list-running') || document.getElementById('col-running');
    const colCompleted = document.getElementById('list-completed') || document.getElementById('col-completed');
    if (!colWaiting) return;
    
    colWaiting.innerHTML = colRunning.innerHTML = colCompleted.innerHTML = '<p>...</p>';
    const tasks = await CortijoAPI.getTasks(currentYear);
    const box = (t) => `<div class="task-card"><strong>${t.title}</strong><br><small>${t.user || 'S/N'}</small></div>`;
    
    colWaiting.innerHTML = tasks.filter(t => t.status === 'Pendiente').map(box).join('') || '<p>Vacio</p>';
    colRunning.innerHTML = tasks.filter(t => t.status === 'En Curso').map(box).join('') || '<p>Vacio</p>';
    colCompleted.innerHTML = tasks.filter(t => t.status === 'Completado').map(box).join('') || '<p>Vacio</p>';
}

// --- DOCUMENTOS ---
async function renderDocuments() {
    const grid = document.getElementById('document-list');
    if (grid) grid.innerHTML = '<div class="alert-info" style="grid-column:1/-1;">Carpeta de expedientes habilitada.</div>';
}

// --- BALANCES ---
async function renderPersonalZone(year) {
    const container = document.getElementById('split-balances-container');
    const table = document.getElementById('annual-totals-list');
    if (!container) return;
    const data = await CortijoAPI.getMemberStatus(year);
    container.innerHTML = data.map(m => `
        <div class="stat-row">
            <span>${m.persona}:</span>
            <strong style="color:${m.saldo>=0?'var(--success)':'var(--danger)'}">${parseFloat(m.saldo).toFixed(2)}€</strong>
        </div>`).join('');
    if (table) {
        table.innerHTML = `<table class="premium-table"><thead><tr><th>Miembro</th><th>Pagado</th><th>Cuota</th><th>Saldo</th></tr></thead><tbody>${data.map(m => `<tr><td>${m.persona}</td><td>${parseFloat(m.ingresos).toFixed(2)}€</td><td>${parseFloat(m.gastos).toFixed(2)}€</td><td style="color:${m.saldo>=0?'var(--success)':'var(--danger)'}">${parseFloat(m.saldo).toFixed(2)}€</td></tr>`).join('')}</tbody></table>`;
    }
}

// --- UTILIDADES ---
function openModal(title, content) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-content').innerHTML = content;
    document.getElementById('modal-container').classList.remove('hidden');
}
function closeModal() { document.getElementById('modal-container').classList.add('hidden'); }
async function deleteExpense(id) { if (confirm('¿Eliminar registo?')) { await CortijoAPI.deleteExpense(id); renderExpenses(); } }
async function deleteIncome(id) { if (confirm('¿Eliminar registo?')) { await CortijoAPI.deleteIncome(id); renderIncomes(); } }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('es-ES') : '-'; }

document.addEventListener('DOMContentLoaded', () => { 
    lucide.createIcons(); 
    setTimeout(() => { if(document.getElementById('loader')) document.getElementById('loader').classList.add('hidden'); }, 800);
});
