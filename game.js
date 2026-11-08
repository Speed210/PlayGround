(() => {
  const canvas = document.getElementById('game');
  const renderCanvas = document.createElement('canvas');
  renderCanvas.width = 480;
  renderCanvas.height = 270;
  const ctx = renderCanvas.getContext('2d');
  ctx.scale(.5, .5);
  const output = canvas.getContext('2d');
  output.imageSmoothingEnabled = false;
  const W = 960, H = 540, groundY = 409;
  const $ = id => document.getElementById(id);
  const screens = ['titleScreen','briefing','recruitScreen','gameOver','victory'];
  const missions = [
    {name:'THE OLD HIGHWAY',code:'ROUTE 01',entity:'SCP-173',threat:'LOW',desc:'Escort the carrier through the quarantine zone. Deploy agents to stop the anomalies from reaching the vehicle.'},
    {name:'DUST & STATIC',code:'ROUTE 02',entity:'SCP-049',threat:'MODERATE',desc:'A dead signal is broadcasting from the service road. Expect infected personnel and a hostile field medic.'},
    {name:'THE RED MILE',code:'ROUTE 03',entity:'SCP-096',threat:'HIGH',desc:'Keep eyes on the road and stay together. The next extraction point is beyond the old checkpoint.'},
    {name:'NIGHT SHIFT',code:'ROUTE 04',entity:'SCP-106',threat:'SEVERE',desc:'The highway ends at Site-19. One last containment push stands between the team and safety.'}
  ];
  const units = {
    agent:{name:'RIFLEMAN',role:'FIELD AGENT',icon:'◈',cost:50,hp:100,damage:16,range:245,speed:14,rate:1.05,color:'#667b61',kind:'shoot'},
    heavy:{name:'BREACHER',role:'HEAVY SUPPORT',icon:'▣',cost:90,hp:180,damage:32,range:205,speed:9,rate:1.45,color:'#89684e',kind:'shoot'},
    scout:{name:'SCOUT',role:'RAPID RESPONSE',icon:'⌁',cost:70,hp:80,damage:12,range:170,speed:28,rate:.65,color:'#7884a0',kind:'shoot'},
    'scp999':{name:'SCP-999',role:'CONTAINED ALLY',icon:'●',cost:110,hp:230,damage:26,range:58,speed:23,rate:.75,color:'#e6a544',kind:'melee'},
    'scp131':{name:'SCP-131',role:'EYE-POD PAIR',icon:'◉',cost:80,hp:125,damage:14,range:42,speed:25,rate:.7,color:'#8ec2af',kind:'melee'},
    'scp073':{name:'SCP-073',role:'CAIN / ALLY',icon:'♟',cost:135,hp:260,damage:38,range:52,speed:17,rate:1.0,color:'#91a38e',kind:'melee'}
  };
  const recruitPool = ['scp999','scp131','scp073'];
  const defaultRoster = ['agent','heavy','scout'];
  let save = loadSave();
  let state = 'title', missionIndex = Math.max(0,Math.min(missions.length-1,save.mission||0));
  let roster = [...new Set([...(save.roster||[]),...defaultRoster])];
  let credit = save.credit ?? 120, hp = 100, progress = 0, selected = null, gameTime = 0;
  let friendlies = [], hostiles = [], bullets = [], particles = [], props = [], spawnTimer = 0, kills = 0, waveNotified = false;
  let offer = null, lastTimestamp = 0, scenery = 0, shake = 0, toastTimer = 0;
  let paused = false;
  function loadSave(){try{return JSON.parse(localStorage.getItem('lastMileSave'))||{}}catch(_){return {}}}
  function saveGame(){try{localStorage.setItem('lastMileSave',JSON.stringify({mission:missionIndex,roster,credit}))}catch(_){}}
  function setScreen(name){screens.forEach(x=>$(x).classList.toggle('hidden',x!==name));$('shade').style.opacity=name==='titleScreen'?1:(name==='briefing'||name==='recruitScreen'||name==='gameOver'||name==='victory'?'.47':0)}
  function currentMission(){return missions[missionIndex]||missions[0]}
  function showBrief(){const m=currentMission();$('briefCode').textContent=m.code;$('briefTitle').textContent=m.name;$('briefText').textContent=m.desc;$('briefThreat').textContent=m.threat;$('briefEntity').textContent=m.entity;$('chapterLabel').textContent=m.code.replace('ROUTE','OPERATION');setScreen('briefing')}
  $('startBtn').onclick=showBrief;
  $('deployBtn').onclick=beginMission;
  $('retryBtn').onclick=beginMission;
  $('pauseBtn').onclick=()=>{paused=!paused;$('pausePop').classList.toggle('hidden',!paused)};
  $('resumeBtn').onclick=()=>{paused=false;$('pausePop').classList.add('hidden')};
  $('continueBtn').onclick=()=>{if(offer&&!roster.includes(offer)){roster.push(offer);showToast(`${units[offer].name} JOINED THE ROSTER`)}finishMission()};
  $('skipRecruitBtn').onclick=finishMission;
  $('victoryBtn').onclick=()=>{missionIndex=Math.min(missions.length-1,missionIndex+1);credit+=60;saveGame();showBrief()};
  function beginMission(){state='play';paused=false;$('pausePop').classList.add('hidden');$('hud').classList.remove('hidden');setScreen(null);$('hud').classList.remove('hidden');$('missionCode').textContent=currentMission().code+' / DAY';$('missionName').textContent=currentMission().name;friendlies=[];hostiles=[];bullets=[];particles=[];progress=0;hp=100;gameTime=0;kills=0;spawnTimer=1;selected=null;waveNotified=false;credit=Math.max(credit,60);renderCards();updateHud();}
  function renderCards(){const bar=$('deployBar');bar.innerHTML='';roster.forEach(type=>{const u=units[type];if(!u)return;const b=document.createElement('button');b.className='deploy-card';b.dataset.type=type;b.innerHTML=`<span class="card-icon">${u.icon}</span><b class="card-name">${u.name}</b><span class="card-role">${u.role}</span><span class="card-cost"><span>◈ ${u.cost}</span><span>DEPLOY</span></span>`;b.onclick=()=>{if(state!=='play'||paused)return;if(credit<u.cost){showToast('NOT ENOUGH SUPPLIES');return}selected=type;document.querySelectorAll('.deploy-card').forEach(x=>x.classList.toggle('selected',x===b));showToast(`TAP THE ROAD TO DEPLOY ${u.name}`)};bar.appendChild(b)});refreshCardAvailability()}
  function refreshCardAvailability(){document.querySelectorAll('.deploy-card').forEach(b=>b.classList.toggle('disabled',credit<units[b.dataset.type].cost))}
  function deploy(type,x){const u=units[type];if(!u||credit<u.cost)return;credit-=u.cost;const y=groundY-13-Math.random()*13;friendlies.push({type,x:Math.max(215,Math.min(550,x)),y,hp:u.hp,maxHp:u.hp,cd:.2+Math.random()*.5,walk:Math.random()*6,flash:0,alive:true});selected=null;document.querySelectorAll('.deploy-card').forEach(x=>x.classList.remove('selected'));refreshCardAvailability();updateHud();}
  canvas.addEventListener('pointerdown',e=>{if(state!=='play'||paused)return;const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*W/r.width;if(selected){deploy(selected,x);return}if(x>210&&x<W-35)showToast('SELECT AN OPERATIVE BELOW');});
  function spawnEnemy(){const stage=missionIndex;const roll=Math.random();let type='raider';if(stage===0)type=roll<.6?'raider':'173';else if(stage===1)type=roll<.45?'raider':roll<.78?'infected':'049';else if(stage===2)type=roll<.35?'raider':roll<.67?'infected':'096';else type=roll<.3?'raider':roll<.65?'infected':'106';const defs={raider:{name:'ROGUE GUARD',hp:70,speed:15,damage:8,color:'#866650',icon:'!',ranged:true},infected:{name:'INFECTED',hp:95,speed:20,damage:11,color:'#657451',icon:'†',ranged:false},'173':{name:'SCP-173',hp:220,speed:34,damage:22,color:'#b28678',icon:'◉',ranged:false},'049':{name:'SCP-049',hp:200,speed:18,damage:18,color:'#282e30',icon:'♟',ranged:false},'096':{name:'SCP-096',hp:250,speed:38,damage:26,color:'#c4b8a4',icon:'!',ranged:false},'106':{name:'SCP-106',hp:280,speed:13,damage:30,color:'#3b3939',icon:'◉',ranged:true}};const d=defs[type];const scale=1+missionIndex*.24;hostiles.push({type,...d,hp:d.hp*scale,maxHp:d.hp*scale,x:W+20,y:groundY-12-Math.random()*15,cd:.3+Math.random(),walk:Math.random()*7,flash:0,alive:true})}
  function nearestTarget(unit){let best=null,dist=Infinity;hostiles.forEach(e=>{if(!e.alive)return;const d=e.x-unit.x;if(d>=-15&&d<dist){dist=d;best=e}});return best&&dist<=units[unit.type].range?best:null}
  function tick(dt){if(state!=='play'||paused)return;gameTime+=dt;progress=Math.min(1,gameTime/66);scenery+=dt*(26+progress*20);if(shake>0)shake=Math.max(0,shake-dt*20);spawnTimer-=dt;const interval=Math.max(.82,2.4-missionIndex*.24-progress*.6);if(spawnTimer<=0){spawnEnemy();spawnTimer=interval*(.65+Math.random()*.7)}if(progress>.34&&!waveNotified){waveNotified=true;$('waveAlert').classList.remove('hidden');setTimeout(()=>$('waveAlert').classList.add('hidden'),2400)}
    friendlies.forEach(a=>{if(!a.alive)return;a.walk+=dt*6;a.flash=Math.max(0,a.flash-dt);const def=units[a.type],target=nearestTarget(a);if(target){a.cd-=dt;if(a.cd<=0){a.cd=def.rate;if(def.kind==='melee'){target.hp-=def.damage;target.flash=.12;spawnParticles(target.x,target.y-15,'#e7d087',4);if(Math.abs(target.x-a.x)<55)target.x+=8}else{bullets.push({x:a.x+14,y:a.y-24,target,damage:def.damage,speed:360,color:a.type==='heavy'?'#ffbf6f':'#e6d994'});a.flash=.09}}}else if(a.x<735)a.x+=def.speed*dt;});
    hostiles.forEach(e=>{if(!e.alive)return;e.walk+=dt*6;e.flash=Math.max(0,e.flash-dt);const target=friendlies.filter(a=>a.alive&&a.x<e.x+35).sort((a,b)=>Math.abs(a.x-e.x)-Math.abs(b.x-e.x))[0];if(target&&e.x-target.x<50){e.cd-=dt;if(e.cd<=0){e.cd=.85;e.flash=.1;target.hp-=e.damage;spawnParticles(target.x,target.y-15,'#d76852',5);shake=3;if(target.hp<=0){target.alive=false;spawnParticles(target.x,target.y-15,'#d76852',12)}}}else if(e.x>174)e.x-=e.speed*dt;else{e.cd-=dt;if(e.cd<=0){e.cd=.9;hp-=e.damage*.32;shake=7;spawnParticles(189,groundY-22,'#d76852',9)}}if(e.hp<=0&&e.alive){e.alive=false;kills++;credit+=e.type==='raider'?7:12;spawnParticles(e.x,e.y-16,'#c7ab7b',12);refreshCardAvailability()}});
    bullets.forEach(b=>{if(!b.target||!b.target.alive){b.dead=true;return}const dx=b.target.x-b.x,dy=b.target.y-24-b.y,dist=Math.hypot(dx,dy);if(dist<b.speed*dt+7){b.target.hp-=b.damage;b.target.flash=.1;spawnParticles(b.target.x,b.target.y-23,b.color,3);b.dead=true}else{b.x+=dx/dist*b.speed*dt;b.y+=dy/dist*b.speed*dt}});bullets=bullets.filter(b=>!b.dead);friendlies=friendlies.filter(a=>a.alive);hostiles=hostiles.filter(e=>e.alive);particles.forEach(p=>{p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=65*dt});particles=particles.filter(p=>p.life>0);if(hp<=0){hp=0;endGame(false)}if(progress>=1)endGame(true);updateHud();}
  function updateHud(){ $('routeFill').style.width=`${Math.round(progress*100)}%`; $('routePercent').textContent=`${Math.round(progress*100)}%`; $('healthText').textContent=`${Math.round(hp)}%`;$('healthFill').style.width=`${hp}%`;$('healthFill').style.background=hp<35?'#dc614a':'#c0d26c';$('creditText').textContent=credit;refreshCardAvailability() }
  function endGame(won){if(state!=='play')return;state=won?'win':'lost';$('hud').classList.add('hidden');if(won){credit+=120;saveGame();offer=recruitPool.find(x=>!roster.includes(x))||recruitPool[missionIndex%recruitPool.length];const u=units[offer];$('recruitTitle').textContent='ANOMALY CONTAINED';$('recruitCopy').textContent='The extraction team recovered a cooperative anomaly. Add it to your field roster for the next operation.';$('recruitCard').innerHTML=`<div class="recruit-avatar">${u.icon}</div><div><div class="tag">RECRUITABLE SCP</div><h3>${u.name}</h3><p>${u.role} · ${u.hp} VITALITY · ${u.damage} IMPACT<br>Deployment cost: ◈ ${u.cost}</p></div>`;$('victoryBtn').innerHTML=missionIndex>=missions.length-1?'REPLAY FINAL ROUTE <span>↻</span>':'NEXT OPERATION <span>→</span>';setScreen('recruitScreen')}else setScreen('gameOver')}
  function finishMission(){state='brief';$('hud').classList.add('hidden');if(missionIndex>=missions.length-1){saveGame();setScreen('victory')}else{missionIndex++;saveGame();showBrief()}}
  function showToast(text){$('toast').textContent=text;$('toast').classList.remove('hidden');toastTimer=1.8}
  function spawnParticles(x,y,color,n){for(let i=0;i<n;i++)particles.push({x,y,vx:(Math.random()-.5)*95,vy:(Math.random()-.8)*90,life:.25+Math.random()*.38,color,r:1+Math.random()*2.2})}
  // Canvas art is intentionally drawn from simple original shapes—no external assets required.
  function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(x,y,w,h)}
  function line(x1,y1,x2,y2,c,w=1){ctx.strokeStyle=c;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()}
  function circle(x,y,r,c){ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()}
  function drawBackground(){
    // Flat dusk sky and layered scrubland keep the roadside readable at a glance.
    rect(0,0,W,157,'#9b9b84');rect(0,157,W,86,'#b3a98d');rect(0,243,W,63,'#747865');
    rect(0,0,W,70,'#929787');rect(0,70,W,7,'#a09e87');
    // Blocky clouds and distant hills.
    for(let i=0;i<6;i++){const x=((i*211-(scenery*.08)%250)+W)%W,y=49+(i%3)*26;rect(x,y,54,8,'#b6ad94');rect(x+12,y-7,35,7,'#b6ad94');rect(x+5,y+8,43,5,'#aba58d')}
    for(let i=0;i<5;i++){const x=((i*245-(scenery*.12)%310)+W)%W;rect(x,192,145,48,'#858873');rect(x+17,179,93,13,'#858873');rect(x+38,169,61,10,'#858873')}
    // Sparse roadside trees and low scrub, drawn in stepped silhouettes.
    for(let i=0;i<18;i++){const x=((i*83-(scenery*.2)%166)+W*2)%W,h=40+(i*29%55),y=248-h;rect(x+15,y,8,h,'#555d50');rect(x,y+17,39,12,'#586151');rect(x+7,y,27,17,'#586151');rect(x+13,y-12,16,13,'#626956');rect(x-5,y+28,49,11,'#626956')}
    // Abandoned roadside buildings and a faded checkpoint sign.
    for(let i=0;i<4;i++){const x=((i*310-(scenery*.32)%340)+W)%W;rect(x,252,58,48,'#817f6d');rect(x+6,244,45,8,'#777967');rect(x+8,260,15,23,'#4c5349');rect(x+34,263,15,12,'#51574b');rect(x+25,281,8,19,'#696c5b');rect(x-7,299,72,4,'#626656')}
    const signX=((705-(scenery*.32)%1020)+W)%W;rect(signX,225,5,57,'#565b4f');rect(signX-20,219,47,24,'#85826c');rect(signX-14,225,34,3,'#b7ad8a');rect(signX-14,232,25,3,'#b7ad8a');
    // Shoulder, asphalt, painted lane marks and broken edge line.
    rect(0,306,W,103,'#747562');rect(0,323,W,86,'#626657');rect(0,337,W,72,'#454a45');rect(0,343,W,4,'#a59b7d');rect(0,397,W,5,'#b5a886');
    for(let x=-70;x<W+70;x+=112){const xx=x-(scenery%112);rect(xx,370,53,4,'#c5b894');rect(xx+3,411,45,4,'#41443c')}
    // Utility poles recede into the haze.
    for(let i=0;i<4;i++){const x=((i*280-(scenery*.6)%280)+W)%W;rect(x,207,5,111,'#55584d');rect(x-28,216,62,5,'#55584d');rect(x-22,211,4,9,'#55584d');rect(x+23,211,4,9,'#55584d');rect(x-20,218,2,65,'#666957')}
    // Sparse pixel-sized gravel in the near verge.
    for(let i=0;i<42;i++){const x=(i*89-(scenery*1.1)%90+W)%W,y=416+(i*41%120);rect(x,y,3,2,i%3?'#8a8064':'#77775f')}
  }
  function drawVan(){// block-built armored extraction carrier
    const x=58,y=317;ctx.save();
    rect(x+8,405,138,8,'#343a34');
    // Stepped roof and square armored shell.
    rect(x-5,y+28,154,45,'#4d5b4e');rect(x+4,y+17,138,12,'#4d5b4e');rect(x+25,y+4,98,14,'#4d5b4e');
    rect(x+10,y+29,20,32,'#38453e');rect(x+37,y+20,50,37,'#596757');rect(x+93,y+20,26,34,'#303b35');rect(x+122,y+34,20,27,'#39473d');
    // Windshield, side window, containment mark and lamps.
    rect(x+29,y+9,26,20,'#a4a890');rect(x+57,y+22,27,4,'#788270');rect(x+67,y+32,21,4,'#d5cfad');
    rect(x+73,y+39,13,13,'#d3cba8');rect(x+77,y+43,5,5,'#52634f');rect(x-5,y+56,10,8,'#d6a06d');rect(x+133,y+55,12,8,'#c87958');
    rect(x-10,y+68,161,8,'#272d29');rect(x+1,y+72,29,5,'#171c19');rect(x+112,y+72,29,5,'#171c19');
    // Square wheel wells and chunky tires.
    rect(x+14,y+64,29,22,'#202622');rect(x+104,y+64,29,22,'#202622');rect(x+20,y+68,16,14,'#777c6b');rect(x+110,y+68,16,14,'#777c6b');
    rect(x+24,y+71,8,8,'#363d36');rect(x+114,y+71,8,8,'#363d36');
    rect(x+34,y-2,47,6,'#303a35');rect(x+47,y-8,23,7,'#cf744c');rect(x+10,y+51,18,4,'#c28b56');ctx.restore();
  }
  function drawAgent(a){const u=units[a.type];const bob=Math.sin(a.walk)*2;const x=a.x,y=a.y+bob;ctx.save();ctx.translate(x,y);if(a.flash>0)ctx.globalAlpha=.6;
    // legs
    line(-5,0,-8,-16,'#252e29',5);line(6,0,9,-15,'#252e29',5);rect(-12,-2,9,4,'#1b211e');rect(5,-2,10,4,'#1b211e');
    // backpack and body
    rect(-12,-37,9,23,'#39483e');rect(-10,-39,23,25,u.color);rect(-9,-42,24,7,'#7c8470');rect(-8,-28,20,5,'#353d36');
    // head and helmet
    circle(1,-47,8,'#ba9b7a');rect(-9,-56,19,6,'#303a34');rect(-8,-53,18,3,'#9b7955');rect(5,-48,5,3,'#222927');
    // rifle
    line(7,-29,24,-33,'#202725',4);line(21,-34,29,-35,'#9ba092',2);rect(10,-33,6,3,'#b07b50');
    if(a.type==='heavy'){circle(-17,-34,3,'#c68053');rect(-16,-37,7,9,'#525e51')}
    // shoulder insignia
    circle(-7,-33,3,'#d9ded0');circle(-7,-33,1,'#647b68');if(a.flash>0)rect(17,-39,3,3,'#fff2a9');ctx.restore();
    if(a.hp<a.maxHp){rect(x-13,y-64,28,3,'#26312c');rect(x-13,y-64,28*Math.max(0,a.hp/a.maxHp),3,'#acc874')}
  }
  function drawSCP(a){const x=a.x,y=a.y+Math.sin(a.walk)*2;ctx.save();ctx.translate(x,y);if(a.type==='scp999'){ctx.fillStyle='#e99a3f';ctx.beginPath();ctx.ellipse(0,-20,19,19,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#f6c26c';ctx.beginPath();ctx.ellipse(4,-23,10,8,0,0,Math.PI*2);ctx.fill();circle(-5,-25,2,'#222');circle(5,-25,2,'#222');ctx.strokeStyle='#754728';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,-19,5,.1,2.8);ctx.stroke();circle(-14,-14,6,'#e99a3f');circle(14,-14,6,'#e99a3f')}
    else if(a.type==='scp131'){circle(-7,-17,13,'#d59d55');circle(9,-17,12,'#71a995');circle(-8,-20,5,'#f3edc8');circle(8,-20,5,'#f3edc8');circle(-7,-20,2,'#26312c');circle(9,-20,2,'#26312c');rect(-13,-3,10,4,'#3f5147');rect(6,-3,11,4,'#3f5147')}
    else {rect(-8,-46,17,42,'#85775c');circle(0,-50,9,'#bea47a');rect(-12,-55,25,4,'#d1c3a1');rect(-14,-36,8,4,'#b9a783');rect(6,-35,12,5,'#927d60');rect(-13,-4,9,5,'#272e2a');rect(5,-4,10,5,'#272e2a');line(-4,-41,5,-41,'#292f2b',2)}ctx.restore();if(a.hp<a.maxHp){rect(x-13,y-63,27,3,'#26312c');rect(x-13,y-63,27*Math.max(0,a.hp/a.maxHp),3,'#acc874')}}
  function drawEnemy(e){const x=e.x,y=e.y+Math.sin(e.walk)*2;ctx.save();ctx.translate(x,y);if(e.flash>0)ctx.globalAlpha=.55;if(e.type==='173'){rect(-16,-43,32,40,'#b98d7e');rect(-19,-38,5,20,'#967268');rect(14,-40,6,23,'#9e7a70');circle(-5,-48,10,'#b98d7e');circle(7,-47,9,'#b98d7e');circle(-5,-50,2,'#392c2d');circle(7,-49,2,'#392c2d');rect(-16,-5,12,6,'#4e4b45');rect(6,-5,13,6,'#4e4b45');line(-10,-39,10,-29,'#ddc1a1',2)}else if(e.type==='049'){rect(-11,-43,23,39,'#252d30');circle(0,-49,10,'#252d30');rect(-8,-53,15,7,'#111819');ctx.fillStyle='#555b58';ctx.beginPath();ctx.moveTo(-8,-42);line(-4,-39,-23,-10,'#252d30',5);line(8,-39,19,-10,'#252d30',5);rect(-13,-4,9,4,'#111819');rect(5,-4,10,4,'#111819');line(2,-48,5,-48,'#b67753',2)}else if(e.type==='096'){rect(-11,-40,22,37,'#b6ad98');circle(0,-47,9,'#c2b9a5');line(-3,-39,-14,-13,'#c2b9a5',4);line(5,-38,16,-14,'#c2b9a5',4);rect(-13,-5,10,5,'#666057');rect(5,-5,10,5,'#666057');line(-4,-48,4,-48,'#55483f',1)}else if(e.type==='106'){rect(-13,-42,26,38,'#41413d');circle(0,-48,10,'#4a4842');rect(-11,-53,20,5,'#363835');circle(-4,-48,2,'#c18a64');line(-9,-39,-17,-10,'#393a36',6);line(9,-39,20,-11,'#393a36',6);rect(-14,-5,11,5,'#252927');rect(7,-5,11,5,'#252927')}else{rect(-10,-39,21,35,e.type==='infected'?'#64764e':'#79624b');circle(0,-47,9,e.type==='infected'?'#9a967c':'#b29a7a');rect(-8,-54,17,6,'#414943');rect(-6,-48,13,3,'#433c35');line(-7,-34,-13,-10,e.type==='infected'?'#66764d':'#79624b',5);line(8,-34,16,-14,e.type==='infected'?'#66764d':'#79624b',5);rect(-12,-5,10,5,'#282e2a');rect(7,-5,10,5,'#282e2a');if(e.type==='infected'){circle(-3,-47,1.5,'#c3c072');circle(4,-47,1.5,'#c3c072')}else{line(5,-30,18,-34,'#343a36',3)}}ctx.restore();if(e.hp<e.maxHp){rect(x-17,y-65,34,4,'#272c28');rect(x-17,y-65,34*Math.max(0,e.hp/e.maxHp),4,'#d36d50')} }
  function draw(){ctx.save();if(shake>0)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);drawBackground();drawVan();friendlies.forEach(a=>a.type.startsWith('scp')?drawSCP(a):drawAgent(a));hostiles.forEach(drawEnemy);bullets.forEach(b=>{circle(b.x,b.y,3,b.color);circle(b.x,b.y,1,'#fff4bd')});particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life/.6);circle(p.x,p.y,p.r,p.color)});ctx.globalAlpha=1;
    // Overlay route atmosphere
    ctx.restore();output.clearRect(0,0,W,H);output.drawImage(renderCanvas,0,0,W,H);}
  function frame(t){const dt=Math.min(.045,(t-lastTimestamp)/1000||0);lastTimestamp=t;if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)$('toast').classList.add('hidden')}tick(dt);draw();requestAnimationFrame(frame)}
  // Initial state and UI
  showBriefOnFirstRun();renderCards();requestAnimationFrame(frame);
  function showBriefOnFirstRun(){setScreen('titleScreen');$('hud').classList.add('hidden');$('chapterLabel').textContent=`OPERATION ${String(missionIndex+1).padStart(2,'0')}`}
})();
