import { mkdir, writeFile } from "node:fs/promises";

const worker = `
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let response = await env.ASSETS.fetch(request);

    // Tek sayfalı uygulama rotalarında ana belgeyi sun.
    if (response.status === 404 && request.method === "GET") {
      response = await env.ASSETS.fetch(new Request(new URL("/", url), request));
    }

    // Sosyal paylaşım görselinin adresini gelen alan adına göre mutlak yap.
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
      const html = (await response.text()).replaceAll(
        'content="/og.png"',
        'content="' + url.origin + '/og.png"',
      );
      const headers = new Headers(response.headers);
      headers.delete("content-length");
      return new Response(html, { status: response.status, headers });
    }

    return response;
  },
};
`;

await mkdir(new URL("../dist/server/", import.meta.url), { recursive: true });
await writeFile(new URL("../dist/server/index.js", import.meta.url), worker.trimStart());
