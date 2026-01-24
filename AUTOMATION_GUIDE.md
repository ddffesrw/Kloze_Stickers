# Otomatik Güncelleme (CI/CD) Kurulumu 🔄

Yaptığınız her değişikliğin Vercel'de otomatik olarak yayınlanması için **GitHub Entegrasyonu** yapmamız gerekiyor. Bu sayede siz sadece "Kaydet ve Gönder" dediğinizde site kendiliğinden güncellenir.

## Adım 1: Bilgisayarınızdaki Hazırlık (Tek Seferlik)
Masaüstündeki projenizi bir "Git Deposu" haline getirmelisiniz.
Sizin için hazırladığım şu dosyaya çift tıklayıp çalıştırın (veya terminalde çalıştırın):
👉 `init-git.ps1`

*(Bu işlem kodlarınızı paketler ve gönderime hazır hale getirir.)*

## Adım 2: GitHub Deposu Açma
1. [GitHub.com](https://github.com) adresine gidin ve giriş yapın.
2. Sağ üstteki **+** ikonuna basıp **New repository** deyin.
3. İsim verin (örn: `kloze-stickers`) ve **Create repository** butonuna basın.
4. Çıkan sayfadaki HTTPS linkini kopyalayın (örn: `https://github.com/KULLANICI/kloze-stickers.git`).

## Adım 3: Kodu GitHub'a Yükleme
Terminali veya VS Code terminalini açıp şu iki komutu sırasıyla yazın (Link yerine kendi linkinizi yapıştırın):

```powershell
git remote add origin https://github.com/SİZİN_KULLANICI_ADINIZ/kloze-stickers.git
git push -u origin main
```

## Adım 4: Vercel'i Bağlama (Otomasyon Başlatma)
1. [Vercel Dashboard](https://vercel.com/dashboard)'a gidin.
2. Projenizi seçin -> **Settings** -> **Git**.
3. **Connect Git Repository** diyerek GitHub hesabınızı bağlayın ve az önce oluşturduğunuz `kloze-stickers` reposunu seçin.

🎉 **Tebrikler!**
Artık sistem kuruldu. Bundan sonra güncelleme yapmak istediğinizde sadece şu 3 komutu yazmanız yetecek:

```powershell
git add .
git commit -m "Yeni özellik eklendi"
git push
```
Bunu yaptığınız an Vercel otomatik olarak yeni versiyonu algılar, kurar ve yayınlar. 🚀
