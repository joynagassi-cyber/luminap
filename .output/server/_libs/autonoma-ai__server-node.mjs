import { n as handleRequest } from "./autonoma-ai__sdk.mjs";
//#region node_modules/.pnpm/@autonoma-ai+server-node@0.2.9_zod@3.25.76/node_modules/@autonoma-ai/server-node/dist/index.js
function createNodeHandler(config) {
	const enrichedConfig = {
		...config,
		sdk: {
			...config.sdk,
			server: "node"
		}
	};
	return async (req, res) => {
		const body = await readBody(req);
		const headers = {};
		for (const [key, val] of Object.entries(req.headers)) if (typeof val === "string") headers[key] = val;
		else if (Array.isArray(val)) headers[key] = val[0] ?? "";
		const result = await handleRequest(enrichedConfig, {
			body,
			headers
		});
		res.writeHead(result.status, { "Content-Type": "application/json" });
		res.end(JSON.stringify(result.body));
	};
}
function readBody(req) {
	return new Promise((resolve, reject) => {
		const chunks = [];
		req.on("data", (chunk) => chunks.push(chunk));
		req.on("end", () => resolve(Buffer.concat(chunks).toString()));
		req.on("error", reject);
	});
}
//#endregion
export { createNodeHandler as t };
