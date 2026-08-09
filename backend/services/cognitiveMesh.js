import { model } from 'mongoose';

// MongoDB-based Cognitive Mesh (graph-like на индексах)
// Узлы = документы, рёбра = embedded refs + веса

const NODE_TYPES = ['fact', 'skill', 'intent', 'emotion', 'decision', 'prediction', 'error', 'trend', 'project', 'client'];

export async function createNode({ type, content, confidence = 0.8, source = 'omega', metadata = {} }) {
  const Node = model('CognitiveNode');
  const node = await Node.create({
    type, content, confidence, source, metadata,
    connections: [],
    accessCount: 0,
    lastAccessed: new Date(),
    createdAt: new Date()
  });
  return node;
}

export async function connectNodes(fromId, toId, weight = 0.5, relation = 'related') {
  const Node = model('CognitiveNode');
  await Node.findByIdAndUpdate(fromId, {
    $push: { connections: { to: toId, weight, relation, createdAt: new Date() } }
  });
  // Bidirectional (weak)
  await Node.findByIdAndUpdate(toId, {
    $push: { connections: { to: fromId, weight: weight * 0.3, relation: `reverse_${relation}` } }
  });
}

export async function queryMesh(query, limit = 20, minConfidence = 0.6) {
  // Semantic search: text + type + confidence
  const Node = model('CognitiveNode');
  const results = await Node.find({
    $text: { $search: query },
    confidence: { $gte: minConfidence }
  })
  .sort({ score: { $meta: 'textScore' }, accessCount: -1, lastAccessed: -1 })
  .limit(limit)
  .lean();

  // Update access stats
  await Node.updateMany(
    { _id: { $in: results.map(r => r._id) } },
    { $inc: { accessCount: 1 }, lastAccessed: new Date() }
  );

  return results;
}

export async function getRelated(nodeId, depth = 2) {
  // BFS traversal
  const Node = model('CognitiveNode');
  const visited = new Set();
  const queue = [{ id: nodeId, d: 0 }];
  const result = [];

  while (queue.length && result.length < 50) {
    const { id, d } = queue.shift();
    if (visited.has(id.toString()) || d > depth) continue;
    visited.add(id.toString());

    const node = await Node.findById(id).lean();
    if (!node) continue;
    result.push({ ...node, traversalDepth: d });

    for (const conn of (node.connections || [])) {
      if (!visited.has(conn.to.toString())) {
        queue.push({ id: conn.to, d: d + 1 });
      }
    }
  }
  return result;
}

export async function pruneMesh(olderThanDays = 90, minAccessCount = 1) {
  // Archive old/low-value nodes to cold storage (JSONL summary)
  const Node = model('CognitiveNode');
  const cutoff = new Date(Date.now() - olderThanDays * 86400000);

  const oldNodes = await Node.find({
    lastAccessed: { $lt: cutoff },
    accessCount: { $lte: minAccessCount },
    archived: { $ne: true }
  }).limit(1000).lean();

  if (oldNodes.length === 0) return { archived: 0 };

  // Generate AI summary before archive (placeholder, uses existing aiService)
  const summary = oldNodes.map(n => `[${n.type}] ${n.content.slice(0, 100)}`).join('\n');

  await Node.updateMany(
    { _id: { $in: oldNodes.map(n => n._id) } },
    { $set: { archived: true, archiveSummary: summary, archivedAt: new Date() } }
  );

  return { archived: oldNodes.length };
}

export async function addNode({ type, label, data = {}, edges = [], content, confidence = 0.8, source = 'omega', metadata = {}, accessLevel }) {
  const Node = model('CognitiveNode');
  const nodeContent = content || label || `[${type}] ${new Date().toISOString()}`;
  const nodeMetadata = { ...data, ...metadata, accessLevel };
  const connections = (edges || []).map(e => ({
    to: e.to,
    weight: e.weight || 0.5,
    relation: e.relation || 'related',
    createdAt: new Date()
  }));
  const node = await Node.create({
    type,
    content: nodeContent,
    confidence,
    source,
    metadata: nodeMetadata,
    connections,
    accessCount: 0,
    lastAccessed: new Date(),
    createdAt: new Date()
  });
  return node;
}

export async function findNodes({ type, label, limit = 10 }) {
  try {
    const Node = model('CognitiveNode');
    const query = {};
    if (type) query.type = type;
    if (label) query.content = label;
    return await Node.find(query).sort({ createdAt: -1 }).limit(limit).lean();
  } catch (e) {
    return [];
  }
}
