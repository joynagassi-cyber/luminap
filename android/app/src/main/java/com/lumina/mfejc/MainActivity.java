package com.lumina.mfejc;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import java.util.ArrayList;

public class MainActivity extends BridgeActivity {
    private static final int GOOGLE_SIGN_IN_REQUEST_CODE = 1001;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Register OneSignal plugin
        registerPlugin(com.onesignal.cordova.OneSignalPush.class);

        // Handle deep link / OAuth callback
        handleIntent(getIntent());
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

        // Handle OneSignal / Google sign in result
        if (requestCode == GOOGLE_SIGN_IN_REQUEST_CODE) {
            // OneSignal plugin will handle this internally
        }
    }
}
