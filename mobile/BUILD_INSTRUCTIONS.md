# 📱 Keltron MPP EMS - Android APK Build Instructions

This directory (`mobile/`) contains the complete React Native mobile application for the **Keltron MPP Employee Management System (EMS)**.

---

### 📦 How to Build & Download Your Standalone `.apk` File

#### Method 1: Free Expo EAS Cloud Build (Recommended & Easiest) 🌟

1. Install the Expo EAS CLI globally on your machine:
   ```bash
   npm install -g eas-cli
   ```

2. Log in or create a free Expo account:
   ```bash
   eas login
   ```

3. Navigate to the `mobile/` directory:
   ```bash
   cd d:\antigravity\ems\mobile
   ```

4. Trigger the Free Cloud APK Build:
   ```bash
   npm run build:apk
   ```
   *or:*
   ```bash
   eas build -p android --profile preview
   ```

5. **Done!** EAS Cloud will compile your Android APK file and output a **direct download URL** and **QR Code**. You can scan the QR code on any Android smartphone to download and install `Keltron_MPP_EMS.apk` directly!

---

#### Method 2: Local Android Studio Build

If you have Android Studio & Android SDK installed locally:

```bash
cd mobile

# Generate native Android project files
npx expo prebuild

# Build Release APK
cd android
./gradlew assembleRelease
```

Your `.apk` file will be generated at:
`d:\antigravity\ems\mobile\android\app\build/outputs/apk/release/app-release.apk`

---

### 📱 Features Included in Mobile App

- 🟢 **1-Tap Mobile Clock Punch**: Instant Punch In & Punch Out with digital clock.
- 📋 **Dual Weekly Shift Notice Board**: View Unit 1 and Unit 2 Malayalam paper shift notice sheets.
- 👤 **My Profile & Security**: Update profile info or change password.
- 🔑 **Credentials Helper**: 1-tap quick sign-in for testing.
