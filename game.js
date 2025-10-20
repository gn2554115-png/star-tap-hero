// ===== 修正版：DPR 對齊、點擊準、無黑屏、頂部橫幅記分、進階特效、難度曲線、計時 =====
const play = document.getElementById("play");
const cvs  = document.getElementById("game");
const fx   = document.getElementById("fx");
const ctx  = cvs.getContext("2d");
const fxc  = fx.getContext("2d");
const startBtn = document.getElementById("startBtn");
const scoreEl  = document.getElementById("score");
const loginBtn = document.getElementById("loginBtn");
const sbTotal  = document.getElementById("sbTotal");
const timerEl  = document.getElementById("timer");

const COINS = [
  { key:"PI", label:"π", color:"#9B4DFF", baseR:34, score:5 },
  { key:"B" , label:"₿", color:"#F7931A", baseR:26, score:3 },
  { key:"E" , label:"Ξ", color:"#627EEA", baseR:24, score:2 },
  { key:"S" , label:"S", color:"#111827", baseR:22, score:2 },
  { key:"U" , label:"U", color:"#22c55e", baseR:22, score:1 },
  { key:"D" , label:"Ð", color:"#C2A633", baseR:22, score:1 },
];
const weights = COINS.map(c=>1/c.baseR);
const WSUM = weights.reduce((a,b)=>a+b,0);

// 橫幅小數字元素
const v = { PI:document.getElementById("vPI"), B:document.getElementById("vB"),
  E:document.getElementById("vE"), S:document.getElementById("vS"),
  U:document.getElementById("vU"), D:document.getElementById("vD") };

let dpr = 1;
function fitCanvas(){
  // 依 CSS 尺寸 * dpr 設定實像素，context 縮放；FX 同步
  const rect = cvs.getBoundingClientRect();
  dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  cvs.width = Math.round(rect.width * dpr);
  cvs.height= Math.round(rect.height* dpr);
  fx.width  = cvs.width;
  fx.height = cvs.height;
  ctx.setTransform(dpr,0,0,dpr,0,0);      // 之後以 CSS 座標作畫
  fxc.setTransform(dpr,0,0,dpr,0,0);
}
addEventListener("resize", fitCanvas);
fitCanvas();

// 狀態
let drops=[], score=0, counts={PI:0,B:0,E:0,S:0,U:0,D:0}, started=false;
let last=performance.now(), startTime=0, spawnTimer=0, spawnIv=520, maxOn=6;
const STEP_MS=9000;

function fmtTime(ms){ const s=Math.floor(ms/1000), m=Math.floor(s/60);
  return `${String(m).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`; }

function updateHUD(){
  scoreEl.textContent = `Score: ${score}`;
  const total = Object.values(counts).reduce((a,b)=>a+b,0);
  sbTotal.textContent = total;
  for (const k in v) v[k].textContent = counts[k];
}

function pickCoin(){ let r=Math.random()*WSUM;
  for (let i=0;i<COINS.length;i++){ r-=weights[i]; if (r<=0) return COINS[i]; }
  return COINS[0];
}

function spawn(){
  if (drops.length>=maxOn) return;
  const c=pickCoin();
  const r=c.baseR+(Math.random()*4-2);
  const v=1.0+(r-18)/(36-18)*(3.8-1.0); // 大顆更快
  const rect=cvs.getBoundingClientRect();
  drops.push({ coin:c, r, x: r+Math.random()*((rect.width)-2*r), y:-r-10,
    v, rot:Math.random()*Math.PI*2, vr:(Math.random()-0.5)*0.06 });
}

function drawCoin(d){
  const {x,y,r,coin}=d;
  ctx.fillStyle=coin.color; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
  ctx.save(); ctx.translate(x,y); ctx.rotate(d.rot);
  ctx.fillStyle="#fff"; ctx.font=`bold ${Math.round(r*1.15)}px Arial`;
  ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText(coin.label,0,1);
  ctx.restore();
}

// ---- 更華麗的煙火 + 光暈 + 流星尾 ----
function glow(x,y,color){
  const grd=ctx.createRadialGradient(x,y,6,x,y,42);
  grd.addColorStop(0,"rgba(255,255,255,.95)");
  grd.addColorStop(.25,color+"AA"); grd.addColorStop(1,"rgba(0,0,0,0)");
  ctx.save(); ctx.globalCompositeOperation="lighter";
  ctx.fillStyle=grd; ctx.beginPath(); ctx.arc(x,y,42,0,Math.PI*2); ctx.fill(); ctx.restore();
}
function burst(x,y,color){
  const N=22, parts=[];
  for (let i=0;i<N;i++){
    const a=Math.random()*Math.PI*2, sp=1.4+Math.random()*2.8;
    parts.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:22, r:3+Math.random()*2});
  }
  (function step(){
    ctx.save(); ctx.globalCompositeOperation="lighter";
    for (const p of parts){
      p.x+=p.vx; p.y+=p.vy; p.vy+=0.04; p.life--;
      ctx.fillStyle=color; ctx.globalAlpha=Math.max(0,p.life/22);
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
    for (let i=parts.length-1;i>=0;i--) if(parts[i].life<=0) parts.splice(i,1);
    if (parts.length) requestAnimationFrame(step);
  })();
}
function meteor(x,y,key,color){
  // 用 fx 層畫半透明尾跡（每幀清除）
  const rect=cvs.getBoundingClientRect();
  const from={x,y}, to={ // 頂部條的該點
    x: rect.width - 160 + (["PI","B","E","S","U","D"].indexOf(key))*26, y: -16
  };
  let t=0, T=30;
  (function step(){
    fxc.clearRect(0,0,fx.width/dpr,fx.height/dpr);
    const k=t/T;
    const px=from.x+(to.x-from.x)*k, py=from.y+(to.y-from.y)*k - Math.sin(k*Math.PI)*24;
    fxc.save(); fxc.globalAlpha=.95;
    // 尾巴
    fxc.strokeStyle=color; fxc.lineWidth=3;
    fxc.beginPath(); fxc.moveTo(px-12,py-8); fxc.lineTo(px,py); fxc.stroke();
    // 彈頭
    fxc.fillStyle=color; fxc.beginPath(); fxc.arc(px,py,4,0,Math.PI*2); fxc.fill();
    fxc.restore();
    if (++t<=T) requestAnimationFrame(step);
  })();
}

// 抖動 & 震動（Android 有效；iOS 不支援 vibrate）
function shake(){ play.classList.remove("shake"); void play.offsetWidth; play.classList.add("shake"); }
function vibrate(pattern=20){ if (navigator.vibrate) navigator.vibrate(pattern); }

// 主迴圈
function loop(now=performance.now()){
  const dt = now - last; last = now;
  // 背景
  ctx.fillStyle="#1A1038"; ctx.fillRect(0,0,cvs.getBoundingClientRect().width,cvs.getBoundingClientRect().height);

  // 難度曲線
  const elapsed = now - startTime;
  timerEl.textContent = fmtTime(elapsed);
  const level = Math.floor(elapsed / STEP_MS);
  spawnIv = Math.max(260, 520 - level*30);
  maxOn   = Math.min(16, 6 + Math.floor(level/2));

  // 生成
  spawnTimer += dt;
  if (spawnTimer >= spawnIv){ spawn(); spawnTimer = 0; }

  // 更新+畫
  for (const d of drops){ d.y += d.v; d.rot += d.vr; drawCoin(d); }

  // 出界扣分
  drops = drops.filter(d=>{
    if (d.y < cvs.getBoundingClientRect().height + d.r) return true;
    score = Math.max(0, score-1); updateHUD(); return false;
  });

  requestAnimationFrame(loop);
}

// 點擊（用 CSS 座標 → 不需要自己乘 dpr，因為 context 已 setTransform）
cvs.addEventListener("pointerdown", (e)=>{
  const r=cvs.getBoundingClientRect();
  const x=e.clientX-r.left, y=e.clientY-r.top;
  let hit=false;
  drops = drops.filter(d=>{
    if (Math.hypot(x-d.x,y-d.y) <= d.r){
      hit=true; counts[d.coin.key]++; score += d.coin.score; updateHUD();
      glow(d.x,d.y,d.coin.color); burst(d.x,d.y,d.coin.color); meteor(d.x,d.y,d.coin.key,d.coin.color);
      if (d.coin.key==="PI"){ shake(); vibrate([20,30,20]); beep(800); } else { vibrate(12); beep(640); }
      return false;
    }
    return true;
  });
});

// WebAudio 小音效
let audioCtx = new (window.AudioContext||window.webkitAudioContext)();
function beep(freq=660, dur=90, vol=.06){
  const o=audioCtx.createOscillator(), g=audioCtx.createGain();
  o.type="sine"; o.frequency.value=freq; g.gain.value=vol;
  o.connect(g).connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime+dur/1000);
}

// Start
startBtn.addEventListener("click", ()=>{
  if (started) return;
  started=true; drops.length=0; score=0; counts={PI:0,B:0,E:0,S:0,U:0,D:0}; updateHUD();
  startTime = last = performance.now(); spawnTimer=0; requestAnimationFrame(loop);
});

// Pi SDK 仍保留
if (typeof Pi!=="undefined" && Pi?.init){ try{ Pi.init({version:"2.0", sandbox:true}); }catch{} }
if (loginBtn){ loginBtn.addEventListener("click", async ()=>{
  try{ const r=await Pi.authenticate(['username','payments'], p=>console.log('incomplete',p));
    alert(`Welcome @${r.user.username}!`);}catch(e){console.log(e)}
}); }
