// VERSION: V3.0.0 - Cliente API Single Source of Truth
const API_URL = 'https://script.google.com/macros/s/AKfycbxdFtYAA9dnLEvcLSkcl06pBW5uhlH_xtT76fdnzm18Z1Ssjx06-YlkGIn6t31sCbnp/exec';

const API = {
    // --- AUTENTICACIÓN ---
    async checkEmail(email) {
        const response = await fetch(`${API_URL}?action=isAuthorized&email=${encodeURIComponent(email)}`, { credentials: 'omit' });
        return await response.json();
    },

    // --- CONFIGURACIÓN FAMILIAR ---
    async getConfiguracion() {
        const response = await fetch(`${API_URL}?action=getConfiguracion`, { credentials: 'omit' });
        return await response.json();
    },

    // --- MOTOR MATEMÁTICO (BALANCES) ---
    async getBalances(year) {
        const response = await fetch(`${API_URL}?action=getBalances&year=${year}`, { credentials: 'omit' });
        return await response.json();
    },

    // --- GASTOS ---
    async getExpenses(year) {
        const response = await fetch(`${API_URL}?action=list&year=${year}`, { credentials: 'omit' });
        return await response.json();
    },
    async createExpense(data, file) {
        if (file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = async () => {
                    data.fileBase64 = reader.result.split(',')[1];
                    data.fileName = file.name;
                    data.mimeType = file.type;
                    try {
                        const response = await fetch(API_URL + '?action=create', { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'text/plain;charset=utf-8' }, credentials: 'omit' });
                        resolve(await response.json());
                    } catch(e) { reject(e); }
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        }
        const response = await fetch(API_URL + '?action=create', {
            method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'text/plain;charset=utf-8' }, credentials: 'omit'
        });
        return await response.json();
    },
    async updateExpense(id, data) {
        data.id = id;
        const response = await fetch(API_URL + '?action=updateExpense', {
            method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'text/plain;charset=utf-8' }, credentials: 'omit'
        });
        return await response.json();
    },
    async deleteExpense(id) {
        const response = await fetch(API_URL + '?action=delete', {
            method: 'POST', body: JSON.stringify({ id }), headers: { 'Content-Type': 'text/plain;charset=utf-8' }, credentials: 'omit'
        });
        return await response.json();
    },

    // --- INGRESOS ---
    async getIncome(year) {
        const response = await fetch(`${API_URL}?action=listIncome&year=${year}`, { credentials: 'omit' });
        return await response.json();
    },
    async createIncome(data, file) {
        if (file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = async () => {
                    data.fileBase64 = reader.result.split(',')[1];
                    data.fileName = file.name;
                    data.mimeType = file.type;
                    try {
                        const response = await fetch(API_URL + '?action=addIncome', { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'text/plain;charset=utf-8' }, credentials: 'omit' });
                        resolve(await response.json());
                    } catch(e) { reject(e); }
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        }
        const response = await fetch(API_URL + '?action=addIncome', {
             method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'text/plain;charset=utf-8' }, credentials: 'omit'
        });
        return await response.json();
    },
    async updateIncome(id, data) {
        data.id = id;
        const response = await fetch(API_URL + '?action=updateIncome', {
             method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'text/plain;charset=utf-8' }, credentials: 'omit'
        });
        return await response.json();
    },
    async deleteIncome(id) {
        const response = await fetch(API_URL + '?action=deleteIncome', {
            method: 'POST', body: JSON.stringify({ id }), headers: { 'Content-Type': 'text/plain;charset=utf-8' }, credentials: 'omit'
        });
        return await response.json();
    },

    // --- INVENTARIO & TAREAS ---
    async getInventory() {
        const response = await fetch(`${API_URL}?action=listInventory`, { credentials: 'omit' });
        return await response.json();
    },
    async getTasks(year) {
        const response = await fetch(`${API_URL}?action=listTasks&year=${year}`, { credentials: 'omit' });
        return await response.json();
    },
    async createInventory(data) {
        const response = await fetch(API_URL + '?action=addInventory', { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'text/plain;charset=utf-8' }, credentials: 'omit' });
        return await response.json();
    },
    async createTask(data) {
        const response = await fetch(API_URL + '?action=addTask', { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'text/plain;charset=utf-8' }, credentials: 'omit' });
        return await response.json();
    },
    // --- DOCUMENTOS ---
    async getDocuments(year) {
        const response = await fetch(`${API_URL}?action=listDocs&year=${year}`, { credentials: 'omit' });
        return await response.json();
    },
    async uploadAndRecordDocument(data, file) {
        if (file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = async () => {
                    data.fileBase64 = reader.result.split(',')[1];
                    data.fileName = file.name;
                    data.mimeType = file.type;
                    try {
                        const response = await fetch(API_URL + '?action=addDoc', { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'text/plain;charset=utf-8' }, credentials: 'omit' });
                        resolve(await response.json());
                    } catch(e) { reject(e); }
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        }
    },
    async updateDoc(id, data) {
        data.id = id;
        const response = await fetch(API_URL + '?action=updateDoc', { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'text/plain;charset=utf-8' }, credentials: 'omit' });
        return await response.json();
    },
    async deleteDoc(id) {
        const response = await fetch(API_URL + '?action=deleteDoc', { method: 'POST', body: JSON.stringify({ id }), headers: { 'Content-Type': 'text/plain;charset=utf-8' }, credentials: 'omit' });
        return await response.json();
    },
    // --- REPARTO AVANZADO ---
    async getTransferencias(year) {
        const response = await fetch(`${API_URL}?action=listTransferencias&year=${year}`, { credentials: 'omit' });
        return await response.json();
    },
    async createTransferencia(data) {
        const response = await fetch(API_URL + '?action=addTransferencia', { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'text/plain;charset=utf-8' }, credentials: 'omit' });
        return await response.json();
    },
    async updateTransferencia(id, data) {
        data.id = id;
        const response = await fetch(API_URL + '?action=updateTransferencia', { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'text/plain;charset=utf-8' }, credentials: 'omit' });
        return await response.json();
    },
    async deleteTransferencia(id, year) {
        const response = await fetch(API_URL + '?action=deleteTransferencia', { method: 'POST', body: JSON.stringify({id, year}), headers: { 'Content-Type': 'text/plain;charset=utf-8' }, credentials: 'omit' });
        return await response.json();
    },
    async getGastoNeto(year) {
        const response = await fetch(`${API_URL}?action=getGastoNeto&year=${year}`, { credentials: 'omit' });
        return await response.json();
    },
    async getRepartoTeorico(year) {
        const response = await fetch(`${API_URL}?action=getRepartoTeorico&year=${year}`, { credentials: 'omit' });
        return await response.json();
    },
    async getOrdenPagos(year) {
        const response = await fetch(`${API_URL}?action=getOrdenPagos&year=${year}`, { credentials: 'omit' });
        return await response.json();
    }
};

window.CortijoAPI = API;
