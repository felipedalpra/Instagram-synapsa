# Handoff: Carrosséis automáticos da Synapsa (Instagram)

## O que é
Um pipeline semanal que **cria, renderiza, envia para aprovação e publica** carrosséis de Instagram da Synapsa.
Cada carrossel tem um **visual diferente**. O que se mantém fixo é só o branding (cores, fontes, logo e tom de voz), descrito em `BRAND.md`.

Quem implementa: um dev ou o Claude Code. Este README basta sozinho.

## Como funciona (toda semana)
```
segunda 08:00 (cron)
  1. plan      → escolhe 3 temas + 3 direções de arte que não foram usados recentemente
  2. generate  → o Claude Code (assinatura) escreve o conteúdo E o HTML de cada carrossel (visual novo a cada vez)
  3. render    → o Playwright tira um PNG 1080×1350 de cada slide
  4. lint      → confere tamanho mínimo de texto, se algo vazou da área, contraste, logo, fonte dos dados → se falhar, pede ao Claude para corrigir (até 2x)
  5. review    → abre um Pull Request com as prévias + legenda  ← o Felipe aprova ou pede ajuste
merge do PR
  6. publish   → em cada data agendada: sobe as imagens e publica pela Instagram Graph API
```
**Nada vai ao ar sem aprovação humana.** Dados com fonte e as regras do CFP precisam de revisão.

## Estrutura
```
BRAND.md                  regras de marca: fixas e inegociáveis
DIRECOES.md               eixos de variação visual (o que muda a cada carrossel)
CLAUDE.md                 instruções para o Claude Code que for manter o repo
prompts/carrossel.md      prompt de sistema da geração
config/temas.json         banco de temas
config/agenda.json        quantos posts por semana e em que dias/horários
state/historico.json      temas e direções já usados (evita repetição)
assets/synapsa-logo.png   logo com fundo transparente (para fundos claros)
assets/synapsa-logo-escuro.png  logo para fundos escuros
referencia/               carrossel "O que é SEO" (PNGs): o padrão de QUALIDADE a seguir, não de layout
src/*.mjs                 plan, generate, render, lint, publish
.github/workflows/        agendamento
```

## Setup
1. `npm i playwright && npx playwright install chromium && npm i -g @anthropic-ai/claude-code`
2. Secrets / .env:
   - **IA pela assinatura Claude Pro/Max (sem API paga):** rode `claude setup-token` uma vez e salve o token como secret `CLAUDE_CODE_OAUTH_TOKEN`. Localmente, basta estar logado no `claude`.
   - `CLAUDE_MODEL` (opcional; senão usa o padrão do Claude Code)
   - O consumo sai do limite da assinatura: ~3 carrosséis/semana com até 2 correções cada cabe folgado no Pro.
   - `IG_USER_ID`, `IG_ACCESS_TOKEN`: conta Instagram **Business/Creator** ligada a uma Página do Facebook, app Meta com as permissões `instagram_basic`, `instagram_content_publish` e `pages_read_engagement`. Use um token de longa duração e renove a cada ~60 dias.
   - `PUBLIC_BASE_URL`: a Graph API só aceita **URL pública** de imagem. Sirva `output/` via GitHub Pages, Vercel, S3 ou Cloudinary.
3. Rodar localmente: `node src/run-week.mjs` → gera `output/AAAA-MM-DD/<slug>/`.

## Aprovação
- O PR mostra os PNGs e o `legenda.txt` de cada carrossel.
- Para aprovar, clique **Approve** na revisão do PR (aba "Files changed" → "Review changes"). O workflow `aprovar-pr.yml` marca automaticamente todo item pendente como `status: "aprovado"` e faz o merge — sem precisar rodar nada manual. Item com `status: "erro-lint"` não é auto-aprovado (falhou a checagem de qualidade 2x).
- Para pedir ajuste, comente no PR `/refazer <slug> <o que mudar>`. O workflow roda de novo o generate daquele item com o comentário como feedback.
- Depois do merge (automático ao aprovar), o `publish` roda de hora em hora e publica os itens com `status: "aprovado"` cuja `data` já passou.

## Por que o visual varia sem sair da marca
O Claude **não** preenche um template. Ele recebe:
- `BRAND.md`: o que nunca muda;
- uma **direção de arte sorteada** (`DIRECOES.md`), com layout-herói, metáfora visual, ritmo claro/escuro e escala tipográfica;
- o histórico das últimas 6 semanas, para não repetir combinação nem metáfora.

Ele escreve um HTML próprio para cada carrossel. O lint garante o piso de qualidade.

## Limitações conhecidas
- A API de publicação do Instagram tem limite de ~50 posts/24h e não tem agendamento nativo. Por isso o agendamento é o cron do `publish`.
- Carrossel: de 2 a 10 imagens, JPEG recomendado. O render exporta JPEG com qualidade 92.
- Fontes: carregadas do Google Fonts no render. Em CI, espere o `document.fonts.ready`.
# Instagram-synapsa
