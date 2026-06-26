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

The upload keystore (`android/cardinal-upload.jks`) and `android/keystore.properties`
already exist and are **gitignored**. ⚠️ **Back both up** (password manager) — they
sign every update. With Play App Signing on, the upload key is recoverable if lost.

Build the signed bundle:
```bash
npm run android:bundle   # → android/app/build/outputs/bundle/release/app-release.aab
```

### Upload key fingerprints (register these in Google Cloud for release Google sign-in)
- SHA-1: `83:85:8B:42:82:3B:0A:0D:8A:02:FC:CB:74:FE:59:25:BF:E7:05:C8`
- SHA-256: `01:EE:B4:38:DD:19:2E:06:03:32:E7:2A:29:21:4F:EA:82:CA:83:ED:7A:12:F5:B0:45:D4:62:28:EE:F0:1E:2F`

NOTE: with **Play App Signing**, the cert that signs what users install is held by
Google. After your first upload, copy the **app-signing SHA-1** from Play Console →
Setup → App signing, and add THAT to the Google Cloud Android OAuth client too, or
Google sign-in won't work for the Play-distributed build.

### Publishing (your steps — needs a Play Console account, $25 one-time)
1. Create the app in **Play Console**, package `cardinal.os`.
2. Upload `app-release.aab` to a testing track (Internal testing first).
3. Listing: use `native/store/listing.md` (copy) + `native/store/icon-512.png`
   (app icon) + `native/store/feature-graphic.png` (feature graphic).
4. **Phone screenshots:** capture 2–8 from the app on your phone while signed in
   (dashboard, today, habits, money…). With the device connected:
   `adb -s <device> exec-out screencap -p > shot1.png`
5. Complete the Data safety form, content rating, and target audience, then roll
   out to testers → production.

## Google sign-in setup (one-time, required for the in-app Google button)

Google blocks OAuth inside embedded WebViews, so the app uses the native Google
credential picker (@capgo/capacitor-social-login) → a Google ID token →
Supabase `signInWithIdToken`. For Google to issue that token it must recognise
the app's package + signing certificate. Do this once:

1. **Google Cloud Console** (same project as the existing web Google login) →
   APIs & Services → Credentials → Create credentials → OAuth client ID:
   - Application type: **Android**
   - Package name: `cardinal.os`
   - SHA-1: **`4A:5D:EF:59:72:8F:19:45:73:3C:3D:C1:B7:82:37:9D:AC:77:26:FD`**
     (this is the *debug* key, for testing. For the Play release you'll also add
     the **Play app-signing SHA-1** from Play Console once the app is uploaded.)
2. Copy your existing **Web** OAuth client id (`…apps.googleusercontent.com`).
3. **Supabase** → Authentication → Providers → Google → add that Web client id to
   **Authorized Client IDs** (comma-separated) so `signInWithIdToken` accepts it.
4. **Vercel** → Project → Settings → Environment Variables → add
   `NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID` = the Web client id, then redeploy. (Also
   put it in local `.env.local` for browser testing.)

Until step 4's env var is deployed, the in-app Google button shows a friendly
"Google sign-in isn't configured for the app yet" message and email/password
still works. The web Google button is unaffected throughout.

## Push notifications setup (one-time)

Device side uses @capacitor/push-notifications (FCM); server side sends via the
FCM HTTP v1 API. The Gradle wiring (google-services plugin, applied only when the
JSON exists) is already in place. To turn it on:

1. **Firebase console** → create/select a project → add an **Android app** with
   package name `cardinal.os`. Download **`google-services.json`** and place it at
   **`android/app/google-services.json`** (gitignored). Rebuild the app.
2. **Run migration `0026_device_tokens.sql`** in Supabase (stores FCM tokens).
3. **Service account for sending:** Firebase console → Project settings →
   Service accounts → Generate new private key. Put the whole JSON (stringified)
   in **`FIREBASE_SERVICE_ACCOUNT`** in Vercel (and `.env.local` for local).
4. **Set `NEXT_PUBLIC_PUSH_ENABLED=true` in Vercel and redeploy** — ONLY after
   steps 1–3 and a rebuilt APK that contains google-services.json. Until then,
   leave it unset: calling the native `register()` without Firebase configured
   throws "Default FirebaseApp is not initialized" and crashes the app (a native
   crash a JS try/catch can't stop). Registration happens via
   `components/native/push-registrar.tsx` (mounted in the authenticated layout),
   which prompts for permission and POSTs the token to `/api/push/register`.
5. Send from any server job with `sendPushToUser(userId, { title, body })` from
   `lib/push/send.ts` (no-ops cleanly until the service account is set).

Until steps 1–3 are done, the app simply won't receive pushes; nothing breaks.

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
