// MOTO MATRIX PLUS: पुराने कोड के ऊपर जुड़ता है (इसे मुख्य <script> के बाद लोड करें)
(function(){
'use strict';
const T=THREE;
const X={coins:[],wheels:[],brake:false,paused:false,coinCount:0,best:+(localStorage.getItem('mm_best')||0),fov:75};

/* ---------- HUD + बटन ---------- */
const hud=document.getElementById('hud');
const extra=document.createElement('div');
extra.innerHTML='<div class="stat"><span>Gear</span><span id="gear-val">N</span></div><div class="stat"><span>RPM</span><span id="rpm-val">0</span></div><div class="stat"><span>Coins</span><span id="coin-val">0</span></div><div class="stat"><span>Best</span><span id="best-val">'+X.best+'</span></div>';
hud.appendChild(extra);

const pause=document.createElement('button');pause.id='pause-btn';pause.textContent='⏸';document.body.appendChild(pause);
const ov=document.createElement('div');ov.id='pause-ov';ov.textContent='PAUSED';document.body.appendChild(ov);
const brakeBtn=document.createElement('div');brakeBtn.className='touch-btn';brakeBtn.id='btn-brake';brakeBtn.textContent='STOP';
document.querySelectorAll('#mobile-controls .touch-group')[1].prepend(brakeBtn);
bindTouch('btn-brake','brake');            // पुराने कोड का फंक्शन
const inst=document.createElement('button');inst.id='install-btn';inst.textContent='📲 Install App';
document.getElementById('menu').appendChild(inst);

function togglePause(){ if(!gameState.running&&!X.paused)return; X.paused=!X.paused; ov.style.display=X.paused?'flex':'none'; }
pause.onclick=togglePause;
addEventListener('keydown',e=>{
  if(e.key==='s'||e.key==='ArrowDown')gameState.keys.brake=true;
  if(e.key==='p'||e.key==='Escape')togglePause();
});
addEventListener('keyup',e=>{ if(e.key==='s'||e.key==='ArrowDown')gameState.keys.brake=false; });
document.addEventListener('visibilitychange',()=>{ if(document.hidden&&gameState.running&&!X.paused)togglePause(); });

/* ---------- भाषा ---------- */
document.getElementById('lang-select').addEventListener('change',e=>{
  const L=I18N[e.target.value];
  document.getElementById('ui-title').textContent=L.title;
  document.getElementById('start-btn').textContent=L.start;
  document.querySelector('#game-over h3').textContent=L.crash;
});

/* ---------- आवाज़ ---------- */
function beep(f,d){ if(!audioCtx)return; const o=audioCtx.createOscillator(),g=audioCtx.createGain();
  o.type='square';o.frequency.value=f;g.gain.setValueAtTime(.08,audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+d);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+d); }

/* ---------- बाइक को असली जैसा बनाना (पहिए, राइडर, टेल-लाइट) + सिक्के ---------- */
const _build=buildWorld;
buildWorld=function(){
  _build();
  X.coins=[];X.wheels=[];X.coinCount=0;X.paused=false;
  const wm=new T.MeshStandardMaterial({color:0x111111,roughness:.9});
  const rim=new T.MeshStandardMaterial({color:0xcccccc,metalness:1,roughness:.2});
  [-0.95,0.95].forEach(z=>{
    const g=new T.Group();
    const tyre=new T.Mesh(new T.CylinderGeometry(.5,.5,.28,20).rotateZ(Math.PI/2),wm);
    const hub=new T.Mesh(new T.CylinderGeometry(.25,.25,.3,8).rotateZ(Math.PI/2),rim);
    const spoke=new T.Mesh(new T.BoxGeometry(.3,.08,.9),rim);
    g.add(tyre,hub,spoke);g.position.set(0,.5,z);playerBike.add(g);X.wheels.push(g);
  });
  const body=new T.MeshStandardMaterial({color:0x222233,roughness:.6});
  const torso=new T.Mesh(new T.BoxGeometry(.5,.8,.4),body);torso.position.set(0,1.4,.1);torso.rotation.x=-.5;
  const head=new T.Mesh(new T.SphereGeometry(.28,12,12),new T.MeshStandardMaterial({color:0xffffff}));head.position.set(0,2,-.25);
  const tail=new T.Mesh(new T.BoxGeometry(.5,.12,.08),new T.MeshBasicMaterial({color:0xff0000}));tail.position.set(0,.8,1.25);tail.name='tail';
  playerBike.add(torso,head,tail);
  const cg=new T.CylinderGeometry(.5,.5,.12,16).rotateX(Math.PI/2),cm=new T.MeshStandardMaterial({color:0xffd700,metalness:1,roughness:.2,emissive:0x664400});
  for(let i=0;i<45;i++){const c=new T.Mesh(cg,cm);c.position.set((Math.random()-.5)*22,1.2,-25-i*18);scene.add(c);X.coins.push(c);}
  document.getElementById('coin-val').textContent=0;
};

/* ---------- फिजिक्स में नई चीज़ें ---------- */
const _upd=updatePhysics;
updatePhysics=function(){
  if(X.paused||!gameState.running)return;
  _upd();
  if(!gameState.running)return;
  const cfg=BIKES[gameState.bikeType],k=gameState.keys,s=gameState.speed;
  // ब्रेक
  if(k.brake)gameState.speed=Math.max(s-.06,.25);
  const tail=playerBike.getObjectByName('tail');if(tail)tail.material.color.setHex(k.brake?0xffffff:0xff0000);
  // तेज़ी के साथ झुकाव गहरा + नाइट्रो पर व्हीली
  playerBike.rotation.z*=1+Math.min(gameState.speed/cfg.maxSpeed,1)*.15;
  const wt=gameState.isNitro?.22:(k.brake?-.05:0);
  playerBike.rotation.x+=(wt-playerBike.rotation.x)*.1;
  X.wheels.forEach(w=>w.rotation.x-=gameState.speed*.6);
  // सिक्के
  for(const c of X.coins){
    c.position.z+=gameState.speed;c.rotation.y+=.08;
    if(c.position.z>15){c.position.z=-800;c.position.x=(Math.random()-.5)*22;}
    if(Math.abs(c.position.z-playerBike.position.z)<1.6&&Math.abs(c.position.x-playerBike.position.x)<1.5&&Math.abs(c.position.y-(playerBike.position.y+1))<2.5){
      c.position.z=-800;c.position.x=(Math.random()-.5)*22;
      X.coinCount++;gameState.score+=25;beep(1200,.12);
      document.getElementById('coin-val').textContent=X.coinCount;
    }
  }
  // गियर और RPM
  const frac=Math.min(gameState.speed/(cfg.maxSpeed*1.6),1)*6,g=Math.min(6,Math.floor(frac)+1);
  document.getElementById('gear-val').textContent=gameState.speed<.3?'N':g;
  document.getElementById('rpm-val').textContent=Math.round(2000+(frac%1)*9000);
  // कैमरा: FOV + नाइट्रो में हल्का कंपन
  const tf=75+gameState.speed*4+(gameState.isNitro?10:0);
  X.fov+=(tf-X.fov)*.08;camera.fov=X.fov;camera.updateProjectionMatrix();
  if(gameState.isNitro)camera.position.x+=(Math.random()-.5)*.08;
  // दिन-रात जैसा बदलाव: स्कोर के साथ धुंध गहरी
  scene.fog.density=.012+Math.min(gameState.score/60000,.01);
};

/* ---------- क्रैश: हाई स्कोर + वाइब्रेशन ---------- */
const _over=triggerGameOver;
triggerGameOver=function(){
  _over();
  if(navigator.vibrate)navigator.vibrate([200,80,300]);
  if(gameState.score>X.best){X.best=gameState.score;localStorage.setItem('mm_best',X.best);}
  document.getElementById('best-val').textContent=X.best;
  document.getElementById('final-score').textContent='Final Score: '+gameState.score+' | Coins: '+X.coinCount+' | Best: '+X.best;
};

/* ---------- ऐप इंस्टॉल + ऑफलाइन ---------- */
let dp;addEventListener('beforeinstallprompt',e=>{e.preventDefault();dp=e;inst.style.display='block';});
inst.onclick=()=>{if(dp){dp.prompt();dp=null;inst.style.display='none';}};
if('serviceWorker'in navigator)addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
})();
