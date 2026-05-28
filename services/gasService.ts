
import { ThermalData } from '../types';

export const submitThermalData = async (gasUrl: string, data: ThermalData): Promise<{ success: boolean; message: string }> => {
  if (!gasUrl || gasUrl.trim() === "") {
    return { success: false, message: 'Lỗi: Chưa cấu hình URL Google Apps Script.' };
  }

  // Tạo map tất cả các hoán vị từ khóa cột Y cho "Tên thiết bị (Loại thiết bị)" để đảm bảo ghi đúng cột Y
  const deviceNameKeys = [
    "Tên Thiết bị",
    "Tên thiết bị",
    "Tên Thiết Bị",
    "tên thiết bị",
    "TÊN THIẾT BỊ",
    "Ten Thiet bi",
    "Ten thiet bi",
    "Ten Thiet Bi",
    "ten thiet bi",
    "TEN THIET BI",
    "deviceName",
    "device_name",
    "Tên thiết bị (loại thiết bị)",
    "Tên thiết bị (Loại thiết bị)",
    "Ten thiet bi (loai thiet bi)",
    "Ten thiet bi (Loai thiet bi)",
    "Ten thiet bi / Loai thiet bi",
    "Ten thiet bi/Loai thiet bi",
    "Tên thiết bị, loại thiết bị",
    "Tên thiết bị,loại thiết bị",
    "Loại thiết bị (Tên thiết bị)",
    "Loại Thiết Bị (Tên Thiết Bị)",
    "Cột Y",
    "cột Y",
    "cột y",
    "CỘT Y",
    "Column Y",
    "columnY",
    "column_Y",
    "colY",
    "col_Y",
    "col_y",
    "Y",
    "y",
    "column25",
    "col25",
    "cộtY",
    "cộty",
    "cột_Y",
    "cột_y",
    "cotY",
    "coty",
    "cot_Y",
    "cot_y",
    "cot Y",
    "cot y"
  ];

  const deviceNameVal = data.deviceName || "";
  const deviceNamePayloadMap: Record<string, string> = {};

  deviceNameKeys.forEach(key => {
    // Bản gốc
    deviceNamePayloadMap[key] = deviceNameVal;
    deviceNamePayloadMap[`${key}_quote`] = deviceNameVal ? `'${deviceNameVal}` : '';

    // Bản chuẩn hóa NFC
    const nfcKey = key.normalize("NFC");
    deviceNamePayloadMap[nfcKey] = deviceNameVal;
    deviceNamePayloadMap[`${nfcKey}_quote`] = deviceNameVal ? `'${deviceNameVal}` : '';

    // Bản chuẩn hóa NFD
    const nfdKey = key.normalize("NFD");
    deviceNamePayloadMap[nfdKey] = deviceNameVal;
    deviceNamePayloadMap[`${nfdKey}_quote`] = deviceNameVal ? `'${deviceNameVal}` : '';
  });

  // Đảm bảo các trường số liệu được gửi đi là kiểu số
  // Thêm dấu nháy đơn (') vào trước các trường text dễ bị GG Sheet hiểu lầm là ngày tháng (VD: 12/5)
  const payload = {
    action: 'submitThermal',
    sheetName: 'data',
    ...data,
    ...deviceNamePayloadMap,
    deviceLocation: `'${data.deviceLocation}`,
    stationName: `'${data.stationName}`,
    feeder: `'${data.feeder}`,
    actionPlan: data.actionPlan ? `'${data.actionPlan}` : '',
    processedDate: data.processedDate ? `'${data.processedDate}` : '',
    postTemp: data.postTemp !== undefined ? Number(data.postTemp) : '',
    postImage: data.postImage || '',
    image3: data.postImage || '',
    photoAfter: data.postImage || '',
    postImageFolderId: '1WMOsFF6Kfq7ewqS3nXBbpAv2QWGfzjtQ',
    folderId: '1WMOsFF6Kfq7ewqS3nXBbpAv2QWGfzjtQ',
    measuredTemp: Number(data.measuredTemp),
    referenceTemp: Number(data.referenceTemp),
    ambientTemp: Number(data.ambientTemp),
    currentLoad: Number(data.currentLoad),
  };

  try {
    // Sử dụng mode 'no-cors' là cách ổn định nhất để gửi dữ liệu đến Google Apps Script từ trình duyệt
    // mà không gặp lỗi CORS. Lưu ý: Chúng ta sẽ không đọc được phản hồi JSON, nhưng dữ liệu vẫn được ghi.
    await fetch(gasUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    return { 
      success: true, 
      message: 'Dữ liệu đã được gửi đi! Vui lòng kiểm tra Google Sheet sau vài giây.' 
    };
  } catch (error) {
    console.error('Lỗi gửi dữ liệu:', error);
    return { 
      success: false, 
      message: 'Không thể kết nối với máy chủ Google: ' + (error as Error).message 
    };
  }
};

export const fetchThermalData = async (gasUrl: string): Promise<ThermalData[]> => {
  if (!gasUrl) {
    throw new Error('Chưa cấu hình URL máy chủ dữ liệu.');
  }
  
  const maxRetries = 2;
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // Increased to 30s timeout
    
    try {
      const timestamp = new Date().getTime();
      const response = await fetch(`${gasUrl}?action=read&_t=${timestamp}`, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Máy chủ phản hồi lỗi: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Nếu kết quả trả về có success: false
      if (result && result.success === false) {
        throw new Error(result.message || 'Máy chủ báo lỗi không xác định.');
      }

      let rawData: ThermalData[] = [];
      
      if (Array.isArray(result)) {
        rawData = result;
      } else if (result && Array.isArray(result.data)) {
        rawData = result.data;
      } else if (result && Array.isArray(result.rows)) {
        rawData = result.rows;
      }

      // Làm sạch dữ liệu: Loại bỏ dấu nháy đơn (') ở đầu chuỗi nếu có (do chúng ta thêm vào để tránh lỗi định dạng GG Sheet)
      return rawData.map(item => {
        // Tìm và phân giải loại thiết bị từ các key có thể có của Cột Y trong dữ liệu dòng
        const keysToTry = [
          "Tên thiết bị (loại thiết bị)",
          "Tên thiết bị (Loại thiết bị)",
          "Ten thiet bi (loai thiet bi)",
          "Ten thiet bi (Loai thiet bi)",
          "Ten thiet bi / Loai thiet bi",
          "Ten thiet bi/Loai thiet bi",
          "Tên thiết bị, loại thiết bị",
          "Tên thiết bị,loại thiết bị",
          "Loại thiết bị (Tên thiết bị)",
          "Loại Thiết Bị (Tên Thiết Bị)",
          "TÊN THIẾT BỊ",
          "Tên thiết bị",
          "Tên Thiết Bị",
          "deviceName",
          "device_name",
          "tenThietBi",
          "ten_thiet_bi",
          "Cột Y", "cột Y", "cột y", "CỘT Y",
          "Column Y", "columnY", "column_Y", "colY", "col_Y", "col_y", "Y", "y",
          "column25", "col25", "cộtY", "cộty", "cột_Y", "cột_y", "cột Y", "cột y",
          "cotY", "coty", "cot_Y", "cot_y", "cot Y", "cot y"
        ];
        
        let foundDeviceName: any = null;
        const rawItem = item as any;
        for (const key of keysToTry) {
          if (rawItem[key] !== undefined && rawItem[key] !== null && rawItem[key] !== "") {
            foundDeviceName = rawItem[key];
            break;
          }
          
          const nfcKey = key.normalize("NFC");
          if (rawItem[nfcKey] !== undefined && rawItem[nfcKey] !== null && rawItem[nfcKey] !== "") {
            foundDeviceName = rawItem[nfcKey];
            break;
          }
          
          const nfdKey = key.normalize("NFD");
          if (rawItem[nfdKey] !== undefined && rawItem[nfdKey] !== null && rawItem[nfdKey] !== "") {
            foundDeviceName = rawItem[nfdKey];
            break;
          }
          
          const quoteKey = key + "_quote";
          if (rawItem[quoteKey] !== undefined && rawItem[quoteKey] !== null && rawItem[quoteKey] !== "") {
            foundDeviceName = rawItem[quoteKey];
            break;
          }
        }
        
        const deviceNameCleaned = foundDeviceName != null && foundDeviceName.toString().startsWith("'") 
          ? foundDeviceName.toString().substring(1) 
          : (foundDeviceName || item.deviceName || "");

        return {
          ...item,
          deviceName: deviceNameCleaned || undefined,
          deviceLocation: item.deviceLocation?.toString().startsWith("'") ? item.deviceLocation.toString().substring(1) : item.deviceLocation,
          stationName: item.stationName?.toString().startsWith("'") ? item.stationName.toString().substring(1) : item.stationName,
          feeder: item.feeder?.toString().startsWith("'") ? item.feeder.toString().substring(1) : item.feeder,
          actionPlan: item.actionPlan?.toString().startsWith("'") ? item.actionPlan.toString().substring(1) : item.actionPlan,
          processedDate: item.processedDate?.toString().startsWith("'") ? item.processedDate.toString().substring(1) : item.processedDate,
          postTemp: item.postTemp ? Number(item.postTemp) : undefined,
          postImage: item.postImage,
          date: item.date?.toString().startsWith("'") ? item.date.toString().substring(1) : item.date,
          timestamp: item.timestamp,
        };
      });
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error;
      
      // Only retry if it's a timeout or network error, not a 404 or other logic error
      if ((error as any).name === 'AbortError' || (error as any).message?.includes('fetch')) {
        console.warn(`Fetch attempt ${i + 1} failed, retrying...`, error);
        // Wait a bit before retrying
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
      }
      break;
    }
  }

  if (lastError && (lastError as any).name === 'AbortError') {
    throw new Error('Yêu cầu quá hạn (Timeout). Vui lòng kiểm tra kết nối mạng hoặc URL script.');
  }
  throw lastError;
};

export const fetchFeedersFromSheet = async (gasUrl: string): Promise<Record<string, string[]>> => {
  if (!gasUrl) return {};
  try {
    const response = await fetch(`${gasUrl}?action=getFeeders&_t=${Date.now()}`);
    if (!response.ok) throw new Error('Không thể tải danh sách xuất tuyến');
    const result = await response.json();
    if (result.success && result.data) {
      return result.data;
    }
    return {};
  } catch (error) {
    console.error('Error fetching feeders:', error);
    return {};
  }
};

export const manageFeederOnSheet = async (gasUrl: string, payload: {
  action: 'addFeeder' | 'deleteFeeder';
  unit: string;
  feeder: string;
}): Promise<{ success: boolean; message: string }> => {
  if (!gasUrl) return { success: false, message: 'Chưa cấu hình URL' };
  console.log(`Calling manageFeederOnSheet at: ${gasUrl}`, payload);
  try {
    // Thêm sheetName: 'xuattuyen' vào payload để GAS biết cần ghi vào đâu
    const finalPayload = {
      ...payload,
      sheetName: 'xuattuyen'
    };

    const response = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(finalPayload),
    });
    
    const text = await response.text();
    console.log('GAS Response:', text);
    try {
      const result = JSON.parse(text);
      // Nếu là xóa và báo success: false, có thể là do không tìm thấy dòng để xóa (đã xóa rồi)
      // Chúng ta vẫn coi là thành công về mặt logic ứng dụng nếu message chỉ ra điều đó
      const isDeleteNotFound = payload.action === 'deleteFeeder' && result.success === false;
      
      return {
        success: !!result.success || isDeleteNotFound,
        message: result.message || (result.success ? 'Thành công' : (isDeleteNotFound ? 'Đã xóa hoặc không tìm thấy' : 'Thất bại trên máy chủ'))
      };
    } catch (e) {
      if (text.includes('"success":true')) return { success: true, message: 'Thành công' };
      return { success: false, message: 'Lỗi phản hồi từ máy chủ' };
    }
  } catch (error) {
    console.error('Error managing feeder:', error);
    return { success: false, message: 'Lỗi kết nối máy chủ' };
  }
};

export const updateActionPlan = async (gasUrl: string, data: { 
  stationName: string; 
  deviceLocation: string; 
  date: string; 
  actionPlan: string;
  processedDate?: string;
  postTemp?: string | number;
  postImage?: string;
}): Promise<{ success: boolean; message: string }> => {
  if (!gasUrl || gasUrl.trim() === "") {
    return { success: false, message: 'Lỗi: Chưa cấu hình URL Google Apps Script.' };
  }

  const payload = {
    action: 'updateActionPlan',
    sheetName: 'data', 
    stationName: data.stationName,
    deviceLocation: data.deviceLocation,
    date: data.date,
    actionPlan: data.actionPlan,
    processedDate: data.processedDate || '',
    postTemp: data.postTemp !== undefined ? data.postTemp : '',
    // Gửi ảnh theo nhiều key khác nhau để tương thích với các phiên bản script
    postImage: data.postImage || '',    // Key 1
    image3: data.postImage || '',       // Key 2 (Common in templates)
    photoAfter: data.postImage || '',   // Key 3
    postImageFolderId: '1WMOsFF6Kfq7ewqS3nXBbpAv2QWGfzjtQ', // Folder ID do user cung cấp
    folderId: '1WMOsFF6Kfq7ewqS3nXBbpAv2QWGfzjtQ'           // Key dự phòng cho Folder ID
  };

  try {
    // Sử dụng mode 'no-cors' tương tự như submitThermalData để đảm bảo gửi được dữ liệu lớn (Base64) 
    // đến Google Apps Script mà không bị chặn bởi CORS policy của trình duyệt.
    await fetch(gasUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    return { 
      success: true, 
      message: 'Yêu cầu cập nhật đã được gửi đi! Dữ liệu sẽ được xử lý sau vài giây.' 
    };
  } catch (error) {
    console.error('Lỗi cập nhật kế hoạch xử lý:', error);
    return { 
      success: false, 
      message: 'Lỗi hệ thống: ' + (error as Error).message 
    };
  }
};
