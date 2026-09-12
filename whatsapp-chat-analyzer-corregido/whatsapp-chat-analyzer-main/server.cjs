require("dotenv").config();

const http = require("http");

const PORT = process.env.PORT || 8787;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    console.error("❌ Falta GEMINI_API_KEY en el archivo .env");
    process.exit(1);
}

async function askGemini(prompt) {

    const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/interactions",
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": GEMINI_API_KEY
            },

            body: JSON.stringify({
                model: "gemini-3.6-flash",

                input: prompt,

                system_instruction: `
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

Sé directo, claro y específico.

Responde en español.
`
            })
        }
    );

    const text = await response.text();

    let data;

    try {
        data = JSON.parse(text);
    } catch {
        throw new Error(
            `Gemini devolvió una respuesta no válida (${response.status}): ${text.slice(0, 500)}`
        );
    }

    if (!response.ok) {
        throw new Error(
            data?.error?.message ||
            `Gemini API respondió con HTTP ${response.status}`
        );
    }

    const output = data.steps
        ?.filter(step => step.type === "model_output")
        ?.flatMap(step => step.content || [])
        ?.filter(content => content.type === "text")
        ?.map(content => content.text)
        ?.join("\n");

    if (!output) {
        throw new Error("Gemini no devolvió texto.");
    }

    return output;
}


const server = http.createServer(async (req, res) => {

    // CORS básico para desarrollo
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

    if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method === "POST" && req.url === "/api/ai") {

        let body = "";

        req.on("data", chunk => {
            body += chunk;
        });

        req.on("end", async () => {

            try {

                const request = JSON.parse(body);

                if (!request.prompt) {
                    throw new Error("No se recibió ningún prompt.");
                }

                console.log("🤖 Analizando conversación con Gemini...");

                const result = await askGemini(request.prompt);

                res.writeHead(200, {
                    "Content-Type": "application/json; charset=utf-8"
                });

                res.end(
                    JSON.stringify({
                        success: true,
                        text: result
                    })
                );

            } catch (error) {

                console.error("❌ Error IA:", error);

                res.writeHead(500, {
                    "Content-Type": "application/json; charset=utf-8"
                });

                res.end(
                    JSON.stringify({
                        success: false,
                        error: error.message
                    })
                );
            }
        });

        return;
    }

    res.writeHead(404);
    res.end("Not found");
});


server.listen(PORT, () => {

    console.log("");
    console.log("====================================");
    console.log(" 🤖 WhatsApp Analyzer AI Server");
    console.log("====================================");
    console.log(`🚀 Servidor: http://localhost:${PORT}`);
    console.log("🔐 API key: cargada desde .env");
    console.log("🧠 Modelo: gemini-3.6-flash");
    console.log("🔌 API: Interactions API");
    console.log("====================================");
    console.log("");

});