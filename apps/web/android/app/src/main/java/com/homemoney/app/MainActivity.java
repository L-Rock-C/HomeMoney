package com.homemoney.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onResume() {
        super.onResume();
        syncPendingBankNotifications();
    }

    private void syncPendingBankNotifications() {
        try {
            SharedPreferences prefs = getSharedPreferences(BankNotificationListener.PREFS_NAME, Context.MODE_PRIVATE);
            String pending = prefs.getString(BankNotificationListener.KEY_PENDING, "[]");

            if (!"[]".equals(pending) && !pending.isEmpty()) {
                WebView webView = getBridge().getWebView();
                if (webView != null) {
                    String escapedJson = pending.replace("\\", "\\\\").replace("'", "\\'");
                    String js = "window.dispatchEvent(new CustomEvent('homemoney_android_notifications', { detail: '" + escapedJson + "' }));";
                    webView.post(() -> webView.evaluateJavascript(js, null));

                    // Limpa a fila pendente nativa para não duplicar no app
                    prefs.edit().putString(BankNotificationListener.KEY_PENDING, "[]").apply();
                }
            }
        } catch (Exception ignored) {}
    }
}
