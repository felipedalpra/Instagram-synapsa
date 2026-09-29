const QUERY_RULES=[
  [/agenda|lembrete|falta|cancel|consulta/, 'therapist office calendar desk'],
  [/\bia\b|lyra|inteligencia/, 'psychologist technology workspace'],
  [/burnout|tempo|tarefa|rotina/, 'therapist desk overwhelmed paperwork'],
  [/google|seo|perfil|divulgacao/, 'small business local search office'],
  [/preco|precifica|pagamento|financeiro/, 'professional office finance planning'],
  [/terapia online|online/, 'online therapy home office'],
  [/prontuario|tratamento|sessao|paciente/, 'therapy office notebook professional'],
  [/gestao|planilha/, 'organized modern office desk']
];

const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

export function pexelsQuery(theme){
  const normalized=normalize(theme);
  return QUERY_RULES.find(([pattern])=>pattern.test(normalized))?.[1]||'psychologist office calm workspace';
}

export async function discoverPexels(theme,{limit=6,apiKey=process.env.PEXELS_API_KEY,fetchImpl=fetch}={}){
  if(!apiKey) return [];
  const query=pexelsQuery(theme);
  const url=new URL('https://api.pexels.com/v1/search');
  url.searchParams.set('query',query);
  url.searchParams.set('orientation','portrait');
  url.searchParams.set('size','large');
  url.searchParams.set('per_page',String(Math.min(limit,20)));
  try{
    const response=await fetchImpl(url,{headers:{Authorization:apiKey}});
    if(!response.ok){
      console.warn(`Pexels indisponível (${response.status}); geração seguirá sem banco público.`);
      return [];
    }
    const data=await response.json();
    return (data.photos||[]).slice(0,limit).map(photo=>({
      id:`pexels-${photo.id}`,
      url:photo.src?.portrait||photo.src?.large2x||photo.src?.large,
      arquivo:`Pexels · ${photo.photographer}`,
      tipo:'pexels',
      score:14,
      descricao:photo.alt||query,
      fotografo:photo.photographer,
      pagina:photo.url,
      licenca:'Pexels License'
    })).filter(asset=>asset.url);
  }catch(error){
    console.warn(`Pexels indisponível (${error.message}); geração seguirá sem banco público.`);
    return [];
  }
}
