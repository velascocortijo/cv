// Configuración Global - Reemplaza con tus IDs reales
const CONFIG = {
    GOOGLE_CLIENT_ID: "699107819652-19skv1kl2iu531qqoigpdd91jt9c26gj.apps.googleusercontent.com",
    SPREADSHEET_ID: "1L67JCrwGVxGuGghFgoZxM_zIXs0WP6bW4vjsOInvxu0",
    DRIVE_FOLDER_ID: "1_kocEDazNFHg191c9obZNu58ivmXimqL",
    FAMILY_MEMBERS: ["Antonio", "Angelita", "Rebeca", "Raquel", "Jorge", "Tete", "Otros"],
    INCOME_CATEGORIES: ["Alquiler", "Aportación Familiar", "Subvención", "Otros"]
};
window.CONFIG = CONFIG;

// Exportar para que app.js lo use
if (typeof module !== 'undefined') {
    module.exports = CONFIG;
}
