@echo off
echo ============================================
echo   TestFlow Extension Quick Load
echo ============================================
echo.
echo 1. Open Chrome and go to: chrome://extensions/
echo 2. Enable 'Developer mode' (top right)
echo 3. Click 'Load unpacked'
echo 4. Navigate to this folder:
echo.
echo    C:\Users\ph703\Muffin\dist
echo.
echo 5. Select the 'dist' folder and click 'Select Folder'
echo.
echo ============================================
echo Opening file explorer at dist folder...
echo ============================================
pause
start explorer "C:\Users\ph703\Muffin\dist"
start chrome chrome://extensions/
