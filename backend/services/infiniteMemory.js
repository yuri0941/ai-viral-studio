import { createNode, connectNodes, queryMesh, pruneMesh } from './cognitiveMesh.js';

// L1: Redis (hot) — handled by existing cache
// L2: MongoDB Working (CognitiveNode)
// L3: PostgreSQL Vector (placeholder — uses MongoDB text index for now)
// L4: S3 Cold Archive (JSONL)
// L5: Quantum Cross-Reference (cross-project, placeholder)

export async function storeMemory(layer, data) {
  if (layer === 'L1') return; // Redis handled by cache service

  if (layer === 'L2') {
    const node = await createNode({
      type: data.type || 'fact',
      content: data.content,
      confidence: data.confidence || 0.9,
      source: data.source || 'omega',
      metadata: data.metadata
    });
    // Auto-connect to related nodes
    if (data.relatedTo) {
      for (const relId of data.relatedTo) {
        await connectNodes(node._id, relId, 0.7, data.relation || 'related');
      }
    }
    return node;
  }

  if (layer === 'L3') {
    // Long-term vector storage (MongoDB with text index as fallback)
    return await createNode({ type: 'longterm', content: data.content, confidence: 0.7, metadata: { layer: 'L3' } });
  }

  if (layer === 'L4') {
    // Cold archive — will be handled by pruneMesh cron
    return { status: 'queued_for_archive', content: data.content };
  }
}

export async function recallMemory(query, options = {}) {
  const { layers = ['L2','L3'], limit = 10, minConfidence = 0.5 } = options;
  const results = await queryMesh(query, limit, minConfidence);
  return results.filter(r => layers.includes(r.metadata?.layer || 'L2'));
}

export async function compressAndArchive() {
  // Run daily: prune old nodes, generate summaries
  const result = await pruneMesh(90, 1);
  return result;
}
