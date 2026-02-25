
import { GoogleGenAI } from "@google/genai";

export const getThermalAnalysis = async (temp: number, refTemp: number, load: number) => {
  // Lấy API Key từ biến môi trường (Vite yêu cầu tiền tố VITE_ để lộ ra client)
  const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY || (import.meta as any).env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error("GEMINI_API_KEY is missing");
    return "Lỗi: Chưa cấu hình API_KEY trên hosting. Hãy vào phần cài đặt Environment Variables để thêm biến VITE_GEMINI_API_KEY.";
  }

  // Khởi tạo AI trực tiếp theo hướng dẫn
  const ai = new GoogleGenAI({ apiKey: apiKey });
  const deltaT = temp - refTemp;
  
  const prompt = `Bạn là chuyên gia chẩn đoán nhiệt thiết bị điện của EVN. 
    Dữ liệu đo: t1=${temp}°C (thiết bị), t2=${refTemp}°C (tham chiếu), ΔT=${deltaT.toFixed(1)}°C, phụ tải=${load}A.
    Dựa trên quy trình kỹ thuật:
    - Nếu ΔT < 5°C: Bình thường.
    - Nếu 5°C <= ΔT < 15°C: Theo dõi.
    - Nếu 15°C <= ΔT < 30°C: Nghiêm trọng (Cần lập kế hoạch xử lý).
    - Nếu ΔT >= 30°C: Nguy cấp (Cần xử lý ngay).
    Hãy đưa ra kết luận cực ngắn gọn (dưới 15 từ), bắt đầu bằng phân loại (Bình thường/Theo dõi/Nghiêm trọng/Nguy cấp) và hướng xử lý nhanh.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    
    return response.text?.trim() || "Dữ liệu đo ổn định, tiếp tục theo dõi.";
  } catch (error: any) {
    console.error("Gemini Error:", error);
    // Nếu lỗi do Key không hợp lệ hoặc hết hạn
    if (error.message?.includes("API key not valid")) {
      return "Lỗi: API Key không hợp lệ. Vui lòng kiểm tra lại trên Google AI Studio.";
    }
    return "Kết quả: Cần kiểm tra thủ công theo quy trình ΔT (AI đang bận).";
  }
};
