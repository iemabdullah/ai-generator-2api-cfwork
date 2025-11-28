// =================================================================================
//  Project: ai-generator-2api (Cloudflare Worker Single File Version)
//  Version: 2.4.0 (Codename: Flux Pure Edition)
//  Author: Chief AI Officer
//  Date: 2025-11-26
//
//  [v2.4.0 Changelog]
//  1. [Streamline] Remove all Image-to-Image (Img2Img) logic, keep only Text-to-Image.
//  2. [Lock] Only keep flux-schnell model, remove multi-model routing.
//  3. [Transparency] Web UI log enhancement: display fake IP, complete request headers, complete upstream response.
// =================================================================================

// --- [Part 1: Core Configuration] ---
const CONFIG = {
  PROJECT_NAME: "ai-generator-flux-pure",
  PROJECT_VERSION: "2.4.0",
  
  // ⚠️ Please set API_MASTER_KEY in Cloudflare environment variables, or modify here
  API_MASTER_KEY: "1", 
  
  UPSTREAM_ORIGIN: "https://ai-image-generator.co",
  
  // Only keep Flux Schnell
  MODELS: [
    "flux-schnell"
  ],
  
  DEFAULT_MODEL: "flux-schnell",
};

// --- [Part 2: Worker Entry Routing] ---
export default {
  async fetch(request, env, ctx) {
    const apiKey = env.API_MASTER_KEY || CONFIG.API_MASTER_KEY;
    const url = new URL(request.url);
    
    // 1. CORS Preflight
    if (request.method === 'OPTIONS') {
      return handleCorsPreflight();
    }

    // 2. Developer Cockpit (Web UI)
    if (url.pathname === '/') {
      return handleUI(request, apiKey);
    } 
    // 3. Chat Interface (Text-to-Image only)
    else if (url.pathname === '/v1/chat/completions') {
      return handleChatCompletions(request, apiKey);
    } 
    // 4. Image Generation Interface (Text-to-Image only)
    else if (url.pathname === '/v1/images/generations') {
      return handleImageGenerations(request, apiKey);
    }
    // 5. Models List
    else if (url.pathname === '/v1/models') {
      return handleModelsRequest();
    } 
    else {
      return createErrorResponse(`Endpoint not found: ${url.pathname}`, 404, 'not_found');
    }
  }
};

// --- [Part 3: Core Business Logic] ---

// Logger Class
class Logger {
    constructor() { this.logs = []; }
    add(step, data) {
        const time = new Date().toISOString().split('T')[1].slice(0, -1);
        // If it's an object, keep object format for frontend formatting, otherwise convert to string
        this.logs.push({ time, step, data });
        // Keep console logging
        console.log(`[${step}]`, data);
    }
    get() { return this.logs; }
}

/**
 * Generate random fingerprint ID (32-bit Hex)
 */
function generateFingerprint() {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < 32; i++) {
        result += chars[Math.floor(Math.random() * 16)];
    }
    return result;
}

/**
 * Generate random IP address (for spoofing)
 */
function generateRandomIP() {
    return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

/**
 * Construct fake request headers (including Cookie)
 */
function getFakeHeaders(fingerprint, anonUserId) {
    const fakeIP = generateRandomIP();
    return {
        headers: {
            "accept": "*/*",
            "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
            "content-type": "application/json",
            "origin": CONFIG.UPSTREAM_ORIGIN,
            "referer": `${CONFIG.UPSTREAM_ORIGIN}/`,
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
            // Deep IP spoofing
            "X-Forwarded-For": fakeIP,
            "X-Real-IP": fakeIP,
            "CF-Connecting-IP": fakeIP,
            "True-Client-IP": fakeIP,
            "X-Client-IP": fakeIP,
            "Cookie": `anon_user_id=${anonUserId};`
        },
        fakeIP: fakeIP // Return IP for logging
    };
}

/**
 * Execute upstream generation process (pure text mode)
 */
async function performUpstreamGeneration(prompt, model, aspectRatio, logger) {
    // 1. Generate session identity
    const fingerprint = generateFingerprint();
    const anonUserId = crypto.randomUUID(); 
    const { headers, fakeIP } = getFakeHeaders(fingerprint, anonUserId);
    
    // Detailed log: identity information
    logger.add("Identity Created", { 
        fingerprint, 
        anonUserId, 
        fakeIP: fakeIP,
        userAgent: headers["user-agent"]
    });

    // 2. Deduct credits
    const deductPayload = {
        "trans_type": "image_generation",
        "credits": 1, // Flux Schnell consumes 1 credit
        "model": model,
        "numOutputs": 1,
        "fingerprint_id": fingerprint
    };

    try {
        logger.add("Step 1: Deduct Request", deductPayload);
        const deductRes = await fetch(`${CONFIG.UPSTREAM_ORIGIN}/api/credits/deduct`, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(deductPayload)
        });
        
        const deductText = await deductRes.text();
        let deductJson;
        try { deductJson = JSON.parse(deductText); } catch(e) { deductJson = deductText; }
        
        logger.add("Step 1: Deduct Response", { 
            status: deductRes.status, 
            body: deductJson 
        });

    } catch (e) {
        logger.add("Deduct Error", e.message);
    }

    // 3. Generate
    const provider = "replicate"; // Flux fixed to use replicate

    const formData = new FormData();
    formData.append("prompt", prompt);
    formData.append("model", model);
    formData.append("num_outputs", "1");
    formData.append("inputMode", "text"); // Force text mode
    formData.append("style", "auto");
    formData.append("aspectRatio", aspectRatio || "1:1");
    formData.append("fingerprint_id", fingerprint);
    formData.append("provider", provider);

    // Remove Content-Type to let fetch auto-generate boundary
    const genHeaders = { ...headers };
    delete genHeaders["content-type"]; 

    logger.add("Step 2: Generation Request", {
        url: `${CONFIG.UPSTREAM_ORIGIN}/api/gen-image`,
        provider: provider,
        prompt: prompt,
        aspectRatio: aspectRatio
    });

    const response = await fetch(`${CONFIG.UPSTREAM_ORIGIN}/api/gen-image`, {
        method: "POST",
        headers: genHeaders,
        body: formData
    });

    const respText = await response.text();
    let data;
    try {
        data = JSON.parse(respText);
    } catch (e) {
        logger.add("Upstream Parse Error", respText);
        throw new Error(`Upstream returned non-JSON: ${respText.substring(0, 100)}`);
    }

    // Detailed log: complete upstream response
    logger.add("Step 2: Upstream Response (Full)", data);

    if (!response.ok) {
        throw new Error(`Upstream Error (${response.status}): ${JSON.stringify(data)}`);
    }
    
    if (data.code === 0 && data.data && data.data.length > 0) {
        return data.data[0].url;
    } else {
        throw new Error(data.message || "Unknown upstream error");
    }
}

/**
 * Handle Chat interface (only supports text Prompt)
 */
async function handleChatCompletions(request, apiKey) {
    const logger = new Logger();
    
    if (!verifyAuth(request, apiKey)) return createErrorResponse('Unauthorized', 401, 'unauthorized');

    try {
        const body = await request.json();
        const isWebUI = body.is_web_ui === true;

        const messages = body.messages || [];
        const lastMsg = messages[messages.length - 1];
        
        if (!lastMsg) throw new Error("No messages found");

        let prompt = "";

        // Simplified parsing: only extract text
        if (typeof lastMsg.content === 'string') {
            prompt = lastMsg.content;
        } else if (Array.isArray(lastMsg.content)) {
            for (const part of lastMsg.content) {
                if (part.type === 'text') {
                    prompt += part.text + " ";
                }
                // Ignore image_url
            }
        }

        // Force use Flux
        const model = CONFIG.DEFAULT_MODEL;

        // Execute generation
        const imageUrl = await performUpstreamGeneration(prompt, model, "1:1", logger);

        // Construct response
        const respContent = `![Generated Image](${imageUrl})`;
        const respId = `chatcmpl-${crypto.randomUUID()}`;

        if (body.stream) {
            const { readable, writable } = new TransformStream();
            const writer = writable.getWriter();
            const encoder = new TextEncoder();

            (async () => {
                // [Web UI specific] Send detailed debug logs
                if (isWebUI) {
                    await writer.write(encoder.encode(`data: ${JSON.stringify({ debug: logger.get() })}\n\n`));
                }

                const chunk = {
                    id: respId, object: 'chat.completion.chunk', created: Math.floor(Date.now()/1000),
                    model: model, choices: [{ index: 0, delta: { content: respContent }, finish_reason: null }]
                };
                await writer.write(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
                
                const endChunk = {
                    id: respId, object: 'chat.completion.chunk', created: Math.floor(Date.now()/1000),
                    model: model, choices: [{ index: 0, delta: {}, finish_reason: 'stop' }]
                };
                await writer.write(encoder.encode(`data: ${JSON.stringify(endChunk)}\n\n`));
                await writer.write(encoder.encode('data: [DONE]\n\n'));
                await writer.close();
            })();

            return new Response(readable, {
                headers: corsHeaders({ 'Content-Type': 'text/event-stream' })
            });
        } else {
            return new Response(JSON.stringify({
                id: respId,
                object: "chat.completion",
                created: Math.floor(Date.now() / 1000),
                model: model,
                choices: [{
                    index: 0,
                    message: { role: "assistant", content: respContent },
                    finish_reason: "stop"
                }]
            }), { headers: corsHeaders({ 'Content-Type': 'application/json' }) });
        }

    } catch (e) {
        logger.add("Fatal Error", e.message);
        return createErrorResponse(e.message, 500, 'generation_failed');
    }
}

/**
 * Handle Image interface (Text-to-Image only)
 */
async function handleImageGenerations(request, apiKey) {
    const logger = new Logger();
    if (!verifyAuth(request, apiKey)) return createErrorResponse('Unauthorized', 401, 'unauthorized');

    try {
        const body = await request.json(); // Only supports JSON
        const prompt = body.prompt;
        const model = CONFIG.DEFAULT_MODEL;
        let size = "1:1";
        
        if (body.size === "1024x1792") size = "9:16";
        else if (body.size === "1792x1024") size = "16:9";
        else size = "1:1";

        const imageUrl = await performUpstreamGeneration(prompt, model, size, logger);

        return new Response(JSON.stringify({
            created: Math.floor(Date.now() / 1000),
            data: [{ url: imageUrl }]
        }), { headers: corsHeaders({ 'Content-Type': 'application/json' }) });

    } catch (e) {
        return createErrorResponse(e.message, 500, 'generation_failed');
    }
}

// --- [Helper Functions] ---

function verifyAuth(request, validKey) {
    if (validKey === "1") return true; 
    const auth = request.headers.get('Authorization');
    return auth && auth === `Bearer ${validKey}`;
}

function createErrorResponse(message, status, code) {
    return new Response(JSON.stringify({
        error: { message, type: 'api_error', code }
    }), { status, headers: corsHeaders({ 'Content-Type': 'application/json' }) });
}

function handleCorsPreflight() {
    return new Response(null, { status: 204, headers: corsHeaders() });
}

function corsHeaders(headers = {}) {
    return {
        ...headers,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
}

function handleModelsRequest() {
    return new Response(JSON.stringify({
        object: 'list',
        data: CONFIG.MODELS.map(id => ({ id, object: 'model', created: Date.now(), owned_by: 'ai-generator' }))
    }), { headers: corsHeaders({ 'Content-Type': 'application/json' }) });
}

// --- [Part 4: Developer Cockpit UI (Flux Pure Edition)] ---
function handleUI(request, apiKey) {
  const origin = new URL(request.url).origin;
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${CONFIG.PROJECT_NAME} - Cockpit</title>
    <style>
      :root { --bg: #09090b; --panel: #18181b; --border: #27272a; --text: #e4e4e7; --primary: #f59e0b; --accent: #3b82f6; --code-bg: #000000; }
      body { font-family: 'Segoe UI', sans-serif; background: var(--bg); color: var(--text); margin: 0; height: 100vh; display: flex; overflow: hidden; }
      
      /* Sidebar */
      .sidebar { width: 360px; background: var(--panel); border-right: 1px solid var(--border); padding: 24px; display: flex; flex-direction: column; overflow-y: auto; box-shadow: 2px 0 10px rgba(0,0,0,0.3); }
      .main { flex: 1; display: flex; flex-direction: column; padding: 24px; background-color: #000; position: relative; }
      
      h2 { margin-top: 0; font-size: 20px; color: #fff; display: flex; align-items: center; gap: 10px; }
      .badge { background: var(--primary); color: #000; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: bold; }

      .box { background: #27272a; padding: 16px; border-radius: 8px; border: 1px solid #3f3f46; margin-bottom: 20px; }
      .label { font-size: 12px; color: #a1a1aa; margin-bottom: 8px; display: block; font-weight: 600; }
      .code-block { font-family: 'Consolas', monospace; font-size: 12px; color: var(--primary); background: #111; padding: 10px; border-radius: 6px; cursor: pointer; word-break: break-all; border: 1px solid #333; transition: all 0.2s; }
      .code-block:hover { border-color: var(--primary); background: #1a1a1a; }
      
      input, select, textarea { width: 100%; background: #18181b; border: 1px solid #3f3f46; color: #fff; padding: 10px; border-radius: 6px; margin-bottom: 12px; box-sizing: border-box; font-family: inherit; transition: 0.2s; }
      input:focus, select:focus, textarea:focus { border-color: var(--primary); outline: none; }
      
      button { width: 100%; padding: 12px; background: var(--primary); border: none; border-radius: 6px; font-weight: bold; cursor: pointer; color: #000; font-size: 14px; transition: 0.2s; }
      button:hover { filter: brightness(1.1); }
      button:disabled { background: #3f3f46; color: #71717a; cursor: not-allowed; }
      
      /* Result area */
      .result-area { flex: 1; display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative; background: radial-gradient(circle at center, #1a1a1a 0%, #000 100%); border-radius: 12px; border: 1px solid var(--border); }
      .result-img { max-width: 95%; max-height: 95%; border-radius: 8px; box-shadow: 0 0 30px rgba(0,0,0,0.7); cursor: pointer; transition: transform 0.3s; }
      .result-img:hover { transform: scale(1.01); }
      
      .status-bar { height: 30px; display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: #71717a; margin-top: 12px; padding: 0 4px; }
      
      .spinner { width: 24px; height: 24px; border: 3px solid #333; border-top-color: var(--primary); border-radius: 50%; animation: spin 1s linear infinite; display: none; }
      @keyframes spin { to { transform: rotate(360deg); } }

      /* Log panel */
      .log-panel { height: 200px; background: var(--code-bg); border: 1px solid var(--border); border-radius: 8px; padding: 12px; overflow-y: auto; font-family: 'Consolas', monospace; font-size: 11px; color: #a1a1aa; margin-top: 10px; }
      .log-entry { margin-bottom: 8px; border-bottom: 1px solid #1a1a1a; padding-bottom: 8px; }
      .log-time { color: #52525b; margin-right: 8px; }
      .log-key { color: var(--accent); font-weight: bold; margin-right: 8px; }
      .log-json { color: #86efac; white-space: pre-wrap; display: block; margin-top: 4px; padding-left: 10px; border-left: 2px solid #333; }
    </style>
</head>
<body>
    <div class="sidebar">
        <h2>🎨 Flux Pure <span class="badge">v2.4.0</span></h2>
        
        <div class="box">
            <span class="label">API Key (Click to copy)</span>
            <div class="code-block" onclick="copy('${apiKey}')">${apiKey}</div>
        </div>

        <div class="box">
            <span class="label">API Endpoint</span>
            <div class="code-block" onclick="copy('${origin}/v1/chat/completions')">${origin}/v1/chat/completions</div>
        </div>

        <div class="box">
            <span class="label">Model</span>
            <select id="model" disabled style="opacity:0.7; cursor:not-allowed">
                <option value="flux-schnell" selected>flux-schnell (Locked)</option>
            </select>
            
            <span class="label">Aspect Ratio</span>
            <select id="ratio">
                <option value="1:1">1:1 (Square)</option>
                <option value="16:9">16:9 (Landscape)</option>
                <option value="9:16">9:16 (Portrait)</option>
                <option value="4:3">4:3</option>
                <option value="3:4">3:4</option>
            </select>

            <span class="label">Prompt</span>
            <textarea id="prompt" rows="6" placeholder="Describe the image you want to generate... Example: A futuristic city with neon lights, cyberpunk style"></textarea>
            
            <button id="btn-gen" onclick="generate()">🚀 Generate</button>
        </div>
    </div>

    <main class="main">
        <div class="result-area" id="result-container">
            <div style="color:#3f3f46; text-align:center;">
                <p>Image Preview Area</p>
                <div class="spinner" id="spinner"></div>
            </div>
        </div>
        
        <div class="status-bar">
            <span id="status-text">System Ready</span>
            <span id="time-text"></span>
        </div>

        <div class="log-panel" id="logs">
            <div style="color:#52525b">// Waiting for request... Logs will appear here</div>
        </div>
    </main>

    <script>
        const API_KEY = "${apiKey}";
        const ENDPOINT = "${origin}/v1/chat/completions";

        function copy(text) { navigator.clipboard.writeText(text); alert('Copied to clipboard'); }

        function appendLog(step, data) {
            const logs = document.getElementById('logs');
            const div = document.createElement('div');
            div.className = 'log-entry';
            
            const time = new Date().toLocaleTimeString();
            let content = '';
            
            if (typeof data === 'object') {
                content = \`<span class="log-json">\${JSON.stringify(data, null, 2)}</span>\`;
            } else {
                content = \`<span style="color:#e4e4e7">\${data}</span>\`;
            }

            div.innerHTML = \`<span class="log-time">[\${time}]</span><span class="log-key">\${step}</span>\${content}\`;
            
            // If it's the first addition, clear the initial prompt
            if (logs.innerText.includes('// Waiting for request')) logs.innerHTML = '';
            
            logs.appendChild(div);
            logs.scrollTop = logs.scrollHeight;
        }

        async function generate() {
            const promptEl = document.getElementById('prompt');
            const prompt = promptEl ? promptEl.value.trim() : "";
            if (!prompt) return alert('Please enter a prompt');

            const btn = document.getElementById('btn-gen');
            const spinner = document.getElementById('spinner');
            const status = document.getElementById('status-text');
            const container = document.getElementById('result-container');
            const logs = document.getElementById('logs');
            const timeText = document.getElementById('time-text');

            if(btn) { btn.disabled = true; btn.innerText = "Generating..."; }
            if(spinner) spinner.style.display = 'inline-block';
            if(status) status.innerText = "Connecting to upstream API...";
            if(container) container.innerHTML = '<div class="spinner" style="display:block"></div>';
            if(logs) logs.innerHTML = ''; 

            const startTime = Date.now();

            try {
                const payload = {
                    model: "flux-schnell",
                    messages: [{ role: "user", content: prompt }],
                    stream: true,
                    is_web_ui: true 
                };

                appendLog("System", "Initiating request to Worker...");

                const res = await fetch(ENDPOINT, {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + API_KEY, 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!res.ok) {
                    const errData = await res.json();
                    throw new Error(errData.error?.message || \`HTTP \${res.status}\`);
                }

                const reader = res.body.getReader();
                const decoder = new TextDecoder();
                let fullContent = "";

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\\n');
                    
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const jsonStr = line.slice(6);
                            if (jsonStr === '[DONE]') break;
                            try {
                                const json = JSON.parse(jsonStr);
                                // Handle debug logs
                                if (json.debug) {
                                    json.debug.forEach(log => appendLog(log.step, log.data));
                                    continue;
                                }
                                // Handle content stream
                                if (json.choices && json.choices[0].delta.content) {
                                    fullContent += json.choices[0].delta.content;
                                }
                            } catch (e) {}
                        }
                    }
                }

                const match = fullContent.match(/\\((.*?)\\)/);
                if (match && match[1]) {
                    const imgUrl = match[1];
                    if(container) container.innerHTML = \`<img src="\${imgUrl}" class="result-img" onclick="window.open(this.src)">\`;
                    if(status) status.innerText = "Generation successful";
                    if(timeText) timeText.innerText = \`Time taken: \${((Date.now()-startTime)/1000).toFixed(2)}s\`;
                    appendLog("Success", "Image URL extracted: " + imgUrl);
                } else {
                    throw new Error("Unable to extract image URL from response");
                }

            } catch (e) {
                if(container) container.innerHTML = \`<div style="color:#ef4444; padding:20px; text-align:center">❌ \${e.message}</div>\`;
                if(status) status.innerText = "Error occurred";
                appendLog("Error", e.message);
            } finally {
                if(btn) { btn.disabled = false; btn.innerText = "🚀 Generate"; }
            }
        }
    </script>
</body>
</html>`;

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
