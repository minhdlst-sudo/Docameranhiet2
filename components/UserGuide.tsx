
import React from 'react';
import { motion } from 'framer-motion';
import { X, BookOpen, Zap, ClipboardList, Eye, BarChart3, Thermometer } from 'lucide-react';

interface UserGuideProps {
  onClose: () => void;
}

const UserGuide: React.FC<UserGuideProps> = ({ onClose }) => {
  const sections = [
    {
      title: "Nhập dữ liệu đo",
      icon: <Thermometer className="w-5 h-5 text-blue-600" />,
      color: "bg-blue-50",
      content: "Biểu mẫu chính để gửi dữ liệu kiểm tra. Hỗ trợ lấy nhiệt độ môi trường tự động qua GPS và sử dụng AI để phân tích, đưa ra kết luận khiếm khuyết một cách khách quan và nhanh chóng."
    },
    {
      title: "QL Xuất tuyến",
      icon: <Zap className="w-5 h-5 text-indigo-600" />,
      color: "bg-indigo-50",
      content: "Quản lý danh mục các xuất tuyến thuộc đơn vị. Bạn có thể thêm mới hoặc xóa các xuất tuyến để danh sách chọn trong biểu mẫu đo luôn chính xác và gọn gàng."
    },
    {
      title: "Kế hoạch xử lý",
      icon: <ClipboardList className="w-5 h-5 text-orange-600" />,
      color: "bg-orange-50",
      content: "Theo dõi các vị trí có nhiệt độ bất thường (Delta T >= 15°C). Tại đây, bạn cập nhật nội dung kế hoạch khắc phục, ngày đã xử lý và nhiệt độ đo lại sau khi xử lý."
    },
    {
      title: "Xem kết quả",
      icon: <Eye className="w-5 h-5 text-emerald-600" />,
      color: "bg-emerald-50",
      content: "Tra cứu toàn bộ lịch sử dữ liệu đo của đơn vị. Hỗ trợ lọc theo mức độ cảnh báo, tìm kiếm nhanh và tải dữ liệu về file CSV để báo cáo."
    },
    {
      title: "Thống kê",
      icon: <BarChart3 className="w-5 h-5 text-blue-600" />,
      color: "bg-blue-50",
      content: "Biểu đồ trực quan về tình hình kiểm tra nhiệt độ. Giúp lãnh đạo nắm bắt nhanh số lượng khiếm khuyết, tỷ lệ đã xử lý và phân bổ cảnh báo theo thời gian."
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-800 leading-none">Hướng dẫn</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Sử dụng ứng dụng</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="w-10 h-10 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl transition-colors flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            {sections.map((section, idx) => (
              <div key={idx} className="p-4 rounded-3xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all group">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-9 h-9 ${section.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    {section.icon}
                  </div>
                  <h3 className="font-black text-slate-700 text-sm uppercase tracking-tight">{section.title}</h3>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  {section.content}
                </p>
              </div>
            ))}
          </div>

          <button 
            onClick={onClose}
            className="w-full mt-8 p-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all active:scale-[0.98]"
          >
            Đã hiểu, bắt đầu thôi!
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default UserGuide;
