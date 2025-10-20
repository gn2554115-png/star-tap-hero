// ==== 幣圈掉落：Pi 紫色最大；小慢大快；小多大少；擊中特效 + 計分板 ====

// 基本 DOM
const canvas = document.getElementById("game");
const fx = document.getElementById("fx");
const ctx = canvas.getContext("2d");
const fxc = fx.getContext("2d");
const startBtn = document.getElementById("startBtn");
const scoreEl = document.getElementById("score");
const loginBtn = document.getElementById("loginBtn");

// 幣種定義（顏色 & 尺寸 & 權重）
const COINS = [
  { key:"PI",  label:"π", color:"#9B4DFF", baseR:34, score:5 },     // Pi 紫色，最大
  { key:"B",   label:"₿", color:"#F7931A", baseR:26, score:3 },     // BTC
  { key:"E",   label:"Ξ", color:"#627EEA", baseR:24, score:2 },     // ETH
  { key:"S",   label:"S", color:"#111827", baseR:22, score:2 },     // S：黑
  { key:"U",   label:"U", color:"#22c55e", baseR:22, score:1 },     // U：綠
  { key:"D",   label:"Ð", color:"#C2A633", baseR:22, score:1 },     // DOGE
];

// 權重 = 1 / 尺寸  → 小顆機率高；Pi 最大 → 權重最低
const weights = COINS.map(c => 1 / c.baseR);
const weightSum = weights.reduce((a,b)=>a+b,0);

// 遊戲狀態
let drops = [];
let score = 0;
let started = false;

// 計分板資料
const counts = { PI:0, B:0, E:0, S:0, U:0, D:0 };
const sbTotal = document.getElementById("sbTotal");

// 工具：加總
function updateTotals() {
  const total = Object.values(counts).reduce((a,b)=>a+b,0);
  sbTotal.textContent = String(total);
  scoreEl.textContent = `Score: ${score}`;
  // 更新每列
  for (const k of Object.keys(counts)) {
    const row = document.querySelector(`#row-${k} .val`);
    if (row) row.textContent = String(counts[k]);
  }
}

// 工具：從幣名取 DOM row 中心（飛行目標）
function getRowCenterXY(key){
  const row = document.getElementById(`row-${key}`);
  if (!row) return { x: canvas.getBoundingClientRect().right, y: canvas.getBoundingClientRect().top };
  const rr = row.getBoundingClientRect();
  return { x: rr.left + rr.width - 22, y: rr.top + rr.height/2 };
}

// 依權重挑幣
function pickCoin(){
  let r = Math.random() * weightSum;
  for (let i=0;i<COINS.length;i++){
    r -= weights[i];
    if (r <= 0) return COINS[i];
  }
  return COINS[0];
}

// 生成掉落物：速度 ∝ 半徑（大快小慢）
function spawn() {
  const c = pickCoin();
  const r = c.baseR + (Math.random()*4 - 2);
  const minV = 1.0, maxV = 3.5;
  const v = minV + (r - 18) / (36 - 18) * (maxV - minV); // 半徑 18~36 映射到速度區間
  drops.push({
    coin: c,
    x: r + Math.random() * (canvas.width - 2*r),
    y: -r - 10,
    r, v,
    rot: Math.random() * Math.PI*2,
    vr: (Math.random()-0.5)*0.06,
  });
}

// 畫單一幣
function drawCoin(d) {
  const {x,y,r,coin} = d;
  // 圓底
  ctx.fillStyle = coin.color;
  ctx.beginPath();
  ctx.arc(x,y,r,0,Math.PI*2);
  ctx.fill();
  // 幣字
  ctx.save();
  ctx.translate(x,y);
  ctx.rotate(d.rot);
  ctx.fillStyle = "#fff";
  ctx.font = `bold ${Math.round(r*1.15)}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(coin.label,0,1);
  ctx.restore();
}

// 主迴圈
function loop(){
  // 背景
  ctx.fillStyle = "#1A1038";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // 更新與繪製
  for (const d of drops){
    d.y += d.v;
    d.rot += d.vr;
    drawCoin(d);
  }

  // 移除出界（扣分）
  drops = drops.filter(d=>{
    if (d.y < canvas.height + d.r) return true;
    score = Math.max(0, score - 1);
    updateTotals();
    return false;
  });

  // 特效層持續清淡透明，以保留流星尾巴
  fxc.fillStyle = "rgba(0,0,0,0.15)";
  fxc.fillRect(0,0,fx.width,fx.height);

  requestAnimationFrame(loop);
}

// 點擊判定 & 特效
canvas.addEventListener("click", (e)=>{
  const crect = canvas.getBoundingClientRect();
  const x = e.clientX - crect.left;
  const y = e.clientY - crect.top;

  let hit = false;
  drops = drops.filter(d=>{
    const dx = x - d.x, dy = y - d.y;
    if (Math.hypot(dx,dy) <= d.r){
      hit = true;
      // 計分
      counts[d.coin.key] += 1;
      score += d.coin.score;
      updateTotals();

      // 爆炸煙火
      burst(d.x, d.y, d.coin.color);

      // 流星飛向右側計分板
      launchMeteorToRow(d.x, d.y, d.coin.key, d.coin.color);

      return false; // 移除被點中的
    }
    return true;
  });
});

// 爆炸煙火（主畫布）
function burst(x,y,color){
  const parts = [];
  for (let i=0;i<14;i++){
    const a = Math.random()*Math.PI*2;
    const sp = 1.5 + Math.random()*2.5;
    parts.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:22});
  }
  const tick = ()=>{
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const p of parts){
      p.x += p.vx; p.y += p.vy; p.vy += 0.03; p.life--;
      ctx.fillStyle = color;
      ctx.globalAlpha = Math.max(0, p.life/22);
      ctx.beginPath(); ctx.arc(p.x,p.y,3,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
    for (let i=parts.length-1;i>=0;i--) if (parts[i].life<=0) parts.splice(i,1);
    if (parts.length) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// 流星飛向計分板（使用 fx 覆蓋畫布，跨越到右側）
function launchMeteorToRow(x,y,key,color){
  const from = toViewport(x,y,canvas);
  const to = getRowCenterXY(key); // 目標是右側列表的中心
  const p = { x: from.x, y: from.y };
  const total = 30; let t = 0;
  const step = ()=>{
    // 線性插值 + 一點曲線
    const k = t/total;
    p.x = from.x + (to.x - from.x)*k;
    p.y = from.y + (to.y - from.y)*k - Math.sin(k*Math.PI)*30; // 弧線

    // 畫流星
    fxc.save();
    // 尾巴
    fxc.strokeStyle = color;
    fxc.lineWidth = 3;
    fxc.beginPath();
    fxc.moveTo(p.x-10,p.y-6);
    fxc.lineTo(p.x,p.y);
    fxc.stroke();
    // 彈頭
    fxc.fillStyle = color;
    fxc.beginPath();
    fxc.arc(p.x,p.y,4,0,Math.PI*2);
    fxc.fill();
    fxc.restore();

    t++;
    if (t<=total) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// 座標轉 viewport
function toViewport(x,y,el){
  const r = el.getBoundingClientRect();
  return { x: r.left + x, y: r.top + y };
}

// Start
startBtn.addEventListener("click", ()=>{
  if (started) return;
  started = true;
  drops = [];
  score = 0;
  updateTotals();
  // 固定節奏 + 隨機插入（小顆多）
  setInterval(spawn, 520);
  loop();
});

// Pi SDK（可留作日後 Mainnet 使用）
if (typeof Pi !== "undefined" && Pi?.init) {
  try { Pi.init({ version:"2.0", sandbox:true }); } catch {}
}
if (loginBtn){
  loginBtn.addEventListener("click", async ()=>{
    try {
      const scopes = ['username','payments'];
      const r = await Pi.authenticate(scopes, p=>console.log('incomplete',p));
      alert(`Welcome @${r.user.username}!`);
    } catch (e) { console.log(e); }
  });
}
