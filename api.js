// VERSION: V1.1.3 - Dashboard section restored
/**
 * API.JS - CLIENTE PARA EL BACKEND DEL CORTIJO VELASCO
 */

const API_URL = 'https://script.google.com/macros/s/AKfycbyqU-xLl3xfP7EEL7Cg17OtRtnORDkTmA8D9XXuB-SVSkgHuUBQGvHE1AiS-J2n6Iuh/exec';

// --- WRAPPER SEGURO DE PETICIONES ---
const fetchAPI = async (url, options) => {
    // Intentar obtener el usuario de la ventana o del almacenamiento local
    const user = window.currentUser || JSON.parse(localStorage.getItem('user') || 'null');
    
    if (user && user.email) {
        // Enviar siempre el email por URL (útil para auditoría en el servidor)
        url += (url.includes('?') ? '&' : '?') + 'email=' + encodeURIComponent(user.email);
        
        // Si es un POST, inyectar también el user_id en el cuerpo del mensaje
        if (options && options.method && options.method.toUpperCase() === 'POST' && typeof options.body === 'string') {
            try {
                let payload = JSON.parse(options.body);
                payload.user_id = user.email; // Aseguramos que el servidor reciba quién firma la acción
                options.body = JSON.stringify(payload);
            } catch(e) { 
                console.error("Error al inyectar user_id en el payload", e);
            }
        }
    } else {
        console.warn("Petición API realizada sin usuario identificado.");
    }
    
    return fetch(url, options);
};

const API = {
    // --- GASTOS ---
    async getExpenses(year) {
        const response = await fetchAPI(`${API_URL}?action=list&year=${year}`, { credentials: 'omit' });
        return await response.json();
    },

    async createExpense(expenseData, fileBlob = null, folderName = null) {
        let urlDrive = '';
        if (fileBlob) {
            urlDrive = await this.uploadToDrive(fileBlob, folderName);
        }
        const payload = { ...expenseData, url_drive: urlDrive || expenseData.url_drive };
        const response = await fetchAPI(API_URL + '?action=create', {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            credentials: 'omit'
        });
        return await response.json();
    },

    async updateExpense(id, data) {
        const payload = { id, ...data };
        const response = await fetchAPI(API_URL + '?action=update', {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            credentials: 'omit'
        });
        return await response.json();
    },

    async deleteExpense(id) {
        const response = await fetchAPI(API_URL + '?action=delete', {
            method: 'POST',
            body: JSON.stringify({ id }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            credentials: 'omit'
        });
        return await response.json();
    },

    // --- INGRESOS ---
    async getIncome(year) {
        const response = await fetchAPI(`${API_URL}?action=listIncome&year=${year}`, { credentials: 'omit' });
        return await response.json();
    },

    async createIncome(incomeData, fileBlob = null, folderName = null) {
        let urlDrive = '';
        if (fileBlob) {
            urlDrive = await this.uploadToDrive(fileBlob, folderName);
        }
        const payload = { ...incomeData, url_drive: urlDrive || incomeData.url_drive };
        const response = await fetchAPI(API_URL + '?action=addIncome', {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            credentials: 'omit'
        });
        return await response.json();
    },

    async updateIncome(id, data) {
        const payload = { id, ...data };
        const response = await fetchAPI(API_URL + '?action=updateIncome', {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            credentials: 'omit'
        });
        return await response.json();
    },

    async deleteIncome(id) {
        const response = await fetchAPI(API_URL + '?action=deleteIncome', {
            method: 'POST',
            body: JSON.stringify({ id }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            credentials: 'omit'
        });
        return await response.json();
    },

    // --- DOCUMENTOS ---
    async getDocuments(year) {
        const response = await fetchAPI(`${API_URL}?action=listDocuments&year=${year}`, { credentials: 'omit' });
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
                const res = await fetchAPI(API_URL + '?action=uploadAndRecord', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    credentials: 'omit'
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
        const response = await fetchAPI(API_URL + '?action=updateDocument', {
            method: 'POST',
            body: JSON.stringify({ id, ...data }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            credentials: 'omit'
        });
        return await response.json();
    },

    async deleteDocument(id) {
        const response = await fetchAPI(API_URL + '?action=deleteDocument', {
            method: 'POST',
            body: JSON.stringify({ id }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            credentials: 'omit'
        });
        return await response.json();
    },

    // --- TAREAS (KANBAN) ---
    async getTasks(year) {
        const response = await fetchAPI(`${API_URL}?action=listTasks&year=${year}`, { credentials: 'omit' });
        return await response.json();
    },

    async addTask(taskData) {
        const response = await fetchAPI(API_URL + '?action=addTask', {
            method: 'POST',
            body: JSON.stringify(taskData),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            credentials: 'omit'
        });
        return await response.json();
    },

    async updateTask(id, data) {
        const response = await fetchAPI(API_URL + '?action=updateTask', {
            method: 'POST',
            body: JSON.stringify({ id, ...data }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            credentials: 'omit'
        });
        return await response.json();
    },

    async deleteTask(id) {
        const response = await fetchAPI(API_URL + '?action=deleteTask', {
            method: 'POST',
            body: JSON.stringify({ id }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            credentials: 'omit'
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
                const res = await fetchAPI(API_URL + '?action=upload', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    credentials: 'omit'
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
        const response = await fetchAPI(`${API_URL}?action=balance&year=${year}`, { credentials: 'omit' });
        return await response.json();
    },

    async checkEmail(email) {
        const response = await fetchAPI(`${API_URL}?action=isAuthorized&email=${encodeURIComponent(email)}`, { credentials: 'omit' });
        return await response.json();
    },

    // --- INVENTARIO ---
    async getInventory() {
        const response = await fetchAPI(`${API_URL}?action=listInventory`, { credentials: 'omit' });
        return await response.json();
    },

    async addInventory(data, file = null) {
        let urlDrive = '';
        if (file) {
            urlDrive = await this.uploadToDrive(file, 'Inventario');
        }
        const payload = { ...data, foto_url: urlDrive || data.foto_url };
        const response = await fetchAPI(API_URL + '?action=addInventory', {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            credentials: 'omit'
        });
        return await response.json();
    },

    async updateInventory(id, data, file = null) {
        let urlDrive = '';
        if (file) {
            urlDrive = await this.uploadToDrive(file, 'Inventario');
        }
        const payload = { id, ...data, foto_url: urlDrive || data.foto_url };
        const response = await fetchAPI(API_URL + '?action=updateInventory', {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            credentials: 'omit'
        });
        return await response.json();
    },

    async deleteInventory(id) {
        const response = await fetchAPI(API_URL + '?action=deleteInventory', {
            method: 'POST',
            body: JSON.stringify({ id }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            credentials: 'omit'
        });
        return await response.json();
    },

    // --- COPIAS DE SEGURIDAD ---
    async triggerBackup(email) {
        const response = await fetchAPI(`${API_URL}?action=backup&email=${encodeURIComponent(email)}`, { credentials: 'omit' });
        return await response.json();
    },

    // --- AUDITORÍA ---
    async listAudit(email) {
        const response = await fetchAPI(`${API_URL}?action=listAudit&email=${encodeURIComponent(email)}`, { credentials: 'omit' });
        return await response.json();
    },

    // --- PENDIENTES FAMILIARES EXCLUIDOS ---
    async savePendingBalance(payload) {
        const response = await fetchAPI(API_URL + '?action=savePending', {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            credentials: 'omit'
        });
        return await response.json();
    },

    async getPendingBalances() {
        const response = await fetchAPI(`${API_URL}?action=listPending`, { credentials: 'omit' });
        return await response.json();
    },

    async calculateSettlement(year) {
        const response = await fetchAPI(`${API_URL}?action=calculateSettlement&year=${year}`, { credentials: 'omit' });
        return await response.json();
    }
};

window.CortijoAPI = API;
