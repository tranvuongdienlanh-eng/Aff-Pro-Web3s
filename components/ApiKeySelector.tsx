import React, { useState } from 'react';

// This component is now a specific Modal to request a Paid Key, 
// rather than a global blocking overlay.

interface ApiKeySelectorProps {
  isOpen: boolean;
  onSuccess: () => void;
  onClose: () => void;
}

const ApiKeySelector: React.FC<ApiKeySelectorProps> = ({ isOpen, onSuccess, onClose }) => {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSelectKey = async () => {
    const win = window as any;
    if (win.aistudio) {
      setLoading(true);
      try {
        await win.aistudio.openSelectKey();
        // Check if successful
        if (await win.aistudio.hasSelectedApiKey()) {
            onSuccess();
        } else {
            // User might have cancelled
            setLoading(false);
        }
      } catch (e) {
        console.error("Error selecting key", e);
        setLoading(false);
      }
    } else {
      // Fallback for dev environments without the specific wrapper
      // We assume if they clicked this in dev, they have env vars set up
      onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-purple-500/50 p-8 rounded-2xl max-w-md w-full text-center shadow-2xl shadow-purple-500/20 relative">
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-500 hover:text-white"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>

        <h2 className="text-2xl font-bold text-white mb-4 flex items-center justify-center gap-2">
           <span className="text-purple-500">❖</span> Mở khóa Veo Video
        </h2>
        <p className="text-slate-300 mb-6 text-sm">
          Bạn đã chọn tính năng tạo Video bằng model <b>Veo 3.1</b>. 
          Tính năng này yêu cầu sử dụng <b>API Key có trả phí</b> từ Google Cloud.
        </p>
        
        <div className="bg-slate-800 p-4 rounded-xl mb-6 text-xs text-slate-400 text-left">
            <p className="mb-2">ℹ️ <b>Lưu ý:</b></p>
            <ul className="list-disc list-inside space-y-1">
                <li>Các tính năng khác (Ảnh, Kịch bản, Slideshow) vẫn <b>Miễn Phí</b>.</li>
                <li>Bạn có thể bỏ chọn "Tạo Video Veo" để không cần nhập Key.</li>
            </ul>
        </div>

        <button
          onClick={handleSelectKey}
          disabled={loading}
          className="w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-purple-500/30 flex justify-center items-center gap-2"
        >
          {loading ? (
             <>
               <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
               Đang kết nối...
             </>
          ) : (
             'Chọn API Key & Tiếp tục'
          )}
        </button>
        
        <div className="mt-4 text-xs text-slate-500">
          <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="hover:text-cyan-400 transition-colors">
            Tìm hiểu về Billing & API Key
          </a>
        </div>
      </div>
    </div>
  );
};

export default ApiKeySelector;