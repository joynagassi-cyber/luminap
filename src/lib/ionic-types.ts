/**
 * `IonChangeCustomEvent` a disparu des exports de `@ionic/react` en v9 : les
 * composants exposent désormais des types dédiés (`IonSelectCustomEvent<T>`,
 * `IonInputCustomEvent<InputInputEventDetail>`, `IonToggleCustomEvent`…) dont
 * le `detail.value` est optionnel. Le projet annote 27 fichiers avec
 * `IonChangeCustomEvent<T>` (102 usages) : cet alias reproduit la signature
 * commune réellement utilisée — lire `e.detail.value` — sans dépendre d'un
 * export supprimé. Le `value` est volontairement non typé : les composants
 * hétérogènes (input, select, toggle, datetime…) ne partagent pas de type.
 */
export type IonChangeCustomEvent<_T = string> = CustomEvent<{ value?: any }>;
