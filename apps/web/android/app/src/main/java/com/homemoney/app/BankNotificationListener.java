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

        // Filtro estrito: apenas os 6 maiores bancos brasileiros
        String matchedBank = null;
        if (pkgLower.contains("nu.production") || pkgLower.contains("nubank")) {
            matchedBank = "Nubank";
        } else if (pkgLower.contains("bb.android") || pkgLower.contains("bancodobrasil")) {
            matchedBank = "BB";
        } else if (pkgLower.contains("gabba.caixa") || pkgLower.contains("caixa.tem") || pkgLower.contains("br.gov.caixa")) {
            matchedBank = "Caixa";
        } else if (pkgLower.contains("bradesco")) {
            matchedBank = "Bradesco";
        } else if (pkgLower.contains("santander")) {
            matchedBank = "Santander";
        } else if (pkgLower.contains("intermedium") || pkgLower.contains("bancointer") || pkgLower.contains("banco.inter")) {
            matchedBank = "Inter";
        }

        if (matchedBank == null) {
            return; // Notificação de outro app qualquer ignorada
        }

        try {
            Notification notification = sbn.getNotification();
            Bundle extras = notification.extras;
            if (extras == null) return;

            CharSequence titleChar = extras.getCharSequence(Notification.EXTRA_TITLE);
            CharSequence textChar = extras.getCharSequence(Notification.EXTRA_TEXT);
            CharSequence bigTextChar = extras.getCharSequence(Notification.EXTRA_BIG_TEXT);

            String title = titleChar != null ? titleChar.toString() : "";
            String text = textChar != null ? textChar.toString() : "";

            if (text.isEmpty() && bigTextChar != null) {
                text = bigTextChar.toString();
            } else if (bigTextChar != null && bigTextChar.length() > text.length()) {
                text = bigTextChar.toString();
            }

            if (text.isEmpty() && !title.isEmpty()) {
                text = title;
            }

            if (text.isEmpty()) return;

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
            array.put(notifObj);

            prefs.edit().putString(KEY_PENDING, array.toString()).apply();
            Log.d(TAG, "Notificação persistida no SharedPreferences com sucesso!");

            // Notifica MainActivity caso o app esteja aberto em primeiro plano
            try {
                Intent broadcast = new Intent("com.homemoney.app.NOTIFICATION_RECEIVED");
                broadcast.setPackage(getPackageName());
                sendBroadcast(broadcast);
            } catch (Exception ignored) {}

        } catch (Exception e) {
            Log.e(TAG, "Erro ao processar notificação bancária", e);
        }
    }
}

