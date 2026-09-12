MatrixFlowAI V6

Replace:
- dashboard.html
- worker.js

Cloudflare Worker secrets:
- OPENROUTER_API_KEY = existing key
- FAL_KEY = already added (reserved for next provider/upscale stage)
- HF_TOKEN = already added (reserved for fallback/experiments)

V6 changes:
- Chat streaming
- Recent conversation context restored after reload
- Smart Web is OFF by default for faster replies; turn it on for fresh/current info
- VideoFlow uses OpenRouter's asynchronous video API
- Free-first video model options
- Automatic job polling until the video is ready
- 4K/8K are currently upscale targets; native free generation is limited by model capabilities
- API keys remain server-side in Cloudflare Worker

Current video models exposed in UI:
- alibaba/wan-2.6:free
- google/veo-3.1-lite:free
- openai/sora-2-pro:free

Free endpoints can be rate-limited and model availability can change.
