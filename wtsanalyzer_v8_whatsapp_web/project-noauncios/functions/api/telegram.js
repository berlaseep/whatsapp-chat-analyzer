const GITHUB_API = "https://api.github.com";
const CONFIG_PATH = "src/config.js";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function githubHeaders(env) {
  return {
    "Accept": "application/vnd.github+json",
    "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "WhatsApp-Chat-Analyzer-Bot",
  };
}

function decodeBase64(value) {
  const binary = atob(value.replace(/\n/g, ""));
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodeBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

const CATEGORY_MAP = {
  nombre: "BANNED_NAMES",
  nombres: "BANNED_NAMES",
  palabra: "BANNED_WORDS",
  palabras: "BANNED_WORDS",
  insulto: "SWEARS",
  insultos: "SWEARS",
  amor: "LOVE",
  gracias: "THANKS",
  perdon: "SORRY",
  perdón: "SORRY",
  risa: "LAUGH",
  risas: "LAUGH",
  stopword: "STOPWORDS",
  stopwords: "STOPWORDS",
  propia: "USER_WORDS",
  propias: "USER_WORDS",
};

function categoryForSuggestion(type) {
  if (type === "name") return "BANNED_NAMES";
  if (type === "word") return "USER_WORDS";
  return null;
}

function extractArray(source, exportName) {
  const regex = new RegExp(`export\\s+const\\s+${exportName}\\s*=\\s*\\[([\\s\\S]*?)\\];`);
  const match = source.match(regex);
  if (!match) throw new Error(`No se encontró ${exportName} en config.js`);
  const values = [];
  const stringRegex = /"((?:\\.|[^"\\])*)"/g;
  let item;
  while ((item = stringRegex.exec(match[1]))) {
    try { values.push(JSON.parse(`"${item[1]}"`)); } catch { /* ignore malformed literal */ }
  }
  return { values, match: match[0] };
}

function replaceArray(source, exportName, values) {
  const { match } = extractArray(source, exportName);
  const replacement = `export const ${exportName} = [\n${values.map(v => `  ${JSON.stringify(v)},`).join("\n")}\n];`;
  return source.replace(match, replacement);
}

async function getConfig(env) {
  if (!env.GITHUB_TOKEN || !env.GITHUB_OWNER || !env.GITHUB_REPO) {
    throw new Error("Faltan GITHUB_TOKEN, GITHUB_OWNER o GITHUB_REPO.");
  }
  const url = `${GITHUB_API}/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${CONFIG_PATH}`;
  const response = await fetch(url, { headers: githubHeaders(env) });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.message || `GitHub HTTP ${response.status}`);
  return { source: decodeBase64(data.content), sha: data.sha };
}

async function updateConfig(env, source, sha, message) {
  const url = `${GITHUB_API}/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${CONFIG_PATH}`;
  const response = await fetch(url, {
    method: "PUT",
    headers: { ...githubHeaders(env), "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      content: encodeBase64(source),
      sha,
      branch: "main",
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.message || `GitHub HTTP ${response.status}`);
  return data;
}

async function sendTelegram(env, chatId, text) {
  return fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  });
}

async function handleCommand(env, chatId, text) {
  const parts = String(text || "").trim().split(/\s+/);
  const command = (parts.shift() || "").toLowerCase().replace(/^\//, "").split("@")[0];

  if (command === "start" || command === "help" || command === "ayuda") {
    return `🤖 WhatsApp Analyzer Admin\n\n/add nombre María\n/del nombre María\n/add palabra bro\n/del palabra bro\n/add insulto ejemplo\n/del insulto ejemplo\n/add amor cariño\n/del amor cariño\n/add gracias gracias\n/add perdon perdón\n/add risa jajaja\n/add stopword ejemplo\n/add propia javi\n/list nombre\n/list palabra\n\nSolo el administrador autorizado puede usar este bot.`;
  }

  if (command === "list") {
    const category = CATEGORY_MAP[(parts.shift() || "").toLowerCase()];
    if (!category) return "❌ Categoría no válida. Usa /help.";
    const { source } = await getConfig(env);
    const { values } = extractArray(source, category);
    const shown = values.slice(0, 100);
    return `📋 ${category} (${values.length})\n\n${shown.map((v, i) => `${i + 1}. ${v}`).join("\n") || "Vacío"}${values.length > 100 ? "\n…" : ""}`;
  }

  if (command === "add" || command === "del" || command === "añadir" || command === "eliminar") {
    const categoryName = (parts.shift() || "").toLowerCase();
    const category = CATEGORY_MAP[categoryName];
    const value = parts.join(" ").trim();
    if (!category || !value) return "❌ Uso: /add nombre María";

    const { source, sha } = await getConfig(env);
    const { values } = extractArray(source, category);
    const normalized = value.toLocaleLowerCase("es-ES");
    const index = values.findIndex(v => v.toLocaleLowerCase("es-ES") === normalized);

    if (command === "add" || command === "añadir") {
      if (index >= 0) return `ℹ️ Ya existe en ${category}: ${values[index]}`;
      values.push(value);
      const updated = replaceArray(source, category, values);
      await updateConfig(env, updated, sha, `Bot: añadir ${categoryName} ${value}`);
      return `✅ Añadido a ${category}: ${value}\n\nGitHub se actualizará y el despliegue automático aplicará el cambio.`;
    }

    if (index < 0) return `ℹ️ No encontré "${value}" en ${category}.`;
    const removed = values.splice(index, 1)[0];
    const updated = replaceArray(source, category, values);
    await updateConfig(env, updated, sha, `Bot: eliminar ${categoryName} ${value}`);
    return `🗑️ Eliminado de ${category}: ${removed}`;
  }

  return "❓ Comando no reconocido. Usa /help.";
}


async function answerCallback(env, callbackQuery, text) {
  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQuery.id, text }),
  });
}

async function handleCallback(env, callbackQuery) {
  const fromId = callbackQuery?.from?.id;
  const chatId = callbackQuery?.message?.chat?.id;
  const data = String(callbackQuery?.data || "");
  if (!chatId || String(fromId) !== String(env.TELEGRAM_ADMIN_CHAT_ID)) return;

  const match = data.match(/^add:(name|word):(.+)$/);
  if (!match) return;

  const category = categoryForSuggestion(match[1]);
  const value = match[2];
  const { source, sha } = await getConfig(env);
  const { values } = extractArray(source, category);
  const exists = values.some(v => v.toLocaleLowerCase("es-ES") === value.toLocaleLowerCase("es-ES"));
  if (!exists) {
    values.push(value);
    const updated = replaceArray(source, category, values);
    await updateConfig(env, updated, sha, `Bot: sugerencia ${category} ${value}`);
  }
  await answerCallback(env, callbackQuery, exists ? "Ya estaba añadido" : "Añadido a config.js");
}

export async function onAdminConfig({ request, env }) {
  try {
    const token = request.headers.get("X-Admin-Token");
    if (!env.ADMIN_PANEL_TOKEN || token !== env.ADMIN_PANEL_TOKEN) return jsonResponse({ success: false }, 403);
    const { source } = await getConfig(env);
    const result = {};
    for (const [label, category] of Object.entries(CATEGORY_MAP)) {
      if (result[category]) continue;
      result[category] = extractArray(source, category).values;
    }
    return jsonResponse({ success: true, config: result });
  } catch (error) {
    return jsonResponse({ success: false, error: error?.message || "No se pudo leer la configuración." }, 500);
  }
}

export async function onTelegramWebhook({ request, env }) {
  try {
    const secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
    if (!env.TELEGRAM_WEBHOOK_SECRET || secret !== env.TELEGRAM_WEBHOOK_SECRET) {
      return jsonResponse({ ok: false }, 403);
    }

    const update = await request.json();

    if (update?.callback_query) {
      await handleCallback(env, update.callback_query);
      return jsonResponse({ ok: true });
    }

    const message = update?.message;
    const chatId = message?.chat?.id;
    const fromId = message?.from?.id;
    const text = message?.text || "";

    if (!chatId || String(fromId) !== String(env.TELEGRAM_ADMIN_CHAT_ID)) {
      return jsonResponse({ ok: true });
    }

    const reply = await handleCommand(env, chatId, text);
    await sendTelegram(env, chatId, reply);
    return jsonResponse({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return jsonResponse({ ok: true });
  }
}
