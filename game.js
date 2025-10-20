// ==== 幣圈掉落（手機同畫面細條記分板）====
// Pi 紫色；U 綠；S 黑；小慢大快；小多大少；進階特效、音效、震動；Top5 排行

// DOM
const play = document.getElementById("play");
const canvas = document.getElementById("game");
const fx = document.getElementById("fx");
const ctx = canvas.getContext("2d");
const fxc = fx.getContext("2d");
const startBtn = document.getElementById("startBtn");
const scoreEl = document.getElementById("score");
const sbTotalEl = document.getElementById("sbTotal");
const loginBtn = document.getElementById("loginBtn");
const bestList = document.getElementById("bestList");

// 尺寸同步（避免黑屏移位）
function syncFxSize(){
  fx.width = canvas.width;
  fx.height = canvas.height;
}
syncFxSize(); addEventListener("resize", syncFxSize);

// 幣資料
const COINS = [
  { key:"PI",  label:"π", color:"#9B4DFF", baseR:34, score:5 },
  { key:"B",   label:"₿", color:"#F7931A", baseR:26, score:3 },
  { key:"E",   label:"Ξ", color:"#627EEA", baseR:24, score:2 },
  { key:"S",   label:"S", color:"#111827", baseR:22, score:2 },
  { key:"U",   label:"U", color:"#22c55e", baseR:22, score:1 },
  { key:"D",   label:"Ð", color:"#C2A633", baseR:22, score:1 },
];
// 權重（小顆機率高）
const weights = COINS.map(c => 1 / c.baseR);
const weightSum = weights.reduce((a,b)=>a+b,0);

// 遊戲狀態
let drops = [];
let score = 0;
let counts = { PI:0, B:0, E:0, S:0, U:0, D:0 };
let started = false;

// 難度曲線參數
let startTime = 0;
let spawnTimer = 0;
let spawnInterval = 520;     // 初始生成間隔（ms）
let maxOnScreen = 6;         // 畫面同時上限
const DIFF_STEP_MS = 9000;   // 每 9 秒升級

// WebAudio：簡單點擊音效（不用檔案）
const AudioCtx = window.AudioContext || window.webkitAudioContext;
const aCtx = new AudioCtx();
function beep(freq=660, dur=90, vol=0.06){
  const o = aCtx.createOscillator();
  const g = aCtx.createGain();
  o.type = "sine"; o.frequency.value = freq;
  g.gain.value = vol;
  o.connect(g).connect(aCtx.destination);
  o.start(); o.stop(aCtx.currentTime + dur/1000);
}

// 工具
function updateBoards(){
  scoreEl.textContent = `Score: ${score}`;
  const t = Object.values(counts).reduce((a,b)=>a+b,0);
  sbTotalEl.textContent = t;
  for (const k of Object.keys(counts)){
    const row = document.querySelector(`#row-${k} .val`);
    if (row) row.textContent = counts[k];
  }
}
function pickCoin(){
  let r = Math.random()*weightSum;
  for (let i=0;i<COINS.length;i++){
    r -= weights[i];
    if (r <= 0) return COINS[i];
  }
  return COINS[0];
}

// 生成掉落物（大顆較快）
function spawn(){
  if (drops.length >= maxOnScreen) return;
  const c = pickCoin();
  const r = c.baseR + (Math.random()*4 - 2);
  // 速度：半徑 18~36 → 速度 1.0~3.8（線性）
  const v = 1.0 + (r - 18) / (36 - 18) * (3.8 - 1.0);
  drops.push({
    coin:c, r, x: r + Math.random()*(canvas.width - 2*r), y: -r - 10,
    v, rot: Math.random()*Math.PI*2, vr:(Math.random()-0.5)*0.06
  });
}

// 畫幣
function drawCoin(d){
  const {x,y,r,coin} = d;
  ctx.fillStyle = coin.color;
  ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();

  ctx.save();
  ctx.translate(x,y); ctx.rotate(d.rot);
  ctx.fillStyle = "#fff";
  ctx.font = `bold ${Math.round(r*1.15)}px Arial`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(coin.label,0,1);
  ctx.restore();
}

// 特效：光暈
function glow(x,y,color){
  const g = ctx.createRadialGradient(x,y,6,x,y,36);
  g.addColorStop(0, "rgba(255,255,255,.9)");
  g.addColorStop(.35, color+"AA");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.save(); ctx.globalCompositeOperation="lighter";
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,36,0,Math.PI*2); ctx.fill();
  ctx.restore();
}

// 特效：爆炸煙火（主畫布）
function burst(x,y,color){
  const parts = [];
  for (let i=0;i<14;i++){
    const a = Math.random()*Math.PI*2;
    const sp = 1.6 + Math.random()*2.4;
    parts.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:18});
  }
  const step=()=>{
    for (const p of parts){
      p.x+=p.vx; p.y+=p.vy; p.vy+=0.03; p.life--;
      ctx.save(); ctx.globalCompositeOperation="lighter";
      ctx.fillStyle=color; ctx.globalAlpha=Math.max(0,p.life/18);
      ctx.beginPath(); ctx.arc(p.x,p.y,3,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }
    for (let i=parts.length-1;i>=0;i--) if(parts[i].life<=0) parts.splice(i,1);
    if (parts.length) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// 特效：流星飛向右側記分列（fx 透明層）
function toViewport(x,y,el){ const r=el.getBoundingClientRect(); return {x:r.left+x,y:r.top+y}; }
function rowCenterXY(key){
  const row=document.getElementById(`row-${key}`); if(!row) return {x:0,y:0};
  const r=row.getBoundingClientRect(); return {x:r.left+r.width-20,y:r.top+r.height/2};
}
function meteor(x,y,key,color){
  const from=toViewport(x,y,canvas), to=rowCenterXY(key);
  let t=0, T=30;
  const s=()=>{ // 弧線插值
    const k=t/T;
    const px=from.x+(to.x-from.x)*k;
    const py=from.y+(to.y-from.y)*k - Math.sin(k*Math.PI)*26;
    // 清理 fx：用透明清除（避免黑屏）
    fxc.clearRect(0,0,fx.width,fx.height);
    // 畫尾巴與彈頭
    fxc.save();
    fxc.strokeStyle=color; fxc.lineWidth=3;
    fxc.beginPath(); fxc.moveTo(px-10,py-6); fxc.lineTo(px,py); fxc.stroke();
    fxc.fillStyle=color; fxc.beginPath(); fxc.arc(px,py,4,0,Math.PI*2); fxc.fill();
    fxc.restore();
    t++; if(t<=T) requestAnimationFrame(s);
  }; requestAnimationFrame(s);
}

// 抖動
function shake(mult=1){
  play.classList.remove("shake");
  // 觸發一次動畫
  void play.offsetWidth; 
  play.classList.add("shake");
}

// 主迴圈
let last = performance.now();
function loop(now=performance.now()){
  const dt = now - last; last = now;

  // 背景（不再鋪黑在 fx 上）
  ctx.fillStyle = "#1A1038"; ctx.fillRect(0,0,canvas.width,canvas.height);

  // 難度曲線：每 9 秒稍微加速 & 增加同屏上限（直到某值）
  const elapsed = now - startTime;
  const level = Math.floor(elapsed / DIFF_STEP_MS);
  spawnInterval = Math.max(280, 520 - level * 30);       // 最快 ~280ms
  maxOnScreen   = Math.min(14, 6 + Math.floor(level/2));  // 最多 14 顆

  // 生成
  spawnTimer += dt;
  if (spawnTimer >= spawnInterval){ spawn(); spawnTimer = 0; }

  // 更新
  for (const d of drops){ d.y += d.v; d.rot += d.vr; drawCoin(d); }

  // 邊界
  drops = drops.filter(d=>{
    if(d.y < canvas.height + d.r) return true;
    score = Math.max(0, score-1); updateBoards(); return false;
  });

  requestAnimationFrame(loop);
}

// 點擊
canvas.addEventListener("click", (e)=>{
  const r = canvas.getBoundingClientRect();
  const x = e.clientX - r.left, y = e.clientY - r.top;
  let hit = false;
  drops = drops.filter(d=>{
    if (Math.hypot(x-d.x,y-d.y) <= d.r){
      hit = true;
      counts[d.coin.key] += 1;
      score += d.coin.score;
      updateBoards();
      // 特效
      glow(d.x,d.y,d.coin.color);
      burst(d.x,d.y,d.coin.color);
      meteor(d.x,d.y,d.coin.key,d.coin.color);
      // 音效 + 震動（Pi 更強）
      try { aCtx.resume(); } catch {}
      beep(d.coin.key==="PI" ? 780 : 640, 90, d.coin.key==="PI" ? 0.08 : 0.05);
      if (navigator.vibrate) navigator.vibrate(d.coin.key==="PI" ? [20,40,20] : 15);
      if (d.coin.key==="PI") shake();
      return false;
    }
    return true;
  });
});

// 開始
startBtn.addEventListener("click", ()=>{
  if (started) return;
  started = true; score = 0; counts = { PI:0,B:0,E:0,S:0,U:0,D:0 }; updateBoards();
  startTime = performance.now(); last = startTime; spawnTimer = 0;
  drops.length = 0; requestAnimationFrame(loop);
});

// Pi SDK（保留測試）
if (typeof Pi !== "undefined" && Pi?.init) { try { Pi.init({ version:"2.0", sandbox:true }); } catch{} }
if (loginBtn){
  loginBtn.addEventListener("click", async ()=>{
    try {
      const r = await Pi.authenticate(['username','payments'], p=>console.log('incomplete',p));
      alert(`Welcome @${r.user.username}!`);
    } catch(e){ console.log(e); }
  });
}

// 排行榜：最高總分 Top 5
function loadBest(){ try{ return JSON.parse(localStorage.getItem('sth_best')||'[]'); }catch{ return []; } }
function saveBest(arr){ localStorage.setItem('sth_best', JSON.stringify(arr)); }
function renderBest(){
  const arr = loadBest();
  bestList.innerHTML = arr.map(v=>`<li>${v}</li>`).join('') || '<li>—</li>';
}
function pushBest(total){
  const arr = loadBest(); arr.push(total);
  arr.sort((a,b)=>b-a); arr.splice(5);
  saveBest(arr); renderBest();
}
renderBest();

// 結束/刷新時記錄一次（以當前 Total 計）
addEventListener("beforeunload", ()=>{
  const total = Object.values(counts).reduce((a,b)=>a+b,0);
  if (total>0) pushBest(total);
});
