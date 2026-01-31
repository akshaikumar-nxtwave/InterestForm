function doGet(e) {
  const action = e.parameter.action || 'getStudents';

  if (action === 'getStudents') return getStudents(e);
  if (action === 'decodeHash') return getApplicationDetails(e);
  if (action === 'getFormTemplate') return getFormTemplate(e);
  if (action === 'getHash') return getHash(e);

  return ContentService.createTextOutput(
    JSON.stringify({ error: "Invalid action" })
  ).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const payload = JSON.parse(e.postData.contents);
  const action = payload.action;

  if (action === 'updateStatus') return updateStatus(payload);
  if (action === 'saveResponse') return saveResponse(payload);
  if (action === 'generateLink') return generateApplicationLink(payload);
  if (action === 'storeHash') return storeHash(payload);

  return ContentService.createTextOutput(
    JSON.stringify({ error: "Invalid action" })
  ).setMimeType(ContentService.MimeType.JSON);
}

// ================= STUDENTS =================

function getStudents(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = e.parameter.sheetName;

  if (!sheetName) {
    return ContentService.createTextOutput(
      JSON.stringify({ error: "sheetName required" })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  const sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    return ContentService.createTextOutput(
      JSON.stringify({ error: "Sheet not found" })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    return ContentService.createTextOutput(JSON.stringify([]))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const headers = data[0].map(h => h.toString().toLowerCase());
  const students = data.slice(1).map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });

  return ContentService.createTextOutput(JSON.stringify(students))
    .setMimeType(ContentService.MimeType.JSON);
}

// ================= FORM TEMPLATE =================

function getFormTemplate(e) {
  const company = e.parameter.company;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Form-Templates');

  if (!sheet) {
    return ContentService.createTextOutput(
      JSON.stringify({ error: "Form-Templates sheet not found" })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === company) {
      return ContentService.createTextOutput(JSON.stringify({
        template: data[i][1],
        jd: data[i][2]
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  return ContentService.createTextOutput(
    JSON.stringify({ error: "Template not found" })
  ).setMimeType(ContentService.MimeType.JSON);
}

// ================= HASH LOOKUP =================

function getHash(e) {
  const uid = e.parameter.uid;
  const company = e.parameter.company;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Application-Links");

  if (!sheet) {
    return ContentService.createTextOutput(
      JSON.stringify({ exists: false })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    const rowHash = data[i][0];
    const rowUid = data[i][1];
    const rowCompany = data[i][2];

    if (rowUid == uid && rowCompany == company) {
      return ContentService.createTextOutput(JSON.stringify({
        exists: true,
        hash: rowHash
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  return ContentService.createTextOutput(
    JSON.stringify({ exists: false })
  ).setMimeType(ContentService.MimeType.JSON);
}

// ================= STORE HASH =================

function storeHash(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Application-Links");

  if (!sheet) {
    sheet = ss.insertSheet("Application-Links");
    sheet.appendRow(["Hash", "UID", "Company", "Created", "Used"]);
  }

  sheet.appendRow([
    payload.hash,
    payload.uid,
    payload.company,
    new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
    "No"
  ]);

  return ContentService.createTextOutput(
    JSON.stringify({ success: true })
  ).setMimeType(ContentService.MimeType.JSON);
}

// ================= SAVE RESPONSE =================

function saveResponse(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const responseSheetName = payload.sheetName + "-responses";

  let sheet = ss.getSheetByName(responseSheetName);

  // ================= CREATE SHEET + HEADERS =================
  if (!sheet) {
    sheet = ss.insertSheet(responseSheetName);

    const templateSheet = ss.getSheetByName("Form-Templates");
    let headers = ["UID", "Name", "Timestamp"];

    if (templateSheet) {
      const templateData = templateSheet.getDataRange().getValues();

      for (let i = 1; i < templateData.length; i++) {
        if (templateData[i][0] === payload.sheetName) {
          try {
            const template = JSON.parse(templateData[i][1]);

            template.forEach(field => {
              headers.push(field.question);
            });

          } catch (e) {
            Logger.log("Error parsing template: " + e);
          }
          break;
        }
      }
    }

    // Add header row
    sheet.appendRow(headers);

    // Style header row
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight("bold")
      .setBackground("#1a73e8")   // Google blue
      .setFontColor("#ffffff");
  }

  // ================= GET HEADERS =================
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  // ================= BUILD ROW DATA =================
  const rowData = headers.map(header => {

    if (header === "UID") return payload.uid;
    if (header === "Name") return payload.name;
    if (header === "Timestamp")
      return new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    const value = payload.response[header];

    // multi-select case
    if (Array.isArray(value)) {
      return value.join(", ");
    }

    // empty or missing
    if (value === undefined || value === null || value === "") {
      return "N/A";
    }

    return value;
  });

  // ================= APPEND ROW =================
  sheet.appendRow(rowData);

  return ContentService.createTextOutput(
    JSON.stringify({ success: true })
  ).setMimeType(ContentService.MimeType.JSON);
}


// ================= DECODE HASH =================

function getApplicationDetails(e) {
  const hash = e.parameter.hash;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Application-Links");

  if (!sheet) {
    return ContentService.createTextOutput(
      JSON.stringify({ error: "Invalid link" })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === hash) {
      return ContentService.createTextOutput(JSON.stringify({
        uid: data[i][1],
        company: data[i][2]
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  return ContentService.createTextOutput(
    JSON.stringify({ error: "Invalid or expired link" })
  ).setMimeType(ContentService.MimeType.JSON);
}

// ================= STATUS =================

function updateStatus(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(payload.sheetName);

  if (!sheet) {
    return ContentService.createTextOutput(
      JSON.stringify({ error: "Sheet not found" })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => h.toString().toLowerCase());

  const uidCol = headers.indexOf("uid");
  const statusCol = headers.indexOf("status");

  for (let i = 1; i < data.length; i++) {
    if (data[i][uidCol] == payload.uid) {
      sheet.getRange(i + 1, statusCol + 1).setValue(payload.status);
      return ContentService.createTextOutput(
        JSON.stringify({ success: true })
      ).setMimeType(ContentService.MimeType.JSON);
    }
  }

  return ContentService.createTextOutput(
    JSON.stringify({ error: "UID not found" })
  ).setMimeType(ContentService.MimeType.JSON);
}
