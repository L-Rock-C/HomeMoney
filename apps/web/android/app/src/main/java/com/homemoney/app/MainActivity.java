package com.homemoney.app;

import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.text.TextUtils;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private final BroadcastReceiver notificationReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            syncPendingBankNotifications();
        }
    };

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setupNotificationBridge();
    }

    @Override
    public void onResume() {
        super.onResume();
        setupNotificationBridge();
        syncPendingBankNotifications();

        try {
            IntentFilter filter = new IntentFilter("com.homemoney.app.NOTIFICATION_RECEIVED");
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                registerReceiver(notificationReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
            } else {
                registerReceiver(notificationReceiver, filter);
            }
        } catch (Exception ignored) {}
    }

    @Override
    public void onPause() {
        super.onPause();
        try {
            unregisterReceiver(notificationReceiver);
        } catch (Exception ignored) {}
    }

    private void setupNotificationBridge() {
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                WebView webView = getBridge().getWebView();
                webView.post(() -> {
                    try {
                        webView.addJavascriptInterface(new AndroidNotificationBridge(this), "AndroidNotificationBridge");
                    } catch (Exception ignored) {}
                });
            }
        } catch (Exception ignored) {}
    }

    private void syncPendingBankNotifications() {
        try {
            SharedPreferences prefs = getSharedPreferences(BankNotificationListener.PREFS_NAME, Context.MODE_PRIVATE);
            String pending = prefs.getString(BankNotificationListener.KEY_PENDING, "[]");

            if (!"[]".equals(pending) && !pending.isEmpty()) {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    WebView webView = getBridge().getWebView();
                    String escapedJson = pending.replace("\\", "\\\\").replace("'", "\\'");
                    String js = "window.dispatchEvent(new CustomEvent('homemoney_android_notifications', { detail: '" + escapedJson + "' }));";
                    webView.post(() -> webView.evaluateJavascript(js, null));

                    // Limpa a fila pendente nativa para não duplicar no app
                    prefs.edit().putString(BankNotificationListener.KEY_PENDING, "[]").apply();
                }
            }
        } catch (Exception ignored) {}
    }

    public static class AndroidNotificationBridge {
        private final Context context;

        public AndroidNotificationBridge(Context context) {
            this.context = context;
        }

        @JavascriptInterface
        public boolean isNotificationAccessGranted() {
            try {
                String pkgName = context.getPackageName();
                final String flat = Settings.Secure.getString(
                        context.getContentResolver(),
                        "enabled_notification_listeners"
                );
                if (!TextUtils.isEmpty(flat)) {
                    final String[] names = flat.split(":");
                    for (String name : names) {
                        final ComponentName cn = ComponentName.unflattenFromString(name);
                        if (cn != null && TextUtils.equals(pkgName, cn.getPackageName())) {
                            return true;
                        }
                    }
                }
            } catch (Exception ignored) {}
            return false;
        }

        @JavascriptInterface
        public void checkNotificationsNow() {
            try {
                if (BankNotificationListener.instance != null) {
                    BankNotificationListener.instance.scanActiveNotifications();
                }
                if (context instanceof MainActivity) {
                    ((MainActivity) context).runOnUiThread(() -> {
                        ((MainActivity) context).syncPendingBankNotifications();
                    });
                }
            } catch (Exception ignored) {}
        }

        @JavascriptInterface
        public void openNotificationSettings() {
            try {
                Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
            } catch (Exception e) {
                try {
                    Intent fallback = new Intent(Settings.ACTION_SETTINGS);
                    fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(fallback);
                } catch (Exception ignored) {}
            }
        }
    }
}

