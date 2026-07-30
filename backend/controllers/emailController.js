import {
  sendEmail,
  getEmailStatus,
  sendVerificationEmail,
  sendPasswordReset,
  sendPaymentSuccess,
  sendTrialEnding,
  sendSubscriptionCanceled,
  sendRefundRequest,
  sendNewTicket,
} from '../services/emailService.js';

export const getStatus = async (req, res) => {
  return res.json({ success: true, status: getEmailStatus() });
};

export const sendTestEmail = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const email = req.user?.email || req.body?.email;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    if (!email) return res.status(400).json({ success: false, error: 'Email not found' });

    const result = await sendEmail({
      to: email,
      subject: 'Тестовое письмо — AI Viral Studio',
      text: 'Это тестовое письмо. Если вы видите его — SMTP настроен корректно.',
      html: `<p>Это тестовое письмо. Если вы видите его — SMTP настроен корректно.</p>`,
    });

    return res.json(result);
  } catch (err) {
    console.error('[emailController:sendTestEmail]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const triggerTrialEndingEmail = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { Subscription } = await import('../models/index.js');
    const User = (await import('../models/User.js')).default;

    const subscription = await Subscription.findOne({ userId, status: 'trialing' }).sort({ createdAt: -1 }).lean();
    const user = await User.findById(userId).lean();

    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const result = await sendTrialEnding(user, subscription || { trialEndsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) });
    return res.json(result);
  } catch (err) {
    console.error('[emailController:triggerTrialEndingEmail]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const triggerSubscriptionCanceledEmail = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { Subscription } = await import('../models/index.js');
    const User = (await import('../models/User.js')).default;

    const subscription = await Subscription.findOne({ userId, status: 'canceled' }).sort({ createdAt: -1 }).lean();
    const user = await User.findById(userId).lean();

    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const result = await sendSubscriptionCanceled(user, subscription || { endDate: new Date() });
    return res.json(result);
  } catch (err) {
    console.error('[emailController:triggerSubscriptionCanceledEmail]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const triggerRefundRequestEmail = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const User = (await import('../models/User.js')).default;
    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const result = await sendRefundRequest(user, req.body?.reason);
    return res.json(result);
  } catch (err) {
    console.error('[emailController:triggerRefundRequestEmail]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Re-export helpers for use in other controllers
export {
  sendVerificationEmail,
  sendPasswordReset,
  sendPaymentSuccess,
  sendTrialEnding,
  sendSubscriptionCanceled,
  sendRefundRequest,
  sendNewTicket,
};
