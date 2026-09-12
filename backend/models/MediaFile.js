import mongoose from 'mongoose'

// [OMEGA-VIDEO ДОП-2] учёт загруженных медиа-файлов для TTL авто-очистки и счётчика хранилища.
// Результат анализа (текст/таймкоды/план) живёт в сообщениях чата и НЕ удаляется —
// здесь трекается только сам файл на диске.
// deleteAt = null → TTL 0: файл удаляется сразу после успешного разбора (в роуте анализа).
// Сирота = файл на диске без записи MediaFile (или запись stored без анализа старше суток) —
// удаляется кроном mediaCleanup с логом владельцу.
const mediaFileSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        url: { type: String, required: true, unique: true }, // /uploads/<userId>/<file>
        sizeBytes: { type: Number, default: 0 },
        kind: { type: String, enum: ['video', 'image', 'other'], default: 'other' },
        analyzedAt: { type: Date, default: null }, // факт успешного разбора
        deleteAt: { type: Date, default: null, index: true }, // null = удалён сразу после разбора / без TTL
        status: { type: String, enum: ['stored', 'deleted'], default: 'stored', index: true },
        deletedAt: { type: Date, default: null },
    },
    { timestamps: true }
)

const MediaFile = mongoose.models.MediaFile || mongoose.model('MediaFile', mediaFileSchema)
export default MediaFile
