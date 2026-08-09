import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/index.js';
import { connectDB } from '../config/database.js';

await connectDB();

const TEST_ACCOUNTS = [
  { name: 'TEST_Staff', email: 'staff.test@aiviral-studio.ru', password: 'TestStaff123!', role: 'staff' },
  { name: 'TEST_Admin', email: 'admin.test@aiviral-studio.ru', password: 'TestAdmin123!', role: 'admin' },
  { name: 'TEST_Creator', email: 'creator.test@aiviral-studio.ru', password: 'TestCreator123!', role: 'creator' },
  { name: 'TEST_Client', email: 'client.test@aiviral-studio.ru', password: 'TestClient123!', role: 'business' },
  { name: 'TEST_Advertiser', email: 'advertiser.test@aiviral-studio.ru', password: 'TestAdvertiser123!', role: 'advertiser' },
];

async function createTestAccounts() {
  for (const acc of TEST_ACCOUNTS) {
    const exists = await User.findOne({ email: acc.email });
    if (exists) { console.log(`⚠️ ${acc.email} уже есть`); continue; }
    const hashed = await bcrypt.hash(acc.password, 10);
    await User.create({ ...acc, password: hashed, isTestAccount: true, subscription: 'agency', preferences: { language: 'ru', theme: 'dark' } });
    console.log(`✅ ${acc.email} | ${acc.password}`);
  }
  console.log('\n🎉 Тестовые аккаунты готовы.');
  await mongoose.disconnect(); process.exit(0);
}
createTestAccounts();
