/**
 * @deprecated DEAD CODE — not referenced by any entrypoint.
 * The live entrypoint is src/App.tsx (used by src/main.tsx). This competing
 * shell (IonSplitPane layout) was superseded during the multi-org
 * migration and is kept only for history. Do not import it.
 */
import { IonApp, setupIonicReact } from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import { IonRouterOutlet, IonSplitPane } from "@ionic/react";
import { Route, Navigate } from "react-router-dom";
import { setupLuminaTheme } from "./ionic/theme";
import { luminaRoutes } from "./ionic/routing";

// Configure Ionic React with dark theme
setupIonicReact({
  mode: "ios",
  animated: true,
  ...({ keyboardBehavior: "ion-focus", keyboardFillMode: "overlap" } as any),
});

setupLuminaTheme();

/**
 * IonicApp — main wrapper that replaces BrowserRouter + Routes
 * with IonReactRouter + IonRouterOutlet.
 *
 * Desktop: uses IonSplitPane for responsive layout.
 * Mobile: single-pane navigation via IonNav/IonRouterOutlet.
 */
function IonicApp() {
  return (
    <IonApp>
      <IonReactRouter>
        <IonSplitPane contentId="main-content" when="lg">
          <IonRouterOutlet id="main-content">
            {luminaRoutes}
            <Route path="/">
              <Navigate to="/splash" replace />
            </Route>
            <Route path="*">
              <Navigate to="/splash" replace />
            </Route>
          </IonRouterOutlet>
        </IonSplitPane>

        {/* Mobile: single pane, no split */}
        <IonRouterOutlet id="main-content-mobile">
          {luminaRoutes}
          <Route path="/">
            <Navigate to="/splash" replace />
          </Route>
          <Route path="*">
            <Navigate to="/splash" replace />
          </Route>
        </IonRouterOutlet>
      </IonReactRouter>
    </IonApp>
  );
}

export default IonicApp;
