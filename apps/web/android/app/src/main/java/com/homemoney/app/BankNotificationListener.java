package com.homemoney.app;

import android.app.Notification;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class BankNotificationListener extends NotificationListenerService {

    private static final String TAG = "BankNotifListener";
    public static final String PREFS_NAME = "HomeMoneyNotifications";
    public static final String KEY_PENDING = "pending_notifications";

    public static volatile BankNotificationListener instance;

    @Override
    public void onListenerConnected() {
        super.onListenerConnected();
        instance = this;
        Log.d(TAG, "BankNotificationListener conectado com sucesso!");
    }

    @Override
    public void onListenerDisconnected() {
        super.onListenerDisconnected();
        if (instance == this) {
            instance = null;
        }
        Log.d(TAG, "BankNotificationListener desconectado.");
    }

    public void scanActiveNotifications() {
        try {
            StatusBarNotification[] active = getActiveNotifications();
            if (active != null) {
                Log.d(TAG, "Escaneando " + active.length + " notificações ativas na bandeja...");
                for (StatusBarNotification sbn : active) {
                    onNotificationPosted(sbn);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Erro ao escanear notificações ativas", e);
        }
    }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null || sbn.getNotification() == null) return;

        String packageName = sbn.getPackageName();
        if (packageName == null) return;

        String pkgLower = packageName.toLowerCase();

        try {
            Notification notification = sbn.getNotification();
            Bundle extras = notification.extras;
            if (extras == null) return;

            CharSequence titleChar = extras.getCharSequence(Notification.EXTRA_TITLE);
            CharSequence textChar = extras.getCharSequence(Notification.EXTRA_TEXT);
            CharSequence bigTextChar = extras.getCharSequence(Notification.EXTRA_BIG_TEXT);
            CharSequence subTextChar = extras.getCharSequence(Notification.EXTRA_SUB_TEXT);

            String title = titleChar != null ? titleChar.toString() : "";
            String text = textChar != null ? textChar.toString() : "";

            if (bigTextChar != null && bigTextChar.length() > text.length()) {
                text = bigTextChar.toString();
            }

            if (text.isEmpty() && extras.containsKey(Notification.EXTRA_TEXT_LINES)) {
                CharSequence[] lines = extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES);
                if (lines != null) {
                    StringBuilder sb = new StringBuilder();
                    for (CharSequence l : lines) {
                        if (l != null) {
                            if (sb.length() > 0) sb.append(" ");
                            sb.append(l.toString());
                        }
                    }
                    text = sb.toString();
                }
            }

            if (text.isEmpty() && subTextChar != null) {
                text = subTextChar.toString();
            }

            if (text.isEmpty() && notification.tickerText != null) {
                text = notification.tickerText.toString();
            }

            if (text.isEmpty() && !title.isEmpty()) {
                text = title;
            }

            if (text.isEmpty()) return;

            String combinedLower = (title + " " + text + " " + pkgLower).toLowerCase();

            // Identificação do banco (por pacote ou por menção no texto/título)
            String matchedBank = null;
            if (pkgLower.contains("nu.production") || combinedLower.contains("nubank")) {
                matchedBank = "Nubank";
            } else if (pkgLower.contains("bb.android") || combinedLower.contains("bancodobrasil") || combinedLower.contains("banco do brasil")) {
                matchedBank = "BB";
            } else if (pkgLower.contains("gabba.caixa") || pkgLower.contains("caixa.tem") || pkgLower.contains("br.gov.caixa") || combinedLower.contains("caixa econômica")) {
                matchedBank = "Caixa";
            } else if (pkgLower.contains("bradesco") || combinedLower.contains("bradesco")) {
                matchedBank = "Bradesco";
            } else if (pkgLower.contains("santander") || combinedLower.contains("santander")) {
                matchedBank = "Santander";
            } else if (pkgLower.contains("intermedium") || pkgLower.contains("bancointer") || pkgLower.contains("banco.inter") || combinedLower.contains("banco inter")) {
                matchedBank = "Inter";
            } else if (text.contains("R$") || title.contains("R$")) {
                if (combinedLower.contains("pix") || combinedLower.contains("transferência") || combinedLower.contains("transferencia") || combinedLower.contains("compra") || combinedLower.contains("pagamento")) {
                    matchedBank = "Nubank"; // default para notificação financeira identificada
                }
            }

            if (matchedBank == null) {
                return; // Notificação de app não bancário ignorada
            }

            // Log de diagnóstico no Logcat do Android Studio
            Log.d(TAG, "Notificação bancária capturada [" + matchedBank + "]: " + title + " | " + text);

            SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault());
            SimpleDateFormat timeFormat = new SimpleDateFormat("HH:mm", Locale.getDefault());
            Date now = new Date();

            JSONObject notifObj = new JSONObject();
            notifObj.put("id", "android_" + System.currentTimeMillis() + "_" + matchedBank.toLowerCase());
            notifObj.put("bank", matchedBank);
            notifObj.put("title", title);
            notifObj.put("text", text);
            notifObj.put("date", dateFormat.format(now));
            notifObj.put("time", timeFormat.format(now));
            notifObj.put("package", packageName);

            // Armazena no SharedPreferences para o WebView do Capacitor consumir
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String existingJson = prefs.getString(KEY_PENDING, "[]");
            JSONArray array = new JSONArray(existingJson);

            // Evita duplicatas idênticas salvas no mesmo minuto
            boolean duplicate = false;
            for (int i = 0; i < array.length(); i++) {
                JSONObject obj = array.getJSONObject(i);
                if (text.equals(obj.optString("text")) && title.equals(obj.optString("title"))) {
                    duplicate = true;
                    break;
                }
            }

            if (!duplicate) {
                array.put(notifObj);
                prefs.edit().putString(KEY_PENDING, array.toString()).apply();
                Log.d(TAG, "Notificação persistida no SharedPreferences com sucesso!");

                // Notifica MainActivity caso o app esteja aberto em primeiro plano
                try {
                    Intent broadcast = new Intent("com.homemoney.app.NOTIFICATION_RECEIVED");
                    broadcast.setPackage(getPackageName());
                    sendBroadcast(broadcast);
                } catch (Exception ignored) {}
            }

        } catch (Exception e) {
            Log.e(TAG, "Erro ao processar notificação bancária", e);
        }
    }
}

