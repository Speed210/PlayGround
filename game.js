(() => {
  'use strict';
  const canvas = document.getElementById('arena');
  const ctx = canvas.getContext('2d');
  const fighterCanvas=document.getElementById('fighter3d');
  const renderer=createFighterRenderer(fighterCanvas);
  const $ = (id) => document.getElementById(id);
  const ui = { overlay:$('overlay'), overlayTitle:$('overlayTitle'), overlayText:$('overlayText'), start:$('startButton'), status:$('statusText'), stance:$('stanceTag'), clock:$('clock'), playerHealth:$('playerHealth'), enemyHealth:$('enemyHealth'), playerHealthText:$('playerHealthText'), enemyHealthText:$('enemyHealthText'), round:$('roundLabel'), stars:$('starCount'), combo:$('comboText'), flash:$('flash'), sound:$('soundButton') };
  const W=720,H=430;
  function createFighterRenderer(target){
    const gl=target.getContext('webgl',{alpha:true,antialias:true,depth:true,premultipliedAlpha:false})||target.getContext('experimental-webgl');
    if(!gl)return{available:false,setContender(){},render(){}};
    const vs='attribute vec3 aPosition;attribute vec3 aNormal;uniform mat4 uMvp;uniform mat4 uModel;varying vec3 vNormal;varying vec3 vPosition;void main(){vec4 p=uModel*vec4(aPosition,1.0);vPosition=p.xyz;vNormal=normalize(mat3(uModel)*aNormal);gl_Position=uMvp*vec4(aPosition,1.0);}';
    const fs='precision mediump float;uniform vec3 uColor;uniform float uAlpha;varying vec3 vNormal;varying vec3 vPosition;void main(){vec3 n=normalize(vNormal);vec3 light=normalize(vec3(-0.45,0.8,0.65));vec3 viewDir=normalize(vec3(0.0,1.25,7.1)-vPosition);float diffuse=max(dot(n,light),0.0);float spec=pow(max(dot(reflect(-light,n),viewDir),0.0),30.0)*0.22;float rim=pow(1.0-max(dot(n,viewDir),0.0),2.0);float shade=0.38+diffuse*0.72+rim*0.18+spec;gl_FragColor=vec4(uColor*shade,uAlpha);}';
    function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s}
    let program;try{program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vs));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program))}catch(err){console.warn('3D fighter renderer unavailable:',err);return{available:false,setContender(){},render(){}}}
    const pos=[],norm=[],idx=[];const lat=36,lon=48;
    for(let y=0;y<=lat;y++){const v=y/lat,phi=v*Math.PI;for(let x=0;x<=lon;x++){const u=x/lon,theta=u*Math.PI*2,nx=-Math.cos(theta)*Math.sin(phi),ny=Math.cos(phi),nz=Math.sin(theta)*Math.sin(phi);pos.push(nx,ny,nz);norm.push(nx,ny,nz)}}
    for(let y=0;y<lat;y++)for(let x=0;x<lon;x++){const a=y*(lon+1)+x,b=a+lon+1;idx.push(a,b,a+1,b,b+1,a+1)}
    const vb=gl.createBuffer(),nb=gl.createBuffer(),ib=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(pos),gl.STATIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,nb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(norm),gl.STATIC_DRAW);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(idx),gl.STATIC_DRAW);
    const loc={p:gl.getAttribLocation(program,'aPosition'),n:gl.getAttribLocation(program,'aNormal'),m:gl.getUniformLocation(program,'uMvp'),model:gl.getUniformLocation(program,'uModel'),color:gl.getUniformLocation(program,'uColor'),alpha:gl.getUniformLocation(program,'uAlpha')};
    const ident=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
    function mul(a,b){const o=new Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o}
    function tr(x,y,z){const m=ident();m[12]=x;m[13]=y;m[14]=z;return m}
    function sc(x,y,z){const m=ident();m[0]=x;m[5]=y;m[10]=z;return m}
    function rz(a){const m=ident(),c=Math.cos(a),s=Math.sin(a);m[0]=c;m[1]=s;m[4]=-s;m[5]=c;return m}
    function rx(a){const m=ident(),c=Math.cos(a),s=Math.sin(a);m[5]=c;m[6]=s;m[9]=-s;m[10]=c;return m}
    function ry(a){const m=ident(),c=Math.cos(a),s=Math.sin(a);m[0]=c;m[2]=-s;m[8]=s;m[10]=c;return m}
    function perspective(fov,aspect,near,far){const f=1/Math.tan(fov/2),nf=1/(near-far),m=new Array(16).fill(0);m[0]=f/aspect;m[5]=f;m[10]=(far+near)*nf;m[11]=-1;m[14]=2*far*near*nf;return m}
    function lookAt(ex,ey,ez,cx,cy,cz){let zx=ex-cx,zy=ey-cy,zz=ez-cz,l=Math.hypot(zx,zy,zz)||1;zx/=l;zy/=l;zz/=l;let xx=zz,xy=0,xz=-zx;l=Math.hypot(xx,xz)||1;xx/=l;xz/=l;const yx=zy*xz-zz*xy,yy=zz*xx-zx*xz,yz=zx*xy-zy*xx;return[xx,yx,zx,0,xy,yy,zy,0,xz,yz,zz,0,-(xx*ex+xy*ey+xz*ez),-(yx*ex+yy*ey+yz*ez),-(zx*ex+zy*ey+zz*ez),1]}
    function rgb(hex){return[(hex>>16&255)/255,(hex>>8&255)/255,(hex&255)/255]}
    let rival={skin:0xe1a780,hair:0x572b40,top:0xe9e1d3,trim:0x4778a8,shorts:0xc53e4a,glove:0xc73e4a};let width=1,height=1,dpr=1;
    const colors={};function setContender(c){rival=c;Object.keys(c).forEach(k=>{if(typeof c[k]==='number')colors[k]=rgb(c[k])})}
    function resize(){const r=target.getBoundingClientRect();dpr=Math.min(window.devicePixelRatio||1,2);width=Math.max(1,Math.round(r.width*dpr));height=Math.max(1,Math.round(r.height*dpr));if(target.width!==width||target.height!==height){target.width=width;target.height=height}gl.viewport(0,0,width,height)}
    function part(m,x,y,z,sx,sy,sz,color,alpha=1){let model=mul(mul(m,tr(x,y,z)),sc(sx,sy,sz));gl.uniformMatrix4fv(loc.model,false,new Float32Array(model));gl.uniformMatrix4fv(loc.m,false,new Float32Array(mul(projView,model)));gl.uniform3fv(loc.color,colors[color]||rgb(color));gl.uniform1f(loc.alpha,alpha);gl.drawElements(gl.TRIANGLES,idx.length,gl.UNSIGNED_SHORT,0)}
    let projView=ident(),time=0,enemyState=null,playerState=null,gameState='ready',stateSince=0,lastGameState='ready';
    function render(t,e,p,state){time=t;enemyState=e;playerState=p;if(state!==lastGameState){lastGameState=state;stateSince=t}gameState=state;resize();gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.enableVertexAttribArray(loc.p);gl.vertexAttribPointer(loc.p,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,nb);gl.enableVertexAttribArray(loc.n);gl.vertexAttribPointer(loc.n,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);
      const aspect=width/height;projView=mul(perspective(38*Math.PI/180,aspect,.1,30),lookAt(0,1.37,7.1,0,1.25,0));
      const mode=e.mode,phase=mode==='strike'?Math.sin((1-e.timer/.36)*Math.PI):mode==='windup'?1-e.timer/.9:0,recoil=e.hit>0?e.hit/.22:0,walk=Math.sin(t*4.4),down=state==='knockdown'&&e.down,fall=down?Math.min(1,(t-stateSince)/.28):0;
      const specialMode=mode==='specialWindup'||mode==='specialStrike',specialT=mode==='specialStrike'?Math.sin((1-e.timer/.5)*Math.PI):mode==='specialWindup'?1-e.timer/1.05:0;let root=mul(mul(tr((mode==='strike'?phase*(e.attack==='left hook'?- .18:.18):specialMode?specialT*(rival.move==='stampede'?.42:.22):walk*.018)+recoil*.035,fall?-.30*fall:Math.abs(walk)*.015+(specialMode?Math.sin(specialT*Math.PI)*.035:0),specialMode?specialT*.12:0),rz(fall?-.85*fall:mode==='windup'?.04:mode==='strike'?-.08*phase:mode==='specialWindup'?.12:mode==='specialStrike'?-.22*specialT:0)),sc(rival.width||1,rival.height||1,rival.depth||1));
      // Soft ring shadow and planted boots.
      part(root,0,.035,-.08,.64,.055,.34,0x141827,.82);
      const legSwing=mode==='strike'?0:walk*.045;
      part(root,-.22,.28,0,.13,.31,.16,'skin');part(mul(root,rz(legSwing)),-.22,.12,.08,.19,.09,.28,0x20283a);
      part(root,.22,.28,0,.13,.31,.16,'skin');part(mul(root,rz(-legSwing)),.22,.12,.08,.19,.09,.28,0x20283a);
      // Trunks, belt and tapered torso with sculpted pectorals and abdominal definition.
      part(root,0,.61,0,.38,.28,.22,'shorts');part(root,0,.79,.015,.39,.065,.235,'trim');part(root,-.27,.61,.02,.045,.22,.245,'trim');part(root,.27,.61,.02,.045,.22,.245,'trim');
      part(root,0,1.16,0,.36,.48,.235,'top');part(root,-.31,1.35,.03,.095,.25,.17,'skin');part(root,.31,1.35,.03,.095,.25,.17,'skin');
      part(root,-.13,1.39,.222,.15,.13,.045,'skin');part(root,.13,1.39,.222,.15,.13,.045,'skin');part(root,0,1.16,.228,.045,.37,.025,'trim');
      for(let i=0;i<3;i++){part(root,-.105,1.08-i*.13,.243,.075,.038,.018,'skin');part(root,.105,1.08-i*.13,.243,.075,.038,.018,'skin')}
      // Neck, ears, head, distinct hairline, eyes, brows, nose and mouth.
      part(root,0,1.63,0,.13,.19,.14,'skin');part(root,-.235,1.93,0,.055,.09,.05,'skin');part(root,.235,1.93,0,.055,.09,.05,'skin');part(root,0,1.96,.015,.235*(rival.faceWidth||1),.30,.195,'skin');part(root,0,2.18,-.012,rival.hairStyle==='afro'?.28:.245,rival.hairStyle==='afro'?.20:rival.hairStyle==='mohawk'?.07:rival.hairStyle==='shaved'?.07:.14,.205,'hair');part(root,-.205,1.99,.04,rival.hairStyle==='afro'?.09:.055,.18,.13,'hair');part(root,.205,1.99,.04,rival.hairStyle==='afro'?.09:.055,.18,.13,'hair');
      part(root,-.092*(rival.eyeSpacing||1),1.99,.194,.051,.026,.018,0xf4e8d2);part(root,.092*(rival.eyeSpacing||1),1.99,.194,.051,.026,.018,0xf4e8d2);part(root,-.088*(rival.eyeSpacing||1),1.99,.211,.018,.021,.012,rival.eye||0x28232b);part(root,.096*(rival.eyeSpacing||1),1.99,.211,.018,.021,.012,rival.eye||0x28232b);part(root,-.09,2.045,.198,.067,.024,.025,'hair');part(root,.09,2.045,.198,.067,.024,.025,'hair');part(root,0,1.91,.222,.043,.075,.042,'skin');part(root,0,1.84,.215,.085,.018,.018,'hair');part(root,0,1.80,.204,.043,.012,.014,0xf4c5a5);
      if(rival.hairStyle==='afro'){part(root,0,2.29,-.01,.23,.095,.20,'hair');for(let i=-1;i<=1;i++)part(root,i*.12,2.24,.15,.07,.07,.05,rival.hair)}if(rival.hairStyle==='mohawk')part(root,0,2.28,.01,.075,.18,.13,'trim');if(rival.hairStyle==='bun'){part(root,0,2.32,-.17,.12,.12,.13,'hair');part(root,0,2.18,-.20,.055,.19,.06,'hair')}
       if(rival.faceHair==='beard'){part(root,0,1.79,.15,.17,.075,.065,'hair');part(root,-.13,1.85,.13,.06,.10,.045,'hair');part(root,.13,1.85,.13,.06,.10,.045,'hair')}if(rival.faceHair==='mustache')part(root,0,1.85,.215,.10,.025,.025,'hair');if(rival.scar)part(mul(root,rz(-.28)),-.15,1.88,.205,.075,.014,.012,rival.scar);
       // Shoulders, articulated forearms and padded gloves animate through each tell and punch.
      for(let side of [-1,1]){const isLead=side===(e.attack==='left hook'?-1:1),swing=mode==='strike'&&isLead?phase:mode==='windup'&&isLead?-.22:0,guardY=1.48;part(root,side*.39,1.46,0,.17,.19,.17,'skin');const arm=mul(mul(root,tr(side*.45,guardY,0)),rz(side*(swing*.75+(mode==='windup'?.25:0))));part(arm,0,-.17,.01,.115,.22,.13,'skin');part(arm,side*.015,-.37,.045,.105,.18,.115,'skin');part(arm,side*.018,-.53,.07,.155,.16,.17,'glove');part(arm,side*.02,-.64,.075,.13,.045,.135,'trim');part(arm,-side*.1,-.53,.085,.035,.11,.08,'glove');}
      // Catchlights, cheek planes and singlet edging.
      part(root,-.17,1.88,.15,.035,.022,.018,0xffd0aa);part(root,.17,1.88,.15,.035,.022,.018,0xffd0aa);
      if(e.flash>0){gl.enable(gl.BLEND);part(root,0,1.2,.25,.47,.95,.025,0xffffff,Math.min(.45,e.flash*3))}
    }
    window.addEventListener('resize',resize,{passive:true});return{available:true,setContender,render};
  }
  const contenders=[
    {name:'GLASS JOE',country:'FRANCE',skin:0xe1a780,hair:0x572b40,top:0xe9e1d3,trim:0x4778a8,shorts:0xc53e4a,glove:0xc73e4a,style:'Wiry counterpuncher',width:.88,height:.96,depth:.88,faceWidth:.92,eyeSpacing:.94,eye:0x28232b,hairStyle:'swept',faceHair:'none',scar:0xa94f5a,kit:'classic',move:'feint',moveName:'Glass Cannon Feint',moveDamage:19,moveWindup:.66},
    {name:'MATEO CRUZ',country:'MEXICO',skin:0x9e6345,hair:0x211c1c,top:0x176b57,trim:0xe5c35c,shorts:0x176b57,glove:0xe6a43b,style:'Fast body attacker',width:1.04,height:1.02,depth:1,faceWidth:.97,eyeSpacing:1.08,eye:0x211c1c,hairStyle:'afro',faceHair:'mustache',kit:'sash',move:'bodyRush',moveName:'Barrio Body Rush',moveDamage:22,moveWindup:.9},
    {name:'IVAN VOLKOV',country:'UKRAINE',skin:0xd9a77d,hair:0x9b704d,top:0x31558b,trim:0xe2e3e7,shorts:0x283c62,glove:0xc23a48,style:'Heavy pressure fighter',width:1.17,height:1.04,depth:1.13,faceWidth:1.12,eyeSpacing:1.12,eye:0x586371,hairStyle:'shaved',faceHair:'beard',kit:'heavy',move:'hammer',moveName:'Iron Curtain Hammer',moveDamage:29,moveWindup:1.18},
    {name:'AMARA OKAFOR',country:'NIGERIA',skin:0x75452f,hair:0x171719,top:0xa94e35,trim:0xf0c764,shorts:0x153d47,glove:0x3c9b82,style:'Patient technical boxer',width:.98,height:1.06,depth:.96,faceWidth:.98,eyeSpacing:1.16,eye:0x211c1c,hairStyle:'bun',faceHair:'none',scar:0xd99462,kit:'panel',move:'switchStep',moveName:'Golden Switch-Step',moveDamage:24,moveWindup:.94},
    {name:'KENJI SATO',country:'JAPAN',skin:0xe4b797,hair:0x201c24,top:0xe9e1d3,trim:0xd64648,shorts:0x222944,glove:0xd64648,style:'Sharp southpaw',width:.9,height:1,depth:.88,faceWidth:.94,eyeSpacing:.91,eye:0x201c24,hairStyle:'swept',faceHair:'none',kit:'split',move:'blitz',moveName:'Shinkansen Blitz',moveDamage:25,moveWindup:.7},
    {name:'TITAN REYES',country:'USA',skin:0xb97854,hair:0x302523,top:0x243b6b,trim:0xf0c764,shorts:0xb33343,glove:0x293f78,style:'Tournament champion',width:1.25,height:1.12,depth:1.18,faceWidth:1.12,eyeSpacing:1.08,eye:0x302523,hairStyle:'mohawk',faceHair:'beard',kit:'champion',move:'stampede',moveName:'Bull Stampede',moveDamage:28,moveWindup:1.02}
  ];
  let contenderIndex=0, playerKnockdowns=0, enemyKnockdowns=0;
  let state='ready', last=0, elapsed=0, clock=90, audioOn=true, audioCtx=null, hitStop=0, shake=0, particles=[], floating=[];
  const player={health:100,x:300,y:297,dodge:0,dodgeDir:0,punch:0,punchType:'jab',hit:0,stars:0,combo:0,comboTimer:0};
  const enemy={health:100,x:360,y:285,mode:'idle',timer:1.6,punch:0,hit:0,flash:0,guard:0,attack:'cross',dodgeAnswer:1,down:false};

  function sound(freq=220,duration=.08,type='square',vol=.035){
    if(!audioOn)return;
    try{audioCtx ||= new (window.AudioContext||window.webkitAudioContext)(); if(audioCtx.state==='suspended')audioCtx.resume();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(vol,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+duration)}catch(_){ }
  }
  function setStatus(text,color){ui.status.textContent=text;if(color)ui.status.style.color=color;else ui.status.style.color=''}
  function updateBars(){ui.playerHealth.style.width=Math.max(0,player.health)+'%';ui.enemyHealth.style.width=Math.max(0,enemy.health)+'%';ui.playerHealthText.textContent=Math.ceil(player.health);ui.enemyHealthText.textContent=Math.ceil(enemy.health);ui.stars.textContent=player.stars;document.querySelector('[data-action="special"]').disabled=player.stars===0||state!=='fight';ui.clock.textContent=`${Math.floor(clock/60)}:${String(Math.max(0,Math.ceil(clock%60))).padStart(2,'0')}`;ui.combo.textContent=player.combo>1?`${player.combo} HIT STREAK`:' ';}
  function updateContender(){const c=contenders[contenderIndex];document.querySelector('.joe-name').textContent=c.name;document.querySelector('.rival-label small').textContent=c.country+' • '+(contenderIndex+1)+'/'+contenders.length;document.querySelector('.joe-portrait').setAttribute('aria-label',c.name);renderer.setContender(c)}
  function resetExchange(){player.health=100;enemy.health=100;enemy.mode='idle';enemy.down=false;enemy.timer=1.35;enemy.hit=0;enemy.flash=0;enemy.guard=0;enemy.punch=0;player.dodge=0;player.punch=0;player.hit=0;player.stars=Math.min(3,player.stars+1);updateBars()}
  function begin(){if(state==='won'||state==='lost')contenderIndex=0;playerKnockdowns=0;enemyKnockdowns=0;updateContender();state='fight';elapsed=0;clock=90;Object.assign(player,{health:100,dodge:0,dodgeDir:0,punch:0,hit:0,stars:0,combo:0,comboTimer:0});Object.assign(enemy,{health:100,mode:'idle',timer:1.4,x:360,y:285,punch:0,hit:0,flash:0,guard:0,attack:'cross',dodgeAnswer:1});particles=[];floating=[];ui.round.textContent=`BOUT 1/${contenders.length} · KD 0–0`;ui.overlay.classList.add('hidden');ui.stance.textContent='WATCH HIS SHOULDERS';setStatus('BOUT ON — THREE KNOCKDOWNS TO WIN.');updateBars();sound(392,.12,'square');setTimeout(()=>sound(523,.12,'square'),100)}
  function knockdown(byPlayer){if(state!=='fight')return;state='knockdown';enemy.down=byPlayer;if(byPlayer)enemyKnockdowns++;else playerKnockdowns++;const count=byPlayer?enemyKnockdowns:playerKnockdowns;ui.round.textContent=`BOUT ${contenderIndex+1}/${contenders.length} · KD ${playerKnockdowns}–${enemyKnockdowns}`;setStatus(byPlayer?`${contenders[contenderIndex].name} DOWN — ${count}/3`:`YOU’RE DOWN — ${count}/3`,byPlayer?'#ffcc58':'#ff8290');ui.stance.textContent=byPlayer?'KNOCKDOWN!':'DOWN!';sound(byPlayer?110:75,.3,'sawtooth',.05);if(count>=3){if(byPlayer){if(contenderIndex===contenders.length-1){state='won';ui.overlayTitle.innerHTML='TOURNAMENT<br/><em>CHAMPION!</em>';ui.overlayText.textContent='Six contenders defeated. The title is yours!';ui.start.innerHTML='FIGHT AGAIN <span>▶</span>';ui.overlay.classList.remove('hidden');setStatus('THE ARENA CHAMPION!','#ffcc58');ui.stance.textContent='CHAMPION';return}contenderIndex++;playerKnockdowns=0;enemyKnockdowns=0;ui.round.textContent=`BOUT ${contenderIndex+1}/${contenders.length} · KD 0–0`;updateContender();ui.overlayTitle.innerHTML='NEXT CHALLENGER<br/><em>ENTER THE RING</em>';ui.overlayText.textContent=`${contenders[contenderIndex].name} of ${contenders[contenderIndex].country} steps up. ${contenders[contenderIndex].style}.`;ui.start.innerHTML='NEXT BOUT <span>▶</span>'}else{state='lost';ui.overlayTitle.innerHTML='KNOCKED OUT<br/><em>REMATCH?</em>';ui.overlayText.textContent=`${contenders[contenderIndex].name} took the bout. Your tournament run ends here.`;ui.start.innerHTML='TRY AGAIN <span>▶</span>'}ui.overlay.classList.remove('hidden');return}setTimeout(()=>{if(state!=='knockdown')return;resetExchange();state='fight';ui.stance.textContent='BACK TO IT';setStatus(byPlayer?'HE’S BACK UP—KEEP THE PRESSURE!':'UP ON YOUR FEET—READ THE TELL!')},1050)}
  function finish(win){if(state!=='fight')return;knockdown(win)}
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
  const clamp=(n,min=0,max=1)=>Math.max(min,Math.min(max,n));
  const smooth=n=>{n=clamp(n);return n*n*(3-2*n)};
  function drawRival(){
    const idle=Math.sin(elapsed*4.2), breathing=Math.sin(elapsed*2.7);
    const recoil=enemy.hit>0?smooth(enemy.hit/.22):0;
    const striking=enemy.mode==='strike'||enemy.mode==='feint';
    const strikeT=enemy.mode==='strike'?smooth(1-enemy.timer/.36):enemy.mode==='feint'?smooth(1-enemy.timer/.13):0;
    const windup=enemy.mode==='windup'?smooth(1-enemy.timer/.9):0;
    const hook=enemy.attack==='left hook'?-1:1;
    const swing=striking?Math.sin(strikeT*Math.PI):0;
    const lean=(enemy.mode==='windup'?windup*.09:0)+(striking?swing*.11:0)-recoil*.08;
    const shift=striking?swing*hook*18:enemy.mode==='windup'?-hook*windup*5:idle*2;
    ctx.save();ctx.translate(360+shift+(recoil*9),405+Math.sin(elapsed*4.2)*2);ctx.scale(1.24,1.32);ctx.rotate(lean);
    // Glass Joe-inspired arcade challenger: a wiry French southpaw with a nervous
    // expression, swept auburn hair, cream singlet, tricolor trim, and red gloves.
    ctx.fillStyle='#11182766';ctx.beginPath();ctx.ellipse(0,4,43,9,0,0,Math.PI*2);ctx.fill();
    const skin='#e1a780',skinLit='#ffd0aa',skinShade='#985a50',ink='#332b3a',teal='#eee9dd',tealLit='#497ec0',red='#c73e4a',redLit='#f16b70',gold='#f3cf70';
    // Legs, boots, and ankle wraps; knees shift subtly through the idle stance.
    poly([[-24,-66],[-4,-66],[-8,-29],[-16,-19],[-31,-24],[-30,-39]],skin);
    poly([[4,-66],[26,-68],[31,-36],[25,-22],[10,-20],[7,-36]],skin);
    poly([[-20,-51],[-7,-49],[-12,-34],[-26,-34]],skinLit);poly([[13,-51],[26,-49],[28,-35],[13,-34]],skinShade);
    rect(-34,-27,34,12,ink);rect(6,-27,37,12,ink);rect(-32,-29,30,4,'#eee5d2');rect(9,-29,31,4,'#eee5d2');
    rect(-33,-17,36,5,'#51415c');rect(7,-17,39,5,'#51415c');
    // Back arm in guard, articulated at the shoulder and elbow.
    ctx.save();ctx.translate(-27,-137);ctx.rotate(-.08-idle*.035+windup*.12);
    poly([[-2,-3],[-15,-7],[-25,8],[-22,25],[-8,28],[3,15]],skin);
    poly([[-16,4],[-23,13],[-20,23],[-12,20],[-8,10]],skinLit);
    roundRect(-37,5,31,29,9,red);rect(-37,10,8,13,'#f2b58e');rect(-33,4,25,5,redLit);rect(-33,30,24,4,'#a72f43');
    ctx.restore();
    // Torso has a tapered silhouette with readable singlet panels and muscle highlights.
    const torsoBounce=breathing*1.3;
    poly([[-29,-147],[-17,-157],[0,-151],[17,-157],[30,-146],[27,-112],[20,-91],[27,-72],[20,-63],[-22,-63],[-29,-75],[-21,-95],[-28,-116]],skin);
    poly([[-28,-145],[-17,-155],[-4,-150],[-7,-111],[-18,-99],[-25,-114]],skinLit);
    poly([[2,-149],[18,-154],[29,-144],[25,-116],[15,-103],[8,-111]],skinShade);
    // singlet straps and chest opening
    poly([[-30,-147],[-24,-160],[-12,-157],[-8,-130],[-15,-113],[-27,-119]],tealLit);
    poly([[30,-147],[24,-160],[12,-157],[8,-130],[15,-113],[27,-119]],tealLit);
    poly([[-25,-145],[-13,-154],[0,-149],[13,-154],[25,-145],[22,-111],[0,-105],[-22,-111]],teal);
    poly([[-20,-139],[-9,-145],[-2,-139],[-5,-127],[-19,-126]],tealLit);
    poly([[20,-139],[9,-145],[2,-139],[5,-127],[19,-126]],'#315b91');
    ctx.strokeStyle='#164e50';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-2,-134);ctx.lineTo(-1,-114);ctx.moveTo(-18,-119);ctx.lineTo(-4,-115);ctx.moveTo(18,-119);ctx.lineTo(4,-115);ctx.stroke();
    // Defined abs and contrasting trim give the tiny sprite extra character.
    poly([[-13,-106],[0,-110],[13,-106],[11,-92],[6,-85],[-6,-85],[-11,-92]],skin);
    ctx.strokeStyle=skinShade;ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(0,-106);ctx.lineTo(0,-87);ctx.moveTo(-10,-99);ctx.lineTo(-2,-97);ctx.moveTo(10,-99);ctx.lineTo(2,-97);ctx.stroke();
    // Bright trunks, waistband, side stripes, and a tiny gold crest.
    poly([[-25,-88],[0,-84],[25,-88],[28,-65],[8,-61],[1,-72],[-6,-61],[-28,-65]],red);
    rect(-26,-89,52,7,gold);rect(-24,-80,5,13,'#ff8173');rect(20,-80,5,13,'#a72f43');
    poly([[-5,-83],[0,-86],[5,-83],[4,-77],[-4,-77]],gold);
    // Neck, ears and broad jaw.
    rect(-10,-173,20,23,skin);rect(-8,-171,8,18,skinLit);rect(-26,-190,7,13,skin);rect(19,-190,7,13,skinShade);
    poly([[-24,-205],[-15,-215],[4,-216],[20,-207],[24,-191],[20,-178],[12,-169],[0,-165],[-13,-169],[-22,-180],[-26,-193]],skin);
    poly([[-23,-196],[-18,-207],[-7,-210],[-9,-188],[-16,-178],[-22,-184]],skinLit);
    // Signature swept dark hair, sideburns, brows and readable facial expression.
    poly([[-27,-194],[-30,-207],[-20,-213],[-23,-222],[-8,-218],[-3,-227],[3,-218],[17,-222],[25,-213],[23,-203],[15,-208],[9,-204],[-1,-210],[-11,-205]],'#572b40');
    poly([[-25,-193],[-22,-205],[-15,-208],[-15,-196],[-19,-188]],'#754054');rect(-23,-190,5,13,'#572b40');rect(19,-191,5,12,'#572b40');
    rect(-17,-191,7,3,ink);rect(8,-191,7,3,ink);rect(-15,-192,3,2,'#fff0cb');rect(10,-192,3,2,'#fff0cb');
    poly([[-19,-197],[-10,-200],[-5,-197],[-15,-195]],ink);poly([[7,-197],[13,-200],[20,-197],[13,-195]],ink);
    poly([[-3,-190],[1,-186],[0,-181],[-4,-181]],skinShade);rect(-8,-175,17,3,'#713d3a');rect(-6,-173,13,2,'#f5c2a0');
    // A couple of faded cheek marks make the old arcade veteran unmistakable.
    ctx.strokeStyle='#a94f5a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-18,-183);ctx.lineTo(-11,-181);ctx.moveTo(12,-184);ctx.lineTo(18,-182);ctx.stroke();
    // Lead arm sweeps in a smooth arc; during windup it coils back before the strike.
    const leadSide=enemy.attack==='left hook'?-1:1;
    const extend=swing*40, coil=windup*12;
    ctx.save();ctx.translate(leadSide*27,-137);ctx.rotate((leadSide<0?-1:1)*(-.05+windup*.4+swing*.12));
    poly([[-1,-2],[13,-8],[25,4],[22,19],[9,27],[-3,14]],skin);
    poly([[9,0],[20,5],[19,15],[9,21],[4,12]],skinLit);
    ctx.translate(leadSide*(extend-coil),swing*(enemy.attack==='body shot'?15:-17));
    ctx.rotate(leadSide*swing*.14);
    roundRect(-4,-9,34,31,10,red);rect(0,-7,26,5,redLit);rect(2,17,25,5,'#a72f43');rect(23,-3,6,12,'#ffab85');
    ctx.strokeStyle='#ffe0b0';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(2,-2);ctx.lineTo(25,-2);ctx.stroke();
    ctx.restore();
    // Tiny highlights and hit flash preserve the intentionally chunky, hand-drawn arcade look.
    rect(-25,-145,8,3,tealLit);rect(17,-145,8,3,'#185b5d');
    if(enemy.guard>0){ctx.strokeStyle='#fff1a0';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,-155,48,Math.PI*1.12,Math.PI*1.88);ctx.stroke()}
    if(enemy.flash>0){ctx.globalAlpha=.42;rect(-62,-226,124,213,'#fff4d6');ctx.globalAlpha=1;}
    ctx.restore();
  }
  function drawPOV(){
    const dodgeProgress=player.dodge>0?1-player.dodge/.58:1;
    const slip=player.dodge>0?player.dodgeDir*Math.sin(dodgeProgress*Math.PI)*29:0;
    const punchProgress=player.punch>0?1-player.punch/.31:0;
    const punchReach=Math.sin(clamp(punchProgress)*Math.PI)*43;
    const jab=player.punch>0;
    ctx.save();ctx.translate(slip,player.hit>0?8:0);
    // Forearms and gloves frame the ring from the boxer's point of view.
    poly([[115,430],[158,430],[215,347],[188,328],[143,366]],'#b36d52');
    poly([[605,430],[563,430],[505,347],[532,328],[577,366]],'#b36d52');
    if(jab){
      const hook=player.punchType==='hook';
      const x=(hook?450:365)+(hook?1:-.25)*punchReach;
      const y=260-Math.sin(punchProgress*Math.PI)*18;
      poly([[505,372],[536,354],[x+15,294],[x-20,282],[x-2,345]],'#b36d52');
      roundRect(x-30,y,65,56,17,player.punchType==='special'?'#ffca4b':'#2877c7');
      rect(x-20,y+10,42,7,'#77c8ff');
    }else{
      const guardBob=Math.sin(elapsed*5)*2;
      roundRect(120,331+guardBob,92,77,22,'#2877c7');roundRect(508,331-guardBob,92,77,22,'#2877c7');
      rect(137,343+guardBob,52,8,'#77c8ff');rect(525,343-guardBob,52,8,'#77c8ff');
    }
    ctx.restore();
  }
  function draw(){ctx.save();if(shake>0){ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);shake*=.85;if(shake<.3)shake=0}drawBackground(elapsed);
    if(!renderer.available)drawRival();drawPOV();
    if(state==='fight'&&(enemy.mode==='windup'||enemy.mode==='feint')){const pulse=.5+.4*Math.sin(elapsed*18);roundRect(268,50,184,30,3,`rgba(255,77,91,${.16+pulse*.25})`);ctx.fillStyle='#fff0c4';ctx.font='bold 13px "DM Mono",monospace';ctx.textAlign='center';ctx.fillText(enemy.attack==='feint'?'DON’T FALL FOR IT':`SLIP ${enemy.dodgeAnswer<0?'LEFT':'RIGHT'}!`,360,70);}
    if(player.punch>0){const progress=1-player.punch/.31;const reach=Math.sin(clamp(progress)*Math.PI);ctx.strokeStyle=player.punchType==='special'?'#ffdf67':'#e9f8ff';ctx.globalAlpha=reach*.72;ctx.lineWidth=3+reach*3;ctx.beginPath();ctx.moveTo(360,330);ctx.lineTo((player.punchType==='hook'?445:375)+(player.punchType==='hook'?1:-.25)*reach*43,283-reach*18);ctx.stroke();ctx.globalAlpha=1}
    for(const p of particles){ctx.globalAlpha=Math.max(0,p.life*2);rect(p.x,p.y,p.size,p.size,p.color)}ctx.globalAlpha=1;
    for(const f of floating){ctx.globalAlpha=Math.min(1,f.life*2);ctx.fillStyle=f.color;ctx.font='900 20px "Barlow Condensed",sans-serif';ctx.textAlign='center';ctx.shadowColor='#172034';ctx.shadowBlur=4;ctx.fillText(f.text,f.x,f.y);ctx.shadowBlur=0}ctx.globalAlpha=1;
    if(state==='ready'){ctx.fillStyle='#ffffff99';ctx.font='11px "DM Mono",monospace';ctx.textAlign='center';ctx.fillText('SLIP THE CALLED DIRECTION • COUNTER WHEN HE’S OPEN',360,409)}
    ctx.restore();}
  function loop(now){const dt=Math.min(.04,(now-last)/1000||0);last=now;if(hitStop>0){hitStop-=dt}else update(dt);draw();renderer.render(now/1000,enemy,player,state);requestAnimationFrame(loop)}
  updateContender();updateBars();requestAnimationFrame(loop);
})();
