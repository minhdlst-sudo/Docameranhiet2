
import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { getFeedersForUnit, updateFeedersForUnit } from '../services/feederService';
import { fetchFeedersFromSheet, manageFeederOnSheet } from '../services/gasService';

interface FeederManagerProps {
  unit: string;
  gasUrl: string;
  onBack: () => void;
}

const FeederManager: React.FC<FeederManagerProps> = ({ unit, gasUrl, onBack }) => {
  const [feeders, setFeeders] = useState<string[]>([]);
  const [newFeeder, setNewFeeder] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deletedHistory, setDeletedHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

  // Load data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setSyncStatus('syncing');
    
    // 1. Load from local first for immediate UI
    const localData = getFeedersForUnit(unit);
    setFeeders(localData);

    // 2. Try to sync from Google Sheet
    try {
      const remoteLibrary = await fetchFeedersFromSheet(gasUrl);
      if (remoteLibrary) {
        const remoteFeeders = Array.from(new Set(remoteLibrary[unit] || []));
        setFeeders(remoteFeeders);
        updateFeedersForUnit(unit, remoteFeeders);
        setSyncStatus('success');
      } else {
        setSyncStatus('idle');
      }
    } catch (error) {
      console.error('Sync error:', error);
      setSyncStatus('error');
    } finally {
      setIsLoading(false);
    }
  }, [unit, gasUrl]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAdd = async () => {
    const trimmed = newFeeder.trim();
    if (!trimmed) return;
    
    if (feeders.includes(trimmed)) {
      alert('Xuất tuyến này đã tồn tại!');
      return;
    }
    
    setIsLoading(true);
    setSyncStatus('syncing');
    
    try {
      // 1. Update on Google Sheet
      const result = await manageFeederOnSheet(gasUrl, {
        action: 'addFeeder',
        unit: unit.trim(),
        feeder: trimmed
      });

      if (result.success) {
        // 2. Update local state
        const updatedFeeders = [...feeders, trimmed];
        setFeeders(updatedFeeders);
        updateFeedersForUnit(unit, updatedFeeders);
        setNewFeeder('');
        setSyncStatus('success');
      } else {
        alert('Lỗi: ' + result.message);
        setSyncStatus('error');
      }
    } catch (error) {
      alert('Lỗi kết nối máy chủ');
      setSyncStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (feederToDelete: string) => {
    setIsLoading(true);
    setSyncStatus('syncing');

    try {
      // 1. Update on Google Sheet
      const result = await manageFeederOnSheet(gasUrl, {
        action: 'deleteFeeder',
        unit: unit.trim(),
        feeder: feederToDelete.trim()
      });

      if (result.success) {
        // 2. Update local state
        const updated = feeders.filter(f => f !== feederToDelete);
        setFeeders(updated);
        setDeletedHistory(prev => [feederToDelete, ...prev]);
        updateFeedersForUnit(unit, updated);
        setConfirmDelete(null);
        setSyncStatus('success');
      } else {
        alert('Lỗi: ' + result.message);
        setSyncStatus('error');
      }
    } catch (error) {
      alert('Lỗi kết nối máy chủ');
      setSyncStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async (itemToRestore: string) => {
    if (!feeders.includes(itemToRestore)) {
      setIsLoading(true);
      setSyncStatus('syncing');
      try {
        const result = await manageFeederOnSheet(gasUrl, {
          action: 'addFeeder',
          unit: unit.trim(),
          feeder: itemToRestore.trim()
        });
        if (result.success) {
          const updated = [...feeders, itemToRestore];
          setFeeders(updated);
          updateFeedersForUnit(unit, updated);
          setDeletedHistory(prev => prev.filter(item => item !== itemToRestore));
          setSyncStatus('success');
        } else {
          alert('Lỗi khôi phục: ' + result.message);
          setSyncStatus('error');
        }
      } catch (error) {
        alert('Lỗi kết nối máy chủ');
        setSyncStatus('error');
      } finally {
        setIsLoading(false);
      }
    } else {
      setDeletedHistory(prev => prev.filter(item => item !== itemToRestore));
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 animate-fadeIn">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-black text-slate-800">Quản lý Xuất tuyến</h2>
        <div className="flex gap-2">
          <button 
            onClick={loadData}
            disabled={isLoading}
            className={`text-[10px] font-bold uppercase px-3 py-2 rounded-lg transition-all flex items-center gap-1 ${
              syncStatus === 'syncing' ? 'bg-blue-100 text-blue-400' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
            }`}
            title="Đồng bộ với Google Sheet"
          >
            <RefreshCw className={`w-3 h-3 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
            {syncStatus === 'syncing' ? 'Đang đồng bộ...' : 'Đồng bộ'}
          </button>
          {deletedHistory.length > 0 && (
            <button 
              onClick={() => setShowHistory(!showHistory)}
              className={`text-[10px] font-bold uppercase px-3 py-2 rounded-lg transition-all flex items-center gap-1 ${
                showHistory ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
              }`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Lịch sử xóa ({deletedHistory.length})
            </button>
          )}
          <button 
            onClick={onBack} 
            className="text-xs font-bold text-slate-400 uppercase px-3 py-2 hover:bg-slate-50 rounded-lg transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>

      {showHistory && deletedHistory.length > 0 && (
        <div className="mb-6 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 animate-fadeIn">
          <p className="text-[10px] font-black text-emerald-700 uppercase mb-3">Chọn xuất tuyến để khôi phục:</p>
          <div className="flex flex-wrap gap-2">
            {deletedHistory.map((f, idx) => (
              <button
                key={`${f}-${idx}`}
                onClick={() => handleRestore(f)}
                className="bg-white border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-emerald-600 hover:text-white transition-all active:scale-90 flex items-center gap-1 shadow-sm"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                {f}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Đơn vị: {unit}</p>
          {syncStatus !== 'idle' && (
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
              syncStatus === 'syncing' ? 'bg-blue-50 text-blue-600 animate-pulse' :
              syncStatus === 'success' ? 'bg-emerald-50 text-emerald-600' :
              'bg-rose-50 text-rose-600'
            }`}>
              {syncStatus === 'syncing' ? 'Đang đồng bộ...' : 
               syncStatus === 'success' ? 'Đã đồng bộ Sheet' : 'Lỗi đồng bộ'}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <input 
            type="text" 
            disabled={isLoading}
            value={newFeeder}
            onChange={e => setNewFeeder(e.target.value)}
            placeholder="Nhập tên xuất tuyến mới..."
            className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button 
            onClick={handleAdd}
            disabled={isLoading || !newFeeder.trim()}
            className="bg-blue-600 text-white px-6 rounded-xl font-bold text-sm hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
          >
            {isLoading ? '...' : 'Thêm'}
          </button>
        </div>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
        <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Danh sách hiện tại ({feeders.length})</p>
        {feeders.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-slate-400 text-sm italic">Chưa có xuất tuyến nào.</p>
          </div>
        ) : (
          [...feeders].sort((a, b) => a.localeCompare(b, undefined, {numeric: true})).map((f, idx) => (
            <div key={`${f}-${idx}`} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-all overflow-hidden">
              {confirmDelete === f ? (
                <div className="flex items-center justify-between w-full animate-fadeIn">
                  <span className="text-xs font-bold text-rose-600 uppercase">Xác nhận xóa?</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleDelete(f)}
                      disabled={isLoading}
                      className="bg-rose-600 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-lg hover:bg-rose-700 active:scale-90 transition-all disabled:opacity-50"
                    >
                      Xóa
                    </button>
                    <button 
                      onClick={() => setConfirmDelete(null)}
                      disabled={isLoading}
                      className="bg-slate-200 text-slate-600 text-[10px] font-black uppercase px-3 py-1.5 rounded-lg hover:bg-slate-300 active:scale-90 transition-all disabled:opacity-50"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <span className="text-sm font-bold text-slate-700">{f}</span>
                  <button 
                    type="button"
                    onClick={() => setConfirmDelete(f)}
                    className="flex items-center justify-center w-10 h-10 text-rose-500 hover:bg-rose-100 rounded-full transition-all active:scale-75 cursor-pointer"
                    aria-label="Xóa"
                  >
                    <svg className="w-6 h-6 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default FeederManager;
