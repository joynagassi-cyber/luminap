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
    "IonAlert",
    "IonSearchbar",
    "IonTabBar",
    "IonTabButton",
    "IonRouterOutlet",
    "IonApp",
  ] as const;

  const mod: Record<string, unknown> = {
    IonInput,
    IonTextarea,
    IonSelect,
    IonSelectOption,
    IonButton,
    IonCheckbox,
    IonBackButton: ({ children, ...rest }: { children?: ReactNode; [key: string]: unknown }) => (
      <button type="button" data-testid="back-button" {...passthrough(rest)}>
        {children ?? "back"}
      </button>
    ),
  };
  for (const n of names) mod[n] = wrapper(n);
  return mod;
}
