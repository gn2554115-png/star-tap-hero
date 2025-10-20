// === 幣圈掉落版：Pi 最大、彩色圓圈 ===
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const startBtn = document.getElementById("startBtn");
const scoreEl = document.getElementById("score");
const loginBtn = document.getElementById("loginBtn");

let score = 0;
let drops = [];
let gameRunning = false;

// 幣種資料
const COINS = [
  { id: "pi", label: "π", color: "#FFD700", baseR: 32, score: 5, weight: 1.2 }, // 最大、金色
  { id: "btc", label: "₿", color: "#F7931A", baseR: 24, score: 3, weight: 1.0 },
  { id: "eth", label: "Ξ", color: "#627EEA", baseR: 22, score: 2, weight: 0.9 },
  { id: "sol", label: "◎", color: "#14F195", baseR: 20, score: 2, weight: 0.8 },
  { id: "doge", label: "Ð", color: "#C2A633", baseR: 20, score: 1, weight: 0.8 },
  { id: "usdc", label: "$", color: "#2775CA", baseR: 18, score: 1, weight: 0.7 },
];

// 隨機挑幣種（含權重）
function pickCoin() {
  const total = COINS.reduce((s, c) => s + c.weight, 0);
  let r = Math.random() * total;
  for (const c of COINS) {
    r -= c.weight;
    if (r <= 0) return c;
  }
  return COINS[0];
}

// 生成幣圈
function spawnDrop() {
  const c = pickCoin();
  const r = c.baseR + Math.random() * 3 - 1.5;
  drops.push({
    coin: c,
    x: Math.random() * (canvas.width - 2 * r) + r,
    y: -r,
    r,
    v: 1.5 + Math.random() * 2.5,
    rot: Math.random() * Math.PI * 2,
    vr: (Math.random() - 0.5) * 0.08,
  });
}

// 主畫面循環
function loop() {
  ctx.fillStyle = "#1A1038";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 幣圈繪製
  for (const d of drops) {
    d.y += d.v;
    d.rot += d.vr;
    drawCoin(d);
  }

  // 移除掉落到底的
  drops = drops.filter(d => {
    if (d.y < canvas.height + d.r) return true;
    score = Math.max(0, score - 1);
    scoreEl.textContent = `Score: ${score}`;
    return false;
  });

  requestAnimationFrame(loop);
}

// 繪製單一幣
function drawCoin(d) {
  const { x, y, r, coin } = d;

  // 外圈漸層
  const grad = ctx.createRadialGradient(x, y, r * 0.3, x, y, r);
  grad.addColorStop(0, "#fff");
  grad.addColorStop(0.3, coin.color);
  grad.addColorStop(1, shadeColor(coin.color, -40));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  // 幣字
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(d.rot);
  ctx.fillStyle = "#fff";
  ctx.font = `bold ${r * 1.2}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.4)";
  ctx.shadowBlur = 6;
  ctx.fillText(coin.label, 0, 0);
  ctx.restore();
}

// 點擊幣圈加分
canvas.addEventListener("click", e => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  let hit = false;
  drops = drops.filter(d => {
    const dx = x - d.x, dy = y - d.y;
    if (Math.hypot(dx, dy) < d.r) {
      hit = true;
      score += d.coin.score;
      scoreEl.textContent = `Score: ${score}`;
      return false;
    }
    return true;
  });
});

// 開始遊戲
startBtn.addEventListener("click", () => {
  if (gameRunning) return;
  gameRunning = true;
  score = 0;
  drops = [];
  scoreEl.textContent = `Score: ${score}`;
  setInterval(spawnDrop, 550);
  loop();
});

// Pi SDK 登入（選用）
if (typeof Pi !== "undefined" && Pi?.init) {
  try {
    Pi.init({ version: "2.0", sandbox: true });
  } catch {}
}
if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    try {
      const scopes = ["username", "payments"];
      const r = await Pi.authenticate(scopes, p => console.log("incomplete", p));
      alert(`Welcome @${r.user.username}!`);
    } catch (e) {
      console.log(e);
    }
  });
}

// 顏色調整（亮度）
function shadeColor(color, percent) {
  const f = parseInt(color.slice(1), 16),
        t = percent < 0 ? 0 : 255,
        p = Math.abs(percent) / 100,
        R = f >> 16,
        G = (f >> 8) & 0x00FF,
        B = f & 0x0000FF;
  return "#" + (
    0x1000000 +
    (Math.round((t - R) * p) + R) * 0x10000 +
    (Math.round((t - G) * p) + G) * 0x100 +
    (Math.round((t - B) * p) + B)
  ).toString(16).slice(1);
}
