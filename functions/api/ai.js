const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";
const GEMINI_MODEL = "gemini-3.6-flash";

// Aproximación conservadora para mantener el prompt completo dentro de una
// ventana de contexto grande. No se recorta contenido silenciosamente.
const MAX_PROMPT_CHARS = 3_000_000;
const MAX_BODY_BYTES = 4_500_000;

const SYSTEM_INSTRUCTION = `
Eres el analista de una aplicación llamada WhatsApp Chat Analyzer.

Analiza conversaciones de WhatsApp basándote únicamente en los datos proporcionados.

Debes diferenciar siempre entre:
1. Datos objetivos.
2. Interpretaciones.
3. Hipótesis.

No realices diagnósticos psicológicos.

Cuando hables de apego, personalidad o comportamiento psicológico,
utiliza expresiones como:
"podría ser compatible con..."
"se observan patrones que podrían indicar..."
"no es suficiente para determinar..."

Nunca afirmes que una persona tiene un trastorno o diagnóstico.

Sé directo, claro y específico. Cuando sea posible, apoya las conclusiones con
patrones o ejemplos del chat sin inventar mensajes.

Si no has podido procesar íntegramente la información recibida, debes decirlo
explícitamente. Nunca afirmes haber analizado el 100 % si no es cierto.

Responde en español.
`;

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function extractGeminiText(data) {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const text = data?.steps
    ?.filter((step) => step?.type === "model_output")
    ?.flatMap((step) => step?.content || [])
    ?.filter((content) => content?.type === "text" && typeof content?.text === "string")
    ?.map((content) => content.text)
    ?.join("\n")
    ?.trim();

  return text || "";
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      Allow: "POST, OPTIONS",
      "Cache-Control": "no-store",
    },
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    // La aplicación usa llamadas same-origin. Esto evita peticiones normales
    // iniciadas desde otras webs, aunque no sustituye a un sistema de login.
    const origin = request.headers.get("Origin");
    const currentOrigin = new URL(request.url).origin;
    if (origin && origin !== currentOrigin) {
      return jsonResponse(
        { success: false, error: "Origen de la petición no permitido." },
        403
      );
    }

    if (!env.GEMINI_API_KEY) {
      return jsonResponse(
        {
          success: false,
          error:
            "Falta configurar el secreto GEMINI_API_KEY en Cloudflare Pages.",
        },
        500
      );
    }

    const contentType = request.headers.get("Content-Type") || "";
    if (!contentType.toLowerCase().includes("application/json")) {
      return jsonResponse(
        { success: false, error: "La petición debe ser JSON." },
        415
      );
    }

    const contentLength = Number(request.headers.get("Content-Length") || 0);
    if (contentLength && contentLength > MAX_BODY_BYTES) {
      return jsonResponse(
        {
          success: false,
          error:
            "El chat es demasiado grande para enviarlo completo de forma segura. No se ha recortado ni analizado parcialmente.",
        },
        413
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse(
        { success: false, error: "No se pudo leer el cuerpo JSON de la petición." },
        400
      );
    }

    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";

    if (!prompt) {
      return jsonResponse(
        { success: false, error: "No se recibió ningún prompt para analizar." },
        400
      );
    }

    if (prompt.length > MAX_PROMPT_CHARS) {
      return jsonResponse(
        {
          success: false,
          error:
            "El chat supera el tamaño configurado para un análisis íntegro. No se ha enviado una versión recortada a la IA.",
        },
        413
      );
    }

    const geminiResponse = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        model: GEMINI_MODEL,
        input: prompt,
        system_instruction: SYSTEM_INSTRUCTION,
      }),
    });

    const raw = await geminiResponse.text();
    let data;

    try {
      data = JSON.parse(raw);
    } catch {
      return jsonResponse(
        {
          success: false,
          error: `Gemini devolvió una respuesta no válida (HTTP ${geminiResponse.status}).`,
        },
        502
      );
    }

    if (!geminiResponse.ok) {
      const message =
        data?.error?.message ||
        `Gemini API respondió con HTTP ${geminiResponse.status}.`;

      const status =
        geminiResponse.status === 429
          ? 429
          : geminiResponse.status >= 400 && geminiResponse.status < 500
            ? 400
            : 502;

      return jsonResponse({ success: false, error: message }, status);
    }

    const output = extractGeminiText(data);

    if (!output) {
      return jsonResponse(
        { success: false, error: "Gemini no devolvió texto en el análisis." },
        502
      );
    }

    return jsonResponse({
      success: true,
      text: output,
      model: data?.model || GEMINI_MODEL,
      usage: data?.usage || null,
    });
  } catch (error) {
    console.error("Error en /api/ai:", error);
    return jsonResponse(
      {
        success: false,
        error: error?.message || "Error interno al ejecutar el análisis de IA.",
      },
      500
    );
  }
}
