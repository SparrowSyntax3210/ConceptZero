const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

async function createChatCompletion({
  messages,
  responseFormat,
  temperature = 0.25,
}) {
  const apiKey =
    process.env.OPENROUTER_API_KEY ||
    process.env.OPENROUTER_KEY ||
    process.env.KEY;
  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY in the server environment");
  }

  const model = process.env.OPENROUTER_MODEL || "qwen/qwen3.5-9b";
  let response;
  try {
    response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
        "X-Title": "STACKED Profile Analysis",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: 1600,
        response_format: responseFormat,
      }),
      signal: AbortSignal.timeout(45000),
    });
  } catch (error) {
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      throw new Error("OpenRouter request timed out. Please try again.");
    }
    throw new Error(
      "Could not reach OpenRouter. Check the server network connection.",
    );
  }

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const providerMessage = result.error?.message;
    console.error(
      "OpenRouter error:",
      response.status,
      providerMessage || "No error message",
    );
    throw new Error(
      `OpenRouter request failed (${response.status})${providerMessage ? `: ${providerMessage}` : ""}`,
    );
  }

  const content = result.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("OpenRouter returned an empty analysis");
  }

  try {
    return { model, analysis: JSON.parse(content) };
  } catch {
    console.error("OpenRouter returned invalid JSON:", content.slice(0, 500));
    throw new Error(
      "OpenRouter returned an unreadable response. Please retry.",
    );
  }
}

module.exports = { createChatCompletion };
