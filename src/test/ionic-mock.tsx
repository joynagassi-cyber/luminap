/**
 * Mock `@ionic/react` partagé pour les tests vitest (jsdom).
 *
 * Pourquoi : Ionic rend `IonInput`/`IonSelect`/`IonTextarea` en custom
 * elements avec shadow DOM. En jsdom, la valeur n'est jamais reflétée dans
 * l'arbre accessible et `getByPlaceholderText` / `getByDisplayValue`
 * échouent — les tests passaient sur des `<input>` natifs, puis cassaient
 * silencieusement dès que le code passait aux composants Ionic (aucun job
 * vitest en CI pour le détecter).
 *
 * Ce mock remplace chaque composant par un élément HTML équivalent qui
 * conserve l'API observée par les tests : `value`, `placeholder`,
 * `aria-label`, et le contrat `onIonChange({ detail: { value } })`.
 *
 * Il est volontairement *sans état* (les composants React contrôlent la
 * valeur via `value` + `onIonChange`) et générique (n'importe quel `Ion*`
 * non listé devient un `<div>`), pour ne jamais casser sur un composant
 * nouvellement importé par une page.
 */
import type { ReactNode, ChangeEvent } from "react";

type IonChangeDetail = { value: string | null };

interface IonInputProps {
  value?: unknown;
  placeholder?: string;
  onIonChange?: (e: { detail: IonChangeDetail }) => void;
  onIonInput?: (e: { detail: IonChangeDetail }) => void;
  type?: string;
  [key: string]: unknown;
}

function passthrough(props: Record<string, unknown>, extra: string[] = []): Record<string, unknown> {
  const drop = new Set([
    "onIonChange",
    "onIonInput",
    "onIonBlur",
    "onIonFocus",
    "lines",
    "interface",
    "slot",
    "position",
    "fill",
    "labelPlacement",
    "color",
    "size",
    "mode",
    "debounce",
    "expand",
    "ion",
    ...extra,
  ]);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (!drop.has(k)) out[k] = v;
  }
  return out;
}

/** IonInput → <input> contrôlé, `onIonChange` émis avec `{ detail: { value } }`. */
export function IonInput({ value, onIonChange, onIonInput, ...rest }: IonInputProps) {
  const emit = (fn?: (e: { detail: IonChangeDetail }) => void) => (e: ChangeEvent<HTMLInputElement>) => {
    fn?.({ detail: { value: e.target.value } });
  };
  return (
    <input
      data-testid="ion-input"
      value={value == null ? "" : String(value)}
      onChange={emit(onIonChange ?? onIonInput)}
      {...passthrough(rest)}
    />
  );
}

/** IonTextarea → <textarea>. */
export function IonTextarea({ value, onIonChange, ...rest }: IonInputProps) {
  return (
    <textarea
      data-testid="ion-textarea"
      value={value == null ? "" : String(value)}
      onChange={(e) => onIonChange?.({ detail: { value: e.target.value } })}
      {...passthrough(rest)}
    />
  );
}

/** IonSelect → <select> ; `IonSelectOption` → <option>. */
export function IonSelect({ value, onIonChange, children, ...rest }: IonInputProps & { children?: ReactNode }) {
  return (
    <select
      data-testid="ion-select"
      value={value == null ? "" : String(value)}
      onChange={(e) => onIonChange?.({ detail: { value: e.target.value } })}
      {...passthrough(rest)}
    >
      {children}
    </select>
  );
}

export function IonSelectOption({ value, children, ...rest }: { value?: string; children?: ReactNode }) {
  return (
    <option value={value} {...passthrough(rest)}>
      {children}
    </option>
  );
}

/** IonButton → <button> ; conserve `onClick` et le contenu. */
export function IonButton({
  children,
  onClick,
  type,
  ...rest
}: {
  children?: ReactNode;
  onClick?: () => void;
  type?: string;
  [key: string]: unknown;
}) {
  return (
    <button type={type === "submit" ? "submit" : "button"} onClick={onClick} {...passthrough(rest)}>
      {children}
    </button>
  );
}

/** IonCheckbox → <input type="checkbox">. */
export function IonCheckbox({ checked, onIonChange, ...rest }: IonInputProps & { checked?: boolean }) {
  return (
    <input
      type="checkbox"
      data-testid="ion-checkbox"
      checked={Boolean(checked)}
      onChange={(e) => onIonChange?.({ detail: { value: e.target.checked ? "true" : "false" } })}
      {...passthrough(rest)}
    />
  );
}

/**
 * IonModal → <div role="dialog"> monté SEULEMENT si `isOpen`.
 *
 * Comportement non négociable : un modal Ionic fermé ne rend pas son contenu.
 * Un stub qui monterait toujours les enfants ferait apparaître des textes
 * d'explication (« Autoriser les notifications ») en permanence dans les
 * tests de pages — et masquerait une régression réelle où le modal resterait
 * ouvert.
 */
export function IonModal({
  isOpen,
  children,
  ...rest
}: {
  isOpen?: boolean;
  children?: ReactNode;
  [key: string]: unknown;
}) {
  if (!isOpen) return null;
  return (
    <div role="dialog" data-testid="ion-modal" {...passthrough(rest)}>
      {children}
    </div>
  );
}

/**
 * `IonAlert` — mock FIDÈLE (A6).
 *
 * L'ancien mock était un `div` vide : le titre, le message et les boutons
 * n'existaient pas dans le DOM, donc tout composant bâti sur IonAlert devenait
 * intestable (et une régression réelle serait passée inaperçue).
 *
 * Ici on reproduit ce que les tests doivent pouvoir observer :
 *   - rien n'est rendu quand `isOpen` est faux ;
 *   - titre, message, boutons (cliquables, avec leur `role`) et enfants sont
 *     rendus quand il est ouvert ;
 *   - cliquer un bouton exécute son `handler`, puis `onDidDismiss` (comme Ionic,
 *     sauf si le handler renvoie `false`) ;
 *   - `onDidDismiss` n'est PAS appelé deux fois pour un clic.
 */
type AlertButton = {
  text?: string;
  role?: string;
  handler?: () => void | boolean;
  disabled?: boolean;
};

function IonAlertMock({
  isOpen,
  header,
  subHeader,
  message,
  buttons = [],
  children,
  onDidDismiss,
  ...rest
}: {
  isOpen?: boolean;
  header?: string;
  subHeader?: string;
  message?: string;
  buttons?: (AlertButton | string)[];
  children?: ReactNode;
  onDidDismiss?: () => void;
  [key: string]: unknown;
}) {
  if (!isOpen) return null;
  const normalized: AlertButton[] = (buttons as (AlertButton | string)[]).map((b) =>
    typeof b === "string" ? { text: b } : b,
  );

  const dismiss = (button: AlertButton) => {
    const result = button.handler?.();
    // Sémantique Ionic : un handler qui renvoie explicitement `false` garde
    // l'alerte ouverte.
    if (result === false) return;
    onDidDismiss?.();
  };

  return (
    <div role="alertdialog" aria-modal="true" data-testid="IonAlert" {...passthrough(rest)}>
      {header ? <h2>{header}</h2> : null}
      {subHeader ? <h3>{subHeader}</h3> : null}
      {message ? <p>{message}</p> : null}
      {children}
      <div>
        {normalized.map((button, index) => (
          <button
            key={`${button.text ?? "btn"}-${index}`}
            type="button"
            // Le `role` Ionic (« cancel », « destructive ») est exposé en
            // attribut data : le poser sur `role` supprimerait le rôle bouton
            // et rendrait les tests incapables de cibler « Annuler ».
            data-button-role={button.role}
            disabled={button.disabled}
            onClick={() => dismiss(button)}
          >
            {button.text}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Enveloppe générique : conserve les enfants, rend un <div> avec data-testid. */
function wrapper(tag: string) {
  return function IonWrapper({ children, ...rest }: { children?: ReactNode; [key: string]: unknown }) {
    return (
      <div data-testid={tag} {...passthrough(rest)}>
        {children}
      </div>
    );
  };
}

/**
 * Objet à retourner depuis `vi.mock("@ionic/react", () => createIonicMock())`.
 * `IonBackButton` rend un bouton cliquable (les pages le testent via
 * `data-testid="back-button"`), les autres composants d'enveloppe sont
 * génériques.
 */
export function createIonicMock() {
  const names = [
    "IonPage",
    "IonHeader",
    "IonContent",
    "IonTitle",
    "IonToolbar",
    "IonButtons",
    "IonItem",
    "IonLabel",
    "IonList",
    "IonCard",
    "IonCardContent",
    "IonCardHeader",
    "IonBadge",
    "IonSpinner",
    "IonProgressBar",
    "IonInfiniteScroll",
    "IonSearchbar",
    "IonTabBar",
    "IonTabButton",
    "IonRouterOutlet",
    "IonApp",
  ] as const;

  const mod: Record<string, unknown> = {
    // Hooks de cycle de vie de vue : hors `<IonRouterOutlet>` (jsdom), Ionic
    // ne les déclenche jamais. No-op fidèle à ce comportement — les pages
    // gardent leur `useEffect` de premier chargement pour les tests.
    useIonViewWillEnter: () => undefined,
    useIonViewDidEnter: () => undefined,
    useIonViewWillLeave: () => undefined,
    useIonViewDidLeave: () => undefined,
    IonInput,
    IonTextarea,
    IonSelect,
    IonSelectOption,
    IonButton,
    IonCheckbox,
    IonAlert: IonAlertMock,
    IonModal,
    IonBackButton: ({ children, ...rest }: { children?: ReactNode; [key: string]: unknown }) => (
      <button type="button" data-testid="back-button" {...passthrough(rest)}>
        {children ?? "back"}
      </button>
    ),
  };
  for (const n of names) mod[n] = wrapper(n);
  return mod;
}
