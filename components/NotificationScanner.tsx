
import React, { useState, useEffect, useCallback } from 'react';
import { ThermalData, getThermalStatus } from '../types';
import { fetchThermalData } from '../services/gasService';
import { Bell, AlertCircle, X, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NotificationScannerProps {
  gasUrl: string;
  onCriticalDetected?: (points: ThermalData[]) => void;
  canShowPopup?: boolean;
}

const NotificationScanner: React.FC<NotificationScannerProps> = ({ gasUrl, onCriticalDetected, canShowPopup = true }) => {
  const [criticalPoints, setCriticalPoints] = useState<ThermalData[]>([]);
  const [showPopup, setShowPopup] = useState(false);
  const [notifiedIds, setNotifiedIds] = useState<Set<string>>(new Set());

  // Load notified locations from localStorage on mount (prevents multiple spams per location)
  useEffect(() => {
    const saved = localStorage.getItem('pcqn_notified_critical_locs');
    if (saved) {
      try {
        setNotifiedIds(new Set(JSON.parse(saved)));
      } catch (e) {
        console.error('Failed to parse notified IDs', e);
      }
    }
  }, []);

  const getLocId = (item: ThermalData) => {
    return `${item.stationName?.trim() || ''}|${item.deviceLocation?.trim() || ''}|${item.phase?.trim() || ''}`;
  };

  const checkCritical = useCallback(async () => {
    try {
      const data = await fetchThermalData(gasUrl);
      const criticals = data.filter(item => {
        const status = getThermalStatus(item);
        const isCritical = status.level === 'Nguy cấp';
        const isNotProcessed = !item.processedDate || item.processedDate.trim() === '';
        return isCritical && isNotProcessed;
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setCriticalPoints(criticals);
      
      if (criticals.length > 0) {
        if (onCriticalDetected) onCriticalDetected(criticals);
        
        // Find points that haven't been notified yet (using unique location identifier)
        const newUnnotifiedPoints = criticals.filter(item => !notifiedIds.has(getLocId(item)));
        
        if (newUnnotifiedPoints.length > 0) {
          // Notify about the absolute single latest unnotified one (newUnnotifiedPoints is sorted descending by date)
          sendBrowserNotification(newUnnotifiedPoints[0]);
          
          // Update notified IDs state and localStorage
          const updatedIds = new Set(notifiedIds);
          newUnnotifiedPoints.forEach(item => updatedIds.add(getLocId(item)));
          
          setNotifiedIds(updatedIds);
          localStorage.setItem('pcqn_notified_critical_locs', JSON.stringify(Array.from(updatedIds)));

          if (canShowPopup) {
            setShowPopup(true);
          }
        }
      } else {
        if (onCriticalDetected) onCriticalDetected([]);
        setShowPopup(false);
      }
    } catch (error) {
      console.error('Error scanning for critical points:', error);
    }
  }, [gasUrl, notifiedIds, onCriticalDetected, canShowPopup]);

  const sendBrowserNotification = (item: ThermalData) => {
    if (!("Notification" in window)) return;

    const title = "CẢNH BÁO NGUY CẤP MỚI";
    const options = {
      body: `${item.stationName}: ${item.deviceLocation} - ${item.measuredTemp}°C`,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      vibrate: [200, 100, 200]
    };

    if (Notification.permission === "granted") {
      // Try to use service worker registration if available for better mobile support
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(title, options);
        });
      } else {
        new Notification(title, options);
      }
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          sendBrowserNotification(item);
        }
      });
    }
  };

  useEffect(() => {
    // Initial check
    checkCritical();
    
    // Set up notification permission on mount
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    // Interval check every 5 minutes
    const interval = setInterval(checkCritical, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [checkCritical]);

  if (criticalPoints.length === 0) return null;

  return (
    <AnimatePresence>
      {showPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowPopup(false)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white rounded-[40px] shadow-2xl border border-rose-100 overflow-hidden max-w-sm w-full"
          >
            <div className="bg-[#FF1A4D] px-8 py-6 flex items-center justify-between relative">
              <div className="flex items-center gap-3 text-white">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <span className="font-black text-lg uppercase tracking-tight italic">CẢNH BÁO KHẨN CẤP</span>
              </div>
              <button 
                onClick={() => setShowPopup(false)}
                className="text-white/80 hover:text-white p-1 hover:bg-white/10 rounded-full transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <p className="text-slate-800 text-[15px] font-bold leading-relaxed text-center sm:text-left">
                Hệ thống phát hiện <span className="text-[#FF1A4D] font-black">{criticalPoints.length}</span> vị trí khiếm khuyết mức <span className="text-[#FF1A4D] font-black uppercase">Nguy cấp</span> chưa được xử lý.
              </p>
              
              <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                {criticalPoints.map((p, i) => (
                  <div key={i} className="flex flex-col p-4 bg-[#F8FAFC] rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-start gap-4 mb-2">
                      <span className="font-black text-slate-800 text-[13px] uppercase leading-tight line-clamp-2 flex-1">
                        {p.stationName}
                      </span>
                      <span className="text-[#FF1A4D] font-black text-[11px] whitespace-nowrap">
                        {new Date(p.date).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                    <span className="text-slate-500 text-[11px] font-medium leading-tight">
                      {p.deviceLocation} - {p.phase} - {p.measuredTemp}°C
                    </span>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => setShowPopup(false)}
                className="w-full py-5 bg-[#FFF1F2] hover:bg-[#FFE4E6] text-[#FF1A4D] rounded-3xl font-black text-[13px] uppercase tracking-widest transition-all shadow-sm active:scale-[0.98] border border-rose-100/50"
              >
                TÔI ĐÃ HIỂU
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default NotificationScanner;
