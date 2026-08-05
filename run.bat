@echo off
echo 🔧 Building frontend...
cd frontend
call npm run build
cd ..
echo ✅ Frontend built
echo 🔍 Checking backend syntax...
for /r backend %%f in (*.js) do (
  if "%%~dpf" neq "%%~dpfnode_modules\" node --check "%%f" 2>nul
)
echo ✅ Backend OK
echo 🚀 Commit ^& push...
git add .
git commit -m "build: luxury creative hub + fixes %date%-%time%" || echo No changes
git push origin main
echo 🎉 Done!
pause
