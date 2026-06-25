# Cardinal OS — Android app (Capacitor)

The Android app is a thin native shell that loads the live site
(`cardinalos.graviq.in`) in a WebView and adds native features (push,
biometric lock, haptics, splash/status bar, share, native Google sign-in).
We ship the same web codebase to the browser and the app — a web deploy updates
the app instantly, no store release needed for UI changes.

## One-time machine setup (required to build)

This repo has the Capacitor scaffold, but **building an `.aab`/`.apk` needs a JDK
+ Android SDK**, which aren't installed yet. Easiest path:

1. Install **Android Studio** (bundles JDK 17 + the Android SDK + an emulator):
   https://developer.android.com/studio
2. First launch → let it install the default SDK + Platform Tools.
3. Set env vars (PowerShell, once):
   - `setx ANDROID_HOME "$env:LOCALAPPDATA\Android\Sdk"`
   - `setx JAVA_HOME "C:\Program Files\Android\Android Studio\jbr"`
   - Reopen the terminal so they take effect.

## Everyday workflow

```bash
npm run cap:sync      # copy config + plugins into /android (run after plugin changes)
npm run cap:open      # open the project in Android Studio
npm run cap:run       # build + launch on a connected device/emulator
```

Because we load a remote URL, you usually **don't** need to rebuild the app for
web changes — just deploy the site. Rebuild only when native config/plugins change.

### Testing against a local dev server
```bash
# expose Next dev on your LAN, then point the shell at it:
CAP_SERVER_URL=http://<your-lan-ip>:3000 CAP_SERVER_CLEARTEXT=true npm run cap:sync
npm run cap:run
```

## Release build (Play Store)

1. Generate an upload keystore (keep it safe — losing it means you can't update the app):
   ```bash
   keytool -genkey -v -keystore cardinal-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias cardinal
   ```
2. Put credentials in `android/keystore.properties` (gitignored):
   ```
   storeFile=../cardinal-upload.jks
   storePassword=...
   keyAlias=cardinal
   keyPassword=...
   ```
   (Signing wiring in `android/app/build.gradle` is added as part of the release step.)
3. Build the bundle:
   ```bash
   npm run android:bundle   # → android/app/build/outputs/bundle/release/app-release.aab
   ```
4. Upload the `.aab` in Google Play Console.

## Still TODO (tracked, done after Android Studio is installed)

- Push notifications: `android/app/google-services.json` from a Firebase project,
  device-token registration, and the send backend.
- Native Google sign-in plugin + Supabase `signInWithIdToken`.
- Biometric app-lock gate.
- App icon + splash from brand assets (`@capacitor/assets`).
- Play listing assets (feature graphic, screenshots, copy) + signing config.

## App identity

- **App ID / package:** `cardinal.os` (permanent once published — do not change)
- **App name:** Cardinal OS
