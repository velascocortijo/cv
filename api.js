// VERSION: V3.0.0 - Cliente API Single Source of Truth
const API_URL = 'https://script.google.com/macros/s/AKfycbzKJuZgxKyz9J5In2Tym9BuBtItgt4rLMI4FNFB9b94hbXrIbzdVP56VDjSswhngJsN/exec';

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
    async createExpense(data) {
        const response = await fetch(API_URL + '?action=create', {
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
    async createIncome(data) {
        const response = await fetch(API_URL + '?action=addIncome', {
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
