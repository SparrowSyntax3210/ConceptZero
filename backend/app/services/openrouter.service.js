const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

async function createChatCompletion({
  messages,
  responseFormat,
  temperature = 0.25,
  maxTokens = 1600,
}) {
  const apiKey =
    process.env.OPENROUTER_API_KEY ||
    process.env.OPENROUTER_KEY ||
    process.env.KEY;
  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY in the server environment");
  }

  const model = process.env.OPENROUTER_MODEL || "qwen/qwen3.5-9b";
  async function sendRequest(requestMessages, requestFormat, maxTokens = 1600) {
    const maxAttempts = 3;
    const retryableStatuses = new Set([429, 500, 502, 503, 504]);

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
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
            messages: requestMessages,
            temperature,
            max_tokens: maxTokens,
            response_format: requestFormat,
            ...(requestFormat?.type === "json_schema"
              ? { provider: { require_parameters: true } }
              : {}),
          }),
          signal: AbortSignal.timeout(45000),
        });
      } catch (error) {
        const isTimeout = error.name === "TimeoutError" || error.name === "AbortError";
        if (isTimeout || attempt === maxAttempts - 1) throw error;
        console.warn(`OpenRouter network error; retry ${attempt + 1}/${maxAttempts - 1}.`);
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
      const result = await response.json().catch(() => ({}));

      if (!retryableStatuses.has(response.status) || attempt === maxAttempts - 1) {
        return { response, result };
      }

      const retryAfterHeader = response.headers.get("retry-after");
      const retryAfterSeconds = Number(retryAfterHeader);
      const retryAfterDate = Date.parse(retryAfterHeader || "");
      const requestedDelay = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
        ? retryAfterSeconds * 1000
        : Number.isFinite(retryAfterDate)
          ? retryAfterDate - Date.now()
          : 0;
      const delayMs = requestedDelay > 0
        ? Math.min(requestedDelay, 5000)
        : 1000 * (attempt + 1);
      console.warn(`OpenRouter returned ${response.status}; retry ${attempt + 1}/${maxAttempts - 1} in ${delayMs}ms.`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  let response;
  let result;
  let activeMessages = messages;
  let activeFormat = responseFormat;
  try {
    ({ response, result } = await sendRequest(messages, responseFormat, maxTokens));
  } catch (error) {
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      throw new Error("OpenRouter request timed out. Please try again.");
    }
    throw new Error(
      "Could not reach OpenRouter. Check the server network connection.",
    );
  }

  const providerMessage = result.error?.message || "";
  const schemaRejected =
    !response.ok &&
    (response.status === 400 || response.status === 422) &&
    /response.?format|json.?schema|structured output|unsupported parameter|no.*endpoint|support.*requested.*parameter/i.test(
      providerMessage,
    );

  // Some upstream routes for a model may reject strict JSON Schema even when
  // other routes support it. Retry once in JSON mode and include the schema in
  // the prompt; the response is still parsed and validated by the caller.
  if (schemaRejected && responseFormat?.json_schema?.schema) {
    const schemaMessage = {
      role: "system",
      content: `Return one JSON object that follows this schema exactly: ${JSON.stringify(responseFormat.json_schema.schema)}`,
    };
    activeMessages = [...messages, schemaMessage];
    activeFormat = { type: "json_object" };
    try {
      ({ response, result } = await sendRequest(
        activeMessages,
        activeFormat,
        maxTokens,
      ));
    } catch (error) {
      if (error.name === "TimeoutError" || error.name === "AbortError") {
        throw new Error("OpenRouter request timed out. Please try again.");
      }
      throw new Error(
        "Could not reach OpenRouter. Check the server network connection.",
      );
    }
  }

  if (!response.ok) {
    const finalProviderMessage = result.error?.message;
    console.error(
      "OpenRouter error:",
      response.status,
      finalProviderMessage || "No error message",
    );
    const error = new Error(
      `OpenRouter request failed (${response.status})${finalProviderMessage ? `: ${finalProviderMessage}` : ""}`,
    );
    error.statusCode = response.status === 429 ? 429 : response.status >= 500 ? 503 : 502;
    throw error;
  }

  if (result.choices?.[0]?.finish_reason === "length") {
    // Structured projections may need more room than ordinary category
    // summaries. Retry once with a larger completion budget before failing.
    try {
      ({ response, result } = await sendRequest(
        activeMessages,
        activeFormat,
        Math.max(3600, maxTokens * 2),
      ));
    } catch (error) {
      if (error.name === "TimeoutError" || error.name === "AbortError") {
        throw new Error("OpenRouter request timed out. Please try again.");
      }
      throw new Error(
        "Could not reach OpenRouter. Check the server network connection.",
      );
    }

    if (!response.ok) {
      const retryMessage = result.error?.message;
      const error = new Error(
        `OpenRouter retry failed (${response.status})${retryMessage ? `: ${retryMessage}` : ""}`,
      );
      error.statusCode = response.status === 429 ? 429 : response.status >= 500 ? 503 : 502;
      throw error;
    }
    if (result.choices?.[0]?.finish_reason === "length") {
      throw new Error(
        "OpenRouter response was still cut off after retrying with a larger token limit. Reduce the profile data or increase the model completion limit.",
      );
    }
  }

  const getTextContent = (payload) => {
    if (typeof payload === "string") return payload.trim();
    if (Array.isArray(payload)) {
      return payload
        .filter((part) => part && (part.type === "text" || part.type === "output_text"))
        .map((part) => part.text || part.content || "")
        .join("\n")
        .trim();
    }
    return "";
  };
  let content = getTextContent(result.choices?.[0]?.message?.content);
  if (!content) {
    const message = result.choices?.[0]?.message || {};
    let retryMessages = activeMessages;
    let retryFormat = activeFormat;
    if (responseFormat?.json_schema?.schema && activeFormat?.type !== "json_object") {
      retryMessages = [
        ...messages,
        {
          role: "system",
          content: `Return one complete JSON object matching this schema. Do not return commentary: ${JSON.stringify(responseFormat.json_schema.schema)}`,
        },
      ];
      retryFormat = { type: "json_object" };
    }
    try {
      ({ response, result } = await sendRequest(
        retryMessages,
        retryFormat,
        Math.max(3600, maxTokens * 2),
      ));
    } catch (error) {
      if (error.name === "TimeoutError" || error.name === "AbortError") {
        throw new Error("OpenRouter request timed out. Please try again.");
      }
      throw new Error(
        "Could not reach OpenRouter. Check the server network connection.",
      );
    }
    if (!response.ok) {
      const retryMessage = result.error?.message;
      const error = new Error(
        `OpenRouter retry failed (${response.status})${retryMessage ? `: ${retryMessage}` : ""}`,
      );
      error.statusCode = response.status === 429 ? 429 : response.status >= 500 ? 503 : 502;
      throw error;
    }
    if (result.choices?.[0]?.finish_reason === "length") {
      throw new Error("OpenRouter response was cut off before the analysis finished, even after retrying with a larger token limit.");
    }
    content = getTextContent(result.choices?.[0]?.message?.content);
    if (!content) {
      const retryChoice = result.choices?.[0] || {};
      const refusal = retryChoice.message?.refusal;
      if (refusal) throw new Error(`OpenRouter could not complete this analysis: ${refusal}`);
      const finishReason = retryChoice.finish_reason || "unknown";
      const responseId = result.id || "unavailable";
      console.error("OpenRouter returned no text content after retry:", {
        model,
        responseId,
        finishReason,
        messageFields: Object.keys(retryChoice.message || {}),
      });
      throw new Error(
        `OpenRouter returned an empty analysis after retry (finish reason: ${finishReason}; response: ${responseId}). Please retry or check the selected model/provider route.`,
      );
    }
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
