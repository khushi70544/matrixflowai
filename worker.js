export default {
  async fetch(request, env) {
    const cors = {
      "Access-Control-Allow-Origin": "https://matrixflowai.in",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin"
    };
    if (request.method === "OPTIONS") return new Response(null, {headers:cors});
    if (request.method !== "POST") return new Response("MatrixFlowAI V5 Worker online 🚀",{headers:{"Content-Type":"text/plain",...cors}});
    try {
      const body = await request.json();

      if (body.action === "video") {
        if (!env.OPENROUTER_API_KEY) return Response.json({error:"OPENROUTER_API_KEY missing"},{status:500,headers:cors});
        const payload = {
          model: body.model || "openai/sora-2",
          prompt: body.prompt,
          duration: 8,
          aspect_ratio: body.aspectRatio || "16:9"
        };
        const r = await fetch("https://openrouter.ai/api/v1/videos", {
          method:"POST",
          headers:{
            "Authorization":`Bearer ${env.OPENROUTER_API_KEY}`,
            "Content-Type":"application/json",
            "HTTP-Referer":"https://matrixflowai.in",
            "X-Title":"MatrixFlowAI"
          },
          body:JSON.stringify(payload)
        });
        const d=await r.json();
        return Response.json(d,{status:r.status,headers:cors});
      }

      const prompt=(body.prompt||"").trim();
      if(!prompt) return Response.json({error:"Prompt is required"},{status:400,headers:cors});
      if(!env.OPENROUTER_API_KEY) return Response.json({error:"OPENROUTER_API_KEY missing"},{status:500,headers:cors});

      const prior=Array.isArray(body.history)?body.history.slice(-18):[];
      const messages=[
        {role:"system",content:"You are MatrixFlowAI. Answer directly and quickly. Use the conversation history to understand follow-ups. Never restart an explanation just because the user says yes, next, this, it, or asks a follow-up. If current information is needed, use web search only when enabled. Keep answers concise unless detail is requested."},
        ...prior.filter(m=>m && (m.role==="user"||m.role==="assistant") && typeof m.content==="string").map(m=>({role:m.role,content:m.content}))
      ];
      if (!messages.length || messages[messages.length-1].content!==prompt) messages.push({role:"user",content:prompt});

      const payload={
        model:"openrouter/free",
        messages,
        stream:true,
        temperature:0.35,
        max_tokens:1400
      };

      if(body.webSearch){
        payload.plugins=[{id:"web",max_results:5}];
      }

      let r=await fetch("https://openrouter.ai/api/v1/chat/completions",{
        method:"POST",
        headers:{
          "Authorization":`Bearer ${env.OPENROUTER_API_KEY}`,
          "Content-Type":"application/json",
          "HTTP-Referer":"https://matrixflowai.in",
          "X-Title":"MatrixFlowAI"
        },
        body:JSON.stringify(payload)
      });

      if(!r.ok){
        const err=await r.text();
        return new Response(JSON.stringify({error:err}),{status:r.status,headers:{"Content-Type":"application/json",...cors}});
      }

      const upstream=r.body;
      const stream=new ReadableStream({
        async start(controller){
          const reader=upstream.getReader(), decoder=new TextDecoder(), encoder=new TextEncoder();
          try{
            while(true){
              const {value,done}=await reader.read(); if(done)break;
              const text=decoder.decode(value,{stream:true});
              for(const line of text.split("\n")){
                if(!line.startsWith("data:"))continue;
                const raw=line.slice(5).trim(); if(raw==="[DONE]")continue;
                try{
                  const j=JSON.parse(raw), delta=j.choices?.[0]?.delta?.content||"";
                  if(delta) controller.enqueue(encoder.encode(`data: ${JSON.stringify({type:"delta",delta})}\n\n`));
                }catch{}
              }
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({type:"done"})}\n\n`));
          }catch(e){controller.enqueue(encoder.encode(`data: ${JSON.stringify({type:"error",error:e.message})}\n\n`));}
          controller.close();
        }
      });
      return new Response(stream,{headers:{"Content-Type":"text/event-stream; charset=utf-8","Cache-Control":"no-cache","Connection":"keep-alive",...cors}});
    } catch(e) {
      return Response.json({error:e.message},{status:500,headers:cors});
    }
  }
};