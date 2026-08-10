import mongoose from 'mongoose';
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
    if (exists) {
      // [v9.9.19-MASTER-AUDIT] сброс пароля: раньше пароль хешировался дважды (скрипт + pre-save hook)
      exists.password = acc.password;
      await exists.save();
      const ok = await exists.comparePassword(acc.password);
      console.log(`${ok ? '✅' : '❌'} ${acc.email} — пароль сброшен, verify=${ok}`);
      continue;
    }
    // НЕ хешируем вручную — pre-save hook модели User сделает это сам
    const user = await User.create({ ...acc, isTestAccount: true, subscription: 'agency', preferences: { language: 'ru', theme: 'dark' } });
    const ok = await user.comparePassword(acc.password);
    console.log(`${ok ? '✅' : '❌'} ${acc.email} | ${acc.password} | verify=${ok}`);
  }
  console.log('\n🎉 Тестовые аккаунты готовы.');
  await mongoose.disconnect(); process.exit(0);
}
createTestAccounts();
