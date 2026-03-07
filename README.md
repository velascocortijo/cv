# Gestión Cortijo Velasco 🏡

Este es un sistema de gestión interna para el **Cortijo Velasco**, diseñado para ser privado, elegante y funcional.

## Características
- **Calendario Real:** Gestión de reservas familiares.
- **Gastos y Aportaciones:** Control económico con balance automático y exportación a CSV.
- **Documentos:** Acceso a escrituras, planos y normas (integrado con Google Drive).
- **Acceso Restringido:** Solo para miembros autorizados de la familia.

## Configuración Real (Google Integration)
Para que la web sea 100% funcional y persistente, sigue estos pasos:

### 1. Google Cloud Console
- Crea un proyecto en [Google Cloud Console](https://console.cloud.google.com/).
- Habilita las APIs de **Google Sheets** y **Google Drive**.
- Crea una **ID de cliente OAuth 2.0**.
- Añade el dominio donde alojes la web (ej: `https://tu-usuario.github.io`) a los orígenes autorizados.

### 2. Google Sheets como Base de Datos
- Crea una hoja de cálculo en Google Sheets.
- Copia el ID de la hoja (está en la URL: `docs.google.com/spreadsheets/d/ID_AQUI/edit`).
- Reemplaza el ID en `settings.js`.

### 3. Google Drive para Archivos
- Crea una carpeta en Google Drive para los documentos.
- Obtén el ID de esa carpeta.

## Cómo desplegar en GitHub
1. Sube todos los archivos a un repositorio en GitHub.
2. Ve a **Settings > Pages** y configura tu dominio personalizado `cortijovelasco.es`.
3. Asegúrate de que el HTTPS esté activo.
4. ¡Listo! Tu web estará en `https://cortijovelasco.es`.

## Nota sobre el Acceso
La aplicación usa **Google Identity Services** para el login. Por seguridad, solo los correos electrónicos especificados en la lista de "primos" (que puedes configurar en el backend/validación) podrán acceder a los datos sensibles.
