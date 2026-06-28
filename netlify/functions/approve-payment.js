const PI_API_BASE = "https://api.minepi.com/v2";

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function parseBody(event) {
  try {
    return JSON.parse(event.body || "{}");
  } catch (error) {
    return null;
  }
}

async function readJson(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch (error) {
    return { message: text };
  }
}

exports.handler = async function handler(event) {
  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, error: "Method not allowed" });
  }

  const apiKey = process.env.PI_API_KEY;
  if (!apiKey) {
    return json(500, { ok: false, error: "PI_API_KEY is not configured" });
  }

  const body = parseBody(event);
  if (!body) {
    return json(400, { ok: false, error: "Invalid JSON body" });
  }

  const paymentId = typeof body.paymentId === "string" ? body.paymentId.trim() : "";
  if (!paymentId) {
    return json(400, { ok: false, error: "paymentId is required" });
  }

  try {
    const response = await fetch(`${PI_API_BASE}/payments/${encodeURIComponent(paymentId)}/approve`, {
      method: "POST",
      headers: {
        Authorization: `Key ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    const data = await readJson(response);
    if (!response.ok) {
      return json(response.status, {
        ok: false,
        error: "Pi payment approval failed",
        status: response.status,
        details: data,
      });
    }

    return json(200, { ok: true, payment: data });
  } catch (error) {
    return json(500, { ok: false, error: error.message || "Pi payment approval failed" });
  }
};
