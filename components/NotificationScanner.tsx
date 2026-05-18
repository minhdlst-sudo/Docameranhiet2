
import React, { useState, useEffect, useCallback } from 'react';
import { ThermalData } from '../types';
import { fetchThermalData } from '../services/gasService';
import { Bell, AlertCircle, X, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NotificationScannerProps {
  gasUrl: string;
  onCriticalDetected?: (points: ThermalData[]) => void;
}

const NotificationScanner: React.FC<NotificationScannerProps> = ({ gasUrl, onCriticalDetected }) => {
  const [criticalPoints, setCriticalPoints] = useState<ThermalData[]>([]);
  const [showPopup, setShowPopup] = useState(false);
  const [lastNotifiedCount, setLastNotifiedCount] = useState(0);

  const checkCritical = useCallback(async () => {
    try {
      const data = await fetchThermalData(gasUrl);
      const criticals = data.filter(item => {
        const measured = Number(item.measuredTemp);
        const ref = Number(item.referenceTemp);
        const diff = measured - ref;
        const isCritical = measured > 75 || diff > 15;
        const isNotProcessed = !item.processedDate || item.processedDate.trim() === '';
        return isCritical && isNotProcessed;
      });

      setCriticalPoints(criticals);
      
      if (criticals.length > 0) {
        if (onCriticalDetected) onCriticalDetected(criticals);
        
        // Show browser notification if count increased
        if (criticals.length > lastNotifiedCount) {
          sendBrowserNotification(criticals.length);
          setShowPopup(true);
          setLastNotifiedCount(criticals.length);
        }
      } else {
        if (onCriticalDetected) onCriticalDetected([]);
        setShowPopup(false);
        setLastNotifiedCount(0);
      }
    } catch (error) {
      console.error('Error scanning for critical points:', error);
    }
  }, [gasUrl, lastNotifiedCount, onCriticalDetected]);

  const sendBrowserNotification = (count: number) => {
    if (!("Notification" in window)) return;

    if (Notification.permission === "granted") {
      new Notification("CẢNH BÁO NGUY CẤP", {
        body: `Phát hiện ${count} vị trí có nhiệt độ bất thường chưa được xử lý!`,
        icon: "/favicon.ico"
      });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          sendBrowserNotification(count);
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
        <motion.div 
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className="fixed bottom-6 left-6 right-6 sm:left-auto sm:right-6 sm:w-80 z-[100]"
        >
          <div className="bg-white rounded-3xl shadow-2xl border-2 border-rose-100 overflow-hidden">
            <div className="bg-rose-500 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <ShieldAlert className="w-5 h-5 animate-pulse" />
                <span className="font-black text-xs uppercase tracking-widest">Cảnh báo khẩn cấp</span>
              </div>
              <button 
                onClick={() => setShowPopup(false)}
                className="text-white/70 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5">
              <p className="text-slate-600 text-sm font-bold leading-relaxed mb-4">
                Hệ thống phát hiện <span className="text-rose-600 font-black">{criticalPoints.length}</span> vị trí khiếm khuyết mức <span className="text-rose-600">Nguy cấp</span> chưa được xử lý.
              </p>
              <div className="space-y-2 mb-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {criticalPoints.map((p, i) => (
                  <div key={i} className="flex flex-col p-2 bg-slate-50 rounded-xl border border-slate-100 text-[10px]">
                    <span className="font-black text-slate-800 uppercase truncate">{p.stationName}</span>
                    <span className="text-slate-500 truncate">{p.deviceLocation} - {p.phase} - {p.measuredTemp}°C</span>
                  </div>
                ))}
              </div>
              <button 
                onClick={() => setShowPopup(false)}
                className="w-full py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors"
              >
                Tôi đã hiểu
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NotificationScanner;
