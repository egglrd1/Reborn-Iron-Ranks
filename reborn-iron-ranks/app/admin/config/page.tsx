// app/admin/config/page.tsx
import BackButton from "@/components/BackButton";
import ConfigEditorClient from "./ui/ConfigEditorClient";
import { loadActiveConfig } from "@/lib/loadActiveConfig";

export const dynamic = "force-dynamic";

export default async function AdminConfigPage() {
  const active = await loadActiveConfig(); // RuntimeConfig | null

  return (
    <main
      style={{
        padding: "24px 16px",
        fontFamily: "system-ui",
        maxWidth: 1280,
        margin: "0 auto",
      }}
    >
      <BackButton fallbackHref="/admin" />
      <h1 style={{ margin: "12px 0 8px 0", fontSize: 34, lineHeight: 1.05 }}>Admin • Config</h1>
      <p style={{ opacity: 0.8, marginTop: 0 }}>
        Edit the tool by publishing a new <b>config_versions</b> row. Use the changelog to roll back instantly.
      </p>

      <ConfigEditorClient initialConfig={active as any} />
    </main>
  );
}