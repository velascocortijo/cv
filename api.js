// VERSION: V3.0.0 - Cliente API Single Source of Truth
const API_URL = 'https://script.google.com/macros/s/AKfycbwJs_Hjos-qxTfMDy-EdWGZw-HgDlwNuyrcHpF74U4noTjHXk1Rb2qPqpl05-CBbvLI/exec';

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
    }
};

window.CortijoAPI = API;
