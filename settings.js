// Configuración Global - Reemplaza con tus IDs reales
const CONFIG = {
    GOOGLE_CLIENT_ID: "699107819652-19skv1kl2iu531qqoigpdd91jt9c26gj.apps.googleusercontent.com",
    SPREADSHEET_ID: "1L67JCrwGVxGuGghFgoZxM_zIXs0WP6bW4vjsOInvxu0",
    DRIVE_FOLDER_ID: "1_kocEDazNFHg191c9obZNu58ivmXimqL",
    AUTHORIZED_EMAILS: [
        "velascocortijo@gmail.com", // Tú (Admin)
        "joseangelgabriel@gmail.com",
        "rakeltxurobi@gmail.com",
        "primo3@example.com"
        // Añade aquí los correos de tus primos
    ]
};

// Exportar para que app.js lo use
if (typeof module !== 'undefined') {
    module.exports = CONFIG;
}

