@echo off
echo Starting TrafficRoute Application...

REM Start PostgreSQL
echo Starting PostgreSQL...
net start postgresql-x64-16

REM Wait for PostgreSQL to start
timeout /t 3 /nobreak

REM Start Backend
echo Starting Backend...
start cmd /k "cd C:\Users\Administrator\Desktop\IntelligentTrafficSystem\backend && npm run dev"

REM Wait for backend to start
timeout /t 5 /nobreak

REM Start Frontend
echo Starting Frontend...
start cmd /k "cd C:\Users\Administrator\Desktop\IntelligentTrafficSystem\frontend && serve -s build -l 3000"

REM Wait for frontend to start
timeout /t 3 /nobreak

REM Start ngrok
echo Starting ngrok...
start cmd /k "cd C:\ngrok && ngrok http 3000"

echo All services started!
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo ngrok URL: Check the ngrok terminal window
pause