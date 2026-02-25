
import React, { useState } from 'react';
import { ViewState, ThermalData } from './types';
import Login from './components/Login';
import ThermalForm from './components/ThermalForm';
import DataViewer from './components/DataViewer';
import Dashboard from './components/Dashboard';
import ActionPlanEditor from './components/ActionPlanEditor';
import FeederManager from './components/FeederManager';
import { submitThermalData, fetchThermalData } from './services/gasService';

const GAS_URL = "https://script.google.com/macros/s/AKfycbyOyJpnPbCDrtr6HfVqR83oMRPDxRzfT0f37ZxY4t9oM-uZNEtt2IL2qo9Hw4HOGtCQ1A/exec"; 

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>(ViewState.LOGIN);
  const [userUnit, setUserUnit] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning', text: string } | null>(null);

  const handleLogin = (unit: string) => {
    setUserUnit(unit);
    setView(ViewState.FORM);
  };

  const handleSubmit = async (data: ThermalData): Promise<boolean> => {
    setIsSubmitting(true);
    setMessage(null);
    
    const result = await submitThermalData(GAS_URL, data);
    
    setIsSubmitting(false);
    if (result.success) {
      setMessage({ type: 'success', text: "Đã đồng bộ dữ liệu thành công lên hệ thống!" });
      setTimeout(() => setMessage(null), 5000);
      return true;
    } else {
      setMessage({ type: 'error', text: result.message });
      return false;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-8 px-4 font-sans text-slate-900">
      <div className="max-w-xl w-full">
        <header className="mb-8 text-center">
          <div className="inline-flex items-center justify-center p-3.5 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl mb-4 shadow-lg shadow-blue-200">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div className="flex flex-col items-center gap-1">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 leading-tight">
              QNPC <span className="text-blue-600">Smart Thermal</span>
            </h1>
            <div className="flex items-center gap-2">
              <span className="bg-blue-100 text-blue-700 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">Chuyển đổi số</span>
              <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
              <p className="text-slate-500 text-[10px] font-medium uppercase tracking-tight">Sổ tay Camera nhiệt thông minh</p>
            </div>
          </div>
        </header>

        {message && (
          <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 border shadow-sm transition-all animate-fadeIn ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
            'bg-rose-50 text-rose-700 border-rose-100'
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${message.type === 'success' ? 'bg-emerald-100' : 'bg-rose-100'}`}>
              {message.type === 'success' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              )}
            </div>
            <span className="text-sm font-bold">{message.text}</span>
          </div>
        )}

        {view === ViewState.LOGIN && <Login onLogin={handleLogin} />}

        {view === ViewState.FORM && (
          <div className="space-y-4">
            <div className="bg-white px-5 py-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700 font-black text-sm">
                  {userUnit.charAt(0)}
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">Cán bộ từ đơn vị</p>
                  <p className="font-bold text-slate-800 text-sm leading-none">{userUnit}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setView(ViewState.LOGIN)} 
                  className="text-[10px] font-bold text-rose-500 uppercase px-3 py-2 bg-rose-50 rounded-lg active:scale-95 transition-all"
                >
                  Đăng xuất
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <button 
                onClick={() => setView(ViewState.FEEDER_MANAGER)}
                className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center gap-2 hover:bg-slate-50 transition-colors group"
              >
                <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                </div>
                <span className="text-[8px] font-black uppercase text-slate-600 text-center leading-tight">QL Xuất tuyến</span>
              </button>
              <button 
                onClick={() => setView(ViewState.ACTION_PLAN_EDITOR)}
                className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center gap-2 hover:bg-slate-50 transition-colors group"
              >
                <div className="w-9 h-9 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </div>
                <span className="text-[8px] font-black uppercase text-slate-600 text-center leading-tight">Kế hoạch XL</span>
              </button>
              <button 
                onClick={() => setView(ViewState.DATA_VIEWER)}
                className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center gap-2 hover:bg-slate-50 transition-colors group"
              >
                <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <span className="text-[8px] font-black uppercase text-slate-600 text-center leading-tight">Xem kết quả</span>
              </button>
              <button 
                onClick={() => setView(ViewState.DASHBOARD)}
                className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center gap-2 hover:bg-slate-50 transition-colors group"
              >
                <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>
                </div>
                <span className="text-[8px] font-black uppercase text-slate-600 text-center leading-tight">Thống kê</span>
              </button>
            </div>

            <ThermalForm unit={userUnit} gasUrl={GAS_URL} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
          </div>
        )}

        {view === ViewState.DATA_VIEWER && (
          <DataViewer gasUrl={GAS_URL} currentUnit={userUnit} onBack={() => setView(ViewState.FORM)} />
        )}

        {view === ViewState.DASHBOARD && (
          <Dashboard gasUrl={GAS_URL} currentUnit={userUnit} onBack={() => setView(ViewState.FORM)} />
        )}

        {view === ViewState.ACTION_PLAN_EDITOR && (
          <ActionPlanEditor gasUrl={GAS_URL} currentUnit={userUnit} onBack={() => setView(ViewState.FORM)} />
        )}

        {view === ViewState.FEEDER_MANAGER && (
          <FeederManager unit={userUnit} gasUrl={GAS_URL} onBack={() => setView(ViewState.FORM)} />
        )}

        <footer className="mt-10 text-center space-y-2">
          <p className="text-slate-400 text-[10px] font-bold tracking-widest uppercase">
            © 2026 Phòng Kỹ thuật - QNPC
          </p>
        </footer>
      </div>
    </div>
  );
};

export default App;
