
import { ThermalData } from '../types';

export const submitThermalData = async (gasUrl: string, data: ThermalData): Promise<{ success: boolean; message: string }> => {
  if (!gasUrl || gasUrl.trim() === "") {
    return { success: false, message: 'Lỗi: Chưa cấu hình URL Google Apps Script.' };
  }

  // Đảm bảo các trường số liệu được gửi đi là kiểu số
  const payload = {
    ...data,
    measuredTemp: Number(data.measuredTemp),
    referenceTemp: Number(data.referenceTemp),
    ambientTemp: Number(data.ambientTemp),
    currentLoad: Number(data.currentLoad),
  };

  try {
    // Sử dụng mode 'no-cors' để vượt qua các hạn chế bảo mật của trình duyệt khi gọi đến GAS
    // Lưu ý: Trong mode này chúng ta không đọc được response body, nhưng GAS vẫn nhận được dữ liệu.
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
      message: 'Dữ liệu (bao gồm Xuất tuyến & Loại kiểm tra) đã được gửi thành công!' 
    };
  } catch (error) {
    console.error('Lỗi gửi dữ liệu:', error);
    return { 
      success: false, 
      message: 'Không thể kết nối với máy chủ Google: ' + (error as Error).message 
    };
  }
};
