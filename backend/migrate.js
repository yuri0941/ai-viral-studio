import { MongoClient } from 'mongodb'
import dotenv from 'dotenv'

dotenv.config()

const args = process.argv.slice(2)
const shouldDrop = args.includes('--drop')
const positional = args.filter(a => !a.startsWith('--'))

let localUri, atlasUri

if (positional.length === 2) {
  localUri = positional[0]
  atlasUri = positional[1]
} else {
  localUri = process.env.MONGO_LOCAL_URI
  atlasUri = process.env.MONGO_ATLAS_URI
}

if (!localUri || !atlasUri) {
  console.error('❌ Ошибка: не указаны строки подключения.')
  console.error('')
  console.error('Вариант 1 — аргументы командной строки:')
  console.error('  node migrate.js [--drop] <local-uri> <atlas-uri>')
  console.error('')
  console.error('Вариант 2 — переменные окружения в backend/.env:')
  console.error('  MONGO_LOCAL_URI=mongodb://localhost:27017/ai_viral_studio')
  console.error('  MONGO_ATLAS_URI=mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/ai_viral_studio?retryWrites=true&w=majority')
  console.error('')
  console.error('Флаг --drop удаляет целевые коллекции в Atlas перед вставкой (чистая миграция).')
  process.exit(1)
}

async function migrate() {
  const localClient = new MongoClient(localUri)
  const atlasClient = new MongoClient(atlasUri)

  try {
    await localClient.connect()
    await atlasClient.connect()

    console.log('✅ Подключено к локальной БД')
    console.log('✅ Подключено к Atlas')
    console.log('')

    const localDb = localClient.db()
    const atlasDb = atlasClient.db()

    const collections = await localDb.listCollections().toArray()
    const results = []

    for (const colMeta of collections) {
      const name = colMeta.name
      const localCol = localDb.collection(name)
      const atlasCol = atlasDb.collection(name)

      const docs = await localCol.find({}).toArray()

      if (shouldDrop) {
        try {
          await atlasCol.drop()
          console.log(`🗑️  Коллекция "${name}" удалена в Atlas (--drop)`)
        } catch (dropErr) {
          if (dropErr.code !== 26) {
            console.error(`⚠️  Не удалось удалить "${name}": ${dropErr.message}`)
          }
        }
      }

      let inserted = 0
      if (docs.length > 0) {
        try {
          const result = await atlasCol.insertMany(docs, { ordered: false })
          inserted = result.insertedCount
        } catch (insertErr) {
          if (insertErr.writeErrors) {
            inserted = docs.length - insertErr.writeErrors.length
            console.error(`⚠️  Коллекция "${name}": ${insertErr.writeErrors.length} дубликатов пропущено`)
          } else {
            throw insertErr
          }
        }
      }

      results.push({ name, found: docs.length, inserted })
    }

    console.log('')
    console.log('📦 Результат миграции:')
    console.table(results)
    console.log('')
    console.log(`✅ Всего коллекций: ${results.length}`)
    console.log(`✅ Всего документов перенесено: ${results.reduce((sum, r) => sum + r.inserted, 0)}`)
  } finally {
    await localClient.close()
    await atlasClient.close()
    console.log('')
    console.log('🔌 Соединения закрыты')
  }
}

migrate().catch(err => {
  console.error('❌ Ошибка миграции:', err)
  process.exit(1)
})
