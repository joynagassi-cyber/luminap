import { defineHandler } from "nitro";
import { getCookie } from "nitro/h3";

export default defineHandler((event) => {
  const token = getCookie(event, "lumina_session_token");
  return {
    ok: true,
    authenticated: !!token,
    user: token
      ? {
          id: "user-1",
          email: "admin@mfe-jc.org",
          firstName: "Pasteur",
          lastName: "Jean",
          role: "ADMIN",
          org: {
            id: "org-1",
            name: "Église MFE-JC Centrale",
            type: "Eglise",
            accentColor: "#FF6B00",
          },
        }
      : null,
  };
});
