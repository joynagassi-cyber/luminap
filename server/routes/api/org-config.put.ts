import { defineHandler } from "nitro";
import { readBody } from "nitro/h3";
import { store } from "../../store";

export default defineHandler(async (event) => {
  const body = await readBody(event);
  if (body.name !== undefined) store.orgConfig.name = body.name;
  if (body.logoUrl !== undefined) store.orgConfig.logoUrl = body.logoUrl;
  return { ok: true, config: store.orgConfig };
});
