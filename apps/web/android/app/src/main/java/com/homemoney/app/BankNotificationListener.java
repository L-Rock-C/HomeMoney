package com.homemoney.app;

import android.app.Notification;
import android.content.Context;
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

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null || sbn.getNotification() == null) return;

        String packageName = sbn.getPackageName();
        if (packageName == null) return;

        // Filtro estrito: apenas os 6 maiores bancos brasileiros
        String matchedBank = null;
        if (packageName.contains("nu.production")) {
            matchedBank = "Nubank";
        } else if (packageName.contains("bb.android")) {
            matchedBank = "BB";
        } else if (packageName.contains("gabba.Caixa") || packageName.contains("caixa.tem")) {
            matchedBank = "Caixa";
        } else if (packageName.contains("bradesco")) {
            matchedBank = "Bradesco";
        } else if (packageName.contains("santander")) {
            matchedBank = "Santander";
        } else if (packageName.contains("intermedium")) {
            matchedBank = "Inter";
        }

        if (matchedBank == null) {
            return; // Notificação de outro app qualquer (WhatsApp, Instagram, etc) ignorada
        }

        try {
            Notification notification = sbn.getNotification();
            Bundle extras = notification.extras;
            if (extras == null) return;

            CharSequence titleChar = extras.getCharSequence(Notification.EXTRA_TITLE);
            CharSequence textChar = extras.getCharSequence(Notification.EXTRA_TEXT);

            String title = titleChar != null ? titleChar.toString() : "";
            String text = textChar != null ? textChar.toString() : "";

            if (text.isEmpty()) return;

            // Log de diagnóstico
            Log.d(TAG, "Notificação bancária capturada [" + matchedBank + "]: " + text);

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

        } catch (Exception e) {
            Log.e(TAG, "Erro ao processar notificação bancária", e);
        }
    }
}
