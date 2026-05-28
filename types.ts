export interface ThermalData {
  unit: string;
  stationName: string;
  deviceLocation: string;
  feeder: string; // Xuất tuyến
  inspectionType: 'Định kỳ' | 'Đột xuất' | 'Kỹ thuật' | 'Sau xử lý'; // Loại kiểm tra
  phase: 'A' | 'B' | 'C' | 'ABC' | 'N';
  measuredTemp: number;
  referenceTemp: number;
  ambientTemp: number;
  currentLoad: number;
  thermalImage: string | null; // Base64
  normalImage: string | null;  // Base64
  conclusion: string;
  inspector: string;
  date: string;
  timestamp?: string; // Thời điểm cập nhật (Cột A)
  deviceName?: string; // Tên thiết bị (cột A, sheet Yeu cau)
  // Các trường bổ sung từ Google Sheet
  actionPlan?: string;
  processedDate?: string;
  postTemp?: number;
  postImage?: string; // Ảnh sau xử lý (Base64) - Cột X
}

export interface DeviceSpec {
  name: string; // Cột A
  detail: string; // Cột B
  compareType: 'reference' | 'ambient'; // Loại so sánh nhiệt độ so sánh (Cột D)
  compareDesc: string; // Ghi chú so sánh cột D
  ruleDesc: string; // Quy định cột C
  inspectionPeriod: string; // Chu kỳ kiểm tra định kỳ (Yêu cầu bổ sung)
  thresholds: {
    normalMax: number; 
    severeMin: number; 
    absoluteMax?: number; 
  };
  recommendations: {
    normal: string; // Kiến nghị Bình thường (Cột E)
    warning: string; // Kiến nghị Theo dõi (Khá, Trung bình) (Cột E)
    severe: string; // Kiến nghị Nguy cấp (Xấu) (Cột E)
  };
}

export const DEVICE_SPECIFICATIONS: DeviceSpec[] = [
  {
    name: "MBA PP",
    detail: "Máy biến áp phân phối (Cực đấu nối sứ xuyên trung/hạ áp, vỏ máy, bồn chứa dập tản nhiệt).",
    compareType: "ambient",
    compareDesc: "So sánh hiệu số giữa nhiệt độ điểm nóng nhất đo tại bệ/đầu cực sứ xuyên hoặc thân máy với nhiệt độ môi trường xung quanh (T_mt).",
    ruleDesc: "ΔT < 10°C: Tốt (tần suất chuẩn 03 tháng); 10°C < ΔT <= 20°C: Khá (tần suất 01 tháng); 20°C < ΔT <= 40°C: Trung bình (tần suất 2 tuần); ΔT > 40°C: Xấu (Tách khỏi vận hành để xử lý).",
    inspectionPeriod: "3 tháng/lần",
    thresholds: {
      normalMax: 10,
      severeMin: 40,
      absoluteMax: 40
    },
    recommendations: {
      normal: "Thiết bị hoạt động an toàn dưới tải bình thường. Duy trì chu kỳ kiểm tra định kỳ 3 tháng/lần.",
      warning: "Phát nhiệt mức Khá/Trung bình. Điều chỉnh tần suất kiểm tra thành 1 tháng/lần hoặc 2 tuần/lần, theo dõi đầu bushing và cánh tản nhiệt.",
      severe: "Kiểm tra nguyên nhân và tách khỏi vận hành để xử lý ngay: tiếp xúc kém tại đầu bushing trung áp và hạ áp, hệ thống tản nhiệt, van dầu, nghẽn dầu."
    }
  },
  {
    name: "RC 24-35kV",
    detail: "Thiết bị đóng cắt tự động Recloser trung thế 24kV, 35kV (Tiếp điểm đầu cực lèo cực và buồng dập).",
    compareType: "ambient",
    compareDesc: "So sánh hiệu số giữa nhiệt độ điểm nóng nhất đo tại kẹp cực hoặc buồng dập vỏ Recloser với nhiệt độ môi trường xung quanh (T_mt).",
    ruleDesc: "ΔT < 10°C: Tốt (tần suất chuẩn 03 tháng); 10°C < ΔT <= 20°C: Khá (tần suất 01 tháng); 20°C < ΔT <= 40°C: Trung bình (tần suất 2 tuần); ΔT > 40°C: Xấu (Sửa chữa ngay).",
    inspectionPeriod: "3 tháng/lần",
    thresholds: {
      normalMax: 10,
      severeMin: 40,
      absoluteMax: 40
    },
    recommendations: {
      normal: "Trạng thái tiếp tiếp xúc tốt, buồng dập ổn định. Duy trì bám sát chu kỳ đo định kỳ 3 tháng/lần.",
      warning: "Phát nhiệt mức Khá/Trung bình. Tăng tần suất đo kiểm tra hồng ngoại thành 1 tháng/lần hoặc 2 tuần/lần, lập kế hoạch kiểm tra sửa chữa.",
      severe: "Phát nhiệt mức Xấu. Sửa chữa ngay lập tức để tránh nổ buồng dập phá hủy toàn bộ thiết bị."
    }
  },
  {
    name: "LBS 24kV - 35kV",
    detail: "Thiết bị đóng cắt phụ tải Load Break Switch (LBS) trung thế 24kV, 35kV (Tiếp điểm đầu cực lèo cực).",
    compareType: "ambient",
    compareDesc: "So sánh hiệu số giữa nhiệt độ điểm nóng nhất đo tại tiếp điểm cực lèo hoặc hộp dập hồ quang LBS với nhiệt độ môi trường xung quanh (T_mt).",
    ruleDesc: "ΔT < 10°C: Tốt (tần suất chuẩn 03 tháng); 10°C < ΔT <= 20°C: Khá (tần suất 01 tháng); 20°C < ΔT <= 40°C: Trung bình (tần suất 2 tuần); ΔT > 40°C: Xấu (Sửa chữa ngay).",
    inspectionPeriod: "3 tháng/lần",
    thresholds: {
      normalMax: 10,
      severeMin: 40,
      absoluteMax: 40
    },
    recommendations: {
      normal: "Trạng thái tiếp xúc tốt. Duy trì bám sát chu kỳ đo định kỳ 3 tháng/lần.",
      warning: "Phát nhiệt mức Khá/Trung bình. Điều chỉnh tần suất kiểm tra thành 1 tháng/lần hoặc 2 tuần/lần, lên kế hoạch kiểm tra sửa chữa.",
      severe: "Phát nhiệt mức Xấu. Sửa chữa ngay lập tức để tránh phóng điện làm hỏng tiếp điểm."
    }
  },
  {
    name: "DCL-FCO-LBFCO",
    detail: "Dao cách ly (DCL), cầu chì tự rơi (FCO / LBFCO) trung thế ngoài trời hoặc khoang tủ.",
    compareType: "ambient",
    compareDesc: "So sánh chênh lệch giữa nhiệt độ móng vuốt tiếp điểm, lưỡi dao, ngàm kẹp hoặc đầu lèo phát nóng với nhiệt độ môi trường xung quanh (T_mt).",
    ruleDesc: "ΔT < 10°C: Tốt (tần suất chuẩn 03 tháng); 10°C < ΔT <= 20°C: Khá (tần suất 01 tháng); 20°C < ΔT <= 40°C: Trung bình (tần suất 2 tuần); ΔT > 40°C: Xấu (Sửa chữa ngay).",
    inspectionPeriod: "3 tháng/lần",
    thresholds: {
      normalMax: 10,
      severeMin: 40,
      absoluteMax: 40
    },
    recommendations: {
      normal: "Ngàm tiếp xúc khít chắc chắn, lưỡi hèo bám sập chuẩn trục. Duy trì đo định kỳ 3 tháng/lần.",
      warning: "Phát nhiệt mức Khá/Trung bình. Điều chỉnh tần suất kiểm tra thành 1 tháng/lần hoặc 2 tuần/lần, lên kế hoạch siết lực hoặc châm mỡ tiếp điểm.",
      severe: "Ngàm tiếp điểm hốc rỗ, tiếp xúc kém phát nhiệt mức Xấu. Sửa chữa ngay lập tức để tránh sự cố rụng chì mất pha."
    }
  },
  {
    name: "CSV",
    detail: "Chống sét van trung áp và hạ áp bảo vệ lưới và trạm biến áp.",
    compareType: "ambient",
    compareDesc: "So sánh trực tiếp chênh lệch giữa nhiệt độ bọc silicon/gốm của van chống sét với nhiệt độ môi trường xung quanh (T_mt).",
    ruleDesc: "ΔT < 3°C: Tốt (tần suất chuẩn 03 tháng); 3°C < ΔT <= 6°C: Khá (tần suất 1 tháng); 6°C < ΔT <= 10°C: Trung bình (tần suất 2 tuần); ΔT > 10°C: Xấu (Cắt điện, thay thế).",
    inspectionPeriod: "3 tháng/lần",
    thresholds: {
      normalMax: 3,
      severeMin: 10,
      absoluteMax: 10
    },
    recommendations: {
      normal: "Cách điện hoàn hảo dòng rò bằng không. Duy trì đo kiểm định kỳ 3 tháng/lần.",
      warning: "Van có dấu hiệu thoái hóa nhẹ/thoái hóa nhanh. Điều chỉnh tần suất kiểm tra thành 1 tháng/lần hoặc 2 tuần/lần, chuẩn bị kế hoạch tách khỏi vận hành để thẩm tra và thay mới.",
      severe: "Phát nhiệt van mức Xấu. Lập tức cắt điện, tách khỏi vận hành và có kế hoạch thay thế CSV ngay lập tức."
    }
  },
  {
    name: "Tụ bù trung hạ áp",
    detail: "Hệ thống tụ bù công suất phản kháng cấp trung áp và hạ áp (Bao gồm đầu kẹp nối và vỏ bình tụ).",
    compareType: "ambient",
    compareDesc: "So sánh hiệu số nhiệt độ giữa điểm nóng nhất vỏ kim loại bình tụ hoặc đầu cực nối tụ với nhiệt độ môi trường xung quanh (T_mt).",
    ruleDesc: "ΔT < 10°C: Tốt (tần suất chuẩn 03 tháng); 10°C < ΔT <= 20°C: Khá (tần suất 01 tháng); 20°C < ΔT <= 40°C: Trung bình (tần suất 2 tuần); ΔT > 40°C: Xấu (Sửa chữa ngay).",
    inspectionPeriod: "3 tháng/lần",
    thresholds: {
      normalMax: 10,
      severeMin: 40,
      absoluteMax: 40
    },
    recommendations: {
      normal: "Bình tụ cách điện tốt điện áp tải ổn định phẳng. Đo nhiệt soát định kỳ 3 tháng/lần.",
      warning: "Phát nhiệt mức Khá/Trung bình. Điều chỉnh tần suất kiểm tra thành 1 tháng/lần hoặc 2 tuần/lần, kiểm soát dòng sóng hài và siết lực thanh cái đồng.",
      severe: "Bình tụ sinh nhiệt mức Xấu nguy hiểm. Khẩn trương sửa chữa ngay lập tức để tránh phồng nổ bứt tụ."
    }
  },
  {
    name: "TU-TI-MOF",
    detail: "Biến điện áp (TU), Biến dòng điện (TI), Thiết bị đo đếm đa năng tích hợp MOF.",
    compareType: "ambient",
    compareDesc: "So sánh hiệu số giữa nhiệt độ điểm nóng nhất vỏ thiết bị hoặc chân đế kẹp cực đấu nối với nhiệt độ môi trường xung quanh (T_mt).",
    ruleDesc: "ΔT < 10°C: Tốt (tần suất chuẩn 03 tháng); 10°C < ΔT <= 20°C: Khá (tần suất 01 tháng); 20°C < ΔT <= 40°C: Trung bình (tần suất 2 tuần); ΔT > 40°C: Xấu (Sửa chữa ngay).",
    inspectionPeriod: "3 tháng/lần",
    thresholds: {
      normalMax: 10,
      severeMin: 40,
      absoluteMax: 40
    },
    recommendations: {
      normal: "Cuộn dây cách điện tốt nối mạch thứ cấp thông suốt. Đo nhiệt định kỳ 3 tháng/lần.",
      warning: "Phát nhiệt mức Khá/Trung bình. Điều chỉnh tần suất kiểm tra thành 1 tháng/lần hoặc 2 tuần/lần, lên kế hoạch kiểm tra và sửa chữa.",
      severe: "Cách điện hư hại sâu phát nhiệt mức Xấu. Sửa chữa ngay lập tức, tiến hành cô lập để thẩm tra và đo đạc lại."
    }
  },
  {
    name: "Cáp ngầm trung áp",
    detail: "Hộp và đầu nối cáp ngầm cách điện nhựa XLPE trong các tủ phân phối RMU hoặc lắp ngoài cột điện.",
    compareType: "reference",
    compareDesc: "So sánh nhiệt độ kẹp của gốc phễu đầu cáp nóng với hai pha bên cạnh cùng đường tải (T_tc).",
    ruleDesc: "ΔT < 5°C: Tốt (tần suất chuẩn 03 tháng); 5°C < ΔT <= 10°C: Khá (tần suất 01 tháng); 10°C < ΔT <= 15°C: Trung bình (tần suất 2 tuần); ΔT > 15°C: Xấu (Tách vận hành cáp, thử nghiệm các hạng mục Tier 2).",
    inspectionPeriod: "3 tháng/lần",
    thresholds: {
      normalMax: 5,
      severeMin: 15,
      absoluteMax: 15
    },
    recommendations: {
      normal: "Đầu phễu luồn cáp cách điện vỏ kín khô ráo sạch sẽ. Thực hiện đo nhiệt theo định kỳ 3 tháng/lần.",
      warning: "Phát nhiệt mức Khá/Trung bình. Tăng tần suất đo kiểm thành 1 tháng/lần hoặc 2 tuần/lần, đo thêm phóng điện cục bộ (PD).",
      severe: "Phát nhiệt vỏ dải cáp mức Xấu hiểm nghèo. Tách khỏi vận hành cáp ngay lập tức và thực hiện thử nghiệm các hạng mục nâng cấp Tier 2."
    }
  },
  {
    name: "Mối nối",
    detail: "Các mấu mối nối lèo tiếp xúc dây dẫn, kẹp cực thiết bị và kẹp ép rẽ nhánh trung hạ thế toàn lưới.",
    compareType: "reference",
    compareDesc: "So sánh nhiệt độ điểm ghép lèo phát nhiệt với đoạn dây chuẩn kề bên nằm ngoài mối nối có tải tương tự (T_tc).",
    ruleDesc: "ΔT <= 15°C: Tốt (tần suất chuẩn 03 tháng); ΔT > 15°C: Theo dõi (tần suất 01 tháng); T_đo > 75°C: Xấu (Cần xử lý ngay).",
    inspectionPeriod: "3 tháng/lần",
    thresholds: {
      normalMax: 15,
      severeMin: 15,
      absoluteMax: 75
    },
    recommendations: {
      normal: "Bề mặt truyền điện bóng khít không bám sỉ, lồng lực tốt. Duy trì chu kỳ kiểm tra 3 tháng/lần.",
      warning: "Phát nhiệt mức Theo dõi. Điều chỉnh tần suất kiểm tra thành 1 tháng/lần, bôi keo tiếp xúc và siết lực kẹp cực.",
      severe: "Phát nhiệt mức Xấu nguy cấp (nhiệt đo vượt quá 75°C). Cần xử lý siết chặt làm mịn tiếp xúc hoặc ép mới mối nối lèo ngay lập tức."
    }
  }
];

export interface AppConfig {
  gasUrl: string; // Google Apps Script URL
  accessCode: string; // Simple access control
}

export enum ViewState {
  LOGIN,
  FORM,
  SUCCESS,
  FEEDER_MANAGER,
  DATA_VIEWER,
  DASHBOARD,
  ACTION_PLAN_EDITOR
}

export const getThermalStatus = (item: Partial<ThermalData>): {
  deltaT: number;
  level: 'Bình thường' | 'Theo dõi' | 'Nguy cấp';
  compareDesc: string;
  ruleDesc: string;
  recommendation: string;
  subLevel: 'Tốt' | 'Khá' | 'Trung bình' | 'Xấu' | 'Theo dõi';
  frequency: string;
} => {
  const measured = Number(item.measuredTemp) ?? 0;
  const reference = Number(item.referenceTemp) ?? 0;
  const ambient = Number(item.ambientTemp) ?? 0;

  // Tìm đặc tả cấu hình thiết bị
  const spec = DEVICE_SPECIFICATIONS.find(s => s.name === item.deviceName);

  if (spec) {
    const deltaT = spec.compareType === 'ambient' ? (measured - ambient) : (measured - reference);
    let level: 'Bình thường' | 'Theo dõi' | 'Nguy cấp' = 'Bình thường';
    let subLevel: 'Tốt' | 'Khá' | 'Trung bình' | 'Xấu' | 'Theo dõi' = 'Tốt';
    let frequency = '03 tháng/lần';
    let recommendation = spec.recommendations.normal;

    if (spec.name === "MBA PP") {
      if (deltaT <= 10) {
        level = 'Bình thường';
        subLevel = 'Tốt';
        frequency = '03 tháng/lần';
        recommendation = spec.recommendations.normal;
      } else if (deltaT <= 20) {
        level = 'Theo dõi';
        subLevel = 'Khá';
        frequency = '01 tháng/lần';
        recommendation = spec.recommendations.warning;
      } else if (deltaT <= 40) {
        level = 'Theo dõi';
        subLevel = 'Trung bình';
        frequency = '2 tuần/lần';
        recommendation = spec.recommendations.warning;
      } else {
        level = 'Nguy cấp';
        subLevel = 'Xấu';
        frequency = 'Tách vận hành để xử lý';
        recommendation = spec.recommendations.severe;
      }
    } 
    else if (
      spec.name === "RC 24-35kV" || 
      spec.name === "LBS 24kV - 35kV" || 
      spec.name === "DCL-FCO-LBFCO" || 
      spec.name === "Tụ bù trung hạ áp" || 
      spec.name === "TU-TI-MOF"
    ) {
      if (deltaT <= 10) {
        level = 'Bình thường';
        subLevel = 'Tốt';
        frequency = '03 tháng/lần';
        recommendation = spec.recommendations.normal;
      } else if (deltaT <= 20) {
        level = 'Theo dõi';
        subLevel = 'Khá';
        frequency = '01 tháng/lần';
        recommendation = spec.recommendations.warning;
      } else if (deltaT <= 40) {
        level = 'Theo dõi';
        subLevel = 'Trung bình';
        frequency = '2 tuần/lần';
        recommendation = spec.recommendations.warning;
      } else {
        level = 'Nguy cấp';
        subLevel = 'Xấu';
        frequency = 'Sửa chữa ngay';
        recommendation = spec.recommendations.severe;
      }
    } 
    else if (spec.name === "CSV") {
      if (deltaT <= 3) {
        level = 'Bình thường';
        subLevel = 'Tốt';
        frequency = '03 tháng/lần';
        recommendation = spec.recommendations.normal;
      } else if (deltaT <= 6) {
        level = 'Theo dõi';
        subLevel = 'Khá';
        frequency = '01 tháng/lần';
        recommendation = spec.recommendations.warning;
      } else if (deltaT <= 10) {
        level = 'Theo dõi';
        subLevel = 'Trung bình';
        frequency = '2 tuần/lần';
        recommendation = spec.recommendations.warning;
      } else {
        level = 'Nguy cấp';
        subLevel = 'Xấu';
        frequency = 'Lập tức cắt điện, tách khỏi vận hành và có kế hoạch thay thế';
        recommendation = spec.recommendations.severe;
      }
    } 
    else if (spec.name === "Cáp ngầm trung áp") {
      if (deltaT <= 5) {
        level = 'Bình thường';
        subLevel = 'Tốt';
        frequency = '03 tháng/lần';
        recommendation = spec.recommendations.normal;
      } else if (deltaT <= 10) {
        level = 'Theo dõi';
        subLevel = 'Khá';
        frequency = '01 tháng/lần';
        recommendation = spec.recommendations.warning;
      } else if (deltaT <= 15) {
        level = 'Theo dõi';
        subLevel = 'Trung bình';
        frequency = '2 tuần/lần';
        recommendation = spec.recommendations.warning;
      } else {
        level = 'Nguy cấp';
        subLevel = 'Xấu';
        frequency = 'Tách vận hành cáp, thử nghiệm các hạng mục Tier 2';
        recommendation = spec.recommendations.severe;
      }
    } 
    else if (spec.name === "Mối nối") {
      if (measured > 75) {
        level = 'Nguy cấp';
        subLevel = 'Xấu';
        frequency = 'Xử lý ngay';
        recommendation = spec.recommendations.severe;
      } else if (deltaT > 15) {
        level = 'Theo dõi';
        subLevel = 'Theo dõi';
        frequency = '01 tháng/lần';
        recommendation = spec.recommendations.warning;
      } else {
        level = 'Bình thường';
        subLevel = 'Tốt';
        frequency = '03 tháng/lần';
        recommendation = spec.recommendations.normal;
      }
    }

    const dynamicRuleDesc = `${spec.ruleDesc} (Hiện tại: Mức ${subLevel} -> Tần suất kiểm tra: ${frequency})`;

    return {
      deltaT,
      level,
      compareDesc: spec.compareDesc,
      ruleDesc: dynamicRuleDesc,
      recommendation,
      subLevel,
      frequency
    };
  }

  // Fallback
  const deltaT = measured - reference;
  let level: 'Bình thường' | 'Theo dõi' | 'Nguy cấp' = 'Bình thường';
  if (measured > 75) {
    level = 'Nguy cấp';
  } else if (deltaT > 15) {
    level = 'Theo dõi';
  }

  return {
    deltaT,
    level,
    compareDesc: "So sánh trực tiếp chênh lệch giữa pha nóng nhất và pha lành bên cạnh cùng điều kiện tải.",
    ruleDesc: "Quy chuẩn thông thường: ΔT < 15°C: Bình thường; ΔT > 15°C: Theo dõi; T_đo > 75°C: Nguy cấp. (Chu kỳ đo định kỳ: 3 tháng/lần)",
    recommendation: level === 'Nguy cấp' 
      ? "Thiết bị nguy cấp. Kiến nghị tách lèo xử lý lỏng hoặc giảm tải khẩn cấp."
      : level === 'Theo dõi' 
        ? "Thiết bị nằm trong diện theo dõi sát sao. Vệ sinh siết chuẩn lực kẹp cực."
        : "Thiết bị hoạt động an toàn. Tiếp tục chu kỳ theo dõi định kỳ.",
    subLevel: level === 'Nguy cấp' ? 'Xấu' : level === 'Theo dõi' ? 'Theo dõi' : 'Tốt',
    frequency: level === 'Nguy cấp' ? 'Xử lý ngay' : level === 'Theo dõi' ? '01 tháng/lần' : '03 tháng/lần'
  };
};
