export default {
  async fetch(request, env) {
    const cors = {
      "Access-Control-Allow-Origin": "https://matrixflowai.in",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin"
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: cors });

    if (request.method !== "POST") {
      return new Response("MatrixFlowAI V6 Worker online 🚀", {
        headers: { "Content-Type": "text/plain", ...cors }
      });
    }

    try {
      const body = await request.json();

      if (body.action === "video") {
        return await createVideo(body, env, cors);
      }

      if (body.action === "video_status") {
        return await videoStatus(body, env, cors);
      }

      return await chat(body, env, cors);
    } catch (e) {
      return Response.json(
        { error: e?.message || "Unknown worker error" },
        { status: 500, headers: cors }
      );
    }
  }
};

async function createVideo(body, env, cors) {
  if (!env.OPENROUTER_API_KEY) {
    return Response.json({ error: "OPENROUTER_API_KEY missing" }, { status: 500, headers: cors });
  }

  const prompt = String(body.prompt || "").trim();
  if (!prompt) {
    return Response.json({ error: "Video prompt is required" }, { status: 400, headers: cors });
  }

  const requestedQuality = String(body.quality || "1080p");
  // Current free-first route: native generation is capped at 1080p.
  // 4K/8K are represented as upscale targets for the next pipeline stage.
  const resolution = "1080p";

  const payload = {
    model: body.model || "alibaba/wan-2.6:free",
    prompt,
    duration: Number(body.duration) || 8,
    resolution,
    aspect_ratio: body.aspectRatio || "16:9",
    generate_audio: false
  };

  // Keep obviously invalid values from reaching a model.
  if (!["16:9", "9:16", "1:1"].includes(payload.aspect_ratio)) {
    payload.aspect_ratio = "16:9";
  }
  if (![4, 6, 8].includes(payload.duration)) payload.duration = 8;

  const r = await fetch("https://openrouter.ai/api/v1/videos", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://matrixflowai.in",
      "X-Title": "MatrixFlowAI"
    },
    body: JSON.stringify(payload)
  });

  const d = await r.json().catch(() => ({}));

  if (!r.ok) {
    return Response.json({
      error: d?.error?.message || d?.error || "Video provider rejected the request",
      provider: "openrouter",
      requestedQuality
    }, { status: r.status, headers: cors });
  }

  return Response.json({
    ok: true,
    provider: "openrouter",
    jobId: d.id,
    pollingUrl: d.polling_url,
    status: d.status || "pending",
    model: payload.model,
    nativeResolution: resolution,
    targetQuality: requestedQuality
  }, { status: 202, headers: cors });
}

async function videoStatus(body, env, cors) {
  if (!env.OPENROUTER_API_KEY) {
    return Response.json({ error: "OPENROUTER_API_KEY missing" }, { status: 500, headers: cors });
  }

  const jobId = String(body.jobId || "").trim();
  if (!jobId) {
    return Response.json({ error: "jobId is required" }, { status: 400, headers: cors });
  }

  const r = await fetch(`https://openrouter.ai/api/v1/videos/${encodeURIComponent(jobId)}`, {
    headers: {
      "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`,
      "HTTP-Referer": "https://matrixflowai.in",
      "X-Title": "MatrixFlowAI"
    }
  });

  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    return Response.json({
      error: d?.error?.message || d?.error || "Could not read video job"
    }, { status: r.status, headers: cors });
  }

  const status = d.status || "pending";
  let videoUrl = null;

  if (status === "completed") {
    videoUrl = (d.unsigned_urls && d.unsigned_urls[0]) ||
      `https://openrouter.ai/api/v1/videos/${encodeURIComponent(jobId)}/content?index=0`;
  }

  return Response.json({
    ok: true,
    status,
    videoUrl,
    error: d.error || null,
    usage: d.usage || null
  }, { headers: cors });
}

async function chat(body, env, cors) {
  const prompt = String(body.prompt || "").trim();
  if (!prompt) {
    return Response.json({ error: "Prompt is required" }, { status: 400, headers: cors });
  }

  if (!env.OPENROUTER_API_KEY) {
    return Response.json({ error: "OPENROUTER_API_KEY missing" }, { status: 500, headers: cors });
  }

  const prior = Array.isArray(body.history) ? body.history.slice(-18) : [];

  const messages = [
    {
      role: "system",
      content:
        "You are MatrixFlowAI. Be fast, direct and context-aware. " +
        "Use the recent conversation history instead of restarting explanations. " +
        "When the user says yes, haan, next, this, it, isme, isko, same, continue, etc., resolve the reference from prior turns. " +
        "Do not repeat information the user already has unless it is needed. " +
        "Answer in the user's language/style when obvious. Keep normal answers concise; expand only when asked."
    },
    ...prior
      .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .map(m => ({ role: m.role, content: m.content }))
  ];

  if (!messages.length || messages[messages.length - 1].content !== prompt) {
    messages.push({ role: "user", content: prompt });
  }

  const payload = {
    model: "openrouter/free",
    messages,
    stream: true,
    temperature: 0.25,
    max_tokens: 1100
  };

  // Smart Web is opt-in because web grounding adds latency/cost.
  if (body.webSearch === true) {
    payload.plugins = [{ id: "web", max_results: 3 }];
  }

  const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://matrixflowai.in",
      "X-Title": "MatrixFlowAI"
    },
    body: JSON.stringify(payload)
  });

  if (!r.ok) {
    const err = await r.text();
    return new Response(JSON.stringify({ error: err }), {
      status: r.status,
      headers: { "Content-Type": "application/json", ...cors }
    });
  }

  const upstream = r.body;
  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.getReader();
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();
      let buffer = "";

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const raw = line.slice(5).trim();
            if (!raw || raw === "[DONE]") continue;

            try {
              const j = JSON.parse(raw);
              const delta = j.choices?.[0]?.delta?.content || "";
              if (delta) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: "delta", delta })}\n\n`)
                );
              }
            } catch (_) {}
          }
        }

        if (buffer.startsWith("data:")) {
          const raw = buffer.slice(5).trim();
          if (raw && raw !== "[DONE]") {
            try {
              const j = JSON.parse(raw);
              const delta = j.choices?.[0]?.delta?.content || "";
              if (delta) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: "delta", delta })}\n\n`)
                );
              }
            } catch (_) {}
          }
        }

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
        );
      } catch (e) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "error", error: e?.message || "Stream error" })}\n\n`)
        );
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      ...cors
    }
  });
}
