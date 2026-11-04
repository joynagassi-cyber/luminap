package com.lumina.mfejc;

import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.onesignal.OneSignal;

import org.json.JSONObject;

/**
 * Pont OneSignal maison (phase A2 de l'audit permissions).
 *
 * Pourquoi pas le plugin officiel `onesignal-cordova-plugin` ? Sa version
 * courante (5.6.2) épingle le SDK Android OneSignal 5.11.0, dont la
 * dépendance transitive `bcprov-jdk18on:1.79` casse la compilation Gradle
 * de ce projet (échec documenté dans `android/app/build.gradle`, runs
 * 39180389543+). Le SDK 4.8.12, lui, est déjà intégré et compile depuis
 * des mois — il n'était simplement jamais initialisé ni relié au JS :
 * l'ancien `src/lib/onesignal.ts` appelait un plugin « OneSignalPush »
 * absent. Ce pont expose la surface MINIMALE réellement utilisée par
 * l'app (init, identité externe, tags) sur le SDK 4.8.12 éprouvé.
 *
 * La permission POST_NOTIFICATIONS n'est PAS demandée ici : la fenêtre
 * système passe par `PermissionService` (LocalNotifications), porte
 * unique côté JS. Le SDK, une fois initialisé, observe l'état de la
 * permission et enregistre l'appareil comme joueur.
 */
@CapacitorPlugin(name = "OneSignalBridge")
public class OneSignalBridgePlugin extends Plugin {

    private static final String TAG = "OneSignalBridge";
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private static boolean initialized = false;

    @PluginMethod
    public void initialize(PluginCall call) {
        String appId = call.getString("appId");
        if (appId == null || appId.isEmpty()) {
            call.reject("appId OneSignal requis");
            return;
        }
        // initWithContext + setAppId : patron SDK 4.8. Sur le thread
        // principal (le SDK y attache ses écouteurs de cycle de vie).
        mainHandler.post(() -> {
            try {
                if (!initialized) {
                    OneSignal.initWithContext(getContext());
                    OneSignal.setAppId(appId);
                    initialized = true;
                }
                call.resolve();
            } catch (Exception e) {
                Log.e(TAG, "Initialisation OneSignal échouée", e);
                call.reject("Initialisation OneSignal échouée : " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void login(PluginCall call) {
        if (!rejectUnlessInitialized(call)) return;
        String externalId = call.getString("externalId");
        if (externalId == null || externalId.isEmpty()) {
            call.reject("externalId requis");
            return;
        }
        try {
            OneSignal.setExternalUserId(externalId);
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "login OneSignal échoué", e);
            call.reject("Login OneSignal échoué : " + e.getMessage());
        }
    }

    @PluginMethod
    public void logout(PluginCall call) {
        if (!rejectUnlessInitialized(call)) return;
        try {
            OneSignal.removeExternalUserId();
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "logout OneSignal échoué", e);
            call.reject("Logout OneSignal échoué : " + e.getMessage());
        }
    }

    @PluginMethod
    public void setTags(PluginCall call) {
        if (!rejectUnlessInitialized(call)) return;
        JSObject tags = call.getObject("tags");
        if (tags == null) {
            call.reject("tags requis");
            return;
        }
        try {
            // JSObject EST un JSONObject (Capacitor) : pas de conversion.
            OneSignal.sendTags(tags);
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "setTags OneSignal échoué", e);
            call.reject("setTags OneSignal échoué : " + e.getMessage());
        }
    }

    @PluginMethod
    public void deleteTags(PluginCall call) {
        if (!rejectUnlessInitialized(call)) return;
        JSArray keys = call.getArray("keys");
        if (keys == null) {
            call.reject("keys requis");
            return;
        }
        try {
            // Sémantique documentée OneSignal : une valeur vide supprime
            // le tag. Évite de dépendre de la signature exacte de
            // suppression selon la version du SDK.
            JSONObject deletions = new JSONObject();
            for (int i = 0; i < keys.length(); i++) {
                String key = keys.getString(i);
                if (key != null) {
                    deletions.put(key, "");
                }
            }
            OneSignal.sendTags(deletions);
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "deleteTags OneSignal échoué", e);
            call.reject("deleteTags OneSignal échoué : " + e.getMessage());
        }
    }

    private boolean rejectUnlessInitialized(PluginCall call) {
        if (!initialized) {
            call.reject("OneSignal non initialisé");
            return false;
        }
        return true;
    }
}
