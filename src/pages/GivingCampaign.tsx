import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  useGivingCampaigns,
  useGivingDonors,
  usePledges,
  useTransactions,
  useTransactionGiving,
  addPledgePS,
  linkTransactionGivingPS,
  deleteTransactionGivingPS,
} from "@/lib/dataLayer";
import { campaignProgress, giving } from "@/capabilities/giving";
import { formatCurrencyFull } from "@/lib/utils";
import TopHeader from "@/components/TopHeader";
import BottomNav from "@/components/BottomNav";
import { Plus, Link2, Trash2, Handshake, Receipt, X, Check } from "lucide-react";
import { IonPage, IonContent } from "@ionic/react";

export default function GivingCampaign() {
  const { id } = useParams();
  const { data: campaigns } = useGivingCampaigns();
  const { data: donors } = useGivingDonors();
  const { data: pledges } = usePledges();
  const { data: transactions } = useTransactions();
  const { data: links } = useTransactionGiving();

  const campaign = campaigns.find((c) => c.id === id);
  const incomeTx = useMemo(
    () => transactions.filter((t) => t.type === "INCOME"),
    [transactions],
  );
  const p = useMemo(
    () => (campaign ? campaignProgress(campaign, links, pledges, incomeTx) : null),
    [campaign, links, pledges, incomeTx],
  );

  const campaignPledges = pledges.filter((x) => x.campaign_id === id);
  const campaignLinks = links.filter((x) => x.campaign_id === id);
  const linkedTxIds = new Set(links.map((l) => l.transaction_id));
  const availableTx = incomeTx.filter((t) => !linkedTxIds.has(t.id));

  // Pledge form
  const [pledgeDonor, setPledgeDonor] = useState("");
  const [pledgeAmount, setPledgeAmount] = useState("");
  const [pledgeSchedule, setPledgeSchedule] = useState("ONCE");
  const [showPledge, setShowPledge] = useState(false);
  const [pledgeBusy, setPledgeBusy] = useState(false);

  // Link form
  const [linkTx, setLinkTx] = useState("");
  const [linkDonor, setLinkDonor] = useState("");
  const [showLink, setShowLink] = useState(false);
  const [linkBusy, setLinkBusy] = useState(false);

  // Receipt
  const [receiptDonor, setReceiptDonor] = useState("");
  const [receiptYear, setReceiptYear] = useState(String(new Date().getFullYear()));
  const [receiptMsg, setReceiptMsg] = useState<string | null>(null);
  const [receiptBusy, setReceiptBusy] = useState(false);

  if (!campaign || !p) {
    return (
      <IonPage>
        <IonContent className="bg-canvas">
          <div className="min-h-screen bg-canvas">
            <TopHeader title="Campagne" />
            <div className="max-w-lg mx-auto px-5 pb-32 pt-16">
              <p className="text-text-tertiary text-sm">Campagne introuvable.</p>
            </div>
            <BottomNav />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const donorName = (id: string) => donors.find((d) => d.id === id)?.full_name ?? "Donateur";
  const tx = (tid: string) => incomeTx.find((t) => t.id === tid);
  const inputStyle = { backgroundColor: "var(--surface)", color: "var(--text-primary)", border: "1px solid var(--border)" } as const;

  const addPledge = async () => {
    if (!pledgeDonor || !pledgeAmount || pledgeBusy) return;
    setPledgeBusy(true);
    try {
      await addPledgePS({
        campaign_id: campaign.id,
        donor_id: pledgeDonor,
        pledged_amount_cents: Math.round((Number(pledgeAmount.replace(/[^\d]/g, "")) || 0) * 100),
        schedule: pledgeSchedule,
        amount_per_period_cents: 0,
        start_date: null,
        end_date: null,
        status: "ACTIVE",
        notes: null,
      });
      setPledgeAmount("");
      setShowPledge(false);
    } finally {
      setPledgeBusy(false);
    }
  };

  const linkTxNow = async () => {
    if (!linkTx || !linkDonor || linkBusy) return;
    setLinkBusy(true);
    try {
      await linkTransactionGivingPS({
        transaction_id: linkTx,
        donor_id: linkDonor,
        campaign_id: campaign.id,
      });
      setLinkTx("");
      setLinkDonor("");
      setShowLink(false);
    } finally {
      setLinkBusy(false);
    }
  };

  const generateReceipt = async () => {
    if (!receiptDonor || receiptBusy) return;
    setReceiptBusy(true);
    setReceiptMsg(null);
    try {
      await giving.generateTaxReceipt(receiptDonor, Number(receiptYear));
      setReceiptMsg(`Reçu fiscal ${receiptYear} généré pour ${donorName(receiptDonor)}.`);
    } finally {
      setReceiptBusy(false);
    }
  };

  const done = p.target > 0 && p.given >= p.target;

  return (
    <IonPage>
      <IonContent className="bg-canvas">
        <div className="min-h-screen bg-canvas">
          <TopHeader title="Campagne" />
          <div className="max-w-lg mx-auto px-5 pb-32 pt-16">
            {/* Progression */}
            <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: "var(--card)" }} data-testid="campaign-progress">
              <h1 className="text-text-primary font-bold text-lg mb-1">{campaign.name}</h1>
              {campaign.purpose && <p className="text-text-tertiary text-xs mb-3">{campaign.purpose}</p>}
              <div className="h-3 rounded-full overflow-hidden mb-2" style={{ backgroundColor: "var(--surface-hover)" }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, p.pctOfTarget ?? 0)}%`,
                    backgroundColor: done ? "#1DB954" : "var(--accent-primary)",
                  }}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-text-tertiary text-[11px]">Collecté</p>
                  <p className="text-income font-bold text-sm">{formatCurrencyFull(p.given)}</p>
                </div>
                <div>
                  <p className="text-text-tertiary text-[11px]">Pledges</p>
                  <p className="text-text-secondary font-bold text-sm" style={{ color: "#FFB800" }}>
                    {formatCurrencyFull(p.pledged)}
                  </p>
                </div>
                <div>
                  <p className="text-text-tertiary text-[11px]">Objectif</p>
                  <p className="text-text-primary font-bold text-sm">{formatCurrencyFull(p.target)}</p>
                </div>
              </div>
            </div>

            {/* Pledges */}
            <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: "var(--card)" }} data-testid="campaign-pledges">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Handshake className="w-4 h-4" style={{ color: "var(--accent-primary)" }} />
                  <p className="text-text-primary font-semibold text-sm">Pledges</p>
                </div>
                {showPledge ? (
                  <button onClick={() => setShowPledge(false)} aria-label="Fermer"><X className="w-4 h-4 text-text-tertiary" /></button>
                ) : (
                  <button onClick={() => setShowPledge(true)} className="text-text-tertiary active:scale-90 transition-transform" aria-label="Ajouter un pledge">
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>
              {showPledge && (
                <div className="space-y-3 mb-3 p-3 rounded-lg" style={{ backgroundColor: "var(--surface)" }}>
                  <select value={pledgeDonor} onChange={(e) => setPledgeDonor(e.target.value)} className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={inputStyle} aria-label="Donateur" data-testid="pledge-donor">
                    <option value="">Choisir un donateur…</option>
                    {donors.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" inputMode="numeric" value={pledgeAmount} onChange={(e) => setPledgeAmount(e.target.value)} placeholder="Montant (FCFA)" className="px-3 py-2.5 rounded-lg text-sm outline-none" style={inputStyle} aria-label="Montant" data-testid="pledge-amount" />
                    <select value={pledgeSchedule} onChange={(e) => setPledgeSchedule(e.target.value)} className="px-3 py-2.5 rounded-lg text-sm outline-none" style={inputStyle} aria-label="Fréquence">
                      <option value="ONCE">Une fois</option>
                      <option value="MONTHLY">Mensuel</option>
                      <option value="QUARTERLY">Trimestriel</option>
                      <option value="YEARLY">Annuel</option>
                    </select>
                  </div>
                  <button onClick={addPledge} disabled={pledgeBusy || !pledgeDonor || !pledgeAmount} className="w-full py-3 rounded-full font-semibold text-white text-sm active:scale-95 transition-transform disabled:opacity-40" style={{ backgroundColor: "var(--accent-primary)" }}>
                    {pledgeBusy ? "…" : "Ajouter le pledge"}
                  </button>
                </div>
              )}
              {campaignPledges.length === 0 ? (
                <p className="text-text-tertiary text-xs">Aucun pledge sur cette campagne.</p>
              ) : (
                <div className="space-y-2">
                  {campaignPledges.map((pl) => (
                    <div key={pl.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-text-primary text-sm font-medium">{donorName(pl.donor_id)}</p>
                        <p className="text-text-tertiary text-[11px]">{pl.schedule}</p>
                      </div>
                      <p className="text-text-secondary text-sm font-semibold">{formatCurrencyFull(pl.pledged_amount_cents)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Rattachements */}
            <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: "var(--card)" }} data-testid="campaign-links">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Link2 className="w-4 h-4" style={{ color: "var(--accent-primary)" }} />
                  <p className="text-text-primary font-semibold text-sm">Rattachements</p>
                </div>
                {showLink ? (
                  <button onClick={() => setShowLink(false)} aria-label="Fermer"><X className="w-4 h-4 text-text-tertiary" /></button>
                ) : (
                  <button onClick={() => setShowLink(true)} className="text-text-tertiary active:scale-90 transition-transform" aria-label="Rattacher une transaction">
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>
              {showLink && (
                <div className="space-y-3 mb-3 p-3 rounded-lg" style={{ backgroundColor: "var(--surface)" }}>
                  <select value={linkTx} onChange={(e) => setLinkTx(e.target.value)} className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={inputStyle} aria-label="Transaction" data-testid="link-transaction">
                    <option value="">Choisir une transaction…</option>
                    {availableTx.map((t) => (
                      <option key={t.id} value={t.id}>
                        {(t.description || "Dîme/don") + " · " + formatCurrencyFull(t.amount)}
                      </option>
                    ))}
                  </select>
                  <select value={linkDonor} onChange={(e) => setLinkDonor(e.target.value)} className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={inputStyle} aria-label="Donateur" data-testid="link-donor">
                    <option value="">Choisir un donateur…</option>
                    {donors.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                  </select>
                  <button onClick={linkTxNow} disabled={linkBusy || !linkTx || !linkDonor} className="w-full py-3 rounded-full font-semibold text-white text-sm active:scale-95 transition-transform disabled:opacity-40" style={{ backgroundColor: "var(--accent-primary)" }}>
                    {linkBusy ? "…" : "Rattacher"}
                  </button>
                </div>
              )}
              {campaignLinks.length === 0 ? (
                <p className="text-text-tertiary text-xs">Aucune transaction rattachée.</p>
              ) : (
                <div className="space-y-2">
                  {campaignLinks.map((l) => {
                    const t = tx(l.transaction_id);
                    return (
                      <div key={l.id} className="flex items-center justify-between">
                        <div className="flex-1 pr-2">
                          <p className="text-text-primary text-sm font-medium">
                            {t?.description || "Transaction"}
                          </p>
                          <p className="text-text-tertiary text-[11px]">{donorName(l.donor_id)}</p>
                        </div>
                        <button onClick={() => deleteTransactionGivingPS(l.id)} className="text-text-tertiary active:scale-90 transition-transform" aria-label="Détacher">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Reçu fiscal */}
            <div className="rounded-xl p-4" style={{ backgroundColor: "var(--card)" }} data-testid="campaign-receipt">
              <div className="flex items-center gap-2 mb-3">
                <Receipt className="w-4 h-4" style={{ color: "var(--accent-primary)" }} />
                <p className="text-text-primary font-semibold text-sm">Reçu fiscal annuel</p>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <select value={receiptDonor} onChange={(e) => setReceiptDonor(e.target.value)} className="px-3 py-2.5 rounded-lg text-sm outline-none" style={inputStyle} aria-label="Donateur" data-testid="receipt-donor">
                    <option value="">Donateur…</option>
                    {donors.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                  </select>
                  <select value={receiptYear} onChange={(e) => setReceiptYear(e.target.value)} className="px-3 py-2.5 rounded-lg text-sm outline-none" style={inputStyle} aria-label="Année">
                    {[new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <button onClick={generateReceipt} disabled={receiptBusy || !receiptDonor} className="w-full py-3 rounded-full font-semibold text-white text-sm active:scale-95 transition-transform disabled:opacity-40" style={{ backgroundColor: "var(--accent-primary)" }}>
                  <span className="inline-flex items-center gap-2"><Check className="w-4 h-4" /> {receiptBusy ? "Génération…" : "Générer le reçu"}</span>
                </button>
                {receiptMsg && <p className="text-income text-xs text-center">{receiptMsg}</p>}
              </div>
            </div>
          </div>
          <BottomNav />
        </div>
      </IonContent>
    </IonPage>
  );
}
