package com.homemoney.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class BankNotificationListener extends NotificationListenerService {

    private static final String TAG = "BankNotifListener";
    public static final String PREFS_NAME = "HomeMoneyNotifications";
    public static final String KEY_PENDING = "pending_notifications";
    public static final String KEY_DISMISSED = "dismissed_notifications";
    public static final String KEY_NOTIFIED_HASHES = "notified_hashes";
    public static final String CHANNEL_ID = "homemoney_bank_suggestions";

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

    public void scanActiveNotifications(boolean postSystemNotification) {
        try {
            StatusBarNotification[] active = getActiveNotifications();
            if (active != null) {
                Log.d(TAG, "Escaneando " + active.length + " notificações ativas na bandeja (notificar=" + postSystemNotification + ")...");
                for (StatusBarNotification sbn : active) {
                    processNotification(sbn, postSystemNotification);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Erro ao escanear notificações ativas", e);
        }
    }

    public void scanActiveNotifications() {
        // Ao clicar no botão de atualização dentro do app, NÃO dispara notificações pop-up no sistema
        scanActiveNotifications(false);
    }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        // Quando uma notificação nova do banco chega do sistema, dispara notificação de sugestão nativa
        processNotification(sbn, true);
    }

    private void processNotification(StatusBarNotification sbn, boolean postSystemNotification) {
        if (sbn == null || sbn.getNotification() == null) return;

        String packageName = sbn.getPackageName();
        if (packageName == null || packageName.equals(getPackageName())) return;

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

            Log.d(TAG, "Notificação bancária identificada [" + matchedBank + "]: " + title + " | " + text);

            SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault());
            SimpleDateFormat timeFormat = new SimpleDateFormat("HH:mm", Locale.getDefault());
            Date now = new Date();

            String notifId = "android_" + System.currentTimeMillis() + "_" + matchedBank.toLowerCase();
            JSONObject notifObj = new JSONObject();
            notifObj.put("id", notifId);
            notifObj.put("bank", matchedBank);
            notifObj.put("title", title);
            notifObj.put("text", text);
            notifObj.put("date", dateFormat.format(now));
            notifObj.put("time", timeFormat.format(now));
            notifObj.put("package", packageName);

            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

            // Deduplicação persistente via hash para nunca notificar a mesma notificação repetidamente
            String hash = String.valueOf((matchedBank + "|" + title + "|" + text).hashCode());
            String notifiedJson = prefs.getString(KEY_NOTIFIED_HASHES, "[]");
            JSONArray notifiedArray = new JSONArray(notifiedJson);
            boolean alreadyNotified = false;
            for (int i = 0; i < notifiedArray.length(); i++) {
                if (hash.equals(notifiedArray.optString(i))) {
                    alreadyNotified = true;
                    break;
                }
            }

            // Armazena no SharedPreferences se ainda não estiver na fila pendente
            String existingJson = prefs.getString(KEY_PENDING, "[]");
            JSONArray array = new JSONArray(existingJson);
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

            // Dispara notificação nativa apenas se postSystemNotification for true e não tiver sido notificada antes
            if (postSystemNotification && !alreadyNotified) {
                notifiedArray.put(hash);
                if (notifiedArray.length() > 200) {
                    JSONArray trimmed = new JSONArray();
                    for (int i = notifiedArray.length() - 100; i < notifiedArray.length(); i++) {
                        trimmed.put(notifiedArray.get(i));
                    }
                    notifiedArray = trimmed;
                }
                prefs.edit().putString(KEY_NOTIFIED_HASHES, notifiedArray.toString()).apply();

                postSuggestionNotification(matchedBank, title, text, notifId);
            }

        } catch (Exception e) {
            Log.e(TAG, "Erro ao processar notificação bancária", e);
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                if (manager != null) {
                    NotificationChannel existingChannel = manager.getNotificationChannel(CHANNEL_ID);
                    if (existingChannel == null) {
                        NotificationChannel channel = new NotificationChannel(
                            CHANNEL_ID,
                            "Sugestões de Transferência",
                            NotificationManager.IMPORTANCE_HIGH
                        );
                        channel.setDescription("Sugestões automáticas para registrar transações bancárias no HomeMoney");
                        channel.enableLights(true);
                        channel.enableVibration(true);
                        channel.setShowBadge(true);
                        manager.createNotificationChannel(channel);
                    }
                }
            } catch (Exception e) {
                Log.e(TAG, "Erro ao criar NotificationChannel", e);
            }
        }
    }

    private void postSuggestionNotification(String bank, String title, String text, String notifId) {
        try {
            createNotificationChannel();

            int notifIntId = Math.abs(notifId.hashCode());

            // Ação 1: Conciliar (Abre o HomeMoney na fila/modal de conciliação)
            Intent openIntent = new Intent(this, MainActivity.class);
            openIntent.setAction("OPEN_RECONCILIATION");
            openIntent.putExtra("notification_id", notifId);
            openIntent.putExtra("notification_int_id", notifIntId);
            openIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

            PendingIntent openPendingIntent = PendingIntent.getActivity(
                this,
                notifIntId,
                openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            // Ação 2: Dispensar (Cancela notificação da barra e arquiva nas dispensadas)
            Intent dismissIntent = new Intent(this, NotificationActionReceiver.class);
            dismissIntent.setAction("DISMISS_NOTIFICATION");
            dismissIntent.putExtra("notification_id", notifId);
            dismissIntent.putExtra("notification_int_id", notifIntId);
            dismissIntent.putExtra("bank", bank);
            dismissIntent.putExtra("title", title);
            dismissIntent.putExtra("text", text);

            PendingIntent dismissPendingIntent = PendingIntent.getBroadcast(
                this,
                notifIntId + 1,
                dismissIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            int appIcon = getApplicationInfo().icon;
            if (appIcon == 0) {
                appIcon = R.mipmap.ic_launcher;
            }

            String notifTitle = "💰 " + bank + " • Registrar Transferência?";
            String contentText = !text.isEmpty() ? text : title;

            NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(appIcon)
                .setContentTitle(notifTitle)
                .setContentText(contentText)
                .setStyle(new NotificationCompat.BigTextStyle()
                    .bigText(contentText)
                    .setSummaryText("HomeMoney • Conciliação"))
                .setContentIntent(openPendingIntent)
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .addAction(new NotificationCompat.Action(
                    0,
                    "✅ Conciliar",
                    openPendingIntent
                ))
                .addAction(new NotificationCompat.Action(
                    0,
                    "✖ Dispensar",
                    dismissPendingIntent
                ));

            NotificationManagerCompat.from(this).notify(notifIntId, builder.build());
            Log.d(TAG, "Notificação de sugestão emitida com sucesso! ID: " + notifIntId);

        } catch (Exception e) {
            Log.e(TAG, "Erro ao disparar notificação nativa de sugestão", e);
        }
    }
}
