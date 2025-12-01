
import React, { useState, useCallback } from 'react';
import ApiKeySelector from './components/ApiKeySelector';
import { ProductForm } from './components/ProductForm';
import { ProductResultCard } from './components/ProductResultCard';
import { ProductInput, ProductResult, GeneratedAsset, ProcessingStep, CampaignPlan } from './types';
import { 
  generateCampaignPlan,
  generateAudio, 
  generateAdImage, 
  generateVeoVideo,
  generateCustomVideoPrompts
} from './services/geminiService';
import { renderSlideshowVideo } from './utils/videoRenderer';
import { fileToBase64 } from './utils/fileUtils';

const App: React.FC = () => {
  const [showPaidKeyModal, setShowPaidKeyModal] = useState(false);
  const [pendingProduct, setPendingProduct] = useState<ProductInput | null>(null);

  const [products, setProducts] = useState<Map<string, ProductInput>>(new Map());
  const [results, setResults] = useState<Map<string, ProductResult>>(new Map());
  const [processingQueue, setProcessingQueue] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Logic to add product to queue
  const queueProduct = (input: ProductInput) => {
    setProducts(prev => new Map(prev).set(input.id, input));
    setResults(prev => new Map(prev).set(input.id, {
      id: input.id,
      status: 'idle',
      assets: []
    }));
    setProcessingQueue(prev => [...prev, input.id]);
  };

  // Handle Form Submit
  const handleAddProduct = async (input: ProductInput) => {
    // If user provided a Custom API Key manually, we trust it and skip the AI Studio flow.
    if (input.apiKey && input.apiKey.length > 0) {
        queueProduct(input);
        return;
    }

    // Otherwise, fallback to checking environment for Veo specific requests
    if (input.enableVeo) {
        const win = window as any;
        let hasKey = false;
        if (win.aistudio && await win.aistudio.hasSelectedApiKey()) {
            hasKey = true;
        }

        if (!hasKey) {
            // Prompt user for key
            setPendingProduct(input);
            setShowPaidKeyModal(true);
            return;
        }
    }

    // If no Veo or Key already present, proceed immediately
    queueProduct(input);
  };

  const handleKeySelected = () => {
      setShowPaidKeyModal(false);
      if (pendingProduct) {
          queueProduct(pendingProduct);
          setPendingProduct(null);
      }
  };

  const handleKeyCanceled = () => {
      setShowPaidKeyModal(false);
      setPendingProduct(null);
  };

  // Process the queue
  const processQueue = useCallback(async () => {
    if (isProcessing || processingQueue.length === 0) return;

    setIsProcessing(true);
    const productId = processingQueue[0];
    const input = products.get(productId);

    if (!input) {
      setProcessingQueue(prev => prev.slice(1));
      setIsProcessing(false);
      return;
    }

    const updateStatus = (msg: string, step?: ProcessingStep) => {
      setResults(prev => {
        const current = prev.get(productId)!;
        return new Map(prev).set(productId, {
            ...current,
            status: 'processing',
            progressMessage: step || msg
        });
      });
    };

    try {
      const assets: GeneratedAsset[] = [];
      let customPrompts: string[] = [];
      
      // Use Custom API Key if provided, else undefined (service falls back to env)
      const apiKey = input.apiKey;

      // 1. Plan Campaign (Script + Visual Prompts)
      updateStatus(`Lập kế hoạch nội dung (${input.language})...`, ProcessingStep.PLANNING);
      const plan: CampaignPlan = await generateCampaignPlan(
          input.description,
          input.language,
          input.affiliateLinks,
          input.voiceRegion, 
          input.voiceGender,
          input.enableVeo ? input.veoCount : 0, // Pass requested video count
          apiKey,
          input.textModel
      );
      
      setResults(prev => {
        const current = prev.get(productId)!;
        return new Map(prev).set(productId, { ...current, campaignPlan: plan });
      });

      // 1.5 Generate Custom Prompts
      if (input.enablePrompts && input.promptCount > 0) {
        updateStatus('Đang viết câu lệnh Video (Prompts)...', ProcessingStep.GENERATING_PROMPTS);
        customPrompts = await generateCustomVideoPrompts(
            input.description, 
            input.promptCount, 
            input.voiceRegion, 
            input.voiceGender,
            apiKey,
            input.textModel
        );
        const promptContent = customPrompts.join('\n\n========================================\n\n');
        const promptBlob = new Blob([promptContent], { type: 'text/plain' });
        const promptUrl = URL.createObjectURL(promptBlob);
        assets.push({
            type: 'text',
            url: promptUrl,
            name: `Video_Prompts_${productId}.txt`
        });
      }

      // 2. Audio Generation (TTS)
      updateStatus('Thu âm giọng đọc...', ProcessingStep.GENERATING_AUDIO);
      const audioUrl = await generateAudio(plan.script, input.voiceGender, apiKey);
      assets.push({ type: 'audio', url: audioUrl, name: `voiceover_${productId}.wav` });

      // 3. Ad Images Generation
      updateStatus('Thiết kế ảnh quảng cáo...', ProcessingStep.GENERATING_IMAGES);
      let generatedImages: GeneratedAsset[] = [];
      const imagesToUse = Math.min(input.imageCount, 10);
      
      for (let i = 0; i < imagesToUse; i++) {
        const sourceImage = input.images[i % input.images.length];
        const suffix = `Variation ${i + 1}`;
        try {
            updateStatus(`Đang tạo ảnh ${i + 1}/${imagesToUse}...`, ProcessingStep.GENERATING_IMAGES);
            const url = await generateAdImage(
                sourceImage, 
                suffix, 
                input.channelName,
                apiKey,
                input.imageModel
            );
            generatedImages.push({ type: 'image', url, name: `ad_image_${productId}_${i+1}.png` });
        } catch (e) {
            console.warn(`Skipped image ${i+1} due to error`, e);
        }
      }
      
      // SAFETY NET: If AI fails to generate ANY images, use original images
      if (generatedImages.length === 0) {
          console.warn("AI Image generation failed completely. Using original images for slideshow.");
          updateStatus('Sử dụng ảnh gốc làm thay thế...', ProcessingStep.GENERATING_IMAGES);
          
          const originalAssets: GeneratedAsset[] = await Promise.all(input.images.map(async (file, idx) => {
              const base64 = await fileToBase64(file);
              return {
                  type: 'image' as const,
                  url: `data:${file.type};base64,${base64}`,
                  name: `original_image_${productId}_${idx+1}.png`
              };
          }));
          generatedImages = originalAssets;
      }

      assets.push(...generatedImages);

      // 4. Render Slideshow Video (Client-side)
      if (generatedImages.length > 0) {
        updateStatus('Dựng video Slideshow...', ProcessingStep.RENDERING_SLIDESHOW);
        const imageUrls = generatedImages.map(a => a.url);
        try {
            const { url: slideshowUrl, extension } = await renderSlideshowVideo(
            imageUrls, 
            audioUrl, 
            input.description,
            input.channelName
            );
            assets.push({
                type: 'slideshow',
                url: slideshowUrl,
                name: `slideshow_${productId}.${extension}`
            });
        } catch (renderError) {
             console.error("Slideshow render failed", renderError);
        }
      }

      // 5. Veo Video Generation (Optional)
      // Removed limitation of 3 videos. Now respects input.veoCount fully.
      if (input.enableVeo && input.veoCount > 0) {
        const count = input.veoCount;

        for (let i = 0; i < count; i++) {
          updateStatus(`Dựng video Veo phân cảnh ${i + 1}/${count}...`, ProcessingStep.GENERATING_VIDEO_SCENE);
          const sourceImg = input.images[i % input.images.length];
          // Use prompt from plan, or fallback to generic
          const prompt = plan.visualPrompts[i] || `Scene ${i+1}: Cinematic product showcase of ${input.description}`;
          
          try {
            const videoUrl = await generateVeoVideo(
                sourceImg, 
                prompt,
                apiKey,
                input.videoModel
            );
            assets.push({ 
              type: 'video', 
              url: videoUrl, 
              name: `veo_scene_${i+1}_${productId}.mp4`,
              sceneIndex: i 
            });
          } catch (videoError) {
            console.error(`Failed to generate veo scene ${i+1}`, videoError);
            // Don't fail the whole process, just log
          }
        }
      }

      // Finalize
      setResults(prev => new Map(prev).set(productId, {
        id: productId,
        status: 'completed',
        assets,
        campaignPlan: plan,
        customPrompts
      }));

    } catch (error: any) {
      console.error(error);
      setResults(prev => new Map(prev).set(productId, {
        id: productId,
        status: 'error',
        progressMessage: error.message || 'Lỗi không xác định. Vui lòng thử lại.',
        assets: []
      }));
    } finally {
      setProcessingQueue(prev => prev.slice(1));
      setIsProcessing(false);
    }
  }, [isProcessing, processingQueue, products]);

  // Watch for queue changes
  React.useEffect(() => {
    if (processingQueue.length > 0 && !isProcessing) {
      processQueue();
    }
  }, [processingQueue, isProcessing, processQueue]);


  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 selection:bg-cyan-500/30">
      <ApiKeySelector 
        isOpen={showPaidKeyModal} 
        onSuccess={handleKeySelected} 
        onClose={handleKeyCanceled}
      />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Header */}
        <header className="mb-10 text-center relative">
            <div className="absolute inset-0 flex items-center justify-center -z-10 opacity-30">
                <div className="w-64 h-64 bg-cyan-500/30 rounded-full blur-[100px]"></div>
                <div className="w-64 h-64 bg-purple-500/30 rounded-full blur-[100px] -translate-x-12"></div>
            </div>
          <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent tracking-tight">
            AffiliateAI Web3
          </h1>
          <p className="text-slate-400 text-lg">Hệ thống tạo Video & Content tiếp thị liên kết tự động</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Input Form */}
        <div className="lg:col-span-4">
            <div className="sticky top-8">
            <ProductForm onAddProduct={handleAddProduct} disabled={isProcessing && processingQueue.length >= 3} />
            
            {/* Stats / Queue Info */}
            <div className="mt-6 bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                <div className="flex justify-between items-center text-sm text-slate-400 mb-2">
                    <span>Hàng chờ xử lý:</span>
                    <span className="font-mono text-cyan-400 font-bold">{processingQueue.length}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-slate-400">
                    <span>Đã hoàn thành:</span>
                    <span className="font-mono text-green-400 font-bold">
                        {Array.from(results.values()).filter((r: ProductResult) => r.status === 'completed').length}
                    </span>
                </div>
            </div>
            </div>
        </div>

        {/* Right: Results Grid */}
        <div className="lg:col-span-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span className="text-purple-400">❖</span> Danh sách chiến dịch
            </h2>
            
            <div className="space-y-6">
                {Array.from(results.values())
                    .reverse() // Show newest first
                    .map((result: ProductResult) => (
                    <ProductResultCard 
                        key={result.id} 
                        result={result} 
                        description={products.get(result.id)?.description || ''} 
                    />
                ))}
                
                {results.size === 0 && (
                    <div className="border-2 border-dashed border-slate-700 rounded-2xl p-12 text-center text-slate-500">
                        Chưa có sản phẩm nào. Hãy thêm sản phẩm để bắt đầu.
                        <br/>
                        <span className="text-sm text-slate-600 mt-2 block">Dùng miễn phí trọn đời cho Slideshow & Content. Veo Video cần Key trả phí.</span>
                    </div>
                )}
            </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default App;
