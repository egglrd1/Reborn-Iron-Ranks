import BackButton from "@/components/BackButton";

export default async function EditPlayerPage() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <BackButton fallbackHref="/players" />
      <h1>Edit player (next step)</h1>
      <p>This will let you change join date / scaling later.</p>
    </main>
  );
}
