// === 1️⃣ 遊戲主程式 ===
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const startBtn = document.getElementById("startBtn");
const scoreEl = document.getElementById("score");
const loginBtn = document.getElementById("loginBtn"); // 🔹 新增登入按鈕
let score = 0;
let stars = [];

// 生成星星
function spawnStar() {
  const r = 10 + Math.random() * 15;
  stars.push({ x: Math.random() * canvas.width, y: -r, r, v: 2 + Math.random() * 2 });
}

// 畫面刷新
function draw() {
  ctx.fillStyle = "#2c1d6b";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (const s of stars) {
    s.y += s.v;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = "yellow";
    ctx.fill();
  }
  stars = stars.filter(s => s.y < canvas.height + 10);
  requestAnimationFrame(draw);
}

// 點擊星星加分
canvas.addEventListener("click", e => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  for (const s of stars) {
    if (Math.hypot(s.x - x, s.y - y) < s.r) {
      score += 1;
      scoreEl.textContent = `Score: ${score}`;
      s.y = canvas.height + 20;
    }
  }
});

// 開始遊戲
startBtn.addEventListener("click", () => {
  setInterval(spawnStar, 500);
  draw();
});


// === 2️⃣ Pi Network SDK 整合 ===
// 請在你的 index.html 中加上：
// <script src="https://sdk.minepi.com/pi-sdk.js"></script>

Pi.init({
  version: "2.0",
  sandbox: true, // ✅ 測試網模式
});

// 登入函式
async function loginWithPi() {
  try {
    const scopes = ['username', 'payments'];
    const authResult = await Pi.authenticate(scopes, onIncompletePaymentFound);
    console.log("Authenticated user:", authResult.user);
    alert(`Welcome ${authResult.user.username}!`);
  } catch (err) {
    console.error("Pi login failed:", err);
  }
}

// 處理未完成付款
function onIncompletePaymentFound(payment) {
  console.log("Found incomplete payment:", payment);
}

// 綁定登入按鈕
if (loginBtn) {
  loginBtn.addEventListener("click", loginWithPi);
}
