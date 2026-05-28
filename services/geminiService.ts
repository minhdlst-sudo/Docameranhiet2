
import { GoogleGenAI } from "@google/genai";
import { DEVICE_SPECIFICATIONS, getThermalStatus } from "../types";

export const getThermalAnalysis = async (
  temp: number,
  refTemp: number,
  load: number,
  deviceName?: string,
  ambientTemp: number = 25
) => {
  // Lấy API Key từ biến môi trường (Vite yêu cầu tiền tố VITE_ để lộ ra client)
  const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY || (import.meta as any).env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error("GEMINI_API_KEY is missing");
    return "Lỗi: Chưa cấu hình API_KEY trên hosting. Hãy vào phần cài đặt Environment Variables để thêm biến VITE_GEMINI_API_KEY.";
  }

  // Khởi tạo AI trực tiếp theo hướng dẫn
  const ai = new GoogleGenAI({ apiKey: apiKey });
  
  // Tính toán thông số kỹ thuật dựa trên cấu hình tiêu chuẩn
  const diagnostic = getThermalStatus({
    measuredTemp: temp,
    referenceTemp: refTemp,
    ambientTemp: ambientTemp,
    deviceName: deviceName
  });

  const deltaT = diagnostic.deltaT;
  const spec = DEVICE_SPECIFICATIONS.find(s => s.name === deviceName);
  
  let deviceContext = "";
  if (spec) {
    deviceContext = `
Thiết bị đo: ${spec.name} (${spec.detail})
Phương pháp so sánh (Cột D): ${spec.compareDesc}
Quy định ngưỡng nhiệt (Cột C): ${spec.ruleDesc}
Đánh giá phân loại tự động: Mức "${diagnostic.level}" (Delta T tính được = ${deltaT.toFixed(1)}°C).
Mẫu kiến nghị tiêu chuẩn (Cột E): ${diagnostic.recommendation}
`;
  } else {
    deviceContext = `
Thiết bị đo: Chưa xác định rõ loại thiết bị.
Phương pháp so sánh: So sánh với pha lành cùng điều kiện tải (Nhiệt độ Tham chiếu).
Đánh giá phân loại tự động: Mức "${diagnostic.level}" (Delta T tính được = ${deltaT.toFixed(1)}°C).
Mẫu kiến nghị tiêu chuẩn: ${diagnostic.recommendation}
`;
  }

  const prompt = `Bạn là chuyên gia chẩn đoán nhiệt độ hồng ngoại thiết bị điện cao thế, trung thế của EVN.
Dưới đây là thông số đo thực tế và quy chuẩn đối chiếu:
- Thiết bị: ${deviceName || "Thiết bị điện"}
- Nhiệt độ đo được (T_đo): ${temp}°C
- Nhiệt độ tham chiếu (T_tc): ${refTemp}°C
- Nhiệt độ môi trường (T_mt): ${ambientTemp}°C
- Delta T thực tế: ${deltaT.toFixed(1)}°C
- Dòng phụ tải hiện tại: ${load}A
${deviceContext}

YÊU CẦU:
Hãy đưa ra một kết luận ngắn gọn, súc tích (dưới 50 từ) bằng tiếng Việt.
Đáp ứng đầu ra phải bắt đầu rõ ràng bằng một trong ba mức phân loại:
"[Bình thường]" HOẶC "[Theo dõi]" HOẶC "[Nguy cấp]".
Sau phân loại, hãy ghi cụ thể chẩn đoán lỗi kèm kiến nghị hành động ngắn gọn, bám sát mẫu kiến nghị tiêu chuẩn (Cột E) nhưng viết lưu loát, tự nhiên và chuyên nghiệp để kỹ sư hiện trường nắm bắt ngay lập tức.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });
    
    return response.text?.trim() || `[${diagnostic.level}] ${diagnostic.recommendation}`;
  } catch (error: any) {
    console.error("Gemini Error:", error);
    // Nếu lỗi, trả về kết quả tự động chính xác theo quy trình định nghĩa sẵn
    return `[${diagnostic.level}] ${diagnostic.recommendation} (Được đưa ra tự động theo Quy trình kỹ thuật)`;
  }
};

