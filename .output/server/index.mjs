globalThis.__nitro_main__ = import.meta.url;
import { t as esm_default } from "./_libs/pg.mjs";
import { a as defineLazyEventHandler, c as NodeResponse, i as defineHandler, l as serve, n as HTTPError, o as defineMiddleware, s as toEventHandler, t as H3Core } from "./_libs/h3+rou3+srvx.mjs";
import { i as withoutTrailingSlash, n as joinURL, r as withLeadingSlash, t as decodePath } from "./_libs/ufo.mjs";
import { t as defineFactory } from "./_libs/autonoma-ai__sdk.mjs";
import { t as createNodeHandler } from "./_libs/autonoma-ai__server-node.mjs";
import { a as objectType, c as unknownType, i as numberType, n as booleanType, o as recordType, r as enumType, s as stringType, t as arrayType } from "./_libs/zod.mjs";
import { createHash } from "node:crypto";
import { promises } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
//#region node_modules/.pnpm/nitro@3.0.260610-beta_jiti@_f054ebf3b994581339357de98dfa56d4/node_modules/nitro/dist/runtime/internal/route-rules.mjs
var headers = ((m) => function headersRouteRule(event) {
	for (const [key, value] of Object.entries(m.options || {})) event.res.headers.set(key, value);
});
//#endregion
//#region #nitro/virtual/public-assets-data
var public_assets_data_default = {
	"/favicon.ico": {
		"type": "image/vnd.microsoft.icon",
		"etag": "\"15f09-4MFHRo4azA6knOGNmsefGO+QUAE\"",
		"mtime": "2026-09-01T22:18:50.675Z",
		"size": 89865,
		"path": "../public/favicon.ico"
	},
	"/manifest.json": {
		"type": "application/json",
		"etag": "\"1eb-Yps4MoMJfzN+wHBnQGhmbJQVrvo\"",
		"mtime": "2026-09-19T22:45:54.341Z",
		"size": 491,
		"path": "../public/manifest.json"
	},
	"/lumina-logo.png": {
		"type": "image/png",
		"etag": "\"c2ce-Xrm5OeE6Rcs4GqYh+OFZRZQyAYE\"",
		"mtime": "2026-09-04T20:43:25.384Z",
		"size": 49870,
		"path": "../public/lumina-logo.png"
	},
	"/assets/AccessHandlePoolVFS-C4PBgx4o.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f0f-p73kO2lCkR2BwvIny7cRdCLzs1g\"",
		"mtime": "2026-09-28T15:29:47.493Z",
		"size": 3855,
		"path": "../public/assets/AccessHandlePoolVFS-C4PBgx4o.js"
	},
	"/placeholder.svg": {
		"type": "image/svg+xml",
		"etag": "\"cb5-3cfZ/x0uNhX4kurZGAkOBE4K/G0\"",
		"mtime": "2026-09-01T22:18:50.682Z",
		"size": 3253,
		"path": "../public/placeholder.svg"
	},
	"/robots.txt": {
		"type": "text/plain; charset=utf-8",
		"etag": "\"ae-hLVBrSrDdpIw3Xl0dJPRkupPepQ\"",
		"mtime": "2026-09-01T22:18:50.689Z",
		"size": 174,
		"path": "../public/robots.txt"
	},
	"/assets/AccessHandlePoolVFS-k-bp0HG6.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f02-WFkNV/KJ/xa7F3xDGFd1mY/Co6Q\"",
		"mtime": "2026-09-28T15:29:50.376Z",
		"size": 3842,
		"path": "../public/assets/AccessHandlePoolVFS-k-bp0HG6.js"
	},
	"/assets/animation-BFNVlYum-BN9-5aKx.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"155c-uJUgRBv4dJeyqs5gmLVnM16gglI\"",
		"mtime": "2026-09-28T15:29:47.999Z",
		"size": 5468,
		"path": "../public/assets/animation-BFNVlYum-BN9-5aKx.js"
	},
	"/assets/Archives-DSvGp9s-.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2590-5TyirHe4NWfFu3f9BHggVZEGgmQ\"",
		"mtime": "2026-09-28T15:29:47.499Z",
		"size": 9616,
		"path": "../public/assets/Archives-DSvGp9s-.js"
	},
	"/assets/AreaChart-CRGA9K51.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2aed-pZbzSz75ub2gF2Y7opu5wEjUH3c\"",
		"mtime": "2026-09-28T15:29:47.505Z",
		"size": 10989,
		"path": "../public/assets/AreaChart-CRGA9K51.js"
	},
	"/assets/arrow-down-right-DzLtSxRl.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"a7-mKaokGPPOLHQ4Ne60z14ZecD9R0\"",
		"mtime": "2026-09-28T15:29:48.000Z",
		"size": 167,
		"path": "../public/assets/arrow-down-right-DzLtSxRl.js"
	},
	"/assets/arrow-left-DouZq6og.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"a4-9PYPs4spZXg2NWegqH9KnI+5lF0\"",
		"mtime": "2026-09-28T15:29:48.001Z",
		"size": 164,
		"path": "../public/assets/arrow-left-DouZq6og.js"
	},
	"/assets/arrow-up-DJyp2rjD.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"110-Mn2SOgxRN1RLUdykngAvgDMzKys\"",
		"mtime": "2026-09-28T15:29:48.001Z",
		"size": 272,
		"path": "../public/assets/arrow-up-DJyp2rjD.js"
	},
	"/assets/arrow-up-right-CQT0OKL9.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"a5-qkLt1EdWHquf8LjCLoeyK9rWUkY\"",
		"mtime": "2026-09-28T15:29:48.002Z",
		"size": 165,
		"path": "../public/assets/arrow-up-right-CQT0OKL9.js"
	},
	"/assets/Balance-DRXh8EOT.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2705-8mA5nynOQyc3Khq2p3tDZWUAJ1c\"",
		"mtime": "2026-09-28T15:29:47.512Z",
		"size": 9989,
		"path": "../public/assets/Balance-DRXh8EOT.js"
	},
	"/assets/BarChart-B8PnsELh.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"138-BA22MNfs4ocXPNjl7Q/+Wd2EI7Y\"",
		"mtime": "2026-09-28T15:29:47.514Z",
		"size": 312,
		"path": "../public/assets/BarChart-B8PnsELh.js"
	},
	"/assets/book-open-CKYkHMrk.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"116-I6X9/r2e9a6Al5sJjCH64/2lp6k\"",
		"mtime": "2026-09-28T15:29:48.003Z",
		"size": 278,
		"path": "../public/assets/book-open-CKYkHMrk.js"
	},
	"/assets/BottomNav-BGqtarlL.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"27b9-Fr2WhUs1qJZNmnFNRZ0FH2zfql4\"",
		"mtime": "2026-09-28T15:29:47.524Z",
		"size": 10169,
		"path": "../public/assets/BottomNav-BGqtarlL.js"
	},
	"/assets/BudgetDetail-Ca090yz3.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1d0b-0Nh5P5grto5bqzG+MvhVQachgzI\"",
		"mtime": "2026-09-28T15:29:47.526Z",
		"size": 7435,
		"path": "../public/assets/BudgetDetail-Ca090yz3.js"
	},
	"/assets/budgets-Bmx30sp-.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"bb1-Cnl0sdQiwa3r9l5OjGJSpjhPubI\"",
		"mtime": "2026-09-28T15:29:48.003Z",
		"size": 2993,
		"path": "../public/assets/budgets-Bmx30sp-.js"
	},
	"/assets/Budgets-DCbt4Vdw.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2991-uX0LY2A/233Gk9RUi7dAIovZ94I\"",
		"mtime": "2026-09-28T15:29:47.528Z",
		"size": 10641,
		"path": "../public/assets/Budgets-DCbt4Vdw.js"
	},
	"/assets/button-active-BfOvDr3b-IKXwQlb2.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"29f-ZNy2sjz/pvuQBhwD8z+8aWg1X+M\"",
		"mtime": "2026-09-28T15:29:48.005Z",
		"size": 671,
		"path": "../public/assets/button-active-BfOvDr3b-IKXwQlb2.js"
	},
	"/assets/calendar-CK2gNp2y.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"101-ys3JylGzLqOX1UyMrrdmYSgic0g\"",
		"mtime": "2026-09-28T15:29:48.005Z",
		"size": 257,
		"path": "../public/assets/calendar-CK2gNp2y.js"
	},
	"/assets/camera-QZlpkaa2.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f8-VQY3Z41/akwdUUri76hSq4E9W94\"",
		"mtime": "2026-09-28T15:29:48.006Z",
		"size": 248,
		"path": "../public/assets/camera-QZlpkaa2.js"
	},
	"/assets/capacitor-CFERIeaU-BRvGkHlk.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"68-vcbVIqshLRTbRXN318mbbpz0FLU\"",
		"mtime": "2026-09-28T15:29:48.009Z",
		"size": 104,
		"path": "../public/assets/capacitor-CFERIeaU-BRvGkHlk.js"
	},
	"/assets/CentralAdmin-B3SQOl9E.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"496f-tY3Ubk8nB71mSQ8tBqPDFG9tRZQ\"",
		"mtime": "2026-09-28T15:29:47.529Z",
		"size": 18799,
		"path": "../public/assets/CentralAdmin-B3SQOl9E.js"
	},
	"/assets/chart-Djau7IcC.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"11b7-kBa8UcfrUH5WJ6YIYz0hIDhJk78\"",
		"mtime": "2026-09-28T15:29:48.010Z",
		"size": 4535,
		"path": "../public/assets/chart-Djau7IcC.js"
	},
	"/assets/chevron-right-ajFxgpTM.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"81-kbR0fuNA/Ktb83E2TzwLUcQPyaY\"",
		"mtime": "2026-09-28T15:29:48.013Z",
		"size": 129,
		"path": "../public/assets/chevron-right-ajFxgpTM.js"
	},
	"/assets/circle-alert-4JPDFaqz.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f9-CoiO6GwZAZM76WjaIe1gBJt7jUI\"",
		"mtime": "2026-09-28T15:29:48.017Z",
		"size": 249,
		"path": "../public/assets/circle-alert-4JPDFaqz.js"
	},
	"/assets/circle-check-big-D-Mv3myh.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"c0-4eKkeshJtC/VwmQ1yNJkymxuwFY\"",
		"mtime": "2026-09-28T15:29:48.022Z",
		"size": 192,
		"path": "../public/assets/circle-check-big-D-Mv3myh.js"
	},
	"/assets/circle-plus-Clu2S3Jb.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"ce-ilFDIUHB4ug4hsG1klTDLmthGV8\"",
		"mtime": "2026-09-28T15:29:48.023Z",
		"size": 206,
		"path": "../public/assets/circle-plus-Clu2S3Jb.js"
	},
	"/assets/circle-user-CPD4wJbj.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"103-14Pyg1PpZ+B+scPRfw/OJTL//ZI\"",
		"mtime": "2026-09-28T15:29:48.024Z",
		"size": 259,
		"path": "../public/assets/circle-user-CPD4wJbj.js"
	},
	"/assets/circle-x-6JxQO0Zg.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"ce-YlXm3bb/h284Eq8bN7HWrIjtSgQ\"",
		"mtime": "2026-09-28T15:29:48.025Z",
		"size": 206,
		"path": "../public/assets/circle-x-6JxQO0Zg.js"
	},
	"/assets/client-C2nVZ1DR.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"98-4WrQsLdJYivjycu6E7Vgxml6ODE\"",
		"mtime": "2026-09-28T15:29:48.026Z",
		"size": 152,
		"path": "../public/assets/client-C2nVZ1DR.js"
	},
	"/assets/clipboard-list-Fynnx_Vg.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"19a-3t0mVZDWJ3VSn7nTyB5SKaVLjo4\"",
		"mtime": "2026-09-28T15:29:48.081Z",
		"size": 410,
		"path": "../public/assets/clipboard-list-Fynnx_Vg.js"
	},
	"/assets/clock-Dr3yCEl-.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"b7-8EF0cAm43YPknfIIdkoK5WGYvus\"",
		"mtime": "2026-09-28T15:29:48.082Z",
		"size": 183,
		"path": "../public/assets/clock-Dr3yCEl-.js"
	},
	"/assets/coins-DOCPmgk8.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"117-J5OMUSYoDjb1jSxR29iDfMWDiBM\"",
		"mtime": "2026-09-28T15:29:48.083Z",
		"size": 279,
		"path": "../public/assets/coins-DOCPmgk8.js"
	},
	"/assets/compare-with-utils-sObYyvOy-Clc7qkmg.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"cc-efyrXHxa5zfssT9cmsGwSUbscrk\"",
		"mtime": "2026-09-28T15:29:48.084Z",
		"size": 204,
		"path": "../public/assets/compare-with-utils-sObYyvOy-Clc7qkmg.js"
	},
	"/assets/Cotisations-BHRYPGG2.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"13ea-5GMwWGI9qQ1QBE08rHepOAHs64M\"",
		"mtime": "2026-09-28T15:29:47.531Z",
		"size": 5098,
		"path": "../public/assets/Cotisations-BHRYPGG2.js"
	},
	"/assets/createLucideIcon-DilxmJV8.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3b1-FRKPjixZOiUTL2lTZaHsYYDIXlc\"",
		"mtime": "2026-09-28T15:29:48.097Z",
		"size": 945,
		"path": "../public/assets/createLucideIcon-DilxmJV8.js"
	},
	"/assets/cubic-bezier-hHmYLOfE-YQsBBgKD.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"353-a8F/n8Fxj2GIyjP6idmsQuaOxJw\"",
		"mtime": "2026-09-28T15:29:48.141Z",
		"size": 851,
		"path": "../public/assets/cubic-bezier-hHmYLOfE-YQsBBgKD.js"
	},
	"/assets/CulteDetail-BlqfazIH.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2a4d-09TihMs+aFyRMff9p0/aMbXDjBI\"",
		"mtime": "2026-09-28T15:29:47.533Z",
		"size": 10829,
		"path": "../public/assets/CulteDetail-BlqfazIH.js"
	},
	"/assets/CustomFields-NGqV760A.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1c52-8tFInFQfMBhscumMpj3ag74oaCw\"",
		"mtime": "2026-09-28T15:29:47.534Z",
		"size": 7250,
		"path": "../public/assets/CustomFields-NGqV760A.js"
	},
	"/assets/Dashboard-BbTHLXpv.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3c96-MwUFdu6BHplgYD5nfPojwKDqOjs\"",
		"mtime": "2026-09-28T15:29:47.540Z",
		"size": 15510,
		"path": "../public/assets/Dashboard-BbTHLXpv.js"
	},
	"/assets/database-CU5pHuvC.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f3-lBLkLIgjrHm6cCNj4uDlqsdTJrQ\"",
		"mtime": "2026-09-28T15:29:48.142Z",
		"size": 243,
		"path": "../public/assets/database-CU5pHuvC.js"
	},
	"/assets/dir-Dojwmvde-BkDHf8Ux.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"be-VbpHh1e2MTMDg9naV+7xvnBYe5A\"",
		"mtime": "2026-09-28T15:29:48.143Z",
		"size": 190,
		"path": "../public/assets/dir-Dojwmvde-BkDHf8Ux.js"
	},
	"/assets/dist-0vnC2M5Q.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"6b43-C7hopWZiVvod8U9ZebEjeP+N7cY\"",
		"mtime": "2026-09-28T15:29:48.164Z",
		"size": 27459,
		"path": "../public/assets/dist-0vnC2M5Q.js"
	},
	"/assets/dist-BV8S0ZXn.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"20fd-sHDhFLd+FNENdQltLtCowR4CrgA\"",
		"mtime": "2026-09-28T15:29:48.164Z",
		"size": 8445,
		"path": "../public/assets/dist-BV8S0ZXn.js"
	},
	"/assets/download-C7YG-U1g.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"106-gszQWPpzbSdd0FL3vMghxEu2r30\"",
		"mtime": "2026-09-28T15:29:48.167Z",
		"size": 262,
		"path": "../public/assets/download-C7YG-U1g.js"
	},
	"/assets/dist-LtK9YSdv.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"10d084-wojJ8yuidhr6vOh/9F67tKFME1s\"",
		"mtime": "2026-09-28T15:29:48.166Z",
		"size": 1101956,
		"path": "../public/assets/dist-LtK9YSdv.js"
	},
	"/assets/EventDetail-OoAwHr63.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"55dd-bNmATywGQ6ERnD1We7Rcay8raVA\"",
		"mtime": "2026-09-28T15:29:47.543Z",
		"size": 21981,
		"path": "../public/assets/EventDetail-OoAwHr63.js"
	},
	"/assets/EventEdit-BX8i4tLQ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"14c0-T6vzhJ5e9AUj+JHSnMoTD4QrZO4\"",
		"mtime": "2026-09-28T15:29:47.546Z",
		"size": 5312,
		"path": "../public/assets/EventEdit-BX8i4tLQ.js"
	},
	"/assets/EventNew-BcI-5gf2.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"229b-fq6v2E/226FYvkh0335gMWMfKAw\"",
		"mtime": "2026-09-28T15:29:47.548Z",
		"size": 8859,
		"path": "../public/assets/EventNew-BcI-5gf2.js"
	},
	"/assets/Events-DlcErDJh.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"12cf-GcCbtA1rRDUu9YUwBsk9mV1mxe8\"",
		"mtime": "2026-09-28T15:29:47.555Z",
		"size": 4815,
		"path": "../public/assets/Events-DlcErDJh.js"
	},
	"/assets/FacadeVFS-BEICR2q0.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1871-h2JM49n3k6wsMKWYG0w5CCQNUNY\"",
		"mtime": "2026-09-28T15:29:50.377Z",
		"size": 6257,
		"path": "../public/assets/FacadeVFS-BEICR2q0.js"
	},
	"/assets/FacadeVFS-C-6RNCV1.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1870-IuomK2mGdXuwRh6y14nb3V9uDHY\"",
		"mtime": "2026-09-28T15:29:47.559Z",
		"size": 6256,
		"path": "../public/assets/FacadeVFS-C-6RNCV1.js"
	},
	"/assets/Federation-triBdsvz.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"355b-Tvfvp4NDmifg4iKYEZYOW+j0Vt4\"",
		"mtime": "2026-09-28T15:29:47.560Z",
		"size": 13659,
		"path": "../public/assets/Federation-triBdsvz.js"
	},
	"/assets/federation-YOx5xmIl.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1691-h+jIb0fAl7Lb7owJK4AB/fYO6uQ\"",
		"mtime": "2026-09-28T15:29:48.177Z",
		"size": 5777,
		"path": "../public/assets/federation-YOx5xmIl.js"
	},
	"/assets/FederationTree-D6myUndR.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2af79-2PDh/CNIzjOleHUzbsFJDlVLKDM\"",
		"mtime": "2026-09-28T15:29:47.562Z",
		"size": 175993,
		"path": "../public/assets/FederationTree-D6myUndR.js"
	},
	"/assets/FederationTree-DLioOiRN.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"3c35-lFaZK5XKLiA1ueePpWy3ZyWmewg\"",
		"mtime": "2026-09-28T15:29:49.621Z",
		"size": 15413,
		"path": "../public/assets/FederationTree-DLioOiRN.css"
	},
	"/assets/Finance-UonjV11U.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1ca9-60vpQl2FmUe4OcwFa3f/4uWfUgQ\"",
		"mtime": "2026-09-28T15:29:47.563Z",
		"size": 7337,
		"path": "../public/assets/Finance-UonjV11U.js"
	},
	"/assets/focus-visible-BmVRXR1y-B2KhFaw9.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"397-wo579bxg3vpd7A1jFLHhhl0rIBo\"",
		"mtime": "2026-09-28T15:29:48.177Z",
		"size": 919,
		"path": "../public/assets/focus-visible-BmVRXR1y-B2KhFaw9.js"
	},
	"/assets/format-DDFE9jM5-D6VhYrxs.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1f0f-0TEjXoExDdp2Mhbja3RyYv1dwDQ\"",
		"mtime": "2026-09-28T15:29:48.179Z",
		"size": 7951,
		"path": "../public/assets/format-DDFE9jM5-D6VhYrxs.js"
	},
	"/assets/FormBuilder-BFUNJfod.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"29ea-6yJ9pTxfjss4OUfyq5C8VzkAv/g\"",
		"mtime": "2026-09-28T15:29:47.564Z",
		"size": 10730,
		"path": "../public/assets/FormBuilder-BFUNJfod.js"
	},
	"/assets/FormFill-D2qul-0N.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"192f-SJMFTYCvQMg9lPjdPiRzyt5Weko\"",
		"mtime": "2026-09-28T15:29:47.581Z",
		"size": 6447,
		"path": "../public/assets/FormFill-D2qul-0N.js"
	},
	"/assets/FormSubmissions-BqH_ob8p.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"12c8-CmuHxV2HH9lzDt/RleMCaxtvUXg\"",
		"mtime": "2026-09-28T15:29:47.582Z",
		"size": 4808,
		"path": "../public/assets/FormSubmissions-BqH_ob8p.js"
	},
	"/assets/formSystem-8pPzesjY.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"b36-PpwzFvgzp6oRasiDxQoTiuSr2uE\"",
		"mtime": "2026-09-28T15:29:48.178Z",
		"size": 2870,
		"path": "../public/assets/formSystem-8pPzesjY.js"
	},
	"/assets/framework-delegate-BwNhx9NR-D6gPuYU4.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"531-CRBtDwOtwYoQ2GwcY4AVH0JGS+U\"",
		"mtime": "2026-09-28T15:29:48.180Z",
		"size": 1329,
		"path": "../public/assets/framework-delegate-BwNhx9NR-D6gPuYU4.js"
	},
	"/assets/gesture-controller-B_gJaBk0-CbQXEwjd.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"9c5-/UUFFcu7oiw6zUt89LbvDnqwo4U\"",
		"mtime": "2026-09-28T15:29:48.183Z",
		"size": 2501,
		"path": "../public/assets/gesture-controller-B_gJaBk0-CbQXEwjd.js"
	},
	"/assets/generateCategoricalChart-C7DapRPj.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"57c4c-5/3xS1NrBzkP6oO5/i6xNBbZUCU\"",
		"mtime": "2026-09-28T15:29:48.182Z",
		"size": 359500,
		"path": "../public/assets/generateCategoricalChart-C7DapRPj.js"
	},
	"/assets/git-branch-DzoM3jHq.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"117-iHyHM5bwe2ybkKoyNZwOGEgfDzk\"",
		"mtime": "2026-09-28T15:29:48.184Z",
		"size": 279,
		"path": "../public/assets/git-branch-DzoM3jHq.js"
	},
	"/assets/Giving-CsXZnVFi.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"311d-RXpW1ERpc+R0Tunq9QW7sYtBZHI\"",
		"mtime": "2026-09-28T15:29:47.594Z",
		"size": 12573,
		"path": "../public/assets/Giving-CsXZnVFi.js"
	},
	"/assets/giving-Ds0pdcQ2.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"e93-7wNq6KmAJKEhpFYDYsu3Kmdx4XY\"",
		"mtime": "2026-09-28T15:29:48.206Z",
		"size": 3731,
		"path": "../public/assets/giving-Ds0pdcQ2.js"
	},
	"/assets/export-BI7UXBNB.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"af1fd-aOOHOBtEvuWRP4WDdL5jpN3KmOI\"",
		"mtime": "2026-09-28T15:29:48.175Z",
		"size": 717309,
		"path": "../public/assets/export-BI7UXBNB.js"
	},
	"/assets/GivingCampaign-Ce4Uf41c.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2ac6-b0olH5f2nTL4/sW71hMJjXMssUo\"",
		"mtime": "2026-09-28T15:29:47.595Z",
		"size": 10950,
		"path": "../public/assets/GivingCampaign-Ce4Uf41c.js"
	},
	"/assets/GroupCotisation-BQ0o9Dc3.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3424-eqrlqmeiT1Jc6fNVS800DyH2llY\"",
		"mtime": "2026-09-28T15:29:47.595Z",
		"size": 13348,
		"path": "../public/assets/GroupCotisation-BQ0o9Dc3.js"
	},
	"/assets/GroupDetail-4X_gWPd1.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"57e3-KDe9bHw5pT5mVVYc7GbDeLNulAA\"",
		"mtime": "2026-09-28T15:29:47.603Z",
		"size": 22499,
		"path": "../public/assets/GroupDetail-4X_gWPd1.js"
	},
	"/assets/Groups-BdjdQMFx.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2549-N/A0NM4kC8wmDjsZinHdv3bve3w\"",
		"mtime": "2026-09-28T15:29:47.605Z",
		"size": 9545,
		"path": "../public/assets/Groups-BdjdQMFx.js"
	},
	"/assets/haptic-Cq4UAeka-B7uBOpHn.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3e7-vWwjnmVi+qFizibQ9EBr0WExedo\"",
		"mtime": "2026-09-28T15:29:48.207Z",
		"size": 999,
		"path": "../public/assets/haptic-Cq4UAeka-B7uBOpHn.js"
	},
	"/assets/hardware-back-button-DmkiRgOT-VxX0YU5I.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"46f-XzLDpnugr6BBrXLCW6WSQbSr9e4\"",
		"mtime": "2026-09-28T15:29:48.208Z",
		"size": 1135,
		"path": "../public/assets/hardware-back-button-DmkiRgOT-VxX0YU5I.js"
	},
	"/assets/Help-DXdhEdip.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"b60-VuD/VrYdD+iwN1Ip/+8GMTD1bro\"",
		"mtime": "2026-09-28T15:29:47.606Z",
		"size": 2912,
		"path": "../public/assets/Help-DXdhEdip.js"
	},
	"/assets/helpers-BSmc0nst-B69K-MCH.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"c11-+uZWRi+lLNEKRpLZBjHztHPzZAQ\"",
		"mtime": "2026-09-28T15:29:48.209Z",
		"size": 3089,
		"path": "../public/assets/helpers-BSmc0nst-B69K-MCH.js"
	},
	"/assets/History-D-7V0fXw.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1d32-CXsJHFVuc7/hctHVBX9dB0rAs14\"",
		"mtime": "2026-09-28T15:29:47.607Z",
		"size": 7474,
		"path": "../public/assets/History-D-7V0fXw.js"
	},
	"/assets/IDBBatchAtomicVFS-DOQZPx-g.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"32a2-6ppgZuTXuQvYK+HVWuYHmxtHCa0\"",
		"mtime": "2026-09-28T15:29:50.378Z",
		"size": 12962,
		"path": "../public/assets/IDBBatchAtomicVFS-DOQZPx-g.js"
	},
	"/assets/IDBBatchAtomicVFS-dSPNLjk9.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"32ae-w+HpflI9Zjt2w0hlknFkefjLsUI\"",
		"mtime": "2026-09-28T15:29:47.608Z",
		"size": 12974,
		"path": "../public/assets/IDBBatchAtomicVFS-dSPNLjk9.js"
	},
	"/assets/html2canvas-DCcDvdvP.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"30b50-/NW/tvs1950d+adFAmG+0O5qROc\"",
		"mtime": "2026-09-28T15:29:48.209Z",
		"size": 199504,
		"path": "../public/assets/html2canvas-DCcDvdvP.js"
	},
	"/assets/index-BmLuEdV7-blZcOrwR.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"74-nRrnu19+ovVHFzZKJXONVLoXJSU\"",
		"mtime": "2026-09-28T15:29:48.210Z",
		"size": 116,
		"path": "../public/assets/index-BmLuEdV7-blZcOrwR.js"
	},
	"/assets/index-BvabGprD-c3CEjKNA.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1d4a-sZ6DoqpiV6tY4DUcBp59XPhMMFA\"",
		"mtime": "2026-09-28T15:29:48.211Z",
		"size": 7498,
		"path": "../public/assets/index-BvabGprD-c3CEjKNA.js"
	},
	"/assets/index-C1b9CLFg-BCg8_qFB.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"400-tDsZv7N9bhFMG+lGV9FNetAbeu0\"",
		"mtime": "2026-09-28T15:29:48.212Z",
		"size": 1024,
		"path": "../public/assets/index-C1b9CLFg-BCg8_qFB.js"
	},
	"/assets/index-C23AVPx9-BIfMTubQ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"51af-4icqR3ZhltpJvecEJmUM+EB1EZE\"",
		"mtime": "2026-09-28T15:29:48.212Z",
		"size": 20911,
		"path": "../public/assets/index-C23AVPx9-BIfMTubQ.js"
	},
	"/assets/index-CJln0gS3-DJyvtaPB.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"657-84HT4NgCQoNU6RGKRh+mh2Pcvak\"",
		"mtime": "2026-09-28T15:29:48.213Z",
		"size": 1623,
		"path": "../public/assets/index-CJln0gS3-DJyvtaPB.js"
	},
	"/assets/index-C6Vn9t0d.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"1afc0-eIGwnBgcrmtVCRb8h/8VLtZPXYg\"",
		"mtime": "2026-09-28T15:29:50.230Z",
		"size": 110528,
		"path": "../public/assets/index-C6Vn9t0d.css"
	},
	"/assets/index-DnA_7Bnx-C0IKXXSt.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"121f-n7ctKe78oOm0unipgucq/7kleDE\"",
		"mtime": "2026-09-28T15:29:48.214Z",
		"size": 4639,
		"path": "../public/assets/index-DnA_7Bnx-C0IKXXSt.js"
	},
	"/assets/index-ZjP4CjeZ-1amwGy8P.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5d-dyNVPF/Re2+1wnaWvV660GDqEh8\"",
		"mtime": "2026-09-28T15:29:48.266Z",
		"size": 93,
		"path": "../public/assets/index-ZjP4CjeZ-1amwGy8P.js"
	},
	"/assets/index.es-Cf6FA7y5.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"24f91-VMIGR9g5WNa5AeeOQhQyS3HNgQo\"",
		"mtime": "2026-09-28T15:29:48.267Z",
		"size": 151441,
		"path": "../public/assets/index.es-Cf6FA7y5.js"
	},
	"/assets/info-D0MftANt.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"cc-2sy4c+aBH/3YiUSKNL5Pvhw/Cps\"",
		"mtime": "2026-09-28T15:29:48.268Z",
		"size": 204,
		"path": "../public/assets/info-D0MftANt.js"
	},
	"/assets/input-shims-Dqk-Ou25-DrOc4qXB.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"137c-Qoz8/aXFhrZ4EBdHxO8X7hDG83c\"",
		"mtime": "2026-09-28T15:29:48.272Z",
		"size": 4988,
		"path": "../public/assets/input-shims-Dqk-Ou25-DrOc4qXB.js"
	},
	"/assets/input.utils-rqoH22pW-CxFULy8q.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"10b-zsmXGiAf3rAD6E0g1cU7X/IhDHw\"",
		"mtime": "2026-09-28T15:29:48.272Z",
		"size": 267,
		"path": "../public/assets/input.utils-rqoH22pW-CxFULy8q.js"
	},
	"/assets/index-BAHNZKvo.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"d0f9c-A0eaWtvushKVrw883iUwYishjK4\"",
		"mtime": "2026-09-28T15:29:47.490Z",
		"size": 855964,
		"path": "../public/assets/index-BAHNZKvo.js"
	},
	"/assets/invitation-hDfMxH52.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1a17-nHUAv3WULHq2V8SoTOHTSN1+3fE\"",
		"mtime": "2026-09-28T15:29:48.273Z",
		"size": 6679,
		"path": "../public/assets/invitation-hDfMxH52.js"
	},
	"/assets/InvitationEmit-Bpv9LTPe.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5d1f-T9KJrrPgSWbUz4WkjOp//2q6dr8\"",
		"mtime": "2026-09-28T15:29:47.621Z",
		"size": 23839,
		"path": "../public/assets/InvitationEmit-Bpv9LTPe.js"
	},
	"/assets/InvitationClaim-CccWI7Dy.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"7844e-pRlQSlACDnvnDFUaOKHqV+YKTxI\"",
		"mtime": "2026-09-28T15:29:47.614Z",
		"size": 492622,
		"path": "../public/assets/InvitationClaim-CccWI7Dy.js"
	},
	"/assets/InvitationManage-CCV74tOw.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2779-WKXKDUcKFNWaB9W/EW4xyGvWtOo\"",
		"mtime": "2026-09-28T15:29:47.622Z",
		"size": 10105,
		"path": "../public/assets/InvitationManage-CCV74tOw.js"
	},
	"/assets/ion-accordion_2.entry-PugfFjpT.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2eaa-bPEryLt7QxDAq9PnuLFzMEspoo0\"",
		"mtime": "2026-09-28T15:29:48.274Z",
		"size": 11946,
		"path": "../public/assets/ion-accordion_2.entry-PugfFjpT.js"
	},
	"/assets/ion-action-sheet.entry-Dae317AC.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"7c00-EOVWAQe6cRGKqLbO7KHz8AjbrTQ\"",
		"mtime": "2026-09-28T15:29:48.307Z",
		"size": 31744,
		"path": "../public/assets/ion-action-sheet.entry-Dae317AC.js"
	},
	"/assets/ion-alert.entry-B18IPJpP.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"ae52-sT36PA8h4IIwIiTFmWdCCubME4s\"",
		"mtime": "2026-09-28T15:29:48.313Z",
		"size": 44626,
		"path": "../public/assets/ion-alert.entry-B18IPJpP.js"
	},
	"/assets/ion-app_8.entry-C2MpKOgH.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"aa92-uNm/v/tbdC6ZBzz/DDLitaMX71U\"",
		"mtime": "2026-09-28T15:29:48.314Z",
		"size": 43666,
		"path": "../public/assets/ion-app_8.entry-C2MpKOgH.js"
	},
	"/assets/ion-avatar_3.entry-9luHwKrB.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"dbc-87EaWiKPpXilxK7qlkHsU3aIATQ\"",
		"mtime": "2026-09-28T15:29:48.315Z",
		"size": 3516,
		"path": "../public/assets/ion-avatar_3.entry-9luHwKrB.js"
	},
	"/assets/ion-back-button.entry-Cj4gjg9j.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2d00-50tAQPFr6nzMGfDrxmeVczmkDYA\"",
		"mtime": "2026-09-28T15:29:48.316Z",
		"size": 11520,
		"path": "../public/assets/ion-back-button.entry-Cj4gjg9j.js"
	},
	"/assets/ion-backdrop.entry-CFjtsgjp.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"568-2kzj49UISDjo9e4eV0+OBedoydY\"",
		"mtime": "2026-09-28T15:29:48.317Z",
		"size": 1384,
		"path": "../public/assets/ion-backdrop.entry-CFjtsgjp.js"
	},
	"/assets/ion-breadcrumb_2.entry-DYgipkH0.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"385d-j+8QPRp/dyAkneJlLk8KMxD8T6E\"",
		"mtime": "2026-09-28T15:29:48.317Z",
		"size": 14429,
		"path": "../public/assets/ion-breadcrumb_2.entry-DYgipkH0.js"
	},
	"/assets/ion-button_2.entry-BKxYS2xk.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"6dc7-c3rAVftjfwfp+Z7wCRa4Hc8DPWQ\"",
		"mtime": "2026-09-28T15:29:48.346Z",
		"size": 28103,
		"path": "../public/assets/ion-button_2.entry-BKxYS2xk.js"
	},
	"/assets/ion-card_5.entry-BMXPqgus.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2a9b-ni+YBgxz1XOWtaFzCydH0/MQb3U\"",
		"mtime": "2026-09-28T15:29:48.347Z",
		"size": 10907,
		"path": "../public/assets/ion-card_5.entry-BMXPqgus.js"
	},
	"/assets/ion-checkbox.entry-B35LiaQW.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"471f-V9GCf/NUyEtQH5FEDDY16V6gSbc\"",
		"mtime": "2026-09-28T15:29:48.347Z",
		"size": 18207,
		"path": "../public/assets/ion-checkbox.entry-B35LiaQW.js"
	},
	"/assets/ion-chip.entry-Bss4K8Xv.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"19b5-kh/GXStmLuuOAbXR5lzCTswlHD0\"",
		"mtime": "2026-09-28T15:29:48.348Z",
		"size": 6581,
		"path": "../public/assets/ion-chip.entry-Bss4K8Xv.js"
	},
	"/assets/ion-col_3.entry-CcOKXnYd.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"212a-tOb5QphYM3UScqxTqVVHack+yIc\"",
		"mtime": "2026-09-28T15:29:48.349Z",
		"size": 8490,
		"path": "../public/assets/ion-col_3.entry-CcOKXnYd.js"
	},
	"/assets/ion-datetime-button.entry-DTUP-5xj.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1b30-E88EgoCg9eQCNt96c0sl1uXutXU\"",
		"mtime": "2026-09-28T15:29:48.350Z",
		"size": 6960,
		"path": "../public/assets/ion-datetime-button.entry-DTUP-5xj.js"
	},
	"/assets/ion-datetime.entry-B2aefkNp.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"df03-gyAY5442QDJS2jqlcFBUSZTjf9I\"",
		"mtime": "2026-09-28T15:29:48.378Z",
		"size": 57091,
		"path": "../public/assets/ion-datetime.entry-B2aefkNp.js"
	},
	"/assets/ion-fab_3.entry-9u8Oa93i.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"597f-iQ/75GtwaS9JLrXt1CH0V8mQL+4\"",
		"mtime": "2026-09-28T15:29:48.382Z",
		"size": 22911,
		"path": "../public/assets/ion-fab_3.entry-9u8Oa93i.js"
	},
	"/assets/ion-img.entry-DAxf6Hdg.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"819-1I/mgiIC2/5n03DIqRrs8+zDpU4\"",
		"mtime": "2026-09-28T15:29:48.383Z",
		"size": 2073,
		"path": "../public/assets/ion-img.entry-DAxf6Hdg.js"
	},
	"/assets/ion-infinite-scroll_2.entry-B2YBXhep.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"17f8-DCylPZKwykjDMHduOV5C/wYV7jM\"",
		"mtime": "2026-09-28T15:29:48.383Z",
		"size": 6136,
		"path": "../public/assets/ion-infinite-scroll_2.entry-B2YBXhep.js"
	},
	"/assets/ion-input-otp.entry-Bvayfqjg.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5431-yXRCz81L3Il4RbI6j6rrZNYfCO0\"",
		"mtime": "2026-09-28T15:29:48.384Z",
		"size": 21553,
		"path": "../public/assets/ion-input-otp.entry-Bvayfqjg.js"
	},
	"/assets/ion-input-password-toggle.entry-D64kfvv-.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"c3b-+E6e7UXSm0zy1htyH0sgu8E0wJM\"",
		"mtime": "2026-09-28T15:29:48.385Z",
		"size": 3131,
		"path": "../public/assets/ion-input-password-toggle.entry-D64kfvv-.js"
	},
	"/assets/ion-input.entry-BnquZImi.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"a8ca-XsXLwFNXo+pmjaNOXb47VGVWOmE\"",
		"mtime": "2026-09-28T15:29:48.395Z",
		"size": 43210,
		"path": "../public/assets/ion-input.entry-BnquZImi.js"
	},
	"/assets/ion-item-option_3.entry-Ig9pY5Gx.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"514f-JCfd2lyEm12IaodWmjxZLKs6B9g\"",
		"mtime": "2026-09-28T15:29:48.397Z",
		"size": 20815,
		"path": "../public/assets/ion-item-option_3.entry-Ig9pY5Gx.js"
	},
	"/assets/ion-loading.entry-DYTymRbr.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2469-Aoad5zc83www79vwuoHa0mD7E78\"",
		"mtime": "2026-09-28T15:29:48.399Z",
		"size": 9321,
		"path": "../public/assets/ion-loading.entry-DYTymRbr.js"
	},
	"/assets/ion-item_8.entry-CgGe4aQX.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"deac-pyuIoG9ngaKMVVPj/CuBNO8EFmc\"",
		"mtime": "2026-09-28T15:29:48.398Z",
		"size": 57004,
		"path": "../public/assets/ion-item_8.entry-CgGe4aQX.js"
	},
	"/assets/ion-menu_3.entry-rJSg3OpA.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5f4c-cLEHVljovX6HeGR3WH4C2OBdhHw\"",
		"mtime": "2026-09-28T15:29:48.401Z",
		"size": 24396,
		"path": "../public/assets/ion-menu_3.entry-rJSg3OpA.js"
	},
	"/assets/ion-modal.entry-CdGK-Cwa.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"a78a-RQhxzmofQBIysEsrMY/kgaUALV8\"",
		"mtime": "2026-09-28T15:29:48.402Z",
		"size": 42890,
		"path": "../public/assets/ion-modal.entry-CdGK-Cwa.js"
	},
	"/assets/ion-nav_2.entry-OFOtXZVj.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2ab0-1ccoxLbK2z10a20vj4Hs2dYs48Q\"",
		"mtime": "2026-09-28T15:29:48.403Z",
		"size": 10928,
		"path": "../public/assets/ion-nav_2.entry-OFOtXZVj.js"
	},
	"/assets/ion-picker-column-option.entry-NEaMi3QW.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"995-EcwNEgr0kE4HqRR08oC8Q2SDRmc\"",
		"mtime": "2026-09-28T15:29:48.404Z",
		"size": 2453,
		"path": "../public/assets/ion-picker-column-option.entry-NEaMi3QW.js"
	},
	"/assets/ion-picker-column.entry-PonI8MF4.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2a72-NKEoF6SlEhwfRifTdAwPWqT/WV8\"",
		"mtime": "2026-09-28T15:29:48.404Z",
		"size": 10866,
		"path": "../public/assets/ion-picker-column.entry-PonI8MF4.js"
	},
	"/assets/ion-picker.entry-sIekHGWR.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2713-WXInDTWz1AOoe1XhhAML1eiMoA8\"",
		"mtime": "2026-09-28T15:29:48.405Z",
		"size": 10003,
		"path": "../public/assets/ion-picker.entry-sIekHGWR.js"
	},
	"/assets/ion-popover.entry-CKf2_ZuM.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"62f6-UxdUhCIsrK/gy1tzQ51nHbJ81Es\"",
		"mtime": "2026-09-28T15:29:48.406Z",
		"size": 25334,
		"path": "../public/assets/ion-popover.entry-CKf2_ZuM.js"
	},
	"/assets/ion-progress-bar.entry-Cd4zNJBP.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"49d3-J7rTS9j7KU35yS1mmYA9L8Kuuf0\"",
		"mtime": "2026-09-28T15:29:48.407Z",
		"size": 18899,
		"path": "../public/assets/ion-progress-bar.entry-Cd4zNJBP.js"
	},
	"/assets/ion-radio_2.entry-Br5uWuHE.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4a1e-r/2yrUJFD0mGXUqgft4ON03Og9c\"",
		"mtime": "2026-09-28T15:29:48.864Z",
		"size": 18974,
		"path": "../public/assets/ion-radio_2.entry-Br5uWuHE.js"
	},
	"/assets/ion-range.entry-BL35p4-j.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"7bda-aroC0laUqcCycdSZm+A79y8UIfQ\"",
		"mtime": "2026-09-28T15:29:48.865Z",
		"size": 31706,
		"path": "../public/assets/ion-range.entry-BL35p4-j.js"
	},
	"/assets/ion-refresher_2.entry-DXMB68ce.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"681b-2LRhMh/RgKYBE8AaNwFXT8zx5OM\"",
		"mtime": "2026-09-28T15:29:48.866Z",
		"size": 26651,
		"path": "../public/assets/ion-refresher_2.entry-DXMB68ce.js"
	},
	"/assets/ion-reorder_2.entry-BsBsBXal.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1b21-A4y6l7un6UTiojA1Y3v1NnNgk3s\"",
		"mtime": "2026-09-28T15:29:48.867Z",
		"size": 6945,
		"path": "../public/assets/ion-reorder_2.entry-BsBsBXal.js"
	},
	"/assets/ion-ripple-effect.entry-DTE05YL-.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"c29-xfSnYn3QYgQZKzASKgQGTwevjLk\"",
		"mtime": "2026-09-28T15:29:48.868Z",
		"size": 3113,
		"path": "../public/assets/ion-ripple-effect.entry-DTE05YL-.js"
	},
	"/assets/ion-route_4.entry-DPMGDdD6.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2f2a-N8jDHwJv3360s+X3ducwuqZzKL0\"",
		"mtime": "2026-09-28T15:29:48.869Z",
		"size": 12074,
		"path": "../public/assets/ion-route_4.entry-DPMGDdD6.js"
	},
	"/assets/ion-searchbar.entry-Du9L-hG_.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"628a-Lt4iguDIUCl6/37lb1x0/okfXnM\"",
		"mtime": "2026-09-28T15:29:48.870Z",
		"size": 25226,
		"path": "../public/assets/ion-searchbar.entry-Du9L-hG_.js"
	},
	"/assets/ion-segment-content.entry-Bhp_PEub.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1f6-iTPkMD5b8FRaVwEE57bRlKKMuC0\"",
		"mtime": "2026-09-28T15:29:48.870Z",
		"size": 502,
		"path": "../public/assets/ion-segment-content.entry-Bhp_PEub.js"
	},
	"/assets/ion-segment-view.entry-BdsXlOXP.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"a0f-sr4NCf7HYuOBqvWWG/9eo6VNNoA\"",
		"mtime": "2026-09-28T15:29:48.871Z",
		"size": 2575,
		"path": "../public/assets/ion-segment-view.entry-BdsXlOXP.js"
	},
	"/assets/ion-segment_2.entry-DRVGkj_2.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"7599-hGSF3ttdvksyNeGMDTH0w+ZtNi8\"",
		"mtime": "2026-09-28T15:29:48.872Z",
		"size": 30105,
		"path": "../public/assets/ion-segment_2.entry-DRVGkj_2.js"
	},
	"/assets/ion-select-modal.entry-BvH8d3KK.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3d5d-4Vbh3VFSMpI9JCoTId3b8UIXdw8\"",
		"mtime": "2026-09-28T15:29:48.873Z",
		"size": 15709,
		"path": "../public/assets/ion-select-modal.entry-BvH8d3KK.js"
	},
	"/assets/ion-select_3.entry-CFLMCeqk.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"d518-hRmLL19X0b8ers0E8N4AJdldFqU\"",
		"mtime": "2026-09-28T15:29:48.874Z",
		"size": 54552,
		"path": "../public/assets/ion-select_3.entry-CFLMCeqk.js"
	},
	"/assets/ion-spinner.entry-Ch3SWlyQ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"165a-VAAJpOjAO+IZLQq3NFUE763/6K0\"",
		"mtime": "2026-09-28T15:29:48.874Z",
		"size": 5722,
		"path": "../public/assets/ion-spinner.entry-Ch3SWlyQ.js"
	},
	"/assets/ion-split-pane.entry-fPL6Z6R4.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"c97-Plnj0VGDSuZ0Oc79Kgzh1dWic4Y\"",
		"mtime": "2026-09-28T15:29:48.875Z",
		"size": 3223,
		"path": "../public/assets/ion-split-pane.entry-fPL6Z6R4.js"
	},
	"/assets/ion-tab-bar_2.entry-XGwN0VlV.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"482d-m3+u4RFAtA6BOpQiwqSQTtPFlc4\"",
		"mtime": "2026-09-28T15:29:48.876Z",
		"size": 18477,
		"path": "../public/assets/ion-tab-bar_2.entry-XGwN0VlV.js"
	},
	"/assets/ion-tab_2.entry-BCHlb5H6.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1058-+q3vWDNMFXpCofL6CuIfbXwN2zI\"",
		"mtime": "2026-09-28T15:29:48.876Z",
		"size": 4184,
		"path": "../public/assets/ion-tab_2.entry-BCHlb5H6.js"
	},
	"/assets/ion-text.entry-BEV0DCZn.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1d4-pRAb2IMfJJ0gr0WYDk0cCjq9Y70\"",
		"mtime": "2026-09-28T15:29:48.877Z",
		"size": 468,
		"path": "../public/assets/ion-text.entry-BEV0DCZn.js"
	},
	"/assets/ion-textarea.entry-cbc7TUnq.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"b592-kp30N1Ya2NFIlHAR3Q8eEJwz47g\"",
		"mtime": "2026-09-28T15:29:48.878Z",
		"size": 46482,
		"path": "../public/assets/ion-textarea.entry-cbc7TUnq.js"
	},
	"/assets/ion-toast.entry-B9K2TRGb.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4b00-ElogpGhAoUq6FETU6g5FeTmtDcE\"",
		"mtime": "2026-09-28T15:29:48.879Z",
		"size": 19200,
		"path": "../public/assets/ion-toast.entry-B9K2TRGb.js"
	},
	"/assets/ion-toggle.entry-CcvKrld-.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"6545-bsEEC24a0qpCnd2JMwUCe+rXKc0\"",
		"mtime": "2026-09-28T15:29:48.880Z",
		"size": 25925,
		"path": "../public/assets/ion-toggle.entry-CcvKrld-.js"
	},
	"/assets/ionic-global-ZXjCXKH0-C3Vs9CEN.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"538-PrJG650/5iUA0pgnhnFn5TixhL8\"",
		"mtime": "2026-09-28T15:29:48.880Z",
		"size": 1336,
		"path": "../public/assets/ionic-global-ZXjCXKH0-C3Vs9CEN.js"
	},
	"/assets/ios.transition-CWAgfQ1r-B9vFb_HU.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5e-Z1DHvzrEixiPVRsqERG5cNAVtKg\"",
		"mtime": "2026-09-28T15:29:48.881Z",
		"size": 94,
		"path": "../public/assets/ios.transition-CWAgfQ1r-B9vFb_HU.js"
	},
	"/assets/item-multiple-inputs-DZnIiOO_-VzF2NXFA.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"159-GOoKHpDw0F9ZKuVzVaAcAn2AycQ\"",
		"mtime": "2026-09-28T15:29:48.882Z",
		"size": 345,
		"path": "../public/assets/item-multiple-inputs-DZnIiOO_-VzF2NXFA.js"
	},
	"/assets/key-round-CNvhcEGa.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"162-YXkodbrTZr6Jaf3vd4AM19vyPiU\"",
		"mtime": "2026-09-28T15:29:48.882Z",
		"size": 354,
		"path": "../public/assets/key-round-CNvhcEGa.js"
	},
	"/assets/keyboard-Cj8mLJeq-Jf7hHjeq.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3c8-WoQrWoYegt8vHd1oI8KhM0m6ih0\"",
		"mtime": "2026-09-28T15:29:48.883Z",
		"size": 968,
		"path": "../public/assets/keyboard-Cj8mLJeq-Jf7hHjeq.js"
	},
	"/assets/keyboard-controller-DEwoa1ev-i7kMiwCa.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"353-ndqMewyfds+Mq0t4F3lrOeMyDgs\"",
		"mtime": "2026-09-28T15:29:48.884Z",
		"size": 851,
		"path": "../public/assets/keyboard-controller-DEwoa1ev-i7kMiwCa.js"
	},
	"/assets/keyboard-DAF8GNJ9-tZybG6rL.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1f1-maTr1WibMtNc7+dOdvGP3HgyRII\"",
		"mtime": "2026-09-28T15:29:48.883Z",
		"size": 497,
		"path": "../public/assets/keyboard-DAF8GNJ9-tZybG6rL.js"
	},
	"/assets/landmark-t050F9Jb.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"197-d5hREwAAoISoQVDiqW5OSfgCI8c\"",
		"mtime": "2026-09-28T15:29:48.885Z",
		"size": 407,
		"path": "../public/assets/landmark-t050F9Jb.js"
	},
	"/assets/layers-CdM4UKgT.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"16c-HFxcHLGCfhKmUr7yluz6qe2zq/Q\"",
		"mtime": "2026-09-28T15:29:48.886Z",
		"size": 364,
		"path": "../public/assets/layers-CdM4UKgT.js"
	},
	"/assets/lock-controller-B-hirT0v-CmtnvSkS.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"76-Ku4PrT+43+CMY2JVqb+ZIHH8HUI\"",
		"mtime": "2026-09-28T15:29:48.886Z",
		"size": 118,
		"path": "../public/assets/lock-controller-B-hirT0v-CmtnvSkS.js"
	},
	"/assets/logo.png": {
		"type": "image/png",
		"etag": "\"c2ce-Xrm5OeE6Rcs4GqYh+OFZRZQyAYE\"",
		"mtime": "2026-09-02T09:03:42.946Z",
		"size": 49870,
		"path": "../public/assets/logo.png"
	},
	"/assets/logo-lumina.png": {
		"type": "image/png",
		"etag": "\"c2ce-Xrm5OeE6Rcs4GqYh+OFZRZQyAYE\"",
		"mtime": "2026-09-03T16:41:02.881Z",
		"size": 49870,
		"path": "../public/assets/logo-lumina.png"
	},
	"/assets/mc-wa-sqlite-async-OK58TZB1.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f9c7-OWgn/LbVfd6oIzizW/33tbyE9i4\"",
		"mtime": "2026-09-28T15:29:48.888Z",
		"size": 63943,
		"path": "../public/assets/mc-wa-sqlite-async-OK58TZB1.js"
	},
	"/assets/mc-wa-sqlite-Dt2CfptV.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"eb0e-ka1IvJlVUyt14/GJnJnIXiNK/CY\"",
		"mtime": "2026-09-28T15:29:48.887Z",
		"size": 60174,
		"path": "../public/assets/mc-wa-sqlite-Dt2CfptV.js"
	},
	"/assets/md.transition-ZuqDDdDW-C3KVDY3B.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4a-gkfQJnjibH4S3rse5r9qz9t8heo\"",
		"mtime": "2026-09-28T15:29:48.888Z",
		"size": 74,
		"path": "../public/assets/md.transition-ZuqDDdDW-C3KVDY3B.js"
	},
	"/assets/Members-DqrC7njT.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1e49-NnC+3avr3J7Fp/JZBR2gXLMZumk\"",
		"mtime": "2026-09-28T15:29:47.623Z",
		"size": 7753,
		"path": "../public/assets/Members-DqrC7njT.js"
	},
	"/assets/MembreDetail-Bz655L4Y.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2154-dt6foM6DyxBWtevDJpH8lZYz5y4\"",
		"mtime": "2026-09-28T15:29:47.624Z",
		"size": 8532,
		"path": "../public/assets/MembreDetail-Bz655L4Y.js"
	},
	"/assets/MembresEnAvance-DpsWpGNC.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"d69-3xBVkohByYDb34gMEheltungBdE\"",
		"mtime": "2026-09-28T15:29:47.625Z",
		"size": 3433,
		"path": "../public/assets/MembresEnAvance-DpsWpGNC.js"
	},
	"/assets/mc-wa-sqlite-DoDpgFfE.wasm": {
		"type": "application/wasm",
		"etag": "\"1405ab-mYFvsN3agcsYu7kHk/nCjgNgqQ8\"",
		"mtime": "2026-09-28T15:29:50.349Z",
		"size": 1312171,
		"path": "../public/assets/mc-wa-sqlite-DoDpgFfE.wasm"
	},
	"/assets/MemoryVFS-DQF4WRTC.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"61c-i2gYtp7yBd03f77k1kJ2TRrrTSQ\"",
		"mtime": "2026-09-28T15:29:50.379Z",
		"size": 1564,
		"path": "../public/assets/MemoryVFS-DQF4WRTC.js"
	},
	"/assets/MemoryVFS-DwnxWc2S.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"61c-ec2AxFtpPBUP0e50TrYYbGJM2dw\"",
		"mtime": "2026-09-28T15:29:47.627Z",
		"size": 1564,
		"path": "../public/assets/MemoryVFS-DwnxWc2S.js"
	},
	"/assets/NotFound-BTqg1Hzd.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"356-c3Zn/l5//XMy/pQ0TJ0nnaj2FF8\"",
		"mtime": "2026-09-28T15:29:47.628Z",
		"size": 854,
		"path": "../public/assets/NotFound-BTqg1Hzd.js"
	},
	"/assets/Notifications-CeYixOD3.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"17f9-Ai7H1D8H3EvtJbj7UphSoqgWfyk\"",
		"mtime": "2026-09-28T15:29:47.630Z",
		"size": 6137,
		"path": "../public/assets/Notifications-CeYixOD3.js"
	},
	"/assets/Onboarding-HzIKg4ad.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"55c3-BATLudOOF37TnGUSf4qSkcjKxsM\"",
		"mtime": "2026-09-28T15:29:47.641Z",
		"size": 21955,
		"path": "../public/assets/Onboarding-HzIKg4ad.js"
	},
	"/assets/OPFSCoopSyncVFS-DATtbZFi.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1dde-35NXNSgW4WGGg2Jx/DvLz8pj/JQ\"",
		"mtime": "2026-09-28T15:29:50.380Z",
		"size": 7646,
		"path": "../public/assets/OPFSCoopSyncVFS-DATtbZFi.js"
	},
	"/assets/OPFSCoopSyncVFS-URRhNWpM.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1dea-AkY+3dgNbVhVqVJPTUufZ3AOm9M\"",
		"mtime": "2026-09-28T15:29:47.631Z",
		"size": 7658,
		"path": "../public/assets/OPFSCoopSyncVFS-URRhNWpM.js"
	},
	"/assets/OPFSWriteAheadVFS-CZT-0TSU.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5cf9-AhRR6dU3f8riad8MRfxcaujM1PU\"",
		"mtime": "2026-09-28T15:29:47.639Z",
		"size": 23801,
		"path": "../public/assets/OPFSWriteAheadVFS-CZT-0TSU.js"
	},
	"/assets/OPFSWriteAheadVFS-Dceb9ZfN.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5cf2-6VWvwZq/3kDJah89Fj0JQlYKJAI\"",
		"mtime": "2026-09-28T15:29:50.382Z",
		"size": 23794,
		"path": "../public/assets/OPFSWriteAheadVFS-Dceb9ZfN.js"
	},
	"/assets/OrgSetup-h4ye1vBF.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"257b-JoZTMvgaRG1XOk07M6lL+jT2XSg\"",
		"mtime": "2026-09-28T15:29:47.641Z",
		"size": 9595,
		"path": "../public/assets/OrgSetup-h4ye1vBF.js"
	},
	"/assets/OrgUnits-BS2YGFcF.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"207a-BEsgtifW42XpWDrbypyBA+s3GxA\"",
		"mtime": "2026-09-28T15:29:47.643Z",
		"size": 8314,
		"path": "../public/assets/OrgUnits-BS2YGFcF.js"
	},
	"/assets/overlay-control-label-BSQPZ79H-CB4fpbjE.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"99-8YuEb/H1h4EQkjJCS4q+RnG6CXs\"",
		"mtime": "2026-09-28T15:29:48.889Z",
		"size": 153,
		"path": "../public/assets/overlay-control-label-BSQPZ79H-CB4fpbjE.js"
	},
	"/assets/p-1sJ0ZDPe-YkMm5iKi.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"8ed2-6KdNiR6CHzWsfcskhcqF/kG5SYg\"",
		"mtime": "2026-09-28T15:29:48.890Z",
		"size": 36562,
		"path": "../public/assets/p-1sJ0ZDPe-YkMm5iKi.js"
	},
	"/assets/p-5ldEpNdG-DgR-mJeR.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2771-m0sPvpHPLlSA5XcUQ0/qZJ56ncI\"",
		"mtime": "2026-09-28T15:29:48.890Z",
		"size": 10097,
		"path": "../public/assets/p-5ldEpNdG-DgR-mJeR.js"
	},
	"/assets/p-BMPN55of-C0P_qWS_.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"21a-HGYAvd2qgF1iEwCzq6eCRzodk80\"",
		"mtime": "2026-09-28T15:29:48.891Z",
		"size": 538,
		"path": "../public/assets/p-BMPN55of-C0P_qWS_.js"
	},
	"/assets/p-BmVRXR1y-Qf1gG5of.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3e6-cIzBL2cgY/c+Nd+w1vUUDnL3YhY\"",
		"mtime": "2026-09-28T15:29:48.894Z",
		"size": 998,
		"path": "../public/assets/p-BmVRXR1y-Qf1gG5of.js"
	},
	"/assets/p-BQyuFxYc-BP5sUz4F.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"624-sKMq1g03/KlKcB/qZDlMk1Tk0Qk\"",
		"mtime": "2026-09-28T15:29:48.892Z",
		"size": 1572,
		"path": "../public/assets/p-BQyuFxYc-BP5sUz4F.js"
	},
	"/assets/p-BT9-hMMz-DeoKjx0N.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1ee-rguGWc7rPK2wzL0Vb/AugNuA+fM\"",
		"mtime": "2026-09-28T15:29:48.892Z",
		"size": 494,
		"path": "../public/assets/p-BT9-hMMz-DeoKjx0N.js"
	},
	"/assets/p-BWoa-cki-UpDL1J1V.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"469-MAKOTmbsqUpzRy0RZ0/MkYlxxqE\"",
		"mtime": "2026-09-28T15:29:48.893Z",
		"size": 1129,
		"path": "../public/assets/p-BWoa-cki-UpDL1J1V.js"
	},
	"/assets/p-C-NbvXu4-B9XCdoFH.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"127b-nP1/e4Mh7JXhis9RI1WSxH7S81E\"",
		"mtime": "2026-09-28T15:29:48.895Z",
		"size": 4731,
		"path": "../public/assets/p-C-NbvXu4-B9XCdoFH.js"
	},
	"/assets/p-C09TXohi-BME7HMRv.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"c7c-eBlQFVuVp95kjyeMXHxMBBybRJM\"",
		"mtime": "2026-09-28T15:29:48.895Z",
		"size": 3196,
		"path": "../public/assets/p-C09TXohi-BME7HMRv.js"
	},
	"/assets/p-C4VpVfrJ-BpT4zfNJ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2441-Xl82wdl1/wiymuGS5Mpz5EhlAsM\"",
		"mtime": "2026-09-28T15:29:48.896Z",
		"size": 9281,
		"path": "../public/assets/p-C4VpVfrJ-BpT4zfNJ.js"
	},
	"/assets/mc-wa-sqlite-async-DYagSq56.wasm": {
		"type": "application/wasm",
		"etag": "\"263900-YXiey/3Hhr2OVYDVjdLpGtiNQfI\"",
		"mtime": "2026-09-28T15:29:50.362Z",
		"size": 2504960,
		"path": "../public/assets/mc-wa-sqlite-async-DYagSq56.wasm"
	},
	"/assets/p-CG_zZq_I-Ccy2JI6K.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3ae-+eeLDPtTA9gvmJW79weesVAZv1A\"",
		"mtime": "2026-09-28T15:29:49.362Z",
		"size": 942,
		"path": "../public/assets/p-CG_zZq_I-Ccy2JI6K.js"
	},
	"/assets/p-CWuIRJQN-CpJ4cxhA.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"26e-fZxIO0/B5h4LVezuzSyQ2tIfW08\"",
		"mtime": "2026-09-28T15:29:49.363Z",
		"size": 622,
		"path": "../public/assets/p-CWuIRJQN-CpJ4cxhA.js"
	},
	"/assets/p-D0YpjgON-DuPvRicD.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"15f9-l2t1qtt076m1Azprcw7kb/Qo+DQ\"",
		"mtime": "2026-09-28T15:29:49.364Z",
		"size": 5625,
		"path": "../public/assets/p-D0YpjgON-DuPvRicD.js"
	},
	"/assets/p-D7-vHX0A-M28BuEVW.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4ac-++v6wgkqI6DQPAYjpbKuefeV/jU\"",
		"mtime": "2026-09-28T15:29:49.365Z",
		"size": 1196,
		"path": "../public/assets/p-D7-vHX0A-M28BuEVW.js"
	},
	"/assets/p-qAXsfUff-UrBZGjF-.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"403-VFqIV1qmCBL/QnR1Ulrs6NA9M2s\"",
		"mtime": "2026-09-28T15:29:49.366Z",
		"size": 1027,
		"path": "../public/assets/p-qAXsfUff-UrBZGjF-.js"
	},
	"/assets/p-ZjP4CjeZ-DJ1DGIsW.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"62-xIml61NROF4B1cx8XnHtA30tV1Q\"",
		"mtime": "2026-09-28T15:29:49.365Z",
		"size": 98,
		"path": "../public/assets/p-ZjP4CjeZ-DJ1DGIsW.js"
	},
	"/assets/PageSkeletons-b8YO65Ze.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"188a-Dw9I+lW9SWwMmHyUZgn3GnMxyzI\"",
		"mtime": "2026-09-28T15:29:47.644Z",
		"size": 6282,
		"path": "../public/assets/PageSkeletons-b8YO65Ze.js"
	},
	"/assets/pen-line-BS0t1-C1.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"115-+uy3Gn8AUr+5N2yLSIZ4hRqCEj0\"",
		"mtime": "2026-09-28T15:29:49.367Z",
		"size": 277,
		"path": "../public/assets/pen-line-BS0t1-C1.js"
	},
	"/assets/PieChart-Ba_CdHyZ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"64e8-Il5J90cWVfmpxObzCAUJsrHhbyU\"",
		"mtime": "2026-09-28T15:29:47.645Z",
		"size": 25832,
		"path": "../public/assets/PieChart-Ba_CdHyZ.js"
	},
	"/assets/play-BtF2xK2z.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"86-3eI99EzKswz7PLwJNXDLG0axDvc\"",
		"mtime": "2026-09-28T15:29:49.368Z",
		"size": 134,
		"path": "../public/assets/play-BtF2xK2z.js"
	},
	"/assets/policy-XNz5LSo9.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5a9-hizKTxOfa4QR+NF/ZOE83p5lLf8\"",
		"mtime": "2026-09-28T15:29:49.368Z",
		"size": 1449,
		"path": "../public/assets/policy-XNz5LSo9.js"
	},
	"/assets/preload-helper-Czpn1I53.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4ac-sE+5KsaRXTMfwOfrOATQajMSGV4\"",
		"mtime": "2026-09-28T15:29:49.369Z",
		"size": 1196,
		"path": "../public/assets/preload-helper-Czpn1I53.js"
	},
	"/assets/purify.es-ChwZkWde.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"68bc-bPPRDEosU/Lqj+2Oyi1ue22LViM\"",
		"mtime": "2026-09-28T15:29:49.370Z",
		"size": 26812,
		"path": "../public/assets/purify.es-ChwZkWde.js"
	},
	"/assets/puzzle-DMX56EtM.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"23b-Qc/e/wnBckLBwstaWcCJrlFqNYs\"",
		"mtime": "2026-09-28T15:29:49.371Z",
		"size": 571,
		"path": "../public/assets/puzzle-DMX56EtM.js"
	},
	"/assets/rbac-Dv0vqpzW.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"d8c-RLh7QVu9rH01empMjsX/QDaf3zw\"",
		"mtime": "2026-09-28T15:29:49.372Z",
		"size": 3468,
		"path": "../public/assets/rbac-Dv0vqpzW.js"
	},
	"/assets/receipt--OrhH021.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"124-VIPIv1fulIxQC8qbL7U7zt4zWBU\"",
		"mtime": "2026-09-28T15:29:49.373Z",
		"size": 292,
		"path": "../public/assets/receipt--OrhH021.js"
	},
	"/assets/refresh-cw-BI8_4WoK.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"140-hzCIh5cJd+kUZgY2X6lZC9cWqbo\"",
		"mtime": "2026-09-28T15:29:49.373Z",
		"size": 320,
		"path": "../public/assets/refresh-cw-BI8_4WoK.js"
	},
	"/assets/ReportBuilder-BdwsFPjQ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"49e0-6JZlwrC7xf+3nUNQkGzCvpZcp+M\"",
		"mtime": "2026-09-28T15:29:47.647Z",
		"size": 18912,
		"path": "../public/assets/ReportBuilder-BdwsFPjQ.js"
	},
	"/assets/reporting-BmJIlXHF.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2395-qHxvVe7bj1W/LHZaBbiukS7gM5g\"",
		"mtime": "2026-09-28T15:29:49.374Z",
		"size": 9109,
		"path": "../public/assets/reporting-BmJIlXHF.js"
	},
	"/assets/Reports-ClOeYFjG.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4470-5MXL3xHwk/OA1ovMyFM0d5FvtKU\"",
		"mtime": "2026-09-28T15:29:47.648Z",
		"size": 17520,
		"path": "../public/assets/Reports-ClOeYFjG.js"
	},
	"/assets/resource-Dg-SOCFW.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"a01-/zYv6MhvARQsa0UJdb1GPIhywaU\"",
		"mtime": "2026-09-28T15:29:49.375Z",
		"size": 2561,
		"path": "../public/assets/resource-Dg-SOCFW.js"
	},
	"/assets/rolldown-runtime-hePW80VL.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2cc-fA8td6k29UVF6JoPfhOPkceTK1M\"",
		"mtime": "2026-09-28T15:29:49.376Z",
		"size": 716,
		"path": "../public/assets/rolldown-runtime-hePW80VL.js"
	},
	"/assets/SaisieRapide-BIhsnrjP.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1229-fq7FiyC44Iqwx/M2MCZXkuMZ4vM\"",
		"mtime": "2026-09-28T15:29:47.649Z",
		"size": 4649,
		"path": "../public/assets/SaisieRapide-BIhsnrjP.js"
	},
	"/assets/security-CTI8Yrlf.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"230-lS3vVYFV3iv5bN0JqQnykqdSvck\"",
		"mtime": "2026-09-28T15:29:49.377Z",
		"size": 560,
		"path": "../public/assets/security-CTI8Yrlf.js"
	},
	"/assets/select-option-render-CRP_teb1-CtykP1Zz.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"478-aPb1wPUm/OrqoEJmB5AozmEDV94\"",
		"mtime": "2026-09-28T15:29:49.377Z",
		"size": 1144,
		"path": "../public/assets/select-option-render-CRP_teb1-CtykP1Zz.js"
	},
	"/assets/Settings-CYBYn29a.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"ece-xsDwGf5QCq50cbGIs06LpKqHt5M\"",
		"mtime": "2026-09-28T15:29:47.658Z",
		"size": 3790,
		"path": "../public/assets/Settings-CYBYn29a.js"
	},
	"/assets/SettingsAbout-DP1IeUYH.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"e6c-6GfdPlAHcYNHxIF3dJi6jPF1Cbk\"",
		"mtime": "2026-09-28T15:29:47.659Z",
		"size": 3692,
		"path": "../public/assets/SettingsAbout-DP1IeUYH.js"
	},
	"/assets/SettingsFeatures-CFVnEy2t.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"15af-2QJndRfQvbfjJwipVBASqV6rSRE\"",
		"mtime": "2026-09-28T15:29:47.660Z",
		"size": 5551,
		"path": "../public/assets/SettingsFeatures-CFVnEy2t.js"
	},
	"/assets/SettingsGestion-cw9ZCujF.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"143b-tkDBeu93hKchn9d6OlnzENDdacw\"",
		"mtime": "2026-09-28T15:29:47.661Z",
		"size": 5179,
		"path": "../public/assets/SettingsGestion-cw9ZCujF.js"
	},
	"/assets/SettingsNotifications-Do8uutKK.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1356-ItcD603o1eliMQ5VbrgmDIrOxE4\"",
		"mtime": "2026-09-28T15:29:47.662Z",
		"size": 4950,
		"path": "../public/assets/SettingsNotifications-Do8uutKK.js"
	},
	"/assets/SettingsProfile-Cudx4fQ_.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"227a-2L/gt/yEagzSO0ly3PeycfMqiVk\"",
		"mtime": "2026-09-28T15:29:47.665Z",
		"size": 8826,
		"path": "../public/assets/SettingsProfile-Cudx4fQ_.js"
	},
	"/assets/SettingsPersonalisation-C0f78fLr.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f72-FqAN0fDPlM2W9w8cRQ4/NUVwkdQ\"",
		"mtime": "2026-09-28T15:29:47.663Z",
		"size": 3954,
		"path": "../public/assets/SettingsPersonalisation-C0f78fLr.js"
	},
	"/assets/SettingsShell-B6PMnH3j.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"458-R7LJH9FaRoglW28W+b4CT01cOXk\"",
		"mtime": "2026-09-28T15:29:47.665Z",
		"size": 1112,
		"path": "../public/assets/SettingsShell-B6PMnH3j.js"
	},
	"/assets/SettingsTheme-CvHVwIJX.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"cec-Z0+VDpCeH13w4a7NxEyPIQlrD9c\"",
		"mtime": "2026-09-28T15:29:47.670Z",
		"size": 3308,
		"path": "../public/assets/SettingsTheme-CvHVwIJX.js"
	},
	"/assets/shield-DpgaC2al.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"110-3MSGiCPaOQgTl7sgS5ylf+kQZKc\"",
		"mtime": "2026-09-28T15:29:49.378Z",
		"size": 272,
		"path": "../public/assets/shield-DpgaC2al.js"
	},
	"/assets/Shimmer-Co4xopbC.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"75c-jkQoHVvKk8OP5SwgJl9y8gUILLw\"",
		"mtime": "2026-09-28T15:29:47.671Z",
		"size": 1884,
		"path": "../public/assets/Shimmer-Co4xopbC.js"
	},
	"/assets/slot-mutation-controller-B5NpUZ-N-DbdIwmDP.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"849-H3Q+0IhTjw7R4eE1vHV8sX03XxM\"",
		"mtime": "2026-09-28T15:29:49.379Z",
		"size": 2121,
		"path": "../public/assets/slot-mutation-controller-B5NpUZ-N-DbdIwmDP.js"
	},
	"/assets/sparkles-JSrImff4.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1fc-Dy6HTjAVajOdqQUACDXwvBe2jsU\"",
		"mtime": "2026-09-28T15:29:49.380Z",
		"size": 508,
		"path": "../public/assets/sparkles-JSrImff4.js"
	},
	"/assets/spinner-configs-D4RIp70E-DYU7fzEY.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4fc-eUiabxm9f/Pbh4P2PLv5X9vSnjA\"",
		"mtime": "2026-09-28T15:29:49.380Z",
		"size": 1276,
		"path": "../public/assets/spinner-configs-D4RIp70E-DYU7fzEY.js"
	},
	"/assets/status-tap-Cv9gb3ja-CknkkTFV.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1fa-d5QGVFQnD8dCE11+5sGmp/eNrkU\"",
		"mtime": "2026-09-28T15:29:49.381Z",
		"size": 506,
		"path": "../public/assets/status-tap-Cv9gb3ja-CknkkTFV.js"
	},
	"/assets/storageService-h41j0Haf.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"345-j9UNZxzEFTX3SN0kH15nT/1eQXc\"",
		"mtime": "2026-09-28T15:29:49.382Z",
		"size": 837,
		"path": "../public/assets/storageService-h41j0Haf.js"
	},
	"/assets/swipe-back-B2CmabKY-DeOFlpgQ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2f5-KsL4HNArySsj6+i9mA8S7gs5d6k\"",
		"mtime": "2026-09-28T15:29:49.383Z",
		"size": 757,
		"path": "../public/assets/swipe-back-B2CmabKY-DeOFlpgQ.js"
	},
	"/assets/tag-CPbeIki_.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"146-j2pFQuDSOW6rCL+z8Zf6YUzRnNE\"",
		"mtime": "2026-09-28T15:29:49.383Z",
		"size": 326,
		"path": "../public/assets/tag-CPbeIki_.js"
	},
	"/assets/target-wUd5rPt3.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"e2-qhgjzO4t+I6ba4eiVpVfWqFaAvA\"",
		"mtime": "2026-09-28T15:29:49.384Z",
		"size": 226,
		"path": "../public/assets/target-wUd5rPt3.js"
	},
	"/assets/theme-byZM6qHV-BGgJqR8j.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1e6-livzxuqIfY/oEL/kASm3W9BaTns\"",
		"mtime": "2026-09-28T15:29:49.385Z",
		"size": 486,
		"path": "../public/assets/theme-byZM6qHV-BGgJqR8j.js"
	},
	"/assets/ThemePicker-CBUREnaT.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4a4-d3GD/OWHT6HSbvSn3gx5vOAheVU\"",
		"mtime": "2026-09-28T15:29:47.673Z",
		"size": 1188,
		"path": "../public/assets/ThemePicker-CBUREnaT.js"
	},
	"/assets/Trace-erKASkD3.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"eeb-BXp+CpJdv6NdB2+RnMGANUDN3pk\"",
		"mtime": "2026-09-28T15:29:47.674Z",
		"size": 3819,
		"path": "../public/assets/Trace-erKASkD3.js"
	},
	"/assets/TransactionCard-BENnrkAB.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"b14-1DAVmqN/upnvZOvac8/4p864jgc\"",
		"mtime": "2026-09-28T15:29:47.675Z",
		"size": 2836,
		"path": "../public/assets/TransactionCard-BENnrkAB.js"
	},
	"/assets/TransactionDetail-_zwOv16_.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"36f1-DUubQ9xcuupMfrn90xHgBMBLnKw\"",
		"mtime": "2026-09-28T15:29:47.676Z",
		"size": 14065,
		"path": "../public/assets/TransactionDetail-_zwOv16_.js"
	},
	"/assets/TransactionEdit-D_e-BBmY.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1c2a-GVUrlBxovVCgW2sU7VnOgoNXSuI\"",
		"mtime": "2026-09-28T15:29:47.680Z",
		"size": 7210,
		"path": "../public/assets/TransactionEdit-D_e-BBmY.js"
	},
	"/assets/TransactionNew-CkkRWbKq.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2c1a-0FKAO/ylt1tDejoBAJBw/iDE+RU\"",
		"mtime": "2026-09-28T15:29:47.681Z",
		"size": 11290,
		"path": "../public/assets/TransactionNew-CkkRWbKq.js"
	},
	"/assets/TransactionNewGroup-BGmBcHus.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"190a-Gqz/fF4n8gkphBZJCdLXNkiB2Us\"",
		"mtime": "2026-09-28T15:29:47.684Z",
		"size": 6410,
		"path": "../public/assets/TransactionNewGroup-BGmBcHus.js"
	},
	"/assets/trending-down-EKWfj_y1.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"cf-/+nXvq96l8PSDm7VJipddOid1PE\"",
		"mtime": "2026-09-28T15:29:49.386Z",
		"size": 207,
		"path": "../public/assets/trending-down-EKWfj_y1.js"
	},
	"/assets/trending-up-BXqWdo-H.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"cc-nKO2xyKjEgbtLZbDcUf5vssV/Lg\"",
		"mtime": "2026-09-28T15:29:49.387Z",
		"size": 204,
		"path": "../public/assets/trending-up-BXqWdo-H.js"
	},
	"/assets/Tutorial-DKRBGKJc.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"d415-WVallDQgknGCOBIKepexjIZtnZ4\"",
		"mtime": "2026-09-28T15:29:47.702Z",
		"size": 54293,
		"path": "../public/assets/Tutorial-DKRBGKJc.js"
	},
	"/assets/useCanAccessMulti-CDVjStxC.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"423-9AwEqEt9imEWKTTc7/ueWQfjqQA\"",
		"mtime": "2026-09-28T15:29:49.388Z",
		"size": 1059,
		"path": "../public/assets/useCanAccessMulti-CDVjStxC.js"
	},
	"/assets/useFocusTrap-Bhm5tlEr.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"349-5ZGkjCIO0rx80KfuKIw7CM/f0J4\"",
		"mtime": "2026-09-28T15:29:49.388Z",
		"size": 841,
		"path": "../public/assets/useFocusTrap-Bhm5tlEr.js"
	},
	"/assets/user-minus-Je6bajk2.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"ff-mhLXyeWgnd0Vv8XpQeVBxotviNM\"",
		"mtime": "2026-09-28T15:29:49.389Z",
		"size": 255,
		"path": "../public/assets/user-minus-Je6bajk2.js"
	},
	"/assets/user-plus-C3Pe-Tzc.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"135-HYXzrhDYBQhx56PTPDwgIiV1rEU\"",
		"mtime": "2026-09-28T15:29:49.390Z",
		"size": 309,
		"path": "../public/assets/user-plus-C3Pe-Tzc.js"
	},
	"/assets/validity-DJztqcrH-BIvdPTz4.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"76-6+JZTo757Wvs8XP0gQSrvkZ2jgQ\"",
		"mtime": "2026-09-28T15:29:49.391Z",
		"size": 118,
		"path": "../public/assets/validity-DJztqcrH-BIvdPTz4.js"
	},
	"/assets/value-8xOwwyZS.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"240f-/DipoiEUn8kF+0SHdlPBgNNu6Tk\"",
		"mtime": "2026-09-28T15:29:49.391Z",
		"size": 9231,
		"path": "../public/assets/value-8xOwwyZS.js"
	},
	"/assets/Versement-dMd6blDE.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"19c9-kgqaQEbWtnkEOScIMEuctx+ypko\"",
		"mtime": "2026-09-28T15:29:47.978Z",
		"size": 6601,
		"path": "../public/assets/Versement-dMd6blDE.js"
	},
	"/assets/wa-sqlite-async-L_LSrxrb.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f88f-NGMPNASgtNbzZuH6O9+kt/v29/g\"",
		"mtime": "2026-09-28T15:29:49.393Z",
		"size": 63631,
		"path": "../public/assets/wa-sqlite-async-L_LSrxrb.js"
	},
	"/assets/wa-sqlite-BVXfj7bw.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"e9d6-LFag0v/Myx+4L9KqMw5YED3uQZQ\"",
		"mtime": "2026-09-28T15:29:49.392Z",
		"size": 59862,
		"path": "../public/assets/wa-sqlite-BVXfj7bw.js"
	},
	"/assets/watch-options-Dtdm8lKC-Dcco02w4.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"19c-1njbP6xOWI8QLoQHsWSYLxGyoGk\"",
		"mtime": "2026-09-28T15:29:49.394Z",
		"size": 412,
		"path": "../public/assets/watch-options-Dtdm8lKC-Dcco02w4.js"
	},
	"/assets/web-DeqBZkWZ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2a3-25a0U1u6/ldC1l+ju6psFbMt29A\"",
		"mtime": "2026-09-28T15:29:49.395Z",
		"size": 675,
		"path": "../public/assets/web-DeqBZkWZ.js"
	},
	"/assets/websockets-BrH1W1hC.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1a557-mxpHOqZvkzHe900c1PAg5PC57RM\"",
		"mtime": "2026-09-28T15:29:49.618Z",
		"size": 107863,
		"path": "../public/assets/websockets-BrH1W1hC.js"
	},
	"/assets/websockets-E5bULUr_.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1a62c-rg3+llKpcDkOZD0Mr8foSXIMZf4\"",
		"mtime": "2026-09-28T15:29:50.385Z",
		"size": 108076,
		"path": "../public/assets/websockets-E5bULUr_.js"
	},
	"/assets/worker-DJSXMwe3.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"12df0-e0L59HHmgiflz5cssaAxMwdrPHU\"",
		"mtime": "2026-09-28T15:29:50.387Z",
		"size": 77296,
		"path": "../public/assets/worker-DJSXMwe3.js"
	},
	"/assets/x-CzHJVKjy.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"fe-To5L8pHdfrz9X5BjfgCjzrMT664\"",
		"mtime": "2026-09-28T15:29:49.620Z",
		"size": 254,
		"path": "../public/assets/x-CzHJVKjy.js"
	},
	"/assets/wa-sqlite-CagagB9I.wasm": {
		"type": "application/wasm",
		"etag": "\"112932-PVZvyjEpDlc7C+RsG8vVBaXaZyQ\"",
		"mtime": "2026-09-28T15:29:50.366Z",
		"size": 1124658,
		"path": "../public/assets/wa-sqlite-CagagB9I.wasm"
	},
	"/assets/wa-sqlite-async-DCIP8kAx.wasm": {
		"type": "application/wasm",
		"etag": "\"22d125-my2aJEczirWasFS1osydDIkHGgk\"",
		"mtime": "2026-09-28T15:29:50.375Z",
		"size": 2281765,
		"path": "../public/assets/wa-sqlite-async-DCIP8kAx.wasm"
	}
};
//#endregion
//#region #nitro/virtual/public-assets-node
function readAsset(id) {
	const serverDir = dirname(fileURLToPath(globalThis.__nitro_main__));
	return promises.readFile(resolve(serverDir, public_assets_data_default[id].path));
}
//#endregion
//#region #nitro/virtual/public-assets
var publicAssetBases = {};
function isPublicAssetURL(id = "") {
	if (public_assets_data_default[id]) return true;
	for (const base in publicAssetBases) if (id.startsWith(base)) return true;
	return false;
}
function getAsset(id) {
	return public_assets_data_default[id];
}
//#endregion
//#region node_modules/.pnpm/nitro@3.0.260610-beta_jiti@_f054ebf3b994581339357de98dfa56d4/node_modules/nitro/dist/runtime/internal/static.mjs
var METHODS = /* @__PURE__ */ new Set(["HEAD", "GET"]);
var EncodingMap = {
	gzip: ".gz",
	br: ".br",
	zstd: ".zst"
};
var static_default = defineHandler((event) => {
	if (event.req.method && !METHODS.has(event.req.method)) return;
	let id = decodePath(withLeadingSlash(withoutTrailingSlash(event.url.pathname)));
	let asset;
	const encodings = [...(event.req.headers.get("accept-encoding") || "").split(",").map((e) => EncodingMap[e.trim()]).filter(Boolean).sort(), ""];
	for (const encoding of encodings) for (const _id of [id + encoding, joinURL(id, "index.html" + encoding)]) {
		const _asset = getAsset(_id);
		if (_asset) {
			asset = _asset;
			id = _id;
			break;
		}
	}
	if (!asset) {
		if (isPublicAssetURL(id)) {
			event.res.headers.delete("Cache-Control");
			throw new HTTPError({ status: 404 });
		}
		return;
	}
	if (encodings.length > 1) event.res.headers.append("Vary", "Accept-Encoding");
	if (event.req.headers.get("if-none-match") === asset.etag) {
		event.res.status = 304;
		event.res.statusText = "Not Modified";
		return "";
	}
	const ifModifiedSinceH = event.req.headers.get("if-modified-since");
	const mtimeDate = new Date(asset.mtime);
	if (ifModifiedSinceH && asset.mtime && new Date(ifModifiedSinceH) >= mtimeDate) {
		event.res.status = 304;
		event.res.statusText = "Not Modified";
		return "";
	}
	if (asset.type) event.res.headers.set("Content-Type", asset.type);
	if (asset.etag && !event.res.headers.has("ETag")) event.res.headers.set("ETag", asset.etag);
	if (asset.mtime && !event.res.headers.has("Last-Modified")) event.res.headers.set("Last-Modified", mtimeDate.toUTCString());
	if (asset.encoding && !event.res.headers.has("Content-Encoding")) event.res.headers.set("Content-Encoding", asset.encoding);
	if (asset.size > 0 && !event.res.headers.has("Content-Length")) event.res.headers.set("Content-Length", asset.size.toString());
	return readAsset(id);
});
//#endregion
//#region server/autonoma/pg-db.ts
/**
* Autonoma — client pg (Supabase) pour les factories.
*
* L'app est offline-first (PowerSync, placeholders `?`). Côté serveur
* Nitro, on réutilise le même SQL en convertissant `?` → `$1…$n` (PG)
* et en exécutant sur la base Supabase PG via `pg`.
*
* Connexion (par ordre de priorité) :
*  1. `SUPABASE_DB_URL` — URL complète
*     (`postgres://postgres:***@db.<ref>.supabase.co:5432/postgres?sslmode=require`),
*  2. `PS_DB_HOST` + `PS_DB_USER` (défaut `postgres`) + `PS_DATABASE_PASSWORD`.
*
* Les secrets restent dans l'env (fourni par Autonoma sur la preview),
* jamais commités.
*/
var { Client } = esm_default;
var client = null;
function buildConfig() {
	const url = process.env.SUPABASE_DB_URL;
	if (url) return {
		connectionString: url,
		application_name: "autonoma-integration"
	};
	const host = process.env.PS_DB_HOST;
	const user = process.env.PS_DB_USER ?? "postgres";
	const password = process.env.PS_DATABASE_PASSWORD;
	if (!host) throw new Error("[autonoma] Base non joignable : fournir SUPABASE_DB_URL (ou PS_DB_HOST + PS_DATABASE_PASSWORD) dans l'env.");
	return {
		host,
		port: Number(process.env.PS_DB_PORT ?? 5432),
		database: process.env.PS_DB_NAME ?? "postgres",
		user,
		password: password ?? "",
		ssl: { minVersion: "TLSv1.2" },
		application_name: "autonoma-integration"
	};
}
async function autDb() {
	if (client && !client.connection?.connected) client = null;
	if (!client) {
		const c = new Client(buildConfig());
		await c.connect();
		client = c;
	}
	return client;
}
async function closeAutDb() {
	if (client) {
		await client.end();
		client = null;
	}
}
function toPgSql(sql) {
	let i = 0;
	return sql.replace(/\?/g, () => (i += 1, `$${i}`));
}
/**
* Équiv. PowerSync `execute(sql, params)` : `?` → `$n` (PG), renvoie
* `{ array, rowsAffected }` (le shape attendu par le data layer).
*/
async function pgExecute(sql, params = []) {
	const res = await (await autDb()).query(toPgSql(sql), params);
	return {
		array: res.rows ?? [],
		rowsAffected: res.rowCount ?? 0
	};
}
/** Équiv. PowerSync `execute` pour les lectures : renvoie les lignes. */
async function pgQuery(sql, params = []) {
	return (await (await autDb()).query(toPgSql(sql), params)).rows;
}
//#endregion
//#region server/autonoma/writes.ts
/**
* `createOrganizationPS` + `setOrganizationStatusPS` : l'app crée
* PENDING puis active ; scénario = org ACTIVE (registre, statut passé
* en paramètre — PENDING est conservé par défaut pour respecter
* l'app).
*/
async function writeOrganization(input) {
	const now = (/* @__PURE__ */ new Date()).toISOString();
	await pgExecute(`INSERT INTO organizations (id, name, type, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`, [
		input.id,
		input.name,
		input.type ?? "CHURCH",
		input.status ?? "PENDING",
		now,
		now
	]);
	return { id: input.id };
}
/** `grantOrgAdminPS` (id uuid auto-généré par la base). */
async function writeOrgAdmin(input) {
	const now = (/* @__PURE__ */ new Date()).toISOString();
	const r = await pgExecute(`INSERT INTO org_admins (admin_profile_id, org_id, status, granted_by, created_at, updated_at)
     VALUES (?, ?, 'ACTIVE', ?, ?, ?) RETURNING id`, [
		input.adminProfileId,
		input.orgId,
		input.grantedBy ?? null,
		now,
		now
	]);
	return { id: String(r.array[0].id) };
}
async function writeProfile(input) {
	(/* @__PURE__ */ new Date()).toISOString();
	await pgExecute(`INSERT INTO profiles
      (id, email, first_name, last_name, role, org_id, status,
       created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`, [
		input.id,
		input.email,
		input.firstName ?? null,
		input.lastName ?? null,
		input.role ?? "TREASURER",
		input.orgId ?? "org-1",
		input.status ?? "ACTIVE"
	]);
	return {
		id: input.id,
		email: input.email
	};
}
/** `org_memberships` — pas de fonction réutilisable : INSERT inline. */
async function writeOrgMembership(input) {
	const r = await pgExecute(`INSERT INTO org_memberships (user_id, org_id, role, status, joined_at)
     VALUES (?, ?, ?, ?, NOW()) RETURNING id`, [
		input.userId,
		input.orgId,
		input.role ?? "MEMBER",
		input.status ?? "ACTIVE"
	]);
	return { id: String(r.array[0].id) };
}
/**
* `createGroupPS` (org_units + groups + accounts + caisses). Variantes
* de type/statut acceptées (l'app n'expose que `type` en param) :
* caisses.type reste 'GROUP' dans l'app — le factory le paramètre.
*/
async function writeGroup(input) {
	const now = (/* @__PURE__ */ new Date()).toISOString();
	const status = input.groupStatus ?? "ACTIVE";
	if (!input.skipOrgUnit) await pgExecute(`INSERT INTO org_units (id, name, type, org_id, description, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)`, [
		input.id,
		input.name,
		input.type,
		input.orgId,
		input.description ?? "",
		now,
		now
	]);
	await pgExecute(`INSERT INTO groups (id, org_id, name, parent_group_id, responsable_member_id, status, archived_at, archived_by, archive_reason, created_at, updated_at)
     VALUES (?, ?, ?, null, null, ?, null, null, null, ?, ?)`, [
		input.id,
		input.orgId,
		input.name,
		status,
		now,
		now
	]);
	await pgExecute(`INSERT INTO accounts (id, org_id, owner_type, owner_id, name, currency, status, archived_at, archived_by, archive_reason, created_at, updated_at)
     VALUES (?, ?, 'GROUP', ?, ?, 'XOF', 'ACTIVE', null, null, null, ?, ?)`, [
		input.id,
		input.orgId,
		input.id,
		input.name,
		now,
		now
	]);
	await pgExecute(`INSERT INTO caisses (id, name, description, type, color, org_id, archived_at, archived_by, archive_reason, created_at, updated_at)
     VALUES (?, ?, ?, 'GROUP', '#FF6B00', ?, null, null, null, ?, ?)`, [
		input.id,
		input.name,
		input.description ?? "",
		input.orgId,
		now,
		now
	]);
	return { id: input.id };
}
/** Standalone account / caisse (cas `main` du scénario, hors group). */
async function writeAccount(input) {
	const now = (/* @__PURE__ */ new Date()).toISOString();
	await pgExecute(`INSERT INTO accounts (id, org_id, owner_type, owner_id, name, currency, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)`, [
		input.id,
		input.orgId,
		input.ownerType,
		input.ownerId,
		input.name,
		input.currency ?? "XOF",
		now,
		now
	]);
	return { id: input.id };
}
async function writeCaisse(input) {
	const now = (/* @__PURE__ */ new Date()).toISOString();
	await pgExecute(`INSERT INTO caisses (id, name, description, type, color, org_id, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, '#FF6B00', ?, 'ACTIVE', ?, ?)`, [
		input.id,
		input.name,
		input.description ?? "",
		input.type ?? "GROUP",
		input.orgId,
		now,
		now
	]);
	return { id: input.id };
}
/** `categories` — insert inline (key + label_fr, pas de NOT NULL de plus). */
async function writeCategory(input) {
	await pgExecute(`INSERT INTO categories (id, key, label_fr, type, org_id, created_at)
     VALUES (?, ?, ?, ?, ?, NOW())`, [
		input.id,
		input.orgId,
		input.key,
		input.labelFr,
		input.type
	]);
	return { id: input.id };
}
async function writeMember(input) {
	const now = (/* @__PURE__ */ new Date()).toISOString();
	await pgExecute(`INSERT INTO members
      (id, org_id, first_name, last_name, phone, email,
       status, joined_at, archived_at, archived_by, archive_reason,
       created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
		input.id,
		input.orgId,
		input.firstName,
		input.lastName,
		input.phone ?? null,
		input.email ?? null,
		input.status ?? "ACTIVE",
		input.joinedAt ?? now,
		null,
		null,
		null,
		now,
		now
	]);
	return { id: input.id };
}
/** `addGroupMembershipPS` (id uuid par défaut… la colonne est text :
*  l'app génère `crypto.randomUUID()` → même chose côté serveur). */
async function writeGroupMembership(input) {
	const now = (/* @__PURE__ */ new Date()).toISOString();
	await pgExecute(`INSERT INTO group_memberships (id, member_id, group_id, role, joined_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`, [
		input.id,
		input.memberId,
		input.groupId,
		input.role ?? "MEMBRE",
		input.joinedAt ?? now,
		now
	]);
	return { id: input.id };
}
async function writeEvent(input) {
	const now = (/* @__PURE__ */ new Date()).toISOString();
	await pgExecute(`INSERT INTO events
      (id, org_id, name, description, start_date, end_date,
       status, budget, created_at, updated_at, budget_items, type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
		input.id,
		input.orgId,
		input.name,
		input.description ?? "",
		input.startDate,
		input.endDate ?? null,
		input.status ?? "PLANIFIED",
		input.budget ?? 0,
		now,
		now,
		input.budgetItems ?? "[]",
		input.type ?? "EVENT"
	]);
	return { id: input.id };
}
/** `event_budgets` / `budget_lines` — insert inline. */
async function writeEventBudget(input) {
	await pgExecute(`INSERT INTO event_budgets (id, event_id, currency, created_at)
     VALUES (?, ?, ?, NOW())`, [
		input.id,
		input.eventId,
		input.currency ?? "XOF"
	]);
	return { id: input.id };
}
async function writeBudgetLine(input) {
	await pgExecute(`INSERT INTO budget_lines
      (id, event_budget_id, category_id, planned_amount_cents,
       actual_amount_cents, description, created_at)
     VALUES (?, ?, ?, ?, 0, ?, NOW())`, [
		input.id,
		input.eventBudgetId,
		input.categoryId,
		input.plannedAmountCents,
		input.description ?? null
	]);
	return { id: input.id };
}
async function writeCotisation(input) {
	const now = (/* @__PURE__ */ new Date()).toISOString();
	await pgExecute(`INSERT INTO cotisations
      (id, org_id, culte_id, membre_id, statut, montantobligatoire, montantpaye,
       datepaiement, notes, createdat, updatedat)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
		input.id,
		input.orgId,
		input.culteId,
		input.membreId,
		input.statut ?? "NON_PAYE",
		input.montantObligatoire ?? 5e3,
		input.montantPaye ?? 0,
		input.datePaiement ?? null,
		input.notes ?? null,
		now,
		now
	]);
	return { id: input.id };
}
/** `addTransactionPS` — 23 colonnes, INSERT seul (sans side-effect audit). */
async function writeTransaction(tx) {
	const now = (/* @__PURE__ */ new Date()).toISOString();
	await pgExecute(`INSERT INTO transactions (
      id, org_id, type, amount, description, date, status,
      category_id, org_unit_id, compensates_for, comment,
      version, created_by_id, approved_by_id, created_at,
      updated_at, approved_at, event_id, source, person_name,
      source_caisse_id, versement_id, reversal_of_id, cotisation_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
		tx.id,
		tx.orgId,
		tx.type,
		tx.amount,
		tx.description,
		tx.date,
		tx.status,
		tx.categoryId,
		tx.orgUnitId ?? null,
		tx.compensatesFor ?? null,
		tx.comment ?? null,
		1,
		tx.createdBy,
		tx.approvedBy ?? null,
		now,
		now,
		tx.approvedAt ?? null,
		tx.eventId ?? null,
		tx.source ?? null,
		tx.personName ?? null,
		tx.sourceCaisseId ?? null,
		tx.versementId ?? null,
		tx.reversalOfId ?? null,
		tx.cotisationId ?? null
	]);
	return { id: tx.id };
}
async function writeOrgBudget(input) {
	const now = (/* @__PURE__ */ new Date()).toISOString();
	await pgExecute(`INSERT INTO org_budgets
      (id, org_id, fiscal_year, period, cost_center_id, cost_center_label,
       name, total_budgeted_cents, status, currency, note, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
		input.id,
		input.orgId,
		input.fiscalYear,
		input.period ?? "ANNUAL",
		input.costCenterId ?? null,
		input.costCenterLabel ?? null,
		input.name,
		input.totalBudgetedCents ?? 0,
		input.status ?? "ACTIVE",
		input.currency ?? "XOF",
		input.note ?? null,
		now,
		now
	]);
	return { id: input.id };
}
async function writeOrgBudgetLine(input) {
	const now = (/* @__PURE__ */ new Date()).toISOString();
	await pgExecute(`INSERT INTO org_budget_lines
      (id, org_id, budget_id, category_id, planned_amount_cents, note,
       created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
		input.id,
		input.orgId,
		input.budgetId,
		input.categoryId ?? null,
		input.plannedAmountCents,
		input.note ?? null,
		now,
		now
	]);
	return { id: input.id };
}
async function writeGivingDonor(input) {
	const now = (/* @__PURE__ */ new Date()).toISOString();
	await pgExecute(`INSERT INTO giving_donors
      (id, org_id, full_name, email, phone, address, member_id,
       tax_receipt_enabled, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, null, ?, ?, null, ?, ?)`, [
		input.id,
		input.orgId,
		input.fullName,
		input.email ?? null,
		input.phone ?? null,
		input.memberId ?? null,
		input.taxReceiptEnabled ? 1 : 0,
		now,
		now
	]);
	return { id: input.id };
}
async function writeGivingCampaign(input) {
	const now = (/* @__PURE__ */ new Date()).toISOString();
	await pgExecute(`INSERT INTO giving_campaigns
      (id, org_id, name, purpose, fund, target_amount_cents, start_date,
       end_date, status, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, null, ?, ?)`, [
		input.id,
		input.orgId,
		input.name,
		input.purpose ?? null,
		input.fund ?? null,
		input.targetAmountCents ?? 0,
		input.startDate?.slice(0, 10) ?? null,
		input.endDate?.slice(0, 10) ?? null,
		input.status ?? "ACTIVE",
		now,
		now
	]);
	return { id: input.id };
}
async function writePledge(input) {
	const now = (/* @__PURE__ */ new Date()).toISOString();
	await pgExecute(`INSERT INTO pledges
      (id, org_id, campaign_id, donor_id, pledged_amount_cents, schedule,
       amount_per_period_cents, start_date, end_date, status, notes,
       created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, null, ?, ?)`, [
		input.id,
		input.orgId,
		input.campaignId,
		input.donorId,
		input.pledgedAmountCents,
		input.schedule ?? "ONCE",
		input.amountPerPeriodCents ?? 0,
		input.startDate?.slice(0, 10) ?? null,
		input.endDate?.slice(0, 10) ?? null,
		input.status ?? "ACTIVE",
		now,
		now
	]);
	return { id: input.id };
}
async function writeTaxReceipt(input) {
	const now = (/* @__PURE__ */ new Date()).toISOString();
	await pgExecute(`INSERT INTO tax_receipts
      (id, org_id, donor_id, year, receipt_no, total_amount_cents,
       issued_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
		input.id,
		input.orgId,
		input.donorId,
		input.year,
		input.receiptNo,
		input.totalAmountCents ?? 0,
		input.issuedAt ?? now,
		now,
		now
	]);
	return { id: input.id };
}
/** `linkTransactionGivingPS` — UNIQUE(org, transaction) : idempotent. */
async function writeTransactionGiving(input) {
	const existing = await pgQuery(`SELECT id FROM transaction_giving WHERE org_id = ? AND transaction_id = ?`, [input.orgId, input.transactionId]);
	if (existing.length > 0) return { id: existing[0].id };
	const now = (/* @__PURE__ */ new Date()).toISOString();
	await pgExecute(`INSERT INTO transaction_giving
      (id, org_id, transaction_id, donor_id, campaign_id, recorded_at,
       created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
		input.id,
		input.orgId,
		input.transactionId,
		input.donorId,
		input.campaignId ?? null,
		now,
		now,
		now
	]);
	return { id: input.id };
}
async function writeInvitation(input) {
	const now = (/* @__PURE__ */ new Date()).toISOString();
	await pgExecute(`INSERT INTO invitations (
      id, org_id, code, target_role, target_scope_type, target_group_id, target_member_id,
      issued_by, issued_at, expires_at, max_uses, used_count, status, created_at, updated_at,
      grants_payload, tags_payload
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'ACTIVE', ?, ?, '[]', '[]')`, [
		input.id,
		input.orgId,
		input.code,
		input.targetRole,
		input.targetScopeType ?? "ORG",
		input.targetGroupId ?? null,
		input.targetMemberId ?? null,
		input.issuedBy,
		now,
		input.expiresAt,
		input.maxUses ?? 1,
		now,
		now
	]);
	return {
		id: input.id,
		code: input.code
	};
}
/**
* `claimInvitationPS` — le déclencheur `settle_invitation_claim`
* incrémente `invitations.used_count` (côté SQL) ; la row est
* PENDING_SYNC (l'app ne l'active jamais elle-même).
*/
async function writeInvitationClaim(input) {
	const now = (/* @__PURE__ */ new Date()).toISOString();
	await pgExecute(`INSERT INTO invitation_claims
      (id, invitation_id, claimed_by_device_id, claimed_at,
       resulting_user_id, status, reject_reason, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
		input.id,
		input.invitationId,
		input.claimedByDeviceId ?? null,
		now,
		input.resultingUserId ?? null,
		input.status ?? "PENDING_SYNC",
		input.rejectReason ?? null,
		now,
		now
	]);
	return { id: input.id };
}
async function writeNotification(input) {
	const r = await pgExecute(`INSERT INTO notifications
      (org_id, action_type, title, message, is_read, source_transaction_id)
     VALUES (?, ?, ?, ?, ?, ?) RETURNING id`, [
		input.orgId,
		input.actionType,
		input.title,
		input.message,
		input.isRead ?? false,
		input.sourceTransactionId ?? null
	]);
	return { id: String(r.array[0].id) };
}
async function writeAuditEntry(input) {
	await pgExecute(`INSERT INTO audit_entries
      (id, org_id, transaction_id, user_id, actor_role_at_time, action,
       entity_type, entity_id, before_state, after_state, comment)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?::jsonb, ?)`, [
		input.id,
		input.orgId,
		input.transactionId ?? null,
		input.userId,
		input.actorRoleAtTime ?? null,
		input.action,
		input.entityType,
		input.entityId,
		JSON.stringify(input.beforeState ?? null),
		JSON.stringify(input.afterState ?? null),
		input.comment ?? null
	]);
	return { id: input.id };
}
async function writeRoleAssignment(input) {
	const r = await pgExecute(`INSERT INTO role_assignments (session_id, role, org_id)
     VALUES (?, ?, ?) RETURNING id`, [
		input.sessionId,
		input.role,
		input.orgId
	]);
	return { id: String(r.array[0].id) };
}
async function writeReportDefinition(input) {
	const now = (/* @__PURE__ */ new Date()).toISOString();
	const arr = (v) => `{${v.join(",")}}`;
	await pgExecute(`INSERT INTO report_definitions
      (id, org_id, name, data_source, dimensions, metrics, filters,
       group_by, sort_by, saved_by, is_template, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?::text[], ?::text[], ?::jsonb, ?::text[], ?, ?, ?, ?, ?)`, [
		input.id,
		input.orgId,
		input.name,
		input.dataSource,
		arr(input.dimensions ?? []),
		arr(input.metrics ?? []),
		JSON.stringify(input.filters ?? {}),
		arr(input.groupBy ?? []),
		input.sortBy ?? null,
		input.savedBy ?? null,
		input.isTemplate ?? false,
		now,
		now
	]);
	return { id: input.id };
}
async function writeFormDefinition(input) {
	const now = (/* @__PURE__ */ new Date()).toISOString();
	await pgExecute(`INSERT INTO form_definitions
      (id, org_id, key, name, description, version, target_entity_type,
       fields, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?, ?, ?)`, [
		input.id,
		input.orgId,
		input.key,
		input.name,
		input.description ?? null,
		input.version ?? 1,
		input.targetEntityType ?? null,
		JSON.stringify(input.fields ?? []),
		input.status ?? "DRAFT",
		now,
		now
	]);
	return {
		id: input.id,
		key: input.key
	};
}
async function writeFormSubmission(input) {
	const now = (/* @__PURE__ */ new Date()).toISOString();
	await pgExecute(`INSERT INTO form_submissions
      (id, org_id, form_definition_id, form_version, entity_type, entity_id,
       data, submitted_by, submitted_at, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?::jsonb, ?, ?, ?, ?)`, [
		input.id,
		input.orgId,
		input.formDefinitionId,
		input.formVersion,
		input.linkedEntityType ?? null,
		input.linkedEntityId ?? null,
		JSON.stringify(input.data ?? {}),
		input.submittedBy,
		now,
		input.status ?? "SUBMITTED",
		now
	]);
	return { id: input.id };
}
async function writeCustomFieldDefinition(input) {
	const now = (/* @__PURE__ */ new Date()).toISOString();
	await pgExecute(`INSERT INTO custom_field_definitions
      (id, org_id, entity_type, field_name, field_label, field_type,
       options, "order", created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?::text[], ?, ?, ?)`, [
		input.id,
		input.orgId,
		input.entityType,
		input.key,
		input.label,
		input.type,
		input.options ? `{${input.options.join(",")}}` : "{}",
		input.order ?? 0,
		now,
		now
	]);
	return {
		id: input.id,
		key: input.key
	};
}
/** `upsertCustomFieldValuePS` — l'app INSERT (pas d'ON CONFLICT) :
*  id contrôlé ici pour la teardown. */
async function writeCustomFieldValue(input) {
	const now = (/* @__PURE__ */ new Date()).toISOString();
	const rowValue = typeof input.value === "object" && input.value !== null ? JSON.stringify(input.value) : JSON.stringify(String(input.value ?? ""));
	await pgExecute(`INSERT INTO custom_field_values
      (id, entity_type, entity_id, custom_field_definition_id, value,
       created_at, updated_at)
     VALUES (?, ?, ?, ?, ?::jsonb, ?, ?)`, [
		input.id,
		input.entityType,
		input.entityId,
		input.definitionId,
		rowValue,
		now,
		now
	]);
	return { id: input.id };
}
async function writeTag(input) {
	const r = await pgExecute(`INSERT INTO tags (org_id, name, description)
     VALUES (?, ?, ?) RETURNING id`, [
		input.orgId,
		input.name,
		input.description ?? null
	]);
	return {
		id: String(r.array[0].id),
		name: input.name
	};
}
async function writeTagAssignment(input) {
	const r = await pgExecute(`INSERT INTO tag_assignments (tag_id, user_id, org_id, assigned_by)
     VALUES (?, ?, ?, ?) RETURNING id`, [
		input.tagId,
		input.userId,
		input.orgId,
		input.assignedBy ?? null
	]);
	return { id: String(r.array[0].id) };
}
/** `createGrantPS` — schéma agnostique (resource/action libres). */
async function writeGrant(input) {
	const now = (/* @__PURE__ */ new Date()).toISOString();
	const r = await pgExecute(`INSERT INTO grants
      (subject_type, subject_id, resource, action,
       scope_resource, scope_id, granted_by, granted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`, [
		input.subjectType,
		input.subjectId,
		input.resource,
		input.action,
		input.scopeResource ?? null,
		input.scopeId ?? null,
		input.grantedBy ?? null,
		now
	]);
	return { id: String(r.array[0].id) };
}
//#endregion
//#region server/autonoma/factories.ts
/**
* Autonoma — 37 factories (mirror 1:1 de l'entity audit).
*
* Chaque factory appelle le plan d'écriture de `./writes` (SQL de
* l'app, sans side-effects navigateur) et retourne `{ id, ... }`
* (la PK, obligatoire — `FACTORY_MISSING_PK` sinon). Le teardown
* est un scoped-delete par clé ; l'SDK l'exécute en ordre inverse
* pendant `down`.
*
* Convention des offsets temporels : les champs `*DaysOffset` /
* `*DaysAgo` sont des entiers relatifs au moment de l'`up` (jamais
* de date absolue commutée) :
*   - positif  → dans le futur (`+ N jours`)
*   - négatif  → dans le passé (`N jours avant`)
*   - 0        → maintenant
*/
/** `new Date() + n days` (n négatif = passé, 0 = now). */
function offsetDate(daysOffset) {
	const d = /* @__PURE__ */ new Date();
	d.setUTCDate(d.getUTCDate() + daysOffset);
	return d.toISOString();
}
/** `YYYY-MM-DD` pour les colonnes DATE (transactions.date). */
function offsetDateOnly(daysOffset) {
	return offsetDate(daysOffset).slice(0, 10);
}
/** Teardown par PK (la référence `refs` stocke ce que `create` a renvoyé). */
function teardownById(table, key = "id") {
	return async (record) => {
		await pgExecute(`DELETE FROM ${table} WHERE ${key} = ?`, [record[key]]);
	};
}
var id = stringType().min(1);
var orgId = stringType().min(1);
var optionalString = stringType().nullable().optional();
/**
* Les colonnes uuid de la base (profiles.id, org_memberships.user_id,
* org_admins.admin_profile_id, invitations.id,
* invitation_claims.{id, invitation_id, resulting_user_id},
* notifications.id, role_assignments.id, grants.{id, granted_by},
* tags.id, tag_assignments.{id, tag_id, user_id, assigned_by},
* audit_entries.user_id, transactions.{created_by_id, approved_by_id})
* sont de vrais uuid PG. Les slugs du scénario
* (`user-admin-{{testRunId}}`) n'y rentrent PAS : on les convertit en
* uuid v5 déterministe (namespace Lumina). La `refs` renvoyée par la
* factory garde le slug d'origine comme `id` (le scénario y fait
* référence) — le teardown est fait sur le uuid interne via
* `refs.internalId`.
*/
var LUMINA_UUID_NS = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
/** Slug de scénario → uuid v5 déterministe (sans dépendance externe). */
function slugToUuid(slug) {
	const base = `urn:autonoma:lumina:${LUMINA_UUID_NS}:${slug}`;
	const h = createHash("sha1").update(base).digest();
	h[6] = h[6] & 15 | 80;
	h[8] = h[8] & 63 | 128;
	return h.slice(0, 16).toString("hex").replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5");
}
function teardownByInternal(table) {
	return async (record) => {
		const uuid = record["internalId"];
		if (!uuid) return;
		await pgExecute(`DELETE FROM ${table} WHERE id = ?`, [uuid]);
	};
}
var organizations = defineFactory({
	inputSchema: objectType({
		id,
		name: stringType(),
		type: enumType([
			"CENTRAL",
			"CHURCH",
			"SCHOOL",
			"ENTERPRISE"
		]).optional(),
		status: enumType([
			"PENDING",
			"ACTIVE",
			"SUSPENDED",
			"ARCHIVED"
		]).optional()
	}),
	async create(data) {
		await writeOrganization({
			id: data.id,
			name: data.name,
			type: data.type,
			status: "PENDING"
		});
		if ((data.status ?? "PENDING") === "ACTIVE") await pgExecute(`UPDATE organizations SET status = 'ACTIVE', updated_at = NOW()
         WHERE id = ?`, [data.id]);
		return {
			id: data.id,
			name: data.name
		};
	},
	async teardown(record) {
		const org = record.id;
		for (const t of [
			"transaction_giving",
			"tax_receipts",
			"pledges",
			"giving_campaigns",
			"giving_donors",
			"org_budget_lines",
			"org_budgets",
			"cotisations",
			"versements",
			"transactions",
			"events",
			"custom_field_values",
			"custom_field_definitions",
			"form_submissions",
			"form_definitions",
			"report_definitions",
			"role_assignments",
			"audit_entries",
			"notifications",
			"invitation_claims",
			"invitations",
			"members",
			"caisses",
			"accounts",
			"groups",
			"org_units",
			"org_admins",
			"org_memberships",
			"profiles"
		]) await pgExecute(`DELETE FROM ${t} WHERE org_id = ?`, [org]);
		await pgExecute(`DELETE FROM tag_assignments WHERE org_id = ?`, [org]);
		await pgExecute(`DELETE FROM tags WHERE org_id = ?`, [org]);
		await pgExecute(`DELETE FROM organizations WHERE id = ?`, [org]);
	}
});
var profiles = defineFactory({
	inputSchema: objectType({
		id,
		org_id: orgId,
		email: stringType().email(),
		first_name: optionalString,
		last_name: optionalString,
		role: stringType().optional(),
		status: enumType([
			"ACTIVE",
			"PENDING",
			"INACTIVE"
		]).optional()
	}),
	async create(data) {
		const r = writeProfile({
			id: slugToUuid(data.id),
			email: data.email,
			firstName: data.first_name ?? void 0,
			lastName: data.last_name ?? void 0,
			role: data.role ?? void 0,
			orgId: data.org_id,
			status: data.status ?? "ACTIVE"
		});
		return {
			id: data.id,
			internalId: r.id,
			email: data.email
		};
	},
	teardown: teardownByInternal("profiles")
});
var orgMemberships = defineFactory({
	inputSchema: objectType({
		user_id: orgId,
		org_id: orgId,
		role: stringType().optional(),
		status: enumType(["ACTIVE", "PENDING"]).optional(),
		is_primary: booleanType().optional()
	}),
	async create(data) {
		return {
			id: (await writeOrgMembership({
				userId: slugToUuid(data.user_id),
				orgId: data.org_id,
				role: data.role,
				status: data.status
			})).id,
			user_id: data.user_id,
			org_id: data.org_id
		};
	},
	teardown: teardownById("org_memberships")
});
var orgAdmins = defineFactory({
	inputSchema: objectType({
		admin_profile_id: orgId,
		org_id: orgId,
		status: enumType(["ACTIVE", "REVOKED"]).optional(),
		granted_by: optionalString
	}),
	async create(data) {
		const r = await writeOrgAdmin({
			adminProfileId: slugToUuid(data.admin_profile_id),
			orgId: data.org_id,
			grantedBy: data.granted_by ?? null
		});
		if (data.status && data.status !== "ACTIVE") await pgExecute(`UPDATE org_admins SET status = ? WHERE id = ?`, [data.status, r.id]);
		return {
			...r,
			org_id: data.org_id,
			admin_profile_id: data.admin_profile_id
		};
	},
	teardown: teardownById("org_admins")
});
var groups = defineFactory({
	inputSchema: objectType({
		id,
		org_id: orgId,
		name: stringType(),
		unit_type: enumType([
			"groupe",
			"direction",
			"GROUP"
		]).optional(),
		description: optionalString,
		status: enumType(["ACTIVE", "ARCHIVED"]).optional(),
		/** Si vrai, la ligne `org_units` associée n'est PAS créée ici
		*  (elle l'est par la factory `org_units`). Défaut : true. */
		skipOrgUnit: booleanType().optional()
	}),
	async create(data) {
		return writeGroup({
			id: data.id,
			orgId: data.org_id,
			name: data.name,
			type: data.unit_type ?? "groupe",
			description: data.description ?? void 0,
			groupStatus: data.status ?? "ACTIVE",
			skipOrgUnit: data.skipOrgUnit ?? true
		});
	},
	async teardown(record) {
		const g = record.id;
		await pgExecute(`DELETE FROM group_memberships WHERE group_id = ?`, [g]);
		await pgExecute(`DELETE FROM caisses WHERE id = ?`, [g]);
		await pgExecute(`DELETE FROM accounts WHERE id = ?`, [g]);
		await pgExecute(`DELETE FROM groups WHERE id = ?`, [g]);
	}
});
var orgUnits = defineFactory({
	inputSchema: objectType({
		id,
		org_id: orgId,
		name: stringType(),
		type: stringType().optional(),
		description: optionalString
	}),
	async create(data) {
		const now = (/* @__PURE__ */ new Date()).toISOString();
		await pgExecute(`INSERT INTO org_units
         (id, name, type, org_id, description, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)`, [
			data.id,
			data.name,
			data.type ?? "groupe",
			data.org_id,
			data.description ?? "",
			now,
			now
		]);
		return { id: data.id };
	},
	teardown: teardownById("org_units")
});
var members = defineFactory({
	inputSchema: objectType({
		id,
		org_id: orgId,
		first_name: stringType(),
		last_name: stringType(),
		email: optionalString,
		phone: optionalString,
		status: enumType([
			"ACTIVE",
			"INACTIVE",
			"ARCHIVED"
		]).optional(),
		/** jours avant le seeding (ex. 365 = 1 an avant). */
		joinedDaysAgo: numberType().int().optional()
	}),
	async create(data) {
		return writeMember({
			id: data.id,
			orgId: data.org_id,
			firstName: data.first_name,
			lastName: data.last_name,
			email: data.email ?? null,
			phone: data.phone ?? null,
			status: data.status ?? "ACTIVE",
			joinedAt: offsetDate(-(data.joinedDaysAgo ?? 0))
		});
	},
	teardown: teardownById("members")
});
var factories = {
	organizations,
	profiles,
	org_memberships: orgMemberships,
	org_admins: orgAdmins,
	org_units: orgUnits,
	groups,
	group_memberships: defineFactory({
		inputSchema: objectType({
			id,
			member_id: orgId,
			group_id: orgId,
			role: stringType().optional(),
			joinedDaysAgo: numberType().int().optional()
		}),
		async create(data) {
			return writeGroupMembership({
				id: data.id,
				memberId: data.member_id,
				groupId: data.group_id,
				role: data.role,
				joinedAt: offsetDate(-(data.joinedDaysAgo ?? 0))
			});
		},
		teardown: teardownById("group_memberships")
	}),
	members,
	accounts: defineFactory({
		inputSchema: objectType({
			id,
			org_id: orgId,
			owner_type: stringType().optional(),
			owner_id: orgId,
			name: stringType(),
			currency: stringType().optional(),
			status: enumType(["ACTIVE", "ARCHIVED"]).optional()
		}),
		async create(data) {
			return writeAccount({
				id: data.id,
				orgId: data.org_id,
				ownerType: data.owner_type ?? "ORGANIZATION",
				ownerId: data.owner_id,
				name: data.name,
				currency: data.currency ?? "XOF"
			});
		},
		teardown: teardownById("accounts")
	}),
	caisses: defineFactory({
		inputSchema: objectType({
			id,
			org_id: orgId,
			name: stringType(),
			type: stringType().optional(),
			description: optionalString
		}),
		async create(data) {
			return writeCaisse({
				id: data.id,
				orgId: data.org_id,
				name: data.name,
				type: data.type,
				description: data.description ?? void 0
			});
		},
		teardown: teardownById("caisses")
	}),
	categories: defineFactory({
		inputSchema: objectType({
			id,
			org_id: orgId,
			key: stringType(),
			label_fr: stringType(),
			type: enumType(["income", "expense"]).optional()
		}),
		async create(data) {
			return writeCategory({
				id: data.id,
				orgId: data.org_id,
				key: data.key,
				labelFr: data.label_fr,
				type: data.type ?? "income"
			});
		},
		teardown: teardownById("categories")
	}),
	transactions: defineFactory({
		inputSchema: objectType({
			id,
			org_id: orgId,
			type: enumType(["income", "expense"]).optional(),
			amount: numberType().int(),
			description: stringType(),
			/** `YYYY-MM-DD` ou offset : négatif = passé, 0 = now. */
			dateDaysOffset: numberType().int().optional(),
			status: enumType([
				"approved",
				"pending",
				"rejected",
				"APPROVED",
				"PENDING",
				"REJECTED"
			]).optional(),
			category_id: optionalString,
			source_caisse_id: optionalString,
			versement_id: optionalString,
			event_id: optionalString,
			person_name: optionalString,
			source: optionalString,
			created_by_id: optionalString,
			approved_by_id: optionalString
		}),
		async create(data) {
			return writeTransaction({
				id: data.id,
				orgId: data.org_id,
				type: (data.type ?? "income").toUpperCase(),
				amount: data.amount,
				description: data.description,
				date: offsetDateOnly(data.dateDaysOffset ?? 0),
				status: (data.status ?? "approved").toUpperCase(),
				categoryId: data.category_id ?? "cat-dime",
				sourceCaisseId: data.source_caisse_id ?? null,
				versementId: data.versement_id ?? null,
				eventId: data.event_id ?? null,
				source: data.source ?? null,
				personName: data.person_name ?? null,
				createdBy: slugToUuid(data.created_by_id ?? "seed-user"),
				approvedBy: data.approved_by_id ? slugToUuid(data.approved_by_id) : null
			});
		},
		teardown: teardownById("transactions")
	}),
	versements: defineFactory({
		inputSchema: objectType({
			id,
			org_id: orgId,
			from_account_id: orgId,
			to_account_id: stringType().optional(),
			amount_cents: numberType().int(),
			/** 0 = maintenant, négatif = passé, positif = futur. */
			dateDaysOffset: numberType().int().optional(),
			status: enumType(["APPROVED", "SUBMITTED"]).optional(),
			source_tx_id: stringType().optional(),
			target_tx_id: stringType().optional()
		}),
		async create(data) {
			const seedUserUuid = slugToUuid("seed-user");
			const createdBy = "seed-user";
			const date = offsetDateOnly(data.dateDaysOffset ?? 0);
			const comment = `Versement ${Math.round(data.amount_cents / 100)} FCFA -> Caisse principale`;
			await pgExecute(`INSERT INTO versements
         (id, org_id, from_account_id, to_account_id, amount_cents, date,
          status, created_by, approved_by, approved_at, comment, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, NOW())`, [
				data.id,
				data.org_id,
				data.from_account_id,
				data.to_account_id ?? "main",
				data.amount_cents,
				date,
				data.status ?? "APPROVED",
				createdBy,
				createdBy,
				comment
			]);
			const sourceTxId = data.source_tx_id ?? `tx-src-${data.id}`;
			const targetTxId = data.target_tx_id ?? `tx-tgt-${data.id}`;
			const nowIso = (/* @__PURE__ */ new Date()).toISOString();
			await writeTransaction({
				id: sourceTxId,
				orgId: data.org_id,
				type: "EXPENSE",
				amount: data.amount_cents,
				description: "Versement vers caisse principale",
				date,
				status: "APPROVED",
				categoryId: "cat-dime",
				source: "CAISSE",
				comment,
				createdBy: seedUserUuid,
				approvedBy: seedUserUuid,
				approvedAt: nowIso,
				sourceCaisseId: data.from_account_id,
				versementId: data.id
			});
			await writeTransaction({
				id: targetTxId,
				orgId: data.org_id,
				type: "INCOME",
				amount: data.amount_cents,
				description: "Versement de groupe",
				date,
				status: "APPROVED",
				categoryId: "cat-dime",
				source: "CAISSE",
				comment,
				createdBy: seedUserUuid,
				approvedBy: seedUserUuid,
				approvedAt: nowIso,
				sourceCaisseId: data.to_account_id ?? "main",
				versementId: data.id
			});
			return {
				id: data.id,
				sourceTxId,
				targetTxId
			};
		},
		async teardown(record) {
			const r = record;
			if (r.sourceTxId) await pgExecute(`DELETE FROM transactions WHERE id = ?`, [r.sourceTxId]);
			if (r.targetTxId) await pgExecute(`DELETE FROM transactions WHERE id = ?`, [r.targetTxId]);
			await pgExecute(`DELETE FROM versements WHERE id = ?`, [r.id]);
		}
	}),
	events: defineFactory({
		inputSchema: objectType({
			id,
			org_id: orgId,
			name: stringType(),
			type: stringType().optional(),
			status: enumType([
				"COMPLETED",
				"ONGOING",
				"PLANIFIED"
			]).optional(),
			/** jours relatifs au seeding (négatif = passé). */
			startDaysOffset: numberType().int().optional(),
			endDaysOffset: numberType().int().optional(),
			budget: numberType().int().optional(),
			budget_items: stringType().optional()
		}),
		async create(data) {
			return writeEvent({
				id: data.id,
				orgId: data.org_id,
				name: data.name,
				type: data.type ?? "EVENT",
				status: data.status ?? "PLANIFIED",
				startDate: offsetDate(data.startDaysOffset ?? 0).slice(0, 10),
				endDate: data.endDaysOffset !== void 0 ? offsetDate(data.endDaysOffset).slice(0, 10) : null,
				budget: data.budget ?? 0,
				budgetItems: data.budget_items ?? "[]"
			});
		},
		teardown: teardownById("events")
	}),
	event_budgets: defineFactory({
		inputSchema: objectType({
			id,
			event_id: orgId,
			currency: stringType().optional(),
			/** jours relatifs au seeding (null = jamais révisé). */
			revisedDaysOffset: numberType().int().nullable().optional()
		}),
		async create(data) {
			const r = await writeEventBudget({
				id: data.id,
				eventId: data.event_id,
				currency: data.currency ?? "XOF"
			});
			if (data.revisedDaysOffset !== null && data.revisedDaysOffset !== void 0) await pgExecute(`UPDATE event_budgets SET revised_at = ?, revised_by = 'autonoma'
         WHERE id = ?`, [offsetDate(data.revisedDaysOffset), data.id]);
			return r;
		},
		teardown: async (record) => {
			const r = record;
			await pgExecute(`DELETE FROM budget_lines WHERE event_budget_id = ?`, [r.id]);
			await pgExecute(`DELETE FROM event_budgets WHERE id = ?`, [r.id]);
		}
	}),
	budget_lines: defineFactory({
		inputSchema: objectType({
			id,
			event_budget_id: orgId,
			category_id: orgId,
			planned_amount_cents: numberType().int(),
			actual_amount_cents: numberType().int().optional()
		}),
		async create(data) {
			return writeBudgetLine({
				id: data.id,
				eventBudgetId: data.event_budget_id,
				categoryId: data.category_id,
				plannedAmountCents: data.planned_amount_cents,
				description: null
			});
		},
		teardown: teardownById("budget_lines")
	}),
	cotisations: defineFactory({
		inputSchema: objectType({
			id,
			org_id: orgId,
			culte_id: orgId,
			membre_id: orgId,
			statut: enumType([
				"PAID",
				"ABSENT",
				"NON_PAYE"
			]).optional(),
			montantobligatoire: numberType().int().optional(),
			montantpaye: numberType().int().optional(),
			paidDaysOffset: numberType().int().nullable().optional()
		}),
		async create(data) {
			return writeCotisation({
				id: data.id,
				orgId: data.org_id,
				culteId: data.culte_id,
				membreId: data.membre_id,
				statut: data.statut ?? "NON_PAYE",
				montantObligatoire: data.montantobligatoire ?? 5e3,
				montantPaye: data.montantpaye ?? 0,
				datePaiement: data.paidDaysOffset === null || data.paidDaysOffset === void 0 ? null : offsetDate(data.paidDaysOffset)
			});
		},
		teardown: teardownById("cotisations")
	}),
	org_budgets: defineFactory({
		inputSchema: objectType({
			id,
			org_id: orgId,
			fiscal_year: numberType().int(),
			name: stringType(),
			period: enumType([
				"ANNUAL",
				"Q1",
				"Q2",
				"Q3",
				"Q4"
			]).optional(),
			total_budgeted_cents: numberType().int().optional(),
			status: enumType([
				"ACTIVE",
				"ARCHIVED",
				"DRAFT",
				"CLOSED"
			]).optional(),
			currency: stringType().optional()
		}),
		async create(data) {
			return writeOrgBudget({
				id: data.id,
				orgId: data.org_id,
				fiscalYear: data.fiscal_year,
				name: data.name,
				period: data.period ?? "ANNUAL",
				totalBudgetedCents: data.total_budgeted_cents ?? 0,
				status: data.status ?? "ACTIVE",
				currency: data.currency ?? "XOF"
			});
		},
		teardown: async (record) => {
			const r = record;
			await pgExecute(`DELETE FROM org_budget_lines WHERE budget_id = ?`, [r.id]);
			await pgExecute(`DELETE FROM org_budgets WHERE id = ?`, [r.id]);
		}
	}),
	org_budget_lines: defineFactory({
		inputSchema: objectType({
			id,
			org_id: orgId,
			budget_id: orgId,
			category_id: optionalString,
			planned_amount_cents: numberType().int(),
			note: optionalString
		}),
		async create(data) {
			return writeOrgBudgetLine({
				id: data.id,
				orgId: data.org_id,
				budgetId: data.budget_id,
				categoryId: data.category_id ?? null,
				plannedAmountCents: data.planned_amount_cents,
				note: data.note ?? null
			});
		},
		teardown: teardownById("org_budget_lines")
	}),
	giving_donors: defineFactory({
		inputSchema: objectType({
			id,
			org_id: orgId,
			full_name: stringType(),
			email: optionalString,
			phone: optionalString,
			member_id: optionalString,
			tax_receipt_enabled: booleanType().optional()
		}),
		async create(data) {
			return writeGivingDonor({
				id: data.id,
				orgId: data.org_id,
				fullName: data.full_name,
				email: data.email ?? null,
				phone: data.phone ?? null,
				memberId: data.member_id ?? null,
				taxReceiptEnabled: data.tax_receipt_enabled ?? false
			});
		},
		teardown: teardownById("giving_donors")
	}),
	giving_campaigns: defineFactory({
		inputSchema: objectType({
			id,
			org_id: orgId,
			name: stringType(),
			purpose: optionalString,
			fund: optionalString,
			target_amount_cents: numberType().int().optional(),
			/** offsets relatifs au seeding (jours). */
			startDaysOffset: numberType().int().optional(),
			endDaysOffset: numberType().int().optional(),
			status: enumType([
				"ACTIVE",
				"CLOSED",
				"DRAFT"
			]).optional()
		}),
		async create(data) {
			return writeGivingCampaign({
				id: data.id,
				orgId: data.org_id,
				name: data.name,
				purpose: data.purpose ?? null,
				fund: data.fund ?? null,
				targetAmountCents: data.target_amount_cents ?? 0,
				startDate: offsetDate(data.startDaysOffset ?? 0),
				endDate: offsetDate(data.endDaysOffset ?? 0),
				status: data.status ?? "ACTIVE"
			});
		},
		teardown: teardownById("giving_campaigns")
	}),
	pledges: defineFactory({
		inputSchema: objectType({
			id,
			org_id: orgId,
			campaign_id: orgId,
			donor_id: orgId,
			pledged_amount_cents: numberType().int(),
			schedule: enumType([
				"ONCE",
				"MONTHLY",
				"WEEKLY",
				"ANNUAL"
			]).optional(),
			amount_per_period_cents: numberType().int().optional(),
			status: enumType([
				"ACTIVE",
				"PAID",
				"CANCELLED"
			]).optional()
		}),
		async create(data) {
			return writePledge({
				id: data.id,
				orgId: data.org_id,
				campaignId: data.campaign_id,
				donorId: data.donor_id,
				pledgedAmountCents: data.pledged_amount_cents,
				schedule: data.schedule ?? "ONCE",
				amountPerPeriodCents: data.amount_per_period_cents ?? 0,
				status: data.status ?? "ACTIVE"
			});
		},
		teardown: teardownById("pledges")
	}),
	tax_receipts: defineFactory({
		inputSchema: objectType({
			id,
			org_id: orgId,
			donor_id: orgId,
			year: numberType().int(),
			receipt_no: stringType(),
			total_amount_cents: numberType().int().optional(),
			issuedDaysOffset: numberType().int().optional()
		}),
		async create(data) {
			return writeTaxReceipt({
				id: data.id,
				orgId: data.org_id,
				donorId: data.donor_id,
				year: data.year,
				receiptNo: data.receipt_no,
				totalAmountCents: data.total_amount_cents ?? 0,
				issuedAt: offsetDate(data.issuedDaysOffset ?? 0)
			});
		},
		teardown: teardownById("tax_receipts")
	}),
	transaction_giving: defineFactory({
		inputSchema: objectType({
			id,
			org_id: orgId,
			transaction_id: orgId,
			donor_id: orgId,
			campaign_id: optionalString
		}),
		async create(data) {
			return writeTransactionGiving({
				id: data.id,
				orgId: data.org_id,
				transactionId: data.transaction_id,
				donorId: data.donor_id,
				campaignId: data.campaign_id ?? null
			});
		},
		teardown: teardownById("transaction_giving")
	}),
	invitations: defineFactory({
		inputSchema: objectType({
			id,
			org_id: orgId,
			code: stringType(),
			target_role: stringType(),
			target_scope_type: enumType([
				"ORG",
				"GROUP",
				"RESOURCE"
			]).optional(),
			target_group_id: optionalString,
			issued_by: stringType().optional(),
			/** jours relatifs au seeding (7 = dans 7 jours). */
			expiresDaysOffset: numberType().int().optional(),
			max_uses: numberType().int().optional(),
			status: enumType([
				"ACTIVE",
				"EXPIRED",
				"REVOKED"
			]).optional()
		}),
		async create(data) {
			const r = await writeInvitation({
				id: slugToUuid(data.id),
				orgId: data.org_id,
				code: data.code,
				targetRole: data.target_role,
				targetScopeType: data.target_scope_type ?? "ORG",
				targetGroupId: data.target_group_id ? slugToUuid(data.target_group_id) : null,
				issuedBy: data.issued_by ?? "autonoma",
				expiresAt: offsetDate(data.expiresDaysOffset ?? 30),
				maxUses: data.max_uses ?? 1
			});
			if (data.status && data.status !== "ACTIVE") await pgExecute(`UPDATE invitations SET status = ? WHERE id = ?`, [data.status, r.id]);
			return {
				...r,
				id: data.id,
				internalId: r.id
			};
		},
		teardown: teardownByInternal("invitations")
	}),
	invitation_claims: defineFactory({
		inputSchema: objectType({
			id,
			invitation_id: orgId,
			status: enumType([
				"PENDING_SYNC",
				"CONFIRMED",
				"REJECTED"
			]).optional(),
			/** jours relatifs au seeding (négatif = passé). */
			claimedDaysOffset: numberType().int().optional(),
			claimed_by_device_id: optionalString,
			resulting_user_id: optionalString
		}),
		async create(data) {
			const r = await writeInvitationClaim({
				id: slugToUuid(data.id),
				invitationId: slugToUuid(data.invitation_id),
				claimedByDeviceId: data.claimed_by_device_id ?? null,
				resultingUserId: data.resulting_user_id ? slugToUuid(data.resulting_user_id) : null,
				status: data.status ?? "PENDING_SYNC"
			});
			if (data.claimedDaysOffset !== void 0) await pgExecute(`UPDATE invitation_claims SET claimed_at = ? WHERE id = ?`, [offsetDate(data.claimedDaysOffset), r.id]);
			return {
				...r,
				id: data.id,
				internalId: r.id
			};
		},
		teardown: teardownByInternal("invitation_claims")
	}),
	notifications: defineFactory({
		inputSchema: objectType({
			org_id: orgId,
			action_type: stringType(),
			title: stringType(),
			message: stringType(),
			is_read: booleanType().optional(),
			source_transaction_id: optionalString
		}),
		async create(data) {
			return {
				...await writeNotification({
					orgId: data.org_id,
					actionType: data.action_type,
					title: data.title,
					message: data.message,
					sourceTransactionId: data.source_transaction_id ?? null,
					isRead: data.is_read ?? false
				}),
				org_id: data.org_id
			};
		},
		teardown: teardownById("notifications")
	}),
	audit_entries: defineFactory({
		inputSchema: objectType({
			id,
			org_id: orgId,
			action: stringType(),
			entity_type: stringType(),
			entity_id: stringType(),
			actor_role_at_time: optionalString,
			transaction_id: optionalString,
			comment: optionalString
		}),
		async create(data) {
			return writeAuditEntry({
				id: data.id,
				orgId: data.org_id,
				transactionId: data.transaction_id ?? null,
				userId: slugToUuid("seed-user"),
				actorRoleAtTime: data.actor_role_at_time ?? null,
				action: data.action,
				entityType: data.entity_type,
				entityId: data.entity_id,
				beforeState: null,
				afterState: null,
				comment: data.comment ?? null
			});
		},
		teardown: teardownById("audit_entries")
	}),
	role_assignments: defineFactory({
		inputSchema: objectType({
			session_id: stringType(),
			role: stringType(),
			org_id: orgId
		}),
		async create(data) {
			return {
				...await writeRoleAssignment({
					orgId: data.org_id,
					role: data.role,
					sessionId: data.session_id
				}),
				org_id: data.org_id
			};
		},
		teardown: teardownById("role_assignments")
	}),
	report_definitions: defineFactory({
		inputSchema: objectType({
			id,
			org_id: orgId,
			name: stringType(),
			data_source: stringType(),
			is_template: booleanType().optional(),
			dimensions: arrayType(stringType()).optional(),
			metrics: arrayType(stringType()).optional(),
			group_by: arrayType(stringType()).optional()
		}),
		async create(data) {
			return writeReportDefinition({
				id: data.id,
				orgId: data.org_id,
				name: data.name,
				dataSource: data.data_source,
				dimensions: data.dimensions ?? [],
				metrics: data.metrics ?? [],
				groupBy: data.group_by ?? [],
				isTemplate: data.is_template ?? false
			});
		},
		teardown: teardownById("report_definitions")
	}),
	form_definitions: defineFactory({
		inputSchema: objectType({
			id,
			org_id: orgId,
			key: stringType(),
			name: stringType(),
			status: enumType([
				"DRAFT",
				"PUBLISHED",
				"ARCHIVED"
			]).optional(),
			fields: arrayType(unknownType()).optional()
		}),
		async create(data) {
			return writeFormDefinition({
				id: data.id,
				orgId: data.org_id,
				key: data.key,
				name: data.name,
				status: data.status ?? "DRAFT",
				fields: data.fields ?? []
			});
		},
		teardown: teardownById("form_definitions")
	}),
	form_submissions: defineFactory({
		inputSchema: objectType({
			id,
			org_id: orgId,
			form_definition_id: orgId,
			submitted_by: stringType(),
			status: enumType([
				"SUBMITTED",
				"PROCESSED",
				"REJECTED"
			]).optional(),
			form_version: numberType().int().optional(),
			data: recordType(unknownType()).optional()
		}),
		async create(data) {
			return writeFormSubmission({
				id: data.id,
				orgId: data.org_id,
				formDefinitionId: data.form_definition_id,
				formVersion: data.form_version ?? 1,
				submittedBy: data.submitted_by,
				data: data.data ?? {},
				status: data.status ?? "SUBMITTED"
			});
		},
		teardown: teardownById("form_submissions")
	}),
	custom_field_definitions: defineFactory({
		inputSchema: objectType({
			id,
			org_id: orgId,
			entity_type: stringType(),
			key: stringType(),
			label: stringType(),
			type: stringType(),
			options: arrayType(stringType()).optional()
		}),
		async create(data) {
			return writeCustomFieldDefinition({
				id: data.id,
				orgId: data.org_id,
				entityType: data.entity_type,
				key: data.key,
				label: data.label,
				type: data.type,
				options: data.options ?? null
			});
		},
		teardown: teardownById("custom_field_definitions")
	}),
	custom_field_values: defineFactory({
		inputSchema: objectType({
			id,
			entity_type: stringType(),
			entity_id: stringType(),
			custom_field_definition_id: stringType(),
			value: unknownType()
		}),
		async create(data) {
			return writeCustomFieldValue({
				id: data.id,
				entityType: data.entity_type,
				entityId: data.entity_id,
				definitionId: data.custom_field_definition_id,
				value: data.value
			});
		},
		teardown: teardownById("custom_field_values")
	}),
	tags: defineFactory({
		inputSchema: objectType({
			org_id: orgId,
			name: stringType(),
			description: optionalString
		}),
		async create(data) {
			return {
				...await writeTag({
					orgId: data.org_id,
					name: data.name,
					description: data.description ?? null
				}),
				org_id: data.org_id
			};
		},
		teardown: teardownById("tags")
	}),
	tag_assignments: defineFactory({
		inputSchema: objectType({
			tag_id: orgId,
			user_id: orgId,
			org_id: orgId,
			assigned_by: optionalString
		}),
		async create(data) {
			return {
				...await writeTagAssignment({
					tagId: slugToUuid(data.tag_id),
					userId: slugToUuid(data.user_id),
					orgId: data.org_id,
					assignedBy: data.assigned_by ? slugToUuid(data.assigned_by) : slugToUuid("seed-user")
				}),
				tag_id: data.tag_id,
				user_id: data.user_id,
				org_id: data.org_id
			};
		},
		teardown: teardownById("tag_assignments")
	}),
	grants: defineFactory({
		inputSchema: objectType({
			subject_type: enumType([
				"role",
				"user",
				"org_member",
				"group_member",
				"tag"
			]),
			subject_id: stringType(),
			resource: stringType(),
			action: stringType(),
			scope_resource: optionalString,
			scope_id: optionalString,
			granted_by: optionalString
		}),
		async create(data) {
			return {
				...await writeGrant({
					subjectType: data.subject_type,
					subjectId: data.subject_id,
					resource: data.resource,
					action: data.action,
					scopeResource: data.scope_resource ?? null,
					scopeId: data.scope_id ?? null,
					grantedBy: data.granted_by ? slugToUuid(data.granted_by) : null
				}),
				subject_type: data.subject_type,
				subject_id: data.subject_id
			};
		},
		teardown: teardownById("grants")
	})
};
//#endregion
//#region server/autonoma/auth.ts
async function autonomaAuth(user, _context) {
	return { credentials: {
		email: user?.email ?? process.env.AUTONOMA_TEST_EMAIL ?? "",
		password: process.env.AUTONOMA_TEST_PASSWORD ?? ""
	} };
}
//#endregion
//#region server/middleware/autonoma.ts
/**
* Autonoma SDK handler — Environment Factory
*
* Le planificateur Autonoma pilote la preview via POST /api/autonoma
* (payload signé HMAC par `AUTONOMA_SHARED_SECRET`, signature du refs
* token par `AUTONOMA_SIGNING_SECRET`). Voir
* docs/plans/2026-09-26-lumina-test-suite-autonoma.md et
* node_modules/@autonoma-ai/server-node/docs/implement.md pour le
* contrat.
*
* Montage : Nitro expose `defineMiddleware` depuis server/middleware/.
* Le handler n'est armé QUE si les secrets sont présents, sinon la
* route renvoie 404 — jamais un endpoint demeuré public.
*
* Les secrets proviennent de l'env Autonoma (AUTONOMA_SHARED_SECRET est
* aussi connu du planner ; AUTONOMA_SIGNING_SECRET est privé). S'ils
* sont absents localement, on dérives le signing secret de manière
* déterministe à partir du shared secret (uniquement pour le dev local,
* jamais commuté) afin que l'endpoint reste testable.
*/
var sharedSecret = process.env.AUTONOMA_SHARED_SECRET;
var signingSecret = process.env.AUTONOMA_SIGNING_SECRET || createHash("sha256").update(`autonoma-signing:${sharedSecret ?? ""}`).digest("hex");
var handler = sharedSecret ? createNodeHandler({
	scopeField: "orgId",
	sharedSecret,
	signingSecret,
	factories,
	auth: autonomaAuth,
	beforeDown: async () => {
		await closeAutDb();
	}
}) : null;
var autonoma_default = defineMiddleware(async (event) => {
	const req = event.node.req;
	if (req.url !== "/api/autonoma" || req.method !== "POST") return;
	if (!handler) {
		event.node.res.statusCode = 404;
		event.node.res.end();
		return;
	}
	await handler(req, event.node.res);
});
//#endregion
//#region #nitro/virtual/routing
var findRouteRules = /* @__PURE__ */ (() => {
	const $0 = [{
		name: "headers",
		route: "/assets/**",
		handler: headers,
		options: { "cache-control": "public, max-age=31536000, immutable" }
	}];
	return (m, p) => {
		let r = [];
		if (p.charCodeAt(p.length - 1) === 47) p = p.slice(0, -1) || "/";
		let s = p.split("/");
		if (s.length > 1) {
			if (s[1] === "assets") r.unshift({
				data: $0,
				params: { "_": s.slice(2).join("/") }
			});
		}
		return r;
	};
})();
var _lazy_nvx8Dx = defineLazyEventHandler(() => import("./_chunks/renderer-template.mjs"));
var findRoute = /* @__PURE__ */ (() => {
	const data = {
		route: "/**",
		handler: _lazy_nvx8Dx
	};
	return ((_m, p) => {
		return {
			data,
			params: { "_": p.slice(1) }
		};
	});
})();
var globalMiddleware = [toEventHandler(static_default), toEventHandler(autonoma_default)].filter(Boolean);
//#endregion
//#region node_modules/.pnpm/nitro@3.0.260610-beta_jiti@_f054ebf3b994581339357de98dfa56d4/node_modules/nitro/dist/runtime/internal/error/prod.mjs
var errorHandler = (error, event) => {
	const res = defaultHandler(error, event);
	return new NodeResponse(typeof res.body === "string" ? res.body : JSON.stringify(res.body, null, 2), res);
};
function defaultHandler(error, event) {
	const unhandled = error.unhandled ?? !HTTPError.isError(error);
	const { status = 500, statusText = "" } = unhandled ? {} : error;
	if (status === 404) {
		const url = event.url || new URL(event.req.url);
		const baseURL = "/";
		if (/^\/[^/]/.test(baseURL) && !url.pathname.startsWith(baseURL)) return {
			status: 302,
			headers: new Headers({ location: `${baseURL}${url.pathname.slice(1)}${url.search}` })
		};
	}
	const headers = new Headers(unhandled ? {} : error.headers);
	headers.set("content-type", "application/json; charset=utf-8");
	return {
		status,
		statusText,
		headers,
		body: {
			error: true,
			...unhandled ? {
				status,
				unhandled: true
			} : typeof error.toJSON === "function" ? error.toJSON() : {
				status,
				statusText,
				message: error.message
			}
		}
	};
}
//#endregion
//#region #nitro/virtual/error-handler
var errorHandlers = [errorHandler];
async function error_handler_default(error, event) {
	for (const handler of errorHandlers) try {
		const response = await handler(error, event, { defaultHandler });
		if (response) return response;
	} catch (error) {
		console.error(error);
	}
}
//#endregion
//#region #nitro/virtual/app
function createNitroApp() {
	const captureError = (error, errorCtx) => {
		if (errorCtx?.event) {
			const errors = errorCtx.event.req.context?.nitro?.errors;
			if (errors) errors.push({
				error,
				context: errorCtx
			});
		}
	};
	const h3App = createH3App({ onError(error, event) {
		return error_handler_default(error, event);
	} });
	let appHandler = (req) => {
		req.context ||= {};
		req.context.nitro = req.context.nitro || { errors: [] };
		return h3App.fetch(req);
	};
	return {
		fetch: appHandler,
		h3: h3App,
		hooks: void 0,
		captureError
	};
}
function createH3App(config) {
	const h3App = new H3Core(config);
	h3App["~findRoute"] = (event) => findRoute(event.req.method, event.url.pathname);
	h3App["~middleware"].push(...globalMiddleware);
	h3App["~getMiddleware"] = (event, route) => {
		const pathname = event.url.pathname;
		const method = event.req.method;
		const middleware = [];
		const routeRules = getRouteRules(method, pathname);
		event.context.routeRules = routeRules?.routeRules;
		if (routeRules?.routeRuleMiddleware.length) middleware.push(...routeRules.routeRuleMiddleware);
		middleware.push(...h3App["~middleware"]);
		if (route?.data?.middleware?.length) middleware.push(...route.data.middleware);
		return middleware;
	};
	return h3App;
}
//#endregion
//#region node_modules/.pnpm/nitro@3.0.260610-beta_jiti@_f054ebf3b994581339357de98dfa56d4/node_modules/nitro/dist/runtime/internal/app.mjs
var APP_ID = "default";
function useNitroApp() {
	let instance = useNitroApp._instance;
	if (instance) return instance;
	instance = useNitroApp._instance = createNitroApp();
	globalThis.__nitro__ = globalThis.__nitro__ || {};
	globalThis.__nitro__[APP_ID] = instance;
	return instance;
}
function getRouteRules(method, pathname) {
	const m = findRouteRules(method, pathname);
	if (!m?.length) return { routeRuleMiddleware: [] };
	const routeRules = {};
	for (const layer of m) for (const rule of layer.data) {
		const currentRule = routeRules[rule.name];
		if (currentRule) {
			if (rule.options === false) {
				delete routeRules[rule.name];
				continue;
			}
			if (typeof currentRule.options === "object" && typeof rule.options === "object") currentRule.options = {
				...currentRule.options,
				...rule.options
			};
			else currentRule.options = rule.options;
			currentRule.route = rule.route;
			currentRule.params = {
				...currentRule.params,
				...layer.params
			};
		} else if (rule.options !== false) routeRules[rule.name] = {
			...rule,
			params: layer.params
		};
	}
	const middleware = [];
	const orderedRules = Object.values(routeRules).sort((a, b) => (a.handler?.order || 0) - (b.handler?.order || 0));
	for (const rule of orderedRules) {
		if (rule.options === false || !rule.handler) continue;
		middleware.push(rule.handler(rule));
	}
	return {
		routeRules,
		routeRuleMiddleware: middleware
	};
}
//#endregion
//#region node_modules/.pnpm/nitro@3.0.260610-beta_jiti@_f054ebf3b994581339357de98dfa56d4/node_modules/nitro/dist/runtime/internal/error/hooks.mjs
function _captureError(error, type) {
	console.error(`[${type}]`, error);
	useNitroApp().captureError?.(error, { tags: [type] });
}
function trapUnhandledErrors() {
	process.on("unhandledRejection", (error) => _captureError(error, "unhandledRejection"));
	process.on("uncaughtException", (error) => _captureError(error, "uncaughtException"));
}
//#endregion
//#region #nitro/virtual/tracing
var tracingSrvxPlugins = [];
//#endregion
//#region node_modules/.pnpm/nitro@3.0.260610-beta_jiti@_f054ebf3b994581339357de98dfa56d4/node_modules/nitro/dist/presets/node/runtime/node-server.mjs
var _parsedPort = Number.parseInt(process.env.NITRO_PORT ?? process.env.PORT ?? "");
var port = Number.isNaN(_parsedPort) ? 3e3 : _parsedPort;
var host = process.env.NITRO_HOST || process.env.HOST;
var cert = process.env.NITRO_SSL_CERT;
var key = process.env.NITRO_SSL_KEY;
var nitroApp = useNitroApp();
serve({
	port,
	hostname: host,
	tls: cert && key ? {
		cert,
		key
	} : void 0,
	fetch: nitroApp.fetch,
	plugins: [...tracingSrvxPlugins]
});
trapUnhandledErrors();
var node_server_default = {};
//#endregion
export { node_server_default as default };
