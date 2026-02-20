
import { GoogleGenAI } from "@google/genai";

export const getThermalAnalysis = async (temp: number, refTemp: number, load: number) => {
  // Lấy API Key từ biến môi trường (được Netlify hoặc môi trường build inject vào)
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    console.error("API_KEY is missing in process.env");
    return "Lỗi: Chưa cấu hình API_KEY trên hosting (Netlify). Hãy vào Site Settings > Environment variables để thêm.";
  }

  // Khởi tạo AI trực tiếp theo hướng dẫn
  const ai = new GoogleGenAI({ apiKey: apiKey });
  const deltaT = temp - refTemp;
  
  const prompt = `Bạn là chuyên gia chẩn đoán nhiệt thiết bị điện của EVN. 
    Dữ liệu đo: t1=${temp}°C (thiết bị), t2=${refTemp}°C (tham chiếu), ΔT=${deltaT.toFixed(1)}°C, phụ tải=${load}A.
    Dựa trên quy trình kỹ thuật:
    - Nếu ΔT < 5°C: Bình thường.
    - Nếu 5°C <= ΔT < 15°C: Theo dõi (Chớm phát nóng).
    - Nếu 15°C <= ΔT < 35°C: Nguy hiểm (Phát nóng rõ rệt).
    - Nếu ΔT >= 35°C: Đặc biệt nguy hiểm.
    Hãy đưa ra kết luận cực ngắn gọn (dưới 15 từ) và hướng xử lý nhanh.`;

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
