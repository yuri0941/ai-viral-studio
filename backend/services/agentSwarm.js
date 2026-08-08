import { createNode } from './cognitiveMesh.js';
import { chatWithAI } from './aiService.js';

const SWARM_CONFIG = {
  maxWorkers: 1000,
  maxConcurrent: 50,
  taskTimeoutMs: 30000,
  phoenixThreshold: 0.3 // kill & respawn if successRate < 30%
};

const activeWorkers = new Map();
let workerIdCounter = 0;

class WorkerAgent {
  constructor(role, specialization, params = {}) {
    this.id = `worker-${++workerIdCounter}`;
    this.role = role;
    this.specialization = specialization;
    this.params = params;
    this.tasksCompleted = 0;
    this.tasksFailed = 0;
    this.createdAt = Date.now();
    this.lastTaskAt = null;
    this.status = 'idle';
    activeWorkers.set(this.id, this);
  }

  async execute(task) {
    this.status = 'working';
    this.lastTaskAt = Date.now();
    try {
      let result;
      if (task.type === 'generate_text') {
        result = await chatWithAI(task.prompt, task.options?.history || [], task.options?.lang || 'ru', task.options || {});
      } else if (task.type === 'analyze_data') {
        result = { analysis: 'mock_analysis', confidence: 0.85 };
      } else if (task.type === 'code_review') {
        result = { issues: [], score: 0.95 };
      } else {
        result = { status: 'completed', output: task.fallback || 'done' };
      }

      this.tasksCompleted++;
      this.status = 'idle';

      await createNode({
        type: 'skill',
        content: `Worker ${this.id} completed ${task.type}: ${JSON.stringify(result).slice(0, 200)}`,
        confidence: result.confidence || 0.8,
        source: 'swarm',
        metadata: { workerId: this.id, role: this.role, taskType: task.type }
      });

      return { success: true, result, workerId: this.id };
    } catch (error) {
      this.tasksFailed++;
      this.status = 'error';
      const total = this.tasksCompleted + this.tasksFailed;
      if (total > 0 && this.tasksFailed / total > SWARM_CONFIG.phoenixThreshold) {
        return { success: false, error: error.message, phoenix: true, workerId: this.id };
      }
      return { success: false, error: error.message, workerId: this.id };
    }
  }

  destroy() {
    activeWorkers.delete(this.id);
  }
}

export function spawnWorker(role, specialization, params) {
  if (activeWorkers.size >= SWARM_CONFIG.maxWorkers) {
    const oldest = Array.from(activeWorkers.values())
      .filter(w => w.status === 'idle')
      .sort((a, b) => (a.lastTaskAt || 0) - (b.lastTaskAt || 0))[0];
    if (oldest) oldest.destroy();
  }
  return new WorkerAgent(role, specialization, params);
}

export async function orchestrate(tasks) {
  const results = [];
  const queue = tasks.map((t, i) => ({ ...t, index: i }));
  const executing = new Set();

  while (queue.length > 0 || executing.size > 0) {
    while (executing.size < SWARM_CONFIG.maxConcurrent && queue.length > 0) {
      const task = queue.shift();
      const worker = spawnWorker(task.role || 'general', task.specialization || 'default');
      executing.add(worker.id);

      worker.execute(task).then(res => {
        results[task.index] = res;
        executing.delete(worker.id);
        if (res.phoenix) {
          worker.destroy();
          spawnWorker(worker.role, worker.specialization + '_v2', { ...worker.params, mutated: true });
        }
      }).catch(err => {
        results[task.index] = { success: false, error: err.message };
        executing.delete(worker.id);
      });
    }
    if (executing.size > 0) await new Promise(r => setTimeout(r, 100));
  }

  return results;
}

export function getSwarmStatus() {
  const workers = Array.from(activeWorkers.values());
  return {
    totalWorkers: workers.length,
    active: workers.filter(w => w.status === 'working').length,
    idle: workers.filter(w => w.status === 'idle').length,
    error: workers.filter(w => w.status === 'error').length,
    avgSuccessRate: workers.reduce((sum, w) => {
      const total = w.tasksCompleted + w.tasksFailed;
      return sum + (total > 0 ? w.tasksCompleted / total : 0);
    }, 0) / (workers.length || 1)
  };
}
