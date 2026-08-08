// Crypto Wallet: placeholder для USDT (Polygon) микроплатежей
// Реальная интеграция требует private key + Web3 provider

const BALANCE = {
  usdt: 0,
  lastUpdated: null,
  transactions: []
};

export async function getBalance() {
  return { usdt: BALANCE.usdt, status: 'mock', message: 'Crypto wallet not configured. Add PRIVATE_KEY and RPC_URL to .env' };
}

export async function addFunds(amount, source = 'manual') {
  BALANCE.usdt += amount;
  BALANCE.lastUpdated = new Date();
  BALANCE.transactions.push({ type: 'in', amount, source, date: new Date() });
  return { success: true, newBalance: BALANCE.usdt };
}

export async function payInvoice({ recipient, amount, purpose }) {
  if (BALANCE.usdt < amount) {
    return { success: false, error: 'Insufficient funds', balance: BALANCE.usdt };
  }
  BALANCE.usdt -= amount;
  BALANCE.transactions.push({ type: 'out', amount, recipient, purpose, date: new Date() });
  return { success: true, txHash: `mock-${Date.now()}`, balance: BALANCE.usdt };
}

export async function autoPayServices(services) {
  const results = [];
  for (const svc of services) {
    if (svc.dueAmount > 0) {
      const res = await payInvoice({ recipient: svc.address, amount: svc.dueAmount, purpose: svc.name });
      results.push({ service: svc.name, ...res });
    }
  }
  return results;
}

export function getTransactionHistory(limit = 50) {
  return BALANCE.transactions.slice(-limit);
}
