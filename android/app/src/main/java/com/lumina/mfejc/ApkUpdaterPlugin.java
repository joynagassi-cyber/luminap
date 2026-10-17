package com.lumina.mfejc;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInstaller;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Self-updater natif : télécharge un APK (SHA-256 optionnel) vers le cache et
 * l'installe via PackageInstaller (API 26+ ; fallback lanceur système pour
 * API 21–25). Toute opération réseau/fichier se fait dans un thread dédié —
 * jamais sur le thread principal.
 */
@CapacitorPlugin(name = "ApkUpdater")
public class ApkUpdaterPlugin extends Plugin {

    private static final String TAG = "ApkUpdater";
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private PluginCall pendingInstallCall;

    private File targetApk() {
        File dir = new File(getContext().getCacheDir(), "updates");
        dir.mkdirs();
        return new File(dir, "update.apk");
    }

    @PluginMethod
    public void canInstall(PluginCall call) {
        boolean ok = getContext().getPackageManager().canRequestPackageInstalls();
        JSObject ret = new JSObject();
        ret.put("value", ok);
        call.resolve(ret);
    }

    @PluginMethod
    public void openInstallSettings(PluginCall call) {
        try {
            Uri uri = Uri.parse("package:" + getContext().getPackageName());
            Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, uri);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Impossible d'ouvrir les paramètres d'installation", e);
        }
    }

    @PluginMethod
    public void download(PluginCall call) {
        String url = call.getString("url");
        String sha256 = call.getString("sha256");

        if (url == null || !url.startsWith("https://")) {
            call.reject("URL HTTPS requise");
            return;
        }

        io.execute(() -> {
            try {
                File target = targetApk();
                if (target.exists()) {
                    target.delete();
                }

                HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
                conn.setInstanceFollowRedirects(true);
                conn.setConnectTimeout(30_000);
                conn.setReadTimeout(60_000);
                conn.connect();

                MessageDigest digest = MessageDigest.getInstance("SHA-256");
                byte[] buffer = new byte[65_536];
                int read;
                long total = conn.getContentLengthLong();
                long written = 0;
                int lastPercent = -1;

                try (InputStream in = conn.getInputStream();
                     OutputStream out = new FileOutputStream(target)) {
                    while ((read = in.read(buffer)) != -1) {
                        out.write(buffer, 0, read);
                        digest.update(buffer, 0, read);
                        written += read;

                        if (total > 0) {
                            int pct = (int) Math.floor((written * 100.0) / total);
                            if (pct > lastPercent) {
                                lastPercent = pct;
                                emitProgress(pct);
                            }
                        }
                    }
                }
                conn.disconnect();

                String hexHash = bytesToHex(digest.digest());
                if (sha256 != null && !sha256.isEmpty()
                        && !sha256.toLowerCase().equals(hexHash)) {
                    target.delete();
                    rejectIo(call, "Hash SHA-256 invalide");
                    return;
                }

                JSObject ret = new JSObject();
                ret.put("path", target.getAbsolutePath());
                resolveIo(call, ret);
            } catch (Exception e) {
                Log.e(TAG, "Téléchargement APK échoué", e);
                File t = targetApk();
                if (t.exists()) {
                    t.delete();
                }
                rejectIo(call, "Téléchargement échoué : " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void install(PluginCall call) {
        pendingInstallCall = call;
        io.execute(() -> {
            File apk = targetApk();
            if (!apk.exists()) {
                rejectIo(call, "APK introuvable. Téléchargez d'abord.");
                pendingInstallCall = null;
                return;
            }
            try {
                Context ctx = getContext();
                PackageManager pm = ctx.getPackageManager();

                // minSdk 21 : PackageInstaller n'existe qu'à partir d'API 26.
                // Sur API 21–25 on bascule sur le fallback (lanceur système).
                if (Build.VERSION.SDK_INT < 26) {
                    installLegacy(call, apk);
                    pendingInstallCall = null;
                    return;
                }

                if (!pm.canRequestPackageInstalls()) {
                    rejectIo(call, "Permission 'sources inconnues' refusée");
                    pendingInstallCall = null;
                    return;
                }

                PackageInstaller installer = pm.getPackageInstaller();
                PackageInstaller.SessionParams params =
                        new PackageInstaller.SessionParams(
                                PackageInstaller.SessionParams.MODE_FULL_INSTALL);
                if (Build.VERSION.SDK_INT >= 31) {
                    params.setRequireUserAction(
                            PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED);
                }
                if (Build.VERSION.SDK_INT >= 34) {
                    params.setRequestUpdateOwnership(true);
                }

                int sessionId = installer.createSession(params);
                try (PackageInstaller.Session session = installer.openSession(sessionId);
                     InputStream in = new FileInputStream(apk);
                     OutputStream out =
                             session.openWrite("update.apk", 0, apk.length())) {
                    byte[] buf = new byte[65_536];
                    int n;
                    while ((n = in.read(buf)) > 0) {
                        out.write(buf, 0, n);
                    }
                    session.fsync(out);

                    Intent intent =
                            new Intent(ctx, InstallResultReceiver.class)
                                    .setPackage(ctx.getPackageName());
                    int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                    if (Build.VERSION.SDK_INT >= 31) {
                        flags |= PendingIntent.FLAG_MUTABLE;
                    }
                    PendingIntent pi =
                            PendingIntent.getBroadcast(ctx, sessionId, intent, flags);
                    session.commit(pi.getIntentSender());
                }

                resolveIo(call, new JSObject());
                pendingInstallCall = null;
            } catch (Exception e) {
                Log.e(TAG, "Installation échouée", e);
                rejectIo(call, "Installation échouée : " + e.getMessage());
                pendingInstallCall = null;
            }
        });
    }

    /**
     * Fallback API 21–25 (PackageInstaller exige API 26). Le téléchargement
     * est déjà fait dans download() ; ici on ouvre le lanceur système sur le
     * fichier local pour demander l'installation.
     */
    private void installLegacy(PluginCall call, File apk) {
        mainHandler.post(() -> {
            try {
                Intent intent = new Intent(Intent.ACTION_VIEW);
                Uri apkUri = Uri.fromFile(apk);
                intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                if (Build.VERSION.SDK_INT >= 24) {
                    intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                }
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
                call.resolve(new JSObject());
            } catch (Exception e) {
                Log.e(TAG, "Fallback API<26 échoué", e);
                call.reject("Installation échouée (API<26) : " + e.getMessage());
            }
        });
    }

    private void emitProgress(int pct) {
        JSObject data = new JSObject();
        data.put("progress", pct);
        mainHandler.post(() -> notifyListeners("downloadProgress", data));
    }

    private void resolveIo(PluginCall call, JSObject ret) {
        mainHandler.post(() -> call.resolve(ret));
    }

    private void rejectIo(PluginCall call, String msg) {
        mainHandler.post(() -> call.reject(msg));
    }

    private static String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            sb.append(String.format("%02x", b & 0xff));
        }
        return sb.toString();
    }
}
