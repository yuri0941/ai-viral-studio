import { Schema, model } from 'mongoose';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.API_KEY_MASTER_SECRET || 'default-master-key-32-chars-long!!'; // должен быть 32 байта
const IV_LENGTH = 16;

function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
  const parts = text.split(':');
  const iv = Buffer.from(parts.shift(), 'hex');
  const encrypted = parts.join(':');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

const externalApiKeySchema = new Schema({
  provider: { type: String, enum: ['replicate','elevenlabs','openai_whisper','openai'], required: true, unique: true },
  encryptedKey: { type: String, required: true },
  isActive: { type: Boolean, default: false },
  lastVerifiedAt: Date,
  lastError: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

externalApiKeySchema.methods.getDecryptedKey = function() { return decrypt(this.encryptedKey); };
externalApiKeySchema.statics.setKey = async function(provider, key) {
  const encrypted = encrypt(key);
  await this.findOneAndUpdate(
    { provider }, 
    { encryptedKey: encrypted, isActive: true, lastVerifiedAt: new Date(), updatedAt: new Date() }, 
    { upsert: true, new: true }
  );
};

export default model('ExternalApiKey', externalApiKeySchema);
export { encrypt, decrypt };
