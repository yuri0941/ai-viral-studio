// [HOTFIX-FINAL] Диагностика ЮKassa: активные ключи (маскированно), ShopID, режим.
// Секреты НЕ выводятся — только префикс/суффикс и длина.
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(path.join(ROOT, 'backend', 'package.json'))
process.env.NODE_ENV = process.env.NODE_ENV || 'development'

const mask = (s) => {
  const v = String(s || '')
  if (!v) return '(пусто)'
  if (v.length <= 10) return `${v.slice(0, 3)}… len=${v.length}`
  return `${v.slice(0, 7)}…${v.slice(-4)} len=${v.length}`
}

async function main() {
  const mongoose = require('mongoose')
  const envText = fs.readFileSync(path.join(ROOT, 'backend', '.env'), 'utf8')
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI
    || envText.match(/^\s*MONGODB_URI=(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, '')
    || envText.match(/^\s*MONGO_URI=(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, '')
  if (!uri) throw new Error('MONGODB_URI не найден')
  await mongoose.connect(uri)
  const { getProviderKey } = await import(pathToFileURL(path.join(ROOT, 'backend', 'services', 'aiService.js')).href)
  const shopId = await getProviderKey('yookassa_shop_id')
  const secret = await getProviderKey('yookassa_secret')
  console.log('shopId:', mask(shopId))
  console.log('secret:', mask(secret))
  console.log('режим:', String(secret || '').startsWith('live_') ? 'LIVE' : String(secret || '').startsWith('test_') ? 'TEST' : 'неизвестен')
  console.log('suffix O730 совпадает:', String(secret || '').endsWith('O730') ? 'да' : 'нет')
  await mongoose.disconnect()
  process.exit(0)
}
main().catch((e) => { console.error('FAIL', e.message); process.exit(1) })
