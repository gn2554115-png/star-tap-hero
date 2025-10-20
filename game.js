// ===== Star Tap Hero - topbar + stereo audio + DPI fix =====

// DOM
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

// 幣種 & 權重（小顆機率高）
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

// 橫幅數字
const v = {
  PI:document.getElementById("vPI"),
  B: document.getElementById("vB"),
  E: document.getElementById("vE"),
  S: document.getElementById("vS"),
  U: document.getElementById("vU"),
  D: document.getElementById("vD"),
};

// ----- DPI 對齊：確保點擊準確 -----
let dpr = 1;
function fitCanvas() {
  const rect = cvs.getBoundingClientRect();
  dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  cvs.width  = Math.round(rect.width  * dpr);
  cvs.height = Math.round(rect.height * dpr);
  fx.width   = cvs.width;
  fx.height  = cvs.height;
  // 把 context 座標系縮放回「CSS像素」，之後畫圖/判點都用 CSS 座標
  ctx.setTransform(dpr,0,0,dpr,0,0);
  fxc.setTransform(dpr,0,0,dpr,0,0);
}
addEventListener("resize", fitCanvas);
fitCanvas();

// ----- 遊戲狀態 -----
let drops = [];
let score = 0;
let counts = { PI:0,B:0,E:0,S:0,U:0,D:0 };
let started = false;

// 難度曲線
let last = performance.now();
let startTime = 0;
let spawnTimer = 0;
let spawnIv = 520;           // 生成間隔（會隨時間遞減到 ~260）
let maxOn   = 6;             // 畫面同時上限（會遞增到 16）
const STEP_MS = 9000;

function fmtTime(ms){
  const s = Math.floor(ms/1000), m = Math.floor(s/60);
  return `${String(m).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
}

function updateHUD(){
  scoreEl.textContent = `Score: ${score}`;
  const total = Object.values(counts).reduce((a,b)=>a+b,0);
  sbTotal.textContent = total;
  for (const k in v) v[k].textContent = counts[k];
}

function pickCoin(){
  let r = Math.random()*WSUM;
  for (let i=0;i<COINS.length;i++){ r -= weights[i]; if (r<=0) return COINS[i]; }
  return COINS[0];
}

function spawn(){
  if (drops.length >= maxOn) return;
  const c = pickCoin();
  const r = c.baseR + (Math.random()*4 - 2);
  // 大顆更快
  const v = 1.0 + (r - 18) / (36 - 18) * (3.8 - 1.0);
  const rect = cvs.getBoundingClientRect();
  drops.push({
    coin:c, r,
    x: r + Math.random() * (rect.width - 2*r),
    y: -r - 10,
    v,
    rot: Math.random()*Math.PI*2,
    vr: (Math.random()-0.5)*0.06
  });
}

// ----- 更華麗的特效 -----
function glow(x,y,color){
  const grd = ctx.createRadialGradient(x,y,6,x,y,42);
  grd.addColorStop(0,"rgba(255,255,255,.95)");
  grd.addColorStop(.25,color+"AA");
  grd.addColorStop(1,"rgba(0,0,0,0)");
  ctx.save(); ctx.globalCompositeOperation="lighter";
  ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(x,y,42,0,Math.PI*2); ctx.fill();
  ctx.restore();
}

function burst(x,y,color){
  const N = 22, ps = [];
  for (let i=0;i<N;i++){
    const a = Math.random()*Math.PI*2, sp=1.4+Math.random()*2.8;
    ps.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:22,r:3+Math.random()*2});
  }
  (function step(){
    ctx.save(); ctx.globalCompositeOperation="lighter";
    for (const p of ps){
      p.x+=p.vx; p.y+=p.vy; p.vy+=0.04; p.life--;
      ctx.fillStyle=color; ctx.globalAlpha=Math.max(0,p.life/22);
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
    for (let i=ps.length-1;i>=0;i--) if(ps[i].life<=0) ps.splice(i,1);
    if (ps.length) requestAnimationFrame(step);
  })();
}

function meteor(x,y,key,color){
  // 流星畫在 fx（透明層）；每幀清空
  const rect = cvs.getBoundingClientRect();
  const from = {x,y}, to = { x: rect.width - 160 + (["PI","B","E","S","U","D"].indexOf(key))*26, y: -16 };
  let t=0, T=30;
  (function step(){
    fxc.clearRect(0,0,fx.width/dpr, fx.height/dpr);
    const k=t/T;
    const px = from.x + (to.x-from.x)*k;
    const py = from.y + (to.y-from.y)*k - Math.sin(k*Math.PI)*24;
    fxc.save(); fxc.globalAlpha=.95;
    fxc.strokeStyle=color; fxc.lineWidth=3;
    fxc.beginPath(); fxc.moveTo(px-12,py-8); fxc.lineTo(px,py); fxc.stroke();
    fxc.fillStyle=color; fxc.beginPath(); fxc.arc(px,py,4,0,Math.PI*2); fxc.fill();
    fxc.restore();
    if (++t<=T) requestAnimationFrame(step);
  })();
}

// 霓虹硬幣：外圈多層發光 + 內圈暗面 + 中央符號帶光暈
function drawCoin(d){
  const { x, y, r, coin } = d;
  const color = coin.color;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(d.rot);

  // --- 外圈多層發光（由大到小堆疊） ---
  for (let i = 5; i >= 1; i--) {
    const alpha = 0.10 + i * 0.05;             // 外層淡、內層亮
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.strokeStyle = hexWithAlpha(color, alpha);
    ctx.lineWidth = (r * 0.50) * (i / 5);      // 漸細
    ctx.shadowColor = color;
    ctx.shadowBlur = 8 + i * 6;
    ctx.stroke();
  }

  // --- 內圈底色（暗） ---
  const grd = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r * 0.92);
  grd.addColorStop(0, "rgba(0,0,0,0.25)");
  grd.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.88, 0, Math.PI * 2);
  ctx.fill();

  // --- 內圈細亮邊 ---
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.88, 0, Math.PI * 2);
  ctx.strokeStyle = hexWithAlpha(color, 0.9);
  ctx.lineWidth = Math.max(2, r * 0.07);
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.stroke();

  // --- 中央符號（白 + 光暈；S 是黑幣，用白描邊避免看不清） ---
  ctx.font = `bold ${Math.round(r*1.15)}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // 外發光字殼
  ctx.fillStyle = "#fff";
  ctx.shadowColor = color;
  ctx.shadowBlur = 16;
  ctx.fillText(coin.label, 0, 1);

  // S 是黑色系，額外描邊提高可讀性
  if (coin.key === "S") {
    ctx.lineWidth = Math.max(2, r * 0.10);
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.shadowBlur = 0;
    ctx.strokeText(coin.label, 0, 1);
  }

  ctx.restore();
}

// 小工具：把 #RRGGBB 加透明度（0~1）
function hexWithAlpha(hex, a){
  // 支援 #RGB 或 #RRGGBB
  const c = hex.replace('#','');
  const r = c.length===3 ? parseInt(c[0]+c[0],16) : parseInt(c.slice(0,2),16);
  const g = c.length===3 ? parseInt(c[1]+c[1],16) : parseInt(c.slice(2,4),16);
  const b = c.length===3 ? parseInt(c[2]+c[2],16) : parseInt(c.slice(4,6),16);
  return `rgba(${r},${g},${b},${a})`;
}

function shake(){
  play.classList.remove("shake");
  void play.offsetWidth;
  play.classList.add("shake");
}
function vibrate(pattern=20){ if (navigator.vibrate) navigator.vibrate(pattern); }

// ----- 立體聲多層音效（完整版） -----
let audioCtx, master, noiseBuf;
function ensureAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  master = audioCtx.createGain();
  master.gain.value = 0.25; // 全局音量
  master.connect(audioCtx.destination);

  // 準備白噪音 Buffer（用於爆裂層）
  const len = Math.floor(0.2 * audioCtx.sampleRate);
  noiseBuf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i=0;i<len;i++) data[i] = Math.random()*2 - 1;
}
function playHitSound(pan /* -1~+1 */, isPi=false){
  ensureAudio();
  if (audioCtx.state === "suspended") audioCtx.resume();

  const now = audioCtx.currentTime;
  const p = audioCtx.createStereoPanner();
  p.pan.value = pan;
  p.connect(master);

  // 1) 高音 click（sine，短促）
  const o1 = audioCtx.createOscillator();
  const g1 = audioCtx.createGain();
  o1.type = "sine";
  o1.frequency.setValueAtTime(isPi ? 860 : 720, now);
  g1.gain.setValueAtTime(0.001, now);
  g1.gain.exponentialRampToValueAtTime(isPi ? 0.25 : 0.18, now + 0.01);
  g1.gain.exponentialRampToValueAtTime(0.001, now + 0.10);
  o1.connect(g1).connect(p);
  o1.start(now); o1.stop(now + 0.12);

  // 2) 低音 thump（triangle，下沉感）
  const o2 = audioCtx.createOscillator();
  const g2 = audioCtx.createGain();
  o2.type = "triangle";
  o2.frequency.setValueAtTime(isPi ? 240 : 200, now);
  g2.gain.setValueAtTime(isPi ? 0.20 : 0.15, now);
  g2.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  o2.connect(g2).connect(p);
  o2.start(now); o2.stop(now + 0.2);

  // 3) 噪聲 burst（像煙火「噗」）
  const noise = audioCtx.createBufferSource(); noise.buffer = noiseBuf;
  const bp = audioCtx.createBiquadFilter(); bp.type="bandpass";
  bp.frequency.value = isPi ? 2400 : 1800; bp.Q.value = 4;
  const gn = audioCtx.createGain();
  gn.gain.setValueAtTime(isPi ? 0.20 : 0.14, now);
  gn.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  noise.connect(bp).connect(gn).connect(p);
  noise.start(now); noise.stop(now + 0.14);
}

// ----- 主迴圈 -----
function loop(now=performance.now()){
  const dt = now - last; last = now;

  // 背景
  const rect = cvs.getBoundingClientRect();
  ctx.fillStyle = "#1A1038";
  ctx.fillRect(0,0,rect.width,rect.height);

  // 難度曲線
  const elapsed = now - startTime;
  timerEl.textContent = fmtTime(elapsed);
  const level = Math.floor(elapsed / STEP_MS);
  spawnIv = Math.max(260, 520 - level*30);
  maxOn   = Math.min(16, 6 + Math.floor(level/2));

  // 生成
  spawnTimer += dt;
  if (spawnTimer >= spawnIv){ spawn(); spawnTimer = 0; }

  // 更新+繪製
  for (const d of drops){ d.y += d.v; d.rot += d.vr; drawCoin(d); }

  // 出界扣分
  drops = drops.filter(d=>{
    if (d.y < rect.height + d.r) return true;
    score = Math.max(0, score-1); updateHUD(); return false;
  });

  requestAnimationFrame(loop);
}

// ----- 點擊命中 -----
cvs.addEventListener("pointerdown", (e)=>{
  ensureAudio(); if (audioCtx.state === "suspended") audioCtx.resume();

  const r = cvs.getBoundingClientRect();
  const x = e.clientX - r.left, y = e.clientY - r.top;

  let hit = false;
  drops = drops.filter(d=>{
    if (Math.hypot(x-d.x,y-d.y) <= d.r){
      hit = true;
      counts[d.coin.key]++; score += d.coin.score; updateHUD();

      glow(d.x,d.y,d.coin.color);
      burst(d.x,d.y,d.coin.color);
      meteor(d.x,d.y,d.coin.key,d.coin.color);

      const pan = (d.x / r.width) * 2 - 1;  // -1~+1
      playHitSound(pan, d.coin.key === "PI");

      if (d.coin.key === "PI"){ shake(); vibrate([20,30,20]); } else { vibrate(12); }
      return false;
    }
    return true;
  });
});

// ----- Start -----
startBtn.addEventListener("click", ()=>{
  if (started) return;
  started = true;
  drops.length = 0;
  score = 0;
  counts = { PI:0,B:0,E:0,S:0,U:0,D:0 };
  updateHUD();
  startTime = last = performance.now();
  spawnTimer = 0;
  requestAnimationFrame(loop);
});

// ----- Pi SDK（保留） -----
if (typeof Pi!=="undefined" && Pi?.init){ try{ Pi.init({version:"2.0", sandbox:true}); }catch{} }
if (loginBtn){
  loginBtn.addEventListener("click", async ()=>{
    try{
      const r=await Pi.authenticate(['username','payments'], p=>console.log('incomplete',p));
      alert(`Welcome @${r.user.username}!`);
    }catch(e){ console.log(e); }
  });
}
