// VERSION: V1.1.3 - Dashboard section restored

// App State
let currentUser = null;
let selectedYear = new Date().getFullYear();

// DOM Elements
const sectionElements = {
    dashboard: document.getElementById('dashboard-section'),
    expenses: document.getElementById('expenses-section'),
    income: document.getElementById('income-section'),
    documents: document.getElementById('documents-section'),
    tasks: document.getElementById('tasks-section'),
    inventory: document.getElementById('inventory-section'),
    split: document.getElementById('split-section'),
    settings: document.getElementById('settings-section'),
    admin: document.getElementById('admin-section'),
    home: document.getElementById('home-section'),
    history: document.getElementById('history-section'),
    contact: document.getElementById('contact-section'),
    calendar: document.getElementById('calendar-section'),
    profile: document.getElementById('profile-section')
};

const navLinks = document.querySelectorAll('.nav-link');

// Navigation
function showSection(sectionId) {
    // 1. Hide all sections
    Object.values(sectionElements).forEach(el => {
        if (el) el.classList.add('hidden');
    });
    
    // 2. Extra check for consistency with index.html IDs
    const allSections = document.querySelectorAll('.content-section, .hero-section');
    allSections.forEach(sec => sec.classList.add('hidden'));

    // 3. Show target
    const target = sectionElements[sectionId] || document.getElementById(`${sectionId}-section`);
    if (target) {
        target.classList.remove('hidden');
    }

    // 4. Update Nav Links UI
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.dataset.section === sectionId) link.classList.add('active');
    });

    // Close mobile menu if open
    toggleMobileMenu(true);

    // Trigger section-specific loading
    if (sectionId === 'split') renderExpenseSplit();
    if (sectionId === 'inventory') loadInventoryData().then(renderInventory);
    if (sectionId === 'documents') renderDocuments();
    if (sectionId === 'tasks') renderTasks();
    if (sectionId === 'admin') renderAudit();
    if (sectionId === 'expenses') loadExpenses();
    if (sectionId === 'income') loadIncome();
}

// UI HELPERS (Used by index.html)
function showLogin() { document.getElementById('auth-container')?.classList.remove('hidden'); }
function hideLogin() { document.getElementById('auth-container')?.classList.add('hidden'); }
function signOut() { logout(); }
function toggleMobileMenu(forceClose = false) {
    const nav = document.getElementById('private-nav');
    if (nav) {
        if (forceClose) nav.classList.add('hidden');
        else nav.classList.toggle('hidden');
    }
}

// ALIASES FOR INTERFACE (Matches index.html)
function changeExpYear(val) { selectedYear = val; loadExpenses(); }
function changeIncYear(val) { selectedYear = val; loadIncome(); }
function changeDocYear(val) { selectedYear = val; renderDocuments(); }
function changeTaskYear(val) { selectedYear = val; renderTasks(); }

// Modal control
function openExpenseModal() { openAddExpenseModal(); }
function openIncomeModal() { openAddIncomeModal(); }
function openInventoryModal() { openAddInventoryModal(); }
function openTaskModal() { openNewTaskModal(); }

// --- GOOGLE IDENTITY SERVICES ---
function initAuth() {
    if (typeof google === 'undefined') return;
    google.accounts.id.initialize({
        client_id: window.CONFIG?.GOOGLE_CLIENT_ID || '991206649735-8h0psdve7tkhpghr6g8e55e5u5r2dkhl.apps.googleusercontent.com',
        callback: handleCredentialResponse
    });
}

async function handleCredentialResponse(r) {
    const p = JSON.parse(atob(r.credential.split('.')[1]));
    const email = p.email;

    document.getElementById('loader').style.display = 'flex';
    try {
        const auth = await CortijoAPI.checkEmail(email);
        if (auth.authorized) {
            currentUser = { email: email, name: p.name, picture: p.picture };
            localStorage.setItem('user', JSON.stringify(currentUser));
            setupApp();
        } else {
            alert("Acceso denegado para: " + email);
        }
    } catch (e) {
        alert("Error de autenticación: " + e.message);
    } finally {
        document.getElementById('loader').style.display = 'none';
    }
}

function setupApp() {
    const loginScreen = document.getElementById('login-screen');
    const appScreen = document.getElementById('app-screen');
    const publicNav = document.getElementById('public-nav');
    const privateNav = document.getElementById('private-nav');
    const userInfo = document.getElementById('user-info');

    if (loginScreen) loginScreen.classList.add('hidden');
    if (appScreen) appScreen.classList.remove('hidden');
    if (publicNav) publicNav.classList.add('hidden');
    if (privateNav) privateNav.classList.remove('hidden');
    if (userInfo) {
        userInfo.classList.remove('hidden');
        const nameEl = document.getElementById('user-name'), avEl = document.getElementById('user-avatar');
        if (nameEl) nameEl.textContent = currentUser.name || '';
        if (avEl && currentUser.picture) avEl.src = currentUser.picture;
    }
    
    updateDashboard();
    showSection('dashboard');
}

function logout() {
    localStorage.removeItem('user');
    location.reload();
}

// --- DASHBOARD ---
async function updateDashboard() {
    try {
        const balance = await CortijoAPI.getBalance(selectedYear);
        const expEl = document.getElementById('total-expenses-card');
        const incEl = document.getElementById('total-income-card');
        const netEl = document.getElementById('balance-neto-card');
        
        if (expEl) expEl.textContent = `${balance.totalGastos.toFixed(2)} €`;
        if (incEl) incEl.textContent = `${balance.totalIngresos.toFixed(2)} €`;
        if (netEl) netEl.textContent = `${balance.balanceNeto.toFixed(2)} €`;
    } catch (e) {
        console.error("Dashboard Error:", e);
    }
}

// --- EXPENSES ---
async function loadExpenses() {
    const tableBody = document.querySelector('#expenses-table tbody');
    if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="6">Cargando...</td></tr>';
    try {
        const expenses = await CortijoAPI.getExpenses(selectedYear);
        tableBody.innerHTML = expenses.map(e => `
            <tr>
                <td>${formatDateDisplay(e.fecha)}</td>
                <td>${e.concepto}</td>
                <td><span class="badge badge-category">${e.categoria}</span></td>
                <td><strong>${parseFloat(e.cantidad).toFixed(2)} €</strong></td>
                <td>${e.pagado_por}</td>
                <td>
                    <div style="display:flex;gap:5px;">
                        ${e.url_drive ? `<button class="btn-icon" onclick="window.open('${e.url_drive}', '_blank')" title="Ver Factura">📄</button>` : ''}
                        <button class="btn-icon" onclick="openEditExpenseModal(${e.id})" title="Editar">✏️</button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (e) {
        tableBody.innerHTML = '<tr><td colspan="6">Error al cargar datos.</td></tr>';
    }
}

function openAddExpenseModal() {
    openModal('Registrar Gasto', `
        <form id="expense-form">
            <div class="form-group"><label>Concepto</label><input type="text" id="econ" required></div>
            <div class="form-group"><label>Cantidad (€)</label><input type="number" step="0.01" id="ecan" required></div>
            <div class="form-group"><label>Fecha</label><input type="date" id="efec" value="${new Date().toISOString().split('T')[0]}" required></div>
            <div class="form-group"><label>Categoría</label>
                <select id="ecat">
                    <option value="Suministros">Suministros (Luz, Agua)</option>
                    <option value="Mantenimiento">Mantenimiento</option>
                    <option value="Impuestos">Impuestos / IBI</option>
                    <option value="Personal">Personal / Limpieza</option>
                    <option value="Otros">Otros</option>
                </select>
            </div>
            <div class="form-group"><label>Pagado por</label>
                <select id="epag">
                    ${Object.keys(window.CONFIG.EXPENSE_PERCENTAGES).map(name => `<option value="${name}">${name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group"><label>Factura/Ticket (Imagen/PDF)</label><input type="file" id="efile" accept="image/*,.pdf"></div>
            <button type="submit" class="btn-primary" style="width:100%">Guardar Gasto</button>
        </form>
    `);

    document.getElementById('expense-form').onsubmit = async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        btn.disabled = true; btn.textContent = 'Enviando...';
        
        const data = {
            id: Date.now(),
            concepto: document.getElementById('econ').value,
            cantidad: parseFloat(document.getElementById('ecan').value),
            fecha: document.getElementById('efec').value,
            categoria: document.getElementById('ecat').value,
            pagado_por: document.getElementById('epag').value
        };

        const file = document.getElementById('efile').files[0];
        try {
            await CortijoAPI.createExpense(data, file, new Date(data.fecha).getFullYear());
            loadExpenses(); updateDashboard(); closeModal();
        } catch (err) {
            alert("Error: " + err.message);
            btn.disabled = false; btn.textContent = 'Guardar Gasto';
        }
    };
}

// --- INCOME ---
async function loadIncome() {
    const tableBody = document.querySelector('#income-table tbody');
    if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="6">Cargando...</td></tr>';
    try {
        const income = await CortijoAPI.getIncome(selectedYear);
        tableBody.innerHTML = income.map(i => `
            <tr>
                <td>${formatDateDisplay(i.fecha)}</td>
                <td>${i.concepto}</td>
                <td>${i.recibido_de}</td>
                <td><strong>${parseFloat(i.importe).toFixed(2)} €</strong></td>
                <td><span class="badge badge-category">${i.categoria}</span></td>
                <td>
                    ${i.url_drive ? `<button class="btn-icon" onclick="window.open('${i.url_drive}', '_blank')">📄</button>` : ''}
                </td>
            </tr>
        `).join('');
    } catch (e) {
        tableBody.innerHTML = '<tr><td colspan="6">Error al cargar datos.</td></tr>';
    }
}

function openAddIncomeModal() {
    openModal('Registrar Ingreso', `
        <form id="income-form">
            <div class="form-group"><label>Concepto</label><input type="text" id="icon" required></div>
            <div class="form-group"><label>Importe (€)</label><input type="number" step="0.01" id="iimp" required></div>
            <div class="form-group"><label>Fecha</label><input type="date" id="ifec" value="${new Date().toISOString().split('T')[0]}" required></div>
            <div class="form-group"><label>Origen</label><input type="text" id="iore" placeholder="Ej: Airbnb, Particular..."></div>
            <div class="form-group"><label>Categoría</label>
                <select id="icat">
                    <option value="Alquiler">Alquiler Cortijo</option>
                    <option value="Subvención">Subvención</option>
                    <option value="Otros">Otros</option>
                </select>
            </div>
            <button type="submit" class="btn-primary" style="width:100%">Guardar Ingreso</button>
        </form>
    `);
    document.getElementById('income-form').onsubmit = async (e) => {
        e.preventDefault();
        const data = {
            id: Date.now(),
            concepto: document.getElementById('icon').value,
            importe: parseFloat(document.getElementById('iimp').value),
            fecha: document.getElementById('ifec').value,
            recibido_de: document.getElementById('iore').value,
            categoria: document.getElementById('icat').value
        };
        await CortijoAPI.createIncome(data);
        loadIncome(); updateDashboard(); closeModal();
    };
}

// --- REPARTO DE GASTOS (INTEGRACIÓN ANGELITA) ---
async function renderExpenseSplit() {
    const yearSelect = document.getElementById('split-year-select');
    if (!yearSelect) return;
    
    // Populate year select if empty
    if (yearSelect.options.length === 0) {
        const currentY = new Date().getFullYear();
        for (let y = currentY + 1; y >= currentY - 5; y--) {
            yearSelect.innerHTML += `<option value="${y}" ${y === selectedYear ? 'selected' : ''}>${y}</option>`;
        }
    }
    
    selectedYear = yearSelect.value;
    
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
        balancesContainer.innerHTML = '';
        debtsContainer.innerHTML = '';
        document.getElementById('loader').style.display = 'none';
        return;
    }
    document.getElementById('loader').style.display = 'none';
    let totalExpenses = 0;
    const paidByPerson = {};
    const percentages = window.CONFIG.EXPENSE_PERCENTAGES || {};
    
    Object.keys(percentages).forEach(person => {
        paidByPerson[person] = 0;
    });

    expenses.forEach(exp => {
        const amount = parseFloat(exp.cantidad) || 0;
        totalExpenses += amount;
        const payer = exp.pagado_por || 'Otros';
        if (paidByPerson[payer] !== undefined) {
            paidByPerson[payer] += amount;
        } else {
            paidByPerson[payer] = amount;
            percentages[payer] = 0;
        }
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
        const balanceColor = b.balance >= 0 ? 'var(--success)' : 'var(--danger)';
        const balanceSign = b.balance >= 0 ? '+' : '';
        return `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid var(--bg-main);">
                <div>
                    <strong>${b.person}</strong>
                    <div style="font-size:0.8rem; color:var(--text-muted);">Pagado: ${b.paid.toFixed(2)}€ | Debería: ${b.shouldHavePaid.toFixed(2)}€ (${(window.CONFIG.EXPENSE_PERCENTAGES[b.person] || 0)}%)</div>
                </div>
                <div style="font-weight:bold; color:${balanceColor};">
                    ${balanceSign}${b.balance.toFixed(2)} €
                </div>
            </div>
        `;
    }).join('');

    renderExcludedBalances(excludedData);

    debtsContainer.innerHTML = `
        <div style="text-align:center; padding:1.5rem; background:var(--bg-main); border-radius:12px; margin-bottom:20px; border:1px dashed var(--border);">
            <p style="font-size:0.9rem; color:var(--text-muted); margin-bottom:5px;">Liquidaciones directas entre hermanos activos</p>
        </div>
        <div id="tricount-payments-container"></div>
    `;

    const optimizedPayments = generarReembolsos(activeBalances);
    mostrarReembolsos(optimizedPayments);
}

function renderExcludedBalances(data) {
    const container = document.getElementById('excluded-balances-container');
    if (!container) return;
    if (data.length === 0) {
        container.innerHTML = `<p style="color:var(--text-muted);">No hay familiares excluidos.</p>`;
        return;
    }
    container.innerHTML = data.map(ex => `
        <div class="card" style="background:var(--bg-main); padding:1rem; border-radius:12px; border-left:4px solid var(--accent); margin-bottom:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <strong>${ex.person}</strong>
                    <div style="font-size:0.8rem; color:var(--text-muted);">Aportación Teórica (${ex.percentage}%)</div>
                </div>
                <div style="font-size:1.2rem; font-weight:700; color:var(--accent);">${ex.shouldHavePaid.toFixed(2)} €</div>
            </div>
        </div>
    `).join('');
}

async function saveExcludedPending(person, year, amount) {
    try {
        await CortijoAPI.savePendingBalance({
            año: year, familiar: person, aportacionIdeal: amount,
            fechaActualizacion: new Date().toISOString(), notas: 'Automático'
        });
    } catch (e) { console.warn("saveExcludedPending Error:", e); }
}

async function calculateFinalLiquidation() {
    const resultContainer = document.getElementById('final-liquidation-result');
    if (!resultContainer) return;
    resultContainer.classList.remove('hidden');
    resultContainer.innerHTML = '<p>Calculando...</p>';
    document.getElementById('loader').style.display = 'flex';
    try {
        const res = await CortijoAPI.calculateSettlement(selectedYear);
        const { beneficioNeto, parteAngelita, saldoPendiente, liquidacionFinal, ingresosTotales, gastosTotales } = res;
        const color = liquidacionFinal >= 0 ? 'var(--success)' : 'var(--danger)';
        resultContainer.innerHTML = `
            <div style="text-align:center;">
                <h3>Liquidación Anual ${selectedYear}</h3>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin:1rem 0;">
                    <div style="background:var(--bg-main); padding:10px; border-radius:8px;">Ingresos: ${ingresosTotales.toFixed(2)}€</div>
                    <div style="background:var(--bg-main); padding:10px; border-radius:8px;">Gastos: ${gastosTotales.toFixed(2)}€</div>
                </div>
                <div style="font-size:1.5rem; font-weight:700; color:${color}; margin:1rem 0;">
                    Resultado: ${liquidacionFinal.toFixed(2)} €
                </div>
                <p style="font-size:0.8rem; color:var(--text-muted);">Parte Angelita: ${parteAngelita.toFixed(2)}€ - Deuda: ${saldoPendiente.toFixed(2)}€</p>
            </div>
        `;
    } catch (e) {
        resultContainer.innerHTML = '<p style="color:red">Error: ' + e.message + '</p>';
    } finally {
        document.getElementById('loader').style.display = 'none';
    }
}

function toggleSplitView() {
    const btn = document.getElementById('toggleViewBtn');
    const viewA = document.getElementById('split-view-a');
    const viewB = document.getElementById('split-view-b');
    if (viewA && viewB) {
        const isAHidden = viewA.classList.contains('hidden');
        if (isAHidden) {
            viewA.classList.remove('hidden'); viewB.classList.add('hidden');
            if (btn) btn.textContent = 'Ver Reembolsos Sugeridos';
        } else {
            viewA.classList.add('hidden'); viewB.classList.remove('hidden');
            if (btn) btn.textContent = 'Ver Saldos Individuales';
        }
    }
}

function generarReembolsos(balances) {
    let debtors = balances.filter(b => b.balance < 0).map(b => ({ person: b.person, amount: Math.abs(b.balance) }));
    let creditors = balances.filter(b => b.balance > 0).map(b => ({ person: b.person, amount: b.balance }));
    const payments = [];
    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
        const d = debtors[i], c = creditors[j];
        const settledAmount = Math.min(d.amount, c.amount);
        payments.push({ from: d.person, to: c.person, amount: settledAmount });
        d.amount -= settledAmount; c.amount -= settledAmount;
        if (d.amount < 0.01) i++;
        if (c.amount < 0.01) j++;
    }
    return payments;
}

function mostrarReembolsos(payments) {
    const container = document.getElementById('tricount-payments-container') || document.getElementById('split-reimbursements-container');
    if (!container) return;
    if (payments.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding:20px; color:var(--success);">¡Cuentas equilibradas! 🥂</p>';
        return;
    }
    container.innerHTML = payments.map(p => `
        <div class="payment-card" style="background:var(--bg-card); padding:1rem; border-radius:12px; margin-bottom:10px; border-left:4px solid var(--primary); display:flex; justify-content:space-between; align-items:center;">
            <span><strong>${p.from}</strong> → <strong>${p.to}</strong></span>
            <span style="font-weight:700; color:var(--primary);">${p.amount.toFixed(2)} €</span>
        </div>
    `).join('');
}

// --- DOCUMENTS ---
let cachedDocs = [];
async function renderDocuments() {
    const list = document.getElementById('document-list');
    if (!list) return;
    list.innerHTML = '<p>Cargando...</p>';
    try {
        const data = await CortijoAPI.getDocuments(selectedYear);
        cachedDocs = data;
        if (!data || !data.length) { list.innerHTML = `<p>No hay documentos para ${selectedYear}.</p>`; return; }
        list.innerHTML = data.map(d => `
            <div class="document-item" style="background:var(--bg-card); padding:1rem; border-radius:12px; text-align:center;">
                <h4 style="margin-bottom:10px;">${d.name}</h4>
                <button class="btn-small" onclick="window.open('${d.url_drive}', '_blank')">👁️ Ver</button>
            </div>
        `).join('');
    } catch (e) { list.innerHTML = '<p>Error.</p>'; }
}

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    document.getElementById('loader').style.display = 'flex';
    try {
        await CortijoAPI.uploadAndRecordDocument({ id: Date.now(), name: file.name, year: selectedYear, date: new Date().toISOString() }, file);
        renderDocuments();
    } catch (e) { alert(e.message); }
    finally { document.getElementById('loader').style.display = 'none'; event.target.value = ''; }
}

// --- TASKS ---
async function renderTasks() {
    const lists = { waiting: document.getElementById('list-waiting'), running: document.getElementById('list-running'), completed: document.getElementById('list-completed') };
    if (!lists.waiting) return;
    try {
        const data = await CortijoAPI.getTasks(selectedYear);
        Object.values(lists).forEach(l => l.innerHTML = '');
        data.forEach(t => {
            const card = document.createElement('div'); card.className = 'task-card'; card.innerHTML = `<strong>${t.title}</strong><br><small>${t.priority}</small>`;
            if (lists[t.status]) lists[t.status].appendChild(card);
        });
    } catch (e) { console.error(e); }
}

// --- INVENTARIO ---
let inventoryData = [];
async function loadInventoryData() { try { inventoryData = await CortijoAPI.getInventory(); } catch (e) {} }
function renderInventory() {
    const grid = document.getElementById('inventory-grid') || document.getElementById('inventory-body');
    if (!grid) return;
    grid.innerHTML = inventoryData.map(i => `<div>${i.articulo} (${i.cantidad})</div>`).join('');
}

// --- AUDITORIA ---
async function renderAudit() {
    const list = document.getElementById('audit-list') || document.getElementById('audit-log-container');
    if (!list) return;
    try {
        const data = await CortijoAPI.listAudit(currentUser.email);
        list.innerHTML = data.reverse().map(a => `<div style="font-size:0.8rem;">${a.timestamp}: ${a.accion}</div>`).join('');
    } catch (e) {}
}

// --- HELPERS ---
function formatDateDisplay(iso) { return iso ? new Date(iso).toLocaleDateString('es-ES') : '-'; }
function openModal(title, content) {
    const t = document.getElementById('modal-title'), b = document.getElementById('modal-content'), c = document.getElementById('modal-container');
    if (t) t.textContent = title; if (b) b.innerHTML = content; if (c) c.classList.remove('hidden');
}
function closeModal() { document.getElementById('modal-container')?.classList.add('hidden'); }

// Initialize
window.onload = () => {
    setTimeout(() => { document.getElementById('loader').style.display = 'none'; }, 1000);
    const savedUser = localStorage.getItem('user');
    if (savedUser) { currentUser = JSON.parse(savedUser); setupApp(); }
    else { showSection('home'); initAuth(); }
    if (typeof lucide !== 'undefined') lucide.createIcons();
};
