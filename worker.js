export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    const corsHeaders = {"Access-Control-Allow-Origin": origin === "https://matrixflowai.in" || origin === "https://www.matrixflowai.in" ? origin : "https://matrixflowai.in", "Access-Control-Allow-Methods":"GET, POST, OPTIONS", "Access-Control-Allow-Headers":"Content-Type", "Vary":"Origin"};
    if(request.method==="OPTIONS") return new Response(null,{status:204,headers:corsHeaders});
    if(request.method==="GET") return new Response(JSON.stringify({status:"online",provider:"OpenRouter",webSearch:"available",message:"MatrixFlowAI is running"}),{status:200,headers:{"Content-Type":"application/json",...corsHeaders}});
    if(request.method!=="POST") return new Response(JSON.stringify({error:"Method not allowed"}),{status:405,headers:{"Content-Type":"application/json",...corsHeaders}});
    try{
      if(!env.OPENROUTER_API_KEY) return new Response(JSON.stringify({error:"OPENROUTER_API_KEY is missing"}),{status:500,headers:{"Content-Type":"application/json",...corsHeaders}});
      const body=await request.json(), prompt=typeof body.prompt==="string"?body.prompt.trim():"", webSearch=body.webSearch!==false, history=Array.isArray(body.history)?body.history.slice(-18):[];
      if(!prompt) return new Response(JSON.stringify({error:"Prompt is required"}),{status:400,headers:{"Content-Type":"application/json",...corsHeaders}});
      const messages=[{role:"system",content:`You are MatrixFlowAI, a fast conversational AI assistant. Understand the CURRENT message using recent conversation context. Do NOT restart an explanation from zero for follow-ups. If the user says haan, yes, okay, next, continue, isme, isko, ye, fir, or similar, infer the reference from recent messages. If corrected, acknowledge and continue from the corrected point. Answer in the user's language and style; for Hindi/Hinglish use natural clear Hinglish. Be concise first. For coding/website tasks, continue from completed work and do not repeat completed steps. Prioritize speed and usefulness.`}];
      for(const m of history) if((m?.role==="user"||m?.role==="assistant")&&typeof m.content==="string"&&m.content.trim()) messages.push({role:m.role,content:m.content.slice(0,6000)});
      messages.push({role:"user",content:prompt});
      const payload={model:"openrouter/free",messages,stream:true,temperature:0.45,max_tokens:1400}; if(webSearch) payload.plugins=[{id:"web",max_results:5}];
      const upstream=await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",headers:{"Authorization":`Bearer ${env.OPENROUTER_API_KEY}`,"Content-Type":"application/json","HTTP-Referer":"https://matrixflowai.in","X-Title":"MatrixFlowAI"},body:JSON.stringify(payload)});
      if(!upstream.ok){const data=await upstream.text();return new Response(JSON.stringify({error:"OpenRouter API error",status:upstream.status,details:data}),{status:upstream.status,headers:{"Content-Type":"application/json",...corsHeaders}})}
      const reader=upstream.body.getReader(), decoder=new TextDecoder(), encoder=new TextEncoder(); let buffer="";
      const stream=new ReadableStream({async pull(controller){const {value,done}=await reader.read();if(done){if(buffer.trim()) for(const line of buffer.split("\n")) emitLine(line,controller,encoder);controller.enqueue(encoder.encode('data: {"type":"done"}\n\n'));controller.close();return}buffer+=decoder.decode(value,{stream:true});const lines=buffer.split("\n");buffer=lines.pop()||"";for(const line of lines)emitLine(line,controller,encoder)},cancel(){reader.cancel()}});
      return new Response(stream,{status:200,headers:{"Content-Type":"text/event-stream; charset=utf-8","Cache-Control":"no-cache, no-transform","Connection":"keep-alive",...corsHeaders}});
    }catch(error){return new Response(JSON.stringify({error:"Worker error",message:error?.message||"Unknown error"}),{status:500,headers:{"Content-Type":"application/json",...corsHeaders}})}
  }
};
function emitLine(line,controller,encoder){line=line.trim();if(!line.startsWith("data:"))return;const raw=line.slice(5).trim();if(!raw||raw==="[DONE]")return;try{const d=JSON.parse(raw),delta=d?.choices?.[0]?.delta?.content;if(typeof delta==="string"&&delta)controller.enqueue(encoder.encode("data: "+JSON.stringify({type:"delta",delta})+"\n\n"))}catch{}}
