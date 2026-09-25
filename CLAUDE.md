# Repo: carrosséis automáticos Synapsa
- Leia BRAND.md antes de mexer em prompts ou no lint. As regras de marca são inegociáveis.
- Não troque a variação visual por template fixo: o objetivo é cada carrossel ser visualmente diferente.
- Nunca publique sem `status: "aprovado"` no meta.json. **Atenção:** desde 2026-09-24, `run-week.mjs` seta `"aprovado"` sozinho quando passa no lint — não há mais revisão humana no meio (decisão explícita do Felipe, ciente do risco pra dados sem fonte / regras do CFP). Se reintroduzir uma trava manual, essa é a linha a mudar.
- Ao adicionar uma direção de arte, atualize DIRECOES.md e config (plan.mjs lê os eixos de lá).
- Números em slides: exija `fontes[]` no JSON de saída; o lint recusa número sem fonte.
