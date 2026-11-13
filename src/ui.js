import {RACES,RACE_NAMES,CLASS_NAMES,CHARACTER_CREATION,ATTRIBUTE_KEYS,ATTRIBUTE_LABELS,derived,sheetSummary,qualityLimit,listedQualities,spentAbilityPoints,validateCreation,testFormula,esc,uid} from './rules.js';
import {scene,invalidate,fitScene,zoomAt} from './board.js';
import {snapTokenPosition} from './grid.js';
let app;
const nav=[['campaign','◆','Campanha'],['maps','▦','Mapas'],['tokens','♟','Tokens'],['sheets','▤','Fichas'],['dice','⚄','Dados'],['combat','⚔','Combate'],['audio','♫','Áudio'],['session','◉','Sessão']];
const E=esc,sel=(a,b)=>String(a)===String(b)?' selected':'',checked=v=>v?' checked':'',disabled=()=>app.role==='master'?'':' disabled';
const b=(act,label,cl='')=>`<button type="button" data-action="${act}" class="${cl}">${label}</button>`;
function item(id,title,desc,kind,active=false){return `<div class="item ${active?'active':''}"><div class="details"><strong>${E(title)}</strong><small>${E(desc||'')}</small></div><button data-action="select-${kind}" data-id="${E(id)}">Abrir</button></div>`;}
function campaignPanel(){const c=app.campaign;if(app.role!=='master')return `<h3>${E(c.name)}</h3><p>${E(c.description)}</p><p class="notice">Campanha compartilhada. Alterações administrativas são restritas ao Mestre.</p>`;
  return `<h3>Campanhas</h3><label>Campanha atual<input id="campaign-name" data-campaign-field="name" value="${E(c.name)}"></label><label>Descrição<textarea data-campaign-field="description">${E(c.description)}</textarea></label>
  <div class="button-row">${b('new-campaign','+ Nova','primary')}${b('demo','⌘ Demonstração')}</div><div class="button-row">${b('export','⇩ Exportar')}${b('import-campaign','⇧ Importar')}${b('delete-campaign','Excluir','danger')}</div>
  <h4>Campanhas neste dispositivo</h4>${app.campaigns.map(x=>item(x.id,x.name,(x.scenes?.length||0)+' cenas','campaign',x.id===c.id)).join('')}
  <hr class="rule"><h4>Anotações secretas do Mestre</h4><textarea data-campaign-field="notes" rows="5">${E(c.notes||'')}</textarea><p class="mini">As anotações não são enviadas aos jogadores ou ao projetor.</p>`;}
function mapsPanel(){const c=app.campaign,s=scene(),master=app.role==='master';return `<div class="heading"><h3>Mapas e cenários</h3>${master?b('add-scene','+ Cena'):''}</div>
  <label>Cena atual<select data-field="sceneId">${c.scenes.map(o=>`<option value="${E(o.id)}"${sel(o.id,c.sceneId)}>${E(o.name)}</option>`).join('')}</select></label>
  ${master?`<label>Nome da cena<input data-scene-field="name" value="${E(s.name)}"></label><div class="button-row">${b('import-map','⬆ Importar mapa','primary')}${b('remove-map','Limpar imagem','subtle')}</div>`:''}
  <div class="button-row">${b('fit','⊡ Enquadrar')}${b('zoom-in','＋ Zoom')}${b('zoom-out','－ Zoom')}</div>
  ${master?`<hr class="rule"><h4>Grade</h4><div class="grid2"><label>Tamanho (pixels)<input type="number" min="20" max="250" data-scene-field="grid.size" value="${s.grid.size}"></label><label>Grade visível<select data-scene-field="grid.enabled"><option value="true"${sel(s.grid.enabled,true)}>Sim</option><option value="false"${sel(s.grid.enabled,false)}>Não</option></select></label></div>
    <label><input type="checkbox" data-settings-field="snap"${checked(c.settings.snap)}> Encaixar tokens no centro das casas</label><label><input type="checkbox" data-settings-field="animations"${checked(c.settings.animations!==false)}> Animações leves</label>
    <div class="button-row">${b('center-tokens','⊞ Centralizar tokens nas casas')}</div><p class="mini">O encaixe move cada token de casa em casa, sempre pelo centro. Use o botão acima para corrigir tokens de campanhas anteriores.</p><hr class="rule"><h4>Ferramentas</h4><div class="button-row">${['select','add-token','fog-add','fog-reveal','measure','marker'].map((tool,i)=>`<button class="${app.tool===tool?'selected-tool':''}" data-action="tool" data-value="${tool}">${['↖ Selecionar','+ Token','▓ Ocultar','✧ Revelar','⌁ Medir','⌖ Marcador'][i]}</button>`).join('')}</div>
    <div class="button-row">${b('show-fog',app.showFog?'Ver sem névoa':'Ver com névoa')}${b('clear-fog','Revelar tudo')}</div><p class="mini">Para desenhar ou revelar névoa, escolha a ferramenta e arraste no mapa. A prévia sem névoa é exclusiva do Mestre.</p>`:
    `<p class="notice">Arraste os seus personagens para movimentá-los. Faça pinça para aproximar o mapa.</p>`}
    <hr class="rule"><p class="mini">Cena: ${s.width} × ${s.height} px · ${s.tokens.length} tokens · ${s.fog?.length||0} áreas de névoa.</p>`;}
function tokenPanel(){const s=scene(),master=app.role==='master';const tokens=s.tokens.filter(t=>master||t.visible!==false),t=tokens.find(x=>x.id===app.selectedTokenId),c=app.campaign;
  return `<div class="heading"><h3>Tokens</h3>${master?b('tool-add-token','+ Adicionar','primary'):''}</div><p class="mini">Toque em um token no tabuleiro para selecioná-lo.</p>
    ${tokens.map(x=>item(x.id,x.name,`Vida ${x.hp??'—'} · ${x.ownerId||'NPC'}`,'token',x.id===t?.id)).join('')}
    ${t?`<hr class="rule"><h4>Token selecionado</h4>${master?`<label>Nome<input data-token-field="name" value="${E(t.name)}"></label>`:`<strong>${E(t.name)}</strong>`}
      <div class="grid2"><label>Vida atual<input type="number" data-token-field="hp" value="${Number(t.hp)||0}"${disabled()}></label><label>Vida máxima<input type="number" data-token-field="maxHp" value="${Number(t.maxHp)||0}"${disabled()}></label></div>
      ${master?`<div class="grid2"><label>Tamanho<input type="number" min="20" max="220" data-token-field="size" value="${t.size||54}"></label><label>Rotação<input type="number" min="-360" max="360" data-token-field="rotation" value="${t.rotation||0}"></label></div>
      <label>Ficha associada<select data-token-field="sheetId"><option value="">Nenhuma</option>${c.sheets.map(x=>`<option value="${x.id}"${sel(t.sheetId,x.id)}>${E(x.name)}</option>`).join('')}</select></label>
      <label>Controle de jogador<select data-token-field="ownerId"><option value="">Mestre/NPC</option>${Object.entries(c.slotNames||{}).map(([id,name])=>`<option value="${id}"${sel(t.ownerId,id)}>${E(name)}</option>`).join('')}</select></label>
      <div class="grid2"><label><input type="checkbox" data-token-field="visible"${checked(t.visible!==false)}> Visível</label><label><input type="checkbox" data-token-field="locked"${checked(t.locked)}> Bloqueado</label></div>
      <label>Condições (separadas por vírgula)<input data-token-field="conditions" value="${E((t.conditions||[]).join(', '))}"></label>
      <div class="button-row">${b('import-token-image','↑ Imagem')}${b('delete-token','Remover','danger')}</div>`:''}
      ${t?.sheetId?`<div class="notice">Vinculado à ficha: ${E(c.sheets.find(s=>s.id===t.sheetId)?.name||'não encontrada')}</div>`:''}`:''}`;}
function sheetImportReview(){
  const draft=app.sheetImportDraft;if(!draft||app.role!=='master')return '';
  const d=draft.data||{},a=d.attributes||{};
  const input=(name,label,val,type='text')=>`<label>${E(label)}<input name="${E(name)}" type="${type}" value="${E(val??'')}" ${type==='number'?'min="0"':''} placeholder="${val===null||val===undefined||val===''?'Não identificado — preencher':'Conferir'}"></label>`;
  const picker=(field,label,items,val)=>`<label>${E(label)}<select name="${field}"><option value="">Escolher...</option>${items.map(v=>`<option value="${E(v)}"${sel(v,val)}>${E(v)}</option>`).join('')}</select></label>`;
  return `<section class="import-review"><div class="heading"><h4>Revisar ficha importada</h4>${b('cancel-import-sheet','Cancelar')}</div>
    <p class="mini">Arquivo: <strong>${E(draft.filename)}</strong> · ${E(draft.format.toUpperCase())}. ${draft.detected.length} campos principais identificados. Campos vazios não são inventados.</p>
    ${(draft.warnings||[]).length?`<div class="notice"><strong>Verificar:</strong><ul>${draft.warnings.slice(0,12).map(w=>`<li>${E(w)}</li>`).join('')}</ul></div>`:''}
    ${(app.sheetImportErrors||[]).length?`<div class="notice"><strong>Corrigir antes de criar:</strong><ul>${app.sheetImportErrors.map(w=>`<li class="warn">${E(w)}</li>`).join('')}</ul></div>`:''}
    ${draft.template?`<div class="notice">✓ Formulário preenchível de Tenebria reconhecido. Campos associados por seus identificadores internos.</div>`:''}
    ${['skills','qualities','flaws','abilities','weapons','equipment'].some(k=>d[k])?`<details class="import-preview"><summary>Ver perícias, qualidades, habilidades, armas e itens reconhecidos</summary>${Object.entries({skills:"Perícias",qualities:"Qualidades",flaws:"Defeitos",abilities:"Habilidades",weapons:"Armas e armaduras",equipment:"Inventário"}).filter(([k])=>d[k]).map(([k,label])=>`<h4>${label}</h4><pre style="white-space:pre-wrap;overflow-wrap:anywhere">${E(d[k])}</pre>`).join('')}</details>`:''}
    <form id="sheet-import-review" novalidate>
    ${input('name','Nome',d.name)}
    <div class="grid2">${picker('race','Raça',RACE_NAMES,d.race)}${picker('cls','Classe',CLASS_NAMES,d.cls)}</div>
    <div class="grid2">${input('level','Nível',d.level,'number')}${input('armor','Bônus de defesa',d.armor,'number')}</div>
    <h4>Atributos-base</h4><div class="grid4">${ATTRIBUTE_KEYS.map(k=>input(k,ATTRIBUTE_LABELS[k],a[k],'number')).join('')}</div>
    <div class="grid2">${input('hp','PV atuais',d.hp,'number')}${input('maxHp','PV máximos',d.maxHp,'number')}</div>
    <label class="import-check"><input name="createToken" type="checkbox" checked> Criar token no mapa atual e vincular à ficha</label>
    <p class="mini">A ficha só será criada após a confirmação. Atributos de nível 1 devem somar oito pontos; a qualidade Meio-Antigo (+1) é considerada quando estiver registrada no PDF. O PDF original, quando importado, será anexado à ficha no dispositivo do Mestre.</p>
    <div class="button-row">${b('confirm-import-sheet','✓ Criar personagem','primary')}${b('cancel-import-sheet','Cancelar')}</div>
    </form></section>`;
}
function sheetPanel(){const c=app.campaign,master=app.role==='master',sheets=master?c.sheets:c.sheets.filter(s=>s.playerId===app.playerId);if(!sheets.find(s=>s.id===app.selectedSheetId))app.selectedSheetId=sheets[0]?.id||null;
  const s=sheets.find(s=>s.id===app.selectedSheetId);const errs=s?validateCreation(s):[],der=s?sheetSummary(s):null;
  const readonlyField=f=>master?'':(['notes','history','equipment','weapons','skills','abilities','spells'].includes(f)?'':' disabled');
  const input=(f,label,multi=false)=>`<label>${label}${multi?`<textarea data-sheet-field="${f}"${readonlyField(f)}>${E(s[f]||'')}</textarea>`:`<input data-sheet-field="${f}" value="${E(s[f]??'')}"${readonlyField(f)}>`}</label>`;
  return `<div class="heading"><h3>Fichas digitais</h3>${master?b('import-sheet','↑ Importar ficha','primary')+b('add-sheet','+ Ficha'):''}</div>${sheetImportReview()}${sheets.map(x=>item(x.id,x.name,`${x.race} · ${x.cls} · Nível ${x.level}`,'sheet',x.id===s?.id)).join('')}
  ${s?`<hr class="rule"><h4>${E(s.name)}</h4>${input('name','Nome')}
  <div class="grid2"><label>Raça<select data-sheet-field="race"${readonlyField('race')}>${[...RACE_NAMES,...(!RACES[s.race]?[s.race]:[])].map(r=>`<option value="${E(r)}"${sel(r,s.race)}>${E(r)}</option>`).join('')}</select></label><label>Classe<select data-sheet-field="cls"${readonlyField('cls')}>${[...CLASS_NAMES,...(!CLASS_NAMES.includes(s.cls)?[s.cls]:[])].map(v=>`<option value="${E(v)}"${sel(v,s.cls)}>${E(v)}</option>`).join('')}</select></label></div>
  <div class="grid2"><label>Nível<input type="number" min="1" max="30" data-sheet-field="level" value="${s.level}"${readonlyField('level')}></label><label>Jogador<select data-sheet-field="playerId"${readonlyField('playerId')}><option value="">Mestre</option>${Object.entries(c.slotNames||{}).map(([id,name])=>`<option value="${id}"${sel(s.playerId,id)}>${E(name)}</option>`).join('')}</select></label></div>
  <h4>Atributos</h4><div class="grid4">${ATTRIBUTE_KEYS.map(k=>`<label title="Limite: ${RACES[s.race]?.[k]||'consultar livro'}">${ATTRIBUTE_LABELS[k]}<input type="number" min="1" max="20" data-attribute="${k}" value="${s.attributes?.[k]||0}"${disabled()}></label>`).join('')}</div>
  <div class="notice">${errs.length?`<span class="warn">${errs.map(E).join(' ')}</span>`:`<span class="good">✓ Distribuição válida dos atributos-base</span>`}<div class="mini">Limites da raça: ${RACES[s.race]?ATTRIBUTE_KEYS.map(k=>`${ATTRIBUTE_LABELS[k][0]}${RACES[s.race][k]}`).join(' · '):'Limites ainda não conferidos'}</div></div>
  <div class="mini">${RACES[s.race]?.note?E(RACES[s.race].note)+' · ':''}${RACES[s.race]?`Raça catalogada no PDF, página ${RACES[s.race].sourcePage}.`:''} Os bônus raciais excepcionais não alteram os atributos-base automaticamente.</div>
  <h4>Subatributos e combate</h4><div class="grid2">${Object.entries({Iniciativa:der.initiative,Fadiga:der.fatigue,Vontade:der.will,Resistência:der.resistance,Defesa_total:der.defenseTotal,Dano_desarmado:der.unarmedDamage}).map(([k,v])=>`<div class="pill">${k.replace('_',' ')}: <strong>${v}</strong></div>`).join('')}</div>
  <div class="grid2"><label>PV atuais<input type="number" data-sheet-field="hp" value="${s.hp}"${disabled()}></label><label>PV máximos<input type="number" data-sheet-field="maxHp" value="${s.maxHp}"${disabled()}></label></div>
  <div class="grid2"><label>Bônus de defesa<input type="number" data-sheet-field="armor" value="${s.armor||0}"${disabled()}></label><label>Movimento (m)<input value="${RACES[s.race]?.movement??'?'}" disabled></label></div>
  <div class="button-row">${b('sheet-test-physical','⚄ Físico')}${b('sheet-test-skill','⚄ Habilidade')}${b('sheet-test-mental','⚄ Mental')}${b('sheet-test-vigor','⚄ Vigor')}${b('sheet-test-initiative','⚄ Iniciativa')}${b('sheet-test-resistance','⚄ Resistência')}${b('sheet-test-will','⚄ Vontade')}</div>
  <hr class="rule"><h4>Criação e progressão (nível 1)</h4>
  <div class="grid2"><div class="pill">Qualidades: <strong>${listedQualities(s).length}/${qualityLimit(s)}</strong></div><div class="pill">Habilidades: <strong>${spentAbilityPoints(s)}/${CHARACTER_CREATION.startingAbilityPoints} pts</strong></div></div>
  <p class="mini">Qualidades: uma por linha no campo abaixo. Humano tem direito a uma qualidade extra. Custos de habilidades devem ser conferidos nas páginas da classe do livro. Os pontos excedentes são destacados e nunca apagados automaticamente.</p>
  <div class="heading"><h4>Habilidades compradas (registro de pontos)</h4>${master?b('add-class-power','+ Habilidade'):''}</div>
  ${(s.classPowers||[]).map((pow,i)=>`<div class="power-line"><label>Nome<input data-power-field="name" data-power-index="${i}" value="${E(pow.name||'')}"${disabled()} placeholder="Habilidade conforme o livro"></label><div class="grid2"><label>Níveis<input data-power-field="levels" data-power-index="${i}" type="number" min="1" max="30" value="${E(pow.levels??1)}"${disabled()}></label><label>Custo por nível<input data-power-field="costPerLevel" data-power-index="${i}" type="number" min="1" max="15" value="${E(pow.costPerLevel??1)}"${disabled()}></label></div>${master?`<div class="button-row"><button data-action="remove-class-power" data-power-index="${i}" class="danger">Remover habilidade</button></div>`:''}</div>`).join('')||'<p class="mini">Nenhuma habilidade comprada registrada.</p>'}
  <hr class="rule"><h4>Ficha em PDF</h4><p class="mini">${E(s.pdfName||'Nenhum PDF anexado. Este PDF foi anexado apenas como referência. Para criar um novo personagem lendo os dados, use Importar ficha.')}</p><div class="button-row">${master?b('attach-pdf','↑ Anexar PDF'):''}${s.pdfKey?b('view-pdf','Abrir PDF'):''}</div>
  ${input('skills','Perícias',true)}${input('qualities','Qualidades (uma por linha)',true)}${input('flaws','Defeitos',true)}${input('equipment','Equipamentos e inventário',true)}${input('weapons','Armas e armaduras',true)}${input('abilities','Habilidades',true)}${input('spells','Magias',true)}${input('history','Histórico',true)}${input('notes','Notas de jogador',true)}
  ${master?b('delete-sheet','Excluir ficha','danger'):''}<p class="mini">Versão 0.2.2: 27 raças, 27 classes, orçamento de qualidades e cinco pontos iniciais de habilidades. PV e habilidades específicas continuam sob controle do Mestre até serem verificados no livro.</p>`:
    `<p class="notice">Sem fichas disponíveis. ${master?'Crie uma ficha para começar.':'Peça ao Mestre para associar um personagem ao seu código.'}</p>`}`;}
function dicePanel(){const c=app.campaign;return `<h3>Rolagem de dados</h3><label>Fórmula<input id="dice-formula" autocomplete="off" value="${E(app.rollInput||'1D20')}" placeholder="2D6+3"></label>
    <div class="button-row">${[4,6,8,10,12,20].map(n=>b(`die-${n}`,`D${n}`)).join('')}</div>
    ${app.role==='master'?`<label><input type="checkbox" id="private-roll"${checked(app.rollPrivate)}> Rolagem privada do Mestre</label>`:''}
    <div class="button-row">${b('roll','⚄ Rolar dados','primary')}${b('roll-initiative','Iniciativa')}</div><hr class="rule"><h4>Histórico recente</h4>
    ${(c.rollHistory||[]).slice(0,35).map((r,i)=>`<div class="result ${i===0&&c.settings?.animations!==false?'roll-enter':''}"><div class="row"><div class="details"><strong>${E(r.by||'Jogador')}</strong><small>${E(r.formula)} ${r.private?'· Privada':''}</small></div><div class="big">${r.total}</div></div><div class="mini">${E((r.details||[]).join(' · '))}</div></div>`).join('')||'<p class="muted">Nenhum dado lançado ainda.</p>'}
    <p class="mini">RNG usa a API criptográfica do dispositivo. O resultado é calculado antes da animação, independentemente da interface.</p>`;}
function combatPanel(){const c=app.campaign,com=c.combat,master=app.role==='master';return `<div class="heading"><h3>Combate</h3>${master?b('combat-add','+ Participante'):''}</div>
    <div class="notice">Rodada <strong>${com.round||1}</strong> · Turno <strong>${(com.entries?.length?com.index+1:0)}</strong> de ${com.entries?.length||0}</div>
    ${master?`<div class="button-row">${b('combat-prev','← Anterior')}${b('combat-next','Próximo turno →','primary')}${b('combat-sort','↧ Ordenar')}</div>`:''}
    ${(com.entries||[]).map((x,i)=>`<div class="item combat-item ${com.index===i?'turn-active':''}"><div class="row"><div class="details"><strong>${com.index===i?'▶ ':''}${E(x.name)}</strong><small>PV ${x.hp??'?'} / ${x.maxHp??'?'} · ${E((x.conditions||[]).join(', '))}</small></div>
      ${master?`<input aria-label="Iniciativa" title="Iniciativa" data-combat-field="initiative" data-id="${E(x.id)}" type="number" class="initiative-field" value="${x.initiative||0}">`:`<span class="pill">${x.initiative||0}</span>`}</div>
      ${master?`<div class="button-row">${b('combat-hp-down','−1 PV') .replace('data-action','data-id="'+E(x.id)+'" data-action')}${b('combat-hp-up','+1 PV').replace('data-action','data-id="'+E(x.id)+'" data-action')}${b('combat-remove','Remover','danger').replace('data-action','data-id="'+E(x.id)+'" data-action')}</div>`:''}</div>`).join('')||'<p class="muted">Nenhum participante. Adicione tokens à iniciativa.</p>'}
    ${master?`<hr class="rule"><h4>Condição do combatente ativo</h4><input placeholder="Ex.: envenenado, imobilizado" data-combat-field="conditions" data-id="${E(com.entries[com.index]?.id||'')}" value="${E((com.entries[com.index]?.conditions||[]).join(', '))}"><p class="mini">O Mestre pode ajustar iniciativas, vida e turnos. A ferramenta não resolve automaticamente as ações de combate.</p>`:''}`;}
function audioPanel(){const c=app.campaign;const target=app.audioTarget||'local';return `<h3>Biblioteca sonora</h3><p class="mini">Sons locais e reprodução de efeitos incluídos nos aparelhos conectados.</p>
  ${app.role==='master'?`<div class="button-row">${b('import-audio','↑ Importar áudio','primary')}${b('stop-audio','■ Interromper')}</div>
  <label>Saída do áudio<select id="audio-target">${[['local','Este aparelho'],['projector','Som no projetor'],['players','Som nos jogadores'],['all','Todos os aparelhos']].map(([v,label])=>`<option value="${v}"${sel(target,v)}>${label}</option>`).join('')}</select></label>
  <label>Volume<input id="audio-volume" type="range" min="0" max="1" step="0.05" value="${app.volume}"></label><label><input id="audio-loop" type="checkbox"${checked(app.loop)}> Repetir em loop</label>`:''}
  ${c.audioFiles?.map(audio=>`<div class="item"><div class="details"><strong>${E(audio.name)}</strong><small>${E(audio.category)} ${audio.key?'· disponível só neste aparelho':'· som incluído / compartilhável'}</small></div>${app.role==='master'?`<button data-action="play-audio" data-id="${E(audio.id)}">▶</button>`:''}</div>`).join('')||''}
  <p class="notice">Cada aparelho remoto precisa tocar em "Ativar áudio" uma vez. Arquivos importados são locais: o servidor sincroniza somente os efeitos incluídos na aplicação nesta versão.</p>`;}
function sessionPanel(){const c=app.campaign,connection=c.connection,master=app.role==='master',projector=app.role==='projector';
  if(projector)return '<p>Exibindo apenas o tabuleiro público.</p>';
  const mode=app.mode==='online'?'online':'presencial';
  const projectorLink=connection?.projectorCode?app.invite('projector',connection.projectorCode):'';
  return `<h3>${mode==='online'?'Mesa Online':'Mesa Presencial'}</h3>
    <div class="button-row">${b('mode-presencial','⌂ Presencial',mode==='presencial'?'primary':'')}${b('mode-online','◎ Online',mode==='online'?'primary':'')}${b('go-home','⌂ Início')}</div>
    <p class="notice">${mode==='online'?'Os participantes entram remotamente. É necessário configurar um servidor Tenebria em HTTPS. O GitHub Pages hospeda apenas a interface.':'Para projetar sem internet pública, abra o Tenebria VTT pelo endereço IP do servidor local nos dois dispositivos, conectados ao mesmo Wi-Fi ou hotspot. O celular controla e o projetor apenas exibe.'}</p>
    <label>Endereço do servidor (opcional na rede local)<input id="server-url" type="url" placeholder="https://seu-servidor.example.com" value="${E(app.serverAddress)}" autocomplete="url"></label>
    <div class="button-row">${b('save-server','Salvar e testar servidor')}${b('clear-server','Usar servidor desta página')}</div>
    <p class="mini">Na rede local, deixe o campo vazio e abra o endereço HTTP do servidor Node.js (ex.: http://192.168.1.10:4173) em todos os aparelhos. No GitHub Pages, o servidor remoto precisa de HTTPS e permitir esta origem.</p>
    ${master?`<div class="button-row">${b('create-online',`+ Criar sala ${mode==='online'?'online':'presencial'}`,'primary')}${connection?b('reconnect-master','Reconectar Mestre'):''}</div>`:''}
    <label>Código da sala<input id="room-input" value="${E(app.roomInput)}" placeholder="XXXXXXXX"></label>
    ${!master?`<label>Código de convite<input id="player-code" value="${E(app.playerCode)}" placeholder="Código recebido do Mestre"></label>
      <div class="button-row">${b('connect-player','Entrar como jogador','primary')}${b('connect-projector','Entrar como projetor')}</div>`:
      `<div class="button-row">${b('connect-player','Abrir convite de jogador')}${b('connect-projector','Abrir projeção')}</div>`}
    ${master&&connection?`<hr class="rule"><h4>Convites da sala</h4><div class="secret"><strong>Credencial administrativa — não compartilhar</strong><div class="mini">${E(connection.masterCode)}</div></div>
      <label>Identificador da sala<input readonly value="${E(connection.roomId)}"></label>
      <h4>Jogadores</h4>${Object.entries(connection.playerCodes||{}).map(([slot,code])=>`<div class="item"><div class="details"><strong>${E(c.slotNames?.[slot]||slot)}</strong><small>Código ${E(code)}</small></div><button data-action="copy-player-link" data-slot="${E(slot)}">Copiar convite</button></div>`).join('')}`:''}
    ${projectorLink?`<hr class="rule"><h4>Tela do projetor (somente leitura)</h4><label>Convite protegido<input readonly value="${E(projectorLink)}"></label><div class="button-row">${b('copy-projector','Copiar link')}${b('open-projector','Abrir projeção')}</div>`:''}
    ${master&&app.online?`<hr class="rule"><div class="button-row">${b('close-room','Encerrar sala','danger')}${b('reopen-room','Reabrir sala')}${b('disconnect','Sair da sessão')}</div>`:''}
    <p class="mini">A campanha é a mesma nas duas modalidades. Os códigos de Mestre, jogadores e projetor são diferentes. A projeção nunca recebe as fichas privadas ou as anotações secretas.</p>`;
}
export function renderUI(a){app=a;document.getElementById('campaign-title').textContent=a.campaign?.name||'Tenebria';
  const home=document.getElementById('mode-home');if(home){home.hidden=!a.homeOpen;home.classList.toggle('is-open',!!a.homeOpen);}
  const modeLabel=document.getElementById('mode-label');if(modeLabel)modeLabel.textContent=a.mode==='online'?'● Online':'● Presencial';
  if(a.role==='projector'){document.body.classList.add('projector');return;}document.body.classList.remove('projector');
  const allowed=a.role==='master'?nav:nav.filter(([id])=>['maps','tokens','sheets','dice','combat','session'].includes(id));
  document.getElementById('tabs').innerHTML=allowed.map(([id,icon,label])=>`<button data-action="tab" data-value="${id}" class="${a.selectedTab===id?'active':''}"><b>${icon}</b>${label}</button>`).join('');
  const old=document.getElementById('panel'),scroll=old.scrollTop;
  old.innerHTML=({campaign:campaignPanel,maps:mapsPanel,tokens:tokenPanel,sheets:sheetPanel,dice:dicePanel,combat:combatPanel,audio:audioPanel,session:sessionPanel}[a.selectedTab]||mapsPanel)();
  old.scrollTop=scroll;const sb=document.getElementById('sidebar');sb.classList.toggle('open',a.panelOpen);
}
export function initUI(a){app=a;
  document.addEventListener('click',async e=>{
    const el=e.target.closest('[data-action]');if(!el)return;const act=el.dataset.action,id=el.dataset.id,master=app.role==='master',c=app.campaign,s=scene();
    if(act==='choose-mode'){app.chooseMode(el.dataset.mode);return;}
    if(act==='go-home'){app.showHome();return;}
    if(act==='mode-presencial'||act==='mode-online'){app.mode=act==='mode-online'?'online':'presencial';app.render();return;}
    if(act==='save-server'){await app.configureServer(document.getElementById('server-url')?.value||'');return;}
    if(act==='clear-server'){try{app.configureServer('');app.toast('Endereço removido. O servidor desta página será usado.');}catch(e){app.toast(e.message);}return;}
    if(act==='unlock-audio'){await app.unlockAudio();return;}
    if(act==='toggle-menu'||act==='close-sidebar'){app.panelOpen=act==='close-sidebar'?false:!app.panelOpen;app.render();return;}
    if(act==='fullscreen'){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch(err){app.toast('Tela cheia indisponível neste navegador.');}return;}
    if(act==='fit'){fitScene();return;}
    if(act==='zoom-in'||act==='zoom-out'){const rect=document.getElementById('board').getBoundingClientRect();zoomAt({x:rect.width/2,y:rect.height/2},act==='zoom-in'?1.25:.8);return;}
    if(act==='tab'){app.selectedTab=el.dataset.value;app.render();return;}
    if(act==='select-scene'){c.sceneId=id;app.render();fitScene();return;}
    if(act==='select-campaign'){await app.loadCampaign(id);return;}
    if(act==='center-tokens'&&master){
      if(!s.grid?.enabled){app.toast('Ative a grade para centralizar os tokens.');return;}
      for(const t of s.tokens){const pos=snapTokenPosition(t.x,t.y,s,true);t.x=pos.x;t.y=pos.y;}
      app.changed('Tokens centralizados nas casas');app.render();return;
    }
    if(act==='select-token'){app.selectedTokenId=id;app.render();return;}
    if(act==='select-sheet'){app.selectedSheetId=id;app.render();return;}
    if(act==='roll'){app.rollInput=document.getElementById('dice-formula')?.value||'1D20';app.rollPrivate=!!document.getElementById('private-roll')?.checked;await app.rollDice(app.rollInput,app.rollPrivate);return;}
    if(act.startsWith('die-')){app.rollInput=`1D${act.slice(4)}`;app.render();return;}
    if(act==='roll-initiative'){const sh=c.sheets.find(s=>s.id===app.selectedSheetId)||c.sheets[0];await app.rollDice(`1D20+${sh?derived(sh.attributes).initiative:0}`);return;}
    if(act.startsWith('sheet-test-')){const sh=c.sheets.find(s=>s.id===app.selectedSheetId);if(sh)await app.rollDice(testFormula(sh,act.slice(11)));return;}
    if(act==='new-campaign'&&master){await app.newCampaign(prompt('Nome da nova campanha:')||'Nova campanha');return;}
    if(act==='demo'&&master){await app.restoreDemo();return;}
    if(act==='delete-campaign'&&master){await app.deleteCampaign();return;}
    if(act==='export'&&master){await app.export();return;}
    if(act==='import-campaign'&&master){document.getElementById('file-campaign').click();return;}
    if(act==='add-scene'&&master){const name=prompt('Nome da cena:','Nova cena');if(!name)return;const id=uid();c.scenes.push({id,name,src:'',width:1200,height:800,grid:{enabled:true,size:60},fog:[],tokens:[],markers:[]});c.sceneId=id;app.changed('Cena criada');app.render();fitScene();return;}
    if(act==='import-map'&&master){document.getElementById('file-map').click();return;}
    if(act==='remove-map'&&master){s.src='';app.changed('Mapa removido');app.render();return;}
    if(act==='tool-add-token'&&master){app.tool='add-token';app.selectedTab='maps';app.render();app.toast('Toque no mapa para posicionar o token.');return;}
    if(act==='tool'&&master){app.tool=el.dataset.value;app.render();return;}
    if(act==='show-fog'&&master){app.showFog=!app.showFog;app.render();return;}
    if(act==='clear-fog'&&master){s.fog=[];app.changed('Área inteira revelada',true);app.render();return;}
    if(act==='import-token-image'&&master){document.getElementById('file-token').click();return;}
    if(act==='delete-token'&&master){s.tokens=s.tokens.filter(t=>t.id!==app.selectedTokenId);app.selectedTokenId=null;app.changed('Token excluído');app.render();return;}
    if(act==='attach-pdf'&&master){document.getElementById('file-pdf').click();return;}
    if(act==='import-sheet'&&master){document.getElementById('file-sheet-import').click();return;}
    if(act==='cancel-import-sheet'&&master){app.sheetImportDraft=null;app.sheetImportErrors=[];app.render();return;}
    if(act==='confirm-import-sheet'&&master){const form=document.getElementById('sheet-import-review');if(!form)return;const values=Object.fromEntries(new FormData(form));await app.confirmSheetImport(values,!!form.querySelector('[name="createToken"]:checked'));return;}
    if(act==='view-pdf'){await app.viewSheetPdf();return;}
    if(act==='add-sheet'&&master){const id=uid();c.sheets.push({id,name:'Novo personagem',race:'Humano',cls:'Guerreiro',level:1,attributes:{physical:2,skill:2,vigor:2,mental:2},hp:10,maxHp:10,armor:0,skills:'',qualities:'',flaws:'',equipment:'',weapons:'',abilities:'',spells:'',history:'',notes:'',playerId:'',classPowers:[]});app.selectedSheetId=id;app.changed('Ficha criada');app.render();return;}
    if(act==='add-class-power'&&master){const sheet=c.sheets.find(x=>x.id===app.selectedSheetId);if(!sheet)return;sheet.classPowers??=[];sheet.classPowers.push({id:uid(),name:'',levels:1,costPerLevel:1});app.changed('Habilidade adicionada');app.render();return;}
    if(act==='remove-class-power'&&master){const sheet=c.sheets.find(x=>x.id===app.selectedSheetId),i=Number(el.dataset.powerIndex);if(!Array.isArray(sheet?.classPowers)||!Number.isInteger(i)||i<0||i>=sheet.classPowers.length)return;sheet.classPowers.splice(i,1);app.changed('Habilidade removida');app.render();return;}
    if(act==='delete-sheet'&&master){c.sheets=c.sheets.filter(s=>s.id!==app.selectedSheetId);app.selectedSheetId=c.sheets[0]?.id||null;app.changed('Ficha excluída');app.render();return;}
    if(act==='combat-add'&&master){const opts=s.tokens.filter(t=>!c.combat.entries.some(x=>x.tokenId===t.id));if(!opts.length){app.toast('Todos os tokens já estão no combate.');return;}
      const t=opts[0];c.combat.entries.push({id:uid(),tokenId:t.id,name:t.name,initiative:0,hp:t.hp??0,maxHp:t.maxHp??0,conditions:[]});app.changed('Participante incluído');app.render();return;}
    if(act==='combat-next'&&master){if(!c.combat.entries.length)return;c.combat.index++;if(c.combat.index>=c.combat.entries.length){c.combat.index=0;c.combat.round++;}app.changed('Próximo turno');app.render();return;}
    if(act==='combat-prev'&&master){if(!c.combat.entries.length)return;c.combat.index--;if(c.combat.index<0){c.combat.index=c.combat.entries.length-1;c.combat.round=Math.max(1,c.combat.round-1);}app.changed('Turno anterior');app.render();return;}
    if(act==='combat-remove'&&master){const index=c.combat.entries.findIndex(x=>x.id===id);if(index>=0){c.combat.entries.splice(index,1);c.combat.index=Math.min(c.combat.index,Math.max(0,c.combat.entries.length-1));app.changed('Participante removido');app.render();}return;}
    if(act==='combat-sort'&&master){const active=c.combat.entries[c.combat.index]?.id;c.combat.entries.sort((a,b)=>b.initiative-a.initiative);c.combat.index=Math.max(0,c.combat.entries.findIndex(x=>x.id===active));app.changed('Iniciativa ordenada');app.render();return;}
    if((act==='combat-hp-down'||act==='combat-hp-up')&&master){const entry=c.combat.entries.find(x=>x.id===id);if(entry){entry.hp+=act==='combat-hp-down'?-1:1;for(const sc of c.scenes){const tok=sc.tokens.find(t=>t.id===entry.tokenId);if(tok){tok.hp=entry.hp;const sh=c.sheets.find(sh=>sh.id===tok.sheetId);if(sh)sh.hp=entry.hp;}}app.changed('Vida ajustada');app.render();}return;}
    if(act==='import-audio'&&master){document.getElementById('file-audio').click();return;}
    if(act==='play-audio'&&master){await app.routeAudio(id);return;}
    if(act==='stop-audio'&&master){await app.routeStop();return;}
    if(act==='create-online'&&master){await app.makeOnline();return;}
    if(act==='reconnect-master'&&master){const conn=c.connection;if(conn){app.mode=conn.mode||app.mode;await app.connect('master',conn.roomId,conn.masterCode);}return;}
    if(act==='connect-player'){
      const room=document.getElementById('room-input')?.value||app.roomInput,code=document.getElementById('player-code')?.value||app.playerCode;
      if(master){if(!c.connection){app.toast('Crie uma sala primeiro.');return;}window.open(app.invite('player',Object.values(c.connection.playerCodes||{})[0]),'_blank','noopener');return;}
      app.playerCode=code;await app.connect('player',room,code);return;
    }
    if(act==='connect-projector'){
      const room=document.getElementById('room-input')?.value||app.roomInput,code=document.getElementById('player-code')?.value||app.playerCode;
      if(master){if(!c.connection){app.toast('Crie uma sala primeiro.');return;}window.open(app.invite('projector',c.connection.projectorCode),'_blank','noopener');return;}
      await app.connect('projector',room,code);return;
    }
    if(act==='copy-projector'&&master&&c.connection?.projectorCode){try{await navigator.clipboard.writeText(app.invite('projector',c.connection.projectorCode));app.toast('Link do projetor copiado.');}catch{app.toast('Copie o link exibido na caixa.');}return;}
    if(act==='copy-player-link'&&master){const code=c.connection?.playerCodes?.[el.dataset.slot];if(!code)return;try{await navigator.clipboard.writeText(app.invite('player',code));app.toast('Convite do jogador copiado.');}catch{app.toast('Permissão para copiar indisponível.');}return;}
    if(act==='open-projector'&&master&&c.connection?.projectorCode){window.open(app.invite('projector',c.connection.projectorCode),'_blank','noopener');return;}
    if(act==='close-room'&&master){await app.setRoomClosed(true);return;}
    if(act==='reopen-room'&&master){await app.setRoomClosed(false);return;}
    if(act==='disconnect'){await app.leaveRoom();return;}
  });
  document.addEventListener('change',async e=>{const el=e.target,c=app.campaign,s=scene(),master=app.role==='master';
    if(el.id==='file-map'){if(el.files?.[0])await app.importMap(el.files[0]);el.value='';return;}
    if(el.id==='file-token'){if(el.files?.[0])await app.importTokenImage(el.files[0]);el.value='';return;}
    if(el.id==='file-audio'){if(el.files?.[0])await app.importAudio(el.files[0]);el.value='';return;}
    if(el.id==='file-sheet-import'){if(el.files?.[0])await app.analyzeSheetFile(el.files[0]);el.value='';return;}
    if(el.id==='file-pdf'){if(el.files?.[0])await app.importSheetPdf(el.files[0]);el.value='';return;}
    if(el.id==='file-campaign'){if(el.files?.[0])await app.import(el.files[0]);el.value='';return;}
    if(el.id==='audio-target'){app.audioTarget=el.value;return;}
    if(el.id==='audio-volume'){app.volume=Number(el.value);for(const a of app.activeSound)a.audio.volume=app.volume;return;}
    if(el.id==='audio-loop'){app.loop=el.checked;for(const a of app.activeSound)a.audio.loop=app.loop;return;}
    if(el.id==='dice-formula'){app.rollInput=el.value;return;}
    if(el.id==='private-roll'){app.rollPrivate=el.checked;return;}
    if(el.id==='room-input'){app.roomInput=el.value;return;}
    if(el.id==='player-code'){app.playerCode=el.value;return;}
    const val=el.type==='checkbox'?el.checked:el.value;
    if(el.dataset.field==='sceneId'){c.sceneId=val;app.selectedTokenId=null;app.render();fitScene();if(master)app.changed();return;}
    if(el.dataset.campaignField&&master){c[el.dataset.campaignField]=val;app.changed('Campanha salva');app.render();return;}
    if(el.dataset.sceneField&&master){const field=el.dataset.sceneField;if(field==='name')s.name=val;else if(field==='grid.size')s.grid.size=Math.max(20,Math.min(250,Number(val)||60));else if(field==='grid.enabled')s.grid.enabled=val==='true';app.changed();app.render();return;}
    if(el.dataset.settingsField&&master){c.settings[el.dataset.settingsField]=val;app.changed();app.render();return;}
    if(el.dataset.tokenField&&master){const t=s.tokens.find(t=>t.id===app.selectedTokenId);if(!t)return;const f=el.dataset.tokenField;if(['hp','maxHp','size','rotation'].includes(f))t[f]=Number(val);else if(f==='conditions')t[f]=String(val).split(',').map(x=>x.trim()).filter(Boolean);else if(['visible','locked'].includes(f))t[f]=!!val;else t[f]=val;t.ownerId=t.ownerId||null;if(['hp','maxHp','conditions'].includes(f)){const combat=c.combat.entries.find(x=>x.tokenId===t.id);if(combat)combat[f]=t[f];const sh=c.sheets.find(x=>x.id===t.sheetId);if(sh&&f!=='conditions')sh[f]=t[f];}app.changed();app.render();return;}
    const sheet=c.sheets.find(s=>s.id===app.selectedSheetId);
    if(el.dataset.attribute&&master&&sheet){sheet.attributes[el.dataset.attribute]=Number(val);app.changed();app.render();return;}
    if(el.dataset.powerField&&master&&sheet){const i=Number(el.dataset.powerIndex),pow=sheet.classPowers?.[i];if(!pow)return;
      if(!['name','levels','costPerLevel'].includes(el.dataset.powerField))return;
      pow[el.dataset.powerField]=el.dataset.powerField==='name'?String(val).slice(0,140):Number(val);app.changed();app.render();return;
    }
    if(el.dataset.sheetField&&sheet){const f=el.dataset.sheetField;
      if(!master&&!['notes','history','equipment','weapons','skills','abilities','spells'].includes(f))return;
      sheet[f]=['level','hp','maxHp','armor'].includes(f)?Number(val):val;
      if(master){if(['hp','maxHp'].includes(f)){for(const sc of c.scenes)for(const t of sc.tokens)if(t.sheetId===sheet.id){t[f]=sheet[f];const combat=c.combat.entries.find(x=>x.tokenId===t.id);if(combat)combat[f]=sheet[f];}}app.changed();app.render();}else app.playerPatch({type:'sheet',sheetId:sheet.id,field:f,value:String(val)});return;}
    if(el.dataset.combatField&&master){const x=c.combat.entries.find(i=>i.id===el.dataset.id);if(x){if(el.dataset.combatField==='conditions'){x.conditions=String(val).split(',').map(z=>z.trim()).filter(Boolean);for(const sc of c.scenes){const t=sc.tokens.find(t=>t.id===x.tokenId);if(t)t.conditions=x.conditions;}}else x[el.dataset.combatField]=Number(val)||0;app.changed();app.render();}return;}
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(app.role==='projector'&&!app.online){app.role='master';document.body.classList.remove('projector');app.render();fitScene();}else if(app.tool!=='select'){app.tool='select';app.render();}}if(e.key==='Enter'&&e.target.id==='dice-formula'){e.preventDefault();app.rollInput=e.target.value;app.rollDice(app.rollInput,app.rollPrivate);}});
}
