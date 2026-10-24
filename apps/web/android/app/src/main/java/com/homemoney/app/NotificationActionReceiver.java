package com.homemoney.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.util.Log;

import androidx.core.app.NotificationManagerCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class NotificationActionReceiver extends BroadcastReceiver {

    private static final String TAG = "NotifActionReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;

        String action = intent.getAction();
        if ("DISMISS_NOTIFICATION".equals(action)) {
            String notifId = intent.getStringExtra("notification_id");
            int notifIntId = intent.getIntExtra("notification_int_id", -1);
            String bank = intent.getStringExtra("bank");
            String title = intent.getStringExtra("title");
            String text = intent.getStringExtra("text");

            Log.d(TAG, "Ação Dispensar recebida para notificação ID: " + notifId);

            // 1. Remove a notificação da bandeja do sistema
            if (notifIntId != -1) {
                try {
                    NotificationManagerCompat.from(context).cancel(notifIntId);
                } catch (Exception e) {
                    Log.e(TAG, "Erro ao cancelar notificação visual", e);
                }
            }

            // 2. Remove de KEY_PENDING e transfere para KEY_DISMISSED no SharedPreferences
            try {
                SharedPreferences prefs = context.getSharedPreferences(BankNotificationListener.PREFS_NAME, Context.MODE_PRIVATE);
                
                String pendingJson = prefs.getString(BankNotificationListener.KEY_PENDING, "[]");
                JSONArray pendingArray = new JSONArray(pendingJson);
                JSONArray updatedPending = new JSONArray();
                JSONObject dismissedObj = null;

                for (int i = 0; i < pendingArray.length(); i++) {
                    JSONObject obj = pendingArray.getJSONObject(i);
                    boolean isMatch = (notifId != null && notifId.equals(obj.optString("id"))) ||
                                      (text != null && text.equals(obj.optString("text")));
                    if (isMatch) {
                        dismissedObj = obj;
                    } else {
                        updatedPending.put(obj);
                    }
                }
                prefs.edit().putString(BankNotificationListener.KEY_PENDING, updatedPending.toString()).apply();

                if (dismissedObj == null) {
                    dismissedObj = new JSONObject();
                    dismissedObj.put("id", notifId != null ? notifId : ("android_dismissed_" + System.currentTimeMillis()));
                    dismissedObj.put("bank", bank != null ? bank : "Nubank");
                    dismissedObj.put("title", title != null ? title : "");
                    dismissedObj.put("text", text != null ? text : "");
                    SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault());
                    SimpleDateFormat timeFormat = new SimpleDateFormat("HH:mm", Locale.getDefault());
                    Date now = new Date();
                    dismissedObj.put("date", dateFormat.format(now));
                    dismissedObj.put("time", timeFormat.format(now));
                }

                String dismissedJson = prefs.getString(BankNotificationListener.KEY_DISMISSED, "[]");
                JSONArray dismissedArray = new JSONArray(dismissedJson);
                dismissedArray.put(dismissedObj);
                prefs.edit().putString(BankNotificationListener.KEY_DISMISSED, dismissedArray.toString()).apply();

                Log.d(TAG, "Notificação arquivada em KEY_DISMISSED com sucesso.");

                // 3. Se MainActivity estiver em execução, notifica imediatamente
                try {
                    Intent broadcast = new Intent("com.homemoney.app.NOTIFICATION_DISMISSED");
                    broadcast.setPackage(context.getPackageName());
                    broadcast.putExtra("notification_id", notifId);
                    context.sendBroadcast(broadcast);
                } catch (Exception ignored) {}

            } catch (Exception e) {
                Log.e(TAG, "Erro ao processar dispensa no SharedPreferences", e);
            }
        }
    }
}
