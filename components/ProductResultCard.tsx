import React, { useState, useRef } from 'react';
import { ProductResult, GeneratedAsset } from '../types';
import { downloadFile } from '../utils/fileUtils';
import JSZip from 'jszip';

interface Props {
  result: ProductResult;
  description: string;
}

export const ProductResultCard: React.FC<Props> = ({ result, description }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Categorize Assets
  const slideshowAsset = result.assets.find(a => a.type === 'slideshow');
  const videoSegments = result.assets.filter(a => a.type === 'video').sort((a, b) => (a.sceneIndex ?? 0) - (b.sceneIndex ?? 0));
  const imageAssets = result.assets.filter(a => a.type === 'image');
  const audioAssets = result.assets.filter(a => a.type === 'audio');
  const textAssets = result.assets.filter(a => a.type === 'text'); // Usually prompts

  // Smart Share Function
  const handleSmartShare = async () => {
      if (isSharing) return;
      setIsSharing(true);
      
      try {
          // Prepare Share Data
          const shareData: any = {
              title: description.substring(0, 50),
              text: result.campaignPlan?.socialCaption || description,
          };

          // Try to attach the main video or first image
          let fileToShare: File | null = null;
          
          if (slideshowAsset) {
              const response = await fetch(slideshowAsset.url);
              const blob = await response.blob();
              const ext = slideshowAsset.name.split('.').pop() || 'mp4';
              // Important: Type must be correct for sharing to work
              fileToShare = new File([blob], `video.${ext}`, { type: blob.type || 'video/mp4' });
          } else if (imageAssets.length > 0) {
              const img = imageAssets[0];
              const response = await fetch(img.url);
              const blob = await response.blob();
              fileToShare = new File([blob], 'image.png', { type: 'image/png' });
          }

          if (fileToShare && navigator.canShare && navigator.canShare({ files: [fileToShare] })) {
              shareData.files = [fileToShare];
          }

          if (navigator.share) {
              await navigator.share(shareData);
          } else {
              // Fallback for desktop/unsupported
              alert("Trình duyệt này chưa hỗ trợ chia sẻ File trực tiếp. Vui lòng tải file xuống và đăng thủ công. \n\nĐã sao chép caption vào bộ nhớ tạm!");
              await navigator.clipboard.writeText(shareData.text);
          }
      } catch (e) {
          console.error("Error sharing", e);
      } finally {
          setIsSharing(false);
      }
  };

  const copyCaption = async () => {
      if (result.campaignPlan?.socialCaption) {
          await navigator.clipboard.writeText(result.campaignPlan.socialCaption);
          alert("Đã sao chép Caption!");
      }
  };

  const handleDownloadAll = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (isZipping) return;
    
    setIsZipping(true);
    const zip = new JSZip();
    const cleanName = description.substring(0, 30).replace(/[^a-z0-9]/gi, '_');
    const rootFolder = zip.folder(`Campaign_${cleanName}`);

    if (!rootFolder) {
        setIsZipping(false);
        return;
    }

    try {
        // Helper to safe fetch and add to zip
        const addFileToZip = async (folderName: string, fileName: string, contentOrUrl: string) => {
            try {
                const folder = rootFolder.folder(folderName);
                if (!folder) return;

                // Check if it's a URL/URI (Blob, Data, or HTTP) that needs fetching
                // Fix: Explicitly check for 'data:' to handle Base64 images correctly
                if (contentOrUrl.startsWith('blob:') || contentOrUrl.startsWith('http') || contentOrUrl.startsWith('data:')) {
                     const response = await fetch(contentOrUrl);
                     const blob = await response.blob();
                     folder.file(fileName, blob);
                } else {
                     // Assume it's Raw Text content (Script, Prompts)
                     folder.file(fileName, contentOrUrl);
                }
            } catch (err) {
                console.error(`Failed to add ${fileName} to zip`, err);
            }
        };

        const promises: Promise<void>[] = [];

        // 1. Slideshow
        if (slideshowAsset) {
            // Ensure extension matches the asset name or defaults to mp4/webm
            const ext = slideshowAsset.name.split('.').pop() || 'mp4';
            promises.push(addFileToZip('Video_Chinh', `Slideshow_${cleanName}.${ext}`, slideshowAsset.url));
        }

        // 2. Veo Videos
        videoSegments.forEach((vid, idx) => {
            promises.push(addFileToZip('Video_Veo_PhanCanh', `Canh_${idx+1}_Veo.mp4`, vid.url));
        });

        // 3. Images
        imageAssets.forEach((img, idx) => {
            promises.push(addFileToZip('Hinh_Anh_Quang_Cao', `Anh_${idx+1}.png`, img.url));
        });

        // 4. Documents (Script & Prompts & Caption)
        if (result.campaignPlan) {
            const scriptContent = `MÔ TẢ SẢN PHẨM: ${description}\n\nKỊCH BẢN (SCRIPT):\n${result.campaignPlan.script}\n\nSOCIAL CAPTION:\n${result.campaignPlan.socialCaption}\n\n------------------\n\nVISUAL PROMPTS (VEO):\n${result.campaignPlan.visualPrompts.join('\n\n')}`;
            promises.push(addFileToZip('Tai_Lieu', 'Kich_Ban_Chi_Tiet.txt', scriptContent));
        }
        
        textAssets.forEach((txt) => {
             promises.push(addFileToZip('Tai_Lieu', txt.name, txt.url));
        });

        // 5. Audio
        audioAssets.forEach((aud) => {
             promises.push(addFileToZip('Am_Thanh', 'Giong_Doc.wav', aud.url));
        });

        await Promise.all(promises);

        const content = await zip.generateAsync({ type: 'blob' });
        const zipUrl = URL.createObjectURL(content);
        downloadFile(zipUrl, `Full_Campaign_${cleanName}.zip`);

    } catch (e) {
        console.error("Error zipping files", e);
        alert("Có lỗi khi tạo file nén. Vui lòng thử tải từng file trong phần Xem Chi Tiết.");
    } finally {
        setIsZipping(false);
    }
  };

  const statusColor = {
    idle: 'bg-slate-700',
    processing: 'bg-amber-600/20 border-amber-500 text-amber-500',
    completed: 'bg-green-600/20 border-green-500 text-green-400',
    error: 'bg-red-600/20 border-red-500 text-red-500',
  };

  const completed = result.status === 'completed';

  // --- MODAL CONTENT ---
  const Modal = () => (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsOpen(false)}></div>
          <div className="bg-slate-900 w-full max-w-6xl max-h-[90vh] rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col relative animate-fade-in-up">
              
              {/* Header */}
              <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                  <div>
                    <h2 className="text-xl font-bold text-white truncate max-w-md">{description}</h2>
                    <p className="text-xs text-slate-400">ID: {result.id}</p>
                  </div>
                  <div className="flex gap-2">
                      <button 
                        onClick={() => handleDownloadAll()}
                        disabled={isZipping}
                        className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-sm font-bold rounded-lg shadow-lg flex items-center gap-2"
                      >
                         {isZipping ? 'Đang nén...' : 'Tải Full ZIP'}
                      </button>
                      <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                      </button>
                  </div>
              </div>

              {/* Content Scrollable */}
              <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 custom-scrollbar">
                  
                  {/* Left Column: Main Visuals */}
                  <div className="lg:col-span-5 space-y-6">
                        {/* Slideshow Player */}
                        {slideshowAsset && (
                            <div className="bg-black rounded-xl overflow-hidden border border-cyan-500/30 shadow-lg relative group">
                                <video 
                                    src={slideshowAsset.url} 
                                    className="w-full aspect-[9/16] object-contain bg-black/50" 
                                    controls 
                                    autoPlay 
                                    loop 
                                />
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2">
                                    <button 
                                        onClick={() => downloadFile(slideshowAsset.url, slideshowAsset.name)}
                                        className="bg-black/60 hover:bg-cyan-600 text-white text-xs px-2 py-1 rounded backdrop-blur-md border border-white/10"
                                    >
                                        ⬇ Tải Video
                                    </button>
                                </div>
                                <div className="absolute bottom-2 left-2 bg-cyan-600/90 text-white text-xs font-bold px-2 py-0.5 rounded">
                                    VIDEO SLIDESHOW
                                </div>
                            </div>
                        )}

                        {/* Social Share Section */}
                        {result.campaignPlan?.socialCaption && (
                            <div className="bg-indigo-900/30 border border-indigo-500/30 rounded-xl p-4">
                                <h3 className="text-indigo-300 font-bold mb-3 flex items-center gap-2">
                                    <span>🚀</span> Chia sẻ Mạng Xã Hội
                                </h3>
                                
                                <div className="bg-slate-900/80 p-3 rounded-lg text-slate-200 text-sm mb-3 border border-slate-700/50">
                                    {result.campaignPlan.socialCaption}
                                </div>

                                <div className="grid grid-cols-2 gap-2 mb-3">
                                    <button 
                                        onClick={handleSmartShare}
                                        disabled={isSharing}
                                        className="col-span-2 py-2 bg-gradient-to-r from-pink-500 to-orange-400 hover:from-pink-400 hover:to-orange-300 text-white font-bold rounded-lg shadow-lg flex justify-center items-center gap-2 transition-all active:scale-95"
                                    >
                                        {isSharing ? 'Đang mở...' : '📱 Chia sẻ Ngay (Kèm Video/Ảnh)'}
                                    </button>
                                    
                                    <button 
                                        onClick={copyCaption}
                                        className="py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold rounded-lg"
                                    >
                                        Copy Caption
                                    </button>
                                     <a 
                                        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent(result.campaignPlan.socialCaption)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="py-2 bg-[#1877F2] hover:bg-[#166fe5] text-white text-xs font-semibold rounded-lg flex justify-center items-center"
                                    >
                                        Facebook (Link)
                                    </a>
                                    <a 
                                        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(result.campaignPlan.socialCaption)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="py-2 bg-black hover:bg-gray-800 text-white text-xs font-semibold rounded-lg flex justify-center items-center border border-slate-600"
                                    >
                                        X / Twitter
                                    </a>
                                    <a 
                                        href={`https://threads.net/intent/post?text=${encodeURIComponent(result.campaignPlan.socialCaption)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="py-2 bg-black hover:bg-gray-800 text-white text-xs font-semibold rounded-lg flex justify-center items-center border border-slate-600"
                                    >
                                        Threads
                                    </a>
                                </div>
                                <p className="text-[10px] text-slate-500 text-center">
                                    *Nút "Chia sẻ Ngay" hỗ trợ tốt nhất trên điện thoại (Facebook, Zalo, Tiktok...)
                                </p>
                            </div>
                        )}

                        {/* Veo Videos Grid */}
                        {videoSegments.length > 0 && (
                            <div>
                                <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                                    <span className="text-purple-400">❖</span> Video Veo (AI)
                                </h3>
                                <div className="grid grid-cols-3 gap-2">
                                    {videoSegments.map((vid, idx) => (
                                        <div key={idx} className="relative group rounded-lg overflow-hidden border border-purple-500/30">
                                            <video src={vid.url} className="w-full aspect-[9/16] object-cover" />
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => downloadFile(vid.url, vid.name)}
                                                    className="bg-purple-600 text-white text-[10px] px-2 py-1 rounded shadow-lg hover:scale-105 transform transition-transform"
                                                >
                                                    Tải về
                                                </button>
                                            </div>
                                            <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[8px] px-1 rounded">
                                                Cảnh {idx + 1}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                  </div>

                  {/* Right Column: Details & Docs */}
                  <div className="lg:col-span-7 space-y-6">
                      
                      {/* Script Section */}
                      {result.campaignPlan && (
                          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                              <div className="flex justify-between items-center mb-2">
                                  <h3 className="text-slate-200 font-bold text-sm">Kịch bản (Script)</h3>
                                  <button 
                                    onClick={() => {
                                        const blob = new Blob([result.campaignPlan!.script], {type: 'text/plain'});
                                        const url = URL.createObjectURL(blob);
                                        downloadFile(url, 'Kich_ban.txt');
                                    }}
                                    className="text-xs text-cyan-400 hover:text-cyan-300 underline"
                                  >
                                      Tải .txt
                                  </button>
                              </div>
                              <div className="bg-slate-900 p-3 rounded-lg text-slate-300 text-sm italic leading-relaxed border border-slate-800 max-h-40 overflow-y-auto">
                                  {result.campaignPlan.script}
                              </div>
                          </div>
                      )}

                      {/* Prompts Section */}
                      {textAssets.length > 0 && (
                          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                              <h3 className="text-slate-200 font-bold text-sm mb-2">File Prompts</h3>
                              <div className="space-y-2">
                                  {textAssets.map((txt, i) => (
                                      <div key={i} className="flex items-center justify-between bg-emerald-900/20 p-2 rounded border border-emerald-900/50">
                                          <div className="flex items-center gap-2">
                                              <span className="text-emerald-500">📄</span>
                                              <span className="text-xs text-emerald-200 truncate max-w-[200px]">{txt.name}</span>
                                          </div>
                                          <button 
                                            onClick={() => downloadFile(txt.url, txt.name)}
                                            className="text-xs bg-emerald-700/50 hover:bg-emerald-600 text-emerald-100 px-2 py-1 rounded"
                                          >
                                              Tải về
                                          </button>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}

                       {/* Audio Section */}
                       {audioAssets.length > 0 && (
                          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                              <h3 className="text-slate-200 font-bold text-sm mb-2">File Ghi Âm</h3>
                              <div className="space-y-2">
                                  {audioAssets.map((aud, i) => (
                                      <div key={i} className="flex items-center justify-between bg-slate-900 p-2 rounded border border-slate-800">
                                          <audio src={aud.url} controls className="h-8 w-64" />
                                          <button 
                                            onClick={() => downloadFile(aud.url, aud.name)}
                                            className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded ml-2"
                                          >
                                              Tải về
                                          </button>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}

                      {/* Images Grid */}
                      <div>
                          <h3 className="text-slate-200 font-bold text-sm mb-3">Hình ảnh quảng cáo ({imageAssets.length})</h3>
                          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
                              {imageAssets.map((img, idx) => (
                                  <div key={idx} className="group relative aspect-square bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
                                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                          <button 
                                            onClick={() => downloadFile(img.url, img.name)}
                                            className="text-white hover:text-cyan-400"
                                          >
                                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                              </svg>
                                          </button>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </div>
  );

  return (
    <>
        <div 
            className={`bg-slate-800 border border-slate-700 rounded-2xl p-6 overflow-hidden relative group shadow-xl transition-all duration-300 ${completed ? 'cursor-pointer hover:border-cyan-500/50 hover:shadow-cyan-500/10' : ''}`}
            onClick={() => completed && setIsOpen(true)}
        >
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -z-0 translate-x-10 -translate-y-10 group-hover:bg-indigo-500/20 transition-all"></div>
            
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-white font-bold text-lg truncate w-full max-w-[300px]" title={description}>
                    {description}
                    </h3>
                    <span className="text-xs text-slate-400 font-mono">ID: {result.id.slice(0, 8)}</span>
                </div>
                <div className={`px-3 py-1 rounded-full border text-xs font-semibold ${statusColor[result.status]}`}>
                    {result.status === 'processing' ? (
                        <span className="animate-pulse">{result.progressMessage || 'Đang xử lý...'}</span>
                    ) : result.status === 'completed' ? 'Hoàn thành' : result.status === 'error' ? 'Lỗi' : 'Chờ'}
                </div>
                </div>

                {/* --- COMPACT PREVIEW (CARD) --- */}
                {result.status === 'completed' && (
                    <div className="space-y-4">
                        {/* Featured Video Preview */}
                        {slideshowAsset && (
                            <div className="w-full aspect-video rounded-xl overflow-hidden bg-black relative border border-slate-700 group/preview">
                                <video 
                                    ref={videoRef}
                                    src={slideshowAsset.url} 
                                    className="w-full h-full object-cover opacity-80 group-hover/preview:opacity-100 transition-opacity"
                                    loop
                                    muted
                                    playsInline
                                    onMouseEnter={(e) => e.currentTarget.play()}
                                    onMouseLeave={(e) => e.currentTarget.pause()}
                                />
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full text-white text-xs font-semibold border border-white/20">
                                        Click xem chi tiết
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        <div className="flex gap-2">
                             <button
                                onClick={handleDownloadAll}
                                disabled={isZipping}
                                className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold rounded-lg transition-colors flex justify-center items-center gap-2"
                             >
                                 {isZipping ? <span className="animate-spin">⏳</span> : '📥 Tải file ZIP'}
                             </button>
                             <button
                                onClick={(e) => { e.stopPropagation(); setIsOpen(true); }}
                                className="px-4 py-2 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-400 rounded-lg text-sm font-semibold border border-cyan-500/30 transition-colors"
                             >
                                 Xem Full
                             </button>
                        </div>
                    </div>
                )}
                
                {result.status === 'error' && (
                    <p className="text-red-400 text-xs mt-2">{result.progressMessage}</p>
                )}
            </div>
        </div>

        {isOpen && <Modal />}
    </>
  );
};