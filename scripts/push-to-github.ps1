# Script để push code lên GitHub
# Chạy script này sau khi đã tạo repository trên GitHub

Write-Host "🚀 Script Push Code Lên GitHub" -ForegroundColor Green
Write-Host ""

# Nhập username GitHub
$username = Read-Host "Nhập username GitHub của bạn"

if ([string]::IsNullOrWhiteSpace($username)) {
    Write-Host "❌ Username không được để trống!" -ForegroundColor Red
    exit
}

# Repository name
$repoName = "task-manager-login"
$repoUrl = "https://github.com/$username/$repoName.git"

Write-Host ""
Write-Host "📦 Đang kiểm tra git repository..." -ForegroundColor Yellow

# Kiểm tra xem đã có remote chưa
$existingRemote = git remote get-url origin 2>$null

if ($existingRemote) {
    Write-Host "⚠️  Đã có remote: $existingRemote" -ForegroundColor Yellow
    $update = Read-Host "Bạn có muốn cập nhật remote? (y/n)"
    if ($update -eq "y" -or $update -eq "Y") {
        git remote set-url origin $repoUrl
        Write-Host "✅ Đã cập nhật remote" -ForegroundColor Green
    }
} else {
    Write-Host "➕ Đang thêm remote..." -ForegroundColor Yellow
    git remote add origin $repoUrl
    Write-Host "✅ Đã thêm remote" -ForegroundColor Green
}

# Đổi branch thành main
Write-Host ""
Write-Host "🔄 Đang đổi branch thành main..." -ForegroundColor Yellow
git branch -M main

# Push code
Write-Host ""
Write-Host "📤 Đang push code lên GitHub..." -ForegroundColor Yellow
Write-Host "Repository URL: $repoUrl" -ForegroundColor Cyan
Write-Host ""

git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Push thành công!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🔗 Repository URL: https://github.com/$username/$repoName" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📝 Bước tiếp theo:" -ForegroundColor Yellow
    Write-Host "1. Deploy lên Netlify/Vercel để lấy link web"
    Write-Host "2. Thêm domain vào Google OAuth Console"
    Write-Host "3. Test đăng nhập bằng Google"
} else {
    Write-Host ""
    Write-Host "❌ Có lỗi xảy ra khi push!" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Kiểm tra:" -ForegroundColor Yellow
    Write-Host "- Đã tạo repository trên GitHub chưa?"
    Write-Host "- Username có đúng không?"
    Write-Host "- Đã đăng nhập GitHub chưa? (git config --global user.name và user.email)"
}

