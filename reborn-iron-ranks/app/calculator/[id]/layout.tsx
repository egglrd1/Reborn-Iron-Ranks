import React from "react";
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
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);

  const resolvedParams = await params;
  const id = String(resolvedParams?.id ?? "");

  if (!session) {
    const callbackUrl = `/calculator/${encodeURIComponent(id)}`;
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  return (
    <>
      {children}
      {modal}
    </>
  );
}
