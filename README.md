# Handoff: Carrosséis automáticos da Synapsa (Instagram)

## O que é
Um pipeline semanal que **cria, renderiza, envia para aprovação por email e publica** carrosséis de Instagram da Synapsa.
Cada carrossel tem um **visual diferente**. O que se mantém fixo é só o branding (cores, fontes, logo e tom de voz), descrito em `BRAND.md`.

Quem implementa: um dev ou o Claude Code. Este README basta sozinho.

## Como funciona (toda semana)
```
segunda 08:00 (cron)
  1. plan      → escolhe 3 temas + 3 direções de arte que não foram usados recentemente
  2. assets    → encontra prints e materiais reais da Synapsa relevantes para o tema
                e, quando fizer sentido, fotos contextuais licenciadas do Pexels
  3. brief     → cria primeiro a estratégia editorial, a narrativa e a seleção de assets
  4. generate  → transforma o briefing em conteúdo e composição visual autoral
  5. render    → o Playwright gera JPEG 1080×1350 e uma folha de contato
  6. lint      → confere texto, margens, contraste, imagens, logo, repetição de layout e uso de assets → se falhar, pede correção (até 2x)
  7. commit    → sobe pra main com status "pendente" (item que falhar o lint 2x fica "erro-lint" e não notifica nem publica)
  8. notificar → manda 1 email (via Resend) por carrossel pendente, com as imagens + botão "Aprovar e publicar"
                 clique no botão → bate num Cloudflare Worker → marca "aprovado" no meta.json direto no GitHub
  9. publish   → de hora em hora: publica pela Instagram Graph API os itens "aprovado" cuja data agendada já chegou
```
**A única ação humana é clicar no botão do email.** Sem terminal, sem GitHub, sem rodar script. Itens com `status: "erro-lint"` (falharam a checagem de qualidade 2x) não geram email e nunca publicam sozinhos.

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
assets/library/           mídia curada que também fica disponível no CI (opcional)
referencia/               carrossel "O que é SEO" (PNGs): o padrão de QUALIDADE a seguir, não de layout
src/*.mjs                 plan, generate, render, notificar, publish
worker/                   Cloudflare Worker que recebe o clique de "Aprovar" do email
.github/workflows/        agendamento
```

## Setup
1. `npm i playwright && npx playwright install chromium && npm i -g @anthropic-ai/claude-code`
2. Secrets / .env:
   - **IA pela assinatura Claude Pro/Max (sem API paga):** rode `claude setup-token` uma vez e salve o token como secret `CLAUDE_CODE_OAUTH_TOKEN`. Localmente, basta estar logado no `claude`.
   - `CLAUDE_MODEL` (opcional; senão usa o padrão do Claude Code)
   - `PEXELS_API_KEY` (opcional): habilita busca de fotos públicas licenciadas. Sem a chave, a geração continua só com assets Synapsa e CSS.
   - O consumo sai do limite da assinatura: ~3 carrosséis/semana com até 2 correções cada cabe folgado no Pro.
   - `IG_USER_ID`, `IG_ACCESS_TOKEN`: conta Instagram **Business/Creator** ligada a uma Página do Facebook, app Meta com as permissões `instagram_basic`, `instagram_content_publish` e `pages_read_engagement`. Use um token de longa duração e renove a cada ~60 dias.
   - `PUBLIC_BASE_URL`: a Graph API só aceita **URL pública** de imagem. Sirva `output/` via GitHub Pages, Vercel, S3 ou Cloudinary.
   - `RESEND_API_KEY` (secret): chave da conta Resend usada pra mandar o email de aprovação.
   - `RESEND_FROM` (variável): remetente, ex. `Synapsa Carrosséis <onboarding@resend.dev>` (ou um domínio verificado no Resend).
   - `APROVAR_PARA` (variável): email de quem aprova.
   - `APPROVAL_SECRET` (secret): segredo compartilhado entre `notificar.mjs` (assina o link) e o Worker (confere a assinatura) — mesmo valor nos dois lados.
   - `APPROVAL_WORKER_URL` (variável): URL pública do Worker (ex. `https://synapsa-aprovar.<subdomínio>.workers.dev`).
3. Rodar localmente: `node src/run-week.mjs` → gera `output/AAAA-MM-DD/<slug>/` com status `"pendente"`.

### Biblioteca real da Synapsa

Localmente, a automação detecta a raiz da Synapsa dois níveis acima deste repositório. Para usar outra pasta, defina `SYNAPSA_MEDIA_ROOT`.

Coleções lidas automaticamente: `_previews_tmp`, `Prints uso video`, `Prints plat psi`, `Prints plat paci`, criativos de Marketing e `assets/library`. Pastas pessoais, WhatsApp, equipe e eventos ficam fora por segurança.

Para conferir o que será oferecido à IA para um tema:

```bash
npm run assets -- "Lembretes automáticos de consulta"
```

O GitHub Actions não enxerga arquivos que existem somente no computador. Assets que precisem ser usados no agendamento em nuvem devem ser revisados, anonimizados e adicionados a `assets/library/`.

### Fotos públicas do Pexels

Quando `PEXELS_API_KEY` está configurada, a automação busca até 5 opções verticais relacionadas ao tema. O briefing decide entre quatro modos: `synapsa`, `pexels`, `grafico` ou `hibrido`. Portanto, uma foto só é usada quando melhora a narrativa; telas reais continuam prioritárias em conteúdos de produto.

O arquivo selecionado é incorporado ao HTML durante a renderização. O nome do fotógrafo, a licença e a página original ficam no `meta.json`, e o crédito é acrescentado automaticamente à legenda.

Para habilitar no GitHub Actions:

```bash
gh secret set PEXELS_API_KEY
```

## O Worker de aprovação (`worker/`)
Um Cloudflare Worker sem framework, um arquivo só (`worker/index.js`). Recebe `GET /aprovar?item=<pasta>&sig=<hmac>`, confere a assinatura com `APPROVAL_SECRET`, e usa a API do GitHub (`GITHUB_TOKEN`, um PAT com permissão de escrita só neste repo) pra marcar `status: "aprovado"` no `meta.json` correspondente.

Deploy:
```bash
cd worker
npx wrangler deploy
npx wrangler secret put APPROVAL_SECRET   # mesmo valor do secret do GitHub Actions
npx wrangler secret put GITHUB_TOKEN      # PAT (Contents: Read/Write) só deste repo
```

## Ajustar ou barrar um post manualmente
- Pra impedir a publicação de um item específico antes da data agendada: edite `output/.../meta.json` e mude `"status"` pra qualquer coisa diferente de `"aprovado"` (ex.: `"pausado"`), commit direto na `main`.
- `node src/aprovar.mjs <pasta>` continua disponível pra aprovar manualmente um item, sem passar pelo email.

## Por que o visual varia sem sair da marca
O Claude **não** preenche um template. Ele recebe:
- `BRAND.md`: o que nunca muda;
- um briefing editorial criado antes do layout, com família, objetivo, narrativa e assets reais;
- uma direção de arte (`DIRECOES.md`) usada como repertório e adaptada ao tema;
- o histórico das últimas 6 semanas, para não repetir combinação nem metáfora.

Ele escreve um HTML próprio para cada carrossel. O lint garante o piso de qualidade e rejeita composições consecutivas idênticas. Uma folha `contato.jpg` permite avaliar todos os slides no email.

## Limitações conhecidas
- A API de publicação do Instagram tem limite de ~50 posts/24h e não tem agendamento nativo. Por isso o agendamento é o cron do `publish`.
- Carrossel: de 2 a 10 imagens, JPEG recomendado. O render exporta JPEG com qualidade 92.
- Fontes: carregadas do Google Fonts no render. Em CI, espere o `document.fonts.ready`.
# Instagram-synapsa
