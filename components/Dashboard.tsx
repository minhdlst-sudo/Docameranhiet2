
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, LabelList
} from 'recharts';
import { ThermalData } from '../types';
import { fetchThermalData } from '../services/gasService';
import { BarChart3, PieChart as PieChartIcon, ArrowLeft, RefreshCw, Calendar, ClipboardList, CheckCircle2, AlertTriangle, Building2, ChevronDown } from 'lucide-react';
import { UNIT_FEEDERS } from '../constants';

interface DashboardProps {
  gasUrl: string;
  currentUnit: string;
  onBack: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ gasUrl, currentUnit, onBack }) => {
  const [allData, setAllData] = useState<ThermalData[]>([]);
  const [selectedStatUnit, setSelectedStatUnit] = useState<string>(currentUnit);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const units = useMemo(() => {
    return ['Toàn Công ty', ...Object.keys(UNIT_FEEDERS)];
  }, []);

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

  const data = useMemo(() => {
    if (selectedStatUnit === 'Toàn Công ty') {
      return allData;
    }
    return allData.filter(item => item.unit === selectedStatUnit);
  }, [allData, selectedStatUnit]);

  const getWarningLevel = (measured: number, reference: number) => {
    const diff = measured - reference;
    if (diff < 5) return 'Bình thường';
    if (diff < 15) return 'Theo dõi';
    if (diff < 30) return 'Nghiêm trọng';
    return 'Nguy cấp';
  };

  // Dữ liệu cho biểu đồ cột (Theo tháng trong năm hiện tại)
  const monthlyData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const months = [
      'Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 
      'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12'
    ];
    
    const counts = new Array(12).fill(0);
    
    data.forEach(item => {
      const date = new Date(item.date);
      if (date.getFullYear() === currentYear) {
        counts[date.getMonth()]++;
      }
    });

    return months.map((name, index) => ({
      name,
      count: isNaN(counts[index]) ? 0 : counts[index]
    }));
  }, [data]);

  // Dữ liệu cho biểu đồ tròn (Mức độ cảnh báo)
  const warningData = useMemo(() => {
    const stats = {
      'Bình thường': 0,
      'Theo dõi': 0,
      'Nghiêm trọng': 0,
      'Nguy cấp': 0
    };

    data.forEach(item => {
      const level = getWarningLevel(Number(item.measuredTemp), Number(item.referenceTemp));
      stats[level as keyof typeof stats]++;
    });

    return [
      { name: 'Bình thường', value: stats['Bình thường'] || 0, color: '#10b981' },
      { name: 'Theo dõi', value: stats['Theo dõi'] || 0, color: '#3b82f6' },
      { name: 'Nghiêm trọng', value: stats['Nghiêm trọng'] || 0, color: '#f59e0b' },
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
      const diff = Number(item.measuredTemp) - Number(item.referenceTemp);
      if (diff >= 15) {
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

  return (
    <div className="bg-white p-4 sm:p-6 rounded-3xl shadow-xl border border-slate-100 animate-fadeIn space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="p-1.5 sm:p-2 bg-blue-50 rounded-xl flex-shrink-0">
            <BarChart3 className="w-4 h-4 sm:w-5 h-5 text-blue-600" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-lg font-black text-slate-800 truncate">Thống kê dữ liệu</h2>
            <div className="relative mt-1 group">
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
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
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
        </div>
      )}
    </div>
  );
};

export default Dashboard;
