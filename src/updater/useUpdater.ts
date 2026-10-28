import { useCallback, useEffect, useState } from "react";
import {
  checkUpdate,
  dismissUpdater,
  getUpdaterState,
  startUpdate,
  subscribeUpdater,
  type UpdaterState,
} from "./updaterStore";

export type { UpdaterStatus, UpdaterState } from "./updaterStore";

/**
 * Hook pilotant le self-updater.
 *  - check(force) : interroge GitHub, renvoie l'UpdateInfo|null (pour afficher
 *    « Vous êtes à jour ») et met à jour l'état.
 *  - startUpdate() : vérifie la permission, télécharge (avec progression),
 *    puis installe via PackageInstaller.
 *  - dismiss() : ferme le dialogue.
 *
 * L'état est **partagé** (store au niveau module, cf. `updaterStore`) : toutes
 * les instances du hook — `UpdaterBridge`, `SettingsAbout`, et `UpdateDialog`
 * lui-même — lisent et écrivent le MÊME état (R124 : auparavant chaque appel
 * créait un état isolé, donc le dialogue ne voyait jamais la mise à jour).
 * Sur web/non-Android, l'état reste `idle` et aucune erreur n'est levée.
 */
export function useUpdater() {
  const [state, setState] = useState<UpdaterState>(() => getUpdaterState());

  useEffect(() => subscribeUpdater(setState), []);

  const check = useCallback((force: boolean) => checkUpdate(force), []);
  const start = useCallback(() => startUpdate(), []);
  const dismiss = useCallback(() => dismissUpdater(), []);

  return { ...state, check, startUpdate: start, dismiss };
}
