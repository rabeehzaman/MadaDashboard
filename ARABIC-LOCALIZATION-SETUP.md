# Arabic Localization Setup Complete

## 🎉 Implementation Summary

Your Mada Dashboard now supports complete Arabic localization with subdomain-based routing!

### ✅ What's Been Implemented

1. **Subdomain-based Language Routing**
   - `yourdomain.com` → English version
   - `ar.yourdomain.com` → Arabic version with RTL layout

2. **RTL (Right-to-Left) Support**
   - Automatic direction detection based on subdomain
   - Arabic font (Cairo) using Next.js font optimization
   - RTL-optimized CSS for all components
   - Mirrored layouts for Arabic

3. **Translation System**
   - English translations: `/src/i18n/translations/en.json`
   - Arabic translations: `/src/i18n/translations/ar.json`
   - Custom translation hook: `useTranslation()`

4. **Updated Components**
   - ✅ Navigation sidebar with Arabic text
   - ✅ Dashboard header translated
   - ✅ Language switcher button
   - ✅ Layout with dynamic RTL support
   - ✅ **Fixed CSS and font loading errors**

## 🧪 Testing Locally

### Option 1: Manual Host File Editing (Recommended)

1. **Edit your hosts file:**
   
   **Mac/Linux:**
   ```bash
   sudo nano /etc/hosts
   ```
   
   **Windows:**
   ```
   notepad C:\Windows\System32\drivers\etc\hosts
   ```

2. **Add these lines:**
   ```
   127.0.0.1 localhost
   127.0.0.1 ar.localhost
   ```

3. **Test the domains:**
   - English: http://localhost:3000
   - Arabic: http://ar.localhost:3000

### Option 2: Browser Testing with Port

You can also test by temporarily modifying the hostname detection in the browser's developer tools:

1. Open http://localhost:3000
2. Open Developer Tools (F12)
3. Go to Console
4. Type: `Object.defineProperty(window.location, 'hostname', { value: 'ar.localhost' })`
5. Refresh the page

## 🚀 Railway Deployment Setup

### 1. Domain Configuration in Railway

In your Railway project dashboard:

1. Go to **Settings** → **Domains**
2. Add your custom domains:
   - `yourdomain.com` (English)
   - `ar.yourdomain.com` (Arabic)
3. Both domains point to the same Railway service

### 2. DNS Configuration

In your domain provider (Namecheap, GoDaddy, etc.):

1. **Main domain (English):**
   ```
   Type: A Record
   Name: @
   Value: [Railway IP Address]
   ```

2. **Arabic subdomain:**
   ```
   Type: A Record
   Name: ar
   Value: [Railway IP Address]
   ```

### 3. Environment Variables

Set these in Railway dashboard under **Variables**:

```env
NODE_ENV=production
NEXT_PUBLIC_PRIMARY_DOMAIN=yourdomain.com
NEXT_PUBLIC_ARABIC_DOMAIN=ar.yourdomain.com
```

## 📝 How It Works

### URL Examples After Deployment:
- `yourdomain.com` → English dashboard
- `yourdomain.com/customers` → English customers page
- `ar.yourdomain.com` → Arabic dashboard (لوحة القيادة)
- `ar.yourdomain.com/customers` → Arabic customers page (العملاء)

### Language Switching:
- Click the language button in the sidebar
- Automatically switches between domains
- Preserves the current page path

### RTL Features:
- Text flows right-to-left on Arabic subdomain
- Navigation is mirrored
- Tables and forms are RTL-optimized
- Arabic font (Cairo) is automatically applied

## 🔧 Customization

### Adding More Translations

1. **Update translation files:**
   - `/src/i18n/translations/en.json` (English)
   - `/src/i18n/translations/ar.json` (Arabic)

2. **Use in components:**
   ```tsx
   import { useTranslation } from "@/i18n/use-translation"
   
   function MyComponent() {
     const { t } = useTranslation()
     return <h1>{t("my.translation.key")}</h1>
   }
   ```

### Adding More Languages

1. Create new translation file (e.g., `/src/i18n/translations/fr.json`)
2. Update the translation hook to support the new locale
3. Add subdomain detection for the new language

## 🎯 Next Steps

1. **Test locally** using the hosts file method above
2. **Deploy to Railway** with your custom domains
3. **Configure DNS** to point subdomains to Railway
4. **Add more translations** as needed for additional pages

## 🌟 Features

- ✅ **No external dependencies** (free alternative to Weglot)
- ✅ **SEO-friendly** URLs for each language
- ✅ **Professional subdomain structure**
- ✅ **Complete RTL support** for Arabic
- ✅ **Railway-optimized** deployment
- ✅ **Automatic language detection** from subdomain
- ✅ **Seamless language switching**

Your Arabic localization is now complete and ready for production! 🎉