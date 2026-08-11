import axios from 'axios'
import { getProviderKey } from './aiService.js'

const VK_TOKEN_HOST = process.env.VK_TOKEN_HOST || 'id.vk.ru'

export async function getVkCreds() {
  return {
    clientId: (await getProviderKey('vk')) || process.env.VK_APP_ID || process.env.VK_CLIENT_ID,
    clientSecret: (await getProviderKey('vk_secret')) || process.env.VK_APP_SECRET || process.env.VK_CLIENT_SECRET,
  }
}

export async function refreshVkToken(refreshToken, deviceId) {
  const { clientId } = await getVkCreds()
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    refresh_token: refreshToken,
  })
  if (deviceId) params.append('device_id', deviceId)

  const res = await axios.post(`https://${VK_TOKEN_HOST}/oauth2/auth`, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 15000,
  })
  return res.data
}

export function isVkTokenExpired(expiresAt) {
  if (!expiresAt) return false
  return new Date(expiresAt).getTime() - Date.now() < 60 * 1000
}
