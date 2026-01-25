/**
 * BACKEND - GESTIÓN ECONÓMICA CORTIJO VELASCO
 * Lenguaje: Google Apps Script (GAS)
 * Funciona como una API REST conectada a Google Sheets y Drive.
 */

const SPREADSHEET_ID = 'TU_ID_DE_GOOGLE_SHEET'; // Se define en settings.js o aquí
const EXPENSES_SHEET = 'Gastos';
const LOG_SHEET = 'LogGastos';
const DRIVE_FOLDER_ID = 'TU_ID_DE_CARPETA_DRIVE';

function doPost(e) {
  const action = e.parameter.action;
  const data = JSON.parse(e.postData.contents);
  
  switch(action) {
    case 'create':
      return createExpense(data);
    case 'delete':
      return deleteExpense(data.id, data.user_id);
    case 'upload':
      return response({url: uploadFileToDrive(data.base64, data.fileName)});
    default:
      return response({error: 'Acción no válida'});
  }
}

function doGet(e) {
  const action = e.parameter.action;
  
  switch(action) {
    case 'list':
      return listExpenses(e.parameter);
    case 'balance':
      return getBalance();
    case 'log':
      return getLogs();
    case 'export':
      return exportExpenses(e.parameter);
    default:
      return listExpenses(e.parameter);
  }
}

// --- LÓGICA DE NEGOCIO ---

function listExpenses(params) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(EXPENSES_SHEET);
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  
  let result = data.map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });

  // 1. FILTROS
  if (params.usuario) result = result.filter(r => r.user_id === params.usuario);
  if (params.categoria) result = result.filter(r => r.categoria === params.categoria);
  if (params.concepto) result = result.filter(r => r.concepto.toLowerCase().includes(params.concepto.toLowerCase()));
  if (params.desde) result = result.filter(r => new Date(r.fecha) >= new Date(params.desde));
  if (params.hasta) result = result.filter(r => new Date(r.fecha) <= new Date(params.hasta));

  // 2. ORDENACIÓN
  const sort = params.sort || 'fecha';
  const order = params.order || 'desc';
  
  result.sort((a, b) => {
    let valA = a[sort];
    let valB = b[sort];
    if (sort === 'cantidad') { valA = parseFloat(valA); valB = parseFloat(valB); }
    if (order === 'asc') return valA > valB ? 1 : -1;
    return valA < valB ? 1 : -1;
  });

  return response(result);
}

function createExpense(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(EXPENSES_SHEET);
  const id = Utilities.getUuid();
  const timestamp = new Date();
  
  sheet.appendRow([
    id, 
    data.user_id, 
    data.concepto, 
    data.cantidad, 
    data.fecha, 
    data.url_drive || '', 
    timestamp, 
    data.categoria
  ]);
  
  logAction(data.user_id, 'CREACIÓN', id, `Gasto de ${data.cantidad}€ en ${data.concepto}`);
  return response({success: true, id: id});
}

function deleteExpense(id, userId) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(EXPENSES_SHEET);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      sheet.deleteRow(i + 1);
      logAction(userId, 'ELIMINACIÓN', id, 'Gasto eliminado');
      return response({success: true});
    }
  }
  return response({error: 'ID no encontrado'});
}

function getBalance() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(EXPENSES_SHEET);
  const data = sheet.getDataRange().getValues();
  data.shift();
  
  let total = 0;
  let userTotals = {};
  
  data.forEach(row => {
    const user = row[1];
    const amount = parseFloat(row[3]);
    total += amount;
    userTotals[user] = (userTotals[user] || 0) + amount;
  });
  
  const users = Object.keys(userTotals);
  const numUsers = users.length || 1;
  const average = total / numUsers;
  
  let breakdown = users.map(user => ({
    usuario: user,
    total: userTotals[user],
    diferencia: userTotals[user] - average
  }));
  
  return response({
    totalGeneral: total,
    media: average,
    usuarios: breakdown
  });
}

function logAction(userId, action, expenseId, details) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(LOG_SHEET);
  if (!sheet) sheet = ss.insertSheet(LOG_SHEET);
  
  sheet.appendRow([
    Utilities.getUuid(),
    userId,
    action,
    expenseId,
    new Date(),
    details
  ]);
}

function response(content) {
  return ContentService.createTextOutput(JSON.stringify(content))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Función para subir archivos a Drive desde el Frontend (vía base64)
 */
function uploadFileToDrive(base64Data, fileName) {
  try {
    const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    const contentType = base64Data.substring(base64Data.indexOf(":") + 1, base64Data.indexOf(";"));
    const bytes = Utilities.base64Decode(base64Data.split(",")[1]);
    const blob = Utilities.newBlob(bytes, contentType, fileName);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (e) {
    return "error: " + e.toString();
  }
}
