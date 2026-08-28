@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

echo ============================================
echo   OMEGA AGENT — Multi-Provider
echo ============================================

:: Load .env file
if not exist .env (
    echo [ERROR] .env file not found!
    echo Create .env from .env.example
    pause
    exit /b 1
)

for /f "usebackq tokens=1,* delims==" %%a in (".env") do (
    set "line=%%a"
    if not "!line:~0,1!"=="#" (
        set "%%a=%%b"
    )
)

echo [OK] Environment loaded from .env
echo.

:: Check at least one key exists
set "HAS_KEY=0"
if not "%CEREBRAS_API_KEY%"=="" set HAS_KEY=1
if not "%GROQ_API_KEY%"=="" set HAS_KEY=1
if not "%DEEPSEEK_API_KEY%"=="" set HAS_KEY=1
if not "%MISTRAL_API_KEY%"=="" set HAS_KEY=1
if not "%TOGETHER_API_KEY%"=="" set HAS_KEY=1
if not "%FIREWORKS_API_KEY%"=="" set HAS_KEY=1
if not "%NOVITA_API_KEY%"=="" set HAS_KEY=1
if not "%DEEPINFRA_API_KEY%"=="" set HAS_KEY=1
if not "%CLOUDFLARE_API_KEY%"=="" set HAS_KEY=1
if not "%OPENROUTER_API_KEY%"=="" set HAS_KEY=1

if %HAS_KEY%==0 (
    echo [ERROR] No API keys found in .env!
    pause
    exit /b 1
)

set /p TASK="Enter task: "
python core\multi_agent.py %TASK%

pause
