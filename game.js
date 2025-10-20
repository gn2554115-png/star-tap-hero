// === 幣圈掉落版：Pi 最大圈 ===
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const startBtn = document.getElementById("startBtn");
const scoreEl = document.getElementById("score");
const loginBtn = document.getElementById("loginBtn");

let score = 0;
let drops = [];
let gameTimer = null;
let animId = 0;

// 幣種定義（Pi 最大）
const COINS = [
  { id: "pi",  label: "π", color: "#ffd24d", baseR: 28, score: 3, weight: 1.0 },  // 最大
  { id: "btc", label: "₿", color: "#f7931a", baseR: 20, score: 2, weight: 0.9 },
  { id: "eth", label: "Ξ", color: "#627eea", baseR: 19, score: 2, weight: 0.9 },
  { id: "sol", label: "◎", color: "#14f195", baseR: 18, score: 2, weight: 0.7 },
  { id: "doge",label: "Ð", color: "#c3a634", baseR: 18, score: 1, weight: 0.8 },
  { id: "usdc",label: "$", color: "#2775CA", baseR: 16, score: 1, weight: 0.7 },
];

// 依權重隨機挑幣種（確保 π 機率不低）
function pickCoin() {
  const total = COINS.reduce((s, c) => s + c.weight, 0);
  let r = Math.random() * total;
  for (const c of COINS) {
    r -= c.weight;
    if (r <= 0) return c;
  }
  return COINS[0];
}

// 產生掉落物
function spawnDrop() {
  const c = pickCoin();
  const r = c.baseR + (Math.random() * 4 - 2); // 少量隨機，但 Pi 仍最大
  drops.push({
    coin: c,
    x: r + Math.random() * (canvas.width - 2 * r),
    y: -r - 10,
    r,
    v: 1.8 + Math.random() * 2.2, // 下落速度
    rot: Math.random() * Math.PI * 2, // 旋轉（視覺活潑）
    vr: (Math.random() - 0.5) * 0.06,
  });
}

// 繪製單一圓圈幣
function drawDrop(d) {
  const { x, y, r, coin } = d;

  // 圓底
  const grd = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
  grd.addColorStop(0, "#ffffff");
  grd.addColorStop(0.15, coin.color);
  grd.addColorStop(1, shade(coin.color, -25));
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  // 外框
  ctx.strokeStyle = "rgba(0,0,0,.25)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // 幣字
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(d.rot);
  ctx.fillStyle = "#fff";
  ctx.font = `bold ${Math.floor(r * 1.1)}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,.35)";
  ctx.shadowBlur = 6;
  ctx.fillText(coin.label, 0, 1);
  ctx.restore();
}

// 顏色明暗調整（#rrggbb, delta -100~100）
function shade(hex, delta) {
  const n = parseInt(hex.replace("#", ""), 16);
  let r = (n >> 16) & 0xff,
      g = (n >> 8) & 0xff,
      b = n & 0xff;
  r = Math.max(0, Math.min(255, r + delta));
  g = Math.max(0, Math.min(255, g + delta));
  b = Math.max(0, Math.min(255, b + delta));
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// 主迴圈
function loop() {
  ctx.fillStyle = "#140a32";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 背景微粒
  ctx.fillStyle = "rgba(255,255,255,.08)";
  for (let i = 0; i < 40; i++) {
    const x = ((i * 71) + performance.now() * 0.03) % canvas.width;
    const y = (i * 127) % canvas.height;
    ctx.fillRect(x, y, 2, 2);
  }

  // 隨機生成
  if (Math.random() < 0.035) spawnDrop();

  // 更新 + 繪製
  for (const d of drops) {
    d.y += d.v;
    d.rot += d.vr;
    drawDrop(d);
  }

  // 地面
  ctx.strokeStyle = "rgba(255,255,255,.15)";
  ctx.beginPath();
  ctx.moveTo(0, canvas.height - 12);
  ctx.lineTo(canvas.width, canvas.height - 12);
  ctx.stroke();

  // 清除落地者（小扣分）
  drops = drops.filter(d => {
    if (d.y < canvas.height - 12) return true;
    score = Math.max(0, score - 1);
    scoreEl.textContent = `Score: ${score}`;
    return false;
  });

  animId = requestAnimationFrame(loop);
}

// 點擊判定（擊中加分；Pi 加更多）
canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;

  let hit = false;
  drops = drops.filter(d => {
    const dx = x - d.x, dy = y - d.y;
    if (Math.hypot(dx, dy) <= d.r) {
      hit = true;
      score += d.coin.id === "pi" ? d.coin.score : d.coin.score; // 目前表列已給不同分數
      scoreEl.textContent = `Score: ${score}`;
      return false; // 移除被點中的
    }
    return true;
  });
});

// 開始 / 重來
startBtn.addEventListener("click", () => {
  if (gameTimer) return; // 已在進行
  score = 0;
  drops = [];
  scoreEl.textContent = `Score: ${score}`;
  gameTimer = setInterval(spawnDrop, 550);
  loop();
});

// （可選）Pi 登入：如果你的 index.html 有 <button id="loginBtn">
if (typeof Pi !== "undefined" && Pi?.init) {
  try {
    Pi.init({ version: "2.0", sandbox: true });
  } catch {}
}
if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    try {
      const scopes = ["username", "payments"];
      const r = await Pi.authenticate(scopes, (p) => console.log("incomplete payment", p));
      alert(`Welcome @${r.user.username}!`);
    } catch (e) {
      console.log(e);
    }
  });
}
