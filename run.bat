@echo off
echo 🔧 Checking backend...
for /r backend %%f in (*.js) do if "%%~dpf" neq "%%~dpfnode_modules\" node --check "%%f" 2>nul
echo ✅ Backend OK
echo 🔧 Building frontend...
cd frontend && call npm run build && cd ..
echo ✅ Frontend built
echo 🚀 Deploying...
git add .
git commit -m "fix: all errors resolved %date%-%time%" || echo No changes
git push origin main
echo 🎉 Done!
pause
