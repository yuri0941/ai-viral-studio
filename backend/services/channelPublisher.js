import axios from 'axios';
import ChannelConfig from '../models/ChannelConfig.js';
import { generatePost } from './channelContentEngine.js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function publishToChannel(configId, forcedType = null, customCaption = null, customImage = null) {
  const config = await ChannelConfig.findById(configId);
  if (!config || !config.active) return { error: 'Config not found or inactive' };

  const post = await generatePost(config, forcedType);

  let imageUrl = customImage;
  if (!imageUrl && config.autoImage) {
    const imgPrompt = `Professional social media visual about ${post.niche}, ${post.emotion}, modern minimalist design, high quality, no text on image, cinematic lighting`;
    imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imgPrompt)}?width=1024&height=1024&seed=${Date.now()}&nologo=true`;
  }

  let caption = customCaption || `<b>${post.title}</b>\n\n${post.body}\n\n<i>${post.cta}</i>${config.brandSignature || ''}\n\n${post.hashtags || ''}`;

  let result;
  try {
    if (imageUrl) {
      const { data } = await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
        chat_id: config.channelId || `@${config.channelUsername}`,
        photo: imageUrl,
        caption,
        parse_mode: 'HTML'
      });
      result = { success: true, messageId: data.result.message_id, post, imageUrl };
    } else {
      const { data } = await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        chat_id: config.channelId || `@${config.channelUsername}`,
        text: caption,
        parse_mode: 'HTML'
      });
      result = { success: true, messageId: data.result.message_id, post, imageUrl: null };
    }
  } catch (e) {
    result = { success: false, error: e.response?.data?.description || e.message, post, imageUrl };
  }

  if (result.success) {
    config.postsHistory.push({ messageId: result.messageId, title: post.title, type: post.type, imageUrl, date: new Date() });
    config.lastPostAt = new Date();
    config.nextPostAt = calculateNextPostTime(config);
    await config.save();
  }

  return result;
}

function calculateNextPostTime(config) {
  const now = new Date();
  const times = (config.postingSchedule?.times || ['09:00', '15:00', '19:00']).map(t => {
    const [h, m] = t.split(':').map(Number);
    const d = new Date(now);
    d.setHours(h, m, 0, 0);
    if (d <= now) d.setDate(d.getDate() + 1);
    return d;
  });
  return times.sort((a, b) => a - b)[0] || new Date(now.getTime() + 24 * 60 * 60 * 1000);
}

export async function getChannelStats(configId) {
  const config = await ChannelConfig.findById(configId);
  if (!config) return null;
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weekPosts = config.postsHistory.filter(p => p.date > weekAgo);
  const totalViews = weekPosts.reduce((a, p) => a + (p.views || 0), 0);
  return {
    subscribers: config.stats.subscribers,
    weekPosts: weekPosts.length,
    totalViews,
    avgViews: Math.round(totalViews / (weekPosts.length || 1)),
    topPost: weekPosts.sort((a, b) => (b.views || 0) - (a.views || 0))[0],
    nextPost: config.nextPostAt
  };
}
