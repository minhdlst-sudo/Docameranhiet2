
import React, { useState, useEffect, useCallback } from 'react';
import { ThermalData, getThermalStatus } from '../types';
import { fetchThermalData, updateActionPlan } from '../services/gasService';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, ArrowLeft, Camera, Image, X } from 'lucide-react';

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
  const [postImage, setPostImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  // Chuyển đổi định dạng ngày bất kỳ sang YYYY-MM-DD cho input type="date"
  const formatToInputDate = (dateStr: string | undefined): string => {
    if (!dateStr) return '';
    
    const str = String(dateStr).trim();
    if (!str) return '';

    // 1. Thử parse DD/MM/YYYY (Ưu tiên định dạng VN/GG Sheets hiển thị)
    const parts = str.split('/');
    if (parts.length === 3) {
      const d = parts[0].padStart(2, '0');
      const m = parts[1].padStart(2, '0');
      const y = parts[2];
      const fullY = y.length === 2 ? `20${y}` : (y.length === 4 ? y : y);
      return `${fullY}-${m}-${d}`;
    }

    // 2. Sử dụng đối tượng Date để parse các định dạng khác (ISO, ...)
    // Sau đó lấy các thành phần ngày/tháng/năm theo giờ ĐỊA PHƯƠNG để tránh lệch múi giờ
    const date = new Date(str);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    return '';
  };

  // Hàm lấy ID Google Drive
  const getDriveId = (url: string | null) => {
    if (!url) return null;
    const cleanUrl = url.trim();
    const idMatch = cleanUrl.match(/\/d\/([-\w]{20,})/) || 
                    cleanUrl.match(/[?&]id=([-\w]{20,})/) ||
                    cleanUrl.match(/\/file\/d\/([-\w]{20,})/);
    return idMatch ? idMatch[1] : null;
  };

  // Hàm chuyển đổi link Google Drive sang link trực tiếp để hiển thị trong thẻ img
  const getDirectImageUrl = (url: string | null) => {
    if (!url) return '';
    const cleanUrl = url.trim();
    if (cleanUrl.startsWith('data:')) return cleanUrl;
    
    // Xử lý link Google Drive
    if (cleanUrl.includes('drive.google.com') || /^[-\w]{25,}$/.test(cleanUrl)) {
      const id = cleanUrl.includes('drive.google.com') ? getDriveId(cleanUrl) : cleanUrl;
      if (id) {
        return `https://drive.google.com/thumbnail?id=${id}&sz=s1200`;
      }
    }
    
    return cleanUrl;
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
        const status = getThermalStatus(item);
        const isMonitorOrEmergency = status.level === 'Theo dõi' || status.level === 'Nguy cấp';
        const hasActionPlan = !!(item.actionPlan || item.processedDate || item.postTemp);
        return isCorrectUnit && (isMonitorOrEmergency || hasActionPlan);
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
      postTemp: postTemp,
      postImage: postImage || undefined
    });

    if (result.success) {
      setSuccessMessage('Cập nhật dữ liệu thành công!');
      // Cập nhật local data
      setData(prev => prev.map(item => 
        (item.stationName === selectedItem.stationName && item.deviceLocation === selectedItem.deviceLocation && item.date === selectedItem.date)
        ? { ...item, actionPlan: actionPlan, processedDate: processedDate, postTemp: postTemp ? Number(postTemp) : undefined, postImage: postImage || item.postImage }
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Kích thước ảnh quá lớn (tối đa 2MB)');
        setTimeout(() => setError(null), 3000);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPostImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
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
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 bg-white/50 p-2.5 rounded-xl border border-blue-100/30">
                {selectedItem.deviceName && (
                  <p className="text-[11px] font-black text-blue-700 w-full mb-0.5">Thiết bị: {selectedItem.deviceName}</p>
                )}
                <span className="text-xs font-bold text-rose-600">Nhiệt độ: {selectedItem.measuredTemp}°C</span>
                <span className="text-xs font-bold text-slate-500">Chênh lệch: {getThermalStatus(selectedItem).deltaT.toFixed(1)}°C</span>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${getThermalStatus(selectedItem).level === 'Nguy cấp' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>{getThermalStatus(selectedItem).level}</span>
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

              <div className="col-span-full">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Hình ảnh sau xử lý</label>
                <div className="flex flex-wrap gap-3">
                  {!postImage ? (
                    <div className="flex gap-3 w-full">
                      <label className="flex-1 flex flex-col items-center justify-center gap-2 p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-all group">
                        <Camera className="w-6 h-6 text-slate-400 group-hover:text-blue-500" />
                        <span className="text-[10px] font-black text-slate-400 uppercase group-hover:text-blue-600">Chụp ảnh</span>
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageChange} />
                      </label>
                      <label className="flex-1 flex flex-col items-center justify-center gap-2 p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-all group">
                        <Image className="w-6 h-6 text-slate-400 group-hover:text-blue-500" />
                        <span className="text-[10px] font-black text-slate-400 uppercase group-hover:text-blue-600">Chọn từ thư viện</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                      </label>
                    </div>
                  ) : (
                    <div className="relative w-full max-w-[200px] aspect-square rounded-2xl overflow-hidden border-4 border-white shadow-xl group">
                      <img src={getDirectImageUrl(postImage)} alt="Ảnh sau xử lý" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => setPostImage(null)}
                        className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-rose-500 transition-all"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
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
                      setProcessedDate(formatToInputDate(item.processedDate));
                      setPostTemp(item.postTemp?.toString() || '');
                      setPostImage(item.postImage || null);
                    }}
                    className="w-full text-left p-4 bg-white border border-slate-100 rounded-2xl hover:border-blue-200 hover:shadow-md transition-all group relative overflow-hidden"
                  >
                    <div className="flex justify-between items-start mb-2 gap-3">
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors mb-0.5">{item.stationName}</h4>
                        {item.deviceName && (
                          <span className="text-[9px] text-blue-600 font-bold block mb-1">
                            {item.deviceName}
                          </span>
                        )}
                      </div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full whitespace-nowrap ${getThermalStatus(item).level === 'Nguy cấp' ? 'text-rose-600 bg-rose-50 border border-rose-100' : 'text-amber-600 bg-amber-50 border border-amber-100'}`}>
                        ΔT: {getThermalStatus(item).deltaT.toFixed(1)}°C ({getThermalStatus(item).level})
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Vị trí: {item.deviceLocation} | XT: {item.feeder}</p>
                    <p className="text-[10px] text-slate-400 font-medium mb-1">Loại: {item.inspectionType}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-slate-400 font-medium">Ngày đo: {formatDate(item.date)}</p>
                      <div className="flex flex-wrap gap-2">
                        {item.processedDate ? (
                          <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-blue-100">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                            Ngày xử lý: {formatDate(item.processedDate)}
                          </span>
                        ) : item.actionPlan ? (
                          <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-100">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                            Đã lập KH
                          </span>
                        ) : (
                          <span className="text-[9px] font-black text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-orange-100">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                            Chưa lập KH
                          </span>
                        )}
                        {item.postTemp && (
                          <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-100">
                            Sau xử lý: {item.postTemp}°C
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
