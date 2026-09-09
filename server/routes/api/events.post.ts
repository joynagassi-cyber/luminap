import { defineHandler } from "nitro";
import { readBody, createError } from "nitro/h3";
import { store } from "../../store";

export default defineHandler(async (event) => {
  const body = await readBody(event);
  const { name, description, startDate, endDate, budget } = body;

  if (!name || !startDate || !budget) {
    throw createError({ statusCode: 400, statusMessage: "name, startDate, and budget are required" });
  }

  // Sanitize string fields
  const sanitizedName = typeof name === 'string' ? name.replace(/</g, '&lt;').replace(/>/g, '&gt;') : String(name);
  const sanitizedDescription = typeof description === 'string'
    ? description.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    : '';

  const newEvent: Record<string, any> = {
    id: `evt-${Date.now()}`,
    orgId: "org-1",
    name: sanitizedName,
    description: sanitizedDescription,
    startDate,
    endDate: endDate || null,
    status: "PLANIFIED",
    budget: Math.round(Number(budget)),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.events.push(newEvent);
  return { ok: true, event: newEvent };
});
