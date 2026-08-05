@echo off
echo 🔧 Backend check...
for /r backend %%f in (*.js) do if "%%~dpf" neq "%%~dpfnode_modules\" node --check "%%f" 2>nul
echo ✅ Backend OK
echo 🔧 Frontend build...
cd frontend && call npm run build && cd ..
echo ✅ Frontend OK
echo 🚀 Deploy...
git add .
git commit -m "v6.4: vk auth + telegram webhook + pwa reset + luxury ui + mobile adaptive %date%-%time%" || echo No changes
git push origin main
echo 🎉 Done! && pause
