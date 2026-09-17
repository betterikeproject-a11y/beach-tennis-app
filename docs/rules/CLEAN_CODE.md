# Clean Code & Architectural Guidelines

> Este documento define os padrões arquiteturais, princípios de Clean Code e boas práticas para o desenvolvimento no ecossistema Next.js (App Router) e TypeScript. Toda nova implementação deve seguir estas diretrizes para garantir uma base de código escalável, testável e desacoplada.

---

## 🛠️ Core Tech Stack & Padrões
- **Runtime:** Node.js 20+
- **Fullstack Framework:** Next.js 16 (App Router com Server Components e Server Actions)
- **UI Library:** React 19 + Tailwind CSS + shadcn/ui
- **Linguagem:** TypeScript (Strict Mode)
- **Persistência / Backend:** PostgreSQL / Supabase
- **Testes:** Vitest para testes unitários e de integração

---

## 1. Arquitetura em Camadas (Domain-Driven Design Desacoplado)

Adotamos uma organização baseada em **Domain-Driven Design (DDD)** separando estritamente nosso código em quatro camadas principais: Delivery, Domain, Infrastructure e Shared. Essa arquitetura garante isolamento seguro das lógicas de negócio em relação ao framework de apresentação.

### Princípios de Estruturação

```
src/ ou raiz/
├── app/                  # 1. DELIVERY LAYER (Rotas, Telas, Layouts, Server Actions finas)
├── components/           # Componentes de UI reutilizáveis (shadcn/ui, compostos)
├── lib/
│   ├── domain/           # 2. DOMAIN LAYER (Regras puras de negócio, cálculos, algoritmos)
│   ├── infrastructure/   # 3. INFRASTRUCTURE LAYER (Clientes de banco, storage, APIs externas)
│   ├── types/            # 4. SHARED LAYER (Contratos, tipagens globais, utilitários puros)
│   └── utils.ts
```

1. **Camada de Delivery Fina (`app/` e `components/`):**
   - A pasta `app/` foca **exclusivamente** em roteamento, layouts, páginas (Server/Client Components) e orquestração de chamadas. Nenhuma regra complexa de negócio deve residir diretamente dentro de funções de renderização.
   - Utilize Route Groups (ex: `(admin)`, `(auth)`) para controle de layout e pastas privadas `_components` para componentes restritos a uma rota específica.

2. **Isolamento da Lógica de Domínio (`lib/domain/`):**
   - As regras de negócio críticas ficam totalmente desacopladas do framework de visualização. Funções de domínio devem ser **puras** e testáveis sem a necessidade de instanciar React ou Next.js.
   - Entidades, cálculos estatísticos, regras de pontuação e matrizes de dados residem aqui.

3. **Abstração de Infraestrutura (`lib/` ou `lib/infrastructure/`):**
   - Clientes de banco de dados (ex: `@/lib/supabase.ts`, Prisma Client), serviços de cache e integrações com provedores terceiros devem ser isolados em módulos de infraestrutura.
   - Camadas superiores interagem com a infraestrutura por meio de funções de serviço e contratos tipados.

4. **Recursos Compartilhados (`lib/utils.ts`, `lib/types/`):**
   - Utilitários reutilizáveis, formatação de strings, auxiliares de classes CSS (`cn`), tipagens globais e constantes compartilhadas.

---

## 2. Padrões de Componentes Visuais (shadcn/ui First)

> **Regra Canônica:** Para criação de componentes visuais, **sempre dê preferência ao shadcn/ui** em vez de criar componentes do zero.

- Componentes base ficam em `@/components/ui/`.
- Ícones: **Lucide React** (proibido usar emojis como ícones funcionais de interface).
- Cores e Theming: Variáveis CSS configuradas em `globals.css` (tokens de cores semânticos).
- Estilo: Consistência visual com tokens globais de espaçamento e raios de borda.

---

## 3. Diretrizes Essenciais de Clean Code

### 3.1 Funções Pequenas e Responsabilidade Única (SRP)
- Cada função ou componente deve fazer apenas **uma coisa** e fazê-la bem.
- **Tamanho Limite:** Funções devem preferencialmente conter até **25 a 30 linhas**. Se uma função estiver fazendo validação, orquestração e formatação, divida-a em funções auxiliares dedicadas.
- **Tamanho Limite de Arquivos:** Módulos e arquivos `.tsx`/`.ts` não devem ultrapassar **350 linhas**. Componentes que excederem esse limite devem ser decompostos em subcomponentes menores ou hooks.

### 3.2 Cláusulas de Guarda e Retorno Antecipado (Early Return)
Evite aninhamentos profundos de condicionais (`if/else/if/else`). Trate erros e casos extremos logo no início da função:

```typescript
// ❌ Evite (aninhamento profundo):
function processScore(match: Match | null, scoreA: number, scoreB: number) {
  if (match) {
    if (isValidScore(scoreA, scoreB)) {
      // lógica principal...
    } else {
      throw new Error("Placar inválido");
    }
  } else {
    throw new Error("Partida não encontrada");
  }
}

// ✅ Recomendado (Early Return):
function processScore(match: Match | null, scoreA: number, scoreB: number) {
  if (!match) {
    throw new Error("Partida não encontrada");
  }
  if (!isValidScore(scoreA, scoreB)) {
    throw new Error("Placar inválido");
  }

  // Lógica principal sem aninhamento
  return executeUpdate(match.id, scoreA, scoreB);
}
```

### 3.3 Nomes Significativos e Auto-explicativos
- Nomes de variáveis e funções devem revelar sua intenção sem necessidade de comentários supérfluos.
- Funções que retornam booleanos devem iniciar com prefixos claros: `isValid`, `hasPermission`, `canSubmit`, `isCompleted`.
- Evite abreviações crípticas (`usr`, `calc_fn`, `m_res`). Prefira `user`, `calculateFinalScore`, `matchResult`.

### 3.4 Eliminação de Magic Strings e Números Mágicos
- Identificadores de status, rotas, tipos de eventos e valores limítrofes devem ser declarados como constantes tipadas ou enums:
```typescript
// ❌ Proibido:
if (tournament.status === "finalizado") { ... }

// ✅ Correto:
export const TOURNAMENT_STATUS = {
  DRAFT: "draft",
  GROUPS: "grupos",
  KNOCKOUT: "eliminatorias",
  FINISHED: "finalizado",
} as const;

export type TournamentStatus = typeof TOURNAMENT_STATUS[keyof typeof TOURNAMENT_STATUS];
```

---

## 4. Tipagem Estrita e Segurança no TypeScript

- **Proibição Absoluta de `any`:** O uso de `any` desativa o compilador e mascara falhas graves de integração. Utilize tipos explícitos, genéricos com constraints ou `unknown` (com validação via type guards ou Zod).
- **Sem `Record<string, any>` Genérico:** Modele interfaces ou tipos precisos para objetos de domínio.
- **Validação nas Fronteiras com Zod:** Dados recebidos de requisições HTTP, formulários de entrada e variáveis de ambiente devem ser validados em runtime com schemas Zod antes de serem consumidos pelo domínio.

---

## 5. Tratamento de Erros e Resiliência

1. **Falhas Esperadas vs. Erros Irrecuperáveis:**
   - Para operações com falhas esperadas (validação de formulário, dados incorretos digitados pelo usuário), retorne objetos de resultado discriminados (`{ success: false, error: string }`).
   - Lance exceções (`throw new Error(...)`) apenas para violações de integridade, falhas de rede ou estados impossíveis.
2. **Feedback Visual Imediato:**
   - Toda Server Action ou mutation acionada pela interface deve fornecer feedback transparente via toasts (`sonner`) ou mensagens de erro inline.
3. **Nunca Engula Erros Silenciosamente:**
   - Blocos `catch (e) {}` vazios são estritamente proibidos. Registre o erro no console ou em ferramenta de telemetria e forneça retorno amigável ao chamador.
