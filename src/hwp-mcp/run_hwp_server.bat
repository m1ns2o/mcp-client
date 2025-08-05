@echo off
REM Node.js에서 실행되었음을 stderr로 알려, 디버깅을 돕습니다.
echo Starting HWP MCP Server via batch script... >&2

REM 현재 배치 파일이 있는 디렉토리로 이동합니다. (안정성을 위해)
cd /d "%~dp0"

REM 가상환경을 활성화합니다. 'call'을 사용해야 환경변수가 현재 쉘에 유지됩니다.
echo Activating virtual environment... >&2
call "myenv\Scripts\activate.bat"

REM Python 스크립트를 실행합니다.
REM -u 플래그는 버퍼링을 비활성화하여 stdio 통신이 지연되지 않도록 하는 매우 중요한 옵션입니다.
echo Starting Python script with unbuffered stdio... >&2
python -u hwp_mcp_stdio_server.py
