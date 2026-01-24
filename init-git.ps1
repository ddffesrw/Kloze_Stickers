# Git Init Helper Script
Write-Host "Git deposu hazirlaniyor..." -ForegroundColor Cyan

# 1. Init
git init

# 2. Add all files (respecting .gitignore)
git add .

# 3. Commit
git commit -m "Initial commit: Kloze Stickers App Backup"

Write-Host "---------------------------------------------------" -ForegroundColor Green
Write-Host "Git basariyla olusturuldu!" -ForegroundColor Green
Write-Host "Simdi 'AUTOMATION_GUIDE.md' dosyasindaki adimlari takip ederek GitHub'a yukleyebilirsiniz." -ForegroundColor Yellow
Write-Host "---------------------------------------------------" -ForegroundColor Green
Pause
