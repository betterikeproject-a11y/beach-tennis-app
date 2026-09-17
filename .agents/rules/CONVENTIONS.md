---
trigger: always_on
---

# Convenções Globais de Código

> 📌 **MANDATÓRIO:** Antes de qualquer implementação, você DEVE ler, compreender e seguir estritamente todas as regras arquiteturais, de segurança e de código limpo definidas em `docs/rules/CLEAN_CODE.md` e nos arquivos correlatos. As convenções abaixo padronizam o estilo e a estrutura de todos os arquivos do projeto.

---

## 1. Nomenclatura de Arquivos e Componentes

| Elemento | Convenção | Exemplos |
|---|---|---|
| **Arquivos e Pastas** | `kebab-case` | `score-input.tsx`, `tournament-list.tsx`, `bracket-tree.ts` |
| **Planos de Execução** | Pasta `/docs` + prefixo `PLAN-` | `docs/PLAN-autenticacao.md`, `docs/PLAN-ranking.md` |
| **Componentes React** | `PascalCase` | `ScoreInput`, `TournamentList`, `EditPlayerDialog` |
| **Funções e Métodos** | `camelCase` | `computeGroupStandings`, `isValidScore`, `handleSave` |
| **Variáveis e Propriedades** | `camelCase` | `playerCount`, `isPending`, `selectedRankingId` |
| **Constantes Globais** | `UPPER_SNAKE_CASE` ou `as const` | `MAX_PLAYERS`, `DEFAULT_POINTS_CONFIG` |
| **Tipos e Interfaces** | `PascalCase` | `PlayerStanding`, `KnockoutMatch`, `PointsConfig` |

---

## 2. Organização e Ordenação de Imports

Os imports de qualquer arquivo devem ser organizados em blocos lógicos separados por uma linha em branco:

```typescript
// 1. Bibliotecas externas e frameworks (React, Next.js, terceiros)
import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Trophy, AlertTriangle } from "lucide-react";

// 2. Componentes internos compartilhados (@/components/...)
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";

// 3. Módulos de domínio, serviços e utilitários internos (@/lib/...)
import { supabase } from "@/lib/supabase";
import { computeGroupStandings } from "@/lib/domain/standings";
import { isValidScore } from "@/lib/domain/matches";
import { cn } from "@/lib/utils";

// 4. Imports co-localizados relativos (se houver)
import { ScoreRow } from "./_components/ScoreRow";

// 5. Imports exclusivos de tipos (type-only imports)
import type { Player, Tournament, GroupMatch } from "@/lib/types/database";
import type { PlayerStanding } from "@/lib/domain/standings";
```

---

## 3. Diretrizes de TypeScript e Boas Práticas

### ❌ Proibido / Evitar
- **Uso de `any`:** Desativa a checagem de tipos do compilador e introduz fragilidades silenciosas. Use tipos explícitos, generics ou `unknown`.
- **`Record<string, any>` genérico:** Destrói a semântica do domínio. Defina interfaces tipadas.
- **Arquivos Monolíticos (> 350 LOC):** Dificultam a leitura, revisão e manutenção. Extraia subcomponentes, hooks ou módulos de domínio.
- **Funções com Múltiplas Responsabilidades:** Viola o princípio de responsabilidade única (SRP).
- **Magic Strings:** Comparação com strings literais repetidas em múltiplos lugares. Extraia para objetos constantes com `as const`.
- **Operações Nativas com Ponto Flutuante para Valores Financeiros:** Nunca use `0.1 + 0.2` diretamente para dinheiro. Utilize inteiros representando centavos ou bibliotecas de precisão decimal arbitrária.

### ✅ Obrigatório
- **`strict: true`** no `tsconfig.json` mantido sempre ativo.
- **Path Aliases `@/*`:** Utilize sempre caminhos absolutos relativos à raiz do projeto. Evite caminhos relativos longos (`../../../../components`).
- **Exportação de Tipos:** Tipos devem ser exportados ao lado dos módulos ou schemas de validação onde são originados.
