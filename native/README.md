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
4. Registration happens automatically: `components/native/push-registrar.tsx`
   (mounted in the authenticated layout) calls `registerPush()`, which prompts
   for permission and POSTs the token to `/api/push/register`.
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
