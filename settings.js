// Configuración Global - Reemplaza con tus IDs reales
const CONFIG = {
    GOOGLE_CLIENT_ID: "TU_GOOGLE_CLIENT_ID_AQUI.apps.googleusercontent.com",
    SPREADSHEET_ID: "1L67JCrwGVxGuGghFgoZxM_zIXs0WP6bW4vjsOInvxu0",
    DRIVE_FOLDER_ID: "TU_ID_DE_CARPETA_DRIVE_AQUI",
    AUTHORIZED_EMAILS: [
        "admin@example.com", // Tú (Admin)
        "primo1@example.com",
        "primo2@example.com",
        "primo3@example.com"
        // Añade aquí los correos de tus primos
    ]
};

// Exportar para que app.js lo use
if (typeof module !== 'undefined') {
    module.exports = CONFIG;
}

