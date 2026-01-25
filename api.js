/**
 * API.JS - CLIENTE PARA EL BACKEND DEL CORTIJO VELASCO
 */

const API_URL = 'https://script.google.com/macros/s/AKfycbwHTYtmMDzOaV15jn7NoS36mwpoz7irgVileX6eIThjNySE4ioNH-QwFt5vTdbuyWfN/exec';

const API = {
    async getExpenses(filters = {}) {
        const queryParams = new URLSearchParams({ action: 'list', ...filters }).toString();
        const response = await fetch(`${API_URL}?${queryParams}`);
        return await response.json();
    },

    async createExpense(expenseData, fileBlob = null, folderName = null) {
        let urlDrive = '';
        if (fileBlob) {
            urlDrive = await this.uploadToDrive(fileBlob, folderName);
        }
        const payload = { action: 'create', ...expenseData, url_drive: urlDrive };
        const response = await fetch(API_URL + '?action=create', {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        return await response.json();
    },

    async updateExpense(expenseData, fileBlob = null, folderName = null) {
        let urlDrive = expenseData.url_drive || '';
        if (fileBlob) {
            urlDrive = await this.uploadToDrive(fileBlob, folderName);
        }
        const payload = { action: 'update', ...expenseData, url_drive: urlDrive };
        const response = await fetch(API_URL + '?action=update', {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        return await response.json();
    },

    async deleteExpense(id, userId) {
        const payload = { action: 'delete', id, user_id: userId };
        const response = await fetch(API_URL + '?action=delete', {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        return await response.json();
    },

    async getBalance() {
        const response = await fetch(`${API_URL}?action=balance`);
        return await response.json();
    },

    async getDocuments(year) {
        const response = await fetch(`${API_URL}?action=listDocuments&year=${year}`);
        return await response.json();
    },

    async addDocument(docData, fileBlob = null) {
        let urlDrive = '';
        if (fileBlob) {
            urlDrive = await this.uploadToDrive(fileBlob);
        }
        const payload = { action: 'addDocument', ...docData, url_drive: urlDrive };
        const response = await fetch(API_URL + '?action=addDocument', {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        return await response.json();
    },

    async uploadToDrive(file, folderName = null) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async () => {
                const base64 = reader.result;
                const payload = {
                    action: 'upload',
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
    }
};

window.CortijoAPI = API;
