import { findBannedWord } from '../services/moderationService.js'

const re = /с[^\p{L}]*п[^\p{L}]*м/iu
console.log('direct regex:', re.test('СП4М здесь'), re.test('сп4м'), re.test('СПАМ'))

const words = ['спам', 'мат', 'ссылки', 'тестбан']
const cases = ['это спам!', 'СП4М здесь', 'с п а м', 'ссы*лки тут', 'нормальный текст', 'спамер', 'как дела', 'тестбан слово', 'ТЕСТБАН']
for (const c of cases) console.log(JSON.stringify(c), '→', findBannedWord(c, words))
process.exit(0)
