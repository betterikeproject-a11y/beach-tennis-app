export type DrawPlayer = {
  id: string;
  name: string;
  isCabecaDeChave: boolean;
};

export type GroupDraw = {
  groupNumber: number;
  players: DrawPlayer[];
}[];

/**
 * Computes group sizes for N players.
 * Target: groups of 4. Min size enforced at 4 (reduces group count if needed).
 * Never produces a group of 2 or 6+.
 */
export function computeGroupSizes(n: number): number[] {
  if (n < 12) throw new Error(`Mínimo de 12 jogadores necessário, recebido: ${n}`);
  if (n > 32) throw new Error(`Máximo de 32 jogadores permitido, recebido: ${n}`);

  let numGroups = Math.max(1, Math.round(n / 4));

  while (numGroups >= 1) {
    const base = Math.floor(n / numGroups);
    if (base >= 4) {
      const extra = n % numGroups;
      // extra groups of (base+1), the rest of base
      return [
        ...Array(extra).fill(base + 1),
        ...Array(numGroups - extra).fill(base),
      ];
    }
    numGroups--;
  }

  throw new Error(`Impossível distribuir ${n} jogadores em grupos válidos`);
}

/**
 * Draws groups given a list of players.
 * With seeds: one cabeça per group (must equal numGroups), rest shuffled in.
 * Without seeds: all players shuffled and distributed.
 */
export function drawGroups(
  players: DrawPlayer[],
  useSeeds: boolean
): GroupDraw {
  const sizes = computeGroupSizes(players.length);
  const numGroups = sizes.length;

  const seeds = players.filter((p) => p.isCabecaDeChave);
  const rest = players.filter((p) => !p.isCabecaDeChave);

  let groups: DrawPlayer[][];

  if (useSeeds && seeds.length > 0) {
    if (seeds.length !== numGroups) {
      throw new Error(
        `Número de cabeças de chave (${seeds.length}) deve ser igual ao número de grupos (${numGroups}). Ajuste os cabeças de chave ou desative a opção.`
      );
    }
    // One seed per group, fill remaining slots with shuffled non-seeds
    const shuffled = fisherYates(rest);
    groups = seeds.map((s) => [s]);
    let idx = 0;
    for (let g = 0; g < numGroups; g++) {
      const slots = sizes[g] - 1;
      for (let i = 0; i < slots; i++) {
        groups[g].push(shuffled[idx++]);
      }
    }
  } else {
    const shuffled = fisherYates(players);
    groups = Array.from({ length: numGroups }, () => []);
    let idx = 0;
    for (let g = 0; g < numGroups; g++) {
      for (let i = 0; i < sizes[g]; i++) {
        groups[g].push(shuffled[idx++]);
      }
    }
  }

  return groups.map((players, i) => ({ groupNumber: i + 1, players }));
}

function fisherYates<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
