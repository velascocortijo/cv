// App State
let currentUser = null;
let currentDocYear = new Date().getFullYear();
let currentTaskYear = new Date().getFullYear();
let cachedTasks = [];

// DOM Elements
const sections = ['dashboard', 'expenses', 'income', 'documents', 'tasks', 'inventory', 'split', 'settings', 'admin'];
const navLinks = document.querySelectorAll('.nav-link');
const sectionElements = sections.reduce((acc, section) => {
    acc[section] = document.getElementById(`${section}-section`);
    return acc;
}, {});

// Navigation
function showSection(sectionId) {
    Object.values(sectionElements).forEach(el => {
        if (el) el.classList.remove('active');
    });
    const target = sectionElements[sectionId];
    if (target) target.classList.add('active');

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.dataset.section === sectionId) link.classList.add('active');
    });

    // Close mobile menu if open
    document.getElementById('mobile-menu')?.classList.add('hidden');

    // Trigger section-specific loading if needed
    if (sectionId === 'split') renderExpenseSplit();
    if (sectionId === 'inventory') loadInventoryData().then(() => renderInventory());
    if (sectionId === 'documents') renderDocuments();
    if (sectionId === 'tasks') renderTasks();
    if (sectionId === 'admin') renderAudit();
}

navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        showSection(link.dataset.section);
    });
});

document.getElementById('mobile-menu-btn')?.addEventListener('click', () => {
    document.getElementById('mobile-menu')?.classList.toggle('hidden');
});

// --- GOOGLE IDENTITY SERVICES ---
function initAuth() {
    google.accounts.id.initialize({
        client_id: '991206649735-8h0psdve7tkhpghr6g8e55e5u5r2dkhl.apps.googleusercontent.com',
        callback: handleCredentialResponse
    });
    google.accounts.id.renderButton(
        document.getElementById("google-signin-btn"),
        { theme: "outline", size: "large", text: "signin_with", shape: "pill" }
    );
}

// --- DASHBOARD ---
async function updateDashboard() {
    const year = new Date().getFullYear();
    try {
        const balance = await API.getBalance(year);
        document.getElementById('total-expenses-card').textContent = `${balance.totalGastos.toFixed(2)} €`;
        document.getElementById('total-income-card').textContent = `${balance.totalIngresos.toFixed(2)} €`;
        document.getElementById('balance-neto-card').textContent = `${balance.balanceNeto.toFixed(2)} €`;
    } catch (e) {
        console.error("Dashboard Error:", e);
    }
}

// --- EXPENSES ---
let expenseYear = new Date().getFullYear();
function changeExpenseYear(year) { expenseYear = year; document.getElementById('expense-year-display').textContent = year; loadExpenses(); }

async function loadExpenses() {
    const tableBody = document.querySelector('#expenses-table tbody');
    if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="6">Cargando...</td></tr>';
    try {
        const expenses = await API.getExpenses(expenseYear);
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
            await API.createExpense(data, file, new Date(data.fecha).getFullYear());
            addAudit(`Gastos: Añadido ${data.concepto} (${data.cantidad}€)`);
            loadExpenses(); updateDashboard(); closeModal();
        } catch (err) {
            alert("Error: " + err.message);
            btn.disabled = false; btn.textContent = 'Guardar Gasto';
        }
    };
}

// --- INCOME ---
let incomeYear = new Date().getFullYear();
function changeIncomeYear(year) { incomeYear = year; document.getElementById('income-year-display').textContent = year; loadIncome(); }

async function loadIncome() {
    const tableBody = document.querySelector('#income-table tbody');
    if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="6">Cargando...</td></tr>';
    try {
        const income = await API.getIncome(incomeYear);
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
        await API.createIncome(data);
        addAudit(`Ingresos: Añadido ${data.concepto} (${data.importe}€)`);
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
            yearSelect.innerHTML += `<option value="${y}" ${y === currentY ? 'selected' : ''}>${y}</option>`;
        }
    }
    
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
        expenses = await API.getExpenses(selectedYear);
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
    
    // Initialize paid amounts
    Object.keys(percentages).forEach(person => {
        paidByPerson[person] = 0;
    });

    // Calculate total expenses and amount paid by each person
    expenses.forEach(exp => {
        const amount = parseFloat(exp.cantidad) || 0;
        totalExpenses += amount;
        
        // Asume que exp.pagado_por coincide con las claves de percentages
        const payer = exp.pagado_por || 'Otros';
        if (paidByPerson[payer] !== undefined) {
            paidByPerson[payer] += amount;
        } else {
            // Si hay alguien que pagó que no está en la configuración
            paidByPerson[payer] = amount;
            percentages[payer] = 0; // Asignamos 0% por defecto
        }
    });

    const activeBalances = [];
    const excludedData = [];

    // 1. Clasificar y calcular saldos
    Object.keys(paidByPerson).forEach(person => {
        const paid = paidByPerson[person];
        const percentage = percentages[person] || 0;
        const shouldHavePaid = (totalExpenses * percentage) / 100;
        const balance = paid - shouldHavePaid;
        const status = window.CONFIG.FAMILY_STATUS[person] || 'activo';

        if (status === 'excluida_gastos') {
            // Caso Angelita: Calculamos su aportación ideal pero no participa en reembolsos
            if (percentage > 0) {
                excludedData.push({
                    person, percentage, totalExpenses, shouldHavePaid, year: selectedYear
                });
                saveExcludedPending(person, selectedYear, shouldHavePaid);
            }
        } else {
            // Familiares activos: Sí participan en el ajuste de cuentas
            if (percentage > 0 || paid > 0) {
                activeBalances.push({
                    person, paid, shouldHavePaid, balance
                });
            }
        }
    });

    // 2. Render Totales Globales
    summaryBox.innerHTML = `
        <h3 style="font-size:2rem; color:var(--primary); margin-bottom:0.5rem;">${totalExpenses.toFixed(2)} €</h3>
        <p style="color:var(--text-muted);">Gasto total familiar en ${selectedYear}</p>
    `;

    // 3. Render Saldos Individuales (Solo los activos)
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

    // 4. Mostrar familiares excluidos
    renderExcludedBalances(excludedData);

    // 5. Deudas directas (Tricount simplified)
    debtsContainer.innerHTML = `
        <div style="text-align:center; padding:1.5rem; background:var(--bg-main); border-radius:12px; margin-bottom:20px; border:1px dashed var(--border);">
            <p style="font-size:0.9rem; color:var(--text-muted); margin-bottom:5px;">Liquidaciones directas entre hermanos activos</p>
            <p style="font-size:0.75rem; color:var(--text-muted); margin:0;">El que debe paga directamente al que ha pagado de más.</p>
        </div>
        <div id="tricount-payments-container">
            <p style="text-align:center; padding:10px; color:var(--text-muted);">Calculando optimización de pagos...</p>
        </div>
    `;

    // 6. Generar Reembolsos Optimizados (Tricount) entre ACTIVOS
    const optimizedPayments = generarReembolsos(activeBalances);
    mostrarReembolsos(optimizedPayments);
}

function toggleSplitView() {
    const btn = document.getElementById('toggleViewBtn');
    const viewA = document.getElementById('split-view-a');
    const viewB = document.getElementById('split-view-b');
    
    if (viewA.style.display === 'none') {
        viewA.style.display = 'block';
        viewB.style.display = 'none';
        btn.textContent = 'Ver Reembolsos Sugeridos';
    } else {
        viewA.style.display = 'none';
        viewB.style.display = 'block';
        btn.textContent = 'Ver Saldos Individuales';
    }
}

// Algoritmo de liquidación simplificada (Estilo Tricount/Splitwise)
function generarReembolsos(balances) {
    let debtors = balances.filter(b => b.balance < 0).map(b => ({ person: b.person, amount: Math.abs(b.balance) }));
    let creditors = balances.filter(b => b.balance > 0).map(b => ({ person: b.person, amount: b.balance }));
    
    const payments = [];
    
    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
        const d = debtors[i];
        const c = creditors[j];
        
        const settledAmount = Math.min(d.amount, c.amount);
        payments.push({ from: d.person, to: c.person, amount: settledAmount });
        
        d.amount -= settledAmount;
        c.amount -= settledAmount;
        
        if (d.amount < 0.01) i++;
        if (c.amount < 0.01) j++;
    }
    
    return payments;
}

function mostrarReembolsos(payments) {
    const container = document.getElementById('tricount-payments-container');
    if (!container) return;
    
    if (payments.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding:20px; color:var(--success); font-weight:bold;">¡Las cuentas están perfectamente equilibradas! 🥂</p>';
        return;
    }
    
    container.innerHTML = payments.map(p => `
        <div class="payment-card" style="background:var(--bg-card); padding:1rem; border-radius:12px; margin-bottom:10px; border:1px solid var(--border); display:flex; align-items:center; gap:15px; border-left:4px solid var(--primary);">
            <div style="flex-grow:1;">
                <strong style="color:var(--danger);">${p.from}</strong> 
                <span style="color:var(--text-muted);">debe pagar a</span> 
                <strong style="color:var(--success);">${p.to}</strong>
            </div>
            <div style="font-size:1.2rem; font-weight:700; color:var(--primary); white-space:nowrap;">
                ${p.amount.toFixed(2)} €
            </div>
            <button class="btn-icon" onclick="alert('Funcionalidad de Bizum en desarrollo... \\nIndica a ${p.from} que envíe ${p.amount.toFixed(2)}€ a ${p.to}.')" title="Notificar">📲</button>
        </div>
    `).join('');
}

// --- INVENTARIO ---
let inventoryData = [];
async function loadInventoryData() {
    try {
        inventoryData = await API.getInventory();
    } catch (e) {
        console.error("Inventory Load Error:", e);
    }
}

function renderInventory() {
    const container = document.getElementById('inventory-grid');
    if (!container) return;
    
    if (!inventoryData || inventoryData.length === 0) {
        container.innerHTML = '<p>No hay artículos registrados.</p>';
        return;
    }

    container.innerHTML = inventoryData.map(item => `
        <div class="inventory-card">
            ${item.foto_url ? `<img src="${item.foto_url}" class="inventory-img" alt="${item.articulo}">` : '<div class="inventory-img" style="background:var(--bg-main);display:flex;align-items:center;justify-content:center;">📦</div>'}
            <div class="inventory-info">
                <span class="badge badge-category" style="font-size:0.7rem;">${item.categoria}</span>
                <h4 style="margin:5px 0;">${item.articulo}</h4>
                <p style="font-size:0.8rem; color:var(--text-muted);">${item.marca_modelo || ''}</p>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;">
                    <span style="font-weight:bold; color:var(--primary);">${item.cantidad} ${item.unidad}</span>
                    <span style="font-size:0.8rem; padding:2px 6px; border-radius:4px; background:var(--bg-main); color:var(${item.estado === 'Bueno' ? '--success' : '--danger'})">${item.estado}</span>
                </div>
                <div style="display:flex;gap:5px;margin-top:15px;">
                    <button class="btn-small" style="flex:1" onclick="openEditInventoryModal(${item.id})">Editar</button>
                    <button class="btn-small btn-danger" onclick="deleteInventoryItem(${item.id})">🗑️</button>
                </div>
            </div>
        </div>
    `).join('');
}

function openAddInventoryModal() {
    openModal('Añadir Artículo', `
        <form id="inv-form">
            <div class="form-group"><label>Categoría</label>
                <select id="invcat">
                    <option value="Maquinaria">Maquinaria / Herramientas</option>
                    <option value="Mobiliario">Mobiliario</option>
                    <option value="Electrodomésticos">Electrodomésticos</option>
                    <option value="Textil">Textil / Ropa de Cama</option>
                    <option value="Otros">Otros</option>
                </select>
            </div>
            <div class="form-group"><label>Artículo</label><input type="text" id="invart" required></div>
            <div class="form-group"><label>Marca / Modelo</label><input type="text" id="invmod"></div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <div class="form-group"><label>Cantidad</label><input type="number" id="invcan" value="1" required></div>
                <div class="form-group"><label>Unidad</label><input type="text" id="invuni" value="uds"></div>
            </div>
            <div class="form-group"><label>Estado</label>
                <select id="invst">
                    <option value="Nuevo">Nuevo</option>
                    <option value="Bueno">Bueno</option>
                    <option value="Regular">Regular</option>
                    <option value="Necesita Reparación">Necesita Reparación</option>
                </select>
            </div>
            <div class="form-group"><label>Ubicación</label><input type="text" id="invloc" placeholder="Ej: Garaje, Salón..."></div>
            <div class="form-group"><label>Foto</label><input type="file" id="invfile" accept="image/*"></div>
            <button type="submit" class="btn-primary" style="width:100%">Registrar Artículo</button>
        </form>
    `);
    document.getElementById('inv-form').onsubmit = handleAddInventorySubmit;
}

async function handleAddInventorySubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true; btn.textContent = 'Registrando...';
    
    const data = {
        id: Date.now(),
        categoria: document.getElementById('invcat').value,
        articulo: document.getElementById('invart').value,
        marca_modelo: document.getElementById('invmod').value,
        cantidad: parseFloat(document.getElementById('invcan').value),
        unidad: document.getElementById('invuni').value,
        estado: document.getElementById('invst').value,
        ubicacion: document.getElementById('invloc').value,
        timestamp: new Date().toISOString()
    };

    const file = document.getElementById('invfile').files[0];
    try {
        await API.addInventory(data, file);
        addAudit(`Inventario: Añadido ${data.articulo}`);
        loadInventoryData().then(() => { renderInventory(); closeModal(); });
    } catch (err) {
        alert("Error: " + err.message);
        btn.disabled = false; btn.textContent = 'Registrar Artículo';
    }
}

function openEditInventoryModal(id) {
    const item = inventoryData.find(i => i.id == id);
    if (!item) return;

    openModal('Editar Artículo', `
        <form id="edit-inv-form">
            <div class="form-group"><label>Artículo</label><input type="text" id="einvart" value="${item.articulo}" required></div>
            <div class="form-group"><label>Cantidad</label><input type="number" id="einvcan" value="${item.cantidad}" required></div>
            <div class="form-group"><label>Unidad</label><input type="text" id="einvu" value="${item.unidad}"></div>
            <div class="form-group"><label>Estado</label>
                <select id="einvst">
                    <option value="Nuevo" ${item.estado === 'Nuevo' ? 'selected' : ''}>Nuevo</option>
                    <option value="Bueno" ${item.estado === 'Bueno' ? 'selected' : ''}>Bueno</option>
                    <option value="Regular" ${item.estado === 'Regular' ? 'selected' : ''}>Regular</option>
                    <option value="Necesita Reparación" ${item.estado === 'Necesita Reparación' ? 'selected' : ''}>Necesita Reparación</option>
                </select>
            </div>
            <div class="form-group"><label>Ubicación</label><input type="text" id="einvloc" value="${item.ubicacion || ''}"></div>
            <div class="form-group"><label>Precio Estimado (€)</label><input type="number" id="einvpr" value="${item.precio || 0}"></div>
            <div class="form-group"><label>Observaciones</label><textarea id="einvobs">${item.observaciones || ''}</textarea></div>
            <div class="form-group"><label>Nueva Foto (Opcional)</label><input type="file" id="einvfile" accept="image/*"></div>
            <button type="submit" class="btn-primary" style="width:100%">Actualizar Artículo</button>
        </form>
    `);

    document.getElementById('edit-inv-form').onsubmit = async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        btn.disabled = true; btn.textContent = 'Actualizando...';
        
        const file = document.getElementById('einvfile').files[0];
        try {
            const updatedData = {
                articulo: document.getElementById('einvart').value,
                cantidad: parseFloat(document.getElementById('einvcan').value),
                unidad: document.getElementById('einvu').value,
                estado: document.getElementById('einvst').value,
                ubicacion: document.getElementById('einvloc').value,
                precio: parseFloat(document.getElementById('einvpr').value) || 0,
                observaciones: document.getElementById('einvobs').value
            };

            await API.updateInventory(id, updatedData, file);
            addAudit(`Inventario: Editado ${updatedData.articulo}`);
            loadInventoryData().then(() => { renderInventory(); closeModal(); });
        } catch (err) {
            alert("Error al actualizar: " + err.message);
            btn.disabled = false; btn.textContent = 'Actualizar Artículo';
        }
    };
}

async function deleteInventoryItem(id) {
    if (confirm("¿Estás seguro de que deseas eliminar este artículo del inventario?")) {
        try {
            await API.deleteInventory(id);
            addAudit(`Inventario: Eliminado ítem ${id}`);
            loadInventoryData().then(() => renderInventory());
        } catch (err) {
            alert("Error al eliminar: " + err.message);
        }
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
        const data = await API.getDocuments(currentDocYear);
        if (data.error) throw new Error(data.error);
        cachedDocs = data;
        if (!data || !data.length) { list.innerHTML = `<p style="text-align:center; padding:2rem; color:var(--text-muted);">No hay documentos para el año ${currentDocYear}.</p>`; return; }
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
        list.innerHTML = `<p style="color:var(--danger)">Error al cargar documentos: ${e.message}</p>`;
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
        await API.updateDocument(id, { name: document.getElementById('edon').value });
        renderDocuments(); closeModal();
    };
}

async function confirmDeleteDocument(id) {
    if (confirm("¿Seguro que quieres eliminar este documento? Se borrará de la lista (el archivo seguirá en Drive).")) {
        await API.deleteDocument(id);
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

        await API.uploadAndRecordDocument(docData, file);
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
        const data = await API.getTasks(currentTaskYear);

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
                await API.updateTask(taskId, { status: newStatus });
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

        await API.addTask({
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

        await API.updateTask(id, {
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
    await API.updateTask(taskId, { subtasks: JSON.stringify(task.subtasks) });
    renderTasks();
}

async function confirmDeleteTask(id) {
    if (confirm("¿Seguro que quieres borrar esta tarea?")) {
        await API.deleteTask(id);
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
        if (auth.authorized) {
            currentUser = { email: email, name: p.name, picture: p.picture };
            localStorage.setItem('user', JSON.stringify(currentUser));
            setupApp();
        } else {
            alert("Acceso denegado: " + email + " no está en la lista de usuarios permitidos.");
            google.accounts.id.disableAutoSelect();
        }
    } catch (e) {
        alert("Error de autenticación: " + e.message);
    } finally {
        document.getElementById('loader').style.display = 'none';
    }
}

function setupApp() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app-screen').classList.remove('hidden');
    document.getElementById('user-name').textContent = currentUser.name;
    document.getElementById('user-avatar').src = currentUser.picture;
    updateDashboard();
    showSection('dashboard');
}

function logout() {
    localStorage.removeItem('user');
    location.reload();
}

// --- UTILS ---
function formatDateDisplay(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function openModal(title, content) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = content;
    document.getElementById('modal-container').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('modal-container').classList.add('hidden');
    document.body.style.overflow = 'auto';
}

// --- ADMIN / AUDITORIA ---
async function renderAudit() {
    const container = document.getElementById('audit-list');
    if (!container) return;
    container.innerHTML = '<p>Cargando auditoría...</p>';
    try {
        const data = await API.listAudit(currentUser.email);
        if (data.error) throw new Error(data.error);
        
        container.innerHTML = data.reverse().map(a => `
            <div style="padding:12px; border-bottom:1px solid var(--border); font-size:0.85rem;">
                <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                    <strong style="color:var(--primary);">${a.email}</strong>
                    <span style="color:var(--text-muted);">${formatDateDisplay(a.timestamp)} ${new Date(a.timestamp).toLocaleTimeString()}</span>
                </div>
                <div style="font-weight:600;">${a.accion}</div>
                <div style="color:var(--text-muted); font-size: 0.8rem;">${a.detalles || ''}</div>
            </div>
        `).join('');
    } catch (e) {
        container.innerHTML = `<p style="color:var(--danger)">Error: ${e.message}</p>`;
    }
}

function addAudit(actionText) {
    // Audit is mostly handled by backend, but we can call it if needed.
}

// Initialize
window.onload = () => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        setupApp();
    } else {
        initAuth();
    }

    lucide.createIcons();
};

// --- HELPER PARA FAMILIARES EXCLUIDOS ---
function renderExcludedBalances(data) {
    const container = document.getElementById('excluded-balances-container');
    if (!container) return;
    
    if (data.length === 0) {
        container.innerHTML = `<p style="color:var(--text-muted); font-size:0.9rem;">No hay familiares excluidos de las liquidaciones intermedias.</p>`;
        return;
    }

    container.innerHTML = data.map(ex => `
        <div class="card" style="background:var(--bg-main); padding:1rem; border-radius:12px; border-left:4px solid var(--accent); margin-bottom:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <strong style="font-size:1.1rem; color:var(--text-main);">${ex.person}</strong>
                    <div style="font-size:0.8rem; color:var(--text-muted);">Participación: ${ex.percentage}%</div>
                </div>
                <div style="text-align:right;">
                    <div style="font-size:0.85rem; color:var(--text-muted);">Aportación Ideal</div>
                    <div style="font-size:1.2rem; font-weight:700; color:var(--accent);">${ex.shouldHavePaid.toFixed(2)} €</div>
                </div>
            </div>
            <div style="margin-top:10px; font-size:0.75rem; color:var(--text-muted); font-style:italic;">
                * No participa en deudas inter-hermanos. Este saldo se acumula para la liquidación final anual.
            </div>
        </div>
    `).join('');
}

async function saveExcludedPending(person, year, amount) {
    try {
        const payload = {
            año: year,
            familiar: person,
            aportacionIdeal: amount,
            fechaActualizacion: new Date().toISOString(),
            notas: 'Calculado automáticamente por el motor de reparto'
        };
        await CortijoAPI.savePendingBalance(payload);
    } catch (e) {
        console.warn("Error guardando saldo pendiente:", e);
    }
}

async function calculateFinalLiquidation() {
    const yearSelect = document.getElementById('split-year-select');
    const selectedYear = yearSelect ? yearSelect.value : new Date().getFullYear();
    const resultContainer = document.getElementById('final-liquidation-result');

    if (!resultContainer) return;

    resultContainer.innerHTML = '<p style="text-align:center; padding:2rem;">Calculando liquidación final anual...</p>';
    document.getElementById('loader').style.display = 'flex';

    try {
        // Nueva llamada atómica al backend
        const res = await CortijoAPI.calculateSettlement(selectedYear);
        
        const { beneficioNeto, parteAngelita, saldoPendiente, liquidacionFinal, ingresosTotales, gastosTotales, porcentajeFamiliar } = res;

        const isPositive = liquidacionFinal >= 0;
        const color = isPositive ? 'var(--success)' : 'var(--danger)';
        const sign = isPositive ? '+' : '';
        const icon = isPositive ? '💰' : '💸';

        let html = `
            <div style="background:var(--bg-card); padding:2rem; border-radius:20px; border:1px solid var(--border); box-shadow:var(--shadow-lg); text-align:center;">
                <h3 style="margin-bottom:1.5rem; color:var(--primary);">Resultado Liquidación Final ${selectedYear}</h3>
                
                <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:20px; margin-bottom:2rem; text-align:left;">
                    <div style="padding:15px; background:var(--bg-main); border-radius:12px;">
                        <div style="font-size:0.8rem; color:var(--text-muted);">Ingresos Totales</div>
                        <div style="font-size:1.1rem; font-weight:600;">${ingresosTotales.toFixed(2)}€</div>
                    </div>
                    <div style="padding:15px; background:var(--bg-main); border-radius:12px;">
                        <div style="font-size:0.8rem; color:var(--text-muted);">Gastos Totales</div>
                        <div style="font-size:1.1rem; font-weight:600;">${gastosTotales.toFixed(2)}€</div>
                    </div>
                    <div style="padding:15px; background:var(--bg-main); border-radius:12px; grid-column: span 2;">
                        <div style="font-size:0.8rem; color:var(--text-muted);">Beneficio Neto de la Propiedad</div>
                        <div style="font-size:1.2rem; font-weight:700; color:var(--primary);">${beneficioNeto.toFixed(2)}€</div>
                    </div>
                </div>

                <div style="margin: 2rem 0; padding: 1.5rem; border-radius:15px; background: ${isPositive ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)'};">
                    <div style="font-size:1rem; color:var(--text-main); margin-bottom:10px;">Parte de Angelita (${porcentajeFamiliar}%): <strong>${parteAngelita.toFixed(2)}€</strong></div>
                    <div style="font-size:1rem; color:var(--text-main); margin-bottom:20px;">Menos suscripciones/gastos acumulados: <strong style="color:var(--danger);">${saldoPendiente.toFixed(2)}€</strong></div>
                    
                    <div style="font-size:0.9rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; margin-bottom:5px;">Liquidación Neta Final</div>
                    <div style="font-size:2.5rem; font-weight:800; color:${color};">${sign}${liquidacionFinal.toFixed(2)} €</div>
                </div>

                <div style="background:var(--bg-main); padding:1rem; border-radius:12px; font-size:0.9rem; display:flex; align-items:center; gap:15px; justify-content:center;">
                    <span style="font-size:1.5rem;">${icon}</span>
                    <span style="text-align:left;">${isPositive ? 'Se debe entregar esta cantidad a Angelita (vía su tutor).' : 'Angelita (tutor) debe ingresar esta cantidad para cubrir saldos.'}</span>
                </div>
                
                <p style="font-size:0.8rem; color:var(--text-muted); margin-top:10px;">Fórmula: (Beneficio Neto × ${porcentajeFamiliar}%) - Gastos Pendientes</p>
            </div>
        `;
        resultContainer.innerHTML = html;
        window.scrollTo({ top: resultContainer.offsetTop - 100, behavior: 'smooth' });
    } catch (e) {
        console.error("calculateFinalLiquidation Error:", e);
        resultContainer.innerHTML = '<p style="color:var(--danger)">Error al calcular liquidación: ' + e.message + '</p>';
    } finally {
        document.getElementById('loader').style.display = 'none';
    }
}
