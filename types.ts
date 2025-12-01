
export interface ProductInput {
  id: string;
  images: File[];
  description: string;
  imageCount: number; // Max 10 for Ad Images
  enableVeo: boolean;
  veoCount: number; // Unlimited scenes (e.g., up to 50)
  enablePrompts: boolean; // Generate text prompts
  promptCount: number; // Unlimited prompts (e.g., up to 50)
  voiceGender: 'male' | 'female';
  voiceRegion: 'south' | 'north';
  channelName: string; // Watermark text
  
  // New Fields
  language: string;
  affiliateLinks: {
    tiktok?: string;
    shopee?: string;
    website?: string;
  };
  
  // Advanced Configuration Fields
  apiKey?: string; // Optional custom API Key
  textModel: string;
  imageModel: string;
  videoModel: string;
}

export interface GeneratedAsset {
  type: 'image' | 'video' | 'audio' | 'slideshow' | 'text';
  url: string;
  name: string;
  sceneIndex?: number; // 0 for intro, 1 for body, 2 for cta
}

export interface CampaignPlan {
  script: string;
  visualPrompts: string[];
  socialCaption: string; // Short caption for social sharing
}

export interface ProductResult {
  id: string;
  status: 'idle' | 'processing' | 'completed' | 'error';
  progressMessage?: string;
  assets: GeneratedAsset[];
  campaignPlan?: CampaignPlan;
  customPrompts?: string[]; // List of generated prompts
}

export enum ProcessingStep {
  INIT = 'Khởi tạo',
  PLANNING = 'Lên kế hoạch kịch bản & hình ảnh...',
  GENERATING_PROMPTS = 'Đang viết câu lệnh Video (Prompts)...',
  GENERATING_AUDIO = 'Đang thu âm giọng đọc...',
  GENERATING_IMAGES = 'Đang thiết kế ảnh quảng cáo...',
  RENDERING_SLIDESHOW = 'Đang dựng video Slideshow...',
  GENERATING_VIDEO_SCENE = 'Đang dựng video Veo phân cảnh...',
  COMPLETED = 'Hoàn tất',
  FAILED = 'Thất bại'
}
