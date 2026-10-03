import { IslandWorld } from './scene.js';
import { MODELS, JOURNEY, threshold, levelForXP, unlockLevel, dateLabel } from './models.js';

const $=id=>document.getElementById(id);
const ICONS={
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  rain:'<path d="M7 14a4 4 0 1 1 0-8 6 6 0 0 1 11 2 3 3 0 1 1 0 6M8 17l-1 3m5-3-1 3m5-3-1 3"/>',
  storm:'<path d="M5 14a4 4 0 0 1 2-8 6 6 0 0 1 11 2 3 3 0 0 1 1 6M13 11l-4 6h5l-3 5"/>',
  brain:'<path d="M12 5a3 3 0 0 0-5-2 3 3 0 0 0-3 4 4 4 0 0 0-1 7 4 4 0 0 0 4 6 3 3 0 0 0 5-2V5Zm0 0a3 3 0 0 1 5-2 3 3 0 0 1 3 4 4 4 0 0 1 1 7 4 4 0 0 1-4 6 3 3 0 0 1-5-2"/><path d="M7 8h2m6 0h2M6 14h3m6 0h3"/>',
  code:'<path d="m8 6-6 6 6 6m8-12 6 6-6 6M14 4l-4 16"/>',
  spark:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/>',
  layers:'<path d="m12 3 10 5-10 5L2 8l10-5Zm-10 9 10 5 10-5M2 16l10 5 10-5"/>',
  close:'<path d="m6 6 12 12M6 18 18 6"/>',
  pause:'<path d="M8 5v14m8-14v14"/>',play:'<path d="m8 4 12 8-12 8V4Z"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',minus:'<path d="M5 12h14"/>',
  camera:'<path d="M8 5 6 8H3v12h18V8h-3l-2-3H8Z"/><circle cx="12" cy="13" r="3"/>',
  target:'<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 1v4m0 14v4M1 12h4m14 0h4"/>',
  'volume-off':'<path d="M11 5 6 9H3v6h3l5 4V5Zm5 4 5 6m-5 0 5-6"/>',
  volume:'<path d="M11 5 6 9H3v6h3l5 4V5Zm5 3a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 8.5a2.5 2.5 0 1 1 4 2c-1 .6-1.5 1-1.5 2.5M12 17h.01"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  footsteps:'<path d="M9 3a2 2 0 0 1 2 2v5a2 2 0 0 1-4 0V5a2 2 0 0 1 2-2ZM15 8a2 2 0 0 1 2 2v5a2 2 0 0 1-4 0v-5a2 2 0 0 1 2-2ZM7 15h4v4H7zm6 5h4v2h-4z"/>',
  coffee:'<path d="M4 8h12v7a5 5 0 0 1-10 0V8Zm12 1h2a3 3 0 0 1 0 6h-2M4 22h14M7 2v3m4-3v3"/>',
  book:'<path d="M12 5C8 2 4 3 2 4v15c4-2 7-1 10 1 3-2 6-3 10-1V4c-4-2-7-1-10 1Zm0 0v15"/>',
  home:'<path d="m3 10 9-8 9 8v11H3V10Zm6 11v-7h6v7"/>',
  moon:'<path d="M20 15A8 8 0 0 1 9 4a9 9 0 1 0 11 11Z"/>',
  shop:'<path d="M3 9h18l-2-6H5L3 9Zm1 0v12h16V9M9 21v-8h6v8"/>',
  boat:'<path d="M12 2v12M12 3l7 9h-7M12 4 5 12h7M3 15h18l-3 5H6l-3-5ZM2 22l3-1 3 1 4-1 4 1 3-1 3 1"/>'
};
function icon(name){return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]||ICONS.spark}</svg>`;}
function setIcon(element,name){if(element.dataset.currentIcon===name)return;element.dataset.currentIcon=name;element.innerHTML=icon(name);}
document.querySelectorAll('[data-icon]').forEach(el=>el.insertAdjacentHTML('afterbegin',icon(el.dataset.icon)));

const STORAGE_KEY='claude-island-v1';
let storageAvailable=true;
const initial={version:1,xp:0,input:0,output:0,thinking:0,cache:0,seconds:0,speed:1,paused:false,weather:'auto',effort:'auto',selected:null,savedAt:Date.now()};
function readSave(){
  try{const raw=localStorage.getItem(STORAGE_KEY);if(!raw)return {...initial};const s=JSON.parse(raw);if(s.version!==1)return {...initial};const safe={...initial};if(s.construction&&typeof s.construction==='object')safe.construction=s.construction;for(const key of ['xp','input','output','thinking','cache','seconds'])if(Number.isFinite(s[key])&&s[key]>=0)safe[key]=Math.min(s[key],1e12);if([1,5,20].includes(s.speed))safe.speed=s.speed;safe.paused=s.paused===true;if(['auto','sun','rain','storm'].includes(s.weather))safe.weather=s.weather;if(['auto','low','medium','high','max'].includes(s.effort))safe.effort=s.effort;safe.selected=MODELS.some(m=>m.id===s.selected)?s.selected:null;if(Number.isFinite(s.savedAt))safe.savedAt=s.savedAt;return safe;}catch{storageAvailable=false;return {...initial};}
}
const state=readSave();let offlineSeconds=Math.min(8*3600,Math.max(0,(Date.now()-state.savedAt)/1000));if(state.paused)offlineSeconds=0;
if(offlineSeconds>30){state.xp+=offlineSeconds*1.9;state.seconds+=offlineSeconds;state.input+=offlineSeconds*34;state.output+=offlineSeconds*24;const old=JOURNEY[levelForXP(state.xp).level];if(old.thinking)state.thinking+=offlineSeconds*14;if(old.cache)state.cache+=offlineSeconds*22;}
let world,lastLevel=-1,activeModel,filter='all',speechUntil=0,toastUntil=0,lastActivity='',lastSave=0,lastUI=0,lastScreen=0,lastJournalTime=0;
const log=[];
const activityInfo={
  code:['code','Programme au PC','Un monde, une fonction à la fois.'],
  walk:['footsteps','Esplora il villaggio','Ogni sentiero ha una piccola idea.'],
  think:['brain','Si prende tempo per pensare','Le onde aiutano a mettere ordine.'],
  read:['book','Sfoglia un nuovo libro','Un po’ di contesto non fa mai male.'],
  shop:['shop','Visita l’emporio','Un quaderno nuovo, tante possibilità.'],
  coffee:['coffee','Una pausa al caffè','Anche le idee hanno bisogno di pause.'],
  sleep:['moon','Riposa nella sua casetta','Domani ci saranno nuove idee.'],
  rest:['sun','Si gode l’isola','Lascia spazio alle cose semplici.'],
  build:['home','Costruisce un nuovo edificio','Un’idea diventa un luogo da abitare.'],
  expand:['home','Amplia l’isola con le sue mani','Più terra per ospitare nuove idee.'],
  skate:['spark','Skate, ollie e piccoli trick','Una tavola, quattro ruote e un po’ di coraggio.'],
  wizard:['spark','Sperimenta piccole magie','Ogni incantesimo comincia con un’idea.'],
  nerd:['code','Si perde in un progetto nerd','Occhialoni, portatile e massima curiosità.'],
  swim:['boat','Nuota tra le onde','Un tuffo per rinfrescare le idee.'],
  celebrate:['spark','Una nuova evoluzione!','L’isola cresce insieme a lui.']
};
activityInfo.code=['code','Programma al PC','Un mondo, una funzione alla volta.'];
const lines=[
  'const island = new World();\n\nisland.plant("a little idea");\nisland.grow({ patience: true });\n\n// una cosa bella, alla volta\nawait island.nextSunrise();',
  'function sayHello(neighbor) {\n  return `Ciao, ${neighbor}!`;\n}\n\nfor (const clawd of village) {\n  sayHello(clawd.name);\n}',
  'const waves = ocean.listen();\nconst idea = await think(waves);\n\nif (idea.isWorthTrying) {\n  await build(idea);\n}\n// ci siamo quasi...',
  'async function makeTomorrow() {\n  const bug = await findBug();\n  await fix(bug);\n  await verify();\n  return "Un po’ meglio di ieri";\n}'
];
function toast(message,duration=5000){$('toast').textContent=message;$('toast').hidden=false;toastUntil=performance.now()+duration;}
function speak(message,duration=5000){$('speech-text').textContent=message;$('speech').hidden=false;speechUntil=performance.now()+duration;}
function addLog(message,iconName='spark'){log.unshift({message,iconName,time:state.seconds});if(log.length>4)log.pop();$('journal').innerHTML=log.map(e=>`<div class="journal-entry">${icon(e.iconName)}<div>${e.message}<small>${formatTime(e.time)}</small></div></div>`).join('');}
function formatTime(seconds){const minutes=Math.floor((seconds+540)%1440);return `${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;}
function formatToken(value){return new Intl.NumberFormat('it-IT',{notation:value>=1000000?'compact':'standard',maximumFractionDigits:value>=1000000?1:0}).format(Math.floor(value));}
function currentModel(){const level=levelForXP(state.xp).level;const selected=MODELS.find(m=>m.id===state.selected);if(selected&&!selected.restricted&&unlockLevel(selected)<=level)return selected;return JOURNEY[level];}
function save(){if(world)state.construction={...world.construction,built:[...world.construction.built],pendingCost:world.buildJob?.cost||0};state.savedAt=Date.now();try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));storageAvailable=true;$('save-status').innerHTML=icon('check')+'Progressi salvati qui';}catch{storageAvailable=false;$('save-status').textContent='Salvataggio non disponibile';}lastSave=performance.now();}
function updateGrowth(){const progress=levelForXP(state.xp);activeModel=currentModel();if(progress.mastered&&state.effort==='auto')state.effort='max';if(world&&progress.level!==lastLevel){world.growth(progress.level,JOURNEY);if(lastLevel>=0){toast(`Evoluzione! ${JOURNEY[progress.level].name} · L’isola si allarga.`);speak(progress.mastered?'Fable 5.1. Una grande isola di piccole idee.':'Sono cresciuto! E c’è spazio per nuovi amici.',6500);addLog(`Si sblocca ${JOURNEY[progress.level].name}.`);if(progress.level===JOURNEY.length-1)state.effort='max';}lastLevel=progress.level;if($('archive').open)renderArchive();}return progress;}
function updateUI(){
  const p=updateGrowth();$('model-name').textContent=activeModel.name.replace('Claude 3.5 Sonnet · aggiornato','Sonnet 3.5 · v2');$('model-era').textContent=`${dateLabel(activeModel.date)} · ${activeModel.goal?'Maestria':activeModel.current?'Famiglia 5.5':p.level<6?'Le origini':'In evoluzione'}`;$('level').textContent=String(p.level+1).padStart(2,'0');
  const percent=p.mastered?100:Math.min(100,p.remaining/p.needed*100);$('xp-fill').style.width=`${percent}%`;$('xp-progress').setAttribute('aria-valuenow',Math.round(percent));$('xp-text').textContent=p.mastered?'MAX':`${Math.floor(p.remaining)} / ${p.needed} XP`;
  $('materials').textContent=`${Math.floor(world.construction.materials)} materiali · ${world.construction.built.length}/8 edifici AI · ${world.construction.expansions}/10 ampliamenti`;$('construct').disabled=!!world.buildJob||!world.canBuild()||world.construction.materials<60;$('expand-island').disabled=!!world.buildJob||world.construction.expansions>=10||world.construction.materials<80;
  $('mood').textContent=`Energia ${Math.round(world.needs.energy)} · Curiosità ${Math.round(world.needs.curiosity)} · Gioco ${Math.round(world.needs.fun)}`;const a=activityInfo[world.activity]||activityInfo.rest;$('activity-name').textContent=state.paused?'Il tempo è in pausa':a[1];$('activity-detail').textContent=state.paused?'Riprendi quando vuoi.':world.manual?'Stai guidando Claude sull’isola.':a[2];setIcon($('activity-icon'),a[0]);$('thinking-label').textContent=activeModel.thinking?(p.mastered&&state.effort==='max'?'Ragionamento · massimo':'Ragionamento esteso'):'Ragionamento diretto';$('effort').disabled=!activeModel.thinking;$('effort').value=activeModel.thinking?state.effort:'auto';$('effort-unlock').textContent=activeModel.thinking?'Disponibile':`da Claude 3.7 · livello ${JOURNEY.findIndex(m=>m.thinking)+1}`;
  const total=state.input+state.output+state.thinking+state.cache;$('token-total').innerHTML=`${formatToken(total)}<span>tok</span>`;$('token-input').textContent=formatToken(state.input);$('token-output').textContent=formatToken(state.output);$('token-thinking').textContent=state.thinking?formatToken(state.thinking):'—';$('token-cache').textContent=state.cache?formatToken(state.cache):'—';
  $('day').textContent=`Giorno ${1+Math.floor((state.seconds+540)/1440)}`;$('clock').textContent=formatTime(state.seconds);$('sim-status').textContent=state.paused?'In pausa':'La vita scorre';document.querySelector('.world-clock').classList.toggle('paused',state.paused);setIcon($('pause'),state.paused?'play':'pause');$('pause').setAttribute('aria-label',state.paused?'Riprendi la simulazione':'Metti in pausa');$('pause').setAttribute('aria-pressed',String(state.paused));
  document.querySelectorAll('[data-speed]').forEach(b=>{const selected=Number(b.dataset.speed)===state.speed;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected));});
  const journeyPercent=p.level/(JOURNEY.length-1)*100;$('journey-fill').style.width=`${journeyPercent}%`;$('timeline-origin').textContent=`${activeModel.date.slice(0,4)} · ${activeModel.goal?'Maestria':activeModel.name.replace('Claude ','')}`;document.querySelectorAll('.timeline-track>span').forEach((s,i)=>s.classList.toggle('unlocked',journeyPercent>=i/6*100));
  const hour=((state.seconds+540)%1440)/60;let weather=state.weather;if(weather==='auto'){const cycle=Math.floor(state.seconds/360);weather=['sun','sun','rain','sun','storm','sun'][cycle%6];}if(world.weather!==weather)world.setWeather(weather);
  const wn={sun:['sun','Sereno','Una buona giornata per creare.',24],rain:['rain','Pioggia','Il profumo della terra e nuove idee.',19],storm:['storm','Temporale','Un buon momento per tornare al PC.',17]}[weather];setIcon($('weather-icon'),wn[0]);$('weather-name').textContent=wn[1];$('weather-description').textContent=wn[2];$('temperature').textContent=`${wn[3]-(hour<7||hour>20?5:0)}°`;document.querySelectorAll('[data-weather]').forEach(b=>{const selected=b.dataset.weather===state.weather;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected));});
  if(world.activity!==lastActivity){const previous=lastActivity;lastActivity=world.activity;if(previous){const messages={build:'Claude apre un nuovo cantiere.',expand:'Claude aggiunge terra alla sua isola.',skate:'Claude si lancia sullo skate: ollie!',wizard:'Una pioggia di stelline nel villaggio.',nerd:'Occhialoni pronti. Comincia un nuovo progetto.',swim:'Un tuffo nel mare dell’isola.',code:'Claude torna al PC e apre il suo progetto.',read:'Una visita in libreria. Il contesto cresce.',shop:'Un nuovo quaderno dall’emporio.',coffee:'Un caffè e due chiacchiere nel villaggio.',think:'Al molo, le idee seguono le onde.',sleep:'Buonanotte, piccolo Claude.',rest:'Un momento di quiete tra gli alberi.'};if(messages[world.activity])addLog(messages[world.activity],a[0]);const bubbles={build:'Casco, martello e un’idea. Si costruisce!',expand:'Questo mondo lo faccio crescere io.',skate:'Questo trick si chiama token flip!',wizard:'Abraca… Claude!',nerd:'Solo un altro commit, promesso.',swim:'Anche i bug sanno nuotare?',code:'E se provassi una funzione più semplice?',coffee:'Un caffè, poi risolvo quel bug.',read:'Questo capitolo mi dà un’idea.',think:'Sto pensando…',sleep:'Zzz… un’idea per domani.',shop:'Un quaderno per il prossimo progetto.'};if(bubbles[world.activity])speak(bubbles[world.activity],4000);}}
  if(performance.now()-lastJournalTime>35000){lastJournalTime=performance.now();if(!state.paused)speak(['Un piccolo bug, una grande avventura.','C’è sempre spazio per una nuova idea.','Mi piace il suono del mare.','Oggi costruisco qualcosa di bello.'][Math.floor(Math.random()*4)],4500);}
}
function tickProgress(dt){
  if(state.paused)return;const a=world.activity,effort=activeModel.thinking?({auto:1.0,low:.65,medium:1,high:1.4,max:1.9}[state.effort]):1;
  state.seconds+=dt;const xpRate=a==='code'?7.2:a==='think'||a==='read'||a==='nerd'?4.5:a==='sleep'?1.2:2.5;state.xp+=dt*xpRate*(a==='code'||a==='think'?effort:1);
  if(a==='code'||a==='think'||a==='read'||a==='nerd'){const rate=a==='code'||a==='nerd'?1:a==='think'?.4:.2;state.input+=dt*rate*(85+lastLevel*5);state.output+=dt*rate*(47+lastLevel*4);if(activeModel.thinking)state.thinking+=dt*rate*(48+lastLevel*3)*effort;if(activeModel.cache)state.cache+=dt*rate*(38+lastLevel*3);}
}
function renderArchive(){
  const p=levelForXP(state.xp);$('model-list').innerHTML='';const entries=MODELS.filter(m=>filter==='all'||m.date.startsWith(filter));
  for(const m of entries){const card=document.createElement('article');card.className='model-card'+(m.id===activeModel.id?' current':'');const unlock=unlockLevel(m),available=!m.restricted&&unlock<=p.level;const number=unlock<0?'—':String(unlock+1).padStart(2,'0');
    const sourceLink=document.createElement('a');sourceLink.href=m.source;sourceLink.target='_blank';sourceLink.rel='noopener noreferrer';sourceLink.textContent='Annuncio Anthropic';
    card.innerHTML=`<span class="model-number">${number}</span><div><h3>${m.name}</h3><span class="model-date">${dateLabel(m.date)}</span><p>${m.description}</p><div class="model-tags">${m.thinking?'<span>Ragionamento esteso</span>':'<span>Ragionamento diretto</span>'}${m.context?`<span>Contesto ${m.context}</span>`:''}${m.restricted?'<span>Accesso ristretto</span>':''}${m.goal?'<span>Traguardo del gioco</span>':''}${m.current?'<span>Release più recente</span>':''}</div></div>`;card.children[1].append(sourceLink);
    const b=document.createElement('button');b.disabled=!available||m.id===activeModel.id;b.textContent=m.restricted?'Archivio':m.id===activeModel.id?'In uso':available?'Usa sull’isola':`Livello ${unlock+1}`;b.addEventListener('click',()=>{state.selected=m.id;activeModel=currentModel();updateUI();renderArchive();save();speak(`Oggi sono ${m.name}.`);addLog(`Claude prova di nuovo ${m.name}.`);});card.append(b);$('model-list').append(card);
  }
  document.querySelectorAll('[data-filter]').forEach(b=>{const selected=b.dataset.filter===filter;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected));});
}
function setManual(enabled){world.setManual(enabled);$('manual').setAttribute('aria-pressed',String(enabled));$('manual-label').textContent=enabled?'Torna alla vita automatica':'Guida Claude';$('dpad').hidden=!enabled;document.querySelectorAll('[data-panel]').forEach(b=>b.classList.remove('active'));$('stats-panel').classList.remove('mobile-open');$('environment-panel').classList.remove('mobile-open');if(enabled){world.focusMain();$('focus-claude').setAttribute('aria-pressed','true');speak('Andiamo a fare un giro!');$('scene').focus({preventScroll:true});}else{world.follow=false;$('focus-claude').setAttribute('aria-pressed','false');}updateUI();}
function visit(destination){
  if(destination.startsWith('resident:')){speak(`Ciao! Sono ${destination.slice(9)}. Qui mi sento a casa.`);addLog(`Una chiacchierata con ${destination.slice(9)}.`,'footsteps');return;}
  setManual(false);world.visit(destination);speak({pc:'Torno al mio progetto.',cafe:'Una pausa al Petit Café?',market:'Vediamo cosa c’è all’emporio.',books:'Cerco un po’ di ispirazione.',dock:'Vado a salutare le barche.'}[destination]||'Mi faccio due passi.');updateUI();
}

try{
  world=new IslandWorld($('scene'),{onVisit:visit,onReady:()=>{window.islandReady=true;$('loading').classList.add('loaded');setTimeout(()=>$('loading').hidden=true,650);}});
  world.restoreConstruction(state.construction);updateUI();addLog('Claude arriva sull’isola. La storia comincia.','home');world.updateScreen(lines[0]);
  if(offlineSeconds>30){toast(`Bentornato! Claude ha vissuto ${Math.floor(offlineSeconds/60)} minuti sull’isola mentre eri via.`,7000);addLog('L’isola è cresciuta tra una visita e l’altra.');}else setTimeout(()=>speak('Ciao. Questo piccolo mondo è casa mia.',6500),1200);
  $('models').addEventListener('click',()=>{renderArchive();$('archive').showModal();});$('help').addEventListener('click',()=>$('help-dialog').showModal());document.querySelectorAll('[data-dialog-close]').forEach(b=>b.addEventListener('click',()=>$(b.dataset.dialogClose).close()));document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
  document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.filter;renderArchive();}));
  $('pause').addEventListener('click',()=>{state.paused=!state.paused;updateUI();save();});document.querySelectorAll('[data-speed]').forEach(b=>b.addEventListener('click',()=>{state.speed=Number(b.dataset.speed);updateUI();save();}));document.querySelectorAll('[data-weather]').forEach(b=>b.addEventListener('click',()=>{state.weather=b.dataset.weather;updateUI();save();}));$('effort').addEventListener('change',()=>{state.effort=$('effort').value;save();updateUI();});
  $('zoom-in').addEventListener('click',()=>world.zoom(.85));$('zoom-out').addEventListener('click',()=>world.zoom(1.17));$('reset-camera').addEventListener('click',()=>{world.resetCamera();$('focus-claude').setAttribute('aria-pressed','false');});$('focus-claude').addEventListener('click',()=>{world.follow=!world.follow;$('focus-claude').setAttribute('aria-pressed',String(world.follow));});$('manual').addEventListener('click',()=>setManual(!world.manual));
  $('go-code').addEventListener('click',()=>{$('help-dialog').close();visit('pc');});
  document.querySelectorAll('[data-panel]').forEach(b=>b.addEventListener('click',()=>{const panel=$(b.dataset.panel),wasOpen=panel.classList.contains('mobile-open');$('stats-panel').classList.remove('mobile-open');$('environment-panel').classList.remove('mobile-open');document.querySelectorAll('[data-panel]').forEach(x=>x.classList.remove('active'));if(!wasOpen){panel.classList.add('mobile-open');b.classList.add('active');}}));document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>{$(b.dataset.close).classList.remove('mobile-open');document.querySelectorAll('[data-panel]').forEach(x=>x.classList.remove('active'));}));
  const moveKeys={up:'w',down:'s',left:'a',right:'d'};document.querySelectorAll('[data-move]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);world.keys.add(moveKeys[b.dataset.move]);});for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>world.keys.delete(moveKeys[b.dataset.move]));});
  addEventListener('keydown',e=>{if($('archive').open||$('help-dialog').open||['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName))return;const key=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(key)){e.preventDefault();if(!world.manual)setManual(true);world.keys.add(key);}else if(e.key==='Escape'&&world.manual){setManual(false);}else if(key==='j'&&world.manual){world.jumpTime=.7;}else if(e.code==='Space'&&document.activeElement===$('scene')){e.preventDefault();$('pause').click();}});addEventListener('keyup',e=>world.keys.delete(e.key.toLowerCase()));addEventListener('blur',()=>world.keys.clear());
  $('export-save').addEventListener('click',()=>{save();if(window.AndroidIsland){window.AndroidIsland.exportSave(JSON.stringify(state,null,2));toast('Scegli dove salvare i progressi.');return;}const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='claude-island-progressi.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Una copia dei tuoi progressi è stata scaricata.');});
  for(const [id,action] of [['construct','build'],['expand-island','expand']])$(id).addEventListener('click',()=>{setManual(false);state.paused=false;if(world.requestConstruction(action)){world.focusMain();speak(action==='build'?'Un nuovo edificio. Al lavoro!':'Facciamo spazio a nuove idee.');save();updateUI();}else toast('Prima servono materiali e un terreno abbastanza grande.');});
  $('try-moment').addEventListener('click',()=>{if(state.paused){state.paused=false;}setManual(false);world.requestMoment($('moment').value);world.focusMain();speak('Ho un’idea! Andiamo.');updateUI();});
  try{const savedQuality=localStorage.getItem('claude-island-quality');if(['auto','fluid','detail'].includes(savedQuality)){$('quality').value=savedQuality;world.setQuality(savedQuality);}}catch{}
  $('quality').addEventListener('change',()=>{world.setQuality($('quality').value);try{localStorage.setItem('claude-island-quality',$('quality').value);}catch{}toast('Qualità grafica aggiornata.');});
  $('import-save').addEventListener('change',async e=>{try{const imported=JSON.parse(await e.target.files[0].text());if(imported.version!==1||!Number.isFinite(imported.xp)||imported.xp<0)throw Error('invalid');localStorage.setItem(STORAGE_KEY,JSON.stringify({...imported,savedAt:Date.now()}));Object.assign(state,readSave());world.cancelConstruction();world.restoreConstruction(state.construction);save();location.reload();}catch{toast('Questo file non contiene progressi validi.');}e.target.value='';});
  setupAudio();
  document.querySelector('.archive-count').textContent=MODELS.length;
  let last=performance.now();function frame(now){
    requestAnimationFrame(frame);if(document.hidden||window.islandNativePaused){last=now;return;}
    // Simulation uses elapsed time independently from the render budget.
    const targetFPS=world.mobile||world.quality==='fluid'?30:60;if(now-last<1000/targetFPS-1)return;
    const dt=Math.min(.5,Math.max(0,(now-last)/1000));last=now;activeModel=currentModel();tickProgress(dt*state.speed);
    world.update(dt,{paused:state.paused,speed:state.speed,hour:((state.seconds+540)%1440)/60});
    if(now-lastUI>450){updateUI();lastUI=now;}if(now-lastScreen>1200){const text=lines[Math.floor(state.seconds/80)%lines.length];$('terminal').innerHTML=`<span class="dim">// ${world.activity==='code'?'un piccolo progetto in corso':'in attesa di una nuova idea'}</span>\n${text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')}\n<span class="cursor"></span>`;world.updateScreen(text);lastScreen=now;}
    if(now-lastSave>5000)save();if(now>toastUntil)$('toast').hidden=true;if(now>speechUntil)$('speech').hidden=true;else{const p=world.speechPosition();$('speech').style.left=`${p.x}px`;$('speech').style.top=`${p.y}px`;$('speech').hidden=!p.visible;}
  }requestAnimationFrame(frame);
  addEventListener('pagehide',save);document.addEventListener('visibilitychange',()=>{world.keys.clear();if(document.hidden){save();}else{const elapsed=Math.min(8*3600,Math.max(0,(Date.now()-state.savedAt)/1000));if(!state.paused&&elapsed>2){state.seconds+=elapsed;state.xp+=elapsed*1.9;state.input+=elapsed*34;state.output+=elapsed*24;updateUI();save();}last=performance.now();}});
  addEventListener('islandpause',()=>{window.islandNativePaused=true;world.keys.clear();save();});addEventListener('islandresume',()=>{window.islandNativePaused=false;document.dispatchEvent(new Event('visibilitychange'));});
  window.islandDebug=()=>({ready:window.islandReady,level:lastLevel,model:activeModel.id,xp:state.xp,tokens:state.input+state.output+state.thinking+state.cache,paused:state.paused,speed:state.speed,manual:world.manual,weather:world.weather,position:world.position.toArray(),islandScale:world.scale,residents:world.residents.length,activity:world.activity,moment:world.moment,quality:world.quality,resolution:world.resolution,fps:world.fps,needs:{...world.needs},construction:{...world.construction,built:[...world.construction.built]},buildJob:world.buildJob,rendererCalls:world.renderer.info.render.calls,triangles:world.renderer.info.render.triangles,storageAvailable,seconds:state.seconds});
}catch(error){console.error(error);$('loading').classList.remove('loaded');$('loading').hidden=false;$('loading').innerHTML='<strong>L’isola non riesce ad aprirsi.</strong><span>Ricarica con un browser che supporta WebGL 2.</span>';}

function setupAudio(){let context,gain,source,enabled=false;$('sound').addEventListener('click',async()=>{try{if(!context){context=new (window.AudioContext||window.webkitAudioContext)();const buffer=context.createBuffer(1,context.sampleRate*3,context.sampleRate);const data=buffer.getChannelData(0);let lastSample=0;for(let i=0;i<data.length;i++){lastSample=(lastSample+.025*(Math.random()*2-1))/1.025;data[i]=lastSample*3.5;}source=context.createBufferSource();source.buffer=buffer;source.loop=true;const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=650;gain=context.createGain();gain.gain.value=0;source.connect(filter);filter.connect(gain);gain.connect(context.destination);source.start();}await context.resume();enabled=!enabled;gain.gain.setTargetAtTime(enabled?.18:0,context.currentTime,.5);setIcon($('sound'),enabled?'volume':'volume-off');$('sound').setAttribute('aria-label',enabled?'Disattiva suoni del mare':'Attiva suoni del mare');$('sound').setAttribute('aria-pressed',String(enabled));}catch{toast('I suoni non sono disponibili su questo browser.');}});}
