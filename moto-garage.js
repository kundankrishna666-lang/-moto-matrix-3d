// RIDER LEGEND: गैराज (R15 / Bullet / GT650) + सेटिंग्स + बेहतर सिमुलेशन. moto-plus.js के बाद लोड करें
(function(){
'use strict';
const T=THREE;
const GAME_NAME='RIDER LEGEND 3D';   // <-- गेम का नाम यहाँ बदलें
document.title=GAME_NAME;I18N.en.title=GAME_NAME;I18N.hi.title=GAME_NAME;
document.getElementById('ui-title').textContent=GAME_NAME;
document.querySelector('#menu h2').textContent=GAME_NAME;

/* ---------- बाइक डेटा ---------- */
const SPEC={
 r15:{label:'Yamaha R15 (Sport)',kind:'sport',body:0x1456ff,top:140,snd:1.5,wr:.42,helmet:0xffffff,jacket:0x15171c},
 bullet:{label:'Bullet 350 (Cruiser)',kind:'cruiser',body:0x1b1b1b,top:115,snd:.55,wr:.46,helmet:0x8b5a2b,jacket:0x5a4020},
 gt650:{label:'Continental GT 650 (Cafe Racer)',kind:'cafe',body:0xc8202a,top:170,snd:.85,wr:.45,helmet:0x222222,jacket:0x3a3a3a}
};
Object.assign(BIKES,{
 r15:{color:0x3d8bff,maxSpeed:2.7,accel:.05,handling:.26,nitroMax:90},
 bullet:{color:0xffb300,maxSpeed:2.1,accel:.03,handling:.17,nitroMax:120},
 gt650:{color:0xff3b47,maxSpeed:3.0,accel:.055,handling:.21,nitroMax:100}});
Object.values(BIKES).forEach(b=>b._h=b.handling);
const sel=document.getElementById('bike-select');
Object.keys(SPEC).reverse().forEach(k=>{const o=document.createElement('option');o.value=k;o.textContent='Bike: '+SPEC[k].label;sel.prepend(o);});
sel.value='r15';
const info=document.createElement('p');info.id='bike-info';
const upd=()=>{const s=SPEC[sel.value];info.textContent=s?'Top speed ≈ '+s.top+' km/h · '+{sport:'Sport',cruiser:'Cruiser',cafe:'Cafe Racer'}[s.kind]:'Arcade bike';};
sel.addEventListener('change',upd);upd();

/* ---------- सेटिंग्स ---------- */
const S=Object.assign({steer:1,brake:1,btn:1,cam:0,hq:true,tilt:false,sound:true},JSON.parse(localStorage.getItem('mm_set')||'{}'));
const st=document.createElement('style');
st.textContent='#set-panel{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);display:none;z-index:30;background:rgba(10,15,30,.97);border:1px solid #00ffcc;border-radius:12px;padding:18px;width:min(92vw,340px);max-height:88vh;overflow:auto}#set-panel h3{color:#00ffcc;margin-bottom:6px}#set-panel label{display:flex;justify-content:space-between;align-items:center;gap:10px;margin:10px 0;font-size:14px;color:#cbd5e1}#set-panel input[type=range]{width:50%}#bike-info{color:#cbd5e1;font-size:14px}';
document.head.appendChild(st);
const panel=document.createElement('div');panel.id='set-panel';
panel.innerHTML='<h3>⚙ Settings</h3><label>Steering sensitivity<input type="range" id="s-steer" min="0.6" max="1.6" step="0.05"></label><label>Brake strength<input type="range" id="s-brake" min="0.5" max="2" step="0.1"></label><label>Touch button size<input type="range" id="s-btn" min="0.8" max="1.5" step="0.05"></label><label>Camera<select id="s-cam"><option value="0">Chase</option><option value="1">Far</option><option value="2">High</option><option value="3">Close</option></select></label><label>Graphics<select id="s-hq"><option value="1">High</option><option value="0">Battery saver</option></select></label><label>Tilt steering (phone)<input type="checkbox" id="s-tilt"></label><label>Sound<input type="checkbox" id="s-sound"></label><button id="s-close">Close</button>';
document.body.appendChild(panel);
function apply(){
  document.querySelectorAll('.touch-btn').forEach(b=>{b.style.width=b.style.height=(70*S.btn)+'px';});
  renderer.setPixelRatio(S.hq?Math.min(devicePixelRatio,2):1);renderer.setSize(innerWidth,innerHeight);
  if(audioCtx)(S.sound?audioCtx.resume():audioCtx.suspend());
  Object.values(BIKES).forEach(b=>b.handling=b._h*S.steer);
}
[['steer','steer'],['brake','brake'],['btn','btn'],['cam','cam'],['hq','hq'],['tilt','tilt'],['sound','sound']].forEach(([id,key])=>{
  const el=panel.querySelector('#s-'+id);
  if(el.type==='checkbox')el.checked=S[key];else el.value=typeof S[key]==='boolean'?(S[key]?1:0):S[key];
  el.oninput=el.onchange=()=>{S[key]=el.type==='checkbox'?el.checked:(typeof S[key]==='boolean'?el.value==='1':+el.value);localStorage.setItem('mm_set',JSON.stringify(S));apply();};
});
const sb=document.createElement('button');sb.id='set-btn';sb.textContent='⚙ Settings';
const startBtn=document.getElementById('start-btn');startBtn.before(info,sb);
sb.onclick=()=>panel.style.display='block';
panel.querySelector('#s-close').onclick=()=>panel.style.display='none';
startBtn.addEventListener('click',()=>{
  if(S.tilt&&window.DeviceOrientationEvent&&DeviceOrientationEvent.requestPermission)DeviceOrientationEvent.requestPermission().catch(()=>{});
  apply();
});
addEventListener('deviceorientation',e=>{
  if(!S.tilt||!gameState.running)return;
  const a=(screen.orientation&&screen.orientation.angle)||0;
  const t=a===90?e.beta:a===270?-e.beta:e.gamma;
  gameState.keys.left=t<-8;gameState.keys.right=t>8;
});
apply();

/* ---------- 3D मॉडल बनाने के औज़ार ---------- */
const mat=(c,m=.3,r=.5,e=0)=>new T.MeshStandardMaterial({color:c,metalness:m,roughness:r,emissive:e});
const DARK=mat(0x2a2e36,.3,.5),CHROME=mat(0xe5e9f0,.35,.25,0x222222),BLACK=mat(0x0a0a0a,.2,.8);
const LIGHT=new T.MeshBasicMaterial({color:0xfff6d0});
const V=(x,y,z)=>new T.Vector3(x,y,z);
function rod(g,a,b,r,m){const d=new T.Vector3().subVectors(b,a),L=d.length();
  const o=new T.Mesh(new T.CylinderGeometry(r,r,L,10),m);o.position.copy(a).addScaledVector(d,.5);
  o.quaternion.setFromUnitVectors(V(0,1,0),d.normalize());g.add(o);return o;}
function box(g,w,h,d,m,x,y,z,rx){const o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.position.set(x,y,z);if(rx)o.rotation.x=rx;g.add(o);return o;}
function ell(g,sx,sy,sz,m,x,y,z){const o=new T.Mesh(new T.SphereGeometry(1,16,12),m);o.scale.set(sx,sy,sz);o.position.set(x,y,z);g.add(o);return o;}
function wheel(r,w){const g=new T.Group();
  g.add(new T.Mesh(new T.CylinderGeometry(r,r,w,20).rotateZ(Math.PI/2),BLACK));
  g.add(new T.Mesh(new T.CylinderGeometry(r*.7,r*.7,w+.02,16).rotateZ(Math.PI/2),CHROME));
  for(let i=0;i<5;i++){const s=new T.Mesh(new T.BoxGeometry(w+.04,.06,r*1.35),DARK);s.rotation.x=i*Math.PI/5;g.add(s);}
  const d=new T.Mesh(new T.CylinderGeometry(r*.5,r*.5,.02,14).rotateZ(Math.PI/2),mat(0x999999,.4,.3));d.position.x=w/2+.02;g.add(d);return g;}

function buildBike(sp){
  const g=new T.Group(),fg=new T.Group(),R=sp.wr,K=sp.kind,wheels=[];
  const paint=mat(sp.body,.3,.35,new T.Color(sp.body).multiplyScalar(.15).getHex());
  const jk=mat(sp.jacket,.1,.8),hm=mat(sp.helmet,.3,.3);
  const rw=wheel(R,K==='sport'?.3:.24);rw.position.set(0,R,1);g.add(rw);wheels.push(rw);
  const fw=wheel(R,.2);fw.position.set(0,R,-.25);fg.add(fw);wheels.push(fw);
  fg.position.set(0,0,-.75);g.add(fg);
  [-.12,.12].forEach(x=>rod(fg,V(x,R,-.25),V(x,1.3,.05),.035,CHROME));
  box(g,.5,.45,.75,DARK,0,.6,.1);rod(g,V(0,1.1,-.55),V(0,.65,.9),.05,DARK);
  const hb={sport:{y:1.45,z:.1,w:.35},cruiser:{y:1.62,z:.05,w:.4},cafe:{y:1.46,z:.05,w:.38}}[K];
  let sh,seatZ=.55,tailZ=1.45;
  if(K==='sport'){
    box(g,.42,.3,.5,paint,0,.8,-.3);ell(g,.24,.22,.5,paint,0,1.25,-.3);
    box(g,.4,.1,.5,BLACK,0,1.12,.55);box(g,.34,.18,.7,paint,0,1.2,1.15,.2);tailZ=1.5;
    rod(g,V(.22,.45,.1),V(.26,.68,1.35),.07,CHROME);
    box(fg,.46,.4,.5,paint,0,1.42,-.2,-.3);
    [-.12,.12].forEach(x=>box(fg,.14,.06,.04,LIGHT,x,1.45,-.46));
    box(fg,.36,.28,.03,mat(0x88ccff,.1,.1),0,1.7,-.12,-.6);
    box(fg,.7,.05,.05,DARK,0,hb.y,hb.z);sh=V(0,1.62,-.05);
  }else if(K==='cruiser'){
    const c=new T.Mesh(new T.CylinderGeometry(.2,.2,.45,12),CHROME);c.position.set(0,.98,0);g.add(c);
    ell(g,.26,.27,.45,paint,0,1.28,-.25);
    box(g,.42,.12,.85,BLACK,0,1.08,.55);box(g,.34,.04,.9,paint,0,R*2+.05,1);
    [-1,1].forEach(s=>rod(g,V(.3*s,.42,-.1),V(.32*s,.44,1.4),.09,CHROME));
    ell(fg,.23,.23,.17,CHROME,0,1.45,-.37);ell(fg,.2,.2,.16,LIGHT,0,1.45,-.4);
    rod(fg,V(0,1.3,0),V(0,1.62,.05),.04,CHROME);rod(fg,V(-.42,1.62,.05),V(.42,1.62,.05),.03,CHROME);
    box(fg,.28,.04,.8,paint,0,R*2+.06,-.25);sh=V(0,1.95,.25);tailZ=1.4;
  }else{
    [-.14,.14].forEach(x=>{const c=new T.Mesh(new T.CylinderGeometry(.14,.14,.4,12),CHROME);c.position.set(x,.95,-.1);g.add(c);});
    ell(g,.25,.22,.5,paint,0,1.27,-.25);
    box(g,.38,.1,.55,BLACK,0,1.1,.4);ell(g,.2,.12,.45,paint,0,1.22,1);box(g,.3,.03,.5,paint,0,R*2+.05,1.3);
    [-1,1].forEach(s=>rod(g,V(.3*s,.5,-.2),V(.34*s,.62,1.45),.075,CHROME));
    ell(fg,.2,.2,.15,CHROME,0,1.38,-.4);ell(fg,.17,.17,.14,LIGHT,0,1.38,-.43);
    rod(fg,V(-.38,1.46,.05),V(.38,1.46,.05),.025,DARK);box(fg,.26,.03,.6,paint,0,R*2+.05,-.25);sh=V(0,1.8,.1);tailZ=1.4;
  }
  const brk=new T.Mesh(new T.BoxGeometry(.22,.08,.05),new T.MeshBasicMaterial({color:0x660000}));brk.position.set(0,1.05,tailZ);g.add(brk);
  // राइडर
  const hip=V(0,1.15,.55);rod(g,hip,sh,.2,jk);
  ell(g,.2,.21,.22,hm,sh.x,sh.y+.28,sh.z-.05);ell(g,.15,.07,.1,BLACK,sh.x,sh.y+.26,sh.z-.2);
  [-1,1].forEach(s=>{
    rod(g,V(.2*s,sh.y-.05,sh.z),V(hb.w*s,hb.y,hb.z-.75),.07,jk);
    rod(g,V(.2*s,1.1,.6),V(.3*s,.55,.15),.1,DARK);box(g,.12,.1,.28,BLACK,.3*s,.5,.1);
  });
  return {g,fg,wheels,wr:R,brk};
}

/* ---------- गेम में जोड़ना ---------- */
let M=null;
const _b=buildWorld;
buildWorld=function(){
  _b();apply();
  const sp=SPEC[gameState.bikeType];M=null;
  if(sp){playerBike.children.forEach(c=>c.visible=false);M=buildBike(sp);playerBike.add(M.g);}
};
const paused=()=>document.getElementById('pause-ov').style.display==='flex';
const _u=updatePhysics;
updatePhysics=function(){
  _u();
  if(!gameState.running||paused())return;
  const cfg=BIKES[gameState.bikeType],k=gameState.keys,sp=gameState.speed,s=SPEC[gameState.bikeType];
  if(k.brake)gameState.speed=Math.max(sp-(S.brake-1)*.04,.25);
  document.getElementById('speed-val').textContent=Math.round(Math.min(gameState.speed/cfg.maxSpeed,1.6)*(s?s.top:200));
  const C=[[4.5,9],[6,14],[8,11],[3.2,6]][S.cam]||[4.5,9];
  camera.position.y+=C[0]-4.5;camera.position.z=C[1];camera.lookAt(camera.position.x*.8,1.2,-10);
  if(M){
    const w=sp/M.wr*.25;M.wheels.forEach(x=>x.rotation.x-=w);
    const t=k.left?.35:k.right?-.35:0;M.fg.rotation.y+=(t-M.fg.rotation.y)*.2;
    M.brk.material.color.setHex(k.brake?0xff2222:0x660000);
    M.g.position.y=gameState.isJumping?0:Math.sin(performance.now()/60)*.012*Math.min(sp,2);
    M.g.rotation.x+=((k.brake?-.05:0)-M.g.rotation.x)*.15;
  }
};
const _a=updateAudioPitch;
updateAudioPitch=function(){
  _a();const s=SPEC[gameState.bikeType];
  if(engineOsc&&audioCtx&&s){engineOsc.type=s.kind==='cruiser'?'square':'sawtooth';
    engineOsc.frequency.setTargetAtTime((50+gameState.speed*40+(gameState.isNitro?50:0))*s.snd,audioCtx.currentTime,.1);}
};
})();

