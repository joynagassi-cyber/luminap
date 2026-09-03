import { defineHandler } from "nitro";
import { store } from "../../../store";

export default defineHandler(() => {
  return { ok: true, events: store.events };
});
