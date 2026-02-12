export default async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  const AUTH_TOKEN = process.env.ANTHROPIC_AUTH_TOKEN;
  const BASE_URL = process.env.ANTHROPIC_BASE_URL || "https://cc.580ai.net";
  const TIMEOUT_MS = parseInt(process.env.API_TIMEOUT_MS, 10) || 600000;

  if (!AUTH_TOKEN) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_AUTH_TOKEN not set" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json();
    body.stream = true;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const apiRes = await fetch(`${BASE_URL}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": AUTH_TOKEN,
        Authorization: `Bearer ${AUTH_TOKEN}`,
        "anthropic-version": "2023-06-01",
      },
      signal: controller.signal,
      body: JSON.stringify(body),
    });

    clearTimeout(timeout);

    if (!apiRes.ok) {
      const errBody = await apiRes.text();
      return new Response(errBody, {
        status: apiRes.status,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    return new Response(apiRes.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.name === "AbortError" ? "Request timed out" : err.message }),
      {
        status: err.name === "AbortError" ? 504 : 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      }
    );
  }
};
