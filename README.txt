MATRIXFLOWAI PREMIUM V3

1. GitHub:
   - Replace/add index.html in the website root. This is the new premium home page.
   - Replace dashboard.html with the new dashboard.
   - If your GitHub Pages/Cloudflare Pages entry is already index.html, the new home page will appear automatically.

2. Cloudflare Worker:
   - worker.js is included for convenience. Backend URL remains:
     https://matrixflowai-chat.agnihotrimayank99.workers.dev/
   - Keep OPENROUTER_API_KEY as the existing Cloudflare Secret.
   - You do not need to change the secret.

3. Login/Register:
   - The new home page has premium Sign in + Create account UI.
   - For now it is a front-end/demo login gate using localStorage.
   - It is NOT real secure authentication. Real accounts need an auth backend later.

4. ChatFlow:
   - Mobile input stays fixed at the bottom; only messages scroll.
   - Live Web is ON by default.
   - Existing OpenRouter Worker is preserved.

Replace index.html + dashboard.html first. Worker only needs replacing if you want the included copy.
