
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, LabelList
} from 'recharts';
import * as XLSX from 'xlsx';
import { ThermalData, getThermalStatus, DEVICE_SPECIFICATIONS } from '../types';
import { fetchThermalData } from '../services/gasService';
import { BarChart3, PieChart as PieChartIcon, ArrowLeft, RefreshCw, Calendar, ClipboardList, CheckCircle2, AlertTriangle, Building2, ChevronDown, AlertCircle, Download } from 'lucide-react';
import { UNIT_FEEDERS } from '../constants';

interface DashboardProps {
  gasUrl: string;
  currentUnit: string;
  onBack: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ gasUrl, currentUnit, onBack }) => {
  const [allData, setAllData] = useState<ThermalData[]>([]);
  const [selectedStatUnit, setSelectedStatUnit] = useState<string>(currentUnit);
  const [selectedMonth, setSelectedMonth] = useState<number>(0); // 0 for All Months
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const units = useMemo(() => {
    return ['Toàn Công ty', ...Object.keys(UNIT_FEEDERS)];
  }, []);

  const years = [2026, 2027, 2028];

  const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await fetchThermalData(gasUrl);
      // Lọc bỏ các dòng trống hoặc dữ liệu rác
      const validData = results.filter(item => 
        item.stationName && 
        item.stationName.trim() !== "" && 
        item.date && 
        !item.date.includes('drive.google.com')
      );
      setAllData(validData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, [gasUrl]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Dữ liệu lọc theo Tháng/Năm
  const timeFilteredData = useMemo(() => {
    return allData.filter(item => {
      const date = new Date(item.date);
      const yearMatch = date.getFullYear() === selectedYear;
      const monthMatch = selectedMonth === 0 || date.getMonth() + 1 === selectedMonth;
      return yearMatch && monthMatch;
    });
  }, [allData, selectedMonth, selectedYear]);

  // Dữ liệu hiển thị dựa trên đơn vị và thời gian
  const data = useMemo(() => {
    if (selectedStatUnit === 'Toàn Công ty') {
      return timeFilteredData;
    }
    return timeFilteredData.filter(item => item.unit === selectedStatUnit);
  }, [timeFilteredData, selectedStatUnit]);

  // Bảng tổng hợp theo đơn vị
  const unitSummaryDataTable = useMemo(() => {
    const tableData: any[] = [];
    const actualUnits = Object.keys(UNIT_FEEDERS);

    let companyTotal = 0;
    let companyDefects = 0;
    let companyPlanned = 0;
    let companyProcessed = 0;

    actualUnits.forEach(unit => {
      const unitData = timeFilteredData.filter(item => item.unit === unit);
      let defects = 0;
      let planned = 0;
      let processed = 0;

      unitData.forEach(item => {
        const status = getThermalStatus(item);
        const isDefect = status.level === 'Theo dõi' || status.level === 'Nguy cấp';
        
        if (isDefect) {
          defects++;
          if (item.actionPlan && item.actionPlan.trim() !== "") {
            planned++;
          }
          if (item.processedDate && item.processedDate.trim() !== "") {
            processed++;
          }
        }
      });

      companyTotal += unitData.length;
      companyDefects += defects;
      companyPlanned += planned;
      companyProcessed += processed;

      tableData.push({
        unit,
        total: unitData.length,
        defects,
        planned,
        processed
      });
    });

    const sortedData = tableData.sort((a, b) => b.total - a.total);
    
    // Thêm dòng tổng vào vị trí đầu tiên
    return [
      {
        unit: 'Toàn Công ty',
        total: companyTotal,
        defects: companyDefects,
        planned: companyPlanned,
        processed: companyProcessed,
        isTotal: true
      },
      ...sortedData
    ];
  }, [timeFilteredData]);

  // Hàm định dạng ngày tháng tiếng Việt
  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '';
    
    // 1. Thử parse DD/MM/YYYY (Ưu tiên định dạng VN/GG Sheets)
    const parts = String(dateStr).split('/');
    if (parts.length === 3) {
      const d = parseInt(parts[0]);
      const m = parseInt(parts[1]) - 1;
      const y = parseInt(parts[2]);
      const newDate = new Date(y, m, d);
      if (!isNaN(newDate.getTime())) return newDate.toLocaleDateString('vi-VN');
    }

    // 2. Sử dụng Date object để parse các định dạng khác
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return dateStr;
    }
    // Trả về định dạng ngày ĐỊA PHƯƠNG để tránh lệch múi giờ
    return date.toLocaleDateString('vi-VN');
  };

  const getDirectImageUrl = (url: string | null, size: number = 300) => {
    if (!url) return '';
    const cleanUrl = url.trim();
    if (cleanUrl.startsWith('data:')) return cleanUrl;
    
    // Xử lý link Google Drive
    if (cleanUrl.includes('drive.google.com') || /^[-\w]{25,}$/.test(cleanUrl)) {
      const idMatch = cleanUrl.match(/\/d\/([-\w]{20,})/) || 
                      cleanUrl.match(/[?&]id=([-\w]{20,})/) ||
                      cleanUrl.match(/\/file\/d\/([-\w]{20,})/) ||
                      [/^[-\w]{25,}$/.test(cleanUrl) ? {1: cleanUrl} : null][0];
      const id = idMatch ? idMatch[1] : null;
      if (id) {
        return `https://drive.google.com/thumbnail?id=${id}&sz=s${size}`;
      }
    }
    return cleanUrl;
  };

  const getWarningLevel = (item: ThermalData) => {
    return getThermalStatus(item).level;
  };

  // Dữ liệu cho biểu đồ cột (Theo tháng trong năm được chọn)
  const monthlyData = useMemo(() => {
    const monthsNames = [
      'Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 
      'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12'
    ];
    
    const counts = new Array(12).fill(0);
    
    // Đếm tất cả dữ liệu của đơn vị đã chọn trong năm đã chọn
    const unitFilteredData = selectedStatUnit === 'Toàn Công ty' 
      ? allData 
      : allData.filter(item => item.unit === selectedStatUnit);

    unitFilteredData.forEach(item => {
      const date = new Date(item.date);
      if (date.getFullYear() === selectedYear) {
        counts[date.getMonth()]++;
      }
    });

    return monthsNames.map((name, index) => ({
      name,
      count: isNaN(counts[index]) ? 0 : counts[index],
      isCurrent: index + 1 === selectedMonth
    }));
  }, [allData, selectedYear, selectedStatUnit, selectedMonth]);

  // Dữ liệu cho biểu đồ tròn (Mức độ cảnh báo)
  const warningData = useMemo(() => {
    const stats = {
      'Bình thường': 0,
      'Theo dõi': 0,
      'Nguy cấp': 0
    };

    data.forEach(item => {
      const level = getWarningLevel(item);
      stats[level as keyof typeof stats]++;
    });

    return [
      { name: 'Bình thường', value: stats['Bình thường'] || 0, color: '#10b981' },
      { name: 'Theo dõi', value: stats['Theo dõi'] || 0, color: '#f59e0b' },
      { name: 'Nguy cấp', value: stats['Nguy cấp'] || 0, color: '#ef4444' }
    ].filter(item => item.value > 0 && !isNaN(item.value));
  }, [data]);

  const totalCount = data.length;

  // Dữ liệu cho biểu đồ xử lý khiếm khuyết
  const defectStatsData = useMemo(() => {
    let defects = 0;
    let planned = 0;
    let processed = 0;

    data.forEach(item => {
      const status = getThermalStatus(item);
      const isDefect = status.level === 'Theo dõi' || status.level === 'Nguy cấp';
      if (isDefect) {
        defects++;
        if (item.actionPlan && item.actionPlan.trim() !== "") {
          planned++;
        }
        if (item.processedDate && item.processedDate.trim() !== "") {
          processed++;
        }
      }
    });

    return [
      { name: 'Khiếm khuyết', value: defects, color: '#ef4444', icon: <AlertTriangle className="w-3 h-3" /> },
      { name: 'Đã lập KH', value: planned, color: '#f59e0b', icon: <ClipboardList className="w-3 h-3" /> },
      { name: 'Đã xử lý', value: processed, color: '#10b981', icon: <CheckCircle2 className="w-3 h-3" /> }
    ];
  }, [data]);

  const defectiveLocations = useMemo(() => {
    return data.filter(item => {
      const status = getThermalStatus(item);
      return status.level === 'Theo dõi' || status.level === 'Nguy cấp';
    }).sort((a, b) => {
      // Sắp xếp: Nguy cấp trước, Theo dõi sau, rồi đến ngày mới nhất
      const levelA = getWarningLevel(a);
      const levelB = getWarningLevel(b);
      
      if (levelA === 'Nguy cấp' && levelB !== 'Nguy cấp') return -1;
      if (levelA !== 'Nguy cấp' && levelB === 'Nguy cấp') return 1;
      
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [data]);

  const exportToExcel = () => {
    if (defectiveLocations.length === 0) {
      alert('Không có dữ liệu khiếm khuyết để xuất!');
      return;
    }

    const exportData = defectiveLocations.map((item, index) => {
      const level = getWarningLevel(item);
      const status = getThermalStatus(item);
      return {
        'STT': index + 1,
        'Đơn vị': item.unit,
        'Trạm/Nhánh': item.stationName,
        'Thiết bị': item.deviceName || '',
        'Xuất tuyến': item.feeder,
        'Vị trí': item.deviceLocation,
        'Pha': item.phase,
        'Nhiệt độ đo (°C)': item.measuredTemp,
        'Nhiệt độ TC (°C)': item.referenceTemp ?? '',
        'Chênh lệch ΔT (°C)': status.deltaT.toFixed(1),
        'Mức độ': level,
        'Ngày đo': formatDate(item.date),
        'Kế hoạch xử lý': item.actionPlan || '',
        'Ngày đã xử lý': item.processedDate ? formatDate(item.processedDate) : '',
        'Nhiệt độ sau xử lý (°C)': item.postTemp || ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Khiem khuyet");

    // Đặt độ rộng cột
    const wscols = [
      { wch: 5 },  // STT
      { wch: 15 }, // Đơn vị
      { wch: 25 }, // Trạm/Nhánh
      { wch: 25 }, // Thiết bị
      { wch: 20 }, // Xuất tuyến
      { wch: 20 }, // Vị trí
      { wch: 10 }, // Pha
      { wch: 18 }, // Nhiệt độ đo
      { wch: 18 }, // Nhiệt độ TC
      { wch: 18 }, // Chênh lệch
      { wch: 15 }, // Mức độ
      { wch: 15 }, // Ngày đo
      { wch: 30 }, // Kế hoạch xử lý
      { wch: 15 }, // Ngày đã xử lý
      { wch: 18 }  // Nhiệt độ sau xử lý
    ];
    worksheet['!cols'] = wscols;

    const fileName = `Danh_sach_khiem_khuyet_${selectedStatUnit.replace(/\s+/g, '_')}_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const exportSummaryToExcel = () => {
    if (unitSummaryDataTable.length === 0) {
      alert('Không có dữ liệu tổng hợp để xuất!');
      return;
    }

    const exportData = unitSummaryDataTable.map((row) => ({
      'Đơn vị': row.unit,
      'Tổng vị trí đo': row.total,
      'Số lượng khiếm khuyết': row.defects,
      'Đã lập kế hoạch': row.planned,
      'Đã xử lý': row.processed,
      'Tỷ lệ đã xử lý (%)': row.defects > 0 ? ((row.processed / row.defects) * 100).toFixed(1) : '100'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tong hop don vi");

    // Đặt độ rộng cột
    const wscols = [
      { wch: 25 }, // Đơn vị
      { wch: 15 }, // Tổng vị trí
      { wch: 20 }, // Khiếm khuyết
      { wch: 18 }, // Đã lập KH
      { wch: 15 }, // Đã xử lý
      { wch: 20 }  // Tỷ lệ
    ];
    worksheet['!cols'] = wscols;

    const fileName = `Tong_hop_don_vi_${selectedMonth === 0 ? 'Ca_nam' : `Thang_${selectedMonth}`}_${selectedYear}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="bg-white p-4 sm:p-6 rounded-3xl shadow-xl border border-slate-100 animate-fadeIn space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="p-1.5 sm:p-2 bg-blue-50 rounded-xl flex-shrink-0">
            <BarChart3 className="w-4 h-4 sm:w-5 h-5 text-blue-600" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-lg font-black text-slate-800 truncate">Thống kê dữ liệu</h2>
            <div className="flex flex-wrap gap-2 mt-1">
              <div className="relative group">
                <select 
                  value={selectedStatUnit}
                  onChange={(e) => setSelectedStatUnit(e.target.value)}
                  className="appearance-none bg-slate-100 border-none rounded-lg py-1 pl-7 pr-8 text-[10px] font-bold text-slate-600 uppercase tracking-tight cursor-pointer focus:ring-2 focus:ring-blue-500 transition-all outline-none w-full sm:w-auto"
                >
                  {units.map(unit => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
                <Building2 className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <div className="relative group">
                <select 
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="appearance-none bg-blue-50 border-none rounded-lg py-1 pl-7 pr-8 text-[10px] font-bold text-blue-600 uppercase tracking-tight cursor-pointer focus:ring-2 focus:ring-blue-500 transition-all outline-none w-full sm:w-auto"
                >
                  <option value={0}>Tất cả các tháng</option>
                  {months.map(m => (
                    <option key={m} value={m}>Tháng {m}</option>
                  ))}
                </select>
                <Calendar className="w-3 h-3 text-blue-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                <ChevronDown className="w-3 h-3 text-blue-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <div className="relative group">
                <select 
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="appearance-none bg-blue-50 border-none rounded-lg py-1 pl-2 pr-7 text-[10px] font-bold text-blue-600 uppercase tracking-tight cursor-pointer focus:ring-2 focus:ring-blue-500 transition-all outline-none w-full sm:w-auto"
                >
                  {years.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-blue-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-1 sm:gap-2 flex-shrink-0">
          <button 
            onClick={loadData}
            disabled={loading}
            className="p-1.5 sm:p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 sm:w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={onBack} 
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider hover:bg-blue-100 transition-all"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Quay lại</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-100 border-b-blue-600"></div>
          <div className="text-center">
            <p className="text-slate-600 text-sm font-bold uppercase tracking-widest">Đang tổng hợp dữ liệu...</p>
            <p className="text-[10px] text-slate-400 mt-1">Hệ thống đang tải dữ liệu từ Google Sheets</p>
          </div>
        </div>
      ) : error ? (
        <div className="py-12 text-center bg-rose-50 rounded-2xl border border-rose-100">
          <p className="text-rose-600 font-bold">{error}</p>
          <button onClick={loadData} className="mt-4 text-xs font-black text-rose-700 uppercase underline">Thử lại</button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Tổng quan */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Tổng lượt đo</p>
              <p className="text-xl font-black text-slate-800">{totalCount}</p>
            </div>
            <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100">
              <p className="text-[9px] font-black text-rose-400 uppercase mb-1">Khiếm khuyết</p>
              <p className="text-xl font-black text-rose-600">{defectStatsData[0].value}</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
              <p className="text-[9px] font-black text-emerald-400 uppercase mb-1">Đã xử lý</p>
              <p className="text-xl font-black text-emerald-600">{defectStatsData[2].value}</p>
            </div>
          </div>

          {/* Bảng tổng hợp theo đơn vị */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-400" />
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">
                  Tổng hợp theo đơn vị ({selectedMonth === 0 ? `Năm ${selectedYear}` : `Tháng ${selectedMonth}/${selectedYear}`})
                </h3>
              </div>
              {unitSummaryDataTable.length > 0 && (
                <button 
                  onClick={exportSummaryToExcel}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-blue-100 transition-all shadow-sm active:scale-95"
                >
                  <Download className="w-3 h-3" />
                  <span>Xuất Excel</span>
                </button>
              )}
            </div>
            <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm">
              <table className="w-full text-left border-collapse bg-white">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Đơn vị</th>
                    <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">Tổng vị trí</th>
                    <th className="p-3 text-[10px] font-black text-rose-400 uppercase tracking-widest border-b border-slate-100 text-center">Khiếm khuyết</th>
                    <th className="p-3 text-[10px] font-black text-amber-400 uppercase tracking-widest border-b border-slate-100 text-center">Đã lập KH</th>
                    <th className="p-3 text-[10px] font-black text-emerald-400 uppercase tracking-widest border-b border-slate-100 text-center">Đã xử lý</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {unitSummaryDataTable.map((row, idx) => (
                    <tr 
                      key={idx} 
                      className={`hover:bg-slate-50 transition-colors ${row.isTotal ? 'bg-blue-50/50 font-black' : ''}`}
                    >
                      <td className={`p-3 text-[11px] ${row.isTotal ? 'text-blue-700' : 'font-bold text-slate-700'}`}>
                        {row.unit}
                      </td>
                      <td className="p-3 text-[11px] font-black text-slate-800 text-center">{row.total}</td>
                      <td className="p-3 text-[11px] font-black text-rose-600 text-center">{row.defects}</td>
                      <td className="p-3 text-[11px] font-black text-amber-600 text-center">{row.planned}</td>
                      <td className="p-3 text-[11px] font-black text-emerald-600 text-center">{row.processed}</td>
                    </tr>
                  ))}
                  {unitSummaryDataTable.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-[10px] font-bold text-slate-400 italic">
                        Không có dữ liệu trong tháng này
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Biểu đồ tiến độ xử lý khiếm khuyết */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-slate-400" />
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">Tiến độ xử lý khiếm khuyết</h3>
            </div>
            <div className="h-48 w-full bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={defectStatsData} margin={{ left: 20, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }}
                    width={80}
                  />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                    {defectStatsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                    <LabelList dataKey="value" position="right" style={{ fontSize: 12, fontWeight: 900, fill: '#1e293b' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Biểu đồ cột */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">Số lượng đo theo tháng</h3>
            </div>
            <div className="h-64 w-full bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {monthlyData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.isCurrent ? '#2563eb' : '#93c5fd'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Biểu đồ tròn */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-slate-400" />
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">Phân bố mức độ cảnh báo</h3>
            </div>
            <div className="h-72 w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={warningData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value, percent }) => `${value} (${((percent || 0) * 100).toFixed(0)}%)`}
                  >
                    {warningData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    align="center"
                    iconType="circle"
                    formatter={(value, entry: any) => (
                      <span className="text-[10px] font-bold text-slate-600 uppercase">
                        {value}: {entry.payload?.value || 0}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Danh sách vị trí khiếm khuyết */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500" />
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Danh sách vị trí khiếm khuyết ({defectiveLocations.length})</h3>
              </div>
              {defectiveLocations.length > 0 && (
                <button 
                  onClick={exportToExcel}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-emerald-100 transition-all shadow-sm active:scale-95"
                >
                  <Download className="w-3 h-3" />
                  <span>Xuất Excel</span>
                </button>
              )}
            </div>

            {defectiveLocations.length === 0 ? (
              <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-slate-400 text-[10px] italic">Không có vị trí khiếm khuyết nào.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {defectiveLocations.map((item, idx) => {
                  const level = getWarningLevel(item);
                  const isEmergency = level === 'Nguy cấp';
                  
                  const spec = DEVICE_SPECIFICATIONS.find(s => s.name === item.deviceName);
                  const isAmbientCompare = spec?.compareType === 'ambient';
                  const compareLabel = isAmbientCompare ? 'Môi trường (T_mt)' : 'Tham chiếu (T_tc)';
                  const compareValue = isAmbientCompare 
                    ? (item.ambientTemp !== undefined && !isNaN(Number(item.ambientTemp)) ? `${item.ambientTemp}°C` : 'N/A')
                    : (item.referenceTemp !== undefined && !isNaN(Number(item.referenceTemp)) ? `${item.referenceTemp}°C` : 'N/A');

                  return (
                    <div key={idx} className={`p-4 rounded-2xl border transition-all ${isEmergency ? 'bg-rose-50 border-rose-100' : 'bg-orange-50 border-orange-100'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[11px] font-black text-slate-800 truncate pr-2 uppercase">{item.stationName}</h4>
                          {item.deviceName && (
                            <p className="text-[9px] text-blue-600 font-bold uppercase tracking-tight mt-0.5">
                              Thiết bị: {item.deviceName}
                            </p>
                          )}
                        </div>
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${isEmergency ? 'bg-rose-600 text-white' : 'bg-orange-500 text-white'}`}>
                          {level}
                        </span>
                      </div>
                      
                      <div className="space-y-1.5 mb-3">
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px] text-slate-600 font-bold">
                          <div className="col-span-2 flex items-center gap-1.5">
                            <span className="text-slate-400 text-[8px] uppercase font-black flex-shrink-0">Đơn vị:</span>
                            <span className="truncate text-slate-800">{item.unit}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400 text-[8px] uppercase font-black flex-shrink-0">Vị trí:</span>
                            <span className="truncate text-slate-800">{item.deviceLocation}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400 text-[8px] uppercase font-black flex-shrink-0">Tuyến:</span>
                            <span className="truncate text-slate-800">{item.feeder}</span>
                          </div>
                        </div>

                        {/* Thông tin xử lý khiếm khuyết */}
                        <div className="p-2.5 bg-white/60 rounded-xl border border-black/5 space-y-2 shadow-sm">
                          <div className="text-[10px] leading-tight">
                            <span className="text-slate-400 text-[8px] uppercase font-black block mb-0.5 tracking-tighter">Kế hoạch xử lý</span>
                            <span className={`font-bold ${item.actionPlan ? 'text-slate-800' : 'text-slate-400 italic'}`}>
                              {item.actionPlan || 'Chưa cập nhật'}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="text-[10px]">
                              <span className="text-slate-400 text-[8px] uppercase font-black block mb-0.5 tracking-tighter">Ngày đã xử lý</span>
                              <span className={`font-bold ${item.processedDate ? 'text-blue-600' : 'text-slate-400 italic'}`}>
                                {item.processedDate ? formatDate(item.processedDate) : 'Chưa có'}
                              </span>
                            </div>
                            <div className="text-[10px]">
                              <span className="text-slate-400 text-[8px] uppercase font-black block mb-0.5 tracking-tighter">Nhiệt độ sau</span>
                              <span className={`font-bold ${item.postTemp ? 'text-emerald-600' : 'text-slate-400 italic'}`}>
                                {item.postTemp ? `${item.postTemp}°C` : 'Chưa đo'}
                              </span>
                            </div>
                          </div>
                          {item.postImage && (
                            <div className="flex items-center gap-2 pt-1 border-t border-black/5 mt-1">
                              <span className="text-slate-400 text-[8px] uppercase font-black tracking-tighter">Ảnh sau xử lý:</span>
                              <button 
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSelectedImage(item.postImage!);
                                }}
                                className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden border-2 border-white shadow-sm active:scale-95 transition-transform hover:ring-2 hover:ring-blue-500"
                              >
                                <img 
                                  src={getDirectImageUrl(item.postImage, 300)} 
                                  alt="Post" 
                                  className="w-full h-full object-cover"
                                />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-black/5">
                        <div className="flex gap-4">
                          <div className="flex flex-col">
                            <span className="text-[8px] text-slate-400 uppercase font-black">Nhiệt độ đo</span>
                            <span className="text-[11px] font-black text-slate-800">{item.measuredTemp}°C</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[8px] text-slate-400 uppercase font-black">{compareLabel}</span>
                            <span className="text-[11px] font-black text-slate-600">{compareValue}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[8px] text-slate-400 uppercase font-black">Chênh lệch ΔT</span>
                            <span className={`text-[11px] font-black ${isEmergency ? 'text-rose-600' : 'text-orange-600'}`}>
                              {getThermalStatus(item).deltaT.toFixed(1)}°C
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] text-slate-400 font-bold block italic">Ngày đo</span>
                          <span className="text-[10px] text-slate-500 font-black">
                            {formatDate(item.date)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {selectedImage && (
        <ImageModal 
          imageUrl={selectedImage} 
          onClose={() => setSelectedImage(null)} 
          getDirectImageUrl={getDirectImageUrl}
        />
      )}
    </div>
  );
};

const ImageModal: React.FC<{ imageUrl: string, onClose: () => void, getDirectImageUrl: (url: string, size: number) => string }> = ({ imageUrl, onClose, getDirectImageUrl }) => {
  return (
    <div 
      className="fixed inset-0 z-[999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div className="relative max-w-full max-h-full">
        <button 
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-6 h-6 rotate-90" />
          <span className="text-xs font-bold uppercase ml-2">Đóng</span>
        </button>
        <img 
          src={getDirectImageUrl(imageUrl, 1200)} 
          alt="Ảnh phóng to" 
          className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl border-4 border-white/10"
          onClick={(e) => e.stopPropagation()}
        />
        <div className="mt-4 text-center">
          <p className="text-white/50 text-[10px] font-black uppercase tracking-widest">Xem ảnh chi tiết</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
