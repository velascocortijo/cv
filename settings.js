// Configuración Global - Reemplaza con tus IDs reales
const CONFIG = {
    GOOGLE_CLIENT_ID: "699107819652-19skv1kl2iu531qqoigpdd91jt9c26gj.apps.googleusercontent.com",
    SPREADSHEET_ID: "1L67JCrwGVxGuGghFgoZxM_zIXs0WP6bW4vjsOInvxu0",
    DRIVE_FOLDER_ID: "1_kocEDazNFHg191c9obZNu58ivmXimqL",
    FAMILY_MEMBERS: ["Antonio", "Angelita", "Rebeca", "Raquel", "Jorge", "Tete", "Otros"],
    INCOME_CATEGORIES: ["Alquiler", "Aportación Familiar", "Subvención", "Otros"],
    INVENTORY_CATEGORIES: [
        "Mobiliario interior", "Electrodomésticos", "Menaje de Cocina",
        "Ropa de cama y baño", "Limpieza y mantenimiento", "Mobiliario exterior",
        "Piscina", "Seguridad", "Decoración y complementos",
        "Suministros para huéspedes", "Almacén propio Pajar"
    ],
    INVENTORY_LOCATIONS: [
        "Salón/Comedor", "Cocina", "Habitación 1 Cati", "Habitación 2 Lili",
        "Habitación 3 Antonio", "Habitación 4 Angelita", "Baño 1", "Baño 2",
        "Patio interior", "Patio exterior", "Piscina",
        "Cuarto de depuradora", "Almacén propio / Pajar"
    ],
    EXPENSE_PERCENTAGES: {
        "Antonio": 25.0,
        "Angelita": 25.0,
        "Rebeca": 12.5,
        "Raquel": 12.5,
        "Jorge": 12.5,
        "Tete": 12.5,
        "Otros": 0
    },
    FAMILY_STATUS: {
        "Antonio": "activo",
        "Angelita": "excluida_gastos",
        "Rebeca": "activo",
        "Raquel": "activo",
        "Jorge": "activo",
        "Tete": "activo",
        "Otros": "activo"
    }
};
window.CONFIG = CONFIG;

// Exportar para que app.js lo use
if (typeof module !== 'undefined') {
    module.exports = CONFIG;
}
