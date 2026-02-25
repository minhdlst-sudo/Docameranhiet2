
import React, { useState } from 'react';
import { UNIT_PASSWORDS } from '../constants';
import { Lock, ChevronDown, LogIn } from 'lucide-react';

interface LoginProps {
  onLogin: (unit: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [selectedUnit, setSelectedUnit] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const units = Object.keys(UNIT_PASSWORDS).sort();

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedUnit) {
      setError('Vui lòng chọn đơn vị công tác');
      return;
    }

    if (!password) {
      setError('Vui lòng nhập mật khẩu');
      return;
    }

    const correctPassword = UNIT_PASSWORDS[selectedUnit];
    if (password === correctPassword) {
      onLogin(selectedUnit);
    } else {
      setError('Mật khẩu không chính xác');
    }
  };

  return (
    <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 animate-fadeIn">
      <div className="text-center mb-8">
        <h2 className="text-xl font-black text-slate-800 mb-2 uppercase tracking-tight">Đăng nhập hệ thống</h2>
        <p className="text-slate-500 text-xs font-medium">Vui lòng chọn đơn vị và nhập mật khẩu</p>
      </div>
      
      <form onSubmit={handleLoginSubmit} className="space-y-5">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Đơn vị công tác</label>
          <div className="relative">
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-slate-700 text-sm cursor-pointer"
            >
              <option value="" disabled>-- Chọn đơn vị --</option>
              {units.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mật khẩu truy cập</label>
          <div className="relative">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full p-4 pl-12 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-slate-700 text-sm"
            />
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <Lock className="w-4 h-4" />
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2 animate-fadeIn">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
            <p className="text-[11px] font-bold text-rose-600">{error}</p>
          </div>
        )}

        <button
          type="submit"
          className="w-full p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-blue-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <LogIn className="w-4 h-4" />
          <span>Đăng nhập</span>
        </button>
      </form>
    </div>
  );
};

export default Login;
