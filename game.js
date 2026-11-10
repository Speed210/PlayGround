(() => {
  'use strict';
  const canvas = document.getElementById('arena');
  const ctx = canvas.getContext('2d');
  const $ = (id) => document.getElementById(id);
  const ui = { overlay:$('overlay'), overlayTitle:$('overlayTitle'), overlayText:$('overlayText'), start:$('startButton'), status:$('statusText'), stance:$('stanceTag'), clock:$('clock'), playerHealth:$('playerHealth'), enemyHealth:$('enemyHealth'), playerHealthText:$('playerHealthText'), enemyHealthText:$('enemyHealthText'), round:$('roundLabel'), stars:$('starCount'), combo:$('comboText'), flash:$('flash'), sound:$('soundButton') };
  const W=720,H=430;
  let state='ready', last=0, elapsed=0, clock=90, audioOn=true, audioCtx=null, hitStop=0, shake=0, particles=[], floating=[];
  const player={health:100,x:300,y:297,dodge:0,dodgeDir:0,punch:0,punchType:'jab',hit:0,stars:0,combo:0,comboTimer:0};
  const enemy={health:100,x:436,y:239,mode:'idle',timer:1.6,punch:0,hit:0,flash:0,guard:0};

  function sound(freq=220,duration=.08,type='square',vol=.035){
    if(!audioOn)return;
    try{audioCtx ||= new (window.AudioContext||window.webkitAudioContext)(); if(audioCtx.state==='suspended')audioCtx.resume();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(vol,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+duration)}catch(_){ }
  }
  function setStatus(text,color){ui.status.textContent=text;if(color)ui.status.style.color=color;else ui.status.style.color=''}
  function updateBars(){ui.playerHealth.style.width=Math.max(0,player.health)+'%';ui.enemyHealth.style.width=Math.max(0,enemy.health)+'%';ui.playerHealthText.textContent=Math.ceil(player.health);ui.enemyHealthText.textContent=Math.ceil(enemy.health);ui.stars.textContent=player.stars;document.querySelector('[data-action="special"]').disabled=player.stars===0||state!=='fight';ui.clock.textContent=`${Math.floor(clock/60)}:${String(Math.max(0,Math.ceil(clock%60))).padStart(2,'0')}`;ui.combo.textContent=player.combo>1?`${player.combo} HIT STREAK`:' ';}
  function begin(){state='fight';elapsed=0;clock=90;Object.assign(player,{health:100,dodge:0,dodgeDir:0,punch:0,hit:0,stars:0,combo:0,comboTimer:0});Object.assign(enemy,{health:100,mode:'idle',timer:1.4,x:436,punch:0,hit:0,flash:0,guard:0});particles=[];floating=[];ui.round.textContent='ROUND 1';ui.overlay.classList.add('hidden');ui.stance.textContent='WATCH HIS SHOULDERS';setStatus('BOUT ON — WAIT FOR THE TELL.');updateBars();sound(392,.12,'square');setTimeout(()=>sound(523,.12,'square'),100)}
  function finish(win){if(state!=='fight')return;state=win?'won':'lost';ui.overlay.classList.remove('hidden');ui.overlayTitle.innerHTML=win?'YOU ARE THE<br/><em>CHAMPION!</em>':'TAKE A BREATHER<br/><em>REMATCH?</em>';ui.overlayText.textContent=win?'A clean knockout! The crowd is on its feet.':'The bell saved you. Study the tells and try again.';ui.start.innerHTML=(win?'FIGHT AGAIN':'TRY AGAIN')+' <span>▶</span>';ui.stance.textContent=win?'CHAMPION':'KNOCKOUT';setStatus(win?'MAIN EVENT WON!':'BOUT OVER — GET BACK IN THERE.',win?'#ffcc58':'#ff8290');sound(win?660:110,.35,'triangle',.055);}
  function startPunch(type){if(state!=='fight'||player.punch>0||player.hit>0||player.dodge>0)return;if(type==='special'&&player.stars<1){setStatus('BUILD A STAR WITH A PERFECT DODGE.');return}if(type==='special')player.stars--;player.punch=.31;player.punchType=type;const vulnerable=enemy.mode==='recover';const damage=type==='special'?(vulnerable?36:20):type==='hook'?(vulnerable?22:8):(vulnerable?15:5);const blocked=enemy.mode==='windup'||enemy.mode==='strike';const dealt=blocked?Math.ceil(damage*.42):damage;enemy.health=Math.max(0,enemy.health-dealt);enemy.hit=.22;enemy.flash=.12;enemy.guard=blocked?.28:0;player.combo++;player.comboTimer=2.2;if(player.combo%3===0&&player.stars<3&&vulnerable)player.stars++;floating.push({x:enemy.x,y:enemy.y-83,text:blocked?'BLOCK!':`-${dealt}`,life:.75,color:blocked?'#c5d3e8':type==='special'?'#ffcc58':'#ffffff'});for(let i=0;i<9;i++)particles.push({x:enemy.x-20,y:enemy.y-60,vx:(Math.random()-.5)*190,vy:-Math.random()*160,life:.35+Math.random()*.25,color:type==='special'?'#ffcf55':'#f9f0cf',size:3+Math.random()*4});sound(type==='special'?150:200,.09,'sawtooth',.045);shake=blocked?3:6;if(dealt>=12)hitStop=.07;updateBars();if(enemy.health<=0){setTimeout(()=>finish(true),320)}}
  function dodge(dir){if(state!=='fight'||player.dodge>0||player.hit>0||player.punch>0)return;player.dodge=.58;player.dodgeDir=dir;sound(330,.05,'triangle',.018)}
  function onAction(a){if(a==='left')dodge(-1);else if(a==='right')dodge(1);else startPunch(a)}
  document.querySelectorAll('.game-button').forEach(button=>{button.addEventListener('pointerdown',e=>{e.preventDefault();button.classList.add('pressed');onAction(button.dataset.action)});['pointerup','pointercancel','pointerleave'].forEach(evt=>button.addEventListener(evt,()=>button.classList.remove('pressed')))});
  ui.start.addEventListener('click',begin);
  ui.sound.addEventListener('click',()=>{audioOn=!audioOn;ui.sound.innerHTML=audioOn?'♫ <span>SOUND</span>':'♪ <span>MUTED</span>';if(audioOn)sound(440,.07)});
  window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['arrowleft','arrowright',' ','a','d','j','k','u','enter'].includes(k))e.preventDefault();if(k==='enter'&&(state!=='fight'))begin();if(k==='arrowleft'||k==='a')dodge(-1);if(k==='arrowright'||k==='d')dodge(1);if(k==='j'||k===' ')startPunch('jab');if(k==='k')startPunch('hook');if(k==='u')startPunch('special')});
  function update(dt){if(state!=='fight')return;elapsed+=dt;clock=Math.max(0,clock-dt);if(clock<=0){finish(player.health>=enemy.health);return}player.dodge=Math.max(0,player.dodge-dt);player.punch=Math.max(0,player.punch-dt);player.hit=Math.max(0,player.hit-dt);player.comboTimer-=dt;if(player.comboTimer<=0)player.combo=0;enemy.hit=Math.max(0,enemy.hit-dt);enemy.flash=Math.max(0,enemy.flash-dt);enemy.guard=Math.max(0,enemy.guard-dt);enemy.timer-=dt;
    if(enemy.mode==='idle'&&enemy.timer<=0){enemy.mode='windup';enemy.timer=.76+Math.random()*.16;ui.stance.textContent=Math.random()>.5?'RIGHT HAND!':'BODY SHOT!';setStatus('HE’S LOADING UP — SLIP NOW!','#ffb96a');sound(135,.12,'triangle',.025)}
    else if(enemy.mode==='windup'&&enemy.timer<=0){enemy.mode='strike';enemy.timer=.36;enemy.punch=.36;ui.stance.textContent='INCOMING!';}
    else if(enemy.mode==='strike'&&enemy.timer<=0){enemy.mode='recover';enemy.timer=1.05;enemy.punch=0;if(player.dodge>0){player.stars=Math.min(3,player.stars+1);player.combo++;player.comboTimer=2.2;floating.push({x:player.x,y:player.y-85,text:'PERFECT!',life:.8,color:'#70edc0'});setStatus('PERFECT SLIP! COUNTER NOW!','#81efc2');ui.stance.textContent='OPEN! COUNTER!';sound(760,.1,'sine',.04);for(let i=0;i<8;i++)particles.push({x:player.x,y:player.y-65,vx:(Math.random()-.5)*140,vy:-Math.random()*140,life:.5,color:'#75eacb',size:3+Math.random()*3})}else{player.health=Math.max(0,player.health-17);player.hit=.34;shake=9;hitStop=.05;floating.push({x:player.x,y:player.y-83,text:'-17',life:.75,color:'#ff6676'});setStatus('HIT! DODGE WHEN HE SWINGS.','#ff8290');ui.stance.textContent='STAGGERED';sound(80,.16,'sawtooth',.05);flash()}updateBars()}
    else if(enemy.mode==='recover'&&enemy.timer<=0){enemy.mode='idle';enemy.timer=.95+Math.random()*1.25;ui.stance.textContent='READ THE TELL'}
    for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=230*dt;p.life-=dt}particles=particles.filter(p=>p.life>0);for(const f of floating){f.y-=30*dt;f.life-=dt}floating=floating.filter(f=>f.life>0);updateBars();}
  function flash(){ui.flash.classList.add('on');setTimeout(()=>ui.flash.classList.remove('on'),80)}
  const rect=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))};
  function poly(points,color){ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);ctx.closePath();ctx.fill()}
  function roundRect(x,y,w,h,r,c){ctx.fillStyle=c;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()}
  function drawBackground(t){const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#1a2540');sky.addColorStop(.55,'#26324a');sky.addColorStop(1,'#141a2a');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
    // arena spotlights
    const beams=ctx.createLinearGradient(0,0,0,260);beams.addColorStop(0,'#b4d7ff32');beams.addColorStop(1,'#b4d7ff00');poly([[76,0],[226,0],[344,254],[262,254]],'#d6e8ff0a');poly([[556,0],[672,0],[470,254],[403,254]],'#ffe0b00b');
    // crowd rows
    for(let row=0;row<3;row++){for(let i=0;i<38;i++){const x=i*20+(row%2)*9;const y=65+row*27;const seed=(i*17+row*23)%6;rect(x,y+seed,9,7,['#414b68','#66708b','#36405b','#8b6572','#4b5c77','#b17d55'][((i*5+row*3)%6)]);rect(x+2,y+seed-4,5,4,'#a4a8b7');if((i+row)%5===0)rect(x+3,y+seed-3,2,2,'#ffcc58')}}
    // audience barrier
    rect(0,154,W,10,'#101827');rect(0,164,W,4,'#69748a');rect(0,168,W,6,'#242f45');
    // back ring apron
    poly([[118,205],[606,205],[672,347],[49,347]],'#263651');poly([[118,205],[606,205],[591,229],[133,229]],'#d5e0ec');poly([[133,229],[591,229],[576,251],[147,251]],'#32455f');
    // ring mat
    poly([[147,251],[576,251],[643,386],[79,386]],'#e4e0cf');poly([[155,258],[568,258],[620,378],[99,378]],'#d1d1c5');
    // mat strips / shadow
    poly([[155,258],[365,258],[359,378],[99,378]],'#d9d8cb');poly([[365,258],[568,258],[620,378],[359,378]],'#cecec2');
    // ring logo
    ctx.save();ctx.globalAlpha=.16;ctx.translate(365,320);ctx.rotate(-.05);ctx.fillStyle='#37435b';ctx.font='900 30px sans-serif';ctx.textAlign='center';ctx.fillText('RING RIVALS',0,0);ctx.restore();
    // ropes, foreground and far ropes
    [[196,'#ff5b69'],[218,'#f4f3e8'],[240,'#42b9eb']].forEach(([y,c])=>{ctx.strokeStyle=c;ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(98,y);ctx.lineTo(620,y);ctx.stroke();ctx.strokeStyle='#ffffff55';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(98,y-1);ctx.lineTo(620,y-1);ctx.stroke()});
    // ring posts
    rect(89,192,13,157,'#e5e3d8');rect(618,192,13,157,'#e5e3d8');rect(88,190,17,13,'#ed5c6e');rect(615,190,18,13,'#ed5c6e');rect(88,338,17,13,'#424d65');rect(615,338,18,13,'#424d65');
    // corner pads
    roundRect(108,210,15,37,4,'#e75162');roundRect(596,210,15,37,4,'#48bce7');
  }
  function boxer(x,y,kind,pose,hit,scale=1){ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);if(kind==='player'){ctx.translate(player.dodge>0?player.dodgeDir*25:0,0)}else if(hit>0){ctx.translate(7,0)}
    // floor shadow
    ctx.fillStyle='#11182745';ctx.beginPath();ctx.ellipse(0,5,46,10,0,0,Math.PI*2);ctx.fill();
    const isPlayer=kind==='player';const skin=isPlayer?'#d89b70':'#9b6248',shirt=isPlayer?'#2369b5':'#c53c48',shorts=isPlayer?'#e7e8df':'#353b52',glove=isPlayer?'#45baf4':'#e54852',dark=isPlayer?'#194a80':'#7e2936';
    // legs
    poly([[-24,-35],[-5,-35],[-8,-5],[-25,0],[-31,-5]],skin);poly([[4,-35],[24,-38],[31,-5],[18,1],[9,-4]],skin);rect(-32,-7,22,10,isPlayer?'#f4f0e2':'#efe2d0');rect(12,-7,24,10,isPlayer?'#f4f0e2':'#efe2d0');rect(-33,0,25,5,'#20283b');rect(13,0,27,5,'#20283b');
    // shorts
    poly([[-28,-63],[27,-63],[24,-34],[2,-31],[-24,-34]],shorts);rect(-3,-59,6,6,isPlayer?'#4fbce9':'#f0c55e');
    // body
    poly([[-26,-115],[22,-115],[31,-68],[23,-55],[-23,-56],[-31,-72]],shirt);poly([[-26,-115],[-3,-109],[-5,-60],[-23,-58],[-31,-72]],dark);rect(-17,-104,7,5,isPlayer?'#9bdcf6':'#ff9b9e');
    // neck and head
    rect(-8,-127,17,19,skin);roundRect(-21,-157,42,39,12,skin);rect(-20,-157,40,9,isPlayer?'#302b38':'#492a2b');rect(-20,-151,8,7,isPlayer?'#302b38':'#492a2b');rect(12,-150,8,5,isPlayer?'#302b38':'#492a2b');
    // ears, eyebrows and face
    rect(-25,-143,6,10,skin);rect(19,-143,6,10,skin);rect(isPlayer?7:-13,-143,6,4,'#33262b');rect(isPlayer?8:-11,-135,4,3,'#211d26');rect(isPlayer?-8:7,-137,9,3,'#7e463c');rect(isPlayer?-9:7,-129,12,3,'#f0c4a4');
    // arms and gloves vary with punch pose
    const active=pose==='punch';if(isPlayer){if(active){poly([[18,-107],[35,-101],[47,-116],[64,-121],[65,-102],[43,-83],[21,-87]],skin);roundRect(49,-130,28,23,9,glove);rect(67,-125,7,9,dark);poly([[-25,-107],[-39,-99],[-42,-77],[-26,-71],[-16,-89]],skin);roundRect(-47,-86,26,23,9,glove);rect(-48,-81,7,9,dark)}else{poly([[-24,-108],[-39,-100],[-44,-82],[-30,-73],[-15,-87]],skin);roundRect(-51,-88,28,24,9,glove);rect(-51,-82,8,9,dark);poly([[17,-107],[36,-101],[41,-82],[26,-74],[13,-89]],skin);roundRect(25,-91,29,25,9,glove);rect(47,-86,8,9,dark)}}else{if(active){poly([[-20,-107],[-39,-105],[-52,-121],[-69,-119],[-69,-100],[-43,-83],[-20,-86]],skin);roundRect(-83,-130,29,24,9,glove);rect(-83,-124,8,9,dark);poly([[23,-107],[40,-100],[44,-81],[28,-74],[13,-89]],skin);roundRect(28,-92,29,24,9,glove);rect(50,-87,8,9,dark)}else{poly([[-22,-107],[-39,-101],[-42,-82],[-27,-74],[-13,-89]],skin);roundRect(-54,-93,29,25,9,glove);rect(-54,-87,8,9,dark);poly([[19,-108],[39,-102],[44,-83],[27,-74],[14,-89]],skin);roundRect(27,-94,29,25,9,glove);rect(48,-88,8,9,dark)}}
    // glove seam and highlight
    ctx.strokeStyle='#ffffff55';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(isPlayer?52:-78,-124);ctx.lineTo(isPlayer?70:-59,-124);ctx.stroke();
    // cheek stars when stunned
    if(hit>0){ctx.fillStyle='#ffdc68';for(let i=0;i<3;i++){const a=elapsed*8+i*2.1;rect(Math.cos(a)*31-2,-165+Math.sin(a)*8,4,4,'#ffdc68')}}ctx.restore();}
  function draw(){ctx.save();if(shake>0){ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);shake*=.85;if(shake<.3)shake=0}drawBackground(elapsed);
    // opponent first so player stands foreground
    const enemyPunch=enemy.mode==='strike'||enemy.hit>0;boxer(enemy.x,enemy.y,'enemy',enemyPunch?'punch':'guard',enemy.hit,.91);
    boxer(player.x,player.y,'player',player.punch>0?'punch':'guard',player.hit,1.08);
    // incoming attack warning
    if(state==='fight'&&enemy.mode==='windup'){const pulse=.45+.45*Math.sin(elapsed*18);roundRect(557,66,119,33,5,`rgba(255,77,91,${.17+pulse*.25})`);ctx.fillStyle='#ff98a0';ctx.font='bold 14px "Barlow Condensed",sans-serif';ctx.textAlign='center';ctx.fillText('!',615,87);}
    // motion streak on punch
    if(player.punch>0){ctx.strokeStyle=player.punchType==='special'?'#ffdf67':'#e9f8ff';ctx.globalAlpha=Math.min(1,player.punch*4);ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(360,250);ctx.lineTo(player.punchType==='hook'?460:455,220);ctx.stroke();ctx.globalAlpha=1}
    for(const p of particles){ctx.globalAlpha=Math.max(0,p.life*2);rect(p.x,p.y,p.size,p.size,p.color)}ctx.globalAlpha=1;
    for(const f of floating){ctx.globalAlpha=Math.min(1,f.life*2);ctx.fillStyle=f.color;ctx.font='900 20px "Barlow Condensed",sans-serif';ctx.textAlign='center';ctx.shadowColor='#172034';ctx.shadowBlur=4;ctx.fillText(f.text,f.x,f.y);ctx.shadowBlur=0}ctx.globalAlpha=1;
    // instructions during idle
    if(state==='ready'){ctx.fillStyle='#ffffff99';ctx.font='11px "DM Mono",monospace';ctx.textAlign='center';ctx.fillText('SLIP THE RED GLOVE • COUNTER WHEN HE’S OPEN',360,409)}
    ctx.restore();}
  function loop(now){const dt=Math.min(.04,(now-last)/1000||0);last=now;if(hitStop>0){hitStop-=dt}else update(dt);draw();requestAnimationFrame(loop)}
  updateBars();requestAnimationFrame(loop);
})();
