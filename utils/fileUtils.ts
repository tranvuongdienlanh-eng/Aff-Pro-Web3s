export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const downloadFile = (url: string, filename: string) => {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

export const watermarkImage = (base64Image: string, text: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!text) {
      resolve(base64Image);
      return;
    }

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64Image);
        return;
      }

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Configure Watermark Style
      const fontSize = Math.max(20, Math.floor(img.width * 0.04)); // Responsive font size
      ctx.font = `bold ${fontSize}px "Space Grotesk", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      
      const x = img.width / 2;
      const y = img.height - (fontSize);

      // Draw Shadow/Stroke for readability
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 4;
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.strokeText(`@${text}`, x, y);

      // Draw Text
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'; // White with some transparency
      ctx.fillText(`@${text}`, x, y);

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = (e) => reject(e);
    img.src = base64Image;
  });
};