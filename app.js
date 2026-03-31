// VERSION: V2.0.8 - Restauración de Lujo / Motor de Balances Asimétricos
// DISEÑO PREMIUM: Cortijo Velasco

// App State
let currentUser = null;
let currentExpYear = 2026;
let currentIncYear = 2026;
let cachedExpenses = [];
let cachedIncomes = [];

async function login() {
    const email = document.getElementById('login-email').value;
    if (!email) return;
    try {
        const res = await CortijoAPI.isAuthorized(email);
        if (res.authorized) {
            currentUser = { email, name: email.split('@')[0] };
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('app-screen').style.display = 'block';
            showSection('expenses-section');
            lucide.createIcons();
        } else { alert('Acceso no autorizado.'); }
    } catch (e) { alert('Error de conexión.'); }
}

function showSection(id) {
    document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
    document.querySelectorAll('.nav-links li').forEach(l => l.classList.remove('active'));
    
    document.getElementById(id).style.display = 'block';
    
    // Auto-update Active Tab
    if (id === 'expenses-section') { document.getElementById('nav-exp').classList.add('active'); renderExpenses(); }
    if (id === 'income-section') { document.getElementById('nav-inc').classList.add('active'); renderIncomes(); }
    if (id === 'balance-section') { document.getElementById('nav-bal').classList.add('active'); renderPersonalZone(currentExpYear); }
    
    lucide.createIcons();
}

// --- GASTOS PREMIUM ---
async function renderExpenses() {
    const list = document.getElementById('expense-list');
    if (!list) return;
    list.innerHTML = '<tr><td colspan="6" class="p-3 text-center">Iniciando motor de facturas...</td></tr>';
    try {
        const data = await CortijoAPI.getExpenses(currentExpYear);
        cachedExpenses = data;
        let total = 0;
        list.innerHTML = data.map(e => {
            const cant = parseFloat(e.cantidad) || 0;
            total += cant;
            return `
            <tr>
                <td><div class="date-chip">${fmtDate(e.fecha)}</div></td>
                <td>
                    <div class="row-title">${e.concepto}</div>
                    ${e.url_drive ? `<a href="${e.url_drive}" target="_blank" class="factura-link"><i data-lucide="file-text"></i> Ver Factura</a>` : ''}
                </td>
                <td><span class="badge glass-badge">${e.categoria || 'General'}</span></td>
                <td class="amount-negative">-${cant.toFixed(2)}€</td>
                <td class="user-cell"><div class="user-chip">${e.pagado_por || '-'}</div></td>
                <td class="actions-cell">
                    <button class="btn-icon danger" onclick="deleteExpense('${e.id}')">
                        <i data-lucide="trash-2"></i>
                    </button>
                </td>
            </tr>`;
        }).join('');
        document.getElementById('total-balance').textContent = `${total.toFixed(2)} €`;
        lucide.createIcons();
    } catch (e) { list.innerHTML = '<tr><td colspan="6">Error de conexión</td></tr>'; }
}

// --- INGRESOS PREMIUM ---
async function renderIncomes() {
    const list = document.getElementById('income-list');
    if (!list) return;
    list.innerHTML = '<tr><td colspan="6" class="p-3 text-center">Sincronizando aportaciones...</td></tr>';
    try {
        const data = await CortijoAPI.getIncomes(currentIncYear);
        cachedIncomes = data;
        list.innerHTML = data.map(e => {
            return `
            <tr>
                <td><div class="date-chip green">${fmtDate(e.fecha)}</div></td>
                <td><div class="row-title">${e.concepto}</div></td>
                <td><span class="badge-category-income">${e.categoria || 'Hucha'}</span></td>
                <td class="amount-positive">+${(parseFloat(e.importe)||0).toFixed(2)}€</td>
                <td class="user-cell"><div class="user-chip green">${e.recibido_de || '-'}</div></td>
                <td class="actions-cell">
                    <button class="btn-icon danger" onclick="deleteIncome('${e.id}')">
                        <i data-lucide="trash-2"></i>
                    </button>
                </td>
            </tr>`;
        }).join('');
        lucide.createIcons();
    } catch (e) { list.innerHTML = '<tr><td colspan="6">Error al cargar ingresos</td></tr>'; }
}

// --- ZONA PERSONAL (DISEÑO PREMIUM V2.0.8) ---
async function renderPersonalZone(year) {
    const grid = document.getElementById('personal-zone-grid');
    if (!grid) return;
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding:5rem;"><div class="loader-pulse"></div><p>Calculando cuotas familiares...</p></div>';
    
    try {
        const data = await CortijoAPI.getMemberStatus(year);
        grid.innerHTML = data.map(m => {
            const saldoNum = parseFloat(m.saldo) || 0;
            const statusClass = saldoNum > 0 ? 'positive' : (saldoNum < 0 ? 'negative' : 'neutral');
            const statusText = saldoNum > 0 ? 'Crédito Favor' : (saldoNum < 0 ? 'Saldo Deudor' : 'Equilibrado');
            const icon = saldoNum > 0 ? 'trending-up' : (saldoNum < 0 ? 'trending-down' : 'minus');

            return `
            <div class="personal-card glass ${statusClass}">
                <div class="card-header">
                    <div class="header-main">
                        <div class="avatar-glow">${m.persona.charAt(0)}</div>
                        <div class="card-titles">
                            <h3>${m.persona}</h3>
                            <span class="badge-status"><i data-lucide="${icon}"></i> ${statusText}</span>
                        </div>
                    </div>
                </div>
                <div class="card-body">
                    <div class="stat-group">
                        <div class="stat-item">
                            <small>APORTADO (INGRESOS)</small>
                            <span class="val-in">+${(parseFloat(m.ingresos)||0).toFixed(2)}€</span>
                        </div>
                        <div class="stat-item">
                            <small>CUOTA POR % (GASTOS)</small>
                            <span class="val-out">-${(parseFloat(m.gastos)||0).toFixed(2)}€</span>
                        </div>
                    </div>
                    <div class="divider"></div>
                    <div class="balance-hero">
                        <div class="hero-label">BALANCE NETO</div>
                        <div class="hero-value">${saldoNum.toFixed(2)}€</div>
                    </div>
                </div>
            </div>`;
        }).join('');
        lucide.createIcons();
    } catch (e) { grid.innerHTML = '<div class="alert-error">Error al sincronizar balances.</div>'; }
}

// Auxiliares
function fmtDate(d) {
    if (!d) return '-';
    const date = new Date(d);
    return isNaN(date.getTime()) ? d : date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}

async function deleteExpense(id) { if (confirm('¿Eliminar este gasto?')) { await CortijoAPI.deleteExpense(id); renderExpenses(); } }
async function deleteIncome(id) { if (confirm('¿Eliminar este ingreso?')) { await CortijoAPI.deleteIncome(id); renderIncomes(); } }

// Inicialización
document.addEventListener('DOMContentLoaded', () => { lucide.createIcons(); });
