// Auto-Scaler: мониторит цены на серверы, рекомендует миграцию
// Пока placeholder — реальная миграция требует API ключей провайдеров

const PROVIDERS = [
  { name: 'Render', url: 'https://render.com', current: true, costPerMonth: 0 },
  { name: 'AWS Lambda', url: 'https://aws.amazon.com', costPerMonth: 0 },
  { name: 'Hetzner', url: 'https://hetzner.com', costPerMonth: 0 },
  { name: 'Vultr', url: 'https://vultr.com', costPerMonth: 0 },
  { name: 'DigitalOcean', url: 'https://digitalocean.com', costPerMonth: 0 }
];

export async function scanServerPrices() {
  return PROVIDERS.map(p => ({
    ...p,
    estimatedCost: p.current ? 0 : Math.floor(Math.random() * 50 + 10),
    reliability: p.current ? 0.98 : 0.9 + Math.random() * 0.08,
    latency: p.current ? 50 : 30 + Math.random() * 100,
    recommendation: p.current ? 'current' : Math.random() > 0.7 ? 'consider' : 'skip'
  }));
}

export async function evaluateMigration() {
  const prices = await scanServerPrices();
  const current = prices.find(p => p.current);
  const alternatives = prices.filter(p => !p.current && p.recommendation === 'consider');

  if (alternatives.length === 0) {
    return { action: 'stay', reason: 'No better alternatives found', current };
  }

  const best = alternatives.sort((a, b) => a.estimatedCost - b.estimatedCost)[0];

  if (best.estimatedCost < current.estimatedCost * 0.8 && best.reliability > 0.9) {
    return {
      action: 'recommend',
      reason: `${best.name} is ${Math.round((1 - best.estimatedCost / current.estimatedCost) * 100)}% cheaper`,
      target: best,
      current,
      savings: current.estimatedCost - best.estimatedCost
    };
  }

  return { action: 'stay', reason: 'Current provider is optimal', current };
}

export async function autoScaleDecision(metrics) {
  const { cpu, ram, dbConnections, apiLatency, errorRate } = metrics;

  if (cpu > 80 || ram > 85 || apiLatency > 2000 || errorRate > 5) {
    return { action: 'scale_up', reason: 'High load detected', metrics };
  }
  if (cpu < 20 && ram < 30 && apiLatency < 500 && errorRate < 1) {
    return { action: 'scale_down', reason: 'Low utilization', metrics };
  }
  return { action: 'maintain', reason: 'Optimal load', metrics };
}
