import nodemailer from 'nodemailer';
import { OwnerLegalInfo } from '../models/index.js';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || 'no-reply@aiviral.studio';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const OWNER_NAME = process.env.OWNER_NAME || 'AI Viral Studio';
const OWNER_EMAIL = process.env.OWNER_EMAIL || EMAIL_FROM;
const OWNER_ADDRESS = process.env.OWNER_ADDRESS || '';

const isConfigured = !!(SMTP_HOST && SMTP_USER && SMTP_PASS);

let legalCache = null;
let legalCacheAt = 0;
const LEGAL_CACHE_TTL = 60 * 1000; // 1 minute

async function getLegalInfo() {
  try {
    const now = Date.now();
    if (legalCache && now - legalCacheAt < LEGAL_CACHE_TTL) return legalCache;
    const doc = await OwnerLegalInfo.findOne().sort({ updatedAt: -1 }).lean();
    legalCache = {
      operatorName: doc?.operatorName || OWNER_NAME,
      operatorType: doc?.operatorType || 'self_employed',
      contactEmail: doc?.contactEmail || OWNER_EMAIL,
      operatorAddress: doc?.operatorAddress || OWNER_ADDRESS,
      siteUrl: doc?.siteUrl || 'app.aiviral.studio',
    };
    legalCacheAt = now;
    return legalCache;
  } catch (err) {
    console.error('[emailService:getLegalInfo]', err.message);
    return {
      operatorName: OWNER_NAME,
      operatorType: 'self_employed',
      contactEmail: OWNER_EMAIL,
      operatorAddress: OWNER_ADDRESS,
      siteUrl: 'app.aiviral.studio',
    };
  }
}

function baseTemplate({ title, body, legal, footerExtra = '' }) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #111; line-height: 1.5;">
      <div style="background:#0a0a0f;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
        <h2 style="color:#00ff41;margin:0;">AI Viral Studio</h2>
      </div>
      <div style="background:#fff;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e5e5e5;border-top:none;">
        <h3 style="margin-top:0;">${title}</h3>
        ${body}
        <hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0;" />
        <p style="font-size:12px;color:#666;">
          Оператор: ${legal.operatorName}<br />
          По вопросам: <a href="mailto:${legal.contactEmail}">${legal.contactEmail}</a><br />
          Адрес: ${legal.operatorAddress || '—'}<br />
          Сайт: ${legal.siteUrl}
        </p>
        ${footerExtra ? `<p style="font-size:12px;color:#666;">${footerExtra}</p>` : ''}
      </div>
    </div>
  `;
}

function createTransporter() {
  if (!isConfigured) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

export async function sendEmail({ to, subject, text, html, fromName }) {
  if (!to) {
    console.warn('[emailService:sendEmail] No recipient specified');
    return { success: false, error: 'No recipient' };
  }

  const transporter = createTransporter();
  const legal = await getLegalInfo();
  const sender = fromName || legal.operatorName || 'AI Viral Studio';

  if (!transporter) {
    console.warn('[emailService:sendEmail] SMTP not configured. Email would have been sent:');
    console.warn({ to, subject, text: text?.slice(0, 200) });
    return { success: false, configured: false, message: 'SMTP не настроен. Письмо не отправлено.' };
  }

  try {
    const info = await transporter.sendMail({
      from: `"${sender}" <${legal.contactEmail || EMAIL_FROM}>`,
      to,
      subject,
      text: text + `\n\nОператор: ${legal.operatorName}\nПо вопросам: ${legal.contactEmail}\nАдрес: ${legal.operatorAddress || '—'}`,
      html,
    });

    console.log('[emailService:sendEmail] Sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('[emailService:sendEmail]', err.message);
    return { success: false, error: err.message };
  }
}

export async function sendVerificationEmail(user, token, returnUrl = `${FRONTEND_URL}/verify-email`) {
  const legal = await getLegalInfo();
  const url = `${returnUrl}?token=${token}`;
  const subject = 'Подтвердите ваш email — AI Viral Studio';
  const html = baseTemplate({
    legal,
    title: 'Подтверждение email',
    body: `
      <p>Здравствуйте, <strong>${user.name || 'пользователь'}</strong>!</p>
      <p>Вы зарегистрировались в AI Viral Studio. Подтвердите ваш email, нажав кнопку ниже:</p>
      <a href="${url}" style="display:inline-block;padding:12px 24px;background:#00ff41;color:#0a0a0f;text-decoration:none;border-radius:8px;font-weight:bold;">Подтвердить email</a>
      <p style="margin-top:16px;font-size:12px;color:#666;">Ссылка действительна 24 часа. Если вы не регистрировались, проигнорируйте это письмо.</p>
      <p style="font-size:12px;color:#666;">Или скопируйте ссылку: ${url}</p>
    `,
  });

  return sendEmail({ to: user.email, subject, text: `Подтвердите email: ${url}`, html });
}

export async function sendPasswordReset(user, token, returnUrl = `${FRONTEND_URL}/reset-password`) {
  const legal = await getLegalInfo();
  const url = `${returnUrl}?token=${token}`;
  const subject = 'Сброс пароля — AI Viral Studio';
  const html = baseTemplate({
    legal,
    title: 'Сброс пароля',
    body: `
      <p>Здравствуйте, <strong>${user.name || 'пользователь'}</strong>!</p>
      <p>Вы запросили сброс пароля. Нажмите кнопку ниже:</p>
      <a href="${url}" style="display:inline-block;padding:12px 24px;background:#00ff41;color:#0a0a0f;text-decoration:none;border-radius:8px;font-weight:bold;">Сбросить пароль</a>
      <p style="margin-top:16px;font-size:12px;color:#666;">Ссылка действительна 1 час. Если это были не вы — проигнорируйте письмо.</p>
    `,
  });

  return sendEmail({ to: user.email, subject, text: `Сброс пароля: ${url}`, html });
}

export async function sendPaymentSuccess(user, invoice) {
  const legal = await getLegalInfo();
  const subject = `Оплата успешна — ${invoice.description || 'AI Viral Studio'}`;
  const html = baseTemplate({
    legal,
    title: 'Квитанция об оплате',
    body: `
      <p>Здравствуйте, <strong>${user.name || 'пользователь'}</strong>!</p>
      <p>Ваш платёж успешно зачислен. Это квитанция, не фискальный чек.</p>
      <div style="background:#f5f5f5;padding:16px;border-radius:8px;">
        <p>Сумма: <strong>${invoice.amount} ${invoice.currency}</strong></p>
        <p>Описание: ${invoice.description || 'Подписка'}</p>
        <p>Дата: ${new Date().toLocaleDateString('ru-RU')}</p>
      </div>
      <p>Спасибо, что выбрали нас!</p>
    `,
  });

  return sendEmail({ to: user.email, subject, text: `Оплата ${invoice.amount} ${invoice.currency} успешна`, html });
}

export async function sendTrialEnding(user, subscription) {
  const legal = await getLegalInfo();
  const endDate = subscription.trialEndsAt || subscription.endDate;
  const endDateStr = endDate ? new Date(endDate).toLocaleDateString('ru-RU') : 'скоро';
  const subject = 'Триал заканчивается — оформите подписку AI Viral Studio';
  const html = baseTemplate({
    legal,
    title: 'Триал скоро закончится',
    body: `
      <p>Здравствуйте, <strong>${user.name || 'пользователь'}</strong>!</p>
      <p>Ваш пробный период заканчивается <strong>${endDateStr}</strong>.</p>
      <p>Оформите подписку, чтобы не потерять доступ к AI-инструментам:</p>
      <a href="${FRONTEND_URL}/dashboard/finance" style="display:inline-block;padding:12px 24px;background:#00ff41;color:#0a0a0f;text-decoration:none;border-radius:8px;font-weight:bold;">Оформить подписку</a>
    `,
  });

  return sendEmail({ to: user.email, subject, text: `Триал заканчивается ${endDateStr}`, html });
}

export async function sendSubscriptionCanceled(user, subscription) {
  const legal = await getLegalInfo();
  const endDate = subscription.endDate;
  const endDateStr = endDate ? new Date(endDate).toLocaleDateString('ru-RU') : '—';
  const subject = 'Подписка отменена — AI Viral Studio';
  const html = baseTemplate({
    legal,
    title: 'Подписка отменена',
    body: `
      <p>Здравствуйте, <strong>${user.name || 'пользователь'}</strong>!</p>
      <p>Вы отменили подписку. Доступ к функциям сохраняется до <strong>${endDateStr}</strong>.</p>
      <p>Если вы передумаете, можно оформить новую подписку в любой момент.</p>
      <a href="${FRONTEND_URL}/dashboard/finance" style="display:inline-block;padding:12px 24px;background:#00ff41;color:#0a0a0f;text-decoration:none;border-radius:8px;font-weight:bold;">Оформить подписку</a>
    `,
  });

  return sendEmail({ to: user.email, subject, text: `Подписка отменена. Доступ до ${endDateStr}`, html });
}

export async function sendRefundRequest(user, reason) {
  const legal = await getLegalInfo();
  const subject = 'Запрос на возврат средств — AI Viral Studio';
  const html = baseTemplate({
    legal,
    title: 'Запрос на возврат',
    body: `
      <p>Здравствуйте, <strong>${user.name || 'пользователь'}</strong>!</p>
      <p>Мы получили ваш запрос на возврат средств.</p>
      <p><strong>Причина:</strong> ${reason || '—'}</p>
      <p>Мы рассмотрим заявку в течение 5 рабочих дней и свяжемся с вами по указанному email.</p>
      <p>Если у вас есть вопросы, напишите нам: <a href="mailto:${legal.contactEmail}">${legal.contactEmail}</a></p>
    `,
  });

  return sendEmail({ to: user.email, subject, text: 'Запрос на возврат получен. Рассмотрим в течение 5 рабочих дней.', html });
}

export async function sendNewTicket(user, ticket) {
  const legal = await getLegalInfo();
  const subject = `Новый тикет #${ticket._id?.toString().slice(-6)} — ${ticket.subject || 'Обращение'}`;
  const html = baseTemplate({
    legal,
    title: 'Мы получили ваше обращение',
    body: `
      <p>Здравствуйте, <strong>${user.name || 'пользователь'}</strong>!</p>
      <p>Мы получили ваше обращение:</p>
      <div style="background:#f5f5f5;padding:16px;border-radius:8px;">
        <p><strong>Тема:</strong> ${ticket.subject || '—'}</p>
        <p><strong>Статус:</strong> ${ticket.status || 'Открыт'}</p>
      </div>
      <p>Наша команда свяжется с вами в ближайшее время.</p>
    `,
  });

  return sendEmail({ to: user.email, subject, text: 'Мы получили ваше обращение', html });
}

export function getEmailStatus() {
  return {
    configured: isConfigured,
    from: EMAIL_FROM,
    host: SMTP_HOST || null,
    port: SMTP_PORT,
  };
}
