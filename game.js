(() => {
  'use strict';
  const canvas = document.getElementById('arena');
  const ctx = canvas.getContext('2d');
  const $ = (id) => document.getElementById(id);
  const ui = { overlay:$('overlay'), overlayTitle:$('overlayTitle'), overlayText:$('overlayText'), start:$('startButton'), status:$('statusText'), stance:$('stanceTag'), clock:$('clock'), playerHealth:$('playerHealth'), enemyHealth:$('enemyHealth'), playerHealthText:$('playerHealthText'), enemyHealthText:$('enemyHealthText'), round:$('roundLabel'), stars:$('starCount'), combo:$('comboText'), flash:$('flash'), sound:$('soundButton') };
  const W=720,H=430;
  let state='ready', last=0, elapsed=0, clock=90, audioOn=true, audioCtx=null, hitStop=0, shake=0, particles=[], floating=[];
  const player={health:100,x:300,y:297,dodge:0,dodgeDir:0,punch:0,punchType:'jab',hit:0,stars:0,combo:0,comboTimer:0};
  const enemy={health:100,x:360,y:285,mode:'idle',timer:1.6,punch:0,hit:0,flash:0,guard:0,attack:'cross',dodgeAnswer:1};

  function sound(freq=220,duration=.08,type='square',vol=.035){
    if(!audioOn)return;
    try{audioCtx ||= new (window.AudioContext||window.webkitAudioContext)(); if(audioCtx.state==='suspended')audioCtx.resume();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(vol,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+duration)}catch(_){ }
  }
  function setStatus(text,color){ui.status.textContent=text;if(color)ui.status.style.color=color;else ui.status.style.color=''}
  function updateBars(){ui.playerHealth.style.width=Math.max(0,player.health)+'%';ui.enemyHealth.style.width=Math.max(0,enemy.health)+'%';ui.playerHealthText.textContent=Math.ceil(player.health);ui.enemyHealthText.textContent=Math.ceil(enemy.health);ui.stars.textContent=player.stars;document.querySelector('[data-action="special"]').disabled=player.stars===0||state!=='fight';ui.clock.textContent=`${Math.floor(clock/60)}:${String(Math.max(0,Math.ceil(clock%60))).padStart(2,'0')}`;ui.combo.textContent=player.combo>1?`${player.combo} HIT STREAK`:' ';}
  function begin(){state='fight';elapsed=0;clock=90;Object.assign(player,{health:100,dodge:0,dodgeDir:0,punch:0,hit:0,stars:0,combo:0,comboTimer:0});Object.assign(enemy,{health:100,mode:'idle',timer:1.4,x:360,y:285,punch:0,hit:0,flash:0,guard:0,attack:'cross',dodgeAnswer:1});particles=[];floating=[];ui.round.textContent='ROUND 1';ui.overlay.classList.add('hidden');ui.stance.textContent='WATCH HIS SHOULDERS';setStatus('BOUT ON — WAIT FOR THE TELL.');updateBars();sound(392,.12,'square');setTimeout(()=>sound(523,.12,'square'),100)}
  function finish(win){if(state!=='fight')return;state=win?'won':'lost';ui.overlay.classList.remove('hidden');ui.overlayTitle.innerHTML=win?'YOU ARE THE<br/><em>CHAMPION!</em>':'TAKE A BREATHER<br/><em>REMATCH?</em>';ui.overlayText.textContent=win?'A clean knockout! The crowd is on its feet.':'The bell saved you. Study the tells and try again.';ui.start.innerHTML=(win?'FIGHT AGAIN':'TRY AGAIN')+' <span>▶</span>';ui.stance.textContent=win?'CHAMPION':'KNOCKOUT';setStatus(win?'MAIN EVENT WON!':'BOUT OVER — GET BACK IN THERE.',win?'#ffcc58':'#ff8290');sound(win?660:110,.35,'triangle',.055);}
  function startPunch(type){if(state!=='fight'||player.punch>0||player.hit>0||player.dodge>0)return;if(type==='special'&&player.stars<1){setStatus('BUILD A STAR WITH A PERFECT DODGE.');return}if(type==='special')player.stars--;player.punch=.31;player.punchType=type;const vulnerable=enemy.mode==='recover';const damage=type==='special'?(vulnerable?36:20):type==='hook'?(vulnerable?22:8):(vulnerable?15:5);const blocked=enemy.mode==='windup'||enemy.mode==='strike';const dealt=blocked?Math.ceil(damage*.42):damage;enemy.health=Math.max(0,enemy.health-dealt);enemy.hit=.22;enemy.flash=.12;enemy.guard=blocked?.28:0;player.combo++;player.comboTimer=2.2;if(player.combo%3===0&&player.stars<3&&vulnerable)player.stars++;floating.push({x:enemy.x,y:enemy.y-83,text:blocked?'BLOCK!':`-${dealt}`,life:.75,color:blocked?'#c5d3e8':type==='special'?'#ffcc58':'#ffffff'});for(let i=0;i<9;i++)particles.push({x:enemy.x-20,y:enemy.y-60,vx:(Math.random()-.5)*190,vy:-Math.random()*160,life:.35+Math.random()*.25,color:type==='special'?'#ffcf55':'#f9f0cf',size:3+Math.random()*4});sound(type==='special'?150:200,.09,'sawtooth',.045);shake=blocked?3:6;if(dealt>=12)hitStop=.07;updateBars();if(enemy.health<=0){setTimeout(()=>finish(true),320)}}
  function dodge(dir){if(state!=='fight'||player.dodge>0||player.hit>0||player.punch>0)return;player.dodge=.58;player.dodgeDir=dir;sound(330,.05,'triangle',.018)}
  function onAction(a){if(a==='left')dodge(-1);else if(a==='right')dodge(1);else startPunch(a)}
  document.querySelectorAll('.game-button').forEach(button=>{button.addEventListener('pointerdown',e=>{e.preventDefault();button.classList.add('pressed');onAction(button.dataset.action)});['pointerup','pointercancel','pointerleave'].forEach(evt=>button.addEventListener(evt,()=>button.classList.remove('pressed')))});
  ui.start.addEventListener('click',begin);
  ui.sound.addEventListener('click',()=>{audioOn=!audioOn;ui.sound.innerHTML=audioOn?'♫ <span>SOUND</span>':'♪ <span>MUTED</span>';if(audioOn)sound(440,.07)});
  window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['arrowleft','arrowright',' ','a','d','j','k','u','enter'].includes(k))e.preventDefault();if(k==='enter'&&(state!=='fight'))begin();if(k==='arrowleft'||k==='a')dodge(-1);if(k==='arrowright'||k==='d')dodge(1);if(k==='j'||k===' ')startPunch('jab');if(k==='k')startPunch('hook');if(k==='u')startPunch('special')});
  function update(dt){if(state!=='fight')return;elapsed+=dt;clock=Math.max(0,clock-dt);if(clock<=0){finish(player.health>=enemy.health);return}player.dodge=Math.max(0,player.dodge-dt);player.punch=Math.max(0,player.punch-dt);player.hit=Math.max(0,player.hit-dt);player.comboTimer-=dt;if(player.comboTimer<=0)player.combo=0;enemy.hit=Math.max(0,enemy.hit-dt);enemy.flash=Math.max(0,enemy.flash-dt);enemy.guard=Math.max(0,enemy.guard-dt);enemy.timer-=dt;
    if(enemy.mode==='idle'&&enemy.timer<=0){
      const roll=Math.random();enemy.attack=roll<.22?'feint':roll<.49?'left hook':roll<.76?'right hook':'body shot';
      enemy.dodgeAnswer=enemy.attack==='left hook'?1:enemy.attack==='right hook'?-1:(Math.random()<.5?-1:1);
      enemy.mode='windup';enemy.timer=enemy.attack==='feint'?.58:.72+Math.random()*.18;
      ui.stance.textContent=enemy.attack==='feint'?'…WAIT FOR IT':enemy.attack.toUpperCase()+'!';
      setStatus(enemy.attack==='feint'?'HE’S FAKING—DON’T BITE!':'READ THE GLOVE—SLIP '+(enemy.dodgeAnswer<0?'LEFT':'RIGHT')+'!','#ffb96a');sound(135,.12,'triangle',.025)
    }
    else if(enemy.mode==='windup'&&enemy.timer<=0){
      if(enemy.attack==='feint'){enemy.mode='feint';enemy.timer=.32;enemy.punch=.13;ui.stance.textContent='NICE TRY, PAL';setStatus('A LITTLE SHOWBOATING. HOLD YOUR GROUND.','#f1cd77')}
      else{enemy.mode='strike';enemy.timer=.36;enemy.punch=.36;ui.stance.textContent='INCOMING!'}
    }
    else if(enemy.mode==='feint'&&enemy.timer<=0){enemy.mode='recover';enemy.timer=.55;enemy.punch=0;ui.stance.textContent='HE FELL FOR IT?';}
    else if(enemy.mode==='strike'&&enemy.timer<=0){
      enemy.mode='recover';enemy.timer=1.05;enemy.punch=0;
      if(player.dodge>0&&player.dodgeDir===enemy.dodgeAnswer){player.stars=Math.min(3,player.stars+1);player.combo++;player.comboTimer=2.2;floating.push({x:360,y:251,text:'PERFECT SLIP!',life:.8,color:'#70edc0'});setStatus('PERFECT SLIP! COUNTER WHILE HE’S OPEN!','#81efc2');ui.stance.textContent='OPEN! COUNTER!';sound(760,.1,'sine',.04);for(let i=0;i<8;i++)particles.push({x:360,y:270,vx:(Math.random()-.5)*140,vy:-Math.random()*140,life:.5,color:'#75eacb',size:3+Math.random()*3});
      }else{player.health=Math.max(0,player.health-17);player.hit=.34;shake=9;hitStop=.05;floating.push({x:360,y:250,text:'-17',life:.75,color:'#ff6676'});setStatus(player.dodge>0?'WRONG WAY! READ THE TELL.':'HIT! SLIP THE TOLD DIRECTION.','#ff8290');ui.stance.textContent='STAGGERED';sound(80,.16,'sawtooth',.05);flash()}updateBars()
    }
    else if(enemy.mode==='recover'&&enemy.timer<=0){enemy.mode='idle';enemy.timer=.72+Math.random()*1.15;ui.stance.textContent='WATCH HIS SHOULDERS'}
    for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=230*dt;p.life-=dt}particles=particles.filter(p=>p.life>0);for(const f of floating){f.y-=30*dt;f.life-=dt}floating=floating.filter(f=>f.life>0);updateBars();}
  function flash(){ui.flash.classList.add('on');setTimeout(()=>ui.flash.classList.remove('on'),80)}
  const rect=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))};
  function poly(points,color){ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);ctx.closePath();ctx.fill()}
  function roundRect(x,y,w,h,r,c){ctx.fillStyle=c;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()}
  function drawBackground(t){
    rect(0,0,W,H,'#15152b');rect(0,0,W,170,'#242346');
    // Packed crowd, stage lights, and a ring viewed from the blue corner.
    for(let row=0;row<4;row++)for(let i=0;i<42;i++){const x=i*18+(row%2)*8,y=63+row*22,seed=(i*13+row*19)%7;rect(x,y+seed,11,8,['#413b63','#695071','#394c70','#89565e','#53657c','#b87952','#52436a'][(i*3+row)%7]);rect(x+3,y+seed-5,5,5,'#e3b891');if((i+row)%6===0)rect(x+4,y+seed-2,3,2,'#ffe071')}
    poly([[70,0],[180,0],[295,188],[231,188]],'#fff4cf12');poly([[550,0],[657,0],[489,188],[428,188]],'#fff4cf12');
    rect(0,151,W,10,'#17172a');rect(0,162,W,5,'#e1bb74');rect(0,167,W,6,'#27243c');
    // Mat converges toward the far ropes to emphasize the first-person view.
    poly([[146,190],[574,190],[720,430],[0,430]],'#bd9558');poly([[159,199],[561,199],[682,430],[38,430]],'#e8d59b');
    poly([[159,199],[561,199],[538,231],[182,231]],'#f5e5b3');
    for(let i=0;i<5;i++){const y=248+i*42;ctx.strokeStyle=i%2?'#ca554f':'#a66e46';ctx.lineWidth=2+i;ctx.beginPath();ctx.moveTo(150-i*26,y);ctx.lineTo(570+i*26,y);ctx.stroke()}
    ctx.save();ctx.globalAlpha=.18;ctx.fillStyle='#54405a';ctx.font='900 24px sans-serif';ctx.textAlign='center';ctx.fillText('RING RIVALS',360,375);ctx.restore();
    // Near-corner posts frame the opponent without blocking the action.
    poly([[0,184],[24,184],[86,430],[0,430]],'#37445d');poly([[696,184],[720,184],[720,430],[634,430]],'#37445d');
    rect(0,183,26,13,'#ff6870');rect(694,183,26,13,'#59c9e8');
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
  function drawRival(){
    const bob=enemy.mode==='idle'?Math.sin(elapsed*5)*2:0;
    const recoil=enemy.hit>0?8:0;
    ctx.save();ctx.translate(360+recoil,405+bob);ctx.scale(1.42,1.42);
    // Squared-off, original arcade sprite: broad shoulders, bright trunks, oversized gloves.
    rect(-13,-152,26,18,'#d58c66');rect(-24,-178,48,36,'#d58c66');
    rect(-27,-183,54,13,'#f2c34e');rect(-23,-194,45,13,'#f2c34e');rect(-14,-204,29,12,'#f2c34e');rect(-8,-209,18,8,'#ffe17b');
    rect(-24,-168,11,4,'#35253a');rect(13,-168,11,4,'#35253a');rect(-4,-158,9,5,'#713c37');rect(-12,-150,25,4,'#fff0d4');
    // singlet and torso
    rect(-32,-144,64,52,'#327c73');rect(-42,-139,16,34,'#327c73');rect(26,-139,16,34,'#327c73');rect(-34,-96,68,31,'#df4f59');rect(-34,-96,68,6,'#ffd267');rect(-7,-88,14,13,'#ffe078');
    // legs and boots
    rect(-28,-65,22,45,'#d58c66');rect(7,-65,22,45,'#d58c66');rect(-36,-27,34,11,'#443451');rect(4,-27,36,11,'#443451');
    // gloves move according to the called attack
    const swinging=enemy.mode==='strike'||enemy.mode==='feint';
    if(swinging&&enemy.attack==='left hook'){rect(-66,-137,34,27,'#f05c64');rect(-70,-134,12,16,'#ffb08a');rect(24,-128,29,24,'#f05c64');}
    else if(swinging&&enemy.attack==='right hook'){rect(32,-137,34,27,'#f05c64');rect(58,-134,12,16,'#ffb08a');rect(-53,-128,29,24,'#f05c64');}
    else if(swinging&&enemy.attack==='body shot'){rect(-45,-105,34,27,'#f05c64');rect(16,-128,31,24,'#f05c64');}
    else{rect(-54,-133,31,27,'#f05c64');rect(23,-133,31,27,'#f05c64');}
    rect(-50,-129,19,4,'#ffb6a1');rect(27,-129,19,4,'#ffb6a1');
    if(enemy.guard>0){rect(-41,-186,82,5,'#fff1a0');}
    if(enemy.flash>0){ctx.globalAlpha=.72;rect(-72,-210,144,195,'#fff4d6');ctx.globalAlpha=1;}
    ctx.restore();
  }
  function drawPOV(){
    const slip=player.dodge>0?player.dodgeDir*25:0;
    const jab=player.punch>0;
    ctx.save();ctx.translate(slip,player.hit>0?8:0);
    // Forearms and gloves frame the ring from the boxer's point of view.
    poly([[115,430],[158,430],[215,347],[188,328],[143,366]],'#b36d52');
    poly([[605,430],[563,430],[505,347],[532,328],[577,366]],'#b36d52');
    if(jab){
      const x=player.punchType==='hook'?450:365;
      poly([[505,372],[536,354],[x+15,294],[x-20,282],[x-2,345]],'#b36d52');
      roundRect(x-30,260,65,56,17,player.punchType==='special'?'#ffca4b':'#2877c7');
      rect(x-20,270,42,7,'#77c8ff');
    }else{
      roundRect(120,331,92,77,22,'#2877c7');roundRect(508,331,92,77,22,'#2877c7');
      rect(137,343,52,8,'#77c8ff');rect(525,343,52,8,'#77c8ff');
    }
    ctx.restore();
  }
  function draw(){ctx.save();if(shake>0){ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);shake*=.85;if(shake<.3)shake=0}drawBackground(elapsed);
    drawRival();drawPOV();
    if(state==='fight'&&(enemy.mode==='windup'||enemy.mode==='feint')){const pulse=.5+.4*Math.sin(elapsed*18);roundRect(268,50,184,30,3,`rgba(255,77,91,${.16+pulse*.25})`);ctx.fillStyle='#fff0c4';ctx.font='bold 13px "DM Mono",monospace';ctx.textAlign='center';ctx.fillText(enemy.attack==='feint'?'DON’T FALL FOR IT':`SLIP ${enemy.dodgeAnswer<0?'LEFT':'RIGHT'}!`,360,70);}
    if(player.punch>0){ctx.strokeStyle=player.punchType==='special'?'#ffdf67':'#e9f8ff';ctx.globalAlpha=Math.min(1,player.punch*4);ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(360,330);ctx.lineTo(player.punchType==='hook'?445:375,283);ctx.stroke();ctx.globalAlpha=1}
    for(const p of particles){ctx.globalAlpha=Math.max(0,p.life*2);rect(p.x,p.y,p.size,p.size,p.color)}ctx.globalAlpha=1;
    for(const f of floating){ctx.globalAlpha=Math.min(1,f.life*2);ctx.fillStyle=f.color;ctx.font='900 20px "Barlow Condensed",sans-serif';ctx.textAlign='center';ctx.shadowColor='#172034';ctx.shadowBlur=4;ctx.fillText(f.text,f.x,f.y);ctx.shadowBlur=0}ctx.globalAlpha=1;
    if(state==='ready'){ctx.fillStyle='#ffffff99';ctx.font='11px "DM Mono",monospace';ctx.textAlign='center';ctx.fillText('SLIP THE CALLED DIRECTION • COUNTER WHEN HE’S OPEN',360,409)}
    ctx.restore();}
  function loop(now){const dt=Math.min(.04,(now-last)/1000||0);last=now;if(hitStop>0){hitStop-=dt}else update(dt);draw();requestAnimationFrame(loop)}
  updateBars();requestAnimationFrame(loop);
})();
