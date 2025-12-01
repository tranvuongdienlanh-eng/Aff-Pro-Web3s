
const HOOKS = [
  // --- Nhóm Gây Tò Mò ---
  "KHOAN! DỪNG LẠI 2 GIÂY",
  "BÍ MẬT ĐỘNG TRỜI!",
  "CÁI NÀY HAY CỰC!",
  "KHÔNG XEM LÀ PHÍ",
  "THẬT KHÔNG THỂ TIN NỔI",
  "ĐỪNG LƯỚT QUA VỘI",
  "CÓ THỂ BẠN CHƯA BIẾT?",
  "XEM HẾT SẼ RÕ...",
  "ẢO MA CANADA!",
  "CHUYỆN TÂM LINH ĐẤY!",
  
  // --- Nhóm Giá Trị / Lợi Ích ---
  "SIÊU PHẨM 2024",
  "GIÁ RẺ GIẬT MÌNH",
  "XẢ KHO CỰC MẠNH",
  "DEAL HỜI THẾ KỶ",
  "CHỐT ĐƠN NGAY!",
  "HÀNG HIẾM CÓ KHÓ TÌM",
  "ĐẸP NHỨC NÁCH!",
  "XỊN XÒ CON BÒ CƯỜI",
  "ĐỈNH CỦA CHÓP!",
  "BEST SELLER LÀ ĐÂY",

  // --- Nhóm Cảnh Báo / Cấp Bách ---
  "CẢNH BÁO: QUÁ ĐẸP!",
  "CHỈ CÒN VÀI CÁI!",
  "SẮP CHÁY HÀNG RỒI",
  "CƠ HỘI CUỐI CÙNG",
  "NHANH TAY KẺO LỠ",
  "DUY NHẤT HÔM NAY",
  "SỐC: GIẢM CỰC SÂU",
  
  // --- Nhóm Trend / Gen Z ---
  "10 ĐIỂM KHÔNG CÓ NHƯNG",
  "MÃI ĐỈNH LUÔN Á",
  "CỨU TUI CỨU TUI!",
  "KEO LÌ TÁI CHÂU",
  "OVER HỢP LUÔN",
  "HẾT NƯỚC CHẤM!",
  "U LÀ TRỜI ĐẸP XỈU",
  "GÉT GÔ CHỐT ĐƠN",
  "CHẤN ĐỘNG ĐỊA CẦU",
  
  // --- Nhóm Câu Hỏi ---
  "TẠI SAO LẠI HOT?",
  "TÌM ĐÂU RA GIÁ NÀY?",
  "BẠN ĐÃ CÓ CHƯA?",
  "TIN ĐƯỢC KHÔNG?",
  "AI RỒI CŨNG MÊ THÔI"
];

interface RenderResult {
  url: string;
  extension: string;
}

export const renderSlideshowVideo = async (
  imageUrls: string[],
  audioUrl: string,
  productDescription?: string,
  channelName?: string
): Promise<RenderResult> => {
  return new Promise(async (resolve, reject) => {
    try {
      // 1. Setup Canvas (9:16 aspect ratio, usually 720x1280 is good for mobile)
      const width = 720;
      const height = 1280;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) throw new Error("Could not create canvas context");

      // 2. Load Audio
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioResponse = await fetch(audioUrl);
      const audioArrayBuffer = await audioResponse.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(audioArrayBuffer);
      
      // 3. Load Images
      const loadedImages: HTMLImageElement[] = await Promise.all(
        imageUrls.map(url => new Promise<HTMLImageElement>((res, rej) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => res(img);
          img.onerror = rej;
          img.src = url;
        }))
      );

      if (loadedImages.length === 0) throw new Error("No images to render");

      // --- LOGIC LẶP & SẮP XẾP ẢNH ---
      const duration = audioBuffer.duration;
      // Giảm thời gian mỗi slide xuống 2s để nhanh hơn
      const targetSlideDuration = 2.0; 
      
      let images = [...loadedImages];
      
      // Nhân bản ảnh cho đến khi đủ thời lượng
      while ((images.length * targetSlideDuration) < duration) {
         // Shuffle nhẹ khi nhân bản để tránh lặp lại y chang thứ tự cũ nếu muốn,
         // nhưng ở đây ta giữ nguyên thứ tự rồi nối đuôi để kể chuyện (nếu có thứ tự)
         images = [...images, ...loadedImages];
      }
      
      // Giới hạn tối đa
      if (images.length > 60) images = images.slice(0, 60);

      // Tính lại thời gian chính xác
      const slideDuration = duration / images.length;
      // Thời gian chuyển cảnh (Slide transition) chiếm 20% thời lượng mỗi ảnh
      const transitionDuration = slideDuration * 0.2; 

      // Select a Hook Text randomly
      const hookText = HOOKS[Math.floor(Math.random() * HOOKS.length)];

      // 4. Setup MediaRecorder
      const dest = audioContext.createMediaStreamDestination();
      const canvasStream = canvas.captureStream(30); // 30 FPS
      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...dest.stream.getAudioTracks()
      ]);

      // Priority list for MIME types
      const mimeTypes = [
        'video/mp4;codecs=avc1,aac',
        'video/mp4',
        'video/webm;codecs=h264',
        'video/webm;codecs=vp9',
        'video/webm'
      ];

      let selectedMimeType = '';
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedMimeType = mime;
          break;
        }
      }
      if (!selectedMimeType) selectedMimeType = 'video/webm';

      const recorder = new MediaRecorder(combinedStream, {
        mimeType: selectedMimeType,
        videoBitsPerSecond: 5000000
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: selectedMimeType });
        const url = URL.createObjectURL(blob);
        audioContext.close();
        resolve({
            url,
            extension: selectedMimeType.includes('mp4') ? 'mp4' : 'webm'
        });
      };

      // 5. Drawing Helpers
      
      // Hàm vẽ ảnh với hiệu ứng Zoom (Ken Burns)
      const drawImageWithZoom = (img: HTMLImageElement, offsetX: number, progress: number, isEven: boolean) => {
         const scaleBase = Math.max(width / img.width, height / img.height);
         // Zoom nhẹ nhàng: Slide chẵn Zoom In, Slide lẻ Zoom Out
         let zoomFactor = 1.0;
         if (isEven) {
             zoomFactor = 1.0 + (progress * 0.1); // Zoom In 10%
         } else {
             zoomFactor = 1.1 - (progress * 0.1); // Zoom Out từ 110% về 100%
         }

         const finalScale = scaleBase * zoomFactor;
         
         // Center crop logic
         const drawW = img.width * finalScale;
         const drawH = img.height * finalScale;
         const x = (width - drawW) / 2 + offsetX; // Cộng thêm offsetX cho hiệu ứng trượt
         const y = (height - drawH) / 2;

         ctx.drawImage(img, 0, 0, img.width, img.height, x, y, drawW, drawH);
      };

      // Hàm vẽ Vignette (Tối 4 góc)
      const drawVignette = () => {
        const gradient = ctx.createRadialGradient(width/2, height/2, width/3, width/2, height/2, height);
        gradient.addColorStop(0, "transparent");
        gradient.addColorStop(1, "rgba(0,0,0,0.4)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      };

      // Hàm vẽ Watermark
      const drawWatermark = () => {
        if (channelName) {
            ctx.save();
            ctx.font = "bold 24px 'Space Grotesk', sans-serif";
            ctx.textAlign = "right";
            ctx.textBaseline = "bottom";
            const padX = 30, padY = 30;
            ctx.shadowColor = "rgba(0,0,0,1)";
            ctx.shadowBlur = 4;
            ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
            ctx.fillText(`@${channelName}`, width - padX, height - padY);
            ctx.restore();
        }
      };

      // Hàm vẽ Hook
      const drawHook = (elapsed: number) => {
         if (elapsed < 3.5) { // Hiện lâu hơn chút (3.5s)
            ctx.save();
            ctx.shadowColor = "black";
            ctx.shadowBlur = 15;
            ctx.shadowOffsetX = 4;
            ctx.shadowOffsetY = 4;
            
            // Font Impact to bự
            ctx.font = "900 75px 'Arial Black', 'Impact', sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            
            // Gradient màu chữ (Vàng -> Đỏ cam)
            const gradient = ctx.createLinearGradient(0, height/2 - 50, 0, height/2 + 50);
            gradient.addColorStop(0, "#FFFF00"); 
            gradient.addColorStop(0.5, "#FFA500");
            gradient.addColorStop(1, "#FF4500"); 
            ctx.fillStyle = gradient;

            // Xử lý xuống dòng nếu text quá dài
            const words = hookText.split(' ');
            let lines = [];
            if (words.length > 4) {
                const mid = Math.ceil(words.length / 2);
                lines.push(words.slice(0, mid).join(' '));
                lines.push(words.slice(mid).join(' '));
            } else {
                lines.push(hookText);
            }

            const lineHeight = 85;
            const startY = height / 2 - ((lines.length - 1) * lineHeight) / 2;

            lines.forEach((line, i) => {
                const y = startY + (i * lineHeight);
                // Stroke trắng viền ngoài
                ctx.strokeStyle = "white";
                ctx.lineWidth = 4;
                ctx.strokeText(line, width / 2, y);
                // Fill màu
                ctx.fillText(line, width / 2, y);
            });

            // Hiệu ứng nhấp nháy cho text (Flash text)
            if (elapsed % 0.5 < 0.25) {
                ctx.strokeStyle = "#00FFFF"; // Viền xanh cyan nhấp nháy
                ctx.lineWidth = 2;
                lines.forEach((line, i) => {
                    ctx.strokeText(line, width / 2, startY + (i * lineHeight));
                });
            }

            ctx.restore();
         }
      };

      // 6. Animation Loop
      let startTime: number | null = null;
      
      // Bắt đầu
      recorder.start();
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(dest);
      source.start(0);

      const drawFrame = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const elapsed = (timestamp - startTime) / 1000;

        if (elapsed >= duration) {
          recorder.stop();
          return;
        }

        // Background đen
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);

        // Tính toán Slide hiện tại
        const currentSlideIndex = Math.floor(elapsed / slideDuration);
        const nextSlideIndex = (currentSlideIndex + 1) % images.length; // Loop around

        const currentImg = images[currentSlideIndex % images.length];
        const nextImg = images[nextSlideIndex]; // Luôn có ảnh vì ta đã duplicate mảng

        // Thời gian trôi qua trong slide hiện tại (0 -> slideDuration)
        const timeInSlide = elapsed % slideDuration;
        
        // Kiểm tra xem có đang trong giai đoạn chuyển cảnh không
        const timeRemaining = slideDuration - timeInSlide;
        const isTransitioning = timeRemaining < transitionDuration;

        if (isTransitioning) {
            // --- GIAI ĐOẠN CHUYỂN CẢNH (PUSH LEFT) ---
            // Tính % hoàn thành chuyển cảnh (0 -> 1)
            const transitionProgress = 1 - (timeRemaining / transitionDuration);
            // Easing function cho mượt (Ease Out Quad)
            const ease = transitionProgress * (2 - transitionProgress); 
            
            const offsetX = width * ease; // Di chuyển từ 0 đến width

            // Vẽ ảnh hiện tại (đang trôi sang trái)
            // Vẫn giữ tiến độ zoom của nó (gần cuối slide)
            drawImageWithZoom(currentImg, -offsetX, 1.0, currentSlideIndex % 2 === 0);

            // Vẽ ảnh kế tiếp (đang trôi từ phải vào)
            // Tiến độ zoom là 0 (bắt đầu)
            drawImageWithZoom(nextImg, width - offsetX, 0.0, nextSlideIndex % 2 === 0);

        } else {
            // --- GIAI ĐOẠN BÌNH THƯỜNG ---
            // Tính % tiến độ slide (0 -> 1) nhưng scale lại cho khớp đoạn không chuyển cảnh
            const progress = timeInSlide / (slideDuration - transitionDuration);
            
            drawImageWithZoom(currentImg, 0, Math.min(progress, 1), currentSlideIndex % 2 === 0);
        }

        drawVignette();
        drawWatermark();
        drawHook(elapsed);

        requestAnimationFrame(drawFrame);
      };

      requestAnimationFrame(drawFrame);

    } catch (e) {
      reject(e);
    }
  });
};
