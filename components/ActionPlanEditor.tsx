
import React, { useState, useEffect, useCallback } from 'react';
import { ThermalData } from '../types';
import { fetchThermalData, updateActionPlan } from '../services/gasService';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, ArrowLeft } from 'lucide-react';

interface ActionPlanEditorProps {
  gasUrl: string;
  currentUnit: string;
  onBack: () => void;
}

const ActionPlanEditor: React.FC<ActionPlanEditorProps> = ({ gasUrl, currentUnit, onBack }) => {
  const [data, setData] = useState<ThermalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<ThermalData | null>(null);
  const [actionPlan, setActionPlan] = useState('');
  const [processedDate, setProcessedDate] = useState('');
  const [postTemp, setPostTemp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      // Thử parse nếu định dạng là DD/MM/YYYY
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const d = parseInt(parts[0]);
        const m = parseInt(parts[1]) - 1;
        const y = parseInt(parts[2]);
        const newDate = new Date(y, m, d);
        if (!isNaN(newDate.getTime())) return newDate.toLocaleDateString('vi-VN');
      }
      return dateStr; // Trả về chuỗi gốc nếu không parse được
    }
    return date.toLocaleDateString('vi-VN');
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await fetchThermalData(gasUrl);
      // Lọc bỏ các dòng trống hoặc dữ liệu rác (không có tên trạm hoặc ngày đo là link)
      const validData = results.filter(item => 
        item.stationName && 
        item.stationName.trim() !== "" && 
        item.date && 
        !item.date.includes('drive.google.com')
      );
      // Lọc dữ liệu theo đơn vị đang đăng nhập và mức cảnh báo (Chỉ hiện Nghiêm trọng & Nguy cấp: Delta T >= 15 HOẶC đã có kế hoạch)
      const unitData = validData.filter(item => {
        const isCorrectUnit = item.unit === currentUnit;
        const diff = Number(item.measuredTemp) - Number(item.referenceTemp);
        const isSeriousOrEmergency = diff >= 15;
        const hasActionPlan = !!(item.actionPlan || item.processedDate || item.postTemp);
        return isCorrectUnit && (isSeriousOrEmergency || hasActionPlan);
      });
      
      // Sắp xếp theo ngày mới nhất
      const sortedData = [...unitData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setData(sortedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu.');
    } finally {
      setLoading(false);
    }
  }, [gasUrl]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredData = data.filter(item => 
    item.stationName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.deviceLocation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.feeder?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleUpdate = async () => {
    if (!selectedItem) return;
    
    setIsSubmitting(true);
    const result = await updateActionPlan(gasUrl, {
      stationName: selectedItem.stationName,
      deviceLocation: selectedItem.deviceLocation,
      date: selectedItem.date,
      actionPlan: actionPlan,
      processedDate: processedDate,
      postTemp: postTemp
    });

    if (result.success) {
      setSuccessMessage('Cập nhật dữ liệu thành công!');
      // Cập nhật local data
      setData(prev => prev.map(item => 
        (item.stationName === selectedItem.stationName && item.deviceLocation === selectedItem.deviceLocation && item.date === selectedItem.date)
        ? { ...item, actionPlan: actionPlan, processedDate: processedDate, postTemp: postTemp ? Number(postTemp) : undefined }
        : item
      ));
      
      // Tự động quay lại danh sách sau 2 giây
      setTimeout(() => {
        setSuccessMessage(null);
        setSelectedItem(null);
      }, 2000);
    } else {
      setError(result.message);
      setTimeout(() => setError(null), 5000);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="bg-white p-4 sm:p-6 rounded-3xl shadow-xl border border-slate-100 min-h-[500px]">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          Cập nhật Kế hoạch xử lý
        </h2>
        <div className="flex items-center gap-2">
          <button 
            onClick={loadData}
            disabled={loading}
            className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all disabled:opacity-50"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={onBack} 
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-blue-100 transition-all"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Quay lại</span>
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {selectedItem ? (
          <motion.div 
            key="editor"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Đang cập nhật cho:</p>
              <h3 className="font-bold text-slate-800">{selectedItem.stationName}</h3>
              <p className="text-xs text-slate-500 font-medium">
                Vị trí: {selectedItem.deviceLocation} | Xuất tuyến: {selectedItem.feeder}
              </p>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Loại kiểm tra: {selectedItem.inspectionType} | Ngày đo: {formatDate(selectedItem.date)}
              </p>
              <div className="mt-2 flex items-center gap-4">
                <span className="text-xs font-bold text-rose-600">Nhiệt độ: {selectedItem.measuredTemp}°C</span>
                <span className="text-xs font-bold text-slate-500">Chênh lệch: {(Number(selectedItem.measuredTemp) - Number(selectedItem.referenceTemp)).toFixed(1)}°C</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="col-span-full">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nội dung Kế hoạch xử lý</label>
                <textarea 
                  value={actionPlan}
                  onChange={e => setActionPlan(e.target.value)}
                  placeholder="Nhập kế hoạch xử lý khiếm khuyết..."
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm h-24"
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Ngày đã xử lý</label>
                <input 
                  type="date"
                  value={processedDate}
                  onChange={e => setProcessedDate(e.target.value)}
                  onKeyDown={(e) => e.preventDefault()}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-slate-700 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nhiệt độ sau xử lý (°C)</label>
                <input 
                  type="number"
                  step="0.1"
                  value={postTemp}
                  onChange={e => setPostTemp(e.target.value)}
                  placeholder="Nhập nhiệt độ đo lại..."
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-slate-700"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setSelectedItem(null)}
                className="flex-1 p-4 bg-slate-100 text-slate-600 rounded-2xl font-bold uppercase text-xs hover:bg-slate-200 transition-all"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={handleUpdate}
                disabled={isSubmitting || !actionPlan.trim()}
                className="flex-[2] p-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                )}
                Cập nhật ngay
              </button>
            </div>

            {successMessage && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-emerald-50 text-emerald-600 text-center rounded-xl text-xs font-bold border border-emerald-100"
              >
                {successMessage}
              </motion.div>
            )}

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-rose-50 text-rose-600 text-center rounded-xl text-xs font-bold border border-rose-100"
              >
                {error}
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div 
            key="list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
          >
            <div className="relative">
              <input 
                type="text" 
                placeholder="Tìm trạm hoặc vị trí cột..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full p-4 pl-12 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm focus:ring-2 focus:ring-blue-500 transition-all"
              />
              <svg className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {loading ? (
                <div className="py-20 flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                  <p className="text-xs font-bold text-slate-400 uppercase">Đang truy xuất dữ liệu...</p>
                  <p className="text-[10px] text-slate-400 text-center px-6">Quá trình này có thể mất vài giây tùy vào lượng dữ liệu trên Google Sheets</p>
                </div>
              ) : filteredData.length === 0 ? (
                <div className="py-20 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                  <p className="text-slate-400 text-sm italic">Không có vị trí mức Nghiêm trọng hoặc Nguy cấp.</p>
                </div>
              ) : (
                filteredData.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedItem(item);
                      setActionPlan(item.actionPlan || '');
                      setProcessedDate(item.processedDate || '');
                      setPostTemp(item.postTemp?.toString() || '');
                    }}
                    className="w-full text-left p-4 bg-white border border-slate-100 rounded-2xl hover:border-blue-200 hover:shadow-md transition-all group relative overflow-hidden"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors">{item.stationName}</h4>
                      <span className="text-[10px] font-black text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full">
                        ΔT: {(Number(item.measuredTemp) - Number(item.referenceTemp)).toFixed(1)}°C
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Vị trí: {item.deviceLocation} | XT: {item.feeder}</p>
                    <p className="text-[10px] text-slate-400 font-medium mb-1">Loại: {item.inspectionType}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-slate-400 font-medium">Ngày đo: {formatDate(item.date)}</p>
                      <div className="flex gap-2">
                        {item.processedDate ? (
                          <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                            Xử lý: {formatDate(item.processedDate)}
                          </span>
                        ) : item.actionPlan ? (
                          <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                            Đã lập KH
                          </span>
                        ) : (
                          <span className="text-[9px] font-black text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                            Chưa lập KH
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ActionPlanEditor;
