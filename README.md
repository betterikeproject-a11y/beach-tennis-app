# Liga Jurerê Beach Sports — Beach Tennis Tournament Manager

> Plataforma web para gerenciamento integral de torneios de Beach Tennis no formato **Rei da Praia / Super 8 com Duplas Rotativas** (*Rotating Doubles*) e consolidação de pontuações em rankings contínuos da liga.

---

## 🚀 Início Rápido

### Pré-requisitos
- Node.js 20+
- npm

### Instalação e Execução Local

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Preencha NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY

# 3. Iniciar servidor de desenvolvimento
npm run dev

# 4. Executar suíte de testes de domínio
npm test
```

Acesse [http://localhost:3000](http://localhost:3000) no seu navegador.

---

## ⚡ Principais Funcionalidades

- **Formato Rei da Praia / Super 8**: Sorteio balanceado de grupos (4 ou 5 atletas) com suporte a cabeças de chave via algoritmo Fisher-Yates.
- **Duplas Rotativas Automáticas**: Matriz matemática que garante que todos os atletas do grupo joguem entre si sem repetição de parceiro.
- **Validação de Regras Oficiais de Beach Tennis**: Bloqueio de placares de set ilegais diretamente na interface (`isValidScore`: 6x0 a 6x4, 7x5 e 7x6).
- **Mata-Mata Dinâmico**: Chaveamento automático por mérito geral para 2, 4, 6 (com Byes) ou 8 duplas, incluindo disputa de 3º lugar.
- **Transmissão ao Vivo (Realtime)**: Painel de transmissão (`/visualizacao`) sincronizado instantaneamente via Supabase Realtime (WebSockets CDC).
- **Ranking Acumulado da Liga**: Consolidação de pontos de múltiplos torneios com tabela de pontuação customizável por categoria e normalização de nomes.

---

## 📚 Documentação Técnica do Projeto

Toda a documentação canônica de arquitetura, regras de negócio e design do projeto está centralizada no diretório [`/docs`](./docs/):

### Especificações Centrais
- 📄 **[PRD — Product Requirements Document](./docs/PRD.md)**: Especificação completa de requisitos de produto, personas, diagrama de entidades (ERD), dicionário de dados do Supabase e algoritmos de domínio (`lib/domain/`).
- 🎨 **[UX/UI Design System](./docs/UX_UI_DESIGN_SYSTEM.md)**: Design System oficial com tokens YAML front-matter, paleta cromática dos 8 grupos, escala tipográfica híbrida (`Inter` + `Geist Mono`), anatomia de componentes e diretrizes de ergonomia móvel.

### Regras de Engenharia & Padrões de Implementação
- 📐 **[Clean Code & Arquitetura DDD](./docs/rules/CLEAN_CODE.md)**: Organização em 4 camadas (Delivery, Domain, Infrastructure, Shared), princípios SRP/DRY/KISS, early return e tipagem estrita sem `any`.
- 🧩 **[Design Patterns TypeScript](./docs/rules/DESIGN_PATTERNS.md)**: Catálogo com 14 padrões de projeto adaptados para Next.js 16 (Strategy, Registry, Factory, Singleton, Repository, Adapter, Observer, etc.).
- 📝 **[Formulários & Validação Zod](./docs/rules/FORM_VALIDATION.md)**: Padrão A (Server Action + Zod + React 19 `useActionState`) e Padrão B (Client Validation com feedback inline).
- 📊 **[Tabelas & Listagens de Dados](./docs/rules/DATA_TABLE.md)**: Padrões visuais e tratamento obrigatório dos 4 estados de UI (Loading/Skeleton, Empty, Error e Data).
- 🔒 **[Segurança de APIs](./.agents/rules/API_SECURITY.md)**: Diretrizes estritas para prevenção de Mass Assignment e Over-fetching/Data Leakage.
- 🏷️ **[Convenções Globais de Código](./.agents/rules/CONVENTIONS.md)**: Nomenclatura `kebab-case`, ordenação de imports e regras de precisão decimal.
- 📱 **[TSX Screen Rules](./.agents/rules/TSX_SCREEN_RULES.md)**: Componentes shadcn/ui obrigatórios, ícones Lucide React e alvos de toque ≥ 44px.

---

## 🧪 Qualidade, Testes e Code Review

O projeto conta com automação de qualidade e workflows assistidos por IA:

```bash
# Executar testes unitários de regras de negócio (Vitest)
npm test

# Executar checagem estática de tipos TypeScript
npx tsc --noEmit

# Executar auditoria de segurança (vulnerabilidades, segredos, OWASP)
python .agents/skills/vulnerability-scanner/scripts/security_scan.py .

# Executar medição de cobertura de tipos
python .agents/skills/lint-and-validate/scripts/type_coverage.py .
```

### Workflows do AG Kit
- `/code-review`: Avaliação rigorosa pós-implementação com política *Fix Immediately* de tolerância zero para erros de lint, tipos e testes.
- `/orchestrate`: Coordenação de múltiplos agentes especialistas para tarefas complexas.
- `/test`: Criação e execução de novos cenários de testes automatizados.
