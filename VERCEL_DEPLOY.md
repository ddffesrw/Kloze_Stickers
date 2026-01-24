# 🚀 Vercel Deployment Guide

Uygulamanızı Vercel'de canlıya almak için aşağıdaki adımları takip edin.

## 1. Hazırlıklar (Tamamlandı ✅)
- **Build Komutları:** `package.json` ve `vite.config.ts` Vercel ile tam uyumlu.
- **Yönlendirme (Routing):** `vercel.json` dosyası oluşturuldu. Bu sayede sayfa yenilendiğinde 404 hatası almayacaksınız.

## 2. GitHub ile Deployment (Önerilen Yöntem)
En kolay ve sürdürülebilir yöntem kodu GitHub'a yükleyip Vercel'i bağlamaktır.

1.  **Projeyi GitHub'a Yükleyin:**
    - GitHub'da yeni bir repository (repo) oluşturun.
    - Terminalden şu komutlarla kodunuzu yükleyin:
      ```bash
      git init
      git add .
      git commit -m "Vercel deploy initial commit"
      git branch -M main
      git remote add origin https://github.com/KULLANICI_ADINIZ/REPO_ADINIZ.git
      git push -u origin main
      ```

2.  **Vercel'de Proje Oluşturun:**
    - [Vercel Dashboard](https://vercel.com/dashboard)'a gidin.
    - **"Add New" > "Project"** butonuna tıklayın.
    - GitHub hesabınızı bağlayın ve oluşturduğunuz repo'yu seçin via **"Import"**.

## 3. Build & Output Ayarları
Vercel çoğu ayarı otomatik algılar ama kontrol etmek için:
- **Framework Preset:** `Vite`
- **Root Directory:** `./` (veya boş bırakın)
- **Build Command:** `npm run build`
- **Output Directory:** `dist`

## 4. Environment Variables (Çevresel Değişkenler) 🔑
Supabase bağlantısının çalışması için bu anahtarları eklemelisiniz. Proje kurulum ekranında **Environment Variables** bölümünü açın ve `.env` dosyanızdaki değerleri kopyalayın:

| Key (İsim) | Value (Değer) |
|------------|---------------|
| `VITE_SUPABASE_URL` | `https://cxujdireegrurfyhhocz.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | *(Sizin Anon Key'iniz - .env dosyasından kopyalayın)* |

*Not: Vercel'de değişkenleri ekledikten sonra deployment'ı tekrar tetiklemeniz gerekebilir (Redeploy).*

## 5. Tamamlanma
- **Deploy** butonuna basın.
- 1-2 dakika içinde uygulamanız `https://proje-adiniz.vercel.app` adresinde yayında olacak! 🌍

---
**Alternatif: Vercel CLI (Komut Satırı)**
GitHub kullanmak istemiyorsanız, terminalden şu komutu çalıştırarak direkt yükleyebilirsiniz:
1. `npm i -g vercel` (Eğer yüklü değilse)
2. `vercel login`
3. `vercel` (Sırasıyla sorulara `Y` (Yes) diyerek ilerleyin)
