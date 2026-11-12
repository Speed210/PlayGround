(() => {
  const canvas = document.getElementById('battlefield');
  const ctx = canvas.getContext('2d');
  const $ = (id) => document.getElementById(id);
  const ui = {credits:$('credits'),income:$('income'),power:$('power'),army:$('army-count'),type:$('selection-type'),name:$('selection-name'),icon:$('selection-icon'),health:$('selection-health'),toast:$('toast'),start:$('start-screen'),pause:$('pause-screen'),end:$('end-screen'),objective:$('objective-card')};
  const W=1200,H=800;
  let width=0,height=0,dpr=1,playing=false,paused=false,over=false,credits=2400,time=0,last=0,toastTimer=0,action='select',selected=null,shots=[],particles=[],shake=0,drawScheduled=false;
  const rand=(a,b)=>a+Math.random()*(b-a), clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const ownHQ={id:'own-hq',kind:'building',team:'blue',type:'Command Post',name:'FOB ANVIL',x:.16,y:.62,hp:100,max:100,size:45,range:0};
  const enemyHQ={id:'enemy-hq',kind:'building',team:'red',type:'Enemy Command',name:'HOSTILE HQ',x:.84,y:.33,hp:100,max:100,size:48,range:0};
  let units=[],enemies=[],decor=[],crates=[],nextEnemy=10,serial=0;
  const specs={infantry:{name:'Rifle Squad',type:'Infantry',icon:'♟',cost:450,hp:32,speed:45,range:118,damage:6,rate:.8,radius:8},tank:{name:'Strike Tank',type:'Armor',icon:'▰',cost:900,hp:95,speed:34,range:155,damage:17,rate:1.35,radius:13},scout:{name:'Scout Buggy',type:'Recon',icon:'◈',cost:650,hp:55,speed:63,range:110,damage:8,rate:.72,radius:11}};
  function resize(){const r=canvas.getBoundingClientRect();width=r.width;height=r.height;dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);draw()}
  function setup(){units=[];enemies=[];shots=[];particles=[];crates=[];credits=2400;time=0;nextEnemy=10;serial=0;over=false;paused=false;action='select';selected=ownHQ;ownHQ.hp=100;enemyHQ.hp=100;
    for(let i=0;i<3;i++)addUnit('infantry',.22+i*.035,.67+(i%2)*.045,false);
    createDecor();refreshUI();}
  function createDecor(){decor=[];let seed=29481;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
    for(let i=0;i<260;i++){const x=random(),y=random();if(Math.abs(x-.16)<.1&&Math.abs(y-.62)<.11||Math.abs(x-.84)<.1&&Math.abs(y-.33)<.11)continue;decor.push({x,y,r:2+random()*11,kind:random()<.63?'bush':'rock',tone:random(),rot:random()});}
    for(let i=0;i<17;i++)crates.push({x:rand(.26,.75),y:rand(.18,.79),r:6,active:true});
  }
  function addUnit(kind,x,y,announce=true){const s=specs[kind];const u={id:'u'+(++serial),kind,team:'blue',name:s.name,type:s.type,icon:s.icon,x:clamp(x,.04,.96),y:clamp(y,.08,.92),hp:s.hp,max:s.hp,speed:s.speed,range:s.range,damage:s.damage,rate:s.rate,radius:s.radius,cool:rand(.1,.6),target:null,move:null};units.push(u);if(announce)toast(s.name+' DEPLOYED');refreshUI();return u}
  function spawn(kind){if(!playing||paused||over)return;const s=specs[kind];if(credits<s.cost){toast('INSUFFICIENT CREDITS');return}credits-=s.cost;addUnit(kind,.205+rand(-.025,.035),.69+rand(-.04,.05));}
  function toast(text){ui.toast.textContent=text;ui.toast.classList.add('show');toastTimer=2.2}
  function refreshUI(){ui.credits.textContent=Math.floor(credits).toLocaleString();ui.income.textContent='+12/s';ui.army.textContent=String(units.length).padStart(2,'0');document.querySelectorAll('.build-card').forEach(b=>b.disabled=credits<specs[b.dataset.unit].cost||!playing||paused||over);
    const s=selected;if(!s){ui.type.textContent='BATTLE GROUP';ui.name.textContent='No selection';ui.icon.textContent='⌖';ui.health.style.width='0%'}else{ui.type.textContent=s.type||'UNIT';ui.name.textContent=s.name;ui.icon.textContent=s.icon||'⌂';ui.health.style.width=(100*s.hp/s.max)+'%';ui.health.style.background=s.hp/s.max<.3?'#df6451':'#c8f05b'}
    document.querySelectorAll('.action-card').forEach(b=>b.classList.toggle('selected-action',b.dataset.action===action));}
  function pos(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height}}
  function dist(a,b){const dx=(a.x-b.x)*width,dy=(a.y-b.y)*height;return Math.hypot(dx,dy)}
  function onPointer(e){if(!playing||paused||over)return;const p=pos(e);let hit=null;
    for(const a of [...enemies,enemyHQ,...units,ownHQ].reverse()){if(dist(p,a)<(a.size||a.radius*2||14)+12){hit=a;break}}
    if(action==='move'&&selected&&selected.kind!=='building'){selected.move=p;selected.target=null;action='select';refreshUI();return}
    if(action==='attack'&&selected&&selected.kind!=='building'){if(hit&&hit.team==='red'){selected.target=hit;selected.move=null}else{selected.target=enemyHQ;selected.move=p}action='select';refreshUI();return}
    if(hit){if(hit===enemyHQ&&selected&&selected.team==='blue'&&selected.kind!=='building'){selected.target=enemyHQ;selected.move=null;toast('HOSTILE HQ TARGETED');return}if(hit.team==='blue'){selected=hit;refreshUI()}else if(selected&&selected.kind!=='building'){selected.target=hit;selected.move=null;toast('TARGET ACQUIRED')}return}
    if(selected&&selected.kind!=='building'){selected.move=p;selected.target=null;toast('ORDERS RECEIVED')}
  }
  canvas.addEventListener('pointerdown',onPointer);
  document.querySelectorAll('.build-card').forEach(b=>b.addEventListener('click',()=>spawn(b.dataset.unit)));
  document.querySelectorAll('.action-card').forEach(b=>b.addEventListener('click',()=>{if(!playing)return;action=b.dataset.action;if(action!=='select')toast(action==='move'?'SELECT DESTINATION':'SELECT HOSTILE TARGET');refreshUI()}));
  $('start-btn').onclick=()=>{ui.start.classList.add('hidden');playing=true;last=performance.now();toast('FOOTHOLD ESTABLISHED · MOVE OUT');refreshUI()};
  $('pause-btn').onclick=()=>{if(!playing||over)return;paused=!paused;ui.pause.classList.toggle('hidden',!paused);$('pause-btn').textContent=paused?'▶':'Ⅱ';last=performance.now()};
  $('resume-btn').onclick=()=>{paused=false;ui.pause.classList.add('hidden');$('pause-btn').textContent='Ⅱ';last=performance.now()};
  $('restart-btn').onclick=$('again-btn').onclick=()=>{setup();ui.end.classList.add('hidden');ui.pause.classList.add('hidden');ui.start.classList.remove('hidden');playing=false;refreshUI()};
  $('sound-btn').onclick=(e)=>{e.currentTarget.classList.toggle('muted');toast('SOUND EFFECTS '+(e.currentTarget.classList.contains('muted')?'OFF':'ON'))};
  window.addEventListener('keydown',e=>{if(e.key==='Escape'||e.key===' '){e.preventDefault();$('pause-btn').click()}if(e.key==='1')document.querySelector('[data-action="select"]').click();if(e.key==='2')document.querySelector('[data-action="move"]').click();if(e.key==='3')document.querySelector('[data-action="attack"]').click()});
  function shoot(a,b,damage){shots.push({x:a.x,y:a.y,tx:b.x,ty:b.y,target:b,damage,life:.22,max:.22,color:a.team==='blue'?'#d5ee83':'#fb7852'});a.cool=a.rate||1;}
  function update(dt){if(!playing||paused||over)return;time+=dt;credits=Math.min(99999,credits+12*dt);nextEnemy-=dt;if(nextEnemy<=0){spawnEnemy();nextEnemy=Math.max(7,14-time*.012)+rand(-2,2)}
    for(const u of [...units,...enemies]){u.cool-=dt;if(u.target&&(!valid(u.target)||dist(u,u.target)>u.range*1.35))u.target=null;
      if(!u.target){let nearest=null,nd=Infinity;const candidates=u.team==='blue'?[...enemies,enemyHQ]:[...units,ownHQ];for(const v of candidates){const d=dist(u,v);if(d<u.range&&d<nd){nearest=v;nd=d}}if(nearest)u.target=nearest}
      if(u.target&&dist(u,u.target)<u.range){if(u.cool<=0)shoot(u,u.target,u.damage);continue}
      const target=u.move||(u.target?{x:u.target.x,y:u.target.y}:null);if(target){const dx=(target.x-u.x)*width,dy=(target.y-u.y)*height,d=Math.hypot(dx,dy);if(d>9){const step=Math.min(d,u.speed*dt);u.x+=dx/d*step/width;u.y+=dy/d*step/height}else if(u.move)u.move=null}
      if(u.team==='red'&&!u.target&&!u.move){u.move={x:.17,y:.62}}
    }
    for(const s of shots){s.life-=dt;if(s.life<=0&&valid(s.target)){s.target.hp-=s.damage;particles.push({x:s.tx,y:s.ty,life:.3,max:.3,color:s.color});shake=Math.max(shake,.7);if(s.target.hp<=0)destroy(s.target)}}shots=shots.filter(s=>s.life>0);
    for(const p of particles)p.life-=dt;particles=particles.filter(p=>p.life>0);
    crates.forEach(c=>{if(!c.active)return;for(const u of units){if(dist(u,c)<16){c.active=false;credits+=250;toast('SUPPLY CACHE SECURED  +$250');break}}});
    if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)ui.toast.classList.remove('show')}shake=Math.max(0,shake-dt*3);refreshUI();if(ownHQ.hp<=0)finish(false);if(enemyHQ.hp<=0)finish(true);
  }
  function valid(a){return a&&a.hp>0&&(a===ownHQ||a===enemyHQ||units.includes(a)||enemies.includes(a))}
  function destroy(a){if(a===enemyHQ){a.hp=0;return}const i=units.indexOf(a);if(i>=0){units.splice(i,1);if(selected===a)selected=ownHQ}else{const j=enemies.indexOf(a);if(j>=0){enemies.splice(j,1);credits+=90;}}for(let k=0;k<8;k++)particles.push({x:a.x+rand(-.012,.012),y:a.y+rand(-.012,.012),life:rand(.3,.7),max:.7,color:'#ffb958'});if(a.team==='red')toast('HOSTILE UNIT ELIMINATED  +$90')}
  function spawnEnemy(){const kind=Math.random()<.66?'infantry':'tank';const s=kind==='tank'?{hp:56,range:128,damage:9,rate:1.3,speed:25,radius:12}:{hp:28,range:105,damage:5,rate:1,speed:31,radius:8};enemies.push({id:'e'+(++serial),team:'red',kind,name:kind==='tank'?'Raider Armor':'Hostile Infantry',type:kind==='tank'?'Armor':'Infantry',icon:kind==='tank'?'▰':'♟',x:.78+rand(-.04,.07),y:.29+rand(-.08,.12),hp:s.hp,max:s.hp,speed:s.speed,range:s.range,damage:s.damage,rate:s.rate,radius:s.radius,cool:rand(.5,1.3),target:null,move:{x:.17,y:.62}});toast('HOSTILE REINFORCEMENTS INBOUND')}
  function finish(win){over=true;playing=false;ui.end.classList.remove('hidden');$('end-kicker').textContent=win?'OPERATION COMPLETE':'FIELD REPORT';$('end-title').textContent=win?'VICTORY':'DEFEAT';$('end-copy').textContent=win?'Enemy command post neutralized. The basin is under our control.':'Your command post has fallen. Regroup and try a new approach.';ui.objective.classList.toggle('done',win)}
  function draw(){if(!width||!height)return;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);ctx.save();if(shake)ctx.translate(rand(-shake,shake),rand(-shake,shake));ctx.scale(width,height);
    // baked desert map
    const grd=ctx.createLinearGradient(0,0,1,1);grd.addColorStop(0,'#817d5c');grd.addColorStop(.48,'#a3986d');grd.addColorStop(1,'#737654');ctx.fillStyle=grd;ctx.fillRect(0,0,1,1);
    // windblown sand bands
    for(let i=0;i<13;i++){const y=(i*.091+((time*.001)%1)*.025)%1;ctx.beginPath();ctx.moveTo(0,y);ctx.bezierCurveTo(.29,y-.04,.57,y+.04,1,y-.015);ctx.lineTo(1,y+.036);ctx.bezierCurveTo(.59,y+.07,.3,y+.01,0,y+.045);ctx.closePath();ctx.fillStyle=i%2?'#b4a77912':'#494e3710';ctx.fill()}
    // broken asphalt road
    ctx.save();ctx.translate(.49,.53);ctx.rotate(-.43);ctx.fillStyle='#504f42';ctx.fillRect(-.105,-.75,.21,1.5);ctx.fillStyle='#77735c';ctx.fillRect(-.092,-.75,.184,1.5);ctx.setLineDash([.018,.025]);ctx.strokeStyle='#c2b47b8a';ctx.lineWidth=.004;ctx.beginPath();ctx.moveTo(0,-.8);ctx.lineTo(0,.8);ctx.stroke();ctx.restore();
    for(const d of decor){if(d.kind==='bush'){ctx.fillStyle=d.tone>.5?'#4b5538':'#59603b';ctx.beginPath();ctx.ellipse(d.x,d.y,d.r/width,d.r/height*.55,d.rot,0,Math.PI*2);ctx.fill();ctx.fillStyle='#77805055';ctx.beginPath();ctx.ellipse(d.x-.004,d.y-.004,d.r/width*.44,d.r/height*.22,0,0,Math.PI*2);ctx.fill()}else{ctx.fillStyle=d.tone>.5?'#5c5948':'#79735a';ctx.beginPath();ctx.ellipse(d.x,d.y,d.r/width,d.r/height*.65,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#c8b98944';ctx.fillRect(d.x-.003,d.y-.004,.009,.003)}}
    for(const c of crates)if(c.active)drawCrate(c);
    drawBuilding(ownHQ);drawBuilding(enemyHQ);units.forEach(drawUnit);enemies.forEach(drawUnit);drawShots();drawParticles();
    // light topography lines
    ctx.globalAlpha=.12;ctx.strokeStyle='#eff0c8';ctx.lineWidth=.001;for(let i=0;i<7;i++){ctx.beginPath();ctx.ellipse(.5+i*.03,.5-i*.018,.14+i*.018,.06+i*.01,-.4,0,Math.PI*2);ctx.stroke()}ctx.globalAlpha=1;
    ctx.restore();
  }
  function drawBuilding(b){const x=b.x,y=b.y,s=b.size/width;ctx.save();ctx.translate(x,y);ctx.scale(1,width/height);ctx.translate(-x,-y);if(b.team==='blue'){
      ctx.fillStyle='#252e29';ctx.fillRect(x-s*1.3,y-s*.72,s*2.6,s*1.44);ctx.fillStyle='#747a68';ctx.fillRect(x-s,y-s*.58,s*2,s*1.16);ctx.fillStyle='#353e36';ctx.fillRect(x-s*.72,y-s*.88,s*1.38,s*.5);ctx.fillStyle='#a1a48b';ctx.fillRect(x-s*.62,y-s*.8,s*.85,s*.24);ctx.fillStyle='#596958';ctx.fillRect(x+s*.36,y-s*.44,s*.56,s*.88);ctx.fillStyle='#9eae83';ctx.fillRect(x-s*.98,y+s*.68,s*.46,s*.08);ctx.fillStyle='#cfeb75';ctx.fillRect(x-s*.91,y+s*.64,s*.03,s*.06);
    }else{ctx.fillStyle='#342c27';ctx.fillRect(x-s*1.26,y-s*.72,s*2.52,s*1.44);ctx.fillStyle='#71624e';ctx.fillRect(x-s,y-s*.57,s*2,s*1.14);ctx.fillStyle='#4b3b32';ctx.fillRect(x-s*.63,y-s*.91,s*1.25,s*.44);ctx.fillStyle='#a28868';ctx.fillRect(x-s*.53,y-s*.79,s*.95,s*.2);ctx.fillStyle='#5b4940';ctx.fillRect(x+s*.37,y-s*.45,s*.5,s*.9);ctx.fillStyle='#da755b';ctx.fillRect(x-s*.22,y-s*.99,s*.04,s*.28);ctx.fillStyle='#c95d4d';ctx.beginPath();ctx.moveTo(x-s*.18,y-s*.96);ctx.lineTo(x+s*.18,y-s*.9);ctx.lineTo(x-s*.18,y-s*.84);ctx.fill();}
    // shadows, antenna, health
    ctx.fillStyle='#0004';ctx.beginPath();ctx.ellipse(x+s*.13,y+s*.86,s*1.35,s*.28,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#303c34';ctx.fillRect(x-s*.08,y-s*1.05,s*.045,s*.47);ctx.strokeStyle=b.team==='blue'?'#d2ef77':'#e98a67';ctx.lineWidth=.002;ctx.beginPath();ctx.moveTo(x-s*.08,y-s*.94);ctx.lineTo(x-s*.22,y-s*.82);ctx.moveTo(x-s*.08,y-s*.94);ctx.lineTo(x+s*.1,y-s*.84);ctx.stroke();
    if(selected===b){ctx.strokeStyle='#d2f179';ctx.lineWidth=.0025;ctx.setLineDash([.009,.008]);ctx.strokeRect(x-s*1.42,y-s*1.14,s*2.84,s*2.3);ctx.setLineDash([])}healthBar(b,x,y-s*1.23,s*2.3);ctx.restore();
  }
  function drawUnit(u){const x=u.x,y=u.y,r=u.radius/width;const selectedUnit=selected===u;ctx.fillStyle='#0005';ctx.beginPath();ctx.ellipse(x+r*.2,y+r*.7,r*1.5,r*.64,0,0,Math.PI*2);ctx.fill();
    if(u.kind==='infantry'){for(let i=0;i<4;i++){const ox=(i%2-.5)*r*.9,oy=(Math.floor(i/2)-.5)*r*.85;ctx.fillStyle=u.team==='blue'?'#515f4b':'#715044';ctx.beginPath();ctx.arc(x+ox,y+oy,r*.35,0,Math.PI*2);ctx.fill();ctx.fillStyle=u.team==='blue'?'#b2ad7d':'#b5785f';ctx.beginPath();ctx.arc(x+ox,y+oy-r*.15,r*.16,0,Math.PI*2);ctx.fill()}}
    else{ctx.save();ctx.translate(x,y);const a=u.target?Math.atan2((u.target.y-y)*height,(u.target.x-x)*width):0;ctx.rotate(a);const red=u.team==='red';ctx.fillStyle=red?'#663c31':'#425345';ctx.fillRect(-r*1.25,-r*.68,r*2.5,r*1.36);ctx.fillStyle=red?'#a16a4e':'#788365';ctx.fillRect(-r*.76,-r*.53,r*1.48,r*1.06);ctx.fillStyle=red?'#514039':'#4a5441';ctx.fillRect(-r*.18,-r*.32,r*.75,r*.64);ctx.fillStyle=red?'#d3a889':'#b7b894';ctx.fillRect(r*.45,-r*.04,r*.75,r*.08);for(const side of [-1,1]){ctx.fillStyle='#272e28';ctx.fillRect(-r*1.1,side*r*.55,r*2.15,r*.25);ctx.fillStyle='#84866d';ctx.fillRect(-r*.85,side*r*.58,r*.22,r*.18);ctx.fillRect(r*.58,side*r*.58,r*.22,r*.18)}ctx.restore()}
    if(selectedUnit){ctx.strokeStyle='#e2f781';ctx.lineWidth=.002;ctx.beginPath();ctx.ellipse(x,y+r*.66,r*1.4,r*.5,0,0,Math.PI*2);ctx.stroke();}healthBar(u,x,y-r*1.0,r*2.3);
    if(u.move){ctx.strokeStyle='#d7ef81aa';ctx.lineWidth=.0015;ctx.setLineDash([.008,.008]);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(u.move.x,u.move.y);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#d7ef81';ctx.beginPath();ctx.arc(u.move.x,u.move.y,.006,0,Math.PI*2);ctx.fill()}
  }
  function healthBar(a,x,y,w){if(a.hp===a.max)return;ctx.fillStyle='#20251f';ctx.fillRect(x-w/2,y,w,.006);ctx.fillStyle=a.team==='red'?'#dd7557':'#b9e65a';ctx.fillRect(x-w/2,y,w*clamp(a.hp/a.max,0,1),.006)}
  function drawCrate(c){const x=c.x,y=c.y,s=.008;ctx.fillStyle='#0004';ctx.fillRect(x-s,y+s,s*2,s*.6);ctx.fillStyle='#394031';ctx.fillRect(x-s,y-s,s*2,s*1.8);ctx.fillStyle='#b8a26b';ctx.fillRect(x-s*.78,y-s*.82,s*1.56,s*1.38);ctx.strokeStyle='#4a4b35';ctx.lineWidth=.0015;ctx.strokeRect(x-s*.78,y-s*.82,s*1.56,s*1.38);ctx.fillStyle='#d7d18c';ctx.fillRect(x-s*.17,y-s*.5,s*.34,s*.75)}
  function drawShots(){for(const s of shots){const t=1-s.life/s.max;const x=s.x+(s.tx-s.x)*t,y=s.y+(s.ty-s.y)*t;ctx.strokeStyle=s.color+'88';ctx.lineWidth=.003;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-(s.tx-s.x)*.025,y-(s.ty-s.y)*.025);ctx.stroke();ctx.fillStyle=s.color;ctx.beginPath();ctx.arc(x,y,.0035,0,Math.PI*2);ctx.fill()}}
  function drawParticles(){for(const p of particles){ctx.globalAlpha=clamp(p.life/p.max,0,1);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,.003+(1-p.life/p.max)*.008,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1}
  function loop(now){const dt=Math.min(.05,(now-last)/1000||0);last=now;update(dt);draw();requestAnimationFrame(loop)}
  setup();window.addEventListener('resize',resize);resize();requestAnimationFrame(loop);
})();
