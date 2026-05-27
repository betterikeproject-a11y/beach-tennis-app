import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";
import { HomePageClient } from "@/components/HomePageClient";
import type { Ranking } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const cookieStore = await cookies();
  const isAdmin = cookieStore.get("admin_token")?.value === "true";

  const { data: rankings } = await supabase
    .from("rankings")
    .select("*")
    .order("name") as { data: Ranking[] | null };

  return (
    <HomePageClient initialRankings={rankings ?? []} isAdmin={isAdmin} />
  );
}
