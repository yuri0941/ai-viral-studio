// Learning Engine — OMEGA оценивает свои ответы и пишет в Cognitive Mesh
export async function recordOutcome({ userId, intent, action, success, error, metadata = {} }) {
  const timestamp = new Date().toISOString();
  try {
    const { addNode } = await import('../../services/cognitiveMesh.js');
    await addNode({
      type: 'action',
      label: `${action} | ${success ? '✅' : '❌'}`,
      content: `${action} | ${success ? '✅' : '❌'}`,
      data: { intent, success, error, metadata, timestamp },
      edges: [],
      accessLevel: 'owner'
    });
    if (success) {
      await addNode({
        type: 'skill',
        label: `skill:${action}`,
        content: `skill:${action}`,
        data: { proficiency: 'active', lastUsed: timestamp, successCount: 1 },
        edges: [{ to: `action_${Date.now()}`, relation: 'mastered', weight: 0.95 }]
      });
    }
    if (!success && error) {
      await addNode({
        type: 'error',
        label: `error:${action}`,
        content: `error:${action}`,
        data: { error, timestamp, fix: metadata?.fixAttempt },
        edges: []
      });
    }
  } catch (e) {
    console.error('Learning record failed:', e.message);
  }
  return true;
}

export async function getSkillStatus(actionType) {
  try {
    const { findNodes } = await import('../../services/cognitiveMesh.js');
    const nodes = await findNodes({ type: 'skill', label: `skill:${actionType}` });
    if (!nodes.length) return { level: 'untrained', lastUsed: null };
    const node = nodes[0];
    return {
      level: node.metadata?.proficiency,
      lastUsed: node.metadata?.lastUsed,
      successCount: node.metadata?.successCount || 0,
      confidence: node.connections?.[0]?.weight || 0.5
    };
  } catch (e) {
    return { level: 'unknown', error: e.message };
  }
}

export async function suggestNextAction(userContext) {
  return { suggestion: 'Продолжить текущий режим', priority: 'normal' };
}
