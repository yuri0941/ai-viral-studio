import { createNode } from './cognitiveMesh.js';

const FINANCE_ENTRIES = []; // в продакшене — MongoDB collection

export async function addIncome({ amount, source, description, date = new Date() }, ownerId) {
  const entry = {
    id: `fin-${Date.now()}`,
    type: 'income',
    amount: Number(amount) || 0,
    source,
    description,
    date: new Date(date),
    ownerId
  };
  FINANCE_ENTRIES.push(entry);
  await createNode({
    type: 'system',
    content: `Income recorded: ${entry.amount}₽ from ${source}`,
    confidence: 1,
    source: 'finance_service',
    metadata: { entry, type: 'income_recorded' }
  });
  return entry;
}

export async function addExpense({ amount, category, description, date = new Date() }, ownerId) {
  const entry = {
    id: `fin-${Date.now()}`,
    type: 'expense',
    amount: Number(amount) || 0,
    category,
    description,
    date: new Date(date),
    ownerId
  };
  FINANCE_ENTRIES.push(entry);
  await createNode({
    type: 'system',
    content: `Expense recorded: ${entry.amount}₽ for ${category}`,
    confidence: 1,
    source: 'finance_service',
    metadata: { entry, type: 'expense_recorded' }
  });
  return entry;
}

export function getMonthlyReport(year, month, ownerId) {
  const entries = FINANCE_ENTRIES.filter(e => {
    const d = new Date(e.date);
    return d.getFullYear() === year && d.getMonth() + 1 === month && String(e.ownerId) === String(ownerId);
  });
  const income = entries.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);
  const expenses = entries.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0);
  const npdRate = 0.04; // 4% для самозанятого от физлиц
  const tax = Math.round(income * npdRate);
  const profit = income - expenses - tax;
  return { income, expenses, tax, profit, entries };
}

export function getYearlyForecast(ownerId) {
  const now = new Date();
  const months = [];
  for (let i = 0; i < 12; i++) {
    const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const report = getMonthlyReport(m.getFullYear(), m.getMonth() + 1, ownerId);
    months.push({ month: m.getMonth() + 1, year: m.getFullYear(), ...report });
  }
  const avgIncome = months.reduce((sum, m) => sum + m.income, 0) / 12 || 0;
  const forecast = avgIncome * 12;
  return { months: months.reverse(), avgIncome, forecast, totalTax: months.reduce((sum, m) => sum + m.tax, 0) };
}

export function getTaxReminder() {
  const today = new Date();
  const day = today.getDate();
  if (day === 25) {
    return { urgent: true, message: '⚠️ СЕГОДНЯ крайний срок оплаты НПД!' };
  }
  if (day >= 20 && day < 25) {
    return { urgent: true, message: 'Напоминание: пора заплатить НПД за этот месяц (до 25-го числа)!' };
  }
  return { urgent: false, message: 'Налоги в порядке. Следующий платёж — до 25-го числа.' };
}
