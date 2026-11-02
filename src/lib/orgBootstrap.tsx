/**
 * Bootstrap d'organisation — mode demo / local-only.
 * Crée une organisation factice stockée dans localStorage, sans Supabase.
 */

export interface BootstrapResult {
  orgId: string;
  grantId: string | null;
  role: string;
}

export async function bootstrapOrganization(params: {
  name: string;
  type: string;
}): Promise<BootstrapResult> {
  // Simuler un délai réseau pour l'UX
  await new Promise((resolve) => setTimeout(resolve, 600));

  const orgId = "org_demo_" + Math.random().toString(36).slice(2, 11);
  const grantId = "grant_demo_" + Math.random().toString(36).slice(2, 11);

  // Stocker l'organisation en localStorage pour le mode demo
  try {
    const orgsRaw = localStorage.getItem("lumina-demo-orgs");
    const orgs = orgsRaw ? JSON.parse(orgsRaw) : [];
    orgs.push({
      id: orgId,
      name: params.name,
      type: params.type,
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem("lumina-demo-orgs", JSON.stringify(orgs));
  } catch {}

  return {
    orgId,
    grantId,
    role: "ADMIN",
  };
}
