
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
  // Các trường bổ sung từ Google Sheet
  actionPlan?: string;
  processedDate?: string;
  postTemp?: number;
}

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
