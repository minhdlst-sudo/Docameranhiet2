
import React, { useState } from 'react';
import { ViewState, ThermalData } from './types';
import Login from './components/Login';
import ThermalForm from './components/ThermalForm';
import { submitThermalData } from './services/gasService';

// Link Script kết nối với Google Sheet
const GAS_URL = "https://script.google.com/macros/s/AKfycbypfttBiCS2KZ0aGEG91K87fIxD4gk4DubxTQELO_GBGrrxGX3cWkw9C1UOWSSQi3_nVA/exec"; 

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
              PCQN <span className="text-blue-600">Smart Thermal</span>
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
              <button 
                onClick={() => setView(ViewState.LOGIN)} 
                className="text-[10px] font-bold text-rose-500 uppercase px-3 py-2 bg-rose-50 rounded-lg active:scale-95 transition-all"
              >
                Đăng xuất
              </button>
            </div>
            <ThermalForm unit={userUnit} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
          </div>
        )}

        <footer className="mt-10 text-center space-y-2">
          <p className="text-slate-400 text-[10px] font-bold tracking-widest uppercase">
            © 2026 Phòng Kỹ thuật - QNPC
          </p>
          <div className="flex justify-center gap-4 opacity-30 grayscale">
            {/* Logo EVNCPC or QNPC Placeholders */}
            <div className="w-6 h-6 bg-slate-400 rounded-full"></div>
            <div className="w-6 h-6 bg-slate-400 rounded-full"></div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;
