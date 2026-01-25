/**
 * API.JS - CLIENTE PARA EL BACKEND DEL CORTIJO VELASCO
 * Gestiona la comunicación con Google Apps Script.
 */

const API_URL = 'https://script.google.com/macros/s/AKfycbwHTYtmMDzOaV15jn7NoS36mwpoz7irgVileX6eIThjNySE4ioNH-QwFt5vTdbuyWfN/exec'; // Se obtiene al desplegar el backend.gs como Web App

const API = {
    /**
     * Obtener listado de gastos con filtros y ordenación
     */
    async getExpenses(filters = {}) {
        if (!API_URL || API_URL.includes('URL_DE_TU_SCRIPT')) {
            console.warn("API_URL no configurada. Usando datos locales.");
            return []; // Reemplazar con datos mock si se desea
        }
        const queryParams = new URLSearchParams({ action: 'list', ...filters }).toString();
        const response = await fetch(`${API_URL}?${queryParams}`, {
            method: 'GET',
            mode: 'cors'
        });
        return await response.json();
    },

    /**
     * Crear un nuevo gasto (incluye opción de archivo)
     */
    async createExpense(expenseData, fileBlob = null) {
        if (!API_URL || API_URL.includes('URL_DE_TU_SCRIPT')) {
            throw new Error("API_URL no configurada en api.js");
        }

        let urlDrive = '';
        if (fileBlob) {
            urlDrive = await this.uploadToDrive(fileBlob);
        }

        const payload = {
            action: 'create',
            ...expenseData,
            url_drive: urlDrive
        };

        const response = await fetch(API_URL + '?action=create', {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: {
                'Content-Type': 'text/plain;charset=utf-8' // GAS necesita text/plain para evitar CORS pre-flight simple
            }
        });
        return await response.json();
    },

    /**
     * Eliminar un gasto
     */
    async deleteExpense(id, userId) {
        const payload = {
            action: 'delete',
            id,
            user_id: userId
        };
        const response = await fetch(API_URL + '?action=delete', {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: {
                'Content-Type': 'text/plain;charset=utf-8'
            }
        });
        return await response.json();
    },

    /**
     * Obtener balance económico
     */
    async getBalance() {
        if (!API_URL || API_URL.includes('URL_DE_TU_SCRIPT')) return { totalGeneral: 0, usuarios: {} };
        const response = await fetch(`${API_URL}?action=balance`);
        return await response.json();
    },

    /**
     * Subida de archivos a Drive
     */
    async uploadToDrive(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async () => {
                const base64 = reader.result;
                const payload = {
                    action: 'upload',
                    base64: base64,
                    fileName: file.name
                };
                const res = await fetch(API_URL + '?action=upload', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                    headers: {
                        'Content-Type': 'text/plain;charset=utf-8'
                    }
                });
                const data = await res.json();
                resolve(data.url);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
};

window.CortijoAPI = API;

