
export interface ThermalData {
  unit: string;
  stationName: string;
  deviceLocation: string;
  feeder: string; // Xuất tuyến
  inspectionType: 'Định kỳ' | 'Đột xuất' | 'Kỹ thuật'; // Loại kiểm tra
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
}

export interface AppConfig {
  gasUrl: string; // Google Apps Script URL
  accessCode: string; // Simple access control
}

export enum ViewState {
  LOGIN,
  FORM,
  SUCCESS
}
