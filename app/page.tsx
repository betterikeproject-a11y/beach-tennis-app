import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TournamentList } from "@/components/TournamentList";
import { LeagueRanking } from "@/components/LeagueRanking";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Torneios</h1>
        <Link href="/torneios/novo">
          <Button className="bg-orange-500 hover:bg-orange-600 text-white">
            + Novo Torneio
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="torneios">
        <TabsList className="w-full">
          <TabsTrigger value="torneios" className="flex-1">Torneios</TabsTrigger>
          <TabsTrigger value="ranking" className="flex-1">Ranking da Liga</TabsTrigger>
          <TabsTrigger value="config" className="flex-1">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="torneios" className="mt-4">
          <TournamentList />
        </TabsContent>

        <TabsContent value="ranking" className="mt-4">
          <LeagueRanking />
        </TabsContent>

        <TabsContent value="config" className="mt-4">
          <div className="text-center py-8 text-muted-foreground">
            <Link href="/configuracoes" className="text-orange-600 underline">
              Abrir configurações de pontuação
            </Link>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
