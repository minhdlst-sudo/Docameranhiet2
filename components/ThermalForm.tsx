
import React, { useState, useEffect } from 'react';
import { ThermalData, DEVICE_SPECIFICATIONS, getThermalStatus } from '../types';
import { getFeedersForUnit, updateFeedersForUnit } from '../services/feederService';
import { fetchFeedersFromSheet } from '../services/gasService';
import { getThermalAnalysis } from '../services/geminiService';
import { Sparkles, Thermometer, MapPin, Zap, CloudSun, RefreshCw, Camera, Image, X } from 'lucide-react';

interface ThermalFormProps {
  unit: string;
  gasUrl: string;
  feederGasUrl: string;
  onSubmit: (data: ThermalData) => Promise<boolean>;
  isSubmitting: boolean;
}

const ThermalForm: React.FC<ThermalFormProps> = ({ unit, gasUrl, feederGasUrl, onSubmit, isSubmitting }) => {
  const getInitialState = (): ThermalData => ({
    unit,
    stationName: '',
    deviceLocation: '',
    feeder: '',
    inspectionType: 'Định kỳ',
    phase: 'ABC',
    measuredTemp: undefined as any,
    referenceTemp: undefined as any,
    ambientTemp: undefined as any,
    currentLoad: undefined as any,
    thermalImage: null,
    normalImage: null,
    conclusion: '',
    inspector: '',
    date: new Date().toISOString().split('T')[0],
    deviceName: "Mối nối"
  });

  const [formData, setFormData] = useState<Partial<ThermalData>>(getInitialState());
  const [feeders, setFeeders] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFetchingWeather, setIsFetchingWeather] = useState(false);
  const [isLoadingFeeders, setIsLoadingFeeders] = useState(false);

  const diagnostic = getThermalStatus(formData);

  const fetchWeather = () => {
    if (!navigator.geolocation) {
      alert("Trình duyệt của bạn không hỗ trợ định vị GPS.");
      return;
    }

    setIsFetchingWeather(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        console.log(`GPS Coordinates: ${latitude}, ${longitude}`);
        
        try {
          // Nguồn 1: Open-Meteo (Miễn phí, không cần key, cực kỳ ổn định)
          try {
            const meteoRes = await fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
            );
            if (meteoRes.ok) {
              const meteoData = await meteoRes.json();
              if (meteoData.current_weather && meteoData.current_weather.temperature !== undefined) {
                setFormData(prev => ({ ...prev, ambientTemp: meteoData.current_weather.temperature }));
                setIsFetchingWeather(false);
                return;
              }
            }
          } catch (e) {
            console.warn("Open-Meteo failed, trying wttr.in...", e);
          }

          // Nguồn 2: wttr.in
          try {
            const wttrRes = await fetch(`https://wttr.in/${latitude},${longitude}?format=j1`);
            if (wttrRes.ok) {
              const wttrData = await wttrRes.json();
              const temp = wttrData.current_condition?.[0]?.temp_C;
              if (temp !== undefined) {
                setFormData(prev => ({ ...prev, ambientTemp: parseFloat(temp) }));
                setIsFetchingWeather(false);
                return;
              }
            }
          } catch (e) {
            console.warn("wttr.in failed, trying OpenWeatherMap...", e);
          }

          // Nguồn 3: OpenWeatherMap (Dự phòng cuối)
          const apiKey = (import.meta as any).env.VITE_OPENWEATHER_API_KEY || '010af9997538a2c61b2a9a24b267014c';
          const owmRes = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`
          );
          
          if (owmRes.ok) {
            const owmData = await owmRes.json();
            if (owmData.main && owmData.main.temp !== undefined) {
              setFormData(prev => ({ ...prev, ambientTemp: owmData.main.temp }));
              setIsFetchingWeather(false);
              return;
            }
          }
          
          alert("Không thể lấy dữ liệu thời tiết từ các nguồn trực tuyến. Vui lòng nhập thủ công.");
        } catch (error) {
          console.error("Weather fetch error:", error);
          alert("Lỗi kết nối khi lấy dữ liệu thời tiết. Vui lòng kiểm tra mạng.");
        } finally {
          setIsFetchingWeather(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        let msg = "Không thể lấy vị trí GPS.";
        if (error.code === 1) msg = "Vui lòng cấp quyền truy cập vị trí (GPS) cho ứng dụng trong cài đặt trình duyệt.";
        else if (error.code === 3) msg = "Yêu cầu định vị quá hạn (có thể do tín hiệu yếu). Vui lòng thử lại.";
        alert(msg);
        setIsFetchingWeather(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const loadFeeders = async (forceSync = false) => {
    setIsLoadingFeeders(true);
    // 1. Load from local first (cache) if not forcing sync
    if (!forceSync) {
      const localFeeders = getFeedersForUnit(unit);
      if (localFeeders.length > 0) {
        setFeeders(localFeeders);
      }
    }

    // 2. Try to sync from sheet
    try {
      const remoteLibrary = await fetchFeedersFromSheet(feederGasUrl);
      if (remoteLibrary) {
        const remoteFeeders = Array.from(new Set(remoteLibrary[unit] || []));
        setFeeders(remoteFeeders);
        updateFeedersForUnit(unit, remoteFeeders);
      }
    } catch (error) {
      console.error('Error loading feeders in form:', error);
      if (forceSync) alert('Lỗi đồng bộ dữ liệu từ Google Sheet');
    } finally {
      setIsLoadingFeeders(false);
    }
  };

  useEffect(() => {
    loadFeeders();
  }, [unit, feederGasUrl]);

  const handleAIAnalyze = async () => {
    if (!formData.measuredTemp) {
      alert("Vui lòng nhập nhiệt độ đo để AI đánh giá.");
      return;
    }

    const spec = DEVICE_SPECIFICATIONS.find(s => s.name === formData.deviceName);
    const needsRef = !spec || spec.compareType === 'reference';
    if (needsRef && !formData.referenceTemp) {
      alert("Vui lòng nhập nhiệt độ tham chiếu để AI đánh giá.");
      return;
    }

    setIsAnalyzing(true);
    const analysis = await getThermalAnalysis(
      formData.measuredTemp, 
      formData.referenceTemp || Number(formData.ambientTemp || 25), 
      formData.currentLoad || 0,
      formData.deviceName,
      formData.ambientTemp || 25
    );
    setFormData(prev => ({ ...prev, conclusion: analysis }));
    setIsAnalyzing(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'thermal' | 'normal') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          [type === 'thermal' ? 'thermalImage' : 'normalImage']: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.thermalImage) {
      alert("Vui lòng chọn Ảnh nhiệt (Bắt buộc)");
      return;
    }
    
    if (!formData.normalImage) {
      alert("Vui lòng chọn Ảnh tham chiếu (Bắt buộc)");
      return;
    }

    const success = await onSubmit(formData as ThermalData);
    if (success) {
      setFormData(getInitialState());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 space-y-6 animate-fadeIn">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1.5 ml-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Xuất tuyến</label>
              <button 
                type="button"
                onClick={() => loadFeeders(true)}
                disabled={isLoadingFeeders}
                className="text-[9px] font-black text-blue-600 uppercase flex items-center gap-1 hover:text-blue-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-2.5 h-2.5 ${isLoadingFeeders ? 'animate-spin' : ''}`} />
                Đồng bộ
              </button>
            </div>
            <div className="relative">
              <select 
                required
                value={formData.feeder}
                onChange={e => setFormData({...formData, feeder: e.target.value})}
                className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-bold text-slate-700 appearance-none"
              >
                <option value="" disabled>
                  {isLoadingFeeders && feeders.length === 0 ? '-- Đang đồng bộ... --' : '-- Chọn xuất tuyến --'}
                </option>
                {[...feeders].sort((a, b) => String(a || '').localeCompare(String(b || ''), undefined, {numeric: true})).map((f, idx) => (
                  <option key={`${f}-${idx}`} value={f}>{f}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Tên trạm / Nhánh rẽ</label>
            <div className="relative">
              <input 
                type="text" required
                value={formData.stationName}
                onChange={e => setFormData({...formData, stationName: e.target.value})}
                placeholder="VD: 110kV VSI/Nhánh rẽ Tịnh An 2 "
                className="w-full p-3.5 pl-11 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-bold text-slate-700"
              />
              <MapPin className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Loại kiểm tra</label>
            <select 
              required
              value={formData.inspectionType}
              onChange={e => setFormData({...formData, inspectionType: e.target.value as any})}
              className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-bold text-slate-700"
            >
              <option value="Định kỳ">Định kỳ</option>
              <option value="Đột xuất">Đột xuất</option>
              <option value="Kỹ thuật">Kỹ thuật</option>
              <option value="Sau xử lý">Sau xử lý</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Pha kiểm tra</label>
            <select 
              required
              value={formData.phase}
              onChange={e => setFormData({...formData, phase: e.target.value as any})}
              className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-bold text-slate-700"
            >
              <option value="A">Pha A</option>
              <option value="B">Pha B</option>
              <option value="C">Pha C</option>
              <option value="ABC">Cả 3 Pha (ABC)</option>
              <option value="N">Trung tính (N)</option>
            </select>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Vị trí cột / Thiết bị</label>
            <input 
              type="text" required
              value={formData.deviceLocation}
              onChange={e => setFormData({...formData, deviceLocation: e.target.value})}
              placeholder="VD: 130/25/6 / MBA T1"
              className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-bold text-slate-700"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Tên thiết bị (Loại thiết bị)</label>
            <select 
              required
              value={formData.deviceName ?? ''}
              onChange={e => setFormData({...formData, deviceName: e.target.value})}
              className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-bold text-slate-700"
            >
              {DEVICE_SPECIFICATIONS.map(spec => (
                <option key={spec.name} value={spec.name}>{spec.name}</option>
              ))}
            </select>
          </div>
          
          <div className="p-4 bg-blue-50/5 border border-blue-500/15 rounded-2xl space-y-1.5 backdrop-blur-sm">
            <div>
              <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest block">Nhiệt độ so sánh</span>
              <p className="text-xs font-bold text-slate-600 leading-relaxed text-blue-950">
                {diagnostic.compareDesc}
              </p>
            </div>
            <div>
              <span className="text-[9px] font-black text-blue-500/75 uppercase tracking-widest block.pt-1">Ngưỡng CBM</span>
              <p className="text-[11px] font-semibold text-slate-500 italic leading-relaxed">
                {diagnostic.ruleDesc}
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 bg-blue-50/30 border-2 border-blue-400/30 rounded-[2rem] space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-blue-500" />
              <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Thông số đo</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-white border border-blue-100 rounded-full shadow-sm">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">ΔT:</span>
              <span className={`text-sm font-black leading-none ${
                diagnostic.level === 'Nguy cấp' ? 'text-rose-600' :
                diagnostic.level === 'Theo dõi' ? 'text-amber-500' : 'text-emerald-600'
              }`}>
                {diagnostic.deltaT.toFixed(1)}°C
              </span>
              <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                diagnostic.level === 'Nguy cấp' ? 'bg-rose-100 text-rose-700' :
                diagnostic.level === 'Theo dõi' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {diagnostic.level}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nhiệt độ đo</label>
              <div className="relative">
                <input 
                  type="number" step="0.1" required
                  value={formData.measuredTemp ?? ''}
                  onChange={e => setFormData({...formData, measuredTemp: e.target.value === '' ? undefined : parseFloat(e.target.value)})}
                  className="w-full p-3.5 bg-white border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-bold text-slate-700"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">°C</span>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Tham chiếu</label>
              <div className="relative">
                <input 
                  type="number" step="0.1" required
                  value={formData.referenceTemp ?? ''}
                  onChange={e => setFormData({...formData, referenceTemp: e.target.value === '' ? undefined : parseFloat(e.target.value)})}
                  className="w-full p-3.5 bg-white border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-bold text-slate-700"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">°C</span>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5 ml-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Môi trường</label>
                <button 
                  type="button"
                  onClick={fetchWeather}
                  disabled={isFetchingWeather}
                  title="Lấy nhiệt độ môi trường theo GPS"
                  className="flex items-center gap-1 text-[9px] font-black text-blue-500 uppercase hover:text-blue-600 disabled:opacity-50 transition-colors"
                >
                  {isFetchingWeather ? (
                    <div className="w-3 h-3 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                  ) : (
                    <CloudSun className="w-3 h-3" />
                  )}
                  GPS
                </button>
              </div>
              <div className="relative">
                <input 
                  type="number" step="0.1" required
                  value={formData.ambientTemp ?? ''}
                  onChange={e => setFormData({...formData, ambientTemp: e.target.value === '' ? undefined : parseFloat(e.target.value)})}
                  className="w-full p-3.5 bg-white border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-bold text-slate-700"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">°C</span>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Dòng tải (A)</label>
              <div className="relative">
                <input 
                  type="number" step="0.1" required
                  value={formData.currentLoad ?? ''}
                  onChange={e => setFormData({...formData, currentLoad: e.target.value === '' ? undefined : parseFloat(e.target.value)})}
                  className="w-full p-3.5 bg-white border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-bold text-slate-700"
                />
                <Zap className="w-3 h-3 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1 flex items-center gap-1">
              Ảnh nhiệt <span className="text-rose-500">*</span>
            </label>
            <div className="relative h-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl overflow-hidden group">
              {formData.thermalImage ? (
                <div className="relative w-full h-full">
                  <img src={formData.thermalImage} className="w-full h-full object-cover" alt="Thermal" />
                  <button 
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, thermalImage: null }))}
                    className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-rose-500 transition-all shadow-md z-10"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-2 gap-2 text-slate-400">
                  <div className="flex gap-2 w-full h-full">
                    <label className="flex-1 flex flex-col items-center justify-center gap-1.5 p-2 bg-white border border-slate-200/60 rounded-xl cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-all group shadow-sm">
                      <Camera className="w-5 h-5 text-slate-400 group-hover:text-blue-500" />
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-tight group-hover:text-blue-600 text-center">Chụp ảnh</span>
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleImageChange(e, 'thermal')} />
                    </label>
                    <label className="flex-1 flex flex-col items-center justify-center gap-1.5 p-2 bg-white border border-slate-200/60 rounded-xl cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-all group shadow-sm">
                      <Image className="w-5 h-5 text-slate-400 group-hover:text-blue-500" />
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-tight group-hover:text-blue-600 text-center">Chọn ảnh</span>
                      <input type="file" accept="image/*" className="hidden" onChange={e => handleImageChange(e, 'thermal')} />
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1 flex items-center gap-1">
              Ảnh tham chiếu <span className="text-rose-500">*</span>
            </label>
            <div className="relative h-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl overflow-hidden group">
              {formData.normalImage ? (
                <div className="relative w-full h-full">
                  <img src={formData.normalImage} className="w-full h-full object-cover" alt="Normal" />
                  <button 
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, normalImage: null }))}
                    className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-rose-500 transition-all shadow-md z-10"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-2 gap-2 text-slate-400">
                  <div className="flex gap-2 w-full h-full">
                    <label className="flex-1 flex flex-col items-center justify-center gap-1.5 p-2 bg-white border border-slate-200/60 rounded-xl cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-all group shadow-sm">
                      <Camera className="w-5 h-5 text-slate-400 group-hover:text-blue-500" />
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-tight group-hover:text-blue-600 text-center">Chụp ảnh</span>
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleImageChange(e, 'normal')} />
                    </label>
                    <label className="flex-1 flex flex-col items-center justify-center gap-1.5 p-2 bg-white border border-slate-200/60 rounded-xl cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-all group shadow-sm">
                      <Image className="w-5 h-5 text-slate-400 group-hover:text-blue-500" />
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-tight group-hover:text-blue-600 text-center">Chọn ảnh</span>
                      <input type="file" accept="image/*" className="hidden" onChange={e => handleImageChange(e, 'normal')} />
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between mb-1 ml-1">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Kết luận & Kiến nghị</label>
            <button 
              type="button"
              onClick={handleAIAnalyze}
              disabled={isAnalyzing}
              className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-wider hover:bg-blue-100 transition-all disabled:opacity-50"
            >
              {isAnalyzing ? (
                <div className="w-3 h-3 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
              ) : (
                <Sparkles className="w-3 h-3" />
              )}
              AI Đánh giá
            </button>
          </div>
          <textarea 
            required
            value={formData.conclusion}
            onChange={e => setFormData({...formData, conclusion: e.target.value})}
            placeholder="Nhập kết luận hoặc bấm 'AI Đánh giá' để tự động phân tích..."
            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-bold text-slate-700 h-24"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Người đo</label>
            <input 
              type="text" required
              value={formData.inspector}
              onChange={e => setFormData({...formData, inspector: e.target.value})}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Ngày đo</label>
            <input 
              type="date" required
              value={formData.date}
              onChange={e => setFormData({...formData, date: e.target.value})}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
          </div>
        </div>
      </div>

      <button 
        type="submit" 
        disabled={isSubmitting}
        className="w-full p-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-[0.98]"
      >
        {isSubmitting ? 'Đang đồng bộ...' : 'Gửi kết quả'}
      </button>
    </form>
  );
};

export default ThermalForm;
