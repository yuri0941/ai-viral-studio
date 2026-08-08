import mongoose from 'mongoose'

const TelegramMenuSchema = new mongoose.Schema({
  name: { type: String, required: true }, // "main", "content", "analytics"
  buttons: [{
    text: String,
    callback_data: String,
    url: String, // если external link
    order: Number,
    icon: String, // emoji
    active: { type: Boolean, default: true },
    clickCount: { type: Number, default: 0 }
  }],
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isDefault: { type: Boolean, default: false },
  updatedAt: { type: Date, default: Date.now }
})

export default mongoose.model('TelegramMenu', TelegramMenuSchema)
