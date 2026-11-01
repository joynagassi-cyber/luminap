/**
 * Lecture NON-React du réglage maker-checker (PR8).
 *
 * Le chemin d'écriture (`dataLayer.approveTransactionPS`, `useLocalStore`) ne
 * peut pas appeler un hook : il a besoin d'une fonction asynchrone qui combine
 * le réglage par organisation (`org_settings.maker_checker_enabled`) et le
 * kill-switch de build. Regroupé ici pour que le data layer, le store et le
 * hook `useMakerChecker` partagent la MÊME décision (pas de duplication).
 *
 * FAIL-SAFE : toute lecture ratée retombe sur `false` — jamais d'activation
 * accidentelle d'une contrainte financière (politique d'`orgSettings.ts`).
 */
import { getOrgSetting, ORG_SETTING_KEYS } from "./orgSettings";
import { isFeatureEnabled } from "./featureFlags";
import { resolveMakerCheckerEnabled, MAKER_CHECKER_FLAG } from "./makerChecker";
import { captureClientError } from "./clientErrors";

/**
 * Maker-checker est-il actif pour l'organisation active ? Jamais d'exception :
 * une erreur est instrumentée puis retombe sur `false`.
 */
export async function isMakerCheckerEnabled(): Promise<boolean> {
  try {
    const orgSetting = await getOrgSetting<boolean>(
      ORG_SETTING_KEYS.makerCheckerEnabled,
      false,
    );
    return resolveMakerCheckerEnabled(
      orgSetting === true,
      isFeatureEnabled(MAKER_CHECKER_FLAG),
    );
  } catch (err) {
    captureClientError(err, {
      message: "Lecture du réglage maker-checker échouée",
      route: "makerCheckerSettings.isMakerCheckerEnabled",
    });
    return false;
  }
}
