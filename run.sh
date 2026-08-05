#!/bin/bash
set -e
echo "🔧 Backend check..."
find backend -name "*.js" -not -path "*/node_modules/*" -exec node --check {} \;
echo "✅ Backend OK"
echo "🔧 Frontend build..."
cd frontend && npm run build && cd ..
echo "✅ Frontend OK"
echo "🚀 Deploy..."
git add .
git commit -m "v6.4: vk auth + telegram webhook + pwa reset + luxury ui + mobile adaptive $(date +%Y-%m-%d-%H:%M)" || true
git push origin main
echo "🎉 Done!"
