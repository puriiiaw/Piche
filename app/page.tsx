import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { LabourCurveApp } from "@/components/labour-curve-app";

export default async function Home() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as any).role as "ADMIN" | "PM" | "VP";
  let assignedProjectIds: string[] = [];
  if (role === "PM") {
    const dbUser = await getDb().user.findUnique({
      where: { id: session.user.id },
      select: { assignedProjectIds: true }
    });
    assignedProjectIds = dbUser?.assignedProjectIds ?? [];
  }

  const user = {
    id: session.user.id,
    name: session.user.name ?? null,
    role,
    username: (session.user as any).username as string,
    assignedProjectIds,
  };

  return <LabourCurveApp user={user} />;
}
