/**
 * API.JS - CLIENTE PARA EL BACKEND DEL CORTIJO VELASCO
 */

const API_URL = 'https://script.google.com/macros/s/AKfycbztlmWEz8_z-kp7PU4eGfBpkFxbxXm0-Z1GoljsIZlbSYkLPlP4_7l7tpQ_Zh0vupyh/exec';

const API = {
    // --- GASTOS ---
    async getExpenses(year) {
        const response = await fetch(`${API_URL}?action=list&year=${year}`);
        return await response.json();
    },

    async createExpense(expenseData, fileBlob = null, folderName = null) {
        let urlDrive = '';
        if (fileBlob) {
            urlDrive = await this.uploadToDrive(fileBlob, folderName);
        }
        const payload = { ...expenseData, url_drive: urlDrive || expenseData.url_drive };
        const response = await fetch(API_URL + '?action=create', {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        return await response.json();
    },

    async updateExpense(id, data) {
        const payload = { id, ...data };
        const response = await fetch(API_URL + '?action=update', {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        return await response.json();
    },

    async deleteExpense(id) {
        const response = await fetch(API_URL + '?action=delete', {
            method: 'POST',
            body: JSON.stringify({ id }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        return await response.json();
    },

    // --- INGRESOS ---
    async getIncome(year) {
        const response = await fetch(`${API_URL}?action=listIncome&year=${year}`);
        return await response.json();
    },

    async createIncome(incomeData, fileBlob = null, folderName = null) {
        let urlDrive = '';
        if (fileBlob) {
            urlDrive = await this.uploadToDrive(fileBlob, folderName);
        }
        const payload = { ...incomeData, url_drive: urlDrive || incomeData.url_drive };
        const response = await fetch(API_URL + '?action=addIncome', {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        return await response.json();
    },

    async updateIncome(id, data) {
        const payload = { id, ...data };
        const response = await fetch(API_URL + '?action=updateIncome', {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        return await response.json();
    },

    async deleteIncome(id) {
        const response = await fetch(API_URL + '?action=deleteIncome', {
            method: 'POST',
            body: JSON.stringify({ id }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        return await response.json();
    },

    // --- DOCUMENTOS ---
    async getDocuments(year) {
        const response = await fetch(`${API_URL}?action=listDocuments&year=${year}`);
        return await response.json();
    },

    // SUBIDA ATÓMICA (Sube archivo y guarda datos en un solo paso para evitar pérdida de URL)
    async uploadAndRecordDocument(docData, file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async () => {
                const base64 = reader.result;
                const payload = {
                    ...docData,
                    base64: base64,
                    fileName: file.name
                };
                const res = await fetch(API_URL + '?action=uploadAndRecord', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' }
                });
                const result = await res.json();
                if (result.success) resolve(result);
                else reject(new Error(result.error || 'Error en el servidor'));
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    async updateDocument(id, data) {
        const response = await fetch(API_URL + '?action=updateDocument', {
            method: 'POST',
            body: JSON.stringify({ id, ...data }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        return await response.json();
    },

    async deleteDocument(id) {
        const response = await fetch(API_URL + '?action=deleteDocument', {
            method: 'POST',
            body: JSON.stringify({ id }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        return await response.json();
    },

    // --- TAREAS (KANBAN) ---
    async getTasks(year) {
        const response = await fetch(`${API_URL}?action=listTasks&year=${year}`);
        return await response.json();
    },

    async addTask(taskData) {
        const response = await fetch(API_URL + '?action=addTask', {
            method: 'POST',
            body: JSON.stringify(taskData),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        return await response.json();
    },

    async updateTask(id, data) {
        const response = await fetch(API_URL + '?action=updateTask', {
            method: 'POST',
            body: JSON.stringify({ id, ...data }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        return await response.json();
    },

    async deleteTask(id) {
        const response = await fetch(API_URL + '?action=deleteTask', {
            method: 'POST',
            body: JSON.stringify({ id }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        return await response.json();
    },

    // --- DRIVE (Para Gastos) ---
    async uploadToDrive(file, folderName = null) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async () => {
                const base64 = reader.result;
                const payload = {
                    base64: base64,
                    fileName: file.name,
                    folderName: folderName
                };
                const res = await fetch(API_URL + '?action=upload', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' }
                });
                const data = await res.json();
                if (data.url && !data.url.startsWith('error')) resolve(data.url);
                else reject(new Error(data.error || 'Error subiendo a Drive'));
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    async getBalance(year) {
        const response = await fetch(`${API_URL}?action=balance&year=${year}`);
        return await response.json();
    },

    async checkEmail(email) {
        const response = await fetch(`${API_URL}?action=isAuthorized&email=${encodeURIComponent(email)}`);
        return await response.json();
    },

    // --- INVENTARIO (Local JSON) ---
    async getInventory() {
        const response = await fetch('inventario.json');
        return await response.json();
    },

    async getInventoryCategories() {
        const response = await fetch('categorias.json');
        return await response.json();
    },

    async getLocations() {
        const response = await fetch('ubicaciones.json');
        return await response.json();
    }
};

window.CortijoAPI = API;
