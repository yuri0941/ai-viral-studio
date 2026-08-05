#!/bin/bash
set -e
echo "🔧 Building frontend..."
cd frontend && npm run build && cd ..
echo "✅ Frontend built"
echo "🔍 Checking backend syntax..."
find backend -name "*.js" -not -path "*/node_modules/*" -exec node --check {} \;
echo "✅ Backend OK"
echo "🚀 Commit & push..."
git add .
git commit -m "build: luxury creative hub + fixes $(date +%Y-%m-%d-%H:%M)" || true
git push origin main
echo "🎉 Done!"
