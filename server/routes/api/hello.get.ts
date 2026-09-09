import { defineHandler } from "nitro";
import { getHeader, setHeader } from "h3";
import { store } from "../../store";

export default defineHandler((event) => {
  // Set CORS headers for cross-origin requests
  const origin = getHeader(event, "origin");
  if (origin) {
    setHeader(event, "Access-Control-Allow-Origin", origin);
    setHeader(event, "Access-Control-Allow-Credentials", "true");
  }
  setHeader(event, "Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  setHeader(event, "Access-Control-Allow-Headers", "Content-Type, Authorization");

  return { ok: true, message: "Lumina API" };
});
