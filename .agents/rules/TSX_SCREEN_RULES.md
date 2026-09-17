---
trigger: glob
globs: "**/*.tsx"
---

# TSX Screen Rules — Padrões Obrigatórios para Telas e Componentes

> 🎨 **MANDATÓRIO:** Estas regras aplicam-se a **TODOS** os arquivos `.tsx` do sistema. Toda implementação de tela, componente, modal ou formulário DEVE seguir estritamente as convenções abaixo. Violações serão tratadas como não-conformidades de implementação.

---

## 1. Componentes Visuais — shadcn/ui Obrigatório

### 1.1 Regra Fundamental: shadcn/ui Primeiro
**SEMPRE utilize componentes do shadcn/ui** antes de criar qualquer componente customizado.

| Decisão | Ação |
|---|---|
| Componente já existe em `@/components/ui/` | Usar diretamente via `@/components/ui/*` |
| Componente existe no catálogo oficial do shadcn mas não está instalado | Instalar via CLI: `npx shadcn@latest add <name>` |
| Nenhum componente atende ao requisito | Criar em `_components/` da rota específica ou em `@/components/` |

- **Biblioteca de Ícones:** Utilize **exclusivamente `lucide-react`**. É proibido utilizar emojis como ícones de ação ou navegação em botões e menus.
- **Theming e Estilo:** Utilize sempre as variáveis e tokens definidos no Design System e em `globals.css`.

---

## 2. Gestão Obrigatória dos 4 Estados de Interface

Todo componente ou página que carrega ou exibe dados dinâmicos DEVE tratar explicitamente os 4 estados do ciclo de vida:

1. **Carregamento (Loading):** Renderize `<Skeleton>` com dimensões proporcionais ao conteúdo final. Evite telas em branco ou spinners isolados que causem saltos de layout (*Layout Shift*).
2. **Vazio (Empty):** Exiba mensagem amigável e um botão de ação rápida quando não houver itens cadastrados.
3. **Erro (Error):** Exiba feedback visual claro com opção de nova tentativa quando a requisição falhar.
4. **Dados (Data Render):** Renderize os elementos com tipografia e espaçamento consistentes.

---

## 3. Ergonomia Móvel e Responsividade Mobile-First

- **Abordagem Mobile-First:** Escreva as classes utilitárias base pensando em telas móveis e aplique breakpoints progressivos com `sm:`, `md:`, `lg:`, `xl:`. Evite seletores desktop-first com `max-md:` ou `max-sm:`.
- **Área Mínima de Toque (Touch Target):** Botões, inputs e elementos interativos em telas móveis devem possuir altura mínima de **44px a 48px** (`h-11` ou `h-12`).
- **InputMode Numérico:** Em campos de placar, código ou valores numéricos, adicione sempre `inputMode="numeric"` para abrir o teclado correto em celulares.
- **Feedback Interativo:** Adicione cursor pointer explícito e estados de hover/active em botões e itens clicáveis (`cursor-pointer transition-colors active:scale-[0.99]`).

---

## 4. Modais, Diálogos e Acessibilidade

- Todo modal (`Dialog`) de confirmação ou formulário DEVE possuir um botão explícito de cancelamento/fechamento no rodapé (`DialogFooter`).
- Mutações acionadas a partir de modais devem desativar o botão de confirmação e exibir estado de carregamento enquanto a operação está pendente.
- Ações destrutivas (excluir torneio, resetar chaves) devem utilizar o componente `AlertDialog` com texto de aviso em vermelho e confirmação explícita.
