import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Brain, Network, Bot, Database, Server, Wallet, RefreshCw, Zap,
  AlertTriangle, CheckCircle, TrendingUp, DollarSign, Loader2, ArrowLeft
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { request } from '../../services/api';

function Card({ title, icon: Icon, children, action }) {
  return (
    <div className="glass-luxury rounded-2xl p-5 space-y-4 hover:border-violet-500/30 transition">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center text-violet-400">
            <Icon size={20} />
          </div>
          <h3 className="font-semibold text-white">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function Metric({ label, value, suffix = '' }) {
  return (
    <div className="bg-white/5 rounded-xl p-3">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-xl font-bold text-white tabular-nums">{value}{suffix}</p>
    </div>
  );
}

export default function SupremeStatusPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAllowed = ['owner', 'admin'].includes(user?.role);

  const [mesh, setMesh] = useState({ nodeCount: 0, connCount: 0, fillPct: 0 });
  const [swarm, setSwarm] = useState({ totalWorkers: 0, active: 0, idle: 0, error: 0, avgSuccessRate: 0 });
  const [memory, setMemory] = useState({ l2: 0, l3: 0, archived: 0 });
  const [scale, setScale] = useState({ current: null, prices: [], migration: null });
  const [wallet, setWallet] = useState({ usdt: 0, history: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [meshRes, swarmRes, memRes, scaleRes, pricesRes, walletRes, histRes] = await Promise.all([
        request('/omega-supreme/mesh/query?q=status&limit=1').catch(() => ({ count: 0 })),
        request('/omega-supreme/swarm/status').catch(() => ({ totalWorkers: 0, active: 0, idle: 0, error: 0, avgSuccessRate: 0 })),
        request('/omega-supreme/memory/recall?q=layer&layers=L2,L3&limit=100').catch(() => ({ results: [] })),
        request('/omega-supreme/scale/status').catch(() => ({ current: null })),
        request('/omega-supreme/scale/prices').catch(() => []),
        request('/omega-supreme/wallet/balance').catch(() => ({ usdt: 0 })),
        request('/omega-supreme/wallet/history').catch(() => [])
      ]);

      const results = memRes?.results || [];
      const l2 = results.filter(r => r.metadata?.layer === 'L2' || !r.metadata?.layer).length;
      const l3 = results.filter(r => r.metadata?.layer === 'L3').length;
      const archived = results.filter(r => r.archived).length;

      const nodeCount = meshRes?.count || 0;
      const connCount = (meshRes?.results || []).reduce((sum, n) => sum + (n.connections?.length || 0), 0);

      setMesh({ nodeCount, connCount, fillPct: Math.min(nodeCount / 1000 * 100, 100) });
      setSwarm(swarmRes);
      setMemory({ l2, l3, archived });
      setScale({ current: scaleRes?.current, prices: pricesRes || [], migration: scaleRes });
      setWallet({ usdt: walletRes?.usdt || 0, history: histRes || [] });
    } catch (err) {
      console.error('[SupremeStatusPage] fetch failed', err);
      setError(err.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isAllowed) return;
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll, isAllowed]);

  const handleCompress = async () => {
    try {
      await request('/omega-supreme/memory/compress', { method: 'POST' });
      fetchAll();
    } catch (err) {
      console.error('[SupremeStatusPage] compress failed', err);
    }
  };

  const handlePhoenix = async () => {
    try {
      await request('/omega-supreme/swarm/orchestrate', {
        method: 'POST',
        body: JSON.stringify({ tasks: [] })
      });
      fetchAll();
    } catch (err) {
      console.error('[SupremeStatusPage] phoenix failed', err);
    }
  };

  if (!isAllowed) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <div className="glass-luxury rounded-2xl p-8 max-w-md text-center">
          <AlertTriangle size={48} className="mx-auto text-yellow-400 mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">{t('supreme.accessDenied')}</h2>
          <p className="text-white/60 mb-6">{t('supreme.ownerOnly')}</p>
          <button onClick={() => navigate(-1)} className="px-6 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white">
            {t('common.back')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-4 lg:p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/owner?tab=omega')} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Brain className="text-violet-400" /> {t('supreme.title')}
              </h1>
              <p className="text-white/50 text-sm">{t('supreme.subtitle')}</p>
            </div>
          </div>
          <button
            onClick={fetchAll}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            {t('common.refresh')}
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card title={t('supreme.cognitiveMesh')} icon={Network}>
            <div className="grid grid-cols-2 gap-3">
              <Metric label={t('supreme.nodes')} value={mesh.nodeCount} />
              <Metric label={t('supreme.connections')} value={mesh.connCount} />
            </div>
            <div>
              <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                <span>{t('supreme.fill')}</span>
                <span>{mesh.fillPct.toFixed(1)}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-violet-500 to-cyan-500" style={{ width: `${mesh.fillPct}%` }} />
              </div>
            </div>
          </Card>

          <Card
            title={t('supreme.agentSwarm')}
            icon={Bot}
            action={
              <button
                onClick={handlePhoenix}
                className="text-xs px-2 py-1 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 flex items-center gap-1"
              >
                <Zap size={12} /> {t('supreme.phoenixProtocol')}
              </button>
            }
          >
            <div className="grid grid-cols-2 gap-3">
              <Metric label={t('supreme.agents')} value={swarm.totalWorkers} />
              <Metric label={t('supreme.active')} value={swarm.active} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Metric label={t('supreme.idle')} value={swarm.idle} />
              <Metric label={t('supreme.successRate')} value={(swarm.avgSuccessRate * 100).toFixed(0)} suffix="%" />
            </div>
          </Card>

          <Card
            title={t('supreme.infiniteMemory')}
            icon={Database}
            action={
              <button
                onClick={handleCompress}
                className="text-xs px-2 py-1 rounded-lg bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 flex items-center gap-1"
              >
                <RefreshCw size={12} /> {t('supreme.compress')}
              </button>
            }
          >
            <div className="grid grid-cols-3 gap-3">
              <Metric label={t('supreme.l2')} value={memory.l2} />
              <Metric label={t('supreme.l3')} value={memory.l3} />
              <Metric label={t('supreme.archive')} value={memory.archived} />
            </div>
          </Card>

          <Card title={t('supreme.cryptoWallet')} icon={Wallet}>
            <div className="bg-white/5 rounded-xl p-3 flex items-center justify-between">
              <span className="text-gray-400 text-sm">{t('supreme.balance')}</span>
              <span className="text-xl font-bold text-white">{wallet.usdt} USDT</span>
            </div>
            <div className="space-y-2 max-h-24 overflow-y-auto">
              {wallet.history.slice(0, 5).map((tx, i) => (
                <div key={i} className="flex items-center justify-between text-xs text-white/70">
                  <span className={tx.type === 'in' ? 'text-emerald-400' : 'text-rose-400'}>
                    {tx.type === 'in' ? '+' : '-'}{tx.amount} USDT
                  </span>
                  <span className="text-gray-500">{tx.purpose || tx.source || tx.recipient || '—'}</span>
                </div>
              ))}
              {wallet.history.length === 0 && <p className="text-xs text-gray-500">{t('supreme.noTransactions')}</p>}
            </div>
          </Card>
        </div>

        <Card title={t('supreme.autoScaler')} icon={Server}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-white">
                <CheckCircle size={16} className="text-emerald-400" />
                {t('supreme.currentProvider')}: <span className="font-semibold">{scale.current?.name || 'Render'}</span>
              </div>
              {scale.migration?.action === 'recommend' && (
                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm">
                  <TrendingUp size={14} className="inline mr-1" />
                  {scale.migration.reason}
                </div>
              )}
            </div>
            <div className="lg:col-span-2 overflow-x-auto">
              <table className="w-full text-sm text-left text-white/70">
                <thead className="text-xs text-gray-500 border-b border-white/10">
                  <tr>
                    <th className="pb-2">{t('supreme.provider')}</th>
                    <th className="pb-2">{t('supreme.estimatedCost')}</th>
                    <th className="pb-2">{t('supreme.latency')}</th>
                    <th className="pb-2">{t('supreme.reliability')}</th>
                    <th className="pb-2">{t('supreme.recommendation')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(scale.prices || []).map((p, i) => (
                    <tr key={i} className="border-b border-white/5">
                      <td className="py-2 text-white">{p.name}</td>
                      <td className="py-2">${p.estimatedCost}/мес</td>
                      <td className="py-2">{p.latency.toFixed(0)} ms</td>
                      <td className="py-2">{(p.reliability * 100).toFixed(0)}%</td>
                      <td className="py-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          p.recommendation === 'current' ? 'bg-emerald-500/20 text-emerald-400'
                            : p.recommendation === 'consider' ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-white/10 text-gray-400'
                        }`}>
                          {p.recommendation}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
