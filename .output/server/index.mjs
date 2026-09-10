globalThis.__nitro_main__ = import.meta.url;
import { _ as NodeResponse, a as defineEventHandler, g as toEventHandler, h as setHeader, i as createError, l as getCookie, n as HTTPError, o as defineHandler, s as defineLazyEventHandler, t as H3Core, u as getHeader, v as serve } from "./_libs/h3+rou3+srvx.mjs";
import { t as HookableCore } from "./_libs/hookable.mjs";
import { i as withoutTrailingSlash, n as joinURL, r as withLeadingSlash, t as decodePath } from "./_libs/ufo.mjs";
import { randomBytes } from "node:crypto";
import { promises } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
//#region node_modules/.pnpm/nitro@3.0.260610-beta_jiti@_91cbdd4e5e955b08c2904203236226d4/node_modules/nitro/dist/runtime/internal/route-rules.mjs
var headers = ((m) => function headersRouteRule(event) {
	for (const [key, value] of Object.entries(m.options || {})) event.res.headers.set(key, value);
});
//#endregion
//#region #nitro/virtual/public-assets-data
var public_assets_data_default = {
	"/lumina-logo.png": {
		"type": "image/png",
		"etag": "\"c2ce-Xrm5OeE6Rcs4GqYh+OFZRZQyAYE\"",
		"mtime": "2026-09-04T20:43:25.384Z",
		"size": 49870,
		"path": "../public/lumina-logo.png"
	},
	"/favicon.ico": {
		"type": "image/vnd.microsoft.icon",
		"etag": "\"15f09-4MFHRo4azA6knOGNmsefGO+QUAE\"",
		"mtime": "2026-09-01T22:18:50.675Z",
		"size": 89865,
		"path": "../public/favicon.ico"
	},
	"/placeholder.svg": {
		"type": "image/svg+xml",
		"etag": "\"cb5-3cfZ/x0uNhX4kurZGAkOBE4K/G0\"",
		"mtime": "2026-09-01T22:18:50.682Z",
		"size": 3253,
		"path": "../public/placeholder.svg"
	},
	"/manifest.json": {
		"type": "application/json",
		"etag": "\"1eb-Y7kttYgCEPOR8HGHYsGcvSqM47M\"",
		"mtime": "2026-09-02T17:13:42.999Z",
		"size": 491,
		"path": "../public/manifest.json"
	},
	"/assets/AccessHandlePoolVFS-D0f3miq-.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f0f-0xu0T0qe9nQVWpZZwJ1eqm7BON0\"",
		"mtime": "2026-09-10T07:17:37.516Z",
		"size": 3855,
		"path": "../public/assets/AccessHandlePoolVFS-D0f3miq-.js"
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
		"mtime": "2026-09-10T07:17:38.585Z",
		"size": 3842,
		"path": "../public/assets/AccessHandlePoolVFS-k-bp0HG6.js"
	},
	"/assets/Archives-BR608VI2.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1368-SPzCvm7iD/DDjzUhIFDE3h3HPy0\"",
		"mtime": "2026-09-10T07:17:37.516Z",
		"size": 4968,
		"path": "../public/assets/Archives-BR608VI2.js"
	},
	"/assets/arrow-down-right-DSi1TGgs.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"9c-LRsUjrXZxtQlab5YMPTsydbSixw\"",
		"mtime": "2026-09-10T07:17:37.896Z",
		"size": 156,
		"path": "../public/assets/arrow-down-right-DSi1TGgs.js"
	},
	"/assets/arrow-left-DKVXwmr_.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"99-AOncEpIne0nFa1xDisTOe4hNevs\"",
		"mtime": "2026-09-10T07:17:37.896Z",
		"size": 153,
		"path": "../public/assets/arrow-left-DKVXwmr_.js"
	},
	"/assets/AreaChart-CLIj1qXe.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5ca96-1OHLhN+O1irhKbdkNtCgsLprrhQ\"",
		"mtime": "2026-09-10T07:17:37.518Z",
		"size": 379542,
		"path": "../public/assets/AreaChart-CLIj1qXe.js"
	},
	"/assets/arrow-up-B-JsvQf3.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"105-x3268cOoqAN/1Xn6AV5VPL2dlQQ\"",
		"mtime": "2026-09-10T07:17:37.900Z",
		"size": 261,
		"path": "../public/assets/arrow-up-B-JsvQf3.js"
	},
	"/assets/arrow-up-right-yRmNv5MM.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"9a-uFRKD3wcfQ/gOOYpe1JS6D5V5yQ\"",
		"mtime": "2026-09-10T07:17:37.900Z",
		"size": 154,
		"path": "../public/assets/arrow-up-right-yRmNv5MM.js"
	},
	"/assets/Balance-QUfTzBgP.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"260e-N3LHrU6j8TWu/oPGiGpWPZkO2vw\"",
		"mtime": "2026-09-10T07:17:37.518Z",
		"size": 9742,
		"path": "../public/assets/Balance-QUfTzBgP.js"
	},
	"/assets/book-open-D_nSKeXx.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"10b-GqXlVbFXIn16b9Th2Yygc42jIXQ\"",
		"mtime": "2026-09-10T07:17:37.900Z",
		"size": 267,
		"path": "../public/assets/book-open-D_nSKeXx.js"
	},
	"/assets/BottomNav-BsDNWK9z.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1cbb-8WuzygYwajHMjJITnWslvyvEG6U\"",
		"mtime": "2026-09-10T07:17:37.520Z",
		"size": 7355,
		"path": "../public/assets/BottomNav-BsDNWK9z.js"
	},
	"/assets/building-2-B9ulg5T-.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1ab-MCLF7BepQnyBlxE4l3uCLShiFCg\"",
		"mtime": "2026-09-10T07:17:37.916Z",
		"size": 427,
		"path": "../public/assets/building-2-B9ulg5T-.js"
	},
	"/assets/calendar-BcbEJPlo.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f6-/LlqaCF+OI+jDqLYCO3Ne6n4T5Q\"",
		"mtime": "2026-09-10T07:17:37.916Z",
		"size": 246,
		"path": "../public/assets/calendar-BcbEJPlo.js"
	},
	"/assets/chevron-right-0Px5jcpw.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"76-n2YAdWKUxMN/XqgO/89phgeBFZ4\"",
		"mtime": "2026-09-10T07:17:37.918Z",
		"size": 118,
		"path": "../public/assets/chevron-right-0Px5jcpw.js"
	},
	"/assets/circle-alert-DNDFpr7O.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"ee-3KaMaQzkt/n9a9BtvRGnH3VO6GM\"",
		"mtime": "2026-09-10T07:17:37.918Z",
		"size": 238,
		"path": "../public/assets/circle-alert-DNDFpr7O.js"
	},
	"/assets/circle-check-big-CHoexk4e.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"b5-2Iw4GHKzFhN++x5A6f0poPqHjso\"",
		"mtime": "2026-09-10T07:17:38.033Z",
		"size": 181,
		"path": "../public/assets/circle-check-big-CHoexk4e.js"
	},
	"/assets/circle-plus-PbpsGO_6.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"c3-fp7kmcGvvi+xHlW+R6VN5kFJ7rA\"",
		"mtime": "2026-09-10T07:17:38.037Z",
		"size": 195,
		"path": "../public/assets/circle-plus-PbpsGO_6.js"
	},
	"/assets/circle-x-S-UJyp7e.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"c3-o4tiqnRWqCEwy/HP/9z2sbI1lYc\"",
		"mtime": "2026-09-10T07:17:38.037Z",
		"size": 195,
		"path": "../public/assets/circle-x-S-UJyp7e.js"
	},
	"/assets/clock-BZVRGcYN.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"ac-lg8F4BVOo0TmJ1qgEh9YmBIj7rc\"",
		"mtime": "2026-09-10T07:17:38.039Z",
		"size": 172,
		"path": "../public/assets/clock-BZVRGcYN.js"
	},
	"/assets/Cotisations-BFQa4EsI.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"14ac-qBu92tQuSMuVo3vNkBSQILaDHD8\"",
		"mtime": "2026-09-10T07:17:37.524Z",
		"size": 5292,
		"path": "../public/assets/Cotisations-BFQa4EsI.js"
	},
	"/assets/CulteDetail-BvPbUDPD.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2559-Rw18Tt/RSYBO1b1ifcLtLyx+tXs\"",
		"mtime": "2026-09-10T07:17:37.526Z",
		"size": 9561,
		"path": "../public/assets/CulteDetail-BvPbUDPD.js"
	},
	"/assets/CustomFields-BcwJuDkr.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1c2a-HQYR0kyafOPVkKybDEBkR4Flnl0\"",
		"mtime": "2026-09-10T07:17:37.526Z",
		"size": 7210,
		"path": "../public/assets/CustomFields-BcwJuDkr.js"
	},
	"/assets/Dashboard-CcET_dWR.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4313-1n0XGbFIVD5i12bgBCSAwLyXW6Y\"",
		"mtime": "2026-09-10T07:17:37.526Z",
		"size": 17171,
		"path": "../public/assets/Dashboard-CcET_dWR.js"
	},
	"/assets/database-DHbwva2x.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"e8-2STVDOfx3BxUb7ICVVBz31VVmt0\"",
		"mtime": "2026-09-10T07:17:38.039Z",
		"size": 232,
		"path": "../public/assets/database-DHbwva2x.js"
	},
	"/assets/EventDetail-B2bPwvmA.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5352-LlDJKu3HxYekmdjKWtGREG2/7vo\"",
		"mtime": "2026-09-10T07:17:37.528Z",
		"size": 21330,
		"path": "../public/assets/EventDetail-B2bPwvmA.js"
	},
	"/assets/EventEdit-DGRlhApu.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"147c-5bdUGj6YwieuVd/8A6G9cbUR76A\"",
		"mtime": "2026-09-10T07:17:37.528Z",
		"size": 5244,
		"path": "../public/assets/EventEdit-DGRlhApu.js"
	},
	"/assets/EventNew-C7sMFWn-.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1f85-PR3VIzbcVZzD3oCZzEj/WLPt/gI\"",
		"mtime": "2026-09-10T07:17:37.530Z",
		"size": 8069,
		"path": "../public/assets/EventNew-C7sMFWn-.js"
	},
	"/assets/Events-CJ5vz_Oc.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"12b0-dQmMkI/McBmPfu6Vzd7F/nmpBBM\"",
		"mtime": "2026-09-10T07:17:37.530Z",
		"size": 4784,
		"path": "../public/assets/Events-CJ5vz_Oc.js"
	},
	"/assets/FacadeVFS-BEICR2q0.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1871-h2JM49n3k6wsMKWYG0w5CCQNUNY\"",
		"mtime": "2026-09-10T07:17:38.587Z",
		"size": 6257,
		"path": "../public/assets/FacadeVFS-BEICR2q0.js"
	},
	"/assets/FacadeVFS-CrVCqJdy.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1870-2WzPNvNGI54Qqe8J9b+esh7jA9o\"",
		"mtime": "2026-09-10T07:17:37.530Z",
		"size": 6256,
		"path": "../public/assets/FacadeVFS-CrVCqJdy.js"
	},
	"/assets/Finance-2BlKZLxT.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1be6-KtAlPFd57kYcjSNUdhpaE0lbQ+k\"",
		"mtime": "2026-09-10T07:17:37.532Z",
		"size": 7142,
		"path": "../public/assets/Finance-2BlKZLxT.js"
	},
	"/assets/FormBuilder-CjpiUAVv.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1fb5-q449UkFNM2owNnmPp8SWLo5uj08\"",
		"mtime": "2026-09-10T07:17:37.532Z",
		"size": 8117,
		"path": "../public/assets/FormBuilder-CjpiUAVv.js"
	},
	"/assets/FormFill-XKpWOZXr.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"11f6-eg1zTgZJ7egxcRPYIzeOr0HFZfk\"",
		"mtime": "2026-09-10T07:17:37.542Z",
		"size": 4598,
		"path": "../public/assets/FormFill-XKpWOZXr.js"
	},
	"/assets/formSystem-Dqd-2Bp8.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"7ee-dkWAxkC3VI7vLlGYs9P4FAZomiE\"",
		"mtime": "2026-09-10T07:17:38.044Z",
		"size": 2030,
		"path": "../public/assets/formSystem-Dqd-2Bp8.js"
	},
	"/assets/Groups-DyOrErmv.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"23be-HLBNb731/gfU2dZ02gqWBBCmGgA\"",
		"mtime": "2026-09-10T07:17:37.544Z",
		"size": 9150,
		"path": "../public/assets/Groups-DyOrErmv.js"
	},
	"/assets/GroupDetail-Dgk763i5.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"544d-xkHhi7DHlaSwOhwncKy2QbzoU30\"",
		"mtime": "2026-09-10T07:17:37.543Z",
		"size": 21581,
		"path": "../public/assets/GroupDetail-Dgk763i5.js"
	},
	"/assets/Help-CN0XOrcs.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"bfa-qlQQZ6VzTLC+dZ843Qg6qU02AtQ\"",
		"mtime": "2026-09-10T07:17:37.544Z",
		"size": 3066,
		"path": "../public/assets/Help-CN0XOrcs.js"
	},
	"/assets/History-TXtH79it.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2e9c-MGdmspWGstyIFOKHAqt56qhoi5g\"",
		"mtime": "2026-09-10T07:17:37.546Z",
		"size": 11932,
		"path": "../public/assets/History-TXtH79it.js"
	},
	"/assets/IDBBatchAtomicVFS-BPbZmQ0i.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"32ae-S/ARgaSvOc79y0gwa556cW/uFxM\"",
		"mtime": "2026-09-10T07:17:37.548Z",
		"size": 12974,
		"path": "../public/assets/IDBBatchAtomicVFS-BPbZmQ0i.js"
	},
	"/assets/IDBBatchAtomicVFS-DOQZPx-g.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"32a2-6ppgZuTXuQvYK+HVWuYHmxtHCa0\"",
		"mtime": "2026-09-10T07:17:38.587Z",
		"size": 12962,
		"path": "../public/assets/IDBBatchAtomicVFS-DOQZPx-g.js"
	},
	"/assets/html2canvas-DCcDvdvP.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"30b50-/NW/tvs1950d+adFAmG+0O5qROc\"",
		"mtime": "2026-09-10T07:17:38.047Z",
		"size": 199504,
		"path": "../public/assets/html2canvas-DCcDvdvP.js"
	},
	"/assets/index-CRLCtC85.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"10c9a-Cv+0r4I7SU0VM22K6D1YeIFfG7E\"",
		"mtime": "2026-09-10T07:17:38.575Z",
		"size": 68762,
		"path": "../public/assets/index-CRLCtC85.css"
	},
	"/assets/export-Bpkz6jgl.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"af2e1-oWXbT3pyfPXb7jnmClViT5AHq6I\"",
		"mtime": "2026-09-10T07:17:38.043Z",
		"size": 717537,
		"path": "../public/assets/export-Bpkz6jgl.js"
	},
	"/assets/index-DwWC2k7-.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"c10af-XeQTDifaad7s+vVUjp1WaxU9Hyk\"",
		"mtime": "2026-09-10T07:17:37.514Z",
		"size": 790703,
		"path": "../public/assets/index-DwWC2k7-.js"
	},
	"/assets/dist-G7PDzus1.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"10d069-4aOm1fXTuRa6p2kFYxdBUgiv+4c\"",
		"mtime": "2026-09-10T07:17:38.041Z",
		"size": 1101929,
		"path": "../public/assets/dist-G7PDzus1.js"
	},
	"/assets/index.es-B7t3btqi.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"24f91-dFFSxmuMECL5mQbz/GuxL+RQ5Lk\"",
		"mtime": "2026-09-10T07:17:38.086Z",
		"size": 151441,
		"path": "../public/assets/index.es-B7t3btqi.js"
	},
	"/assets/invitation-DMvYmp1h.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"12ae-C+35sHVF1HviqQy2BSj5Kx4rcJM\"",
		"mtime": "2026-09-10T07:17:38.086Z",
		"size": 4782,
		"path": "../public/assets/invitation-DMvYmp1h.js"
	},
	"/assets/InvitationClaim-Bbfe-Lfi.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"7b4db-Xheai2dmN72OoEflO8Xxr79Pdaw\"",
		"mtime": "2026-09-10T07:17:37.560Z",
		"size": 505051,
		"path": "../public/assets/InvitationClaim-Bbfe-Lfi.js"
	},
	"/assets/InvitationEmit-Ba7hZ8d4.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5861-WpB4Iy+t7ycP11t4v3lWia3O7DI\"",
		"mtime": "2026-09-10T07:17:37.562Z",
		"size": 22625,
		"path": "../public/assets/InvitationEmit-Ba7hZ8d4.js"
	},
	"/assets/InvitationManage-WykKuTQN.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"176c-lz1TJaO5yB3LrtBOWk4Pn/l3cVs\"",
		"mtime": "2026-09-10T07:17:37.566Z",
		"size": 5996,
		"path": "../public/assets/InvitationManage-WykKuTQN.js"
	},
	"/assets/mc-wa-sqlite-async-OK58TZB1.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f9c7-OWgn/LbVfd6oIzizW/33tbyE9i4\"",
		"mtime": "2026-09-10T07:17:38.088Z",
		"size": 63943,
		"path": "../public/assets/mc-wa-sqlite-async-OK58TZB1.js"
	},
	"/assets/mc-wa-sqlite-Dt2CfptV.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"eb0e-ka1IvJlVUyt14/GJnJnIXiNK/CY\"",
		"mtime": "2026-09-10T07:17:38.088Z",
		"size": 60174,
		"path": "../public/assets/mc-wa-sqlite-Dt2CfptV.js"
	},
	"/assets/Members-CVCxfnE-.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1c60-P+1jJxCmhGq4q80v/bnm1FcOQTo\"",
		"mtime": "2026-09-10T07:17:37.566Z",
		"size": 7264,
		"path": "../public/assets/Members-CVCxfnE-.js"
	},
	"/assets/MembreDetail-7MuY_ORB.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"20a1-dLHHGmOD/Td6k9DLEEpNH+1CTq0\"",
		"mtime": "2026-09-10T07:17:37.568Z",
		"size": 8353,
		"path": "../public/assets/MembreDetail-7MuY_ORB.js"
	},
	"/assets/MembresEnAvance-W1y8XBNZ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"d45-YsQPVFTLG/kduqxQbnIpXlGDQhY\"",
		"mtime": "2026-09-10T07:17:37.570Z",
		"size": 3397,
		"path": "../public/assets/MembresEnAvance-W1y8XBNZ.js"
	},
	"/assets/MemoryVFS-DQF4WRTC.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"61c-i2gYtp7yBd03f77k1kJ2TRrrTSQ\"",
		"mtime": "2026-09-10T07:17:38.587Z",
		"size": 1564,
		"path": "../public/assets/MemoryVFS-DQF4WRTC.js"
	},
	"/assets/NotFound-BnKx7OiN.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"39c-lI++yhMZFMZzabm+pNPNRTHAQ5o\"",
		"mtime": "2026-09-10T07:17:37.572Z",
		"size": 924,
		"path": "../public/assets/NotFound-BnKx7OiN.js"
	},
	"/assets/Notifications-CRmKA-To.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1763-bhwtrBeC8CBPZ4ARWq0N6zBDIRg\"",
		"mtime": "2026-09-10T07:17:37.572Z",
		"size": 5987,
		"path": "../public/assets/Notifications-CRmKA-To.js"
	},
	"/assets/Onboarding-D9nTsQ6P.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"34a2-7ZSf/oBK94ZvN8R5IngcSOOOhKY\"",
		"mtime": "2026-09-10T07:17:37.823Z",
		"size": 13474,
		"path": "../public/assets/Onboarding-D9nTsQ6P.js"
	},
	"/assets/OPFSCoopSyncVFS-DATtbZFi.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1dde-35NXNSgW4WGGg2Jx/DvLz8pj/JQ\"",
		"mtime": "2026-09-10T07:17:38.589Z",
		"size": 7646,
		"path": "../public/assets/OPFSCoopSyncVFS-DATtbZFi.js"
	},
	"/assets/OPFSCoopSyncVFS-yEEQ6W1p.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1dea-F8/jRcqxl2YyXZdOM/Az0uf5g0o\"",
		"mtime": "2026-09-10T07:17:37.572Z",
		"size": 7658,
		"path": "../public/assets/OPFSCoopSyncVFS-yEEQ6W1p.js"
	},
	"/assets/OPFSWriteAheadVFS-Dceb9ZfN.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5cf2-6VWvwZq/3kDJah89Fj0JQlYKJAI\"",
		"mtime": "2026-09-10T07:17:38.589Z",
		"size": 23794,
		"path": "../public/assets/OPFSWriteAheadVFS-Dceb9ZfN.js"
	},
	"/assets/MemoryVFS-JMkeyktN.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"61c-PswlbOtx0X0BxfZfbhOx4396A5M\"",
		"mtime": "2026-09-10T07:17:37.570Z",
		"size": 1564,
		"path": "../public/assets/MemoryVFS-JMkeyktN.js"
	},
	"/assets/OPFSWriteAheadVFS-DSU5vbz0.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5cf9-MLjL+NFQ9FGfKyRGwMIxCPq0EYY\"",
		"mtime": "2026-09-10T07:17:37.574Z",
		"size": 23801,
		"path": "../public/assets/OPFSWriteAheadVFS-DSU5vbz0.js"
	},
	"/assets/logo-lumina.png": {
		"type": "image/png",
		"etag": "\"c2ce-Xrm5OeE6Rcs4GqYh+OFZRZQyAYE\"",
		"mtime": "2026-09-03T16:41:02.881Z",
		"size": 49870,
		"path": "../public/assets/logo-lumina.png"
	},
	"/assets/logo.png": {
		"type": "image/png",
		"etag": "\"c2ce-Xrm5OeE6Rcs4GqYh+OFZRZQyAYE\"",
		"mtime": "2026-09-02T09:03:42.946Z",
		"size": 49870,
		"path": "../public/assets/logo.png"
	},
	"/assets/p-1sJ0ZDPe-YkMm5iKi.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"8ed2-6KdNiR6CHzWsfcskhcqF/kG5SYg\"",
		"mtime": "2026-09-10T07:17:38.090Z",
		"size": 36562,
		"path": "../public/assets/p-1sJ0ZDPe-YkMm5iKi.js"
	},
	"/assets/mc-wa-sqlite-DoDpgFfE.wasm": {
		"type": "application/wasm",
		"etag": "\"1405ab-mYFvsN3agcsYu7kHk/nCjgNgqQ8\"",
		"mtime": "2026-09-10T07:17:38.577Z",
		"size": 1312171,
		"path": "../public/assets/mc-wa-sqlite-DoDpgFfE.wasm"
	},
	"/assets/p-5ldEpNdG-6dZfqBTh.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"276c-eLE8B8Pe9lKRYBRZPz3DZQM2vmI\"",
		"mtime": "2026-09-10T07:17:38.090Z",
		"size": 10092,
		"path": "../public/assets/p-5ldEpNdG-6dZfqBTh.js"
	},
	"/assets/p-BMPN55of-C0P_qWS_.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"21a-HGYAvd2qgF1iEwCzq6eCRzodk80\"",
		"mtime": "2026-09-10T07:17:38.159Z",
		"size": 538,
		"path": "../public/assets/p-BMPN55of-C0P_qWS_.js"
	},
	"/assets/p-BmVRXR1y-Qf1gG5of.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3e6-cIzBL2cgY/c+Nd+w1vUUDnL3YhY\"",
		"mtime": "2026-09-10T07:17:38.183Z",
		"size": 998,
		"path": "../public/assets/p-BmVRXR1y-Qf1gG5of.js"
	},
	"/assets/p-BQyuFxYc-BP5sUz4F.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"624-sKMq1g03/KlKcB/qZDlMk1Tk0Qk\"",
		"mtime": "2026-09-10T07:17:38.159Z",
		"size": 1572,
		"path": "../public/assets/p-BQyuFxYc-BP5sUz4F.js"
	},
	"/assets/p-BT9-hMMz-DeoKjx0N.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1ee-rguGWc7rPK2wzL0Vb/AugNuA+fM\"",
		"mtime": "2026-09-10T07:17:38.161Z",
		"size": 494,
		"path": "../public/assets/p-BT9-hMMz-DeoKjx0N.js"
	},
	"/assets/p-BWoa-cki-UpDL1J1V.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"469-MAKOTmbsqUpzRy0RZ0/MkYlxxqE\"",
		"mtime": "2026-09-10T07:17:38.181Z",
		"size": 1129,
		"path": "../public/assets/p-BWoa-cki-UpDL1J1V.js"
	},
	"/assets/p-C-NbvXu4-B9XCdoFH.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"127b-nP1/e4Mh7JXhis9RI1WSxH7S81E\"",
		"mtime": "2026-09-10T07:17:38.183Z",
		"size": 4731,
		"path": "../public/assets/p-C-NbvXu4-B9XCdoFH.js"
	},
	"/assets/p-C09TXohi-BME7HMRv.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"c7c-eBlQFVuVp95kjyeMXHxMBBybRJM\"",
		"mtime": "2026-09-10T07:17:38.189Z",
		"size": 3196,
		"path": "../public/assets/p-C09TXohi-BME7HMRv.js"
	},
	"/assets/p-C4VpVfrJ-B7tOqQiD.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"28b6-z0kccsJcaxrsNNsPUeOkumHk1lc\"",
		"mtime": "2026-09-10T07:17:38.191Z",
		"size": 10422,
		"path": "../public/assets/p-C4VpVfrJ-B7tOqQiD.js"
	},
	"/assets/mc-wa-sqlite-async-DYagSq56.wasm": {
		"type": "application/wasm",
		"etag": "\"263900-YXiey/3Hhr2OVYDVjdLpGtiNQfI\"",
		"mtime": "2026-09-10T07:17:38.579Z",
		"size": 2504960,
		"path": "../public/assets/mc-wa-sqlite-async-DYagSq56.wasm"
	},
	"/assets/p-CG_zZq_I-Bnu5sziO.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3a9-IewWt3kc3BnoWwAVte31wTmqo4k\"",
		"mtime": "2026-09-10T07:17:38.191Z",
		"size": 937,
		"path": "../public/assets/p-CG_zZq_I-Bnu5sziO.js"
	},
	"/assets/p-CWuIRJQN-CpJ4cxhA.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"26e-fZxIO0/B5h4LVezuzSyQ2tIfW08\"",
		"mtime": "2026-09-10T07:17:38.211Z",
		"size": 622,
		"path": "../public/assets/p-CWuIRJQN-CpJ4cxhA.js"
	},
	"/assets/p-D0YpjgON-DuPvRicD.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"15f9-l2t1qtt076m1Azprcw7kb/Qo+DQ\"",
		"mtime": "2026-09-10T07:17:38.211Z",
		"size": 5625,
		"path": "../public/assets/p-D0YpjgON-DuPvRicD.js"
	},
	"/assets/p-D7-vHX0A-M28BuEVW.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4ac-++v6wgkqI6DQPAYjpbKuefeV/jU\"",
		"mtime": "2026-09-10T07:17:38.238Z",
		"size": 1196,
		"path": "../public/assets/p-D7-vHX0A-M28BuEVW.js"
	},
	"/assets/p-qAXsfUff-UrBZGjF-.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"403-VFqIV1qmCBL/QnR1Ulrs6NA9M2s\"",
		"mtime": "2026-09-10T07:17:38.240Z",
		"size": 1027,
		"path": "../public/assets/p-qAXsfUff-UrBZGjF-.js"
	},
	"/assets/p-ZjP4CjeZ-DJ1DGIsW.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"62-xIml61NROF4B1cx8XnHtA30tV1Q\"",
		"mtime": "2026-09-10T07:17:38.240Z",
		"size": 98,
		"path": "../public/assets/p-ZjP4CjeZ-DJ1DGIsW.js"
	},
	"/assets/pen-line-CtVJGMvU.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"10a-ylb0wE8RBCmnAtugDST90tdgOFU\"",
		"mtime": "2026-09-10T07:17:38.242Z",
		"size": 266,
		"path": "../public/assets/pen-line-CtVJGMvU.js"
	},
	"/assets/purify.es-ChwZkWde.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"68bc-bPPRDEosU/Lqj+2Oyi1ue22LViM\"",
		"mtime": "2026-09-10T07:17:38.242Z",
		"size": 26812,
		"path": "../public/assets/purify.es-ChwZkWde.js"
	},
	"/assets/refresh-cw-rPwL2DYP.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"135-6juk42c1hog3hiJQlIFhStRsLtk\"",
		"mtime": "2026-09-10T07:17:38.242Z",
		"size": 309,
		"path": "../public/assets/refresh-cw-rPwL2DYP.js"
	},
	"/assets/ReportBuilder-DEFjuib0.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1eef-MQmcNgfZ0wVii2k589apxC/xR34\"",
		"mtime": "2026-09-10T07:17:37.825Z",
		"size": 7919,
		"path": "../public/assets/ReportBuilder-DEFjuib0.js"
	},
	"/assets/Reports-D1eHqMbe.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2327-xXK3iHPURZAn93NLaSwmE7Lyd1s\"",
		"mtime": "2026-09-10T07:17:37.825Z",
		"size": 8999,
		"path": "../public/assets/Reports-D1eHqMbe.js"
	},
	"/assets/resource-DTkSodk5.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"a4c-WIcbnQMqmj/JxTQyMPI0B6yQeWc\"",
		"mtime": "2026-09-10T07:17:38.244Z",
		"size": 2636,
		"path": "../public/assets/resource-DTkSodk5.js"
	},
	"/assets/RoleSelection-BEZk6b3g.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"108f-JHl9wlDqPGTJrKKO3IV6B5/oO24\"",
		"mtime": "2026-09-10T07:17:37.827Z",
		"size": 4239,
		"path": "../public/assets/RoleSelection-BEZk6b3g.js"
	},
	"/assets/rolldown-runtime-hePW80VL.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2cc-fA8td6k29UVF6JoPfhOPkceTK1M\"",
		"mtime": "2026-09-10T07:17:38.244Z",
		"size": 716,
		"path": "../public/assets/rolldown-runtime-hePW80VL.js"
	},
	"/assets/SaisieRapide-DXIEh5v5.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"228-IrtM4yWJ981vJsoi/gGF3/qth/s\"",
		"mtime": "2026-09-10T07:17:37.827Z",
		"size": 552,
		"path": "../public/assets/SaisieRapide-DXIEh5v5.js"
	},
	"/assets/security-CPHDFpdn.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f33-C2Miy5A4omHBoxpqDaOViatt6kc\"",
		"mtime": "2026-09-10T07:17:38.246Z",
		"size": 3891,
		"path": "../public/assets/security-CPHDFpdn.js"
	},
	"/assets/Settings-Bwji_lqm.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3d07-tjM5tPJFp88YSSlvh9wGG9YYcjQ\"",
		"mtime": "2026-09-10T07:17:37.829Z",
		"size": 15623,
		"path": "../public/assets/Settings-Bwji_lqm.js"
	},
	"/assets/shield-aYMqQtH8.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"105-HP4Xv1uO+LRSAduVX1FVPm0uvSQ\"",
		"mtime": "2026-09-10T07:17:38.246Z",
		"size": 261,
		"path": "../public/assets/shield-aYMqQtH8.js"
	},
	"/assets/Skeleton-Boo03FH4.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"413-hzINXgqpgDD919C2H+NrpZQSyS4\"",
		"mtime": "2026-09-10T07:17:37.829Z",
		"size": 1043,
		"path": "../public/assets/Skeleton-Boo03FH4.js"
	},
	"/assets/tag-DQqV5QdK.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"13b-Y6WGKKM11+52D/qCpWEgJx/MvRE\"",
		"mtime": "2026-09-10T07:17:38.246Z",
		"size": 315,
		"path": "../public/assets/tag-DQqV5QdK.js"
	},
	"/assets/TopHeader-DvExnZ_j.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"75f-K8DwPjswdUkau+SK146fnf+zdwQ\"",
		"mtime": "2026-09-10T07:17:37.829Z",
		"size": 1887,
		"path": "../public/assets/TopHeader-DvExnZ_j.js"
	},
	"/assets/Trace-D4v8ZbKq.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"efa-sGxsOM1RFyBWJqk/D3RrT4A7fDE\"",
		"mtime": "2026-09-10T07:17:37.831Z",
		"size": 3834,
		"path": "../public/assets/Trace-D4v8ZbKq.js"
	},
	"/assets/TransactionCard-CB_zJ_T5.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"a78-cpxA0TlYdmWJRig/mPQ75jMmwH8\"",
		"mtime": "2026-09-10T07:17:37.888Z",
		"size": 2680,
		"path": "../public/assets/TransactionCard-CB_zJ_T5.js"
	},
	"/assets/TransactionDetail-MLJAAcpX.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"24a7-Qp7YQEy1XFrxECi2TWEtUR+YyVA\"",
		"mtime": "2026-09-10T07:17:37.888Z",
		"size": 9383,
		"path": "../public/assets/TransactionDetail-MLJAAcpX.js"
	},
	"/assets/TransactionEdit-DctFLqgz.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1a4e-cVXyE+txBjv7/rf1kmG4xEd/HFY\"",
		"mtime": "2026-09-10T07:17:37.890Z",
		"size": 6734,
		"path": "../public/assets/TransactionEdit-DctFLqgz.js"
	},
	"/assets/TransactionNew-BG0XZaJB.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1a82-CJtp2D4aZ1XAXuHuolnUjkW0GUE\"",
		"mtime": "2026-09-10T07:17:37.890Z",
		"size": 6786,
		"path": "../public/assets/TransactionNew-BG0XZaJB.js"
	},
	"/assets/TransactionNewGroup-CoJvJD1z.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"187a-gJJ28DYd3VIFOhal2E2OfIczGl4\"",
		"mtime": "2026-09-10T07:17:37.892Z",
		"size": 6266,
		"path": "../public/assets/TransactionNewGroup-CoJvJD1z.js"
	},
	"/assets/trash-2-CSh0nUZf.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"15a-qxMEfnw6gmdpdzAbXtGCPyKAuwY\"",
		"mtime": "2026-09-10T07:17:38.248Z",
		"size": 346,
		"path": "../public/assets/trash-2-CSh0nUZf.js"
	},
	"/assets/trending-down-DkIGOtaS.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"c4-K7EIMvQ9pGfKEMpfm5WiwO1fmnE\"",
		"mtime": "2026-09-10T07:17:38.248Z",
		"size": 196,
		"path": "../public/assets/trending-down-DkIGOtaS.js"
	},
	"/assets/trending-up-D-HogU1P.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"c1-cZspXiFZyG16c64oKMvTuD01fiE\"",
		"mtime": "2026-09-10T07:17:38.250Z",
		"size": 193,
		"path": "../public/assets/trending-up-D-HogU1P.js"
	},
	"/assets/Tutorial-Dn2bUmac.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"136b1-G5gvn1FRQoisyIChw2xolILppo4\"",
		"mtime": "2026-09-10T07:17:37.892Z",
		"size": 79537,
		"path": "../public/assets/Tutorial-Dn2bUmac.js"
	},
	"/assets/user-plus-1s0D8j19.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"12a-Z6V2ofK5bawtBo+D2qZxrKAEYQE\"",
		"mtime": "2026-09-10T07:17:38.250Z",
		"size": 298,
		"path": "../public/assets/user-plus-1s0D8j19.js"
	},
	"/assets/Versement-hnETZLXP.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"17b1-Qf4OVcSQiMUTOZ/slhM8mdd8UAY\"",
		"mtime": "2026-09-10T07:17:37.894Z",
		"size": 6065,
		"path": "../public/assets/Versement-hnETZLXP.js"
	},
	"/assets/wa-sqlite-async-L_LSrxrb.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f88f-NGMPNASgtNbzZuH6O9+kt/v29/g\"",
		"mtime": "2026-09-10T07:17:38.292Z",
		"size": 63631,
		"path": "../public/assets/wa-sqlite-async-L_LSrxrb.js"
	},
	"/assets/wa-sqlite-BVXfj7bw.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"e9d6-LFag0v/Myx+4L9KqMw5YED3uQZQ\"",
		"mtime": "2026-09-10T07:17:38.290Z",
		"size": 59862,
		"path": "../public/assets/wa-sqlite-BVXfj7bw.js"
	},
	"/assets/wallet-DPw4hJ1s.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"333-G8HolBLeCXYGRUreASoyjQ+cl5w\"",
		"mtime": "2026-09-10T07:17:38.292Z",
		"size": 819,
		"path": "../public/assets/wallet-DPw4hJ1s.js"
	},
	"/assets/websockets-BrH1W1hC.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1a557-mxpHOqZvkzHe900c1PAg5PC57RM\"",
		"mtime": "2026-09-10T07:17:38.448Z",
		"size": 107863,
		"path": "../public/assets/websockets-BrH1W1hC.js"
	},
	"/assets/websockets-E5bULUr_.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1a62c-rg3+llKpcDkOZD0Mr8foSXIMZf4\"",
		"mtime": "2026-09-10T07:17:38.591Z",
		"size": 108076,
		"path": "../public/assets/websockets-E5bULUr_.js"
	},
	"/assets/worker-DJSXMwe3.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"12df0-e0L59HHmgiflz5cssaAxMwdrPHU\"",
		"mtime": "2026-09-10T07:17:38.591Z",
		"size": 77296,
		"path": "../public/assets/worker-DJSXMwe3.js"
	},
	"/assets/x-CtzwyWEE.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"8f-jeyGATtKSQpzmoTYu3SEYRmx/aw\"",
		"mtime": "2026-09-10T07:17:38.571Z",
		"size": 143,
		"path": "../public/assets/x-CtzwyWEE.js"
	},
	"/assets/wa-sqlite-CagagB9I.wasm": {
		"type": "application/wasm",
		"etag": "\"112932-PVZvyjEpDlc7C+RsG8vVBaXaZyQ\"",
		"mtime": "2026-09-10T07:17:38.581Z",
		"size": 1124658,
		"path": "../public/assets/wa-sqlite-CagagB9I.wasm"
	},
	"/assets/wa-sqlite-async-DCIP8kAx.wasm": {
		"type": "application/wasm",
		"etag": "\"22d125-my2aJEczirWasFS1osydDIkHGgk\"",
		"mtime": "2026-09-10T07:17:38.585Z",
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
//#region node_modules/.pnpm/nitro@3.0.260610-beta_jiti@_91cbdd4e5e955b08c2904203236226d4/node_modules/nitro/dist/runtime/internal/static.mjs
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
//#region server/middleware/security.ts
/**
* Security middleware for Nitro server routes.
* - Verifies session tokens on mutating/authenticated endpoints
* - Applies security headers to every response
* - Basic rate-limiting (sliding window) per IP per endpoint
* - Sanitizes text inputs (strip HTML tags)
*/
var RATE_LIMIT_WINDOW_MS = 6e4;
var RATE_LIMIT_MAX_REQUESTS = 30;
var rateLimitStore = /* @__PURE__ */ new Map();
function rateLimit(event) {
	const key = `${getHeader(event, "x-forwarded-for")?.split(",")[0]?.trim() || getHeader(event, "x-real-ip") || "unknown"}:${event.path}`;
	const now = Date.now();
	const entry = rateLimitStore.get(key);
	if (entry) {
		if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) rateLimitStore.set(key, {
			count: 1,
			windowStart: now
		});
		else if (entry.count >= RATE_LIMIT_MAX_REQUESTS) throw createError({
			statusCode: 429,
			statusMessage: "Trop de requetes. Veuillez attendre un instant."
		});
		else entry.count++;
	} else rateLimitStore.set(key, {
		count: 1,
		windowStart: now
	});
	if (rateLimitStore.size > 500) {
		const cutoff = now - RATE_LIMIT_WINDOW_MS * 2;
		for (const [k, v] of rateLimitStore.entries()) if (v.windowStart < cutoff) rateLimitStore.delete(k);
	}
}
/**
* Session token format: `lumina_sess_<uuid-v4>`
* Expected to be sent as a Cookie (not a header) for CSRF safety.
*/
var SESSION_COOKIE_NAME = "lumina_session_token";
/**
* Auth middleware: requires a valid session cookie.
* Rejects if no token or tampered token.
*/
function requireAuth(event) {
	const token = getCookie(event, SESSION_COOKIE_NAME);
	if (!token) throw createError({
		statusCode: 401,
		statusMessage: "Non authentifie"
	});
	if (!token.startsWith("lumina_sess_") || token.length < 30) throw createError({
		statusCode: 401,
		statusMessage: "Session invalide"
	});
	return token;
}
/**
* Apply security headers to the response.
*/
function applySecurityHeaders(event) {
	setHeader(event, "X-Content-Type-Options", "nosniff");
	setHeader(event, "X-Frame-Options", "DENY");
	setHeader(event, "X-XSS-Protection", "0");
	setHeader(event, "Referrer-Policy", "strict-origin-when-cross-origin");
	setHeader(event, "Permissions-Policy", "camera=(), microphone=(), geolocation=()");
	setHeader(event, "Strict-Transport-Security", "max-age=31536000; includeSubDomains");
	setHeader(event, "Content-Security-Policy", [
		"default-src 'self'",
		"script-src 'self' https://cdn.supabase.io https://*.supabase.co",
		"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
		"img-src 'self' data: https: blob:",
		"font-src 'self' https://fonts.gstatic.com",
		"connect-src 'self' https://*.supabase.co https://*.onesignal.com",
		"frame-ancestors 'none'",
		"base-uri 'self'",
		"form-action 'self'"
	].join("; "));
	setHeader(event, "Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
	setHeader(event, "Surrogate-Control", "no-store");
}
/**
* Generate a cryptographically secure session token.
*/
function generateSessionToken() {
	return `lumina_sess_${randomBytes(32).toString("hex")}`;
}
/**
* Default export — no-op middleware passthrough so Nitro doesn't crash
* when it auto-discovers this file. Actual security logic lives in the
* plugin (server/plugins/security.ts) and is used explicitly by routes.
*/
function securityMiddleware() {
	return {};
}
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
var _lazy_yNvwok = defineLazyEventHandler(() => import("./_routes/api/auth/login.mjs"));
var _lazy_4M36Iy = defineLazyEventHandler(() => import("./_routes/api/auth/session.mjs"));
var _lazy_UIgZxI = defineLazyEventHandler(() => import("./_routes/api/auth/session2.mjs"));
var _lazy_XjqCkt = defineLazyEventHandler(() => import("./_routes/api/auth/signup.mjs"));
var _lazy_75KNpA = defineLazyEventHandler(() => import("./_routes/api/data.mjs"));
var _lazy_iG2nyi = defineLazyEventHandler(() => import("./_routes/api/events.mjs"));
var _lazy_UZz2KH = defineLazyEventHandler(() => import("./_routes/api/events2.mjs"));
var _lazy_ipGbt3 = defineLazyEventHandler(() => import("./_id_.delete.mjs"));
var _lazy__AZHUH = defineLazyEventHandler(() => import("./_id_.put.mjs"));
var _lazy_8xzSom = defineLazyEventHandler(() => import("./_routes/api/hello.mjs"));
var _lazy_ptRAZs = defineLazyEventHandler(() => import("./_routes/api/org_config.mjs"));
var _lazy_PAlBD4 = defineLazyEventHandler(() => import("./_routes/api/org_config2.mjs"));
var _lazy_JbQtVY = defineLazyEventHandler(() => import("./_routes/api/transactions.mjs"));
var _lazy_eMvGd7 = defineLazyEventHandler(() => import("./_routes/api/transactions2.mjs"));
var _lazy_GqTBgO = defineLazyEventHandler(() => import("./_id_2.delete.mjs"));
var _lazy_B2EoUT = defineLazyEventHandler(() => import("./_id_.get.mjs"));
var _lazy_BPAKU9 = defineLazyEventHandler(() => import("./_id_2.put.mjs"));
var _lazy_QoaAvi = defineLazyEventHandler(() => import("./_routes/api/transactions/[id]/action.mjs"));
var _lazy_oAfPuB = defineLazyEventHandler(() => import("./_chunks/renderer-template.mjs"));
var findRoute = /* @__PURE__ */ (() => {
	const $0 = {
		route: "/api/auth/login",
		method: "post",
		handler: _lazy_yNvwok
	}, $1 = {
		route: "/api/auth/session",
		method: "delete",
		handler: _lazy_4M36Iy
	}, $2 = {
		route: "/api/auth/session",
		method: "get",
		handler: _lazy_UIgZxI
	}, $3 = {
		route: "/api/auth/signup",
		method: "post",
		handler: _lazy_XjqCkt
	}, $4 = {
		route: "/api/data",
		method: "get",
		handler: _lazy_75KNpA
	}, $5 = {
		route: "/api/events",
		method: "get",
		handler: _lazy_iG2nyi
	}, $6 = {
		route: "/api/events",
		method: "post",
		handler: _lazy_UZz2KH
	}, $7 = {
		route: "/api/hello",
		method: "get",
		handler: _lazy_8xzSom
	}, $8 = {
		route: "/api/org-config",
		method: "get",
		handler: _lazy_ptRAZs
	}, $9 = {
		route: "/api/org-config",
		method: "put",
		handler: _lazy_PAlBD4
	}, $10 = {
		route: "/api/transactions",
		method: "get",
		handler: _lazy_JbQtVY
	}, $11 = {
		route: "/api/transactions",
		method: "post",
		handler: _lazy_eMvGd7
	}, $12 = {
		route: "/api/events/:id",
		method: "delete",
		handler: _lazy_ipGbt3
	}, $13 = {
		route: "/api/events/:id",
		method: "put",
		handler: _lazy__AZHUH
	}, $14 = {
		route: "/api/transactions/:id",
		method: "delete",
		handler: _lazy_GqTBgO
	}, $15 = {
		route: "/api/transactions/:id",
		method: "get",
		handler: _lazy_B2EoUT
	}, $16 = {
		route: "/api/transactions/:id",
		method: "put",
		handler: _lazy_BPAKU9
	}, $17 = {
		route: "/api/transactions/:id/action",
		method: "post",
		handler: _lazy_QoaAvi
	}, $18 = {
		route: "/**",
		handler: _lazy_oAfPuB
	};
	return (m, p) => {
		if (p.charCodeAt(p.length - 1) === 47) p = p.slice(0, -1) || "/";
		if (p === "/api/auth/login") {
			if (m === "POST") return { data: $0 };
		} else if (p === "/api/auth/session") {
			if (m === "DELETE") return { data: $1 };
			if (m === "GET") return { data: $2 };
		} else if (p === "/api/auth/signup") {
			if (m === "POST") return { data: $3 };
		} else if (p === "/api/data") {
			if (m === "GET") return { data: $4 };
		} else if (p === "/api/events") {
			if (m === "GET") return { data: $5 };
			if (m === "POST") return { data: $6 };
		} else if (p === "/api/hello") {
			if (m === "GET") return { data: $7 };
		} else if (p === "/api/org-config") {
			if (m === "GET") return { data: $8 };
			if (m === "PUT") return { data: $9 };
		} else if (p === "/api/transactions") {
			if (m === "GET") return { data: $10 };
			if (m === "POST") return { data: $11 };
		}
		let s = p.split("/"), l = s.length;
		if (l > 1) {
			if (s[1] === "api") {
				if (l > 2) {
					if (s[2] === "events") {
						if (l === 4 || l === 3) {
							if (m === "DELETE") {
								if (l > 3) return {
									data: $12,
									params: { "id": s[3] }
								};
							}
							if (m === "PUT") {
								if (l > 3) return {
									data: $13,
									params: { "id": s[3] }
								};
							}
						}
					} else if (s[2] === "transactions") {
						if (l === 4 || l === 3) {
							if (m === "DELETE") {
								if (l > 3) return {
									data: $14,
									params: { "id": s[3] }
								};
							}
							if (m === "GET") {
								if (l > 3) return {
									data: $15,
									params: { "id": s[3] }
								};
							}
							if (m === "PUT") {
								if (l > 3) return {
									data: $16,
									params: { "id": s[3] }
								};
							}
						} else if (s[4] === "action") {
							if (l === 5) {
								if (m === "POST") return {
									data: $17,
									params: { "id": s[3] }
								};
							}
						}
					}
				}
			}
		}
		return {
			data: $18,
			params: { "_": s.slice(1).join("/") }
		};
	};
})();
var globalMiddleware = [toEventHandler(static_default), toEventHandler(securityMiddleware)].filter(Boolean);
//#endregion
//#region node_modules/.pnpm/nitro@3.0.260610-beta_jiti@_91cbdd4e5e955b08c2904203236226d4/node_modules/nitro/dist/runtime/internal/error/prod.mjs
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
//#region #nitro/virtual/plugins
var plugins = [defineEventHandler((event) => {
	applySecurityHeaders(event);
	const method = event.method;
	if (method !== "GET" && !event.path.startsWith("/api/hello")) rateLimit(event);
	if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") try {
		requireAuth(event);
	} catch (e) {
		throw e;
	}
	if (method === "OPTIONS") return { ok: true };
})];
//#endregion
//#region #nitro/virtual/app
function createNitroApp() {
	const hooks = new HookableCore();
	const captureError = (error, errorCtx) => {
		const promise = hooks.callHook("error", error, errorCtx)?.catch?.((hookError) => {
			console.error("Error while capturing another error", hookError);
		});
		if (errorCtx?.event) {
			const errors = errorCtx.event.req.context?.nitro?.errors;
			if (errors) errors.push({
				error,
				context: errorCtx
			});
			if (promise && typeof errorCtx.event.req.waitUntil === "function") errorCtx.event.req.waitUntil(promise);
		}
	};
	const h3App = createH3App({ onError(error, event) {
		captureError(error, { event });
		return error_handler_default(error, event);
	} });
	h3App.config.onRequest = (event) => {
		return hooks.callHook("request", event)?.catch?.((error) => {
			captureError(error, {
				event,
				tags: ["request"]
			});
		});
	};
	h3App.config.onResponse = (res, event) => {
		return hooks.callHook("response", res, event)?.catch?.((error) => {
			captureError(error, {
				event,
				tags: ["response"]
			});
		});
	};
	let appHandler = (req) => {
		req.context ||= {};
		req.context.nitro = req.context.nitro || { errors: [] };
		return h3App.fetch(req);
	};
	return {
		fetch: appHandler,
		h3: h3App,
		hooks,
		captureError
	};
}
function initNitroPlugins(app) {
	for (const plugin of plugins) try {
		plugin(app);
	} catch (error) {
		app.captureError?.(error, { tags: ["plugin"] });
		throw error;
	}
	return app;
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
//#region node_modules/.pnpm/nitro@3.0.260610-beta_jiti@_91cbdd4e5e955b08c2904203236226d4/node_modules/nitro/dist/runtime/internal/app.mjs
var APP_ID = "default";
function useNitroApp() {
	let instance = useNitroApp._instance;
	if (instance) return instance;
	instance = useNitroApp._instance = createNitroApp();
	globalThis.__nitro__ = globalThis.__nitro__ || {};
	globalThis.__nitro__[APP_ID] = instance;
	initNitroPlugins(instance);
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
//#region node_modules/.pnpm/nitro@3.0.260610-beta_jiti@_91cbdd4e5e955b08c2904203236226d4/node_modules/nitro/dist/runtime/internal/error/hooks.mjs
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
//#region node_modules/.pnpm/nitro@3.0.260610-beta_jiti@_91cbdd4e5e955b08c2904203236226d4/node_modules/nitro/dist/presets/node/runtime/node-server.mjs
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
export { node_server_default as default, generateSessionToken as t };
