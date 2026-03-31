// VERSION: V2.0.7 - Auditoría Total / Blindaje Final Balances
// BACKED BY Google Apps Script V2.0.7

// App State
let currentUser = null;
let currentExpYear = new Date().getFullYear();
let currentIncYear = new Date().getFullYear();
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
            renderExpenses();
        } else {
            alert('Acceso no autorizado.');
        }
    } catch (e) {
        alert('Error de conexión con el Cortijo.');
    }
}

function showSection(id) {
    document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
    document.getElementById(id).style.display = 'block';
    
    // Auto-render según sección
    if (id === 'expenses-section') renderExpenses();
    if (id === 'income-section') renderIncomes();
    if (id === 'balance-section') renderPersonalZone(currentExpYear);
}

// --- GASTOS ---
async function renderExpenses() {
    const list = document.getElementById('expense-list');
    if (!list) return;
    list.innerHTML = '<tr><td colspan="6">Cargando facturas...</td></tr>';
    try {
        const data = await CortijoAPI.getExpenses(currentExpYear);
        cachedExpenses = data;
        renderExpenseTable(data);
    } catch (e) { list.innerHTML = '<tr><td colspan="6">Error al cargar gastos</td></tr>'; }
}

function renderExpenseTable(data) {
    const list = document.getElementById('expense-list');
    let total = 0;
    list.innerHTML = data.map(e => {
        const cant = parseFloat(e.cantidad) || 0;
        total += cant;
        return `<tr>
            <td>${fmtDate(e.fecha)}</td>
            <td>${e.concepto} ${e.url_drive ? `<a href="${e.url_drive}" target="_blank">📎</a>` : ''}</td>
            <td><span class="badge">${e.categoria || 'General'}</span></td>
            <td class="amount-negative">-${cant.toFixed(2)}€</td>
            <td>${e.pagado_por || '-'}</td>
            <td class="actions-cell">
                <button class="btn-icon-small" onclick="deleteExpense('${e.id}')">🗑️</button>
            </td>
        </tr>`;
    }).join('');
    document.getElementById('total-balance').textContent = `${total.toFixed(2)} €`;
}

// --- INGRESOS ---
async function renderIncomes() {
    const list = document.getElementById('income-list');
    if (!list) return;
    list.innerHTML = '<tr><td colspan="6">Cargando ingresos...</td></tr>';
    try {
        const data = await CortijoAPI.getIncomes(currentIncYear);
        cachedIncomes = data;
        renderIncomeTable(data);
    } catch (e) { list.innerHTML = '<tr><td colspan="6">Error al cargar ingresos</td></tr>'; }
}

function renderIncomeTable(data) {
    const list = document.getElementById('income-list');
    list.innerHTML = data.map(e => {
        const imp = parseFloat(e.importe) || 0;
        return `<tr>
            <td>${fmtDate(e.fecha)}</td>
            <td>${e.concepto}</td>
            <td><span class="badge-category-income">${e.categoria || 'Hucha'}</span></td>
            <td class="amount-positive">+${imp.toFixed(2)}€</td>
            <td>${e.recibido_de || '-'}</td>
            <td class="actions-cell">
                <button class="btn-icon-small" onclick="deleteIncome('${e.id}')">🗑️</button>
            </td>
        </tr>`;
    }).join('');
}

// --- ZONA PERSONAL (EL CORAZÓN DEL ERP) ---
async function renderPersonalZone(year) {
    const grid = document.getElementById('personal-zone-grid');
    if (!grid) return;
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding:3rem;"><p>Calculando balances familiares...</p></div>';
    
    try {
        const data = await CortijoAPI.getMemberStatus(year);
        grid.innerHTML = data.map(m => {
            const statusClass = m.saldo > 0 ? 'positive' : (m.saldo < 0 ? 'negative' : 'neutral');
            const statusText = m.saldo > 0 ? 'Con Crédito' : (m.saldo < 0 ? 'Con Deuda' : 'Equilibrado');
            return `
            <div class="personal-card ${statusClass}">
                <div class="card-header">
                    <div>
                        <h3>${m.persona}</h3>
                        <span class="status-indicator">● ${statusText}</span>
                    </div>
                </div>
                <div class="card-body">
                    <div class="stat-row">
                        <span>Aportado Real</span>
                        <span class="val-positive">+${(parseFloat(m.ingresos)||0).toFixed(2)}€</span>
                    </div>
                    <div class="stat-row">
                        <span>Cuota Gastos</span>
                        <span class="val-negative">-${(parseFloat(m.gastos)||0).toFixed(2)}€</span>
                    </div>
                    <div class="saldo-hero">
                        <small>SALDO ACTUAL</small>
                        <h3>${(parseFloat(m.saldo)||0).toFixed(2)}€</h3>
                    </div>
                </div>
            </div>`;
        }).join('');
    } catch (e) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding:3rem;">Error al procesar el reparto.</div>';
    }
}

// --- AUXILIARES ---
function fmtDate(d) {
    if (!d) return '-';
    const date = new Date(d);
    return isNaN(date) ? d : date.toLocaleDateString('es-ES');
}

async function deleteExpense(id) {
    if (confirm('¿Eliminar este gasto?')) {
        await CortijoAPI.deleteExpense(id);
        renderExpenses();
    }
}

async function deleteIncome(id) {
    if (confirm('¿Eliminar este ingreso?')) {
        await CortijoAPI.deleteIncome(id);
        renderIncomes();
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    // Si hay año en el selector, sincronizar
    const yearSel = document.getElementById('year-selector');
    if (yearSel) yearSel.addEventListener('change', (e) => {
        currentExpYear = e.target.value;
        currentIncYear = e.target.value;
        showSection(document.querySelector('.content-section:not([style*="display: none"])').id);
    });
});
