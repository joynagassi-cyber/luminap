import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useGivingDonors,
  useGivingCampaigns,
  usePledges,
  useTaxReceipts,
  useTransactions,
  useTransactionGiving,
  addGivingDonorPS,
  addGivingCampaignPS,
} from "@/lib/dataLayer";
import { campaignProgress } from "@/capabilities/giving";
import { formatCurrencyCompact, formatCurrencyFull } from "@/lib/utils";
import TopHeader from "@/components/TopHeader";
import BottomNav from "@/components/BottomNav";
import {
  Plus,
  ChevronRight,
  X,
  Target,
  Users,
  Handshake,
  Receipt,
} from "lucide-react";
import { IonPage, IonContent } from "@ionic/react";

const TABS = [
  { id: "campaigns", label: "Campagnes", icon: Target },
  { id: "donors", label: "Donateurs", icon: Users },
  { id: "pledges", label: "Pledges", icon: Handshake },
  { id: "receipts", label: "Reçus", icon: Receipt },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function Giving() {
  const navigate = useNavigate();
  const { data: campaigns } = useGivingCampaigns();
  const { data: donors } = useGivingDonors();
  const { data: pledges } = usePledges();
  const { data: receipts } = useTaxReceipts();
  const { data: transactions } = useTransactions();
  const { data: links } = useTransactionGiving();
  const [tab, setTab] = useState<TabId>("campaigns");
  const [sheet, setSheet] = useState<"" | "donor" | "campaign">("");

  const incomeTx = transactions.filter((t) => t.type === "INCOME");

  return (
    <IonPage>
      <IonContent className="bg-canvas">
        <div className="min-h-screen bg-canvas">
          <TopHeader title="Dons & Campagnes" />
          <div className="max-w-lg mx-auto px-5 pb-32 pt-16">
            <h1 className="text-text-primary font-bold text-xl mb-4" data-testid="giving-title">
              Dons & Campagnes
            </h1>

            {/* Onglets */}
            <div className="flex rounded-xl p-1 mb-5" style={{ backgroundColor: "var(--surface)" }} role="tablist" aria-label="Sections dons">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
                  style={
                    tab === t.id
                      ? { backgroundColor: "var(--accent-primary)", color: "#fff" }
                      : { color: "var(--text-secondary)" }
                  }
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === "campaigns" && (
              <div data-testid="giving-campaigns">
                <button
                  onClick={() => setSheet("campaign")}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold text-white mb-4 active:scale-95 transition-transform"
                  style={{ backgroundColor: "var(--accent-primary)" }}
                  data-testid="new-campaign-btn"
                >
                  <Plus className="w-4 h-4" /> Nouvelle campagne
                </button>
                {campaigns.length === 0 ? (
                  <Empty label="Aucune campagne" sub="Lancez une campagne de dons avec un objectif." />
                ) : (
                  <div className="space-y-3">
                    {campaigns.map((c) => {
                      const p = campaignProgress(c, links, pledges, incomeTx);
                      const bar = p.pctOfTarget ?? 0;
                      const done = p.target > 0 && p.given >= p.target;
                      return (
                        <button
                          key={c.id}
                          onClick={() => navigate(`/giving/campaigns/${c.id}`)}
                          className="w-full text-left rounded-xl p-4 active:scale-[0.99] transition-transform"
                          style={{ backgroundColor: "var(--card)" }}
                          data-testid={`campaign-card-${c.id}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="text-text-primary font-semibold text-sm">{c.name}</p>
                              <p className="text-text-tertiary text-xs mt-0.5">
                                {c.fund || "Fonds général"}
                              </p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-text-tertiary" />
                          </div>
                          <div className="h-2 rounded-full overflow-hidden mb-1.5" style={{ backgroundColor: "var(--surface-hover)" }}>
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(100, bar)}%`,
                                backgroundColor: done ? "#1DB954" : "var(--accent-primary)",
                              }}
                            />
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-text-tertiary">Collecté {formatCurrencyCompact(p.given)}</span>
                            <span className="text-text-secondary">
                              Objectif {formatCurrencyCompact(p.target)}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {tab === "donors" && (
              <div data-testid="giving-donors">
                <button
                  onClick={() => setSheet("donor")}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold text-white mb-4 active:scale-95 transition-transform"
                  style={{ backgroundColor: "var(--accent-primary)" }}
                  data-testid="new-donor-btn"
                >
                  <Plus className="w-4 h-4" /> Nouveau donateur
                </button>
                {donors.length === 0 ? (
                  <Empty label="Aucun donateur" sub="Ajoutez un donateur pour le rattacher à ses dons." />
                ) : (
                  <div className="space-y-2">
                    {donors.map((d) => (
                      <div
                        key={d.id}
                        className="rounded-xl p-3 flex items-center justify-between"
                        style={{ backgroundColor: "var(--card)" }}
                        data-testid={`donor-card-${d.id}`}
                      >
                        <div>
                          <p className="text-text-primary font-medium text-sm">{d.full_name}</p>
                          <p className="text-text-tertiary text-[11px]">
                            {d.email || d.phone || "—"}
                          </p>
                        </div>
                        {d.tax_receipt_enabled === 1 && (
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: "#1DB95420", color: "#1DB954" }}
                          >
                            Reçu fiscal
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === "pledges" && (
              <div data-testid="giving-pledges">
                {pledges.length === 0 ? (
                  <Empty label="Aucun pledge" sub="Enregistrez des engagements de dons échelonnés." />
                ) : (
                  <div className="space-y-2">
                    {pledges.map((p) => {
                      const donor = donors.find((d) => d.id === p.donor_id);
                      const campaign = campaigns.find((c) => c.id === p.campaign_id);
                      return (
                        <div key={p.id} className="rounded-xl p-3" style={{ backgroundColor: "var(--card)" }}>
                          <div className="flex items-center justify-between">
                            <p className="text-text-primary font-medium text-sm">
                              {donor?.full_name ?? "Donateur"}
                            </p>
                            <span
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: "#FFB80020", color: "#FFB800" }}
                            >
                              {p.schedule}
                            </span>
                          </div>
                          <p className="text-text-tertiary text-[11px] mt-0.5">
                            {campaign?.name ?? "Campagne"} · {formatCurrencyFull(p.pledged_amount_cents)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {tab === "receipts" && (
              <div data-testid="giving-receipts">
                {receipts.length === 0 ? (
                  <Empty label="Aucun reçu fiscal" sub="Générez un reçu annuel depuis le détail d'une campagne." />
                ) : (
                  <div className="space-y-2">
                    {receipts.map((r) => {
                      const donor = donors.find((d) => d.id === r.donor_id);
                      return (
                        <div
                          key={r.id}
                          className="rounded-xl p-3 flex items-center justify-between"
                          style={{ backgroundColor: "var(--card)" }}
                          data-testid={`receipt-card-${r.id}`}
                        >
                          <div>
                            <p className="text-text-primary font-medium text-sm">{donor?.full_name ?? "Donateur"}</p>
                            <p className="text-text-tertiary text-[11px]">
                              {r.year} · {r.receipt_no}
                            </p>
                          </div>
                          <p className="text-income font-bold text-sm">
                            {formatCurrencyFull(r.total_amount_cents)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {sheet && (
            <GiveSheet
              kind={sheet}
              campaigns={campaigns}
              onClose={() => setSheet("")}
              onCreateDonor={async (input) => {
                await addGivingDonorPS({
                  full_name: input.fullName,
                  email: input.email || null,
                  phone: input.phone || null,
                  address: input.address || null,
                  member_id: null,
                  tax_receipt_enabled: input.taxReceiptEnabled ? 1 : 0,
                  notes: null,
                });
              }}
              onCreateCampaign={async (input) => {
                await addGivingCampaignPS({
                  name: input.name,
                  purpose: input.purpose || null,
                  fund: input.fund || null,
                  target_amount_cents: Math.round((Number(input.target.replace(/[^\d]/g, "")) || 0) * 100),
                  start_date: null,
                  end_date: null,
                  status: "ACTIVE",
                  notes: null,
                });
              }}
            />
          )}
          <BottomNav />
        </div>
      </IonContent>
    </IonPage>
  );
}

function Empty({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="rounded-xl p-8 text-center" style={{ backgroundColor: "var(--card)" }}>
      <Users className="w-8 h-8 mx-auto mb-3 opacity-30" style={{ color: "var(--accent-primary)" }} />
      <p className="text-text-secondary text-sm font-medium">{label}</p>
      <p className="text-text-tertiary text-xs mt-1">{sub}</p>
    </div>
  );
}

function GiveSheet({
  kind,
  campaigns,
  onClose,
  onCreateDonor,
  onCreateCampaign,
}: {
  kind: "donor" | "campaign";
  campaigns: Array<{ id: string; name: string }>;
  onClose: () => void;
  onCreateDonor: (input: {
    fullName: string;
    email?: string;
    phone?: string;
    address?: string;
    taxReceiptEnabled: boolean;
  }) => Promise<void>;
  onCreateCampaign: (input: {
    name: string;
    purpose?: string;
    fund?: string;
    target: string;
  }) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const inputStyle = {
    backgroundColor: "var(--surface)",
    color: "var(--text-primary)",
    border: "1px solid var(--border)",
  } as const;

  if (kind === "donor") return <DonorSheet inputStyle={inputStyle} onClose={onClose} onCreate={onCreateDonor} saving={saving} setSaving={setSaving} />;
  return <CampaignSheet inputStyle={inputStyle} campaigns={campaigns} onClose={onClose} onCreate={onCreateCampaign} saving={saving} setSaving={setSaving} />;
}

function DonorSheet({
  inputStyle,
  onClose,
  onCreate,
  saving,
  setSaving,
}: {
  inputStyle: React.CSSProperties;
  onClose: () => void;
  onCreate: (i: { fullName: string; email?: string; phone?: string; address?: string; taxReceiptEnabled: boolean }) => Promise<void>;
  saving: boolean;
  setSaving: (b: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [tax, setTax] = useState(true);
  const submit = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await onCreate({ fullName: name.trim(), email, phone, taxReceiptEnabled: tax });
      onClose();
    } finally {
      setSaving(false);
    }
  };
  return (
    <Sheet title="Nouveau donateur" onClose={onClose}>
      <label className="block">
        <span className="text-text-tertiary text-xs uppercase tracking-wide block mb-1">Nom complet</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Marie A." className="w-full px-3 py-3 rounded-lg text-sm outline-none" style={inputStyle} data-testid="donor-name" />
      </label>
      <label className="block">
        <span className="text-text-tertiary text-xs uppercase tracking-wide block mb-1">Email</span>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@…" className="w-full px-3 py-3 rounded-lg text-sm outline-none" style={inputStyle} />
      </label>
      <label className="block">
        <span className="text-text-tertiary text-xs uppercase tracking-wide block mb-1">Téléphone</span>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+225 …" className="w-full px-3 py-3 rounded-lg text-sm outline-none" style={inputStyle} />
      </label>
      <button
        onClick={() => setTax(!tax)}
        className="flex items-center justify-between py-3 px-3 rounded-lg"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
        data-testid="donor-tax-toggle"
      >
        <span className="text-text-secondary text-xs">Reçu fiscal annuel</span>
        <span className="text-xs font-semibold" style={{ color: tax ? "#1DB954" : "var(--text-tertiary)" }}>
          {tax ? "Oui" : "Non"}
        </span>
      </button>
      <PrimaryButton onClick={submit} disabled={saving || !name.trim()} label={saving ? "Création…" : "Créer le donateur"} />
    </Sheet>
  );
}

function CampaignSheet({
  inputStyle,
  campaigns,
  onClose,
  onCreate,
  saving,
  setSaving,
}: {
  inputStyle: React.CSSProperties;
  campaigns: Array<{ id: string; name: string }>;
  onClose: () => void;
  onCreate: (i: { name: string; purpose?: string; fund?: string; target: string }) => Promise<void>;
  saving: boolean;
  setSaving: (b: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [fund, setFund] = useState("");
  const [target, setTarget] = useState("");
  void campaigns;
  const submit = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await onCreate({ name: name.trim(), purpose, fund, target });
      onClose();
    } finally {
      setSaving(false);
    }
  };
  return (
    <Sheet title="Nouvelle campagne" onClose={onClose}>
      <label className="block">
        <span className="text-text-tertiary text-xs uppercase tracking-wide block mb-1">Nom</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Fonds mission 2026" className="w-full px-3 py-3 rounded-lg text-sm outline-none" style={inputStyle} data-testid="campaign-name" />
      </label>
      <label className="block">
        <span className="text-text-tertiary text-xs uppercase tracking-wide block mb-1">But</span>
        <input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Objectif de la campagne" className="w-full px-3 py-3 rounded-lg text-sm outline-none" style={inputStyle} />
      </label>
      <label className="block">
        <span className="text-text-tertiary text-xs uppercase tracking-wide block mb-1">Fonds / caisse</span>
        <input value={fund} onChange={(e) => setFund(e.target.value)} placeholder="Ex : Caisse mission" className="w-full px-3 py-3 rounded-lg text-sm outline-none" style={inputStyle} />
      </label>
      <label className="block">
        <span className="text-text-tertiary text-xs uppercase tracking-wide block mb-1">Objectif (FCFA)</span>
        <input type="number" inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Ex : 5000000" className="w-full px-3 py-3 rounded-lg text-sm outline-none" style={inputStyle} data-testid="campaign-target" />
      </label>
      <PrimaryButton onClick={submit} disabled={saving || !name.trim()} label={saving ? "Création…" : "Créer la campagne"} />
    </Sheet>
  );
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative w-full max-w-lg rounded-t-2xl p-5 pb-28 space-y-3" style={{ backgroundColor: "var(--card)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-text-primary font-bold text-lg">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--surface-hover)" }} aria-label="Fermer">
            <X className="w-4 h-4 text-text-tertiary" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function PrimaryButton({ onClick, disabled, label }: { onClick: () => void; disabled?: boolean; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full py-3.5 rounded-full font-semibold text-white text-sm transition-all active:scale-95 disabled:opacity-40"
      style={{ backgroundColor: "var(--accent-primary)" }}
    >
      {label}
    </button>
  );
}
