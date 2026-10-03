const news = path => `https://www.anthropic.com/news/${path}`;
const model = (id, name, date, description, source, options = {}) => ({id,name,date,description,source,thinking:false,cache:false,context:null,...options});
export const MODELS = [
  model('claude-1','Claude','2023-03-14','Le origini: conversazione, scrittura e prime capacità di programmazione.',news('introducing-claude')),
  model('instant','Claude Instant','2023-03-14','La prima alternativa più veloce e leggera della famiglia Claude.',news('introducing-claude')),
  model('claude-1-3','Claude 1.3','2023-05','Un Claude delle origini con una finestra di contesto estesa a 100.000 token.',news('100k-context-windows'),{context:'100K'}),
  model('claude-2','Claude 2','2023-07-11','Migliora codice, matematica e risposte lunghe; nasce la beta pubblica di claude.ai.',news('claude-2'),{context:'100K'}),
  model('instant-1-2','Claude Instant 1.2','2023-08-09','Il ramo veloce migliora nel ragionamento, nel codice e nella lettura dei documenti.',news('releasing-claude-instant-1-2')),
  model('claude-2-1','Claude 2.1','2023-11-21','Contesto da 200K token e primi strumenti in beta per lavorare con informazioni esterne.',news('claude-2-1'),{context:'200K'}),
  model('sonnet-3','Claude 3 Sonnet','2024-03-04','Arriva la famiglia multimodale: un equilibrio tra velocità e capacità.',news('claude-3-family'),{context:'200K'}),
  model('opus-3','Claude 3 Opus','2024-03-04','Il modello di punta della terza generazione, per analisi e compiti complessi.',news('claude-3-family'),{context:'200K'}),
  model('haiku-3','Claude 3 Haiku','2024-03-13','Il piccolo e veloce della famiglia 3, pensato per risposte rapide.',news('claude-3-haiku'),{context:'200K'}),
  model('sonnet-3-5','Claude 3.5 Sonnet','2024-06-20','Un salto nella programmazione e nella comprensione delle immagini. Arrivano gli Artifacts.',news('claude-3-5-sonnet'),{context:'200K',cache:true}),
  model('sonnet-3-5-v2','Claude 3.5 Sonnet · aggiornato','2024-10-22','La seconda versione di Sonnet 3.5 introduce computer use in beta.',news('3-5-models-and-computer-use'),{context:'200K',cache:true}),
  model('haiku-3-5','Claude 3.5 Haiku','2024-11-04','Il ramo rapido si aggiorna, con più capacità di codice e uso degli strumenti.',news('3-5-models-and-computer-use'),{context:'200K',cache:true}),
  model('sonnet-3-7','Claude 3.7 Sonnet','2025-02-24','Il primo Claude con ragionamento ibrido: risposte dirette oppure ragionamento esteso. Nasce Claude Code.',news('claude-3-7-sonnet'),{context:'200K',thinking:true,cache:true}),
  model('sonnet-4','Claude Sonnet 4','2025-05-22','La quarta generazione potenzia programmazione, ragionamento e lavoro con strumenti.',news('claude-4'),{context:'200K',thinking:true,cache:true}),
  model('opus-4','Claude Opus 4','2025-05-22','Pensato per problemi difficili e sessioni di programmazione più lunghe.',news('claude-4'),{context:'200K',thinking:true,cache:true}),
  model('opus-4-1','Claude Opus 4.1','2025-08-05','Una revisione di Opus 4 che migliora codice, ragionamento e attività agentiche.',news('claude-opus-4-1'),{context:'200K',thinking:true,cache:true}),
  model('sonnet-4-5','Claude Sonnet 4.5','2025-09-29','Più autonomia nei progetti di codice e nei compiti di lunga durata.',news('claude-sonnet-4-5'),{thinking:true,cache:true}),
  model('haiku-4-5','Claude Haiku 4.5','2025-10-15','Un modello veloce della generazione 4.5, anche con ragionamento esteso.',news('claude-haiku-4-5'),{context:'200K',thinking:true,cache:true}),
  model('opus-4-5','Claude Opus 4.5','2025-11-24','Miglioramenti per codice, agenti e uso del computer; introduce il controllo dell’impegno.',news('claude-opus-4-5'),{thinking:true,cache:true}),
  model('opus-4-6','Claude Opus 4.6','2026-02-05','Più capacità di pianificazione e di lavoro su grandi progetti.',news('claude-opus-4-6'),{thinking:true,cache:true}),
  model('sonnet-4-6','Claude Sonnet 4.6','2026-02-17','Migliora codice, uso del computer e ragionamento su contesti lunghi; contesto 1M in beta al lancio.',news('claude-sonnet-4-6'),{context:'1M · beta al lancio',thinking:true,cache:true}),
  model('mythos-preview','Claude Mythos Preview','2026-04-07','Un’anteprima con accesso ristretto, usata dai partner di Project Glasswing.','https://www.anthropic.com/project/glasswing',{thinking:true,cache:true,restricted:true}),
  model('opus-4-7','Claude Opus 4.7','2026-04-16','Un nuovo passo nelle capacità di programmazione e nel lavoro agentico.',news('claude-opus-4-7'),{thinking:true,cache:true}),
  model('opus-4-8','Claude Opus 4.8','2026-05-28','Migliora la collaborazione e la verifica del codice; include impegno extra e massimo.',news('claude-opus-4-8'),{thinking:true,cache:true}),
  model('fable-5','Claude Fable 5','2026-06-09','La nuova classe di capacità avanzate per codice e lavoro complesso.',news('claude-fable-5-mythos-5'),{thinking:true,cache:true}),
  model('mythos-5','Claude Mythos 5','2026-06-09','La variante con accesso riservato a programmi e organizzazioni autorizzate.',news('claude-fable-5-mythos-5'),{thinking:true,cache:true,restricted:true}),
  model('sonnet-5','Claude Sonnet 5','2026-06-30','Un nuovo Sonnet per il lavoro quotidiano con agenti e strumenti.',news('claude-sonnet-5'),{thinking:true,cache:true}),
  model('opus-5','Claude Opus 5','2026-07-24','Il ramo Opus avvicina le capacità di Fable 5 con un costo inferiore.', 'https://www.anthropic.com/claude-opus-5',{thinking:true,cache:true}),
  model('fable-5-1','Claude Fable 5.1','2026-09-01','Il traguardo dell’isola: codice, ricerca e problemi complessi. Il costo delle letture dalla cache si riduce.', 'https://www.anthropic.com/claude-fable-and-mythos-5-1',{thinking:true,cache:true,goal:true}),
  model('mythos-5-1','Claude Mythos 5.1','2026-09-01','Lo stesso modello di base di Fable 5.1 con salvaguardie e accesso differenti, tramite programmi autorizzati.', 'https://www.anthropic.com/claude-fable-and-mythos-5-1',{thinking:true,cache:true,restricted:true}),
  model('opus-5-5','Claude Opus 5.5','2026-09-22','La prima release della famiglia 5.5, per codice e lavoro agentico di lunga durata.', 'https://www.anthropic.com/claude-opus-5-5',{thinking:true,cache:true,current:true}),
  model('sonnet-5-5','Claude Sonnet 5.5','2026-09-28','Il complemento più rapido di Opus 5.5, per i compiti quotidiani della famiglia 5.5.', 'https://www.anthropic.com/claude-sonnet-5-5',{thinking:true,cache:true,current:true})
];
// Current 5.5 releases remain inspectable at mastery. Fable 5.1 is the user-requested game goal.
export const JOURNEY = MODELS.filter(m => !m.restricted && !m.current && !m.goal).concat(MODELS.find(m=>m.goal));
export const threshold = level => 300 + level * 90;
export const levelForXP = xp => {
  let level=0, remaining=xp;
  while(level<JOURNEY.length-1 && remaining>=threshold(level)){remaining-=threshold(level);level++;}
  return {level,remaining,needed:threshold(level),mastered:level===JOURNEY.length-1};
};
export const unlockLevel = entry => {
  const index=JOURNEY.findIndex(m=>m.id===entry.id);
  if(index>=0) return index;
  if(entry.current) return JOURNEY.length-1;
  return -1;
};
export const dateLabel = date => new Date(date.length===7?`${date}-01T12:00:00`:`${date}T12:00:00`).toLocaleDateString('it-IT',{...(date.length===7?{}:{day:'numeric'}),month:'long',year:'numeric'});
