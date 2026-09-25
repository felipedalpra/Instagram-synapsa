# Repo: carrosséis automáticos Synapsa
- Leia BRAND.md antes de mexer em prompts ou no lint. As regras de marca são inegociáveis.
- Não troque a variação visual por template fixo: o objetivo é cada carrossel ser visualmente diferente.
- Nunca publique sem `status: "aprovado"` no meta.json. Desde 2026-09-24, a aprovação acontece por um botão em email (Resend + Cloudflare Worker em `worker/`), não mais por PR/GitHub — `run-week.mjs` gera com `status: "pendente"`, `notificar.mjs` manda o email, e só o clique no botão (via Worker) muda pra `"aprovado"`.
- Ao adicionar uma direção de arte, atualize DIRECOES.md e config (plan.mjs lê os eixos de lá).
- Números em slides: exija `fontes[]` no JSON de saída; o lint recusa número sem fonte.
