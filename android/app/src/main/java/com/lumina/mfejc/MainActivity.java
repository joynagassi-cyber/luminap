package com.lumina.mfejc;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebView;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;
import java.util.ArrayList;

public class MainActivity extends BridgeActivity {
    private static final int GOOGLE_SIGN_IN_REQUEST_CODE = 1001;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Les plugins natifs locaux (non distribués comme module Gradle
        // autonome) ne sont pas auto-enregistrés : il faut les déclarer
        // AVANT la construction du Bridge (super.onCreate).
        registerPlugin(ApkUpdaterPlugin.class);
        registerPlugin(OneSignalBridgePlugin.class);
        super.onCreate(savedInstanceState);

        // OneSignal (A2) : le SDK Android 4.8.12 (build.gradle) est relié
        // au JS par le pont local OneSignalBridgePlugin ci-dessus — le
        // plugin officiel 5.x casse le build (bcprov, voir le pont). Le
        // SDK n'est pas initialisé ici : `initOneSignal()` (JS) le fait au
        // login, pour ne rien démarrer avant la première session.

        applySystemBarInsetsToWebView();

        // Handle deep link / OAuth callback
        handleIntent(getIntent());
    }

    /**
     * Bug P1-3 — edge-to-edge Android 15 (targetSdk 35) : la WebView est
     * dessinée SOUS la barre de navigation système (◀ ● ■), qui recouvre
     * la tab bar de l'app (« Gr●pes »). Le CSS `env(safe-area-inset-*)`
     * n'est pas renseigné de façon fiable par toutes les WebView système,
     * donc on applique ici l'inset BAS (et latéral) des barres système en
     * padding réel de la WebView : le contenu web ne passe plus jamais
     * sous la navigation système, en mode 3 boutons comme en gestuelle.
     * Le haut (barre de statut) reste géré côté web (IonToolbar /
     * --ion-safe-area-top) — on ne le double pas ici.
     */
    private void applySystemBarInsetsToWebView() {
        if (getBridge() == null) return;
        WebView webView = getBridge().getWebView();
        if (webView == null) return;
        ViewCompat.setOnApplyWindowInsetsListener(webView, (view, insets) -> {
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            view.setPadding(bars.left, 0, bars.right, bars.bottom);
            return insets;
        });
        ViewCompat.requestApplyInsets(webView);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        if (intent == null) return;

        Uri data = intent.getData();
        if (data == null) return;

        String scheme = data.getScheme();
        String host = data.getHost();

        // Handle Lumina OAuth callback
        if ("lumina".equals(scheme) && "auth".equals(host)) {
            String code = data.getQueryParameter("code");
            String state = data.getQueryParameter("state");

            if (code != null) {
                // Notify the web view about the OAuth callback
                getBridge().getWebView().evaluateJavascript(
                    "window.handleOAuthCallback('" + code + "', '" + (state != null ? state : "") + "')",
                    null
                );
            }
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        // OneSignal / Google sign-in gérés nativement par leurs SDK
    }
}
