import mongoose from 'mongoose';
import { User } from '../models/index.js';
import { connectDB } from '../config/database.js';

await connectDB();

async function remove() {
  const r = await User.deleteMany({ isTestAccount: true });
  console.log(`🗑️ Удалено тестовых: ${r.deletedCount}`);
  await mongoose.disconnect(); process.exit(0);
}
remove();
