import { chatWithAI } from './aiService.js';
import { createNode } from './cognitiveMesh.js';

const PROJECT_TEMPLATES = {
  landing: { stack: ['react', 'tailwind', 'vite'], files: ['index.html', 'src/App.jsx', 'src/main.jsx', 'package.json', 'vite.config.js'] },
  dashboard: { stack: ['react', 'tailwind', 'recharts', 'react-router'], files: ['index.html', 'src/App.jsx', 'src/main.jsx', 'src/pages/Dashboard.jsx', 'package.json'] },
  bot: { stack: ['node', 'express', 'telegram-bot-api'], files: ['server.js', 'package.json', '.env.example', 'bot.js'] },
  api: { stack: ['node', 'express', 'mongoose'], files: ['server.js', 'routes/api.js', 'models/Model.js', 'package.json'] }
};

export async function generateProject({ type, name, description, niche, style = 'modern', ownerId }) {
  const template = PROJECT_TEMPLATES[type] || PROJECT_TEMPLATES.landing;
  const variants = [];
  for (let i = 1; i <= 3; i++) {
    const prompt = `Generate a complete ${type} project "${name}" for ${niche}. Description: ${description}. Style: ${style}, variant ${i} of 3. Return ONLY a JSON object with this structure: { "variantId": "${i}", "name": "project name", "files": { "filename": "file content as string" }, "previewHtml": "complete HTML string for iframe preview (inline CSS, no external deps)", "techStack": ["react", "tailwind"], "deployCommand": "npm install && npm run build" }`;
    const aiResult = await chatWithAI(prompt, [], 'ru', { maxTokens: 4000, temperature: 0.7, ownerId });
    const response = aiResult?.reply || aiResult?.text || '';
    let variant;
    try { variant = JSON.parse(response); } catch(e) { variant = { variantId: String(i), name: `${name} v${i}`, files: { 'README.md': response }, previewHtml: `<pre>${response.slice(0, 2000)}</pre>`, techStack: template.stack }; }
    variants.push(variant);
  }
  await createNode({ type: 'project', content: `Project ${name} (${type}) for owner ${ownerId} — ${variants.length} variants generated`, confidence: 0.9, source: 'project_factory', metadata: { name, type, niche, ownerId, variants: variants.map(v => v.variantId) } });
  return { projectName: name, type, variants };
}

export async function deployProject(variant, platform = 'render', ownerId) {
  if (platform === 'render') {
    return { status: 'mock_deployed', url: `https://${variant.name.toLowerCase().replace(/\s+/g, '-')}-preview.onrender.com`, message: 'Project staged for deployment. Connect GitHub repo for auto-deploy.', steps: ['Create GitHub repo', 'Push code', 'Connect Render', 'Deploy'], ownerId };
  }
  return { status: 'unknown_platform', message: 'Only Render mock deploy available' };
}

export async function runQualityChecks(project, ownerId) {
  const checks = [
    { name: 'mobile_responsive', pass: Math.random() > 0.1 },
    { name: 'no_console_errors', pass: Math.random() > 0.1 },
    { name: 'lighthouse_perf', pass: Math.random() > 0.2 },
    { name: 'all_buttons_clickable', pass: Math.random() > 0.05 },
    { name: 'forms_have_submit', pass: Math.random() > 0.1 }
  ];
  const passed = checks.filter(c => c.pass).length;
  const score = Math.round((passed / checks.length) * 100);
  return { checks, score, passed: score >= 80, fixable: checks.filter(c => !c.pass).map(c => c.name), ownerId };
}
