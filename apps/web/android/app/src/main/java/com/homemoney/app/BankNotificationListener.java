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
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class BankNotificationListener extends NotificationListenerService {

    private static final String TAG = "BankNotifListener";
    public static final String PREFS_NAME = "HomeMoneyNotifications";
    public static final String KEY_PENDING = "pending_notifications";
    public static final String KEY_DISMISSED = "dismissed_notifications";
    public static final String KEY_NOTIFIED_HASHES = "notified_hashes";
    public static final String CHANNEL_ID = "homemoney_bank_suggestions";

    public static volatile BankNotificationListener instance;

    // =========================================================================
    // Filtros Estritos de Transações e Não-Transações
    // =========================================================================

    // 1. Padrão de exclusão: Rejeita sugestões de empréstimo, ofertas, limites, faturas fechadas, segurança, etc.
    private static final Pattern EXCLUSION_PATTERN = Pattern.compile(
        "(?i)\\b(" +
        // Empréstimos, financiamentos e crédito pessoal
        "empr[eé]stimo|empr[eé]stimos|pr[eé][- ]?aprovad[ao]|simule|simular|simula[cç][aã]o|" +
        "dinheiro\\s+extra|grana\\s+extra|cr[eé]dito\\s+pessoal|cr[eé]dito\\s+para\\s+voc[eê]|" +
        "cr[eé]dito\\s+dispon[ií]vel|contrate\\s+agora|contratar|pegue\\s+at[eé]|taxa\\s+reduzida|" +
        "taxas?\\s+especia(l|is)|refinanciamento|renegocia[cç][aã]o|quite\\s+suas?\\s+d[ií]vidas?|" +
        
        // Limite e ofertas de cartão
        "aumentamos\\s+seu\\s+limite|aumento\\s+de\\s+limite|limite\\s+aumentad[ao]|novo\\s+limite|" +
        "ajustar\\s+limite|ajuste\\s+de\\s+limite|limite\\s+liberado|pe[cç]a\\s+seu\\s+cart[aã]o|" +
        "cart[aã]o\\s+a\\s+caminho|cart[aã]o\\s+chegou|desbloqueie\\s+seu\\s+cart[aã]o|cart[aã]o\\s+aprovado|" +
        "anuidade\\s+gr[aá]tis|sem\\s+anuidade|" +
        
        // Fatura fechada ou vencimento (sem pagamento efetuado)
        "fatura\\s+fechou|fechamento\\s+d[ea]\\s+fatura|fatura\\s+fechada|sua\\s+fatura\\s+vence|" +
        "lembrete\\s+de\\s+fatura|lembrete\\s+de\\s+vencimento|sua\\s+fatura\\s+est[aá]\\s+dispon[ií]vel|" +
        "fatura\\s+dispon[ií]vel|resumo\\s+da\\s+fatura|" +
        
        // Investimentos, poupança, seguros e caixinhas
        "invista\\s+a\\s+partir|comece\\s+a\\s+investir|seguro\\s+de\\s+vida|seguro\\s+celular|" +
        "seguro\\s+residencial|seguro\\s+auto|guarde\\s+seu\\s+dinheiro|guarde\\s+a\\s+partir|" +
        "conhe[cç]a\\s+as?\\s+caixinhas?|informe\\s+de\\s+rendimentos|imposto\\s+de\\s+renda|" +
        
        // Segurança, códigos, senhas e tokens
        "c[oó]digo\\s+de\\s+seguran[cç]a|c[oó]digo\\s+de\\s+verifica[cç][aã]o|c[oó]digo\\s+de\\s+valida[cç][aã]o|" +
        "c[oó]digo\\s+de\\s+autoriza[cç][aã]o|i[- ]?safe|chave\\s+de\\s+seguran[cç]a|token|" +
        "novo\\s+acesso|acesso\\s+identificado|dispositivo\\s+desconhecido|login\\s+suspeito|" +
        "senha\\s+alterada|dados\\s+cadastrais|atualize\\s+seu\\s+app|" +
        
        // Promoções, cupons, cashback de shopping e marketing
        "cashback\\s+no\\s+shopping|shopping\\s+nu|shopping\\s+inter|aproveite\\s+a\\s+promo[cç][aã]o|" +
        "oferta\\s+exclusiva|desconto\\s+exclusivo|cupom|indique\\s+e\\s+ganhe|indique\\s+um\\s+amigo|" +
        "pesquisa\\s+de\\s+satisfa[cç][aã]o|avalie\\s+nosso\\s+app|" +
        
        // Agendamento futuro (não executado ainda)
        "pix\\s+agendado|transfer[eê]ncia\\s+agendada|pagamento\\s+agendado|agendado\\s+com\\s+sucesso" +
        ")\\b"
    );

    // 2. Padrão monetário obrigatório (deve conter valor em R$ ou formato monetário)
    private static final Pattern MONEY_PATTERN = Pattern.compile("(?i)(?:R\\$\\s*([0-9.,]+)|([0-9]{1,3}(?:[.,][0-9]{3})*[.,][0-9]{2}))");

    // 3. Padrão de ação de transação positiva (Pix, compra no cartão, transferência, boleto pago, depósito)
    private static final Pattern TRANSACTION_ACTION_PATTERN = Pattern.compile(
        "(?i)(" +
        // Pix / Transferência / Depósito Recebido
        "recebeu\\s+(?:uma\\s+transfer[eê]ncia|um\\s+pix|dinheiro)|" +
        "pix\\s+recebido|transfer[eê]ncia\\s+recebida|te\\s+enviou\\s+(?:um\\s+pix|uma\\s+transfer[eê]ncia|R\\$)|" +
        "recebimento\\s+de\\s+pix|dep[oó]sito\\s+recebido|sal[aá]rio\\s+(?:creditado|depositado)|cr[eé]dito\\s+em\\s+conta|" +
        
        // Pix / Transferência Enviada
        "transferiu|transfer[eê]ncia\\s+(?:enviada|realizada)|pix\\s+(?:enviado|realizado)|" +
        "(?:voc[eê]|voce)?\\s*pagou.*?no\\s+pix|enviou\\s+um\\s+pix|" +
        
        // Compra no Cartão / Débito / Crédito
        "compra\\s+(?:de\\s+R\\$|aprovada|realizada|no\\s+cr[eé]dito|no\\s+d[eé]bito|com\\s+cart[aã]o)|" +
        "pagamento\\s+aprovado|" +
        
        // Pagamento de Boleto / Contas
        "pagamento\\s+(?:de\\s+boleto|efetuado|confirmado|realizado)|boleto\\s+pago|" +
        "pagamento\\s+d[ea]\\s+fatura\\s+(?:efetuado|confirmado|recebido|realizado)|" +
        
        // Saque
        "saque\\s+(?:realizado|efetuado|de\\s+R\\$)" +
        ")"
    );

    /**
     * Identifica estritamente o banco emissor pelo nome do pacote do Android.
     * Pacotes não cadastrados (como WhatsApp, Telegram, navegadores, SMS, etc.) retornam null.
     */
    public static String identifyBankByPackage(String pkgLower) {
        if (pkgLower == null) return null;

        // 1. Nubank
        if (pkgLower.equals("com.nu.production") || pkgLower.startsWith("com.nu.production.") ||
            pkgLower.equals("com.nubank") || pkgLower.startsWith("com.nubank.")) {
            return "Nubank";
        }

        // 2. Banco do Brasil
        if (pkgLower.equals("br.com.bb.android") || pkgLower.startsWith("br.com.bb.") ||
            pkgLower.contains("bancodobrasil")) {
            return "BB";
        }

        // 3. Caixa Econômica Federal
        if (pkgLower.equals("br.com.gabba.caixa") || pkgLower.equals("br.gov.caixa.tem") ||
            pkgLower.startsWith("br.gov.caixa.") || pkgLower.startsWith("br.com.caixa.")) {
            return "Caixa";
        }

        // 4. Bradesco
        if (pkgLower.equals("com.bradesco") || pkgLower.startsWith("com.bradesco.") ||
            pkgLower.equals("me.next.app")) {
            return "Bradesco";
        }

        // 5. Santander
        if (pkgLower.equals("com.santander.app") || pkgLower.startsWith("com.santander.")) {
            return "Santander";
        }

        // 6. Banco Inter
        if (pkgLower.equals("br.com.intermedium") || pkgLower.startsWith("br.com.intermedium.")) {
            return "Inter";
        }

        // 7. Itaú / Iti
        if (pkgLower.equals("com.itau") || pkgLower.startsWith("com.itau.") ||
            pkgLower.equals("com.iti.iti") || pkgLower.startsWith("com.iti.")) {
            return "Itaú";
        }

        // 8. C6 Bank
        if (pkgLower.equals("com.c6bank.app") || pkgLower.startsWith("com.c6bank.")) {
            return "C6 Bank";
        }

        // 9. PicPay
        if (pkgLower.equals("com.picpay") || pkgLower.startsWith("com.picpay.")) {
            return "PicPay";
        }

        // 10. Mercado Pago
        if (pkgLower.equals("com.mercadopago.wallet") || pkgLower.startsWith("com.mercadopago.")) {
            return "Mercado Pago";
        }

        // 11. PagBank / PagSeguro
        if (pkgLower.equals("br.com.uol.ps") || pkgLower.startsWith("br.com.uol.ps.")) {
            return "PagBank";
        }

        // 12. BTG Pactual
        if (pkgLower.startsWith("com.btg.pactual.") || pkgLower.startsWith("com.btg.investimentos")) {
            return "BTG Pactual";
        }

        // 13. Neon
        if (pkgLower.equals("br.com.neon") || pkgLower.startsWith("br.com.neon.")) {
            return "Neon";
        }

        // 14. Sicoob
        if (pkgLower.equals("br.com.sicoob.netbr") || pkgLower.startsWith("br.com.sicoob.")) {
            return "Sicoob";
        }

        // 15. Sicredi
        if (pkgLower.equals("br.com.sicredi.mobile") || pkgLower.startsWith("br.com.sicredi.")) {
            return "Sicredi";
        }

        return null;
    }

    /**
     * Validação estrita para determinar se o conteúdo da notificação refere-se a uma
     * transação financeira concluída (ex: Pix, compra no cartão, transferência, boleto pago).
     * Rejeita sugestões de empréstimos, aumentos de limites, faturas fechadas, tokens e marketing.
     */
    public static boolean isStrictTransactionNotification(String title, String text) {
        String combined = ((title != null ? title : "") + " " + (text != null ? text : "")).trim();
        if (combined.isEmpty()) return false;

        // A. Se corresponder a qualquer termo de exclusão (marketing, empréstimo, limite, senha, etc.), rejeita
        if (EXCLUSION_PATTERN.matcher(combined).find()) {
            return false;
        }

        // B. Deve obrigatoriamente conter um valor monetário válido
        if (!MONEY_PATTERN.matcher(combined).find()) {
            return false;
        }

        // C. Deve obrigatoriamente conter um indicador de transação financeira real
        if (!TRANSACTION_ACTION_PATTERN.matcher(combined).find()) {
            return false;
        }

        return true;
    }

    @Override
    public void onListenerConnected() {
        super.onListenerConnected();
        instance = this;
        Log.d(TAG, "BankNotificationListener conectado com sucesso!");
        scanActiveNotifications(false);
        try {
            Intent broadcast = new Intent("com.homemoney.app.NOTIFICATION_RECEIVED");
            broadcast.setPackage(getPackageName());
            sendBroadcast(broadcast);
        } catch (Exception ignored) {}
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
        scanActiveNotifications(false);
    }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        processNotification(sbn, true);
    }

    private void processNotification(StatusBarNotification sbn, boolean postSystemNotification) {
        if (sbn == null || sbn.getNotification() == null) return;

        String packageName = sbn.getPackageName();
        if (packageName == null || packageName.equals(getPackageName())) return;

        String pkgLower = packageName.toLowerCase();

        // 1. FILTRO ESTRITO DE BANCO: Apenas apps oficiais de bancos e instituições financeiras
        String matchedBank = identifyBankByPackage(pkgLower);
        if (matchedBank == null) {
            // Rejeita qualquer outro aplicativo (ex: WhatsApp, Telegram, redes sociais, SMS, navegadores, etc.)
            return;
        }

        try {
            Notification notification = sbn.getNotification();
            Bundle extras = notification.extras;
            if (extras == null) return;

            CharSequence titleChar = extras.getCharSequence(Notification.EXTRA_TITLE);
            CharSequence titleBigChar = extras.getCharSequence(Notification.EXTRA_TITLE_BIG);
            CharSequence textChar = extras.getCharSequence(Notification.EXTRA_TEXT);
            CharSequence bigTextChar = extras.getCharSequence(Notification.EXTRA_BIG_TEXT);
            CharSequence subTextChar = extras.getCharSequence(Notification.EXTRA_SUB_TEXT);
            CharSequence infoTextChar = extras.getCharSequence(Notification.EXTRA_INFO_TEXT);

            String title = titleChar != null ? titleChar.toString() : "";
            if (title.isEmpty() && titleBigChar != null) {
                title = titleBigChar.toString();
            }

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

            if (text.isEmpty() && infoTextChar != null) {
                text = infoTextChar.toString();
            }

            if (text.isEmpty() && notification.tickerText != null) {
                text = notification.tickerText.toString();
            }

            if (text.isEmpty() && !title.isEmpty()) {
                text = title;
            }

            if (text.isEmpty()) return;

            // 2. FILTRO ESTRITO DE TRANSAÇÃO: Apenas transações financeiras reais concluídas
            // Rejeita sugestões de empréstimo, aumentos de limite, faturas fechadas, tokens e marketing
            if (!isStrictTransactionNotification(title, text)) {
                Log.d(TAG, "Notificação bancária descartada pelo filtro estrito de transação [" + matchedBank + "]: " + title + " | " + text);
                return;
            }

            Log.d(TAG, "Transação bancária identificada com sucesso [" + matchedBank + "]: " + title + " | " + text);

            SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault());
            SimpleDateFormat timeFormat = new SimpleDateFormat("HH:mm", Locale.getDefault());
            Date now = new Date();

            String notifId = "android_" + sbn.getId() + "_" + sbn.getPostTime();
            JSONObject notifObj = new JSONObject();
            notifObj.put("id", notifId);
            notifObj.put("bank", matchedBank);
            notifObj.put("title", title);
            notifObj.put("text", text);
            notifObj.put("date", dateFormat.format(now));
            notifObj.put("time", timeFormat.format(now));
            notifObj.put("package", packageName);
            notifObj.put("postTime", sbn.getPostTime());

            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

            // Identificador único do evento de notificação baseado no ID do Android e timestamp da postagem
            String uniqueEventKey = sbn.getId() + "_" + sbn.getPostTime();
            String notifiedJson = prefs.getString(KEY_NOTIFIED_HASHES, "[]");
            JSONArray notifiedArray = new JSONArray(notifiedJson);
            boolean alreadyNotified = false;
            for (int i = 0; i < notifiedArray.length(); i++) {
                if (uniqueEventKey.equals(notifiedArray.optString(i))) {
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
                if (notifId.equals(obj.optString("id"))) {
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

            // Dispara notificação nativa com banner apenas para novos eventos de notificação recebidos
            if (postSystemNotification && !alreadyNotified) {
                notifiedArray.put(uniqueEventKey);
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

            // Ação 1: Registrar Agora (Abre o HomeMoney na fila/modal de conciliação)
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
                    "✅ Registrar Agora",
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
