export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");

    const corsHeaders = {
      "Access-Control-Allow-Origin":
        origin === "https://matrixflowai.in" || origin === "https://www.matrixflowai.in"
          ? origin
          : "https://matrixflowai.in",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method === "GET") {
      return new Response(JSON.stringify({
        status: "online",
        provider: "OpenRouter",
        webSearch: "available",
        message: "MatrixFlowAI is running"
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    try {
      if (!env.OPENROUTER_API_KEY) {
        return new Response(JSON.stringify({ error: "OPENROUTER_API_KEY is missing" }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      const body = await request.json();
      const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
      const webSearch = body.webSearch !== false;

      if (!prompt) {
        return new Response(JSON.stringify({ error: "Prompt is required" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      const payload = {
        model: "openrouter/free",
        messages: [
          {
            role: "system",
            content: webSearch
              ? "You are MatrixFlowAI. Give the best, useful answer. Live web search is enabled. Prefer fresh and reliable sources when the question needs current information. Clearly distinguish current facts from general knowledge."
              : "You are MatrixFlowAI. Give the best, useful answer from your model knowledge. If the user asks for current information, say that live web search is disabled."
          },
          { role: "user", content: prompt }
        ]
      };

      if (webSearch) {
        payload.plugins = [{
          id: "web",
          max_results: 5
        }];
      }

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://matrixflowai.in",
          "X-Title": "MatrixFlowAI"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        return new Response(JSON.stringify({
          error: "OpenRouter API error",
          status: response.status,
          details: data
        }), {
          status: response.status,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      const message = data?.choices?.[0]?.message;
      const text = message?.content?.trim() || "";

      if (!text) {
        return new Response(JSON.stringify({ error: "OpenRouter returned no text" }), {
          status: 502,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      const annotations = Array.isArray(message?.annotations) ? message.annotations : [];
      const sources = annotations
        .filter(a => a?.type === "url_citation" && a?.url_citation?.url)
        .map(a => ({
          url: a.url_citation.url,
          title: a.url_citation.title || a.url_citation.url
        }))
        .filter((x, i, arr) => arr.findIndex(y => y.url === x.url) === i);

      return new Response(JSON.stringify({
        response: text,
        provider: "OpenRouter",
        model: data?.model || "openrouter/free",
        webSearch,
        sources
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });

    } catch (error) {
      return new Response(JSON.stringify({
        error: "Worker error",
        message: error?.message || "Unknown error"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
  }
};