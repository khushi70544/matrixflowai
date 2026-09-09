export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "https://matrixflowai.in",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response("MatrixFlow AI is running 🚀", {
        headers: {
          "Content-Type": "text/plain",
          ...corsHeaders
        }
      });
    }

    try {
      const body = await request.json();
      const prompt = body.prompt;

      if (!prompt) {
        return Response.json(
          { error: "Prompt is required" },
          { status: 400, headers: corsHeaders }
        );
      }

      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": env.GEMINI_API_KEY
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: prompt }]
              }
            ]
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return Response.json(
          { error: data },
          { status: response.status, headers: corsHeaders }
        );
      }

      const text =
        data.candidates?.[0]?.content?.parts
          ?.map(part => part.text || "")
          .join("") || "";

      return Response.json(
        { response: text },
        { headers: corsHeaders }
      );
    } catch (error) {
      return Response.json(
        { error: error.message },
        { status: 500, headers: corsHeaders }
      );
    }
  }
};
