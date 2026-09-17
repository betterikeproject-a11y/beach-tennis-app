---
name: Liga Jurerê Beach Sports Design System
version: 1.0.0
description: Design System oficial da Liga Jurerê Beach Sports — especificações de tokens, componentes, tipografia, paleta temática e ergonomia para interfaces web e mobile de torneios de Beach Tennis.
colors:
  brand: "#4ABACC"
  brand-hover: "#389EAF"
  brand-light: "#E8F8FB"
  background: "#FFFFFF"
  foreground: "#1A1C1E"
  card: "#FFFFFF"
  card-foreground: "#1A1C1E"
  muted: "#F3F4F6"
  muted-foreground: "#6B7280"
  border: "#E5E7EB"
  input: "#E5E7EB"
  ring: "#4ABACC"
  destructive: "#EF4444"
  destructive-light: "#FEE2E2"
  success: "#10B981"
  success-light: "#D1FAE5"
  warning: "#F59E0B"
  warning-light: "#FEF3C7"
  group-1-border: "#60A5FA"
  group-1-text: "#2563EB"
  group-1-bg: "#EFF6FF"
  group-2-border: "#34D399"
  group-2-text: "#059669"
  group-2-bg: "#ECFDF5"
  group-3-border: "#FB923C"
  group-3-text: "#EA580C"
  group-3-bg: "#FFF7ED"
  group-4-border: "#C084FC"
  group-4-text: "#9333EA"
  group-4-bg: "#FAF5FF"
  group-5-border: "#FB7185"
  group-5-text: "#E11D48"
  group-5-bg: "#FFF1F2"
  group-6-border: "#FBBF24"
  group-6-text: "#D97706"
  group-6-bg: "#FFFBEB"
  group-7-border: "#22D3EE"
  group-7-text: "#0891B2"
  group-7-bg: "#ECFEFF"
  group-8-border: "#818CF8"
  group-8-text: "#4F46E5"
  group-8-bg: "#EEF2FF"
typography:
  display:
    fontFamily: Inter, sans-serif
    fontSize: 28px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: -0.02em
  h1:
    fontFamily: Inter, sans-serif
    fontSize: 24px
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: -0.015em
  h2:
    fontFamily: Inter, sans-serif
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: -0.01em
  h3:
    fontFamily: Inter, sans-serif
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.4
  body-md:
    fontFamily: Inter, sans-serif
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: Inter, sans-serif
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: Inter, sans-serif
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: 0.02em
  score-digit:
    fontFamily: var(--font-geist-mono), monospace
    fontSize: 20px
    fontWeight: 700
    lineHeight: 1.0
rounded:
  sm: 4px
  md: 8px
  lg: 10px
  xl: 14px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  2xl: 32px
  3xl: 48px
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    height: 48px
    padding: "0 16px"
  score-input:
    width: 48px
    height: 48px
    backgroundColor: "#FFFFFF"
    borderColor: "{colors.border}"
    rounded: "{rounded.md}"
    typography: "{typography.score-digit}"
  group-card:
    backgroundColor: "{colors.card}"
    borderColor: "{colors.border}"
    rounded: "{rounded.lg}"
---

# UX/UI Design System — Liga Jurerê Beach Sports

> **Versão:** 1.0.0  
> **Status:** Canônico / Ativo  
> **Framework:** Tailwind CSS v4 + Radix / Base UI + Lucide Icons + Sonner  
> **Público:** Designers, Desenvolvedores Frontend e Mantenedores do Beach Tennis App.

---

## 1. Overview (Visão Geral)

O Design System da **Liga Jurerê Beach Sports** foi concebido especificamente para as demandas singulares de eventos esportivos de areia:
- **Atmosfera Solar e Praiana**: Uso do tom Cyan/Aqua vibrante (`#4ABACC`) evoca a água, o frescor e a energia das praias de Jurerê, complementado por fundos limpos e arejados.
- **Ergonomia Sob Luz Solar Direta**: Alta legibilidade e contraste para visualização em telas de smartphones de atletas e organizadores sob o sol da praia.
- **Operação Tátil Rápida (Touch Targets ≥ 44px)**: Botões, inputs numéricos de placar e menus desenhados para fácil toque com dedos úmidos ou sujos de areia.
- **Diferenciação Visual Instantânea de Grupos**: 8 paletas temáticas com acento de borda superior (`border-t-4`) e títulos cromáticos para que atletas identifiquem suas quadras e grupos instantaneamente à distância.

---

## 2. Colors (Paleta de Cores)

### 2.1 Cores da Marca (Brand Palette)
- **Brand Principal (`#4ABACC`)**: Identidade primária da liga. Utilizado nos botões de ação principal (CTA), links destacados, cabeçalho de marca e anéis de foco ativos.
- **Brand Hover (`#389EAF`)**: Variação escura para estados de foco, pairar e clique ativo.
- **Brand Light (`#E8F8FB`)**: Superfície suave para badges da fase de eliminatórias, itens selecionados e containers de destaque sutil.

### 2.2 Cores Semânticas e Feedback
- **Destructive / Erro (`#EF4444`)**: Alerta de exclusão de ranking/torneio, indicador de placar inválido (`border-red-400 text-red-500`).
- **Success (`#10B981`)**: Badge de torneio finalizado, mensagens de sucesso (toasts), confirmação de gravação de placares.
- **Warning (`#F59E0B`)**: Avisos de atletas com nomes similares que necessitam conferência manual.

### 2.3 Cores Temáticas dos Grupos (Group Theming)
Cada um dos 8 grupos possíveis recebe uma assinatura visual exclusiva em `border-t-4`, badge e título do card:

| Grupo | Nome | Cor da Borda Superior | Cor do Título / Badge | Cor de Fundo Suave |
|---|---|---|---|---|
| **Grupo 1** | Azul Céu | `border-t-blue-400` (`#60A5FA`) | `text-blue-600` (`#2563EB`) | `bg-blue-50` (`#EFF6FF`) |
| **Grupo 2** | Esmeralda | `border-t-emerald-400` (`#34D399`) | `text-emerald-600` (`#059669`) | `bg-emerald-50` (`#ECFDF5`) |
| **Grupo 3** | Laranja Solar | `border-t-orange-400` (`#FB923C`) | `text-orange-600` (`#EA580C`) | `bg-orange-50` (`#FFF7ED`) |
| **Grupo 4** | Roxo Pôr do Sol | `border-t-purple-400` (`#C084FC`) | `text-purple-600` (`#9333EA`) | `bg-purple-50` (`#FAF5FF`) |
| **Grupo 5** | Rosa Coral | `border-t-rose-400` (`#FB7185`) | `text-rose-600` (`#E11D48`) | `bg-rose-50` (`#FFF1F2`) |
| **Grupo 6** | Âmbar Ouro | `border-t-amber-400` (`#FBBF24`) | `text-amber-600` (`#D97706`) | `bg-amber-50` (`#FFFBEB`) |
| **Grupo 7** | Ciano Tropical | `border-t-cyan-400` (`#22D3EE`) | `text-cyan-600` (`#0891B2`) | `bg-cyan-50` (`#ECFEFF`) |
| **Grupo 8** | Índigo Oceânico | `border-t-indigo-400` (`#818CF8`) | `text-indigo-600` (`#4F46E5`) | `bg-indigo-50` (`#EEF2FF`) |

---

## 3. Typography (Tipografia)

O sistema emprega duas famílias tipográficas para atender a legibilidade geral e a precisão numérica:
1. **Fonte Primária: `Inter`**: Tipografia sem serifa geométrica neutra (`next/font/google`), com kerning otimizado para interfaces de densidade média.
2. **Fonte Numérica: `Geist Mono`**: Fonte monoespaçada aplicada em placares, timers e colunas de números para garantir alinhamento tabular perfeito de dígitos.

### Escala Tipográfica Canônica:
- **Display / Hero (`text-3xl font-extrabold`)**: `28px / lineHeight: 1.2` — Usado no título do torneio e da home.
- **H1 (`text-2xl font-bold`)**: `24px / lineHeight: 1.25` — Cabeçalhos das telas de grupos, classificação e eliminatórias.
- **H2 (`text-lg font-semibold`)**: `18px / lineHeight: 1.3` — Títulos de cards de grupos, modais e chaves.
- **H3 (`text-base font-medium`)**: `16px / lineHeight: 1.4` — Subtítulos de seções e nomes de duplas.
- **Body Regular (`text-sm font-normal`)**: `14px / lineHeight: 1.5` — Nomes de atletas, confrontos, descrições.
- **Caption / Meta (`text-xs font-medium text-muted-foreground`)**: `12px / lineHeight: 1.4` — Datas, estatísticas de saldo, legendas.
- **Score Mono (`font-mono text-lg font-bold`)**: `20px` — Dígitos de placares (6x4, 7x5).

---

## 4. Layout (Estrutura e Espaçamento)

- **Container Global**:
  - `max-w-[1600px] w-full mx-auto px-4 py-6` para acomodar visualização lado a lado em telões e desktops de secretaria.
- **Barra de Navegação Superior (Header)**:
  - `sticky top-0 z-40 bg-white border-b shadow-sm` com logotipo oficial circular (44x44px), título da marca e botão de Login / Status de Administrador.
- **Sistema de Grid Responsivo**:
  - Em mobile: layout de coluna única (`grid-cols-1`) com rolagem vertical suave e cartões empilhados.
  - Em tablet/desktop: layout de 2 colunas (`lg:grid-cols-2`) ou 3 colunas (`xl:grid-cols-3`) para visualização simultânea de jogos e tabelas de classificação de grupos.
- **Espaçamento Semântico**:
  - `gap-2` (8px): Entre botões de ação e campos compactos.
  - `gap-4` (16px): Entre inputs de formulários e linhas de tabelas.
  - `gap-6` (24px): Entre cards de grupos e seções maiores.
  - `space-y-6`: Espaçamento padrão entre blocos de conteúdo da página.

---

## 5. Elevation & Depth (Elevação e Profundidade)

A estética da aplicação é contemporânea, limpa e plana, com sombras sutis para destacar elementos funcionais:
- **Nível 0 (Flat)**: Fundo geral da página (`bg-gray-50`).
- **Nível 1 (Cards & Superfícies)**: `bg-white border border-gray-200 shadow-sm rounded-lg`.
- **Nível 2 (Sticky Header & Menus)**: `shadow-md` para fixar contexto de navegação superior durante o scroll.
- **Nível 3 (Overlays & Diálogos)**: Modais com backdrop escuro translúcido (`bg-black/60 backdrop-blur-xs`), garantindo foco cognitivo durante edição de nomes e login.

---

## 6. Shapes (Formas e Bordas)

- **Border Radius**:
  - Padrão do Tailwind: `--radius: 0.625rem` (10px).
  - Componentes de input e botão: `rounded-md` (8px).
  - Cards e containers de grupo: `rounded-lg` (10px).
  - Badges de status e pílulas: `rounded-full` (9999px).
- **Tratamento de Bordas**:
  - Linhas divisórias delicadas em `border-gray-200` ou `oklch(0.922 0 0)`.
  - Destaque no topo de cards de grupos com `border-t-4` para identificação cromática instantânea.

---

## 7. Components (Anatomia dos Componentes Centrais)

### 7.1 `ScoreInput` (Entrada Numérica de Placar)
Componente proprietário de alta ergonomia para digitação de pontuações de sets de Beach Tennis:
- **Anatomia**:
  - 2 inputs numéricos individuais de 48x48px (`w-12 h-12 text-center text-lg font-mono border rounded-md`).
  - Separador visual central com caractere multiplicador "×" (`text-muted-foreground font-medium`).
  - Mensagem de validação inline (`text-xs text-red-500`) ativada instantaneamente quando o placar não é válido pelas regras oficiais.
- **Comportamento & Micro-interações**:
  - Teclado mobile aciona teclado numérico puro via `inputMode="numeric"`.
  - **Auto-Avanço de Foco**: Ao digitar o primeiro dígito no input A, o foco avança e seleciona automaticamente o input B.
  - Bloqueio numérico estrito: rejeita caracteres fora do intervalo 0 a 7.
  - Desativação limpa para espectadores e modos somente-leitura (`disabled:bg-gray-100`).

### 7.2 `GroupCard` (Card de Grupo e Confrontos)
- **Header**: Fundo suave temático (`bg-[color]-50`), barra superior com `border-t-4`, badge do número do grupo e botão de expandir/recolher.
- **Tabela de Classificação do Grupo**:
  - Colunas: Posição (`#`), Nome do Jogador, Vitórias (`V`), Saldo de Games (`SG`), Games Pró (`GP`), Pontos (`PTS`).
  - Destaque visual com fundo verde suave ou ícone de check para os atletas em zona de classificação para o mata-mata (top 3 padrão).
  - Ícone de lápis / clique para edição rápida do nome do atleta (`EditPlayerDialog`) e botão de ajuste de desempate manual (`position_override`).
- **Lista de Jogos do Grupo**:
  - Cartões individuais para cada confronto indicando número do jogo (`Jogo 1/3`).
  - Dupla 1 vs Dupla 2 com nomes em negrito.
  - `ScoreInput` acoplado com debounce de 600ms e indicador visual "Salvando... / Salvo!".

### 7.3 `BracketTree` (Chave de Eliminatórias)
- **Fases**: Quartas de Final → Semifinais → Final + Disputa do 3º Lugar.
- **Card de Confronto Eliminatório**:
  - Exibição de Seed da Dupla (`#1`, `#2`, etc.).
  - Nomes dos 2 integrantes da dupla por linha.
  - Linhas de conexão que conduzem visualmente o vencedor para a próxima rodada da chave.
  - Slots nulos exibem `"Aguardando definição anterior"` em cinza suave.
  - Distintivo de Campeão com ícone de troféu dourado para a dupla vencedora da Final.

### 7.4 `LeagueRankingTable` (Tabela de Ranking Geral da Liga)
- **Pódio com Destaque Visual**:
  - 1º Lugar: Badge Ouro (`bg-amber-100 text-amber-800 border-amber-300 font-bold`).
  - 2º Lugar: Badge Prata (`bg-slate-100 text-slate-700 border-slate-300 font-bold`).
  - 3º Lugar: Badge Bronze (`bg-orange-100 text-orange-800 border-orange-300 font-bold`).
- **Colunas**: Posição, Atleta, Torneios Disputados, Vitórias na Fase de Grupos, Pontos de Mata-mata, Pontuação Geral.

### 7.5 `EditPlayerDialog` (Modal de Edição de Atleta)
- Permite renomear atletas em qualquer estágio do torneio.
- **Sugestões Inteligentes**: Lista suspensa com nomes já existentes em torneios anteriores da liga para evitar que um jogador ganhe duas entradas com grafias levemente divergentes (ex: "Beto" vs "Roberto").

### 7.6 `LiveScoreboard` (Transmissão em Tempo Real `/visualizacao`)
- Destinado a televisores no lounge do clube e celulares da plateia.
- Sem botões de edição ou formulários.
- Distintivo pulsante `"🔴 AO VIVO"` no topo.
- Carrossel ou grade de todos os grupos e chave de eliminatórias sincronizados instantaneamente via WebSocket CDC do Supabase.

---

## 8. Diretrizes de Acessibilidade (a11y) e Ergonomia Mobile

1. **Alvos de Toque (Touch Targets)**: Todos os botões, checkboxes e inputs possuem altura mínima de **44px a 48px**, garantindo acionamento seguro em celulares mesmo com mãos molhadas de suor ou com areia.
2. **Contraste de Cores (WCAG 2.1 AA)**: Todos os pares de texto e fundo possuem razão de contraste igual ou superior a **4.5:1** para texto normal e **3:1** para texto grande/destaques.
3. **Sem Dependência Exclusiva de Cor**: A classificação dos grupos exibe o número ordinal da posição (`1º`, `2º`, `3º`), e não apenas cores verdes/vermelhas, auxiliando usuários daltônicos.
4. **Prevenção de Cliques Acidentais**: Ações destrutivas (excluir torneio, resetar chaves) exigem modal de confirmação com texto explícito.

---

## 9. Do's and Don'ts (Boas Práticas e Proibições)

### ✅ Do's (O que Fazer)
- **Sempre utilize o token `--color-brand` (`#4ABACC`)** para botões de avanço primário no torneio.
- **Mantenha inputs numéricos com `inputMode="numeric"`** para abrir diretamente o teclado de números no celular.
- **Aplique a paleta canônica dos 8 grupos** em qualquer exibição de grupos (respeitando borda superior e fundo).
- **Valide o placar em tempo real** no cliente com a função `isValidScore` antes de persistir.
- **Utilize toasts não intrusivos (Sonner)** para dar feedback imediato de ações concluídas com sucesso.

### ❌ Don'ts (O que Não Fazer)
- **Nunca permita placares de set impossíveis** (como empates, placares negativos ou maiores que 7).
- **Nunca force login para consultar resultados** — atletas e familiares devem ter acesso público imediato via link.
- **Nunca invente cores aleatórias para os grupos** fora da paleta de 8 cores do Design System.
- **Não altere fontes arbitrárias** — mantenha a divisão estrita entre `Inter` para texto e `Geist Mono` para números de placar.
- **Não permita que o salvamento de placares trave a interface** — utilize sempre auto-save com debounce em segundo plano.
