#!/bin/bash
set -e
echo "🔧 Checking backend syntax..."
find backend -name "*.js" -not -path "*/node_modules/*" -exec node --check {} \;
echo "✅ Backend OK"
echo "🔧 Building frontend..."
cd frontend && npm run build && cd ..
echo "✅ Frontend built"
echo "🚀 Deploying..."
git add .
git commit -m "fix: all errors resolved $(date +%Y-%m-%d-%H:%M)" || true
git push origin main
echo "🎉 Done!"
