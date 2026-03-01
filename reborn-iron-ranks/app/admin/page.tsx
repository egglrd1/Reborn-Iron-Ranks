// app/admin/page.tsx
import Link from "next/link";

export const dynamic = "force-dynamic";

const pill: React.CSSProperties = {
  display: "inline-block",
  padding: "10px 14px",
  borderRadius: 10,
  background: "#2e2a6a",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "white",
  textDecoration: "none",
  fontWeight: 900,
  whiteSpace: "nowrap",
};

export default function AdminHome() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui", maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ margin: "4px 0 10px 0", fontSize: 34, lineHeight: 1.05 }}>Admin Center</h1>

      <div
        style={{
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 12,
          background: "rgba(255,255,255,0.04)",
          padding: 12,
          marginBottom: 12,
        }}
      >
        <div style={{ fontWeight: 900, marginBottom: 6 }}>System Status</div>
        <div style={{ opacity: 0.9 }}>
          ✅ Admin route protection active ✅ Discord authentication enforced ✅ Config is DB-driven
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link href="/admin/config" style={pill}>
          Edit tool config
        </Link>
      </div>

      <div style={{ marginTop: 14, opacity: 0.75, fontSize: 12 }}>
        Publishing a config updates Items / Requirements / PvM ranks instantly (no redeploy).
      </div>
    </main>
  );
}