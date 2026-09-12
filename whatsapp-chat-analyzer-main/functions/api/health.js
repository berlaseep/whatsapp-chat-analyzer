export function onRequestGet() {
  return new Response(
    JSON.stringify({
      ok: true,
      service: "whatsapp-chat-analyzer",
      runtime: "cloudflare-pages-functions",
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    }
  );
}
