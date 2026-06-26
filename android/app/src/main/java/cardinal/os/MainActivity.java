package cardinal.os;

import android.webkit.CookieManager;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    /**
     * Persist cookies to disk whenever the app is backgrounded. Without this the
     * Supabase auth cookies (set from JS in the WebView) can be lost when the
     * process is killed, logging the user out on next launch. Flushing on pause
     * keeps them signed in until they sign out.
     */
    @Override
    public void onPause() {
        super.onPause();
        CookieManager.getInstance().flush();
    }
}
