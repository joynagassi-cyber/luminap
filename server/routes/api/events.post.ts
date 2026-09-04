import { defineHandler } from "nitro";
import { readBody } from "nitro/h3";
import { store } from "../../store";

export default defineHandler(async (event) => {
  const body = await readBody(event);
  const { name, description, startDate, endDate, budget } = body;

  if (!name || !startDate || !budget) {
    return { ok: false, error: "name, startDate, and budget are required" };
  }

  const newEvent: any = {
    id: `evt-${Date.now()}`,
    orgId: "org-1",
    name,
    description: description || "",
    startDate,
    endDate: endDate || null,
    status: "PLANIFIED",
    budget: Math.round(budget),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.events.push(newEvent);
  return { ok: true, event: newEvent };
});
