
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ThermalData } from '../types';
import { fetchThermalData } from '../services/gasService';
import { ArrowLeft, Download, FileSpreadsheet } from 'lucide-react';

interface DataViewerProps {
  gasUrl: string;
  currentUnit: string;
  onBack: () => void;
}

type WarningLevel = 'All' | 'Normal' | 'Monitor' | 'Serious' | 'Emergency';

const DataViewer: React.FC<DataViewerProps> = ({ gasUrl, currentUnit, onBack }) => {
  const [data, setData] = useState<ThermalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [warningFilter, setWarningFilter] = useState<WarningLevel>('All');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [serverMode, setServerMode] = useState<'standard' | 'thumbnail' | 'proxy' | 'iframe'>('standard');

  // Thêm timeout để tự động chuyển server nếu tải lâu
  useEffect(() => {
    let timer: any;
    if (selectedImage && imageLoading) {
      timer = setTimeout(() => {
        if (imageLoading) {
          if (serverMode === 'standard') {
            setServerMode('thumbnail');
          } else if (serverMode === 'thumbnail') {
            setServerMode('proxy');
          } else if (serverMode === 'proxy') {
            setServerMode('iframe');
            setImageLoading(false);
          } else {
            setImageLoading(false);
            setImageError(true);
          }
        }
      }, 5000); // Thử mỗi server trong 5 giây
    }
    return () => clearTimeout(timer);
  }, [selectedImage, imageLoading, serverMode]);

  // Hàm định dạng ngày tháng tiếng Việt
  const formatDate = (dateStr: string | undefined) => {
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
      return dateStr;
    }
    return date.toLocaleDateString('vi-VN');
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
  const getDirectImageUrl = (url: string | null, mode: 'standard' | 'thumbnail' | 'proxy' | 'iframe' = 'standard', size: number = 1600) => {
    if (!url) return '';
    const cleanUrl = url.trim();
    if (cleanUrl.startsWith('data:')) return cleanUrl;
    
    // Xử lý link Google Drive
    if (cleanUrl.includes('drive.google.com') || /^[-\w]{25,}$/.test(cleanUrl)) {
      const id = cleanUrl.includes('drive.google.com') ? getDriveId(cleanUrl) : cleanUrl;
      if (id) {
        if (mode === 'thumbnail') {
          // Sử dụng tham số s thay vì w để tăng độ ổn định
          return `https://drive.google.com/thumbnail?id=${id}&sz=s${size}`;
        }
        if (mode === 'proxy') {
          return `https://images1-focus-opensocial.googleusercontent.com/gadgets/proxy?container=focus&refresh=2592000&url=${encodeURIComponent(`https://drive.google.com/uc?id=${id}`)}`;
        }
        if (mode === 'iframe') {
          return `https://drive.google.com/file/d/${id}/preview`;
        }
        return `https://drive.google.com/uc?id=${id}`;
      }
    }
    return cleanUrl;
  };

  const handleOpenImage = (url: string) => {
    setServerMode('standard');
    setImageLoading(true);
    setImageError(false);
    setSelectedImage(url);
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
      // Lọc dữ liệu theo đơn vị ngay từ khi tải về
      const unitData = validData.filter(item => item.unit === currentUnit);
      setData(unitData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể kết nối với máy chủ dữ liệu.');
    } finally {
      setLoading(false);
    }
  }, [gasUrl, currentUnit]);

  const handleDownloadCSV = () => {
    if (filteredData.length === 0) return;

    // Tiêu đề cột
    const headers = [
      "Đơn vị", "Trạm/Nhánh rẽ", "Xuất tuyến", "Loại kiểm tra", "Vị trí cột", 
      "Pha", "Nhiệt độ đo (°C)", "Tham chiếu (°C)", "Môi trường (°C)", 
      "Dòng điện phụ tải (A)", "Kết luận", "Người kiểm tra", "Ngày đo", 
      "Kế hoạch xử lý", "Ngày đã xử lý", "Nhiệt độ sau xử lý"
    ];

    // Hàm thoát các ký tự đặc biệt và ép kiểu text cho Excel
    const escapeCSV = (val: any, forceText = false) => {
      if (val === null || val === undefined) return '""';
      let str = val.toString();
      str = str.replace(/"/g, '""');
      // Nếu forceText = true, sử dụng định dạng ="giá_trị" để Excel không tự ý chuyển sang ngày tháng
      if (forceText) {
        return `="${str}"`;
      }
      return `"${str}"`;
    };

    // Chuyển dữ liệu thành các dòng (Sử dụng Tab làm phân cách để Excel nhận diện tốt nhất với UTF-16LE)
    const csvRows = filteredData.map(item => [
      escapeCSV(item.unit, true),
      escapeCSV(item.stationName, true),
      escapeCSV(item.feeder, true),
      escapeCSV(item.inspectionType, true),
      escapeCSV(item.deviceLocation, true),
      escapeCSV(item.phase, true),
      item.measuredTemp,
      item.referenceTemp,
      item.ambientTemp,
      item.currentLoad,
      escapeCSV(item.conclusion, true),
      escapeCSV(item.inspector, true),
      escapeCSV(formatDate(item.date), true),
      escapeCSV(item.actionPlan || "", true),
      escapeCSV(formatDate(item.processedDate), true),
      item.postTemp || ""
    ].join("\t"));

    // Kết hợp tiêu đề và dữ liệu
    const csvContent = headers.map(h => escapeCSV(h)).join("\t") + "\n" + csvRows.join("\n");
    
    // GIẢI PHÁP TỐI ƯU CHO EXCEL: Sử dụng UTF-16LE và Tab làm phân cách
    // Đây là định dạng mà Excel hỗ trợ tốt nhất cho tiếng Việt có dấu
    const bom = new Uint8Array([0xFF, 0xFE]);
    const buffer = new ArrayBuffer(csvContent.length * 2);
    const view = new Uint16Array(buffer);
    for (let i = 0; i < csvContent.length; i++) {
      view[i] = csvContent.charCodeAt(i);
    }
    const blob = new Blob([bom, buffer], { type: 'text/csv;charset=utf-16le' });
    
    // SỬA LỖI DI ĐỘNG: Chuyển về dạng đồng bộ (Synchronous)
    // Trình duyệt di động thường chặn link.click() nếu nó nằm trong callback bất đồng bộ (như FileReader)
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute('download', `Ket_qua_nhiet_${currentUnit.replace(/\s+/g, '_')}_${new Date().getTime()}.csv`);
    
    // Đảm bảo link tồn tại trong DOM để trình duyệt di động xử lý tốt hơn
    link.style.display = 'none';
    document.body.appendChild(link);
    
    // Kích hoạt tải xuống
    link.click();
    
    // Dọn dẹp sau khi trình duyệt đã nhận lệnh
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 500);
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getWarningLevel = (measured: number, reference: number): WarningLevel => {
    const diff = measured - reference;
    if (diff < 5) return 'Normal';
    if (diff < 15) return 'Monitor';
    if (diff < 30) return 'Serious';
    return 'Emergency';
  };

  const getWarningLabel = (level: WarningLevel) => {
    switch (level) {
      case 'Normal': return { text: 'Bình thường', color: 'text-emerald-600', bg: 'bg-emerald-50' };
      case 'Monitor': return { text: 'Theo dõi', color: 'text-blue-600', bg: 'bg-blue-50' };
      case 'Serious': return { text: 'Nghiêm trọng', color: 'text-orange-600', bg: 'bg-orange-50' };
      case 'Emergency': return { text: 'Nguy cấp', color: 'text-rose-600', bg: 'bg-rose-50' };
      default: return { text: 'Tất cả', color: 'text-slate-600', bg: 'bg-slate-50' };
    }
  };

  const filteredData = data.filter(item => {
    const matchesSearch = 
      item.stationName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.feeder?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.deviceLocation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.inspectionType?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (warningFilter === 'All') return matchesSearch;
    
    const level = getWarningLevel(Number(item.measuredTemp), Number(item.referenceTemp));
    return matchesSearch && level === warningFilter;
  });

  const counts = useMemo(() => {
    const c = { All: data.length, Normal: 0, Monitor: 0, Serious: 0, Emergency: 0 };
    data.forEach(item => {
      const level = getWarningLevel(Number(item.measuredTemp), Number(item.referenceTemp));
      if (level in c) {
        c[level as keyof typeof c]++;
      }
    });
    return c;
  }, [data]);

  return (
    <div className="bg-white p-4 sm:p-6 rounded-3xl shadow-xl border border-slate-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-sm sm:text-lg font-black text-slate-800 truncate">Kết quả: {currentUnit}</h2>
          <button 
            onClick={loadData}
            disabled={loading}
            className={`p-2 rounded-full hover:bg-slate-100 transition-all ${loading ? 'animate-spin opacity-50' : ''}`}
            title="Làm mới dữ liệu"
          >
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!loading && filteredData.length > 0 && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleDownloadCSV();
              }}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 sm:px-3 sm:py-1.5 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider hover:bg-emerald-100 transition-all active:scale-95 touch-manipulation"
              title="Tải về file CSV"
            >
              <FileSpreadsheet className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">Tải dữ liệu</span>
            </button>
          )}
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onBack();
            }} 
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 sm:px-3 sm:py-1.5 bg-blue-50 text-blue-600 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider hover:bg-blue-100 transition-all active:scale-95 touch-manipulation"
          >
            <ArrowLeft className="w-4 h-4 sm:w-3 sm:h-3" />
            <span>Quay lại</span>
          </button>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <input 
          type="text" 
          placeholder="Tìm kiếm trạm, xuất tuyến, cột..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-blue-500 transition-all"
        />
        
        <div className="flex flex-wrap gap-1.5">
          {(['All', 'Normal', 'Monitor', 'Serious', 'Emergency'] as WarningLevel[]).map(level => {
            const label = getWarningLabel(level);
            const isActive = warningFilter === level;
            const count = counts[level as keyof typeof counts];
            return (
              <button
                key={level}
                onClick={() => setWarningFilter(level)}
                className={`text-[9px] font-black uppercase px-2.5 py-1.5 rounded-lg transition-all border flex items-center gap-1.5 ${
                  isActive 
                    ? `${label.bg} ${label.color} border-current shadow-sm` 
                    : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'
                }`}
              >
                <span>{label.text}</span>
                <span className={`px-1 rounded-md ${isActive ? 'bg-white/50' : 'bg-slate-100 text-slate-500'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-100 border-b-blue-600"></div>
          </div>
          <div className="text-center">
            <p className="text-slate-600 text-sm font-bold">Đang truy xuất dữ liệu từ Google Sheets...</p>
            <p className="text-slate-400 text-[10px] uppercase font-medium mt-1">Quá trình này có thể mất 5-15 giây tùy vào lượng dữ liệu</p>
          </div>
        </div>
      ) : error ? (
        <div className="text-center py-12 bg-rose-50 rounded-3xl border border-rose-100 px-6">
          <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-rose-600 text-sm font-bold mb-1">Lỗi tải dữ liệu</p>
          <p className="text-rose-500 text-xs mb-4">{error}</p>
          <button 
            onClick={loadData} 
            className="px-6 py-2 bg-rose-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all"
          >
            Thử lại ngay
          </button>
        </div>
      ) : filteredData.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <p className="text-slate-400 text-sm italic">Không có dữ liệu phù hợp.</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {[...filteredData].reverse().map((item, index) => {
            const level = getWarningLevel(Number(item.measuredTemp), Number(item.referenceTemp));
            const label = getWarningLabel(level);
            return (
              <div key={index} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 hover:border-slate-200 transition-all group">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-slate-800 text-sm">{item.stationName}</h3>
                      <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${label.bg} ${label.color}`}>
                        {label.text}
                      </span>
                    </div>
                    {item.timestamp && (
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mb-1">
                        Cập nhật: {item.timestamp.toString()}
                      </p>
                    )}
                    <div className="space-y-0.5">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">
                        <span className="text-slate-400">Trạm/Nhánh rẽ:</span> {item.stationName}
                      </p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">
                        <span className="text-slate-400">Xuất tuyến:</span> {item.feeder} | <span className="text-slate-400">Kiểm tra:</span> {item.inspectionType}
                      </p>
                      <p className="text-[9px] text-blue-500 font-bold uppercase">
                        Vị trí cột: {item.deviceLocation} | Pha: {item.phase}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-white border border-slate-200 text-slate-500 px-2 py-0.5 rounded-full font-bold shadow-sm whitespace-nowrap">
                    {formatDate(item.date)}
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-2 py-2.5 border-y border-slate-200/50">
                  <div className="text-center">
                    <p className="text-[8px] text-slate-400 uppercase font-bold mb-0.5">Nhiệt độ đo</p>
                    <p className={`text-sm font-black ${Number(item.measuredTemp) > 70 ? 'text-rose-600' : 'text-slate-800'}`}>{item.measuredTemp}°C</p>
                  </div>
                  <div className="text-center border-x border-slate-200/50">
                    <p className="text-[8px] text-slate-400 uppercase font-bold mb-0.5">Tham chiếu</p>
                    <p className="text-sm font-black text-slate-600">{item.referenceTemp}°C</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[8px] text-slate-400 uppercase font-bold mb-0.5">Chênh lệch</p>
                    <p className={`text-sm font-black ${label.color}`}>{(Number(item.measuredTemp) - Number(item.referenceTemp)).toFixed(1)}°C</p>
                  </div>
                </div>
                
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-[11px] text-slate-600 italic leading-tight flex-1 break-words">
                      <span className="font-bold not-italic text-slate-800">Kết luận:</span> {item.conclusion}
                    </p>
                    
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {item.thermalImage && (
                        <div className="flex flex-col items-center gap-1.5">
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleOpenImage(item.thermalImage!);
                            }}
                            className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0 border-2 border-white shadow-md hover:ring-2 hover:ring-blue-500 transition-all group/img relative active:scale-95"
                            title="Xem ảnh nhiệt"
                          >
                            <img 
                              src={getDirectImageUrl(item.thermalImage, 'thumbnail', 300)} 
                              alt="ẢNH NHIỆT" 
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                if (!target.src.includes('proxy')) {
                                  target.src = getDirectImageUrl(item.thermalImage, 'proxy');
                                }
                              }}
                            />
                            <div className="absolute inset-0 bg-black/5 group-hover/img:bg-transparent transition-colors"></div>
                          </button>
                          <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">ẢNH NHIỆT</span>
                        </div>
                      )}
                      {item.normalImage && (
                        <div className="flex flex-col items-center gap-1.5">
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleOpenImage(item.normalImage!);
                            }}
                            className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0 border-2 border-white shadow-md hover:ring-2 hover:ring-blue-500 transition-all group/img relative active:scale-95"
                            title="Xem ảnh tham chiếu"
                          >
                            <img 
                              src={getDirectImageUrl(item.normalImage, 'thumbnail', 300)} 
                              alt="THAM CHIẾU" 
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                if (!target.src.includes('proxy')) {
                                  target.src = getDirectImageUrl(item.normalImage, 'proxy');
                                }
                              }}
                            />
                            <div className="absolute inset-0 bg-black/5 group-hover/img:bg-transparent transition-colors"></div>
                          </button>
                          <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">THAM CHIẾU</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {(level === 'Serious' || level === 'Emergency' || item.actionPlan || item.processedDate || item.postTemp) && (
                    <div className="pt-3 border-t border-blue-50 bg-blue-50/30 rounded-xl p-3 w-full">
                      <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">Thông tin xử lý khiếm khuyết</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="col-span-full">
                          <p className="text-[9px] text-slate-400 uppercase font-bold">Kế hoạch xử lý:</p>
                          <p className={`text-xs font-semibold ${item.actionPlan ? 'text-slate-700' : 'text-slate-400 italic'}`}>
                            {item.actionPlan || 'Chưa cập nhật'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] text-slate-400 uppercase font-bold">Ngày đã xử lý:</p>
                          <p className={`text-xs font-black ${item.processedDate ? 'text-blue-600' : 'text-slate-400 italic'}`}>
                            {item.processedDate ? formatDate(item.processedDate) : 'Chưa cập nhật'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] text-slate-400 uppercase font-bold">Nhiệt độ sau xử lý:</p>
                          <p className={`text-xs font-black ${item.postTemp ? 'text-blue-600' : 'text-slate-400 italic'}`}>
                            {item.postTemp ? `${item.postTemp}°C` : 'Chưa cập nhật'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal xem ảnh phóng lớn */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-slate-900/90 z-[100] flex items-center justify-center p-4 animate-fadeIn backdrop-blur-sm"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl w-full max-h-full flex flex-col items-center gap-4" onClick={e => e.stopPropagation()}>
            <div className="relative w-full overflow-hidden rounded-2xl shadow-2xl bg-black flex items-center justify-center min-h-[350px]">
              {imageError ? (
                <div className="flex flex-col items-center gap-4 p-8 text-center">
                  <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center text-rose-500">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  </div>
                  <div>
                    <p className="text-white font-bold">Không thể hiển thị ảnh trực tiếp</p>
                    <p className="text-slate-400 text-xs mt-1">Vui lòng sử dụng nút "Mở link gốc" hoặc "Chế độ Iframe"</p>
                  </div>
                </div>
              ) : serverMode === 'iframe' ? (
                <iframe 
                  src={getDirectImageUrl(selectedImage, 'iframe')} 
                  className="w-full h-[60vh] border-0 rounded-xl"
                  title="Google Drive Preview"
                />
              ) : (
                <>
                  <img 
                    key={`${selectedImage}-${serverMode}`}
                    src={getDirectImageUrl(selectedImage, serverMode)} 
                    alt="Full view" 
                    className="max-w-full max-h-[80vh] object-contain relative z-10"
                    referrerPolicy="no-referrer"
                    onLoad={() => {
                      setImageLoading(false);
                      setImageError(false);
                    }}
                    onError={() => {
                      if (serverMode === 'standard') {
                        setServerMode('thumbnail');
                      } else if (serverMode === 'thumbnail') {
                        setServerMode('proxy');
                      } else if (serverMode === 'proxy') {
                        setServerMode('iframe');
                        setImageLoading(false);
                      } else {
                        setImageLoading(false);
                        setImageError(true);
                      }
                    }}
                    style={{ opacity: imageLoading ? 0 : 1, transition: 'opacity 0.3s ease' }}
                  />
                  {imageLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                      <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                      <p className="text-white text-[10px] font-bold uppercase tracking-widest">
                        {serverMode === 'standard' ? 'Đang kết nối...' : 
                         serverMode === 'thumbnail' ? 'Thử server dự phòng 1...' : 
                         'Thử server dự phòng 2...'}
                      </p>
                    </div>
                  )}
                </>
              )}
              <button 
                className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors backdrop-blur-md border border-white/20 z-20"
                onClick={() => setSelectedImage(null)}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <button 
                onClick={() => setSelectedImage(null)}
                className="px-8 py-3 bg-slate-800 text-white font-black uppercase tracking-widest rounded-full shadow-lg hover:bg-slate-900 transition-colors text-xs"
              >
                Đóng lại
              </button>
              <a 
                href={selectedImage || ''} 
                target="_blank" 
                rel="noreferrer"
                className="px-8 py-3 bg-blue-600 text-white font-black uppercase tracking-widest rounded-full shadow-lg hover:bg-blue-700 transition-colors text-xs flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                Xem ảnh gốc
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataViewer;
