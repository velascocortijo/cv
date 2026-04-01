// VERSION: V2.0.9 - Soporte Total Secciones / Google Identity / Balances V2
// BACKED BY Google Apps Script V2.0.7

// App State
let currentUser = null;
let currentYear = new Date().getFullYear();
let cachedExpenses = [];
let cachedIncomes = [];

// --- NAVEGACIÓN Y CARGA ---
function showSection(name) {
    // 1. Ocultar todo
    document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
    
    // 2. Mostrar la sección con el sufijo -section o el nombre directo
    let target = document.getElementById(name + '-section') || document.getElementById(name);
    if (target) {
        target.classList.remove('hidden');
        window.scrollTo(0, 0);
    }
    
    // 3. Renderizado automático por contexto
    if (name === 'expenses') renderExpenses();
    if (name === 'income') renderIncomes();
    if (name === 'split') renderPersonalZone(currentYear);
    
    lucide.createIcons();
}

// Interfaz de Login
function showLogin() {
    document.getElementById('auth-container').classList.remove('hidden');
}
function hideLogin() {
    document.getElementById('auth-container').classList.add('hidden');
}

// Callback de Google Identity (data-callback)
function handleCredentialResponse(response) {
    const responsePayload = parseJwt(response.credential);
    currentUser = { 
        email: responsePayload.email, 
        name: responsePayload.name, 
        picture: responsePayload.picture 
    };
    
    // UI Update
    document.getElementById('public-nav').classList.add('hidden');
    document.getElementById('private-nav').classList.remove('hidden');
    document.getElementById('user-info').classList.remove('hidden');
    document.getElementById('user-avatar').src = currentUser.picture;
    document.getElementById('user-name').textContent = currentUser.name;
    hideLogin();
    
    showSection('expenses');
    lucide.createIcons();
}

function parseJwt(token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')));
}

// --- GASTOS ---
async function renderExpenses() {
    const list = document.getElementById('expense-list');
    if (!list) return;
    list.innerHTML = '<tr><td colspan="5">Consultando libro de gastos...</td></tr>';
    try {
        const data = await CortijoAPI.getExpenses(currentYear);
        cachedExpenses = data;
        let total = 0;
        list.innerHTML = data.map(e => {
            const cant = parseFloat(e.cantidad) || 0;
            total += cant;
            return `<tr>
                <td><span class="date-chip">${fmtDate(e.fecha)}</span></td>
                <td><div class="row-title">${e.concepto}</div></td>
                <td><span class="badge">${e.categoria || 'Gral'}</span></td>
                <td class="amount-negative">-${cant.toFixed(2)}€</td>
                <td><div class="user-chip">${e.pagado_por || '-'}</div></td>
                <td class="actions-cell">
                    <button class="btn-icon" onclick="deleteExpense('${e.id}')"><i data-lucide="trash-2"></i></button>
                </td>
            </tr>`;
        }).join('');
        document.getElementById('total-balance').textContent = `${total.toFixed(2)} €`;
        lucide.createIcons();
    } catch (e) { list.innerHTML = '<tr><td colspan="5">Error de conexión</td></tr>'; }
}

// --- INGRESOS ---
async function renderIncomes() {
    const list = document.getElementById('income-list');
    if (!list) return;
    list.innerHTML = '<tr><td colspan="5">Sincronizando hucha...</td></tr>';
    try {
        const data = await CortijoAPI.getIncomes(currentYear);
        cachedIncomes = data;
        list.innerHTML = data.map(e => {
            const imp = parseFloat(e.importe) || 0;
            return `<tr>
                <td><span class="date-chip green">${fmtDate(e.fecha)}</span></td>
                <td><div class="row-title">${e.concepto}</div></td>
                <td><span class="badge-category-income">${e.categoria || 'Hucha'}</span></td>
                <td class="amount-positive">+${imp.toFixed(2)}€</td>
                <td><div class="user-chip green">${e.recibido_de || '-'}</div></td>
                <td class="actions-cell">
                    <button class="btn-icon" onclick="deleteIncome('${e.id}')"><i data-lucide="trash-2"></i></button>
                </td>
            </tr>`;
        }).join('');
        lucide.createIcons();
    } catch (e) { list.innerHTML = '<tr><td colspan="5">Error al cargar ingresos</td></tr>'; }
}

// --- ZONA PERSONAL (REPARTO ASIMÉTRICO V2) ---
async function renderPersonalZone(year) {
    const grid = document.getElementById('personal-zone-grid');
    const tableList = document.getElementById('annual-totals-list');
    if (!grid) return;
    
    grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:3rem;">Calculando balances familiares...</div>';
    
    try {
        const data = await CortijoAPI.getMemberStatus(year);
        
        // 1. Tarjetas de Miembro
        grid.innerHTML = data.map(m => {
            const statusClass = m.saldo > 0 ? 'positive' : (m.saldo < 0 ? 'negative' : 'neutral');
            const statusText = m.saldo > 0 ? 'Favor' : (m.saldo < 0 ? 'Deuda' : 'OK');
            return `
            <div class="personal-card ${statusClass}">
                <div class="card-header">
                    <div class="avatar-circle">${m.persona.charAt(0)}</div>
                    <div>
                        <h3>${m.persona}</h3>
                        <span class="status-btn">${statusText}</span>
                    </div>
                </div>
                <div class="card-body">
                    <div class="stat-unit"><span>Aportado</span><strong>+${(parseFloat(m.ingresos)||0).toFixed(2)}€</strong></div>
                    <div class="stat-unit"><span>Cuota %</span><strong>-${(parseFloat(m.gastos)||0).toFixed(2)}€</strong></div>
                    <div class="balance-hero">
                        <small>SALDO FINAL</small>
                        <h2>${(parseFloat(m.saldo)||0).toFixed(2)}€</h2>
                    </div>
                </div>
            </div>`;
        }).join('');

        // 2. Tabla Detallada Final
        if (tableList) {
            tableList.innerHTML = `
            <table class="premium-table">
                <thead><tr><th>Miembro</th><th>Total Pagado</th><th>Debería Pagar</th><th>Saldo</th></tr></thead>
                <tbody>
                    ${data.map(m => `
                        <tr>
                            <td><strong>${m.persona}</strong></td>
                            <td class="amount-positive">${m.ingresos.toFixed(2)}€</td>
                            <td class="amount-negative">${m.gastos.toFixed(2)}€</td>
                            <td style="font-weight:bold; color:${m.saldo >= 0 ? 'var(--success)' : 'var(--danger)'}">${m.saldo.toFixed(2)}€</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>`;
        }
        lucide.createIcons();
    } catch (e) { grid.innerHTML = 'Error al sincronizar cuentas.'; }
}

// AUXILIARES
function fmtDate(d) {
    if (!d) return '-';
    const date = new Date(d);
    return isNaN(date.getTime()) ? d : date.toLocaleDateString('es-ES');
}

async function deleteExpense(id) { if (confirm('¿Eliminar registo?')) { await CortijoAPI.deleteExpense(id); renderExpenses(); } }
async function deleteIncome(id) { if (confirm('¿Eliminar registro?')) { await CortijoAPI.deleteIncome(id); renderIncomes(); } }

// Inicialización
document.addEventListener('DOMContentLoaded', () => { 
    lucide.createIcons();
    // Loader
    setTimeout(() => {
        document.getElementById('loader').classList.add('hidden');
    }, 1000);
});
