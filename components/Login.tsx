
import React, { useState } from 'react';

interface LoginProps {
  onLogin: (unit: string) => void;
}

const UNITS = [
  'Điện lực TP. Quảng Ngãi', 'Điện lực Sơn Tịnh', 'Điện lực Bình Sơn', 'Điện lực Lý Sơn',
  'Điện lực Tư Nghĩa', 'Điện lực Nghĩa Hành', 'Điện lực Mộ Đức', 'Điện lực Đức Phổ',
  'Điện lực Ba Tơ', 'Điện lực Sơn Hà', 'Điện lực Trà Bồng',
  'Điện lực TP. Kon Tum', 'Điện lực Đăk Hà', 'Điện lực Đăk Tô', 'Điện lực Ngọc Hồi',
  'Điện lực Đăk Glei', 'Điện lực Sa Thầy', 'Điện lực Kon Rẫy', 'Điện lực Kon Plông',
  'Điện lực Tu Mơ Rông',  'Đội QLVH Lưới điện Cao thế QN', 'Xí nghiệp Dịch vụ Điện lực QN', 'Khối Cơ quan Công ty'
];

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [unit, setUnit] = useState('');
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');

  const handleEnter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unit) {
      setError('Vui lòng chọn đơn vị của bạn');
      return;
    }
    if (passcode === '123456' || passcode === 'qnpc2026') {
      onLogin(unit);
    } else {
      setError('Mã truy cập không chính xác');
    }
  };

  return (
    <div className="bg-white p-8 rounded-[2rem] shadow-2xl shadow-blue-100/50 border border-slate-100 w-full animate-fadeIn">
      <div className="flex flex-col items-center mb-8">
        <h2 className="text-xl font-black text-slate-800 mb-1">Chào mừng</h2>
        <p className="text-slate-400 text-[11px] font-bold uppercase tracking-[0.2em]">Hệ thống QNPC Smart Thermal</p>
      </div>
      
      <form onSubmit={handleEnter} className="space-y-6">
        <div className="space-y-2">
          <label className="block text-[10px] font-black text-slate-400 uppercase ml-1 tracking-wider">Đơn vị công tác</label>
          <select 
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold text-slate-700"
          >
            <option value="">-- Chọn điện lực/đội --</option>
            {UNITS.sort((a, b) => a.localeCompare(b, 'vi')).map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="block text-[10px] font-black text-slate-400 uppercase ml-1 tracking-wider">Mã bảo mật</label>
          <input 
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="Mật mã hệ thống"
            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
          />
        </div>
        {error && (
          <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl text-[11px] font-bold border border-rose-100 flex items-center gap-3">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
            {error}
          </div>
        )}
        <button 
          type="submit"
          className="w-full bg-blue-600 text-white p-4 rounded-2xl font-black hover:bg-blue-700 transform active:scale-[0.98] transition-all shadow-xl shadow-blue-100 mt-2 uppercase tracking-widest text-xs"
        >
          Đăng nhập ngay
        </button>
      </form>
    </div>
  );
};

export default Login;
