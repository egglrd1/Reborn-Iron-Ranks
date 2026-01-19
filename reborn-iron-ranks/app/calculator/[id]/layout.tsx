// app/calculator/[id]/layout.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function CalculatorLayout({
  children,
  modal,
  params,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    const callbackUrl = `/calculator/${encodeURIComponent(params.id)}`;
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  return (
    <>
      {children}
      {modal}
    </>
  );
}
