// VERSION: V2.1.0 - Sincronización Total con Backend V2.0.7
const API_URL = 'https://script.google.com/macros/s/AKfycbzKJuZgxKyz9J5In2Tym9BuBtItgt4rLMI4FNFB9b94hbXrIbzdVP56VDjSswhngJsN/exec';

const CortijoAPI = {
    // --- AUTH ---
    async isAuthorized(email) {
        const res = await fetch(`${API_URL}?action=isAuthorized&email=${encodeURIComponent(email)}`);
        return await res.json();
    },

    // --- GASTOS ---
    async getExpenses(year) {
        const res = await fetch(`${API_URL}?action=list&year=${year}`);
        return await res.json();
    },
    async createExpense(data) {
        const res = await fetch(`${API_URL}?action=create`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        return await res.json();
    },
    async updateExpense(data) {
        const res = await fetch(`${API_URL}?action=update`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        return await res.json();
    },
    async deleteExpense(id) {
        const res = await fetch(`${API_URL}?action=delete`, {
            method: 'POST',
            body: JSON.stringify({ id })
        });
        return await res.json();
    },

    // --- INGRESOS ---
    async getIncomes(year) {
        const res = await fetch(`${API_URL}?action=listIncome&year=${year}`);
        return await res.json();
    },
    async addIncome(data) {
        const res = await fetch(`${API_URL}?action=addIncome`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        return await res.json();
    },
    async updateIncome(data) {
        const res = await fetch(`${API_URL}?action=updateIncome`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        return await res.json();
    },
    async deleteIncome(id) {
        const res = await fetch(`${API_URL}?action=deleteIncome`, {
            method: 'POST',
            body: JSON.stringify({ id })
        });
        return await res.json();
    },

    // --- CUENTAS / REPARTO ---
    async getMemberStatus(year) {
        const res = await fetch(`${API_URL}?action=getMemberStatus&year=${year}`);
        return await res.json();
    },

    // --- OTROS ---
    async getAnnualTotals(year) {
        const res = await fetch(`${API_URL}?action=getAnnualTotals&year=${year}`);
        return await res.json();
    }
};

window.CortijoAPI = CortijoAPI;
