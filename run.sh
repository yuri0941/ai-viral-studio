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
git commit -m "v6.4-final: omega live + video analysis + luxury ui + roles + mobile + pwa $(date +%Y-%m-%d-%H:%M)" || true
git push origin main
echo "🎉 Done!"
