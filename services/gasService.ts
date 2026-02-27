
import { ThermalData } from '../types';

export const submitThermalData = async (gasUrl: string, data: ThermalData): Promise<{ success: boolean; message: string }> => {
  if (!gasUrl || gasUrl.trim() === "") {
    return { success: false, message: 'Lỗi: Chưa cấu hình URL Google Apps Script.' };
  }

  // Đảm bảo các trường số liệu được gửi đi là kiểu số
  // Thêm dấu nháy đơn (') vào trước các trường text dễ bị GG Sheet hiểu lầm là ngày tháng (VD: 12/5)
  const payload = {
    action: 'submitThermal',
    ...data,
    deviceLocation: `'${data.deviceLocation}`,
    stationName: `'${data.stationName}`,
    feeder: `'${data.feeder}`,
    actionPlan: data.actionPlan ? `'${data.actionPlan}` : '',
    processedDate: data.processedDate ? `'${data.processedDate}` : '',
    postTemp: data.postTemp !== undefined ? Number(data.postTemp) : '',
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
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
  
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
    return rawData.map(item => ({
      ...item,
      deviceLocation: item.deviceLocation?.toString().startsWith("'") ? item.deviceLocation.toString().substring(1) : item.deviceLocation,
      stationName: item.stationName?.toString().startsWith("'") ? item.stationName.toString().substring(1) : item.stationName,
      feeder: item.feeder?.toString().startsWith("'") ? item.feeder.toString().substring(1) : item.feeder,
      actionPlan: item.actionPlan?.toString().startsWith("'") ? item.actionPlan.toString().substring(1) : item.actionPlan,
      processedDate: item.processedDate?.toString().startsWith("'") ? item.processedDate.toString().substring(1) : item.processedDate,
      postTemp: item.postTemp ? Number(item.postTemp) : undefined,
      date: item.date?.toString().startsWith("'") ? item.date.toString().substring(1) : item.date,
      timestamp: item.timestamp,
    }));
  } catch (error) {
    clearTimeout(timeoutId);
    if ((error as any).name === 'AbortError') {
      throw new Error('Yêu cầu quá hạn (Timeout). Vui lòng kiểm tra kết nối mạng hoặc URL script.');
    }
    console.error('Lỗi fetchThermalData:', error);
    throw error;
  }
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
}): Promise<{ success: boolean; message: string }> => {
  if (!gasUrl || gasUrl.trim() === "") {
    return { success: false, message: 'Lỗi: Chưa cấu hình URL Google Apps Script.' };
  }

  const payload = {
    action: 'updateActionPlan',
    stationName: data.stationName,
    deviceLocation: data.deviceLocation,
    date: data.date,
    actionPlan: data.actionPlan,
    processedDate: data.processedDate,
    postTemp: data.postTemp
  };

  try {
    const response = await fetch(gasUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const text = await response.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch (e) {
      // Nếu không parse được JSON, có thể GAS trả về trang lỗi HTML hoặc chuỗi thuần
      if (text.includes('"success":true')) {
        result = { success: true };
      } else {
        throw new Error('Phản hồi từ máy chủ không đúng định dạng JSON.');
      }
    }
    
    if (result.success) {
      return { 
        success: true, 
        message: 'Kế hoạch xử lý đã được cập nhật thành công!' 
      };
    } else {
      return {
        success: false,
        message: result.message || result.error || 'Không tìm thấy dữ liệu khớp để cập nhật. Vui lòng kiểm tra lại.'
      };
    }
  } catch (error) {
    console.error('Lỗi cập nhật kế hoạch xử lý:', error);
    return { 
      success: false, 
      message: 'Lỗi hệ thống: ' + (error as Error).message 
    };
  }
};
