/**
 * GOOGLE APPS SCRIPT BACKEND FOR PCQN SMART THERMAL APP
 * 
 * SỬ DỤNG ĐỂ THAY THẾ TOÀN BỘ SCRIPT HIỆN TẠI TRÊN TRÌNH SOẠN THẢO GOOGLE APPS SCRIPT.
 * 
 * Đảm bảo bạn đã cấp quyền dịch vụ Drive API trong Google Apps Script nếu cần.
 * Cách triển khai: Thêm dưới dạng Ứng dụng Web (Web App), cấu hình "Execute as: Me" và "Who has access: Anyone".
 */

var FOLDER_ID = '1WMOsFF6Kfq7ewqS3nXBbpAv2QWGfzjtQ';
var VERSION = "V12_SAVE_AFTER_IMAGE_TO_COLUMN_X";

function doGet(e) {
  var action = e.parameter.action;
  
  if (action === "getFeeders") {
    return handleGetFeeders();
  }
  
  // Mặc định là đọc dữ liệu (action === "read")
  return handleReadData();
}

function doPost(e) {
  try {
    var postData = JSON.parse(e.postData.contents);
    var action = postData.action;
    
    if (action === "submitThermal") {
      return handleSubmitThermal(postData);
    } else if (action === "updateActionPlan") {
      return handleUpdateActionPlan(postData);
    } else if (action === "addFeeder") {
      return handleAddFeeder(postData);
    } else if (action === "deleteFeeder") {
      return handleDeleteFeeder(postData);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      message: "Hành động (action) không hợp lệ." 
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      message: "Lỗi hệ thống: " + error.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ==========================================
// 1. HÀM XỬ LÝ LẤY DANH SÁCH XUẤT TUYẾN
// ==========================================
function handleGetFeeders() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("xuattuyen");
  
  if (!sheet) {
    // Nếu chưa có sheet, trả về rỗng thay vì lỗi
    return ContentService.createTextOutput(JSON.stringify({ success: true, data: {} })).setMimeType(ContentService.MimeType.JSON);
  }
  
  var data = sheet.getDataRange().getValues();
  var result = {};
  
  // Bỏ qua dòng tiêu đề (i = 1)
  for (var i = 1; i < data.length; i++) {
    var unit = data[i][0] ? data[i][0].toString().trim() : "";
    var feeder = data[i][1] ? data[i][1].toString().trim() : "";
    
    if (unit && feeder) {
      if (!result[unit]) {
        result[unit] = [];
      }
      if (result[unit].indexOf(feeder) === -1) {
        result[unit].push(feeder);
      }
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    data: result
  })).setMimeType(ContentService.MimeType.JSON);
}

// ==========================================
// 2. HÀM XỬ LÝ ĐỌC DỮ LIỆU ĐO NHIỆT (READ)
// ==========================================
function handleReadData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("data");
  
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Không tìm thấy trang tính 'data'" })).setMimeType(ContentService.MimeType.JSON);
  }
  
  var range = sheet.getDataRange();
  var values = range.getValues();
  var results = [];
  
  // Dòng 0 là tiêu đề, duyệt từng dòng dữ liệu từ dòng 1 trở đi
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    
    // Bỏ qua dòng trống nếu không có Tên trạm/Nhánh rẽ
    if (!row[2] || row[2].toString().trim() === "") continue;
    
    // Định dạng chuỗi ngày tháng đo
    var dateVal = "";
    if (row[13]) {
      if (row[13] instanceof Date) {
        dateVal = Utilities.formatDate(row[13], "GMT+7", "yyyy-MM-dd");
      } else {
        dateVal = row[13].toString().trim();
      }
    }
    
    // Thêm các thông tin cơ bản kèm Tên thiết bị (Cột Y - index 24)
    results.push({
      timestamp: row[0],
      unit: row[1],
      stationName: row[2],
      feeder: row[3],
      inspectionType: row[4],
      deviceLocation: row[5],
      phase: row[6],
      measuredTemp: row[7],
      referenceTemp: row[8],
      ambientTemp: row[9],
      currentLoad: row[10],
      conclusion: row[11],
      inspector: row[12],
      date: dateVal,
      thermalImage: row[14],
      normalImage: row[15],
      actionPlan: row[16] || "",
      processedDate: row[17] || "",
      postTemp: row[18] || "",
      postImage: row[23] || "", // Cột X là index 23
      deviceName: row[24] || "Mối nối" // Cột Y là index 24 (Mặc định nếu trống)
    });
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    data: results
  })).setMimeType(ContentService.MimeType.JSON);
}

// ==========================================
// 3. HÀM XỬ LÝ GỬI MỚI DỮ LIỆU ĐO (SUBMIT)
// ==========================================
function handleSubmitThermal(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("data");
  
  if (!sheet) {
    sheet = ss.insertSheet("data");
  }
  
  var folder;
  try {
    folder = DriveApp.getFolderById(FOLDER_ID);
  } catch (err) {
    folder = DriveApp.getRootFolder();
  }
  
  // Lưu ảnh nhiệt & ảnh thường lấy link Drive
  var thermalUrl = saveBase64Image(data.thermalImage, "T_" + Date.now() + ".jpg", folder);
  var normalUrl = saveBase64Image(data.normalImage, "N_" + Date.now() + ".jpg", folder);
  
  var now = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss");
  var lastRow = sheet.getLastRow();
  var nextRowIndex = lastRow + 1;
  
  // Trích lọc tên thiết bị gửi lên
  var deviceName = "Mối nối";
  var keysToTry = [
    "deviceName", "Tên thiết bị", "Tên Thiết Bị", "TÊN THIẾT BỊ", "Tên thiết bị (Loại thiết bị)", 
    "Tên thiết bị (loại thiết bị)", "Loại thiết bị (Tên thiết bị)"
  ];
  for (var k = 0; k < keysToTry.length; k++) {
    var key = keysToTry[k];
    if (data[key] !== undefined && data[key] !== null && data[key] !== "") {
      deviceName = data[key];
      break;
    }
  }
  
  // Khởi tạo mảng ghi dòng mới gồm 26 cột (tương ứng từ cột A đến cột Z)
  var newRow = new Array(26).fill("");
  
  newRow[0] = now;                      // A: Thời điểm cập nhật
  newRow[1] = data.unit || "";          // B: Đơn vị
  newRow[2] = data.stationName || "";   // C: Trạm/Nhánh rẽ
  newRow[3] = data.feeder || "";        // D: Xuất tuyến
  newRow[4] = data.inspectionType || "";// E: Loại kiểm tra
  newRow[5] = data.deviceLocation || "";// F: Vị trí thiết bị/vị trí cột
  newRow[6] = data.phase || "";         // G: Pha
  newRow[7] = data.measuredTemp !== undefined ? Number(data.measuredTemp) : "";  // H: Nhiệt độ đo
  newRow[8] = data.referenceTemp !== undefined ? Number(data.referenceTemp) : "";// I: Tham chiếu
  newRow[9] = data.ambientTemp !== undefined ? Number(data.ambientTemp) : "";    // J: Nhiệt độ môi trường
  newRow[10] = data.currentLoad !== undefined ? Number(data.currentLoad) : "";   // K: Dòng phụ tải
  newRow[11] = data.conclusion || "";   // L: Kết luận
  newRow[12] = data.inspector || "";    // M: Người đo
  newRow[13] = data.date || "";         // N: Ngày đo
  newRow[14] = thermalUrl;              // O: Ảnh nhiệt
  newRow[15] = normalUrl;               // P: Ảnh thường
  newRow[16] = data.actionPlan || "";   // Q: Kế hoạch xử lý
  newRow[17] = data.processedDate || "";// R: Ngày đã xử lý
  newRow[18] = data.postTemp !== undefined ? Number(data.postTemp) : "";         // S: Nhiệt độ đo sau xử lý
  newRow[19] = VERSION;                 // T: Phiên bản app
  
  // Công thức cho cột Lọc (U, V, W) tự động dựa trên ngày đo cột N
  newRow[20] = "=IF(ISNUMBER(N" + nextRowIndex + "), MONTH(N" + nextRowIndex + "), \"\")"; // U: Tháng đo
  newRow[21] = "=IF(ISNUMBER(N" + nextRowIndex + "), MONTH(N" + nextRowIndex + "), \"\")"; // V: Xem tháng số
  newRow[22] = "=IF(ISNUMBER(N" + nextRowIndex + "), YEAR(N" + nextRowIndex + "), \"\")";  // W: Năm đo
  
  newRow[23] = "";                      // X: Ảnh sau xử lý (Trống ban đầu)
  newRow[24] = deviceName;              // Y: Tên Thiết Bị
  newRow[25] = "=IF(H" + nextRowIndex + "-I" + nextRowIndex + ">15, \"Cần xử lý ngay\", \"\")"; // Z: Trạng thái khẩn cấp
  
  sheet.appendRow(newRow);
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: "Ghi dữ liệu đo thành công!"
  })).setMimeType(ContentService.MimeType.JSON);
}

// ==========================================
// 4. HÀM CẬP NHẬT KẾ HOẠCH XỬ LÝ (UPDATE)
// ==========================================
function handleUpdateActionPlan(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("data");
  
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      message: "Không tìm thấy trang tính 'data'." 
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  var targetStation = (data.stationName || "").toString().trim();
  var targetLocation = (data.deviceLocation || "").toString().trim();
  var targetDate = (data.date || "").toString().trim();
  
  if (!targetStation || !targetLocation || !targetDate) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      message: "Thiếu dữ liệu định vị dòng để cập nhật (Trạm, Vị trí hoặc Ngày)." 
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  var values = sheet.getDataRange().getValues();
  var foundRowIdx = -1;
  
  // Tìm kiếm dòng khớp khóa chỉnh sửa
  for (var i = 1; i < values.length; i++) {
    var rawStationName = values[i][2] ? values[i][2].toString().trim() : "";
    var rawDeviceLocation = values[i][5] ? values[i][5].toString().trim() : "";
    var rawDate = "";
    
    if (values[i][13]) {
      if (values[i][13] instanceof Date) {
        rawDate = Utilities.formatDate(values[i][13], "GMT+7", "yyyy-MM-dd");
      } else {
        rawDate = values[i][13].toString().trim();
      }
    }
    
    // Loại bỏ dấu nháy ở đầu chuỗi (nếu có) khi so khớp
    if (rawStationName.startsWith("'")) rawStationName = rawStationName.substring(1);
    if (rawDeviceLocation.startsWith("'")) rawDeviceLocation = rawDeviceLocation.substring(1);
    if (rawDate.startsWith("'")) rawDate = rawDate.substring(1);
    
    var searchStationClean = targetStation.startsWith("'") ? targetStation.substring(1) : targetStation;
    var searchLocationClean = targetLocation.startsWith("'") ? targetLocation.substring(1) : targetLocation;
    var searchDateClean = targetDate.startsWith("'") ? targetDate.substring(1) : targetDate;
    
    if (rawStationName === searchStationClean && 
        rawDeviceLocation === searchLocationClean && 
        rawDate === searchDateClean) {
      foundRowIdx = i + 1; // 1-index cho Sheet Row
      break;
    }
  }
  
  if (foundRowIdx === -1) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      message: "Không tìm thấy báo cáo đo nhiệt tương ứng để cập nhật." 
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // Lưu trữ ảnh sau xử lý nếu có
  var afterUrl = "";
  var postImgPayload = data.postImage || data.image3 || data.photoAfter || "";
  if (postImgPayload) {
    var folder;
    try {
      folder = DriveApp.getFolderById(FOLDER_ID);
    } catch (err) {
      folder = DriveApp.getRootFolder();
    }
    afterUrl = saveBase64Image(postImgPayload, "A_" + Date.now() + ".jpg", folder);
  }
  
  // Thực hiện ghi thẳng vào các ô cột tương ứng
  // Cột Q (17) - Kế hoạch xử lý
  if (data.actionPlan !== undefined) {
    sheet.getCell(foundRowIdx, 17).setValue(data.actionPlan);
  }
  
  // Cột R (18) - Ngày đã xử lý
  if (data.processedDate !== undefined) {
    sheet.getCell(foundRowIdx, 18).setValue(data.processedDate);
  }
  
  // Cột S (19) - Nhiệt đo sau xử lý
  if (data.postTemp !== undefined && data.postTemp !== "") {
    sheet.getCell(foundRowIdx, 19).setValue(Number(data.postTemp));
  }
  
  // Cột X (24) - Ảnh sau xử lý
  if (afterUrl) {
    sheet.getCell(foundRowIdx, 24).setValue(afterUrl);
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: "Cập nhật kế hoạch và dữ liệu sau xử lý thành công!"
  })).setMimeType(ContentService.MimeType.JSON);
}

// ==========================================
// 5. HÀM QUẢN LÝ THÊM & XÓA XUẤT TUYẾN
// ==========================================
function handleAddFeeder(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("xuattuyen");
  
  if (!sheet) {
    sheet = ss.insertSheet("xuattuyen");
    sheet.appendRow(["Đơn vị", "Xuất tuyến"]);
  }
  
  if (!data.unit || !data.feeder) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      message: "Thiếu thông tin Đơn vị hoặc tên Xuất tuyến." 
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  sheet.appendRow([data.unit, data.feeder]);
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: "Thêm tuyến thành công!"
  })).setMimeType(ContentService.MimeType.JSON);
}

function handleDeleteFeeder(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("xuattuyen");
  
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      message: "Không tìm thấy bảng xuất tuyến để xóa." 
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  var targetUnit = (data.unit || "").toString().trim();
  var targetFeeder = (data.feeder || "").toString().trim();
  
  var values = sheet.getDataRange().getValues();
  var deleted = false;
  
  // Duyệt ngược để an toàn trong việc xóa dòng
  for (var i = values.length - 1; i >= 1; i--) {
    var rawUnit = values[i][0] ? values[i][0].toString().trim() : "";
    var rawFeeder = values[i][1] ? values[i][1].toString().trim() : "";
    
    if (rawUnit === targetUnit && rawFeeder === targetFeeder) {
      sheet.deleteRow(i + 1);
      deleted = true;
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: deleted,
    message: deleted ? "Xóa xuất tuyến thành công!" : "Không tìm thấy xuất tuyến phù hợp."
  })).setMimeType(ContentService.MimeType.JSON);
}

// ==========================================
// 6. TIỆN ÍCH UPLOAD TRỰC TIẾP BASE64 LÊN DRIVE
// ==========================================
function saveBase64Image(base64Data, fileName, folder) {
  if (!base64Data || !base64Data.toString().startsWith("data:image")) return "";
  
  try {
    var raw = base64Data.toString().split(",")[1];
    var decoded = Utilities.base64Decode(raw);
    var blob = Utilities.newBlob(decoded, "image/jpeg", fileName);
    var file = folder.createFile(blob);
    
    // Đặt quyền xem cho tất cả mọi người có liên kết
    file.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW);
    return "https://drive.google.com/uc?id=" + file.getId();
  } catch (error) {
    return "";
  }
}
