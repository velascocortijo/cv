// VERSION: V2.1.0 - Sincronización Total Familiar (Antonio, Angelita, Rebeca, Raquel, Jorge, Tete, Jose, Pepi)
/**
 * CONFIGURACIÓN GLOBAL - CORTIJO VELASCO
 */

const CONFIG = {
    GOOGLE_CLIENT_ID: "699107819652-19skv1kl2iu531qqoigpdd91jt9c26gj.apps.googleusercontent.com",
    SPREADSHEET_ID: "1L67JCrwGVxGuGghFgoZxM_zIXs0WP6bW4vjsOInvxu0",
    DRIVE_FOLDER_ID: "1_kocEDazNFHg191c9obZNu58ivmXimqL",
    
    // LISTA MAESTRA DE MIEMBROS (V2.1.0)
    FAMILY_MEMBERS: ["Antonio", "Angelita", "Rebeca", "Raquel", "Jorge", "Tete", "Jose", "Pepi"],
    
    // MODELO DE REPARTO ASIMÉTRICO (Sincronizado con Backend V2.0.7)
    EXPENSE_PERCENTAGES: {
        "Antonio": 25.0,
        "Angelita": 0.0,
        "Rebeca": 12.5,
        "Raquel": 12.5,
        "Jorge": 12.5,
        "Tete": 12.5,
        "Jose": 12.5,
        "Pepi": 12.5
    },

    INCOME_CATEGORIES: ["Alquiler", "Aportación Familiar", "Subvención", "Hucha Especial", "Venta Aceituna"],
    
    INVENTORY_CATEGORIES: [
        "Mobiliario interior", "Electrodomésticos", "Menaje de Cocina",
        "Ropa de cama y baño", "Limpieza y mantenimiento", "Mobiliario exterior",
        "Piscina", "Seguridad", "Almacén propio Pajar"
    ],
    
    INVENTORY_LOCATIONS: [
        "Salón/Comedor", "Cocina", "Habitación 1 Cati", "Habitación 2 Lili",
        "Habitación 3 Antonio", "Habitación 4 Angelita", "Baño 1", "Baño 2",
        "Piscina", "Almacén propio / Pajar"
    ]
};

window.CONFIG = CONFIG;
