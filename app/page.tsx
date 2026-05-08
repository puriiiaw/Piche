import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LabourCurveApp } from "@/components/labour-curve-app";

export default async function Home() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = {
    id: session.user.id,
    name: session.user.name ?? null,
    role: (session.user as any).role as "ADMIN" | "PM" | "VP",
    username: (session.user as any).username as string,
  };

  return <LabourCurveApp user={user} />;
}
