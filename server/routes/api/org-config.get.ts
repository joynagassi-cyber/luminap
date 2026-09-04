import { defineHandler } from "nitro";
import { store } from "../../store";

export default defineHandler(() => {
  return { ok: true, config: store.orgConfig };
});
