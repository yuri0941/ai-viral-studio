import { getApiKey, hasApiKey } from './runtimeConfig.js';

const REPLICATE_API_TOKEN = getApiKey('replicate');
const HAS_REPLICATE = hasApiKey('replicate');

export async function createVideoJob({ script, style, duration, userId }) {
  if (!HAS_REPLICATE) {
    return { 
      jobId: `mock-${Date.now()}`,
      status: 'queued',
      estimatedSeconds: 180,
      mock: true,
      message: 'REPLICATE_API_TOKEN не настроен. Видео поставлено в демо-очередь. Добавьте ключ в Owner Dashboard → API Keys.'
    };
  }
  
  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${REPLICATE_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      version: '9f747f4266e03d1b3691a2b1576e5c5c63a531422d162c2a1828c5a0c2519c67',
      input: {
        prompt: script.slice(0, 500),
        num_frames: Math.min(duration * 4, 60),
        fps: 4,
        width: style === 'vertical' ? 576 : 1024,
        height: style === 'vertical' ? 1024 : 576
      }
    })
  });
  
  if (!response.ok) throw new Error(`Replicate error: ${response.status}`);
  const data = await response.json();
  return { jobId: data.id, status: data.status, urls: data.urls, mock: false };
}

// [v9.9.6-KEY-AUDIT-v2] image-to-video fallback via Stable Video Diffusion
export async function generateVideoWithReplicate(prompt) {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) return { error: 'REPLICATE_API_TOKEN not set' };
  const res = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: { Authorization: `Token ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      version: 'stability-ai/stable-video-diffusion:3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b817243',
      input: { image: prompt, num_frames: 25 }
    })
  });
  return await res.json();
}

export async function getVideoStatus(jobId) {
  if (jobId.startsWith('mock-')) {
    const elapsed = Date.now() - parseInt(jobId.split('-')[1]);
    const progress = Math.min(Math.floor(elapsed / 1800), 100);
    const status = progress >= 100 ? 'succeeded' : progress >= 90 ? 'processing' : 'starting';
    return { status, progress, mock: true, videoUrl: null };
  }
  
  const res = await fetch(`https://api.replicate.com/v1/predictions/${jobId}`, {
    headers: { 'Authorization': `Token ${REPLICATE_API_TOKEN}` }
  });
  const data = await res.json();
  return { 
    status: data.status, 
    progress: data.status === 'succeeded' ? 100 : data.status === 'processing' ? 50 : 10,
    videoUrl: data.output?.[0] || data.output || null,
    mock: false
  };
}
