package com.lumina.mfejc;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

/**
 * Reçoit le résultat de la session PackageInstaller du self-updater.
 *
 *  - STATUS_PENDING_USER_ACTION : lance l'Intent de confirmation système
 *    (l'écran « Installer ? » qui apparaît inévitablement sans Device Owner).
 *  - STATUS_SUCCESS              : l'app est remplacée et relancée, rien à faire.
 *  - autre statut                : log d'erreur.
 */
public class InstallResultReceiver extends BroadcastReceiver {
    private static final String TAG = "ApkUpdater";

    @Override
    public void onReceive(Context context, Intent intent) {
        int status = intent.getIntExtra(
                android.content.pm.PackageInstaller.EXTRA_STATUS, -1);
        String msg = intent.getStringExtra(
                android.content.pm.PackageInstaller.EXTRA_STATUS_MESSAGE);

        switch (status) {
            case android.content.pm.PackageInstaller.STATUS_PENDING_USER_ACTION:
                Intent installIntent;
                if (Build.VERSION.SDK_INT >= 33) {
                    installIntent = intent.getParcelableExtra(
                            Intent.EXTRA_INTENT, Intent.class);
                } else {
                    installIntent = intent.getParcelableExtra(Intent.EXTRA_INTENT);
                }
                if (installIntent != null) {
                    installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(installIntent);
                }
                break;
            case android.content.pm.PackageInstaller.STATUS_SUCCESS:
                Log.i(TAG, "Installation réussie : " + msg);
                break;
            default:
                Log.e(TAG, "Échec installation (status=" + status + ") : " + msg);
        }
    }
}
