@echo off
echo Kloze ComfyUI Bridge Baslatiliyor...
echo.
echo Lutfen bu dosyayi ComfyUI klasorunun icine (run_nvidia_gpu.bat yanina) tasiyin.
echo.
.\python_embeded\python.exe .\ComfyUI\main.py --enable-cors-header * --listen 0.0.0.0 --auto-launch
pause
