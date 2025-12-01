
import React, { useState } from 'react';
import { ProductInput } from '../types';

interface Props {
  onAddProduct: (product: ProductInput) => void;
  disabled: boolean;
}

export const ProductForm: React.FC<Props> = ({ onAddProduct, disabled }) => {
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [imageCount, setImageCount] = useState(5);
  const [enableVeo, setEnableVeo] = useState(false);
  const [veoCount, setVeoCount] = useState(3);
  const [enablePrompts, setEnablePrompts] = useState(false);
  const [promptCount, setPromptCount] = useState(10);
  const [gender, setGender] = useState<'male' | 'female'>('female');
  const [region, setRegion] = useState<'north' | 'south'>('south');
  const [channelName, setChannelName] = useState('');
  
  // New Fields
  const [language, setLanguage] = useState('Vietnamese');
  const [tiktokLink, setTiktokLink] = useState('');
  const [shopeeLink, setShopeeLink] = useState('');
  const [websiteLink, setWebsiteLink] = useState('');

  // Advanced Settings State
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [textModel, setTextModel] = useState('gemini-2.5-flash');
  const [imageModel, setImageModel] = useState('gemini-2.5-flash-image');
  const [videoModel, setVideoModel] = useState('veo-3.1-fast-generate-preview');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImages(Array.from(e.target.files));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (images.length === 0) return;

    onAddProduct({
      id: crypto.randomUUID(),
      description,
      images,
      imageCount,
      enableVeo,
      veoCount: enableVeo ? veoCount : 0,
      enablePrompts,
      promptCount: enablePrompts ? promptCount : 0,
      voiceGender: gender,
      voiceRegion: region,
      channelName: channelName.trim(),
      language,
      affiliateLinks: {
        tiktok: tiktokLink.trim(),
        shopee: shopeeLink.trim(),
        website: websiteLink.trim()
      },
      apiKey: apiKey.trim(),
      textModel,
      imageModel,
      videoModel
    });

    // Reset basics but keep settings
    setDescription('');
    setImages([]);
    setImageCount(5);
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-2xl backdrop-blur-sm shadow-xl">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span className="text-cyan-400">⚡</span> Thêm Sản Phẩm Mới
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Images */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Hình ảnh gốc (Chọn 1 hoặc nhiều)</label>
          <div className="relative group">
            <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                disabled={disabled}
                className="w-full text-sm text-slate-400
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-indigo-900/50 file:text-indigo-300
                hover:file:bg-indigo-900/80 cursor-pointer
                border border-slate-700 rounded-xl p-1 focus:outline-none focus:border-cyan-500"
            />
            {images.length > 0 && (
                <div className="absolute top-2 right-2 bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full font-bold">
                    Đã chọn {images.length}
                </div>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Mô tả sản phẩm</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={disabled}
            placeholder="Ví dụ: Giày sneaker nam, êm chân, thoáng khí, phù hợp chạy bộ..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
            rows={3}
            required
          />
        </div>

        {/* Channel Name */}
        <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Tên kênh / Bản quyền (Watermark)</label>
            <input
            type="text"
            value={channelName}
            onChange={(e) => setChannelName(e.target.value)}
            disabled={disabled}
            placeholder="Ví dụ: ShopGiayDep, @MyChannel..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none placeholder:text-slate-600"
            />
        </div>

        {/* Language & Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {/* Language Selection */}
           <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Ngôn ngữ kịch bản</label>
            <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                disabled={disabled}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
            >
                <option value="Vietnamese">Tiếng Việt</option>
                <option value="English">Tiếng Anh (English)</option>
                <option value="Korean">Tiếng Hàn (한국어)</option>
                <option value="Chinese">Tiếng Trung (中文)</option>
                <option value="Japanese">Tiếng Nhật (日本語)</option>
                <option value="Thai">Tiếng Thái (ไทย)</option>
                <option value="Lao">Tiếng Lào (Lao)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Số lượng ảnh (Max 10)</label>
            <input
              type="number"
              min={1}
              max={10}
              value={imageCount}
              onChange={(e) => setImageCount(Number(e.target.value))}
              disabled={disabled}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white text-center focus:ring-2 focus:ring-cyan-500 focus:outline-none"
            />
          </div>
        </div>
        
        {/* Affiliate Links Section */}
        <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50 mt-2">
            <h3 className="text-xs font-bold text-slate-400 mb-2 uppercase flex items-center gap-1">
                <span>🔗</span> Link Tiếp Thị (Tự động chèn)
            </h3>
            <div className="space-y-2">
                <input
                    type="text"
                    value={tiktokLink}
                    onChange={(e) => setTiktokLink(e.target.value)}
                    disabled={disabled}
                    placeholder="Link TikTok Shop (Optional)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                />
                <input
                    type="text"
                    value={shopeeLink}
                    onChange={(e) => setShopeeLink(e.target.value)}
                    disabled={disabled}
                    placeholder="Link Shopee (Optional)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                />
                <input
                    type="text"
                    value={websiteLink}
                    onChange={(e) => setWebsiteLink(e.target.value)}
                    disabled={disabled}
                    placeholder="Link Website (Optional)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                />
            </div>
        </div>

        <div>
             {/* Veo Toggle */}
             <div className={`flex items-center justify-between mb-1 mt-4 p-2 rounded-xl border transition-colors ${enableVeo ? 'bg-purple-900/20 border-purple-500/50' : 'bg-slate-900 border-slate-700'}`}>
                <div className="flex-1">
                    <label className="text-sm font-medium text-slate-300 cursor-pointer select-none" htmlFor="veo-toggle">
                    Tạo Video Veo (AI)
                    </label>
                    {enableVeo && <span className="block text-[10px] text-purple-400 font-semibold mt-0.5">⚠️ Cần Key Trả Phí</span>}
                </div>
                <input 
                    id="veo-toggle"
                    type="checkbox" 
                    checked={enableVeo}
                    onChange={(e) => setEnableVeo(e.target.checked)}
                    disabled={disabled}
                    className="w-5 h-5 accent-purple-500 cursor-pointer"
                />
             </div>
        </div>

        {enableVeo && (
             <div className="animate-fade-in-down border-l-2 border-purple-500 pl-4 mt-2">
                <label className="block text-sm font-medium text-purple-300 mb-1">Số lượng phân cảnh Video</label>
                <div className="flex items-center gap-2">
                    <input
                        type="number"
                        min={1}
                        max={50}
                        value={veoCount}
                        onChange={(e) => setVeoCount(Number(e.target.value))}
                        disabled={disabled}
                        className="w-20 bg-slate-900 border border-purple-500/50 rounded-xl p-2 text-white text-center focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                    <span className="text-xs text-slate-400">cảnh liên tục (Storyboard)</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 italic">
                    *Hệ thống sẽ tạo ra {veoCount} video nối tiếp nhau thành một câu chuyện hoàn chỉnh.
                </p>
            </div>
        )}

        {/* Prompts Toggle */}
        <div className="mt-4">
             <div className="flex items-center justify-between mb-1 bg-slate-900 p-2 rounded-xl border border-slate-700">
                <label className="text-sm font-medium text-slate-300 cursor-pointer select-none flex-1" htmlFor="prompt-toggle">
                   Tạo Text Prompt Video (Tùy chọn)
                </label>
                <input 
                    id="prompt-toggle"
                    type="checkbox" 
                    checked={enablePrompts}
                    onChange={(e) => setEnablePrompts(e.target.checked)}
                    disabled={disabled}
                    className="w-5 h-5 accent-emerald-500 cursor-pointer"
                />
             </div>
             
             {enablePrompts && (
                <div className="mt-2 animate-fade-in-down">
                    <label className="block text-sm font-medium text-emerald-300 mb-1">Số lượng Prompt (Không giới hạn)</label>
                    <input
                        type="number"
                        min={1}
                        max={100}
                        value={promptCount}
                        onChange={(e) => setPromptCount(Number(e.target.value))}
                        disabled={disabled}
                        className="w-full bg-slate-900 border border-emerald-500/50 rounded-xl p-2 text-white text-center focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                </div>
             )}
        </div>

        <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Giọng đọc</label>
                <div className="flex bg-slate-900 rounded-xl p-1 border border-slate-700">
                <button
                    type="button"
                    onClick={() => setGender('female')}
                    className={`flex-1 py-1 rounded-lg text-sm transition-colors ${gender === 'female' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                    Nữ
                </button>
                <button
                    type="button"
                    onClick={() => setGender('male')}
                    className={`flex-1 py-1 rounded-lg text-sm transition-colors ${gender === 'male' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                    Nam
                </button>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Vùng miền (VN only)</label>
                <div className="flex bg-slate-900 rounded-xl p-1 border border-slate-700">
                <button
                    type="button"
                    onClick={() => setRegion('south')}
                    className={`flex-1 py-1 rounded-lg text-sm transition-colors ${region === 'south' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                    Nam
                </button>
                <button
                    type="button"
                    onClick={() => setRegion('north')}
                    className={`flex-1 py-1 rounded-lg text-sm transition-colors ${region === 'north' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                    Bắc
                </button>
                </div>
            </div>
        </div>

        {/* --- ADVANCED SETTINGS TOGGLE --- */}
        <div className="mt-6 border-t border-slate-700 pt-4">
            <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-400 transition-colors w-full"
            >
                <span>{showAdvanced ? '▼' : '►'}</span>
                <span className="font-bold">Cấu hình API & Model (Nâng cao)</span>
            </button>

            {showAdvanced && (
                <div className="mt-4 space-y-4 animate-fade-in bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                    
                    {/* API Key Input */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">
                            API Key (Tùy chọn)
                        </label>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            disabled={disabled}
                            placeholder="Nhập Google API Key của bạn (nếu có)..."
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-white focus:border-cyan-500 focus:outline-none placeholder:text-slate-600 font-mono"
                        />
                        <p className="text-[10px] text-slate-500 mt-1">
                            *Nếu để trống, hệ thống sẽ yêu cầu chọn Key qua popup (cho Veo) hoặc dùng mặc định.
                        </p>
                    </div>

                    {/* Text Model */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">
                            Text & Script Model
                        </label>
                        <select
                            value={textModel}
                            onChange={(e) => setTextModel(e.target.value)}
                            disabled={disabled}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                        >
                            <option value="gemini-2.5-flash">Gemini 2.5 Flash (Nhanh - Free)</option>
                            <option value="gemini-3-pro-preview">Gemini 3 Pro (Thông minh - Paid/Free)</option>
                        </select>
                    </div>

                    {/* Image Model */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">
                            Image Generation Model
                        </label>
                        <select
                            value={imageModel}
                            onChange={(e) => setImageModel(e.target.value)}
                            disabled={disabled}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                        >
                            <option value="gemini-2.5-flash-image">Gemini 2.5 Flash Image (Nhanh - Free)</option>
                            <option value="gemini-3-pro-image-preview">Gemini 3 Pro Image (Chất lượng cao - Paid)</option>
                        </select>
                    </div>

                    {/* Video Model */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">
                            Video Generation Model (Veo)
                        </label>
                        <select
                            value={videoModel}
                            onChange={(e) => setVideoModel(e.target.value)}
                            disabled={disabled}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                        >
                            <option value="veo-3.1-fast-generate-preview">Veo 3.1 Fast (Tốc độ cao)</option>
                            <option value="veo-3.1-generate-preview">Veo 3.1 High Quality (Ultra - Chất lượng cao)</option>
                        </select>
                        <p className="text-[10px] text-slate-500 mt-1">
                            *Model Veo yêu cầu tài khoản Google Cloud có trả phí (Billing enabled).
                        </p>
                    </div>
                </div>
            )}
        </div>

        <button
          type="submit"
          disabled={disabled || images.length === 0 || !description}
          className="w-full py-3 mt-4 bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transform hover:translate-y-[-1px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {disabled ? 'Đang xử lý...' : 'Bắt đầu chiến dịch'}
        </button>
      </form>
    </div>
  );
};
