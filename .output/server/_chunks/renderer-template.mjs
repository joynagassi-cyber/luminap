import { r as HTTPResponse } from "../_libs/h3+rou3+srvx.mjs";
//#region #nitro/virtual/renderer-template
var rendererTemplate = () => new HTTPResponse("<!DOCTYPE html>\n<html lang=\"fr\">\n<head>\n  <meta charset=\"UTF-8\" />\n  <link rel=\"icon\" type=\"image/x-icon\" href=\"/favicon.ico\" />\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover\" />\n  <meta name=\"theme-color\" content=\"#FF6B00\" />\n  <meta name=\"apple-mobile-web-app-capable\" content=\"yes\" />\n  <meta name=\"apple-mobile-web-app-status-bar-style\" content=\"black-translucent\" />\n  <meta name=\"mobile-web-app-capable\" content=\"yes\" />\n  <meta name=\"application-name\" content=\"Lumina\" />\n  <meta name=\"msapplication-TileColor\" content=\"#FF6B00\" />\n  <meta name=\"msapplication-tap-highlight\" content=\"no\" />\n  <title>Lumina · Gestion financière</title>\n  <link rel=\"manifest\" href=\"/manifest.json\" />\n  <script type=\"module\" crossorigin src=\"/assets/index-DUryz-dp.js\"><\/script>\n  <link rel=\"stylesheet\" crossorigin href=\"/assets/index-4ohfnSAe.css\">\n</head>\n<body>\n  <div id=\"root\"></div>\n</body>\n</html>\n", { headers: { "content-type": "text/html; charset=utf-8" } });
//#endregion
//#region node_modules/.pnpm/nitro@3.0.260610-beta_jiti@_bcfa22fdd2e1bd5094b057c6265ea297/node_modules/nitro/dist/runtime/internal/routes/renderer-template.mjs
function renderIndexHTML(event) {
	return rendererTemplate(event.req);
}
//#endregion
export { renderIndexHTML as default };
