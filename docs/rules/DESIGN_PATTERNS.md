# Design Patterns — Catálogo de Referência TypeScript & Next.js

> Catálogo canônico de padrões de projeto adaptados para **TypeScript + Node.js + Next.js 16 (App Router)**.
> Cada padrão resolve problemas arquiteturais recorrentes garantindo alta coesão, baixo acoplamento e tipagem segura.

---

## Sumário dos Padrões

| # | Padrão | Categoria | Finalidade Principal |
|---|---|---|---|
| 1 | [Strategy](#1-strategy) | Comportamental | Algoritmos intercambiáveis selecionados em tempo de execução |
| 2 | [Registry](#2-registry) | Criacional | Catálogo centralizado de implementações dinâmicas |
| 3 | [Factory](#3-factory) | Criacional | Criação de objetos complexos e famílias de entidades |
| 4 | [Singleton / Module Singleton](#4-singleton) | Criacional | Instância única compartilhada para recursos de infraestrutura |
| 5 | [Repository](#5-repository) | Estrutural (DDD) | Abstração do acesso à persistência de dados |
| 6 | [Adapter](#6-adapter) | Estrutural | Compatibilização de interfaces incompatíveis |
| 7 | [Facade](#7-facade) | Estrutural | Ponto de entrada simplificado para subsistemas complexos |
| 8 | [Observer / Pub-Sub](#8-observer--pub-sub) | Comportamental | Notificação reativa e desacoplada de eventos |
| 9 | [Builder](#9-builder) | Criacional | Construção fluente de consultas e configurações |
| 10 | [Decorator / HOF](#10-decorator--higher-order-function) | Estrutural | Agregação dinâmica de comportamento (logging, auth, timing) |
| 11 | [Chain of Responsibility](#11-chain-of-responsibility) | Comportamental | Pipeline encadeado de processamento e validações |
| 12 | [Result Pattern (Either)](#12-result-pattern-either) | Funcional | Modelagem de sucesso/falha sem relying excessivo em throws |
| 13 | [Value Object](#13-value-object) | DDD | Primitivos tipados e auto-validados |
| 14 | [Module Pattern (Barrel Export)](#14-module-pattern-barrel-export) | Estrutural | Encapsulamento de APIs públicas de módulos |

---

## Princípios Fundamentais

Antes de aplicar qualquer padrão, avalie:
- **KISS (Keep It Simple):** Não use um padrão complexo se uma função pura simples resolve o problema.
- **YAGNI (You Aren't Gonna Need It):** Não adicione abstrações especulativas para requisitos inexistentes.
- **Composição > Herança:** Prefira compor funções e objetos a criar hierarquias profundas de classes.
- **Type Safety Absoluta:** Todos os padrões devem possuir contratos estritos com generics e interfaces. **Nunca use `any`**.

---

## 1. Strategy

**Categoria:** Comportamental  
**Problema:** Diferentes algoritmos precisam ser executados para uma mesma operação, variando de acordo com o contexto ou configuração de runtime.  
**Solução:** Definir uma interface comum e implementações isoladas que podem ser injetadas.

```typescript
export interface ScoringStrategy {
  calculatePoints(victories: number, knockoutStage: string): number;
}

export class StandardLeagueScoring implements ScoringStrategy {
  calculatePoints(victories: number, knockoutStage: string): number {
    const base = victories * 20;
    const bonus = knockoutStage === "campeao" ? 140 : 0;
    return base + bonus;
  }
}

export class MasterLeagueScoring implements ScoringStrategy {
  calculatePoints(victories: number, knockoutStage: string): number {
    const base = victories * 30;
    const bonus = knockoutStage === "campeao" ? 200 : 0;
    return base + bonus;
  }
}
```

---

## 2. Registry

**Categoria:** Criacional  
**Problema:** O sistema precisa registrar e resolver estratégias ou handlers dinamicamente sem acoplamento rígido via `switch/case`.  
**Solução:** Um dicionário tipado que associa chaves a instâncias ou funções produtoras.

```typescript
export class HandlerRegistry<T> {
  private handlers = new Map<string, T>();

  register(key: string, handler: T): void {
    this.handlers.set(key, handler);
  }

  get(key: string): T {
    const handler = this.handlers.get(key);
    if (!handler) {
      throw new Error(`Nenhum handler registrado para a chave: ${key}`);
    }
    return handler;
  }
}
```

---

## 3. Factory

**Categoria:** Criacional  
**Problema:** Criação de instâncias com parâmetros complexos ou variações dinâmicas de tipos.  
**Solução:** Função ou classe dedicada responsável pela instanciação correta.

```typescript
export type NotificationType = "email" | "sms" | "push";

export interface NotificationService {
  send(recipient: string, message: string): Promise<void>;
}

export function createNotificationService(type: NotificationType): NotificationService {
  switch (type) {
    case "email": return new EmailNotificationService();
    case "sms": return new SmsNotificationService();
    case "push": return new PushNotificationService();
    default:
      const _exhaustive: never = type;
      throw new Error(`Tipo de notificação inválido: ${_exhaustive}`);
  }
}
```

---

## 4. Singleton / Module Singleton

**Categoria:** Criacional  
**Problema:** Garantir que recursos pesados ou clientes com pools de conexões (banco de dados, Redis) possuam apenas uma instância ativa no runtime.  
**Solução:** Module Singleton nativo do ES Modules ou cache global em `globalThis` durante o hot-reload do Next.js.

```typescript
import { createClient } from "@supabase/supabase-js";

const globalForSupabase = globalThis as unknown as {
  supabaseClient: ReturnType<typeof createClient> | undefined;
};

export const supabase =
  globalForSupabase.supabaseClient ??
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

if (process.env.NODE_ENV !== "production") {
  globalForSupabase.supabaseClient = supabase;
}
```

---

## 5. Repository

**Categoria:** Estrutural (DDD)  
**Problema:** A camada de domínio não deve depender de queries SQL literais ou detalhes específicos de bibliotecas de acesso a dados.  
**Solução:** Interface de repositório que abstrai as operações de persistência.

```typescript
export interface TournamentRepository {
  findById(id: string): Promise<Tournament | null>;
  save(tournament: Tournament): Promise<void>;
}
```

---

## 6. Adapter

**Categoria:** Estrutural  
**Problema:** Integrar uma biblioteca ou serviço de terceiros cuja API possui formato divergente do modelo interno da aplicação.  
**Solução:** Uma camada intermediária que traduz chamadas e payloads.

```typescript
export interface LegacyPlayerScore {
  atleta_id: string;
  pontos: number;
}

export function adaptLegacyScoreToDomain(legacy: LegacyPlayerScore): PlayerStanding {
  return {
    playerId: legacy.atleta_id,
    points: legacy.pontos,
    wins: Math.floor(legacy.pontos / 3),
    saldo: 0,
    gamesFor: 0,
    gamesAgainst: 0,
    position: 0,
    playerName: "",
  };
}
```

---

## 7. Facade

**Categoria:** Estrutural  
**Problema:** Uma funcionalidade do sistema requer interagir com múltiplos módulos e passos complexos.  
**Solução:** Uma interface simples de alto nível que orquestra os subsistemas internamente.

```typescript
export async function finalizeTournamentFacade(tournamentId: string) {
  // 1. Valida encerramento dos jogos
  await validateKnockoutMatchesClosed(tournamentId);
  // 2. Calcula pontos individuais de todos os atletas
  const points = await computeAllPlayerPoints(tournamentId);
  // 3. Persiste pontos na liga
  await saveTournamentPoints(tournamentId, points);
  // 4. Altera status do torneio
  await updateTournamentStatus(tournamentId, "finalizado");
}
```

---

## 8. Observer / Pub-Sub

**Categoria:** Comportamental  
**Problema:** Notificar múltiplos componentes ou sistemas reativos quando uma alteração de estado ocorre, mantendo baixo acoplamento.  
**Solução:** Assinatura de canais e emissão de eventos (ex: Supabase Realtime CDC).

```typescript
export function subscribeToMatchUpdates(
  tournamentId: string,
  onUpdate: (payload: MatchUpdate) => void
) {
  const channel = supabase
    .channel(`tournament-${tournamentId}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "group_matches" },
      (payload) => onUpdate(payload.new as MatchUpdate)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
```

---

## 9. Builder

**Categoria:** Criacional  
**Problema:** Criação de queries dinâmicas ou objetos de configuração complexos com múltiplos parâmetros opcionais.  
**Solução:** Encadear chamadas de métodos fluentes.

```typescript
export class TournamentFilterBuilder {
  private query: TournamentFilter = {};

  withStatus(status: TournamentStatus): this {
    this.query.status = status;
    return this;
  }

  afterDate(date: string): this {
    this.query.minDate = date;
    return this;
  }

  build(): TournamentFilter {
    return { ...this.query };
  }
}
```

---

## 10. Decorator / Higher-Order Function (HOF)

**Categoria:** Estrutural  
**Problema:** Aplicar funcionalidades transversais (autenticação, medição de tempo, logging) sem modificar o corpo da função original.  
**Solução:** HOF que envolve a função original.

```typescript
export function withTiming<TArgs extends any[], TReturn>(
  label: string,
  fn: (...args: TArgs) => Promise<TReturn>
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs) => {
    const start = performance.now();
    try {
      return await fn(...args);
    } finally {
      const duration = (performance.now() - start).toFixed(2);
      console.log(`[PERF] ${label} executou em ${duration}ms`);
    }
  };
}
```

---

## 11. Chain of Responsibility

**Categoria:** Comportamental  
**Problema:** Uma requisição ou fluxo de negócio precisa passar por uma sequência de validações ou transformações ordenadas, podendo ser interrompido na primeira falha.  
**Solução:** Encadeamento de handlers independentes.

```typescript
export type ValidationStep<T> = (data: T) => string | null;

export function runValidationPipeline<T>(
  data: T,
  steps: ValidationStep<T>[]
): { valid: boolean; error?: string } {
  for (const step of steps) {
    const error = step(data);
    if (error) return { valid: false, error };
  }
  return { valid: true };
}
```

---

## 12. Result Pattern (Either)

**Categoria:** Funcional  
**Problema:** O uso excessivo de `try/catch` para fluxos esperados de validação oculta o controle de fluxo e não expressa falhas no sistema de tipos.  
**Solução:** Um tipo discriminado representando sucesso ou falha com payload tipado.

```typescript
export type Result<T, E = string> =
  | { success: true; data: T }
  | { success: false; error: E };

export function ok<T>(data: T): Result<T, never> {
  return { success: true, data };
}

export function fail<E>(error: E): Result<never, E> {
  return { success: false, error };
}
```

---

## 13. Value Object

**Categoria:** Domain-Driven Design (DDD)  
**Problema:** Usar tipos primitivos puros (`string`, `number`) permite estados inválidos (ex: placas de set ilegais, nomes em branco).  
**Solução:** Encapsular o valor em um objeto/tipo com validação intrínseca.

```typescript
export class ScoreSet {
  private constructor(public readonly gamesA: number, public readonly gamesB: number) {}

  static create(a: number, b: number): Result<ScoreSet> {
    if (!isValidScore(a, b)) {
      return fail(`Placar inválido de Beach Tennis: ${a}x${b}`);
    }
    return ok(new ScoreSet(a, b));
  }
}
```

---

## 14. Module Pattern (Barrel Export)

**Categoria:** Estrutural  
**Problema:** Dependências externas acessam arquivos internos privados de um domínio, gerando acoplamento a caminhos de arquivos voláteis.  
**Solução:** Arquivo `index.ts` centralizado que expõe apenas a interface pública desejada do módulo.

```typescript
// lib/domain/index.ts
export * from "./matches";
export * from "./standings";
export * from "./bracket";
export * from "./ranking";
// Módulos privados ou helpers internos não são re-exportados
```
