import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { RefreshCw, Save, Gift, Users, Shield, Wallet, ChevronRight, Activity } from "lucide-react";
import axiosInstance from "../api/axiosInstance";

type CustomerReferralConfig = {
  enabled: boolean;
  baseReferralsRequired: number;
  extraReferralsPerCycle: number;
  maxReferralCycles: number;
  baseCouponAmount: number;
  extraCouponAmount: number;
  baseCoinsReward: number;
  extraCoinsReward: number;
  rewardCouponValidityDays: number;
};

type DriverReferralConfig = {
  enabled: boolean;
  baseReferralsRequired: number;
  extraReferralsPerCycle: number;
  maxReferralCycles: number;
  baseRewardAmount: number;
  extraRewardAmount: number;
};

type RewardConfigResponse = {
  settings?: {
    referral?: Partial<CustomerReferralConfig>;
    driverReferral?: Partial<DriverReferralConfig>;
  };
};

const C = {
  page: "#080C14",
  card: "#0D1220",
  border: "#1A2540",
  text: "#F0F4FF",
  textSub: "#7B90B8",
  textMuted: "#2E3F5C",
  amber: "#F59E0B",
  amberDim: "rgba(245,158,11,0.12)",
  blue: "#3B82F6",
  blueDim: "rgba(59,130,246,0.12)",
  green: "#10B981",
  greenDim: "rgba(16,185,129,0.12)",
  purple: "#A78BFA",
  purpleDim: "rgba(167,139,250,0.12)",
  red: "#EF4444",
  redDim: "rgba(239,68,68,0.12)",
};

function NumberField({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
}) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 12, color: C.textSub, fontWeight: 600 }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", background: "#060A10" }}>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            background: "transparent",
            color: C.text,
            padding: "0.8rem 0.9rem",
            fontSize: 14,
            fontWeight: 600,
          }}
        />
        {suffix ? (
          <span style={{ padding: "0 0.85rem", color: C.textSub, borderLeft: `1px solid ${C.border}`, fontSize: 12, fontWeight: 700 }}>
            {suffix}
          </span>
        ) : null}
      </div>
    </label>
  );
}

function ToggleChip({
  active,
  onToggle,
  label,
}: {
  active: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onToggle}
      style={{
        border: `1px solid ${active ? C.green : C.border}`,
        background: active ? C.greenDim : C.card,
        color: active ? C.green : C.textSub,
        borderRadius: 999,
        padding: "0.55rem 0.9rem",
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {label}: {active ? "Enabled" : "Disabled"}
    </button>
  );
}

export default function ReferralManagement() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customer, setCustomer] = useState<CustomerReferralConfig>({
    enabled: true,
    baseReferralsRequired: 5,
    extraReferralsPerCycle: 2,
    maxReferralCycles: 3,
    baseCouponAmount: 30,
    extraCouponAmount: 10,
    baseCoinsReward: 50,
    extraCoinsReward: 10,
    rewardCouponValidityDays: 90,
  });
  const [driver, setDriver] = useState<DriverReferralConfig>({
    enabled: true,
    baseReferralsRequired: 5,
    extraReferralsPerCycle: 2,
    maxReferralCycles: 3,
    baseRewardAmount: 100,
    extraRewardAmount: 25,
  });

  const load = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get<RewardConfigResponse>("/admin/reward-config");
      const settings = response.data.settings ?? {};
      setCustomer((current) => ({ ...current, ...(settings.referral ?? {}) }));
      setDriver((current) => ({ ...current, ...(settings.driverReferral ?? {}) }));
    } catch (error) {
      toast.error("Failed to load referral settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const customerSummary = useMemo(() => {
    return `₹${customer.baseCouponAmount} + ${customer.baseCoinsReward} coins`;
  }, [customer.baseCouponAmount, customer.baseCoinsReward]);

  const driverSummary = useMemo(() => {
    return `₹${driver.baseRewardAmount} driver reward`;
  }, [driver.baseRewardAmount]);

  const save = async () => {
    setSaving(true);
    try {
      const response = await axiosInstance.put("/admin/reward-config", {
        referral: customer,
        driverReferral: driver,
      });

      if (response.data?.success) {
        toast.success("Referral settings updated");
      } else {
        toast.error(response.data?.error || "Save failed");
      }
    } catch (error) {
      toast.error("Failed to save referral settings");
    } finally {
      setSaving(false);
    }
  };

  const StatCard = ({
    label,
    value,
    icon,
    accent,
  }: {
    label: string;
    value: string;
    icon: React.ReactNode;
    accent: string;
  }) => (
    <div style={{
      background: C.card,
      border: `1px solid ${C.border}`,
      borderRadius: 16,
      padding: "1rem 1.1rem",
      display: "flex",
      gap: 12,
      alignItems: "center",
    }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: `${accent}18`, color: accent, display: "grid", placeItems: "center" }}>{icon}</div>
      <div>
        <div style={{ fontSize: 12, color: C.textSub, fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 18, color: C.text, fontWeight: 800 }}>{value}</div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: C.page, display: "grid", placeItems: "center", color: C.textSub }}>
        Loading referral settings…
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.page, padding: "2rem 1.5rem", color: C.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700;9..40,800&display=swap');
        * { box-sizing: border-box; }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      <div style={{ maxWidth: 1280, margin: "0 auto", fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 28 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 999, background: C.amber, boxShadow: `0 0 12px ${C.amber}` }} />
              <h1 style={{ margin: 0, fontFamily: "'Syne', sans-serif", fontSize: 30, letterSpacing: "-0.04em" }}>Referral Management</h1>
            </div>
            <p style={{ margin: 0, color: C.textSub, paddingLeft: 20 }}>Customer referral rewards and driver referral payouts are configured here separately.</p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={load}
              style={{
                border: `1px solid ${C.border}`,
                background: C.card,
                color: C.textSub,
                borderRadius: 12,
                padding: "0.85rem 1rem",
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              <RefreshCw size={15} /> Refresh
            </button>
            <button
              onClick={save}
              disabled={saving}
              style={{
                border: "none",
                background: saving ? C.textMuted : C.amber,
                color: saving ? C.text : "#000",
                borderRadius: 12,
                padding: "0.85rem 1rem",
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: saving ? "not-allowed" : "pointer",
                fontWeight: 800,
              }}
            >
              <Save size={15} /> {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 28 }}>
          <StatCard label="Customer Reward" value={customerSummary} icon={<Gift size={18} />} accent={C.amber} />
          <StatCard label="Driver Reward" value={driverSummary} icon={<Wallet size={18} />} accent={C.green} />
          <StatCard label="Cycle Control" value={`${customer.maxReferralCycles} cycles`} icon={<Activity size={18} />} accent={C.blue} />
          <StatCard label="Program Status" value="Live" icon={<Shield size={18} />} accent={C.purple} />
        </div>

        <div style={{ display: "grid", gap: 18 }}>
          <section style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <Users size={18} color={C.amber} />
                  <h2 style={{ margin: 0, fontSize: 20, fontFamily: "'Syne', sans-serif" }}>Customer Referral</h2>
                </div>
                <p style={{ margin: 0, color: C.textSub }}>Existing customer referral rewards remain unchanged.</p>
              </div>
              <ToggleChip active={customer.enabled} onToggle={() => setCustomer((prev) => ({ ...prev, enabled: !prev.enabled }))} label="Customer referrals" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 14 }}>
              <NumberField label="Base referrals required" value={customer.baseReferralsRequired} onChange={(value) => setCustomer((prev) => ({ ...prev, baseReferralsRequired: value }))} />
              <NumberField label="Extra referrals per cycle" value={customer.extraReferralsPerCycle} onChange={(value) => setCustomer((prev) => ({ ...prev, extraReferralsPerCycle: value }))} />
              <NumberField label="Max referral cycles" value={customer.maxReferralCycles} onChange={(value) => setCustomer((prev) => ({ ...prev, maxReferralCycles: value }))} />
              <NumberField label="Coupon validity" value={customer.rewardCouponValidityDays} onChange={(value) => setCustomer((prev) => ({ ...prev, rewardCouponValidityDays: value }))} suffix="days" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
              <NumberField label="Base coupon amount" value={customer.baseCouponAmount} onChange={(value) => setCustomer((prev) => ({ ...prev, baseCouponAmount: value }))} suffix="₹" />
              <NumberField label="Extra coupon amount" value={customer.extraCouponAmount} onChange={(value) => setCustomer((prev) => ({ ...prev, extraCouponAmount: value }))} suffix="₹" />
              <NumberField label="Base coins reward" value={customer.baseCoinsReward} onChange={(value) => setCustomer((prev) => ({ ...prev, baseCoinsReward: value }))} suffix="coins" />
              <NumberField label="Extra coins reward" value={customer.extraCoinsReward} onChange={(value) => setCustomer((prev) => ({ ...prev, extraCoinsReward: value }))} suffix="coins" />
            </div>
          </section>

          <section style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <Wallet size={18} color={C.green} />
                  <h2 style={{ margin: 0, fontSize: 20, fontFamily: "'Syne', sans-serif" }}>Driver Referral</h2>
                </div>
                <p style={{ margin: 0, color: C.textSub }}>Driver referrals use a separate reward amount and payout path.</p>
              </div>
              <ToggleChip active={driver.enabled} onToggle={() => setDriver((prev) => ({ ...prev, enabled: !prev.enabled }))} label="Driver referrals" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 14 }}>
              <NumberField label="Base referrals required" value={driver.baseReferralsRequired} onChange={(value) => setDriver((prev) => ({ ...prev, baseReferralsRequired: value }))} />
              <NumberField label="Extra referrals per cycle" value={driver.extraReferralsPerCycle} onChange={(value) => setDriver((prev) => ({ ...prev, extraReferralsPerCycle: value }))} />
              <NumberField label="Max referral cycles" value={driver.maxReferralCycles} onChange={(value) => setDriver((prev) => ({ ...prev, maxReferralCycles: value }))} />
              <NumberField label="Base driver reward" value={driver.baseRewardAmount} onChange={(value) => setDriver((prev) => ({ ...prev, baseRewardAmount: value }))} suffix="₹" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
              <NumberField label="Extra reward per cycle" value={driver.extraRewardAmount} onChange={(value) => setDriver((prev) => ({ ...prev, extraRewardAmount: value }))} suffix="₹" />
            </div>
          </section>
        </div>

        <div style={{ marginTop: 18, display: "flex", gap: 10, justifyContent: "flex-end", alignItems: "center", color: C.textMuted, fontSize: 12 }}>
          <ChevronRight size={14} />
          <span>Driver referral reward settings are independent from customer coupons.</span>
        </div>
      </div>
    </div>
  );
}