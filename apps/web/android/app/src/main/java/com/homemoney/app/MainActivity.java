package com.homemoney.app;

import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.text.TextUtils;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import androidx.core.app.NotificationManagerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private boolean pendingOpenReconciliation = false;
    private String pendingReconciliationId = null;

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
        checkAndRequestPostNotificationPermission();
        handleIntent(getIntent());
    }

    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        if (intent != null && "OPEN_RECONCILIATION".equals(intent.getAction())) {
            pendingOpenReconciliation = true;
            pendingReconciliationId = intent.getStringExtra("notification_id");

            if (pendingReconciliationId != null) {
                try {
                    int notifIntId = Math.abs(pendingReconciliationId.hashCode());
                    NotificationManagerCompat.from(this).cancel(notifIntId);
                } catch (Exception ignored) {}
            }

            syncPendingBankNotifications();
            triggerOpenReconciliationEvent();
        }
    }

    public void checkAndRequestPostNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS}, 1002);
            }
        }
    }

    public void ensureListenerConnected() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                ComponentName cn = new ComponentName(this, BankNotificationListener.class);
                PackageManager pm = getPackageManager();
                pm.setComponentEnabledSetting(cn, PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP);
                pm.setComponentEnabledSetting(cn, PackageManager.COMPONENT_ENABLED_STATE_ENABLED, PackageManager.DONT_KILL_APP);
                android.service.notification.NotificationListenerService.requestRebind(cn);
            }
        } catch (Exception ignored) {}
    }

    @Override
    public void onResume() {
        super.onResume();
        setupNotificationBridge();

        ensureListenerConnected();

        if (BankNotificationListener.instance != null) {
            BankNotificationListener.instance.scanActiveNotifications(false);
        }
        syncPendingBankNotifications();

        try {
            getWindow().getDecorView().postDelayed(() -> {
                if (BankNotificationListener.instance != null) {
                    BankNotificationListener.instance.scanActiveNotifications(false);
                }
                syncPendingBankNotifications();
            }, 400);

            getWindow().getDecorView().postDelayed(() -> {
                if (BankNotificationListener.instance != null) {
                    BankNotificationListener.instance.scanActiveNotifications(false);
                }
                syncPendingBankNotifications();
            }, 1200);
        } catch (Exception ignored) {}

        try {
            IntentFilter filter = new IntentFilter();
            filter.addAction("com.homemoney.app.NOTIFICATION_RECEIVED");
            filter.addAction("com.homemoney.app.NOTIFICATION_DISMISSED");

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

    public void syncPendingBankNotifications() {
        try {
            SharedPreferences prefs = getSharedPreferences(BankNotificationListener.PREFS_NAME, Context.MODE_PRIVATE);

            // 1. Sincroniza notificações pendentes capturadas
            String pending = prefs.getString(BankNotificationListener.KEY_PENDING, "[]");
            if (!"[]".equals(pending) && !pending.isEmpty()) {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    WebView webView = getBridge().getWebView();
                    String base64 = android.util.Base64.encodeToString(
                        pending.getBytes(java.nio.charset.StandardCharsets.UTF_8),
                        android.util.Base64.NO_WRAP
                    );
                    String js = "window.dispatchEvent(new CustomEvent('homemoney_android_notifications', { detail: decodeURIComponent(escape(atob('" + base64 + "'))) }));";
                    webView.post(() -> webView.evaluateJavascript(js, null));

                    prefs.edit().putString(BankNotificationListener.KEY_PENDING, "[]").apply();
                }
            }

            // 2. Sincroniza notificações dispensadas via ação na bandeja
            String dismissed = prefs.getString(BankNotificationListener.KEY_DISMISSED, "[]");
            if (!"[]".equals(dismissed) && !dismissed.isEmpty()) {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    WebView webView = getBridge().getWebView();
                    String base64Dismissed = android.util.Base64.encodeToString(
                        dismissed.getBytes(java.nio.charset.StandardCharsets.UTF_8),
                        android.util.Base64.NO_WRAP
                    );
                    String jsDismissed = "window.dispatchEvent(new CustomEvent('homemoney_android_dismissed_notifications', { detail: decodeURIComponent(escape(atob('" + base64Dismissed + "'))) }));";
                    webView.post(() -> webView.evaluateJavascript(jsDismissed, null));

                    prefs.edit().putString(BankNotificationListener.KEY_DISMISSED, "[]").apply();
                }
            }

            // 3. Se houver intent para abrir o modal de conciliação
            if (pendingOpenReconciliation) {
                triggerOpenReconciliationEvent();
            }

        } catch (Exception ignored) {}
    }

    private void triggerOpenReconciliationEvent() {
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                WebView webView = getBridge().getWebView();
                String idArg = pendingReconciliationId != null ? pendingReconciliationId : "";
                String js = "window.dispatchEvent(new CustomEvent('homemoney_open_reconciliation', { detail: { id: '" + idArg + "' } }));";
                webView.post(() -> webView.evaluateJavascript(js, null));
                webView.postDelayed(() -> webView.evaluateJavascript(js, null), 400);
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
        public boolean isPostNotificationPermissionGranted() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                return context.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
            }
            return true;
        }

        @JavascriptInterface
        public void requestPostNotificationPermission() {
            if (context instanceof MainActivity) {
                ((MainActivity) context).runOnUiThread(() -> {
                    ((MainActivity) context).checkAndRequestPostNotificationPermission();
                });
            }
        }

        @JavascriptInterface
        public boolean consumePendingOpenReconciliation() {
            if (context instanceof MainActivity) {
                MainActivity activity = (MainActivity) context;
                boolean shouldOpen = activity.pendingOpenReconciliation;
                activity.pendingOpenReconciliation = false;
                return shouldOpen;
            }
            return false;
        }

        @JavascriptInterface
        public String getPendingReconciliationId() {
            if (context instanceof MainActivity) {
                MainActivity activity = (MainActivity) context;
                String id = activity.pendingReconciliationId;
                activity.pendingReconciliationId = null;
                return id;
            }
            return null;
        }

        @JavascriptInterface
        public String getPendingNotificationsJson() {
            try {
                SharedPreferences prefs = context.getSharedPreferences(BankNotificationListener.PREFS_NAME, Context.MODE_PRIVATE);
                String pending = prefs.getString(BankNotificationListener.KEY_PENDING, "[]");
                prefs.edit().putString(BankNotificationListener.KEY_PENDING, "[]").apply();
                return pending;
            } catch (Exception e) {
                return "[]";
            }
        }

        @JavascriptInterface
        public void checkNotificationsNow() {
            try {
                if (context instanceof MainActivity) {
                    MainActivity act = (MainActivity) context;
                    act.ensureListenerConnected();

                    if (BankNotificationListener.instance != null) {
                        BankNotificationListener.instance.scanActiveNotifications(false);
                    }
                    act.runOnUiThread(() -> act.syncPendingBankNotifications());

                    try {
                        act.getWindow().getDecorView().postDelayed(() -> {
                            if (BankNotificationListener.instance != null) {
                                BankNotificationListener.instance.scanActiveNotifications(false);
                            }
                            act.syncPendingBankNotifications();
                        }, 400);

                        act.getWindow().getDecorView().postDelayed(() -> {
                            if (BankNotificationListener.instance != null) {
                                BankNotificationListener.instance.scanActiveNotifications(false);
                            }
                            act.syncPendingBankNotifications();
                        }, 1000);
                    } catch (Exception ignored) {}
                } else {
                    if (BankNotificationListener.instance != null) {
                        BankNotificationListener.instance.scanActiveNotifications(false);
                    }
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
