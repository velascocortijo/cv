/**
 * BACKEND CORTIJO VELASCO - VERSIÓN ULTRA-SEGURA (V8)
 * Resuelve definitivamente los fallos de guardado de URL.
 */
const SPREADSHEET_ID = '1L67JCrwGVxGuGghFgoZxM_zIXs0WP6bW4vjsOInvxu0'; 
const ROOT_FOLDER_ID = '1_kocEDazNFHg191c9obZNu58ivmXimqL'; 

const SHEETS = { GASTOS: 'Gastos', INGRESOS: 'Ingresos', DOCUMENTOS: 'Documentos', TAREAS: 'Tareas', USUARIOS: 'Usuarios' };
const HEADERS = {
  GASTOS: ['id', 'user_id', 'concepto', 'cantidad', 'fecha', 'url_drive', 'timestamp', 'categoria', 'pagado_por', 'notas'],
  INGRESOS: ['id', 'fecha', 'concepto', 'categoria', 'importe', 'recibido_de', 'url_drive', 'notas', 'timestamp'],
  DOCUMENTOS: ['id', 'name', 'type', 'size', 'date', 'year', 'url_drive'],
  TAREAS: ['id', 'title', 'status', 'user', 'priority', 'year', 'subtasks', 'notes'],
  USUARIOS: ['email', 'role']
};

function doPost(e) {
  try {
    const action = e.parameter.action;
    const data = JSON.parse(e.postData.contents);
    
    if (action === 'uploadAndRecord') {
      const url = uploadBase64({ base64: data.base64, fileName: data.fileName, folderName: data.year });
      data.url_drive = url;
      return addRecord(SHEETS.DOCUMENTOS, HEADERS.DOCUMENTOS, data);
    }

    if (action === 'upload') return response({ url: uploadBase64(data) });
    
    // ACCIONES GENÉRICAS
    if (action === 'create') return addRecord(SHEETS.GASTOS, HEADERS.GASTOS, data);
    if (action === 'update') return updateRow(SHEETS.GASTOS, data.id, data);
    if (action === 'delete') return deleteRow(SHEETS.GASTOS, data.id);

    if (action === 'addIncome') return addRecord(SHEETS.INGRESOS, HEADERS.INGRESOS, data);
    if (action === 'updateIncome') return updateRow(SHEETS.INGRESOS, data.id, data);
    if (action === 'deleteIncome') return deleteRow(SHEETS.INGRESOS, data.id);

    if (action === 'addTask') return addRecord(SHEETS.TAREAS, HEADERS.TAREAS, data);
    if (action === 'updateTask') return updateRow(SHEETS.TAREAS, data.id, data);
    if (action === 'deleteTask') return deleteRow(SHEETS.TAREAS, data.id);

    if (action === 'updateDocument') return updateRow(SHEETS.DOCUMENTOS, data.id, data);
    if (action === 'deleteDocument') return deleteRow(SHEETS.DOCUMENTOS, data.id);

    return response({ error: 'Acción no reconocida: ' + action });
  } catch (err) { return response({ error: err.toString() }); }
}

function addRecord(sheetName, expectedHeaders, data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
  
  // 1. Asegurar que las cabeceras existen (Limpieza profunda)
  let lastCol = Math.max(1, sheet.getLastColumn());
  let currentHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim().toLowerCase());

  expectedHeaders.forEach(h => {
    if (currentHeaders.indexOf(h.toLowerCase()) === -1) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(h);
    }
  });

  // 2. Re-leer cabeceras reales tras la actualización
  const finalHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  // 3. Mapeo ULTRA-PERMISIVO (Ignora espacios, guiones y mayúsculas)
  const row = finalHeaders.map(h => {
    const cleanHeader = String(h).trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (cleanHeader === 'timestamp') return new Date();
    
    // Buscamos la llave en el objeto 'data' tratando que coincida
    const keyMatch = Object.keys(data).find(k => 
      k.toLowerCase().replace(/[^a-z0-9]/g, "") === cleanHeader
    );
    
    let val = keyMatch ? data[keyMatch] : "";
    return (val && typeof val === 'object' && !(val instanceof Date)) ? JSON.stringify(val) : val;
  });
  
  sheet.appendRow(row);
  return response({ success: true, url: data.url_drive });
}

function uploadBase64(data) {
  const root = DriveApp.getFolderById(ROOT_FOLDER_ID);
  const folderName = String(data.folderName);
  const folders = root.getFoldersByName(folderName);
  const target = folders.hasNext() ? folders.next() : root.createFolder(folderName);
  
  const parts = data.base64.split(",");
  const contentType = parts[0].split(":")[1].split(";")[0];
  const blob = Utilities.newBlob(Utilities.base64Decode(parts[1]), contentType, data.fileName);
  const file = target.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}

// --- RESTO DE FUNCIONES ---
function doGet(e) {
  try {
    const action = e.parameter.action;
    
    // VERIFICACIÓN DE SEGURIDAD
    if (action === 'isAuthorized') {
      const emailToCheck = e.parameter.email;
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      let sheet = ss.getSheetByName(SHEETS.USUARIOS);
      
      // Si la hoja no existe, la creamos y añadimos al primer usuario (tú) para que no te quedes fuera
      if (!sheet) {
        sheet = ss.insertSheet(SHEETS.USUARIOS);
        sheet.appendRow(HEADERS.USUARIOS);
        sheet.appendRow([emailToCheck, 'admin']);
        return response({ authorized: true, note: 'Hojas de usuarios creada. Te hemos añadido como admin.' });
      }
      
      const data = sheet.getDataRange().getValues();
      data.shift(); // Quitar cabecera
      const emails = data.map(r => String(r[0]).toLowerCase().trim());
      
      return response({ authorized: emails.includes(emailToCheck.toLowerCase().trim()) });
    }

    if (action === 'listDocuments') return listRecords(SHEETS.DOCUMENTOS, e.parameter.year);
    if (action === 'listTasks') return listRecords(SHEETS.TAREAS, e.parameter.year);
    if (action === 'list') return listRecords(SHEETS.GASTOS, e.parameter.year);
    if (action === 'listIncome') return listRecords(SHEETS.INGRESOS, e.parameter.year);
    if (action === 'balance') return getBalance(e.parameter.year);
    return response({ error: 'GET Inválido' });
  } catch (err) { return response({ error: err.toString() }); }
}

function listRecords(sheetName, year) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return response([]);
  const values = sheet.getDataRange().getValues();
  const headers = values.shift().map(h => String(h).trim());
  const results = values.map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  }).filter(r => !year || String(r.year || r.year_selector || new Date(r.fecha).getFullYear()) === String(year));
  return response(results);
}

function updateRow(sheetName, id, data) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);
  if (!sheet) return response({ error: 'Hoja no encontrada: ' + sheetName });
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h).trim().toLowerCase());
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(id)) {
      Object.keys(data).forEach(key => {
        const colIdx = headers.indexOf(key.toLowerCase());
        if (colIdx > -1 && key.toLowerCase() !== 'id') {
          let val = data[key];
          sheet.getRange(i + 1, colIdx + 1).setValue(typeof val === 'object' ? JSON.stringify(val) : val);
        }
      });
      return response({ success: true });
    }
  }
}

function deleteRow(sheetName, id) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(id)) { sheet.deleteRow(i + 1); return response({ success: true }); }
  }
}

function getBalance(year) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const gSheet = ss.getSheetByName('Gastos');
  const iSheet = ss.getSheetByName('Ingresos');
  
  let totalGastos = 0, totalIngresos = 0;
  
  if (gSheet && gSheet.getLastRow() > 1) {
    const gData = gSheet.getDataRange().getValues();
    gData.shift();
    gData.forEach(r => {
      const rowYear = new Date(r[4]).getFullYear();
      if (!year || String(rowYear) === String(year)) totalGastos += parseFloat(r[3]) || 0;
    });
  }
  
  if (iSheet && iSheet.getLastRow() > 1) {
    const iData = iSheet.getDataRange().getValues();
    iData.shift();
    iData.forEach(r => {
      const rowYear = new Date(r[1]).getFullYear();
      if (!year || String(rowYear) === String(year)) totalIngresos += parseFloat(r[4]) || 0;
    });
  }
  
  return response({
    totalGastos: totalGastos,
    totalIngresos: totalIngresos,
    balanceNeto: totalIngresos - totalGastos
  });
}

function response(c) { return ContentService.createTextOutput(JSON.stringify(c)).setMimeType(ContentService.MimeType.JSON); }
