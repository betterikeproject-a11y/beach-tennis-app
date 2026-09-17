# Guia de Implementação: Tabelas e Listagens de Dados (DATA_TABLE)

> Este documento estabelece as diretrizes para criação de tabelas e listagens de dados de alta performance, legibilidade e apelo visual em aplicações Next.js e React.

---

## 1. Estrutura e Apelo Visual

Listagens de dados devem ser apresentadas de forma limpa, moderna e altamente escaneável:

- **Contêiner com Acabamento Refinado:** A tabela deve ser envolvida em um card com bordas suaves (`border border-border/60 bg-card rounded-xl overflow-hidden shadow-sm`).
- **Linhas e Divisores:** Cabeçalho com fundo suave (`bg-muted/40 font-semibold text-xs uppercase tracking-wider text-muted-foreground`), linhas de dados com separadores sutis (`border-b border-border/40`) e efeito de hover interativo (`hover:bg-muted/30 transition-colors`).
- **Alinhamento Numérico:** Colunas de valores numéricos, pontuações e datas devem ser alinhadas à direita ou centralizadas, preferencialmente utilizando fontes monoespaçadas (`font-mono`) para garantir alinhamento vertical uniforme.

---

## 2. Gestão Obrigatória dos 4 Estados de Dados

Toda tabela ou listagem dinâmica deve tratar expressamente os quatro estados do ciclo de vida dos dados:

### 2.1 Estado de Carregamento (Loading State)
- **Regra:** Nunca exiba telas em branco ou transições abruptas.
- **Implementação:** Utilize o componente `<Skeleton>` do shadcn/ui para renderizar de 3 a 5 linhas simuladas enquanto a requisição está pendente.
```tsx
if (loading) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full rounded-md" />
      ))}
    </div>
  );
}
```

### 2.2 Estado Vazio (Empty State)
- **Regra:** Quando a consulta retornar uma lista vazia, forneça contexto claro e um caminho de ação imediato.
- **Implementação:** Exiba um contêiner centralizado com ícone do Lucide (ex: `Inbox`, `SearchX`), título explicativo e botão de ação primária (ex: "Cadastrar Primeiro Registro").
```tsx
if (items.length === 0) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <Inbox className="h-10 w-10 text-muted-foreground/60 mb-2" />
      <h3 className="font-semibold text-base">Nenhum registro encontrado</h3>
      <p className="text-sm text-muted-foreground mt-1 mb-4">
        Não há dados cadastrados para os filtros selecionados.
      </p>
      {onAction && (
        <Button onClick={onAction} className="bg-brand text-white">
          Adicionar Novo
        </Button>
      )}
    </div>
  );
}
```

### 2.3 Estado de Erro (Error State)
- **Regra:** Falhas de rede ou no servidor devem ser comunicadas de forma elegante, permitindo recuperação sem que o usuário precise recarregar a página inteira.
- **Implementação:** Exiba um banner de alerta com botão "Tentar Novamente".

### 2.4 Estado de Dados (Data Render)
- Renderize a tabela com cabeçalhos fixos ou rolagem horizontal suave em dispositivos móveis (`overflow-x-auto`).

---

## 3. Diretrizes de Responsividade e Ergonomia Mobile

- Em telas menores que `768px` (mobile), tabelas com mais de 4 ou 5 colunas devem adotar:
  1. Rolagem horizontal contida com indicador visual de scroll; ou
  2. Transformação em formato de cartões empilhados (Card Stack), onde cada linha da tabela vira um card individual legível.
- Alvos de ação nas linhas (botões de edição, exclusão ou visualização) devem respeitar a área de toque mínima de **40x40px**.
