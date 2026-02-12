exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const AUTH_TOKEN = process.env.ANTHROPIC_AUTH_TOKEN;
  const BASE_URL = process.env.ANTHROPIC_BASE_URL || "https://cc.580ai.net";
  const TIMEOUT_MS = parseInt(process.env.API_TIMEOUT_MS, 10) || 600000;

  if (!AUTH_TOKEN) {
    return { statusCode: 500, body: JSON.stringify({ error: "ANTHROPIC_AUTH_TOKEN not set" }) };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const requestBody = JSON.parse(event.body);

    const response = await fetch(`${BASE_URL}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": AUTH_TOKEN,
        "Authorization": `Bearer ${AUTH_TOKEN}`,
        "anthropic-version": "2023-06-01"
      },
      signal: controller.signal,
      body: JSON.stringify(requestBody)
    });

    clearTimeout(timeout);

    const data = await response.text();

    return {
      statusCode: response.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: data
    };
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === "AbortError") {
      return { statusCode: 504, body: JSON.stringify({ error: "Request timed out" }) };
    }
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
