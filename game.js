// === 幣圈掉落（含特效與計分板） ===
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const startBtn = document.getElementById("startBtn");
const scoreEl = document.getElementById("score");
const boardList = document.getElementById("boardList");
const totalEl = document.getElementById("totalScore");

let score = 0;               // 分數（可保留）
let totalHits = 0;           // 命中總次數
let drops = [];              // 掉落物
let particles = [];          // 爆炸粒子
let meteors = [];            // 流星飛向計分板
let running = false;

// 幣種設定（Pi 紫色最大；U 綠色；S 黑色）
const COINS = [
  { id: "pi",   label: "π", color: "#9B4DFF", baseR: 34, baseScore: 5 }, // Pi 紫
  { id: "btc",  label: "₿", color: "#F7931A", baseR: 26, baseScore: 3 },
  { id: "eth",  label: "Ξ", color: "#627EEA", baseR: 24, baseScore: 2 },
  { id: "sol",  label: "S", color: "#000000", baseR: 22, baseScore: 2 }, // S 黑
  { id: "doge", label: "Ð", color: "#C2A633", baseR: 22, baseScore: 1 },
  { id: "usdc", label: "U", color: "#1ABC9C", baseR: 20, baseScore: 1 }, // U 綠
];

// 依「大小」決定出現率：越小機率越高（權重 = 1 / baseR）
const WEIGHTS = COINS.map(c => 1 / c.baseR);
const WEIGHT_SUM = WEIGHTS.reduce((a,b)=>a+b,0);

// 計分板資料
const board = {};
COINS.forEach(c => board[c.id] = 0);

// 產生掉落物：半徑與速度相關（大→快，小→慢）
function spawnDrop() {
  // 先抽幣種（小的機率較高）
  let r = Math.random() * WEIGHT_SUM;
  let idx = 0;
  for (let i=0;i<COINS.length;i++){ r -= WEIGHTS[i]; if (r<=0){ idx=i; break; } }
  const coin = COINS[idx];

  // 以幣種的 baseR 為中心，加一點抖動
  const radius = coin.baseR + (Math.random() * 4 - 2);

  // 速度：與半徑正比（越大越快）
  const v = 0.8 + (radius / 34) * 2.4;  // 調整係數

  drops.push({
    coin,
    x: radius + Math.random() * (canvas.width - 2 * radius),
    y: -radius - 8,
    r: radius,
    v,
  });
}

// 畫面主循環
function loop(){
  ctx.fillStyle = "#1A1038";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // 掉落物
  for (const d of drops){
    d.y += d.v;
    drawCoin(d);
  }
  // 落地扣分
  drops = drops.filter(d=>{
    if (d.y < canvas.height + d.r) return true;
    score = Math.max(0, score - 1);
    scoreEl.textContent = `Score: ${score}`;
    return false;
  });

  // 粒子特效
  updateParticles();
  // 流星
  updateMeteors();

  requestAnimationFrame(loop);
}

// 幣圈繪製
function drawCoin(d){
  ctx.fillStyle = d.coin.color;
  ctx.beginPath();
  ctx.arc(d.x, d.y, d.r, 0, Math.PI*2);
  ctx.fill();

  ctx.fillStyle = "#fff";
  ctx.font = `bold ${Math.round(d.r*1.15)}px Arial, system-ui`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(d.coin.label, d.x, d.y);
}

// 點擊判定
canvas.addEventListener("click", (e)=>{
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  let hitAny = false;
  drops = drops.filter(d=>{
    if (Math.hypot(x - d.x, y - d.y) < d.r){
      hitAny = true;
      score += d.coin.baseScore;            // 分數
      totalHits += 1;                       // 命中總次數
      board[d.coin.id] += 1;                // 該幣 +1
      scoreEl.textContent = `Score: ${score}`;
      updateBoard();                        // 更新計分板

      // 爆開煙火
      burst(d.x, d.y, d.coin.color);
      // 流星飛向記分板對應列
      const tgt = boardTargetFor(d.coin.id);
      if (tgt) shootMeteor(d.x, d.y, tgt.x, tgt.y, d.coin.color);

      return false; // 移除被點中的
    }
    return true;
  });

  if (!hitAny){
    // miss 效果可自行加
  }
});

// === 粒子／流星特效 ===
function burst(x, y, color){
  const N = 18;
  for (let i=0;i<N;i++){
    const a = (Math.PI*2) * (i/N) + Math.random()*0.3;
    const sp = 1.5 + Math.random()*2.5;
    particles.push({
      x, y,
      vx: Math.cos(a)*sp,
      vy: Math.sin(a)*sp,
      life: 28 + Math.random()*12,
      color,
    });
  }
}
function updateParticles(){
  particles = particles.filter(p=>{
    p.x += p.vx; p.y += p.vy; p.vy += 0.02; // 重力
    p.life -= 1;
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.max(0, p.life/40);
    ctx.fillRect(p.x, p.y, 3, 3);
    ctx.globalAlpha = 1;
    return p.life > 0;
  });
}

function shootMeteor(x0,y0,x1,y1,color){
  meteors.push({
    x:x0, y:y0, tx:x1, ty:y1, t:0, color
  });
}
function updateMeteors(){
  meteors = meteors.filter(m=>{
    m.t += 0.06; // 進度（0→1）
    const t = Math.min(1, m.t);
    // ease：先快後慢
    const e = 1 - Math.pow(1 - t, 2);
    m.x = xlerp(m.x, m.tx, e);
    m.y = xlerp(m.y, m.ty, e);

    // 畫尾巴
    ctx.strokeStyle = m.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(m.x, m.y);
    ctx.lineTo(m.x - 10, m.y - 6);
    ctx.stroke();

    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(m.x, m.y, 3, 0, Math.PI*2);
    ctx.fill();

    return t < 1;
  });
}
function xlerp(a,b,t){ return a + (b - a) * t; }

// === 計分板 ===
function updateBoard(){
  // 重新渲染列表
  boardList.innerHTML = "";
  for (const c of COINS){
    const li = document.createElement("li");
    const left = document.createElement("span");
    const right = document.createElement("span");
    left.textContent = c.label;
    left.style.fontWeight = "bold";
    left.style.color = c.color;
    right.textContent = board[c.id].toString();
    li.appendChild(left); li.appendChild(right);
    li.dataset.coinId = c.id; // 給定位用
    boardList.appendChild(li);
  }
  totalEl.textContent = totalHits.toString();
}

// 算出「畫布內」一個對應到計分板的目標點（視覺對齊）
function boardTargetFor(coinId){
  const listItems = boardList.querySelectorAll("li");
  let idx = 0;
  for (let i=0;i<listItems.length;i++){
    if (listItems[i].dataset.coinId === coinId){ idx = i; break; }
  }
  // 在畫布右上角安排幾個行高位置，模擬飛去記分板
  const rowH = 20;
  const margin = 18;
  return { x: canvas.width - margin, y: margin + rowH * (idx+1) };
}

// === 啟動 ===
startBtn.addEventListener("click", ()=>{
  if (running) return;
  running = true;
  score = 0; totalHits = 0;
  Object.keys(board).forEach(k=>board[k]=0);
  updateBoard();
  scoreEl.textContent = `Score: ${score}`;
  drops = []; particles = []; meteors = [];

  // 生成：小的機率高，大的低 → 以時間間隔為基礎補充
  setInterval(spawnDrop, 520);
  loop();
});

// （可選）Pi SDK 初始化（保留原本）
if (typeof Pi !== "undefined" && Pi?.init) {
  try { Pi.init({ version: "2.0", sandbox: true }); } catch {}
}
