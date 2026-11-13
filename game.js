import { createBattlefield } from './renderer3d.js';

(() => {
  'use strict';
  const canvas = document.getElementById('battlefield');
  const renderer = createBattlefield(canvas);
  const $ = id => document.getElementById(id);
  const factionData = {
    usa: {label:'UNITED STATES', color:'#6fa8d4', light:'#a8d7f0', hq:'Forward Command', refinery:'Supply Drop Zone', power:'Field Generator', barracks:'Airborne Center', factory:'War Factory', defense:'Patriot Battery', tech:'Strategy Center', infantry:'Ranger Squad', tank:'Paladin Tank', scout:'Humvee', collector:'Supply Chinook', doctrine:'Precision • Airlift • Rapid response'},
    china: {label:'CHINA', color:'#ca6250', light:'#f2b253', hq:'War Command', refinery:'Supply Depot', power:'Nuclear Reactor', barracks:'PLA Barracks', factory:'Heavy Weapons Factory', defense:'Gattling Cannon', tech:'Propaganda Center', infantry:'Red Guard', tank:'Overlord Tank', scout:'Dragon Tank', collector:'Supply Truck', doctrine:'Mass production • Heavy armor • Momentum'},
    russia: {label:'RUSSIA', color:'#8ea977', light:'#e0bd67', hq:'Field Headquarters', refinery:'Ore Processing Plant', power:'Diesel Power Plant', barracks:'Training Hall', factory:'Armor Plant', defense:'Sentry Cannon', tech:'Battle Lab', infantry:'Conscripts', tank:'T-90 Tank', scout:'BTR Scout', collector:'Ore Truck', doctrine:'Endurance • Salvage • Firepower'}
  };
  const price = {refinery:700,power:400,barracks:550,factory:850,tech:1100,defense:500,infantry:280,scout:500,tank:900,collector:650};
  const supplyCapacity=300,supplyRate=20;
  const stats = {
    infantry:{hp:48,speed:44,range:105,damage:7,rate:.9,radius:9,type:'Infantry',icon:'♟'},
    scout:{hp:78,speed:65,range:125,damage:9,rate:.8,radius:12,type:'Recon',icon:'◈'},
    tank:{hp:155,speed:34,range:155,damage:20,rate:1.35,radius:15,type:'Armor',icon:'▰'},
    collector:{hp:115,speed:39,range:0,damage:0,rate:1,radius:13,type:'Harvester',icon:'⬡'}
  };
  const factionBonuses = {
    usa:{infantry:{speed:1.12},scout:{speed:1.18,range:1.08},tank:{range:1.12,damage:1.08},collector:{speed:1.12}},
    china:{infantry:{damage:1.12},scout:{damage:1.22,rate:.8},tank:{hp:1.18,damage:1.08},collector:{hp:1.12}},
    russia:{infantry:{hp:1.2},scout:{hp:1.15},tank:{hp:1.3},collector:{hp:1.25}}
  };
  const buildingStats = {hq:{hp:520,size:45,type:'Command Center',icon:'⌂'},refinery:{hp:360,size:38,type:'Supply Refinery',icon:'⬡'},power:{hp:180,size:30,type:'Power',icon:'ϟ'},barracks:{hp:240,size:34,type:'Infantry Production',icon:'▤'},factory:{hp:300,size:40,type:'Vehicle Production',icon:'▰'},tech:{hp:330,size:37,type:'Advanced Command',icon:'⌘'},defense:{hp:260,size:29,type:'Defense',icon:'⊕'}};
  const ui = {credits:$('credits'),income:$('income'),power:$('power'),army:$('army-count'),type:$('selection-type'),name:$('selection-name'),icon:$('selection-icon'),health:$('selection-health'),toast:$('toast'),start:$('start-screen'),pause:$('pause-screen'),end:$('end-screen'),objective:$('objective-card')};
  let width=0,height=0, faction='usa', playing=false,paused=false,over=false, credits=3500, time=0,last=0,toastTime=0, action='select', selected=null, placement=null, tab='structures', serial=0, pointer={x:.5,y:.5};
  let units=[],buildings=[],enemies=[],nodes=[],decor=[],shots=[],particles=[],production=[], camera={x:.5,y:.5,z:1.12}, enemyClock=20;
  let mapGesture=null; const touchPoints=new Map(); let pinch=null;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const rand=(a,b)=>a+Math.random()*(b-a);
  const own=team=>team==='blue';
  function resize(){const r=canvas.getBoundingClientRect();width=r.width;height=r.height;renderer.resize();}
  function makeBuilding(kind,team,x,y){const s=buildingStats[kind],f=factionData[faction];return{id:'b'+(++serial),kind,team,x,y,hp:s.hp,max:s.hp,size:s.size,type:s.type,icon:s.icon,name:team==='blue'?(kind==='hq'?f.hq:f[kind]||s.type):kind==='hq'?'Enemy Command Center':'Hostile Outpost',range:kind==='hq'?125:kind==='defense'?160:0,damage:kind==='hq'?7:kind==='defense'?14:0,rate:kind==='hq'?1.5:1.1,cool:rand(.2,1),target:null};}
  function makeUnit(kind,team,x,y){const s=stats[kind],f=factionData[faction],bonus=factionBonuses[faction][kind]||{};return{id:'u'+(++serial),kind,team,x,y,hp:s.hp*(bonus.hp||1),max:s.hp*(bonus.hp||1),speed:s.speed*(bonus.speed||1),range:s.range*(bonus.range||1),damage:s.damage*(bonus.damage||1),rate:s.rate*(bonus.rate||1),radius:s.radius,type:s.type,icon:s.icon,name:team==='blue'?f[kind]:kind==='tank'?'Hostile Armor':kind==='scout'?'Hostile Recon':'Hostile Infantry',cool:rand(.1,.8),target:null,orderTarget:null,move:null,harvestNode:null,harvesting:false,carry:0};}
  function setup(){units=[];buildings=[];enemies=[];shots=[];particles=[];serial=0;credits=3500;time=0;enemyClock=30;camera={x:.5,y:.5,z:1.12};placement=null;production=[];selected=makeBuilding('hq','blue',.13,.53);buildings.push(selected,makeBuilding('refinery','blue',.23,.53),makeBuilding('hq','red',.88,.45));
    units.push(makeUnit('scout','blue',.18,.61),makeUnit('infantry','blue',.19,.65),makeUnit('infantry','blue',.2,.69));
    nodes=[];decor=[];let seed=29481;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<34;i++)nodes.push({x:.17+random()*.66,y:.06+random()*.88,amount:1200,active:true});
    for(let i=0;i<420;i++){const x=random(),y=random();if((x<.24&&y>.38&&y<.71)||(x>.77&&y>.3&&y<.61))continue;decor.push({x,y,r:2+random()*11,kind:random()<.67?'bush':'rock',tone:random(),rot:random()});}
    const harvester=makeUnit('collector','blue',.26,.59);harvester.harvesting=true;harvester.harvestNode=nodes.filter(n=>n.active).sort((a,b)=>Math.hypot((a.x-harvester.x)*width,(a.y-harvester.y)*height)-Math.hypot((b.x-harvester.x)*width,(b.y-harvester.y)*height))[0];harvester.move={x:harvester.harvestNode.x,y:harvester.harvestNode.y};units.push(harvester);
    selected=buildings[0];refreshUI();renderBuilds();}
  function toast(text){ui.toast.textContent=text;ui.toast.classList.add('show');toastTime=2.2;}
  function has(kind){return buildings.some(b=>b.team==='blue'&&b.kind===kind);}
  function available(kind){
    if(['refinery','power'].includes(kind))return true;
    if(kind==='barracks'||kind==='defense')return has('power');
    if(kind==='factory')return has('barracks')&&has('power');
    if(kind==='tech')return has('factory')&&has('power');
    if(kind==='infantry')return has('barracks');
    if(kind==='collector')return has('refinery');
    if(kind==='scout')return has('factory');
    if(kind==='tank')return has('factory')&&has('tech');
    return false;
  }
  function refreshUI(){ui.credits.textContent=Math.floor(credits).toLocaleString();const collectors=units.filter(u=>u.team==='blue'&&u.kind==='collector').length;ui.income.textContent=collectors?`+$${collectors*600}/min`:'+$0/min';ui.army.textContent=String(units.filter(u=>u.team==='blue').length).padStart(2,'0');ui.power.textContent=has('power')?'STABLE':'LOW';ui.power.style.color=has('power')?'':'#e5a84c';
    if(selected){ui.type.textContent=selected.type||'UNIT';ui.name.textContent=selected.name;ui.icon.textContent=selected.icon||'⌖';ui.health.style.width=`${100*selected.hp/selected.max}%`;ui.health.style.background=selected.hp/selected.max<.3?'#df6451':'#c8f05b';}else{ui.type.textContent='BATTLEFIELD';ui.name.textContent='Select a unit or building';ui.icon.textContent='⌖';ui.health.style.width='0%';}
    document.querySelectorAll('.action-card').forEach(b=>b.classList.toggle('selected-action',b.dataset.action===action));document.querySelectorAll('.build-card').forEach(b=>b.disabled=credits<price[b.dataset.build]||!available(b.dataset.build)||!playing||paused||over);}
  function renderBuilds(){
    const list=$('build-list'),f=factionData[faction];
    const items=tab==='structures'?[['refinery',f.refinery,'Extends supply drop-off'],['power',f.power,'Required for expansion'],['barracks',f.barracks,'Unlocks vehicle production'],['factory',f.factory,'Build scouts and harvesters'],['tech',f.tech,'Unlocks heavy armor']]:tab==='units'?[['infantry',f.infantry,'Basic infantry · Barracks'],['scout',f.scout,'Fast combat vehicle · Factory'],['tank',f.tank,'Heavy armor · Tech center'],['collector',f.collector,'Harvests supply crates · Refinery']]:[['defense',f.defense,'Automated perimeter gun · Power']];
    $('build-category').textContent=tab.toUpperCase();
    list.innerHTML=items.map(([key,label,sub])=>`<button class="build-card" data-build="${key}"><span class="unit-art ${key}-art">${stats[key]?.icon||buildingStats[key]?.icon}</span><span class="build-copy"><b>${label}</b><small>${sub} · $${price[key].toLocaleString()}</small></span><span class="build-price">${price[key]}</span></button>`).join('');
    list.querySelectorAll('.build-card').forEach(b=>b.onclick=()=>beginBuild(b.dataset.build));refreshUI();
  }
  function beginBuild(kind){
    if(!playing||paused||over)return;
    const f=factionData[faction];
    if(credits<price[kind]){toast('NOT ENOUGH SUPPLIES');return;}
    if(!available(kind)){const req=kind==='factory'?'BUILD A BARRACKS AND POWER FIRST':kind==='tech'?`BUILD A ${f.factory.toUpperCase()} AND POWER FIRST`:kind==='tank'?`BUILD A ${f.tech.toUpperCase()} FIRST`:kind==='infantry'?`BUILD A ${f.barracks.toUpperCase()} FIRST`:kind==='collector'?`BUILD A ${f.refinery.toUpperCase()} FIRST`:kind==='scout'?`BUILD A ${f.factory.toUpperCase()} FIRST`:kind==='defense'||kind==='barracks'?`BUILD A ${f.power.toUpperCase()} FIRST`:'BUILD A WAR FACTORY FIRST';toast(req);return;}
    credits-=price[kind];
    if(stats[kind]){
      const source=buildings.find(b=>b.team==='blue'&&((kind==='infantry'&&b.kind==='barracks')||(['scout','tank'].includes(kind)&&b.kind==='factory')||(kind==='collector'&&b.kind==='refinery')));
      production.push({kind,source,remaining:kind==='infantry'?4:kind==='collector'?7:kind==='scout'?8:12});toast(`${f[kind].toUpperCase()} QUEUED`);
    }else{placement=kind;toast(`SELECT AN OPEN LOCATION FOR ${f[kind].toUpperCase()}`);}
    refreshUI();
  }
  function toScreen(x,y){return{x:(x-camera.x)*camera.z+.5,y:(y-camera.y)*camera.z+.5};}
  function toWorld(x,y){return{x:(x/width-.5)/camera.z+camera.x,y:(y/height-.5)/camera.z+camera.y};}
  function distance(a,b){const p=toScreen(a.x,a.y),q=toScreen(b.x,b.y);return Math.hypot((p.x-q.x)*width,(p.y-q.y)*height);}
  function clampCamera(){const edge=.5/camera.z;if(edge>=.5){camera.x=.5;camera.y=.5;}else{camera.x=clamp(camera.x,edge,1-edge);camera.y=clamp(camera.y,edge,1-edge);}}
  function handleMap(e){if(!playing||paused||over)return;const r=canvas.getBoundingClientRect(),p={x:e.clientX-r.left,y:e.clientY-r.top},w=toWorld(p.x,p.y);
    if(placement){if(w.x<.025||w.x>.975||w.y<.03||w.y>.97){toast('LOCATION OUTSIDE THEATER');return;}if(buildings.some(b=>distance(b,w)<b.size+30)||units.some(u=>distance(u,w)<24)){toast('LOCATION OBSTRUCTED');return;}buildings.push(makeBuilding(placement,'blue',w.x,w.y));toast(`${factionData[faction][placement].toUpperCase()} OPERATIONAL`);placement=null;refreshUI();return;}
    const touch=e.pointerType==='touch',actors=[...enemies,...buildings,...units].map(a=>({actor:a,distance:distance(a,w)})).sort((a,b)=>a.distance-b.distance),hit=actors.find(({actor,distance:d})=>d<(actor.size||actor.radius*2||14)+(touch?24:12))?.actor;
    if(action==='move'&&selected&&selected.team==='blue'&&selected.kind!=='building'){selected.move=w;selected.target=null;selected.orderTarget=null;selected.harvesting=false;action='select';refreshUI();return;}
    if(action==='harvest'){if(selected?.kind==='collector'){const node=nodes.filter(n=>n.active).sort((a,b)=>distance(a,w)-distance(b,w))[0];if(node){selected.harvestNode=node;selected.harvesting=true;selected.move={x:node.x,y:node.y};toast('HARVEST ROUTE SET');}}else toast('SELECT A HARVESTER FIRST');action='select';refreshUI();return;}
    if(action==='attack'){if(selected&&selected.team==='blue'&&selected.kind!=='building'){if(hit?.team==='red'){selected.orderTarget=hit;selected.move={x:hit.x,y:hit.y};selected.target=hit;}else{const hq=buildings.find(b=>b.team==='red'&&b.kind==='hq');selected.orderTarget=hq||null;selected.move=w;selected.target=null;}toast('ATTACK ORDER RECEIVED');}action='select';refreshUI();return;}
    if(hit){if(hit.team==='red'){if(selected&&selected.team==='blue'&&selected.kind!=='building'){selected.target=hit;selected.move={x:hit.x,y:hit.y};}else toast('SELECT A COMBAT UNIT');}else{selected=hit;refreshUI();}return;}
    if(selected&&selected.kind!=='building'){selected.move=w;selected.target=null;selected.orderTarget=null;selected.harvesting=false;toast('ORDERS RECEIVED');}else{selected=null;refreshUI();}}
  function localPoint(e){const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};}
  function updatePointer(p){pointer=toWorld(p.x,p.y);pointer.x=clamp(pointer.x,0,1);pointer.y=clamp(pointer.y,0,1);}
  canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;e.preventDefault();const p=localPoint(e);canvas.setPointerCapture(e.pointerId);touchPoints.set(e.pointerId,p);mapGesture={id:e.pointerId,start:p,last:p,moved:false,type:e.pointerType};if(touchPoints.size===2){const pts=[...touchPoints.values()];pinch={distance:Math.max(1,Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y)),mid:{x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2}};mapGesture.moved=true;}});
  canvas.addEventListener('pointermove',e=>{const p=localPoint(e);updatePointer(p);if(!touchPoints.has(e.pointerId))return;touchPoints.set(e.pointerId,p);if(touchPoints.size>=2){const pts=[...touchPoints.values()],mid={x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2},dist=Math.max(1,Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y));if(pinch){const anchor=toWorld(pinch.mid.x,pinch.mid.y);camera.z=clamp(camera.z*dist/pinch.distance,.8,1.8);camera.x=anchor.x-(mid.x/width-.5)/camera.z;camera.y=anchor.y-(mid.y/height-.5)/camera.z;clampCamera();}pinch={distance:dist,mid};if(mapGesture)mapGesture.moved=true;return;}if(!mapGesture||mapGesture.id!==e.pointerId)return;const dx=p.x-mapGesture.last.x,dy=p.y-mapGesture.last.y;if(Math.hypot(p.x-mapGesture.start.x,p.y-mapGesture.start.y)>7)mapGesture.moved=true;if(mapGesture.moved){camera.x-=dx/(width*camera.z);camera.y-=dy/(height*camera.z);clampCamera();}mapGesture.last=p;});
  function endPointer(e,cancelled=false){if(!touchPoints.has(e.pointerId))return;const p=touchPoints.get(e.pointerId),gesture=mapGesture;touchPoints.delete(e.pointerId);if(touchPoints.size<2)pinch=null;if(gesture?.id===e.pointerId){mapGesture=null;if(!cancelled&&!gesture.moved&&touchPoints.size===0)handleMap({clientX:canvas.getBoundingClientRect().left+p.x,clientY:canvas.getBoundingClientRect().top+p.y,pointerType:gesture.type});}if(touchPoints.size===1){const [id,remaining]=[...touchPoints.entries()][0];mapGesture={id,start:remaining,last:remaining,moved:true,type:e.pointerType};}}
  canvas.addEventListener('pointerup',e=>endPointer(e));canvas.addEventListener('pointercancel',e=>endPointer(e,true));
  document.querySelectorAll('.action-card').forEach(b=>b.onclick=()=>{if(!playing)return;action=b.dataset.action;if(action!=='select')toast(action==='move'?'SELECT DESTINATION':action==='harvest'?'SELECT A HARVESTER':'SELECT HOSTILE TARGET');refreshUI();});
  document.querySelectorAll('.build-tab').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;document.querySelectorAll('.build-tab').forEach(t=>t.classList.toggle('active',t===b));renderBuilds();});
  document.querySelectorAll('.faction-option').forEach(b=>b.onclick=()=>{faction=b.dataset.faction;document.querySelectorAll('.faction-option').forEach(t=>t.classList.toggle('active',t===b));$('deploy-faction').textContent=faction.toUpperCase();$('faction-label').textContent=factionData[faction].label;$('faction-doctrine').textContent=factionData[faction].doctrine;});
  $('start-btn').onclick=()=>{ui.start.classList.add('hidden');$('faction-label').textContent=factionData[faction].label;setup();playing=true;last=performance.now();toast(`${factionData[faction].label} DEPLOYED · HARVEST AND EXPAND`);refreshUI();};
  $('pause-btn').onclick=()=>{if(!playing||over)return;paused=!paused;ui.pause.classList.toggle('hidden',!paused);$('pause-btn').textContent=paused?'▶':'Ⅱ';last=performance.now();};
  $('resume-btn').onclick=()=>$('pause-btn').click();
  $('restart-btn').onclick=$('again-btn').onclick=()=>{setup();ui.end.classList.add('hidden');ui.pause.classList.add('hidden');ui.start.classList.remove('hidden');playing=false;refreshUI();};
  $('sound-btn').onclick=e=>{e.currentTarget.classList.toggle('muted');toast(`SOUND ${e.currentTarget.classList.contains('muted')?'OFF':'ON'}`);};
  window.addEventListener('keydown',e=>{if(['INPUT','BUTTON'].includes(document.activeElement.tagName)&&e.key!=='Escape')return;if(e.key==='Escape'){if(placement){placement=null;toast('PLACEMENT CANCELLED');}else if(playing)$('pause-btn').click();}const k=e.key.toLowerCase();if(k==='q')document.querySelector('[data-action="select"]').click();if(k==='w')document.querySelector('[data-action="move"]').click();if(k==='e')document.querySelector('[data-action="attack"]').click();if(k==='r')document.querySelector('[data-action="harvest"]').click();if(['arrowup','arrowdown','arrowleft','arrowright'].includes(k)){e.preventDefault();camera.y+=k==='arrowup'?-0.04:k==='arrowdown'?.04:0;camera.x+=k==='arrowleft'?-0.04:k==='arrowright'?.04:0;clampCamera();}});
  canvas.addEventListener('wheel',e=>{e.preventDefault();const p=localPoint(e),anchor=toWorld(p.x,p.y);camera.z=clamp(camera.z*(e.deltaY<0?1.12:.9),.8,1.8);camera.x=anchor.x-(p.x/width-.5)/camera.z;camera.y=anchor.y-(p.y/height-.5)/camera.z;clampCamera();},{passive:false});
  function valid(a){return !!a&&a.hp>0&&(units.includes(a)||buildings.includes(a)||enemies.includes(a));}
  function fire(a,b){shots.push({x:a.x,y:a.y,target:b,damage:a.damage,life:.2,max:.2,color:a.team==='blue'?factionData[faction].light:'#ef7859'});a.cool=a.rate;}
  function destroy(a){if(a.kind==='hq')buildings=buildings.filter(v=>v!==a);else if(units.includes(a))units=units.filter(v=>v!==a);else if(enemies.includes(a))enemies=enemies.filter(v=>v!==a);else buildings=buildings.filter(v=>v!==a);if(selected===a)selected=null;for(let i=0;i<8;i++)particles.push({x:a.x+rand(-.02,.02),y:a.y+rand(-.02,.02),life:rand(.3,.65),max:.65,color:'#ffb958'});if(a.team==='red')toast('HOSTILE DESTROYED');}
  function spawnEnemy(){const kind=Math.random()<.66?'infantry':'tank',u=makeUnit(kind,'red',.85+rand(-.03,.06),.43+rand(-.1,.12));u.name=kind==='tank'?'Hostile Armor':'Hostile Infantry';u.hp=u.max=kind==='tank'?95:36;u.damage=kind==='tank'?13:5;u.speed=kind==='tank'?25:32;u.move={x:.13,y:.53};enemies.push(u);toast('ENEMY PATROL SPOTTED');}
  function finish(win){over=true;playing=false;ui.end.classList.remove('hidden');$('end-kicker').textContent=win?'OPERATION COMPLETE':'FIELD REPORT';$('end-title').textContent=win?'VICTORY':'DEFEAT';$('end-copy').textContent=win?'Enemy command center neutralized. The frontier is yours.':'Your command center has fallen. Regroup and try another faction.';ui.objective.classList.toggle('done',win);}
  function update(dt){if(!playing||paused||over)return;time+=dt;enemyClock-=dt;if(enemyClock<=0){spawnEnemy();enemyClock=Math.max(12,27-time*.009)+rand(-2,4);}
    for(const job of [...production]){job.remaining-=dt;if(job.remaining<=0){const {kind,source}=job;const u=makeUnit(kind,'blue',source.x+.045,source.y+.035);u.move={x:clamp(source.x+.09,.02,.98),y:clamp(source.y+.08,.02,.98)};units.push(u);production=production.filter(v=>v!==job);toast(`${u.name.toUpperCase()} READY`);}}
    for(const u of [...units,...enemies,...buildings]){if(u.hp<=0)continue;u.cool-=dt;
      const refinery=buildings.find(b=>b.team==='blue'&&b.kind==='refinery');
      if(u.kind==='collector'&&u.team==='blue'&&u.harvesting){const node=u.harvestNode;if(!node||!node.active){u.harvesting=false;u.harvestNode=null;u.move=refinery?{x:refinery.x,y:refinery.y}:null;}else if(distance(u,node)<22){u.move=null;if(u.carry<supplyCapacity){const amount=Math.min(supplyRate*dt,supplyCapacity-u.carry,node.amount);u.carry+=amount;node.amount-=amount;if(node.amount<=0){node.active=false;u.harvestNode=null;u.harvesting=false;u.move=refinery?{x:refinery.x,y:refinery.y}:null;}}else{u.harvestNode=null;u.harvesting=false;u.move=refinery?{x:refinery.x,y:refinery.y}:null;}}}
      if(u.kind==='collector'&&u.team==='blue'&&!u.harvesting&&u.carry>0&&refinery&&distance(u,refinery)<36){credits+=u.carry;u.carry=0;const node=nodes.filter(n=>n.active).sort((a,b)=>Math.hypot((a.x-u.x)*width,(a.y-u.y)*height)-Math.hypot((b.x-u.x)*width,(b.y-u.y)*height))[0];if(node){u.harvestNode=node;u.harvesting=true;u.move={x:node.x,y:node.y};}else u.move=null;}
      if(u.range>0){if(u.orderTarget&&!valid(u.orderTarget))u.orderTarget=null;if(u.target&&(!valid(u.target)||distance(u,u.target)>u.range*1.7))u.target=null;if(!u.target){let nearest=null,nd=Infinity;const candidates=u.team==='blue'?[...enemies,...buildings.filter(b=>b.team==='red')]:[...units.filter(v=>v.team==='blue'&&v.kind!=='collector'),...buildings.filter(b=>b.team==='blue')];for(const v of candidates){const d=distance(u,v);if(d<u.range&&d<nd){nearest=v;nd=d;}}if(nearest)u.target=nearest;else if(u.orderTarget&&distance(u,u.orderTarget)<=u.range*1.7)u.target=u.orderTarget;}if(u.target&&distance(u,u.target)<=u.range){if(u.cool<=0)fire(u,u.target);continue;}}
      if(units.includes(u)||enemies.includes(u)){let dest=u.move||(u.team==='red'?{x:.13,y:.53}:null);if(dest){const dx=(dest.x-u.x)*width,dy=(dest.y-u.y)*height,d=Math.hypot(dx,dy);if(d>9){const step=Math.min(d,u.speed*dt);u.x=clamp(u.x+dx/d*step/width,.01,.99);u.y=clamp(u.y+dy/d*step/height,.01,.99);}else if(u.move)u.move=null;}}
    }
    for(const s of shots){s.life-=dt;if(s.life<=0&&valid(s.target)){s.target.hp-=s.damage;particles.push({x:s.target.x,y:s.target.y,life:.32,max:.32,color:s.color});if(s.target.hp<=0)destroy(s.target);}}
    shots=shots.filter(s=>s.life>0);particles.forEach(p=>p.life-=dt);particles=particles.filter(p=>p.life>0);
    if(toastTime>0&&((toastTime-=dt)<=0))ui.toast.classList.remove('show');const enemyHQ=buildings.some(b=>b.team==='red'&&b.kind==='hq'),ownHQ=buildings.some(b=>b.team==='blue'&&b.kind==='hq');if(!enemyHQ)finish(true);else if(!ownHQ)finish(false);
    $('clock').textContent=`${String(Math.floor(time/60)).padStart(2,'0')}:${String(Math.floor(time%60)).padStart(2,'0')}`;refreshUI();}
  function draw(){if(!width||!height)return;renderer.render({faction,camera,selected,buildings,units,enemies,nodes,decor,shots,particles,placement,pointer,time});}
  function loop(now){const dt=Math.min(.05,(now-last)/1000||0);last=now;update(dt);draw();requestAnimationFrame(loop);}
  setup();window.addEventListener('resize',resize);resize();requestAnimationFrame(loop);
})();
