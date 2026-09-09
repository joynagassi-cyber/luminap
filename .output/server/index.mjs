globalThis.__nitro_main__ = import.meta.url;
import { a as defineHandler, h as serve, m as NodeResponse, n as HTTPError, o as defineLazyEventHandler, p as toEventHandler, t as H3Core } from "./_libs/h3+rou3+srvx.mjs";
import { i as withoutTrailingSlash, n as joinURL, r as withLeadingSlash, t as decodePath } from "./_libs/ufo.mjs";
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
	"/assets/AccessHandlePoolVFS-BAjXhInT.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f0f-ldmCdwaMNayJ1lfHaNJJixBiL9Y\"",
		"mtime": "2026-09-09T18:14:04.713Z",
		"size": 3855,
		"path": "../public/assets/AccessHandlePoolVFS-BAjXhInT.js"
	},
	"/assets/AccessHandlePoolVFS-k-bp0HG6.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f02-WFkNV/KJ/xa7F3xDGFd1mY/Co6Q\"",
		"mtime": "2026-09-09T18:14:05.791Z",
		"size": 3842,
		"path": "../public/assets/AccessHandlePoolVFS-k-bp0HG6.js"
	},
	"/assets/Archives-k6p0Dba4.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1386-Od+vB3+hwafRNakFfSDcJuO0+c0\"",
		"mtime": "2026-09-09T18:14:04.715Z",
		"size": 4998,
		"path": "../public/assets/Archives-k6p0Dba4.js"
	},
	"/assets/AreaChart-BvZTOQPy.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5ca95-R5YPk4k1FzHFrgmHbZVsSH4UrtU\"",
		"mtime": "2026-09-09T18:14:04.717Z",
		"size": 379541,
		"path": "../public/assets/AreaChart-BvZTOQPy.js"
	},
	"/assets/arrow-down-right-Bvu3Qw3H.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"9c-vDSQ5upVY9UrrHa5MKK1gJsD7Bc\"",
		"mtime": "2026-09-09T18:14:05.363Z",
		"size": 156,
		"path": "../public/assets/arrow-down-right-Bvu3Qw3H.js"
	},
	"/assets/arrow-left-_p5Xhk7j.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"99-SaOhVAR84Non2IUvdgRBP8sbnX8\"",
		"mtime": "2026-09-09T18:14:05.364Z",
		"size": 153,
		"path": "../public/assets/arrow-left-_p5Xhk7j.js"
	},
	"/assets/arrow-up-C7rVUWTb.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"105-yVfTzNO4tNKB5cI6ZddpLvEzx3A\"",
		"mtime": "2026-09-09T18:14:05.364Z",
		"size": 261,
		"path": "../public/assets/arrow-up-C7rVUWTb.js"
	},
	"/assets/arrow-up-right-SCjwB6Z0.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"9a-bzmwpKalr5rpO86wKF1IPf55eHw\"",
		"mtime": "2026-09-09T18:14:05.365Z",
		"size": 154,
		"path": "../public/assets/arrow-up-right-SCjwB6Z0.js"
	},
	"/assets/Balance-Cj-RyEPj.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2636-z7xRoTJf6Q+9LToOrg4iqITUezQ\"",
		"mtime": "2026-09-09T18:14:04.719Z",
		"size": 9782,
		"path": "../public/assets/Balance-Cj-RyEPj.js"
	},
	"/assets/book-open-D_xvbJ-s.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"10b-mJO1dAucNIK3GPZRpPhEtcjzf2E\"",
		"mtime": "2026-09-09T18:14:05.366Z",
		"size": 267,
		"path": "../public/assets/book-open-D_xvbJ-s.js"
	},
	"/assets/BottomNav-vd_FXAgu.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1cbb-hHn5m2wkXMuIe8RbpYDSFugTBuE\"",
		"mtime": "2026-09-09T18:14:04.719Z",
		"size": 7355,
		"path": "../public/assets/BottomNav-vd_FXAgu.js"
	},
	"/assets/building-2-i3oUGtL5.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1ab-yrFOlYleIet6g6lW/enoTk9M36M\"",
		"mtime": "2026-09-09T18:14:05.380Z",
		"size": 427,
		"path": "../public/assets/building-2-i3oUGtL5.js"
	},
	"/assets/calendar-YRnYRwsv.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f6-RK3H3cVsCU68gG1jQJSH+qSwz/k\"",
		"mtime": "2026-09-09T18:14:05.381Z",
		"size": 246,
		"path": "../public/assets/calendar-YRnYRwsv.js"
	},
	"/robots.txt": {
		"type": "text/plain; charset=utf-8",
		"etag": "\"ae-hLVBrSrDdpIw3Xl0dJPRkupPepQ\"",
		"mtime": "2026-09-01T22:18:50.689Z",
		"size": 174,
		"path": "../public/robots.txt"
	},
	"/assets/chevron-right-wc2p-Cf8.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"76-MED8QyTE+Ev7ybY4lQI9ae7oWnM\"",
		"mtime": "2026-09-09T18:14:05.381Z",
		"size": 118,
		"path": "../public/assets/chevron-right-wc2p-Cf8.js"
	},
	"/assets/circle-alert-DrpnuCpd.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"ee-+X4H2xlbXd4PlvQGm2qcYDQc5nU\"",
		"mtime": "2026-09-09T18:14:05.382Z",
		"size": 238,
		"path": "../public/assets/circle-alert-DrpnuCpd.js"
	},
	"/lumina-logo.png": {
		"type": "image/png",
		"etag": "\"c2ce-Xrm5OeE6Rcs4GqYh+OFZRZQyAYE\"",
		"mtime": "2026-09-04T20:43:25.384Z",
		"size": 49870,
		"path": "../public/lumina-logo.png"
	},
	"/assets/circle-check-big-Db3CIpK-.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"b5-NNOv3R/k+/fQ0ci643zH/fHj7qo\"",
		"mtime": "2026-09-09T18:14:05.427Z",
		"size": 181,
		"path": "../public/assets/circle-check-big-Db3CIpK-.js"
	},
	"/assets/circle-plus-ErAhIxaN.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"c3-AeObW+eAcVLtEDVaZ77684dEevE\"",
		"mtime": "2026-09-09T18:14:05.429Z",
		"size": 195,
		"path": "../public/assets/circle-plus-ErAhIxaN.js"
	},
	"/assets/clock-DWi_UYcP.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"ac-sfaEUgArrVjwQv6fcn/+8YqnW9g\"",
		"mtime": "2026-09-09T18:14:05.430Z",
		"size": 172,
		"path": "../public/assets/clock-DWi_UYcP.js"
	},
	"/favicon.ico": {
		"type": "image/vnd.microsoft.icon",
		"etag": "\"15f09-4MFHRo4azA6knOGNmsefGO+QUAE\"",
		"mtime": "2026-09-01T22:18:50.675Z",
		"size": 89865,
		"path": "../public/favicon.ico"
	},
	"/assets/Cotisations-Dl8vJkvo.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"14c9-aHR7/8WOFEmMwxfFUOHZrvNolSA\"",
		"mtime": "2026-09-09T18:14:04.721Z",
		"size": 5321,
		"path": "../public/assets/Cotisations-Dl8vJkvo.js"
	},
	"/assets/CulteDetail-CfNK4Tg6.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2568-osGxFCqOh6pMRDYHeHFyo9d2YpM\"",
		"mtime": "2026-09-09T18:14:04.721Z",
		"size": 9576,
		"path": "../public/assets/CulteDetail-CfNK4Tg6.js"
	},
	"/assets/CustomFields-D8RSQz9C.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1c2b-9P0tbKk6Gl19tQjb6Si4+4m5B7U\"",
		"mtime": "2026-09-09T18:14:04.721Z",
		"size": 7211,
		"path": "../public/assets/CustomFields-D8RSQz9C.js"
	},
	"/assets/Dashboard-DvjPvOqi.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4302-TIlrjXIBgFj2dr9/9ucqqUd1Cq4\"",
		"mtime": "2026-09-09T18:14:04.723Z",
		"size": 17154,
		"path": "../public/assets/Dashboard-DvjPvOqi.js"
	},
	"/assets/database-Pyr1ssIG.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"e8-fbydSUke6XkRCk5LjE51ugefNz4\"",
		"mtime": "2026-09-09T18:14:05.431Z",
		"size": 232,
		"path": "../public/assets/database-Pyr1ssIG.js"
	},
	"/assets/EventDetail-DIvuGwKW.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"53f0-nefoBzG9RvsIVtcxxT9QUWRz/gQ\"",
		"mtime": "2026-09-09T18:14:04.723Z",
		"size": 21488,
		"path": "../public/assets/EventDetail-DIvuGwKW.js"
	},
	"/assets/EventEdit-Ce0NamJ8.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"14ad-gEsoxFsthWQxmb9GCZMdvNYmLlQ\"",
		"mtime": "2026-09-09T18:14:04.725Z",
		"size": 5293,
		"path": "../public/assets/EventEdit-Ce0NamJ8.js"
	},
	"/assets/EventNew-Cpsil31v.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1fee-CzdivoaLHY+I07gTAlhVQJmmP9Q\"",
		"mtime": "2026-09-09T18:14:04.725Z",
		"size": 8174,
		"path": "../public/assets/EventNew-Cpsil31v.js"
	},
	"/assets/Events-ayjL0EBK.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"12c9-OcY5ABDAzNWneBEGlRHAY27Wmno\"",
		"mtime": "2026-09-09T18:14:04.725Z",
		"size": 4809,
		"path": "../public/assets/Events-ayjL0EBK.js"
	},
	"/assets/FacadeVFS-1y7IqKqj.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1870-m1wkRJuvwZh0OcjOJyLHWC8DfyY\"",
		"mtime": "2026-09-09T18:14:04.727Z",
		"size": 6256,
		"path": "../public/assets/FacadeVFS-1y7IqKqj.js"
	},
	"/assets/FacadeVFS-BEICR2q0.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1871-h2JM49n3k6wsMKWYG0w5CCQNUNY\"",
		"mtime": "2026-09-09T18:14:05.792Z",
		"size": 6257,
		"path": "../public/assets/FacadeVFS-BEICR2q0.js"
	},
	"/assets/Finance-B1sWiMoX.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1c16-33ofFXB6Jqck9QgM/T07KIw2FoY\"",
		"mtime": "2026-09-09T18:14:04.727Z",
		"size": 7190,
		"path": "../public/assets/Finance-B1sWiMoX.js"
	},
	"/assets/FormBuilder-rFXLhRcS.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1fb4-uuNZmzDPh9bSkrdsEEemv4HN5fc\"",
		"mtime": "2026-09-09T18:14:04.729Z",
		"size": 8116,
		"path": "../public/assets/FormBuilder-rFXLhRcS.js"
	},
	"/assets/FormFill-CRxu0cO9.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"11f6-DfCf/9DSxAbftETkKen8hWGIr90\"",
		"mtime": "2026-09-09T18:14:04.781Z",
		"size": 4598,
		"path": "../public/assets/FormFill-CRxu0cO9.js"
	},
	"/assets/formSystem-RSYCFARm.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"7ed-elvx6TCYW1BZp8rJC9i7vNurK8c\"",
		"mtime": "2026-09-09T18:14:05.435Z",
		"size": 2029,
		"path": "../public/assets/formSystem-RSYCFARm.js"
	},
	"/assets/GroupDetail-CVcpw8zK.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"55b4-JwJSCVyiUplkmVxKUlde3oucstg\"",
		"mtime": "2026-09-09T18:14:04.783Z",
		"size": 21940,
		"path": "../public/assets/GroupDetail-CVcpw8zK.js"
	},
	"/assets/Groups-bms37drU.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2402-su0q0Yo86oZS4Sr6Go3LflxLzyc\"",
		"mtime": "2026-09-09T18:14:04.783Z",
		"size": 9218,
		"path": "../public/assets/Groups-bms37drU.js"
	},
	"/assets/Help-B-r7d6AJ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"ca9-vHonR5YPGl+R/ns+Tu3Q76XEa5o\"",
		"mtime": "2026-09-09T18:14:04.783Z",
		"size": 3241,
		"path": "../public/assets/Help-B-r7d6AJ.js"
	},
	"/assets/History-wS5BelBK.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2edc-D4+7kZ3YUlTuMcs05L8a7N+kq0o\"",
		"mtime": "2026-09-09T18:14:04.785Z",
		"size": 11996,
		"path": "../public/assets/History-wS5BelBK.js"
	},
	"/assets/IDBBatchAtomicVFS-B1BtpF-N.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"32ae-Xixqgd3AecmCDnHo6vThjQGlm5o\"",
		"mtime": "2026-09-09T18:14:04.785Z",
		"size": 12974,
		"path": "../public/assets/IDBBatchAtomicVFS-B1BtpF-N.js"
	},
	"/assets/IDBBatchAtomicVFS-DOQZPx-g.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"32a2-6ppgZuTXuQvYK+HVWuYHmxtHCa0\"",
		"mtime": "2026-09-09T18:14:05.793Z",
		"size": 12962,
		"path": "../public/assets/IDBBatchAtomicVFS-DOQZPx-g.js"
	},
	"/assets/html2canvas-DCcDvdvP.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"30b50-/NW/tvs1950d+adFAmG+0O5qROc\"",
		"mtime": "2026-09-09T18:14:05.437Z",
		"size": 199504,
		"path": "../public/assets/html2canvas-DCcDvdvP.js"
	},
	"/assets/index-Hjgy8Rd9.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"105c5-xTVPJoQBcY1q9hpiQTmugi29PHo\"",
		"mtime": "2026-09-09T18:14:05.782Z",
		"size": 67013,
		"path": "../public/assets/index-Hjgy8Rd9.css"
	},
	"/assets/index.es-C7XbsHmS.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"24f91-+6egPz5FPYWIpohZbT5jAjODUmg\"",
		"mtime": "2026-09-09T18:14:05.438Z",
		"size": 151441,
		"path": "../public/assets/index.es-C7XbsHmS.js"
	},
	"/assets/export-Sr3tT2-1.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"af2eb-cgcIesSBjepUOEG1FwmUyQO1unI\"",
		"mtime": "2026-09-09T18:14:05.434Z",
		"size": 717547,
		"path": "../public/assets/export-Sr3tT2-1.js"
	},
	"/assets/index-Cb3USFXW.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"beac0-DjCpr03w/L8c31g05yEhYRymvOU\"",
		"mtime": "2026-09-09T18:14:04.711Z",
		"size": 780992,
		"path": "../public/assets/index-Cb3USFXW.js"
	},
	"/assets/dist-D9PSg3_W.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"109d05-tfIPLczBSUv6HorYtpyfev4HhrE\"",
		"mtime": "2026-09-09T18:14:05.433Z",
		"size": 1088773,
		"path": "../public/assets/dist-D9PSg3_W.js"
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
		"mtime": "2026-09-09T18:14:05.440Z",
		"size": 63943,
		"path": "../public/assets/mc-wa-sqlite-async-OK58TZB1.js"
	},
	"/assets/mc-wa-sqlite-Dt2CfptV.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"eb0e-ka1IvJlVUyt14/GJnJnIXiNK/CY\"",
		"mtime": "2026-09-09T18:14:05.439Z",
		"size": 60174,
		"path": "../public/assets/mc-wa-sqlite-Dt2CfptV.js"
	},
	"/assets/Members-Dsry7bgf.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1ca0-E9BsS16jCqyIHBOjzz9ux+Zk/bg\"",
		"mtime": "2026-09-09T18:14:04.785Z",
		"size": 7328,
		"path": "../public/assets/Members-Dsry7bgf.js"
	},
	"/assets/MembreDetail-8nQFcX5Z.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1f95-cqc95D3FCGa4GhVx8ZNNnxXsRzA\"",
		"mtime": "2026-09-09T18:14:04.787Z",
		"size": 8085,
		"path": "../public/assets/MembreDetail-8nQFcX5Z.js"
	},
	"/assets/MembresEnAvance-Ce43kkBD.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"cc0-ncPHNcPi2q+OdwpFj5mrltK7SYk\"",
		"mtime": "2026-09-09T18:14:04.832Z",
		"size": 3264,
		"path": "../public/assets/MembresEnAvance-Ce43kkBD.js"
	},
	"/assets/MemoryVFS-BezoCUr4.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"61c-i0Z1Hs8t8EOoBlKZk33VsREcayY\"",
		"mtime": "2026-09-09T18:14:04.832Z",
		"size": 1564,
		"path": "../public/assets/MemoryVFS-BezoCUr4.js"
	},
	"/assets/MemoryVFS-DQF4WRTC.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"61c-i2gYtp7yBd03f77k1kJ2TRrrTSQ\"",
		"mtime": "2026-09-09T18:14:05.794Z",
		"size": 1564,
		"path": "../public/assets/MemoryVFS-DQF4WRTC.js"
	},
	"/assets/NotFound-BnP8zMWW.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"39c-S8sXgiiYp8LDjpxYPHacawIAs3Q\"",
		"mtime": "2026-09-09T18:14:04.832Z",
		"size": 924,
		"path": "../public/assets/NotFound-BnP8zMWW.js"
	},
	"/assets/Notifications-_YNGRaOp.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"17a6-HIzfxaAOMMOOQPDVgz4mCZGYpv8\"",
		"mtime": "2026-09-09T18:14:04.834Z",
		"size": 6054,
		"path": "../public/assets/Notifications-_YNGRaOp.js"
	},
	"/assets/Onboarding-DcwWjg6p.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"34a2-MryendWRR9zrTy0deX9yUeRHfGk\"",
		"mtime": "2026-09-09T18:14:04.836Z",
		"size": 13474,
		"path": "../public/assets/Onboarding-DcwWjg6p.js"
	},
	"/assets/OPFSCoopSyncVFS-B6jZUNzw.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1dea-w/fSRarD9GfWkpWShNs3jgugMDU\"",
		"mtime": "2026-09-09T18:14:04.834Z",
		"size": 7658,
		"path": "../public/assets/OPFSCoopSyncVFS-B6jZUNzw.js"
	},
	"/assets/OPFSCoopSyncVFS-DATtbZFi.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1dde-35NXNSgW4WGGg2Jx/DvLz8pj/JQ\"",
		"mtime": "2026-09-09T18:14:05.795Z",
		"size": 7646,
		"path": "../public/assets/OPFSCoopSyncVFS-DATtbZFi.js"
	},
	"/assets/OPFSWriteAheadVFS-BDPYMnXf.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5cf9-YlYpzx5mwe1iafvmZq5C4D3gkhI\"",
		"mtime": "2026-09-09T18:14:04.836Z",
		"size": 23801,
		"path": "../public/assets/OPFSWriteAheadVFS-BDPYMnXf.js"
	},
	"/assets/OPFSWriteAheadVFS-Dceb9ZfN.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5cf2-6VWvwZq/3kDJah89Fj0JQlYKJAI\"",
		"mtime": "2026-09-09T18:14:05.796Z",
		"size": 23794,
		"path": "../public/assets/OPFSWriteAheadVFS-Dceb9ZfN.js"
	},
	"/assets/p-1sJ0ZDPe-YkMm5iKi.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"8ed2-6KdNiR6CHzWsfcskhcqF/kG5SYg\"",
		"mtime": "2026-09-09T18:14:05.441Z",
		"size": 36562,
		"path": "../public/assets/p-1sJ0ZDPe-YkMm5iKi.js"
	},
	"/assets/p-5ldEpNdG-6dZfqBTh.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"276c-eLE8B8Pe9lKRYBRZPz3DZQM2vmI\"",
		"mtime": "2026-09-09T18:14:05.442Z",
		"size": 10092,
		"path": "../public/assets/p-5ldEpNdG-6dZfqBTh.js"
	},
	"/assets/p-BMPN55of-C0P_qWS_.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"21a-HGYAvd2qgF1iEwCzq6eCRzodk80\"",
		"mtime": "2026-09-09T18:14:05.442Z",
		"size": 538,
		"path": "../public/assets/p-BMPN55of-C0P_qWS_.js"
	},
	"/assets/p-BmVRXR1y-Qf1gG5of.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3e6-cIzBL2cgY/c+Nd+w1vUUDnL3YhY\"",
		"mtime": "2026-09-09T18:14:05.446Z",
		"size": 998,
		"path": "../public/assets/p-BmVRXR1y-Qf1gG5of.js"
	},
	"/assets/p-BQyuFxYc-BP5sUz4F.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"624-sKMq1g03/KlKcB/qZDlMk1Tk0Qk\"",
		"mtime": "2026-09-09T18:14:05.443Z",
		"size": 1572,
		"path": "../public/assets/p-BQyuFxYc-BP5sUz4F.js"
	},
	"/assets/p-BT9-hMMz-DeoKjx0N.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1ee-rguGWc7rPK2wzL0Vb/AugNuA+fM\"",
		"mtime": "2026-09-09T18:14:05.444Z",
		"size": 494,
		"path": "../public/assets/p-BT9-hMMz-DeoKjx0N.js"
	},
	"/assets/mc-wa-sqlite-DoDpgFfE.wasm": {
		"type": "application/wasm",
		"etag": "\"1405ab-mYFvsN3agcsYu7kHk/nCjgNgqQ8\"",
		"mtime": "2026-09-09T18:14:05.785Z",
		"size": 1312171,
		"path": "../public/assets/mc-wa-sqlite-DoDpgFfE.wasm"
	},
	"/assets/p-BWoa-cki-UpDL1J1V.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"469-MAKOTmbsqUpzRy0RZ0/MkYlxxqE\"",
		"mtime": "2026-09-09T18:14:05.445Z",
		"size": 1129,
		"path": "../public/assets/p-BWoa-cki-UpDL1J1V.js"
	},
	"/assets/p-C-NbvXu4-B9XCdoFH.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"127b-nP1/e4Mh7JXhis9RI1WSxH7S81E\"",
		"mtime": "2026-09-09T18:14:05.447Z",
		"size": 4731,
		"path": "../public/assets/p-C-NbvXu4-B9XCdoFH.js"
	},
	"/assets/p-C09TXohi-BME7HMRv.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"c7c-eBlQFVuVp95kjyeMXHxMBBybRJM\"",
		"mtime": "2026-09-09T18:14:05.447Z",
		"size": 3196,
		"path": "../public/assets/p-C09TXohi-BME7HMRv.js"
	},
	"/assets/p-C4VpVfrJ-B7tOqQiD.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"28b6-z0kccsJcaxrsNNsPUeOkumHk1lc\"",
		"mtime": "2026-09-09T18:14:05.549Z",
		"size": 10422,
		"path": "../public/assets/p-C4VpVfrJ-B7tOqQiD.js"
	},
	"/assets/p-CG_zZq_I-Bnu5sziO.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3a9-IewWt3kc3BnoWwAVte31wTmqo4k\"",
		"mtime": "2026-09-09T18:14:05.551Z",
		"size": 937,
		"path": "../public/assets/p-CG_zZq_I-Bnu5sziO.js"
	},
	"/assets/p-CWuIRJQN-CpJ4cxhA.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"26e-fZxIO0/B5h4LVezuzSyQ2tIfW08\"",
		"mtime": "2026-09-09T18:14:05.551Z",
		"size": 622,
		"path": "../public/assets/p-CWuIRJQN-CpJ4cxhA.js"
	},
	"/assets/p-D0YpjgON-DuPvRicD.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"15f9-l2t1qtt076m1Azprcw7kb/Qo+DQ\"",
		"mtime": "2026-09-09T18:14:05.551Z",
		"size": 5625,
		"path": "../public/assets/p-D0YpjgON-DuPvRicD.js"
	},
	"/assets/p-D7-vHX0A-M28BuEVW.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4ac-++v6wgkqI6DQPAYjpbKuefeV/jU\"",
		"mtime": "2026-09-09T18:14:05.553Z",
		"size": 1196,
		"path": "../public/assets/p-D7-vHX0A-M28BuEVW.js"
	},
	"/assets/p-qAXsfUff-UrBZGjF-.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"403-VFqIV1qmCBL/QnR1Ulrs6NA9M2s\"",
		"mtime": "2026-09-09T18:14:05.555Z",
		"size": 1027,
		"path": "../public/assets/p-qAXsfUff-UrBZGjF-.js"
	},
	"/assets/p-ZjP4CjeZ-DJ1DGIsW.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"62-xIml61NROF4B1cx8XnHtA30tV1Q\"",
		"mtime": "2026-09-09T18:14:05.553Z",
		"size": 98,
		"path": "../public/assets/p-ZjP4CjeZ-DJ1DGIsW.js"
	},
	"/assets/pen-line-kB0d4rmM.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"10a-1t0sGWMJLavFI+7h5DjYkZg+p1o\"",
		"mtime": "2026-09-09T18:14:05.555Z",
		"size": 266,
		"path": "../public/assets/pen-line-kB0d4rmM.js"
	},
	"/assets/purify.es-ChwZkWde.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"68bc-bPPRDEosU/Lqj+2Oyi1ue22LViM\"",
		"mtime": "2026-09-09T18:14:05.557Z",
		"size": 26812,
		"path": "../public/assets/purify.es-ChwZkWde.js"
	},
	"/assets/refresh-cw-DdoO5frS.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"135-pDxwX4NlabAtcWQ6FvsJK5HEVcE\"",
		"mtime": "2026-09-09T18:14:05.645Z",
		"size": 309,
		"path": "../public/assets/refresh-cw-DdoO5frS.js"
	},
	"/assets/mc-wa-sqlite-async-DYagSq56.wasm": {
		"type": "application/wasm",
		"etag": "\"263900-YXiey/3Hhr2OVYDVjdLpGtiNQfI\"",
		"mtime": "2026-09-09T18:14:05.787Z",
		"size": 2504960,
		"path": "../public/assets/mc-wa-sqlite-async-DYagSq56.wasm"
	},
	"/assets/ReportBuilder-BcsTIthy.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1e1e-4fJEL967i/dGkogKM2B0NAgksAc\"",
		"mtime": "2026-09-09T18:14:04.836Z",
		"size": 7710,
		"path": "../public/assets/ReportBuilder-BcsTIthy.js"
	},
	"/assets/Reports-CEb8EYGH.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"23b8-ldAb6OgDKoRIIcP5C2KUUqoOrcQ\"",
		"mtime": "2026-09-09T18:14:04.838Z",
		"size": 9144,
		"path": "../public/assets/Reports-CEb8EYGH.js"
	},
	"/assets/resource-B-FNODLD.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"9cb-dI3+uw/28l9cLrHky4ls1dFPIUA\"",
		"mtime": "2026-09-09T18:14:05.647Z",
		"size": 2507,
		"path": "../public/assets/resource-B-FNODLD.js"
	},
	"/assets/RoleSelection-DSP1rD1R.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"110e-gGoOdVadoZnyzFh6s7NALAeiHhM\"",
		"mtime": "2026-09-09T18:14:05.345Z",
		"size": 4366,
		"path": "../public/assets/RoleSelection-DSP1rD1R.js"
	},
	"/assets/rolldown-runtime-hePW80VL.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2cc-fA8td6k29UVF6JoPfhOPkceTK1M\"",
		"mtime": "2026-09-09T18:14:05.647Z",
		"size": 716,
		"path": "../public/assets/rolldown-runtime-hePW80VL.js"
	},
	"/assets/SaisieRapide-Dggsd7x9.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"228-TpzZQ44QNVoE6Smwa9fjPawCprU\"",
		"mtime": "2026-09-09T18:14:05.345Z",
		"size": 552,
		"path": "../public/assets/SaisieRapide-Dggsd7x9.js"
	},
	"/assets/search-DhUdHpt4.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"a1-qUokyNT58F5Z5XVunRHhp5Y/+FI\"",
		"mtime": "2026-09-09T18:14:05.649Z",
		"size": 161,
		"path": "../public/assets/search-DhUdHpt4.js"
	},
	"/assets/security-CPHDFpdn.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f33-C2Miy5A4omHBoxpqDaOViatt6kc\"",
		"mtime": "2026-09-09T18:14:05.708Z",
		"size": 3891,
		"path": "../public/assets/security-CPHDFpdn.js"
	},
	"/assets/Settings-Bb_OyZ36.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3d0a-fjFhPX/gSGTXBIE/qV0kA6NZ0PA\"",
		"mtime": "2026-09-09T18:14:05.347Z",
		"size": 15626,
		"path": "../public/assets/Settings-Bb_OyZ36.js"
	},
	"/assets/Skeleton-DRSq4mVD.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"413-0iXwsdjT11qfSzz1EAoSShZ96U0\"",
		"mtime": "2026-09-09T18:14:05.349Z",
		"size": 1043,
		"path": "../public/assets/Skeleton-DRSq4mVD.js"
	},
	"/assets/tag-BjcjXxKP.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"13b-esA999Zm7l4U2ja6uWH6XmcyQ9U\"",
		"mtime": "2026-09-09T18:14:05.709Z",
		"size": 315,
		"path": "../public/assets/tag-BjcjXxKP.js"
	},
	"/assets/TopHeader-CpVmN9VP.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"75f-SDRS7QqDd1eB3LBHvLZFmR+b8yM\"",
		"mtime": "2026-09-09T18:14:05.351Z",
		"size": 1887,
		"path": "../public/assets/TopHeader-CpVmN9VP.js"
	},
	"/assets/Trace-CjEbEFW0.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1252-HnsFbZkhJ5DARarypA7Cxo+sVB8\"",
		"mtime": "2026-09-09T18:14:05.352Z",
		"size": 4690,
		"path": "../public/assets/Trace-CjEbEFW0.js"
	},
	"/assets/TransactionCard-De_3vpgJ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"a74-42FsqKfINOtNyAL5hR19XVrY8h4\"",
		"mtime": "2026-09-09T18:14:05.353Z",
		"size": 2676,
		"path": "../public/assets/TransactionCard-De_3vpgJ.js"
	},
	"/assets/TransactionDetail-CsFs3fj8.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"24ff-0fiw3V7MFNY6XIwhkt/Jvf33Z6k\"",
		"mtime": "2026-09-09T18:14:05.354Z",
		"size": 9471,
		"path": "../public/assets/TransactionDetail-CsFs3fj8.js"
	},
	"/assets/TransactionEdit-CdtacHRZ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1a7c-fg6/UW+NG45fR/75MA/RiVopqtI\"",
		"mtime": "2026-09-09T18:14:05.355Z",
		"size": 6780,
		"path": "../public/assets/TransactionEdit-CdtacHRZ.js"
	},
	"/assets/TransactionNew-BVIJXDtH.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1ad3-mG8utydHyzPIUSysT5wy0A9GBEY\"",
		"mtime": "2026-09-09T18:14:05.358Z",
		"size": 6867,
		"path": "../public/assets/TransactionNew-BVIJXDtH.js"
	},
	"/assets/TransactionNewGroup-DDtBLB6S.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"18a9-l+0geqVaMCe/dAw6o3wAVUv2XVI\"",
		"mtime": "2026-09-09T18:14:05.359Z",
		"size": 6313,
		"path": "../public/assets/TransactionNewGroup-DDtBLB6S.js"
	},
	"/assets/trash-2-CCPkPP4d.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"15a-HRyD9fW0SH7b6g0C3s6faVG37Ew\"",
		"mtime": "2026-09-09T18:14:05.710Z",
		"size": 346,
		"path": "../public/assets/trash-2-CCPkPP4d.js"
	},
	"/assets/trending-down-9I_6HanJ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"c4-+89eLLFarMUOTvp1+ntudsxLHrg\"",
		"mtime": "2026-09-09T18:14:05.711Z",
		"size": 196,
		"path": "../public/assets/trending-down-9I_6HanJ.js"
	},
	"/assets/trending-up-60EJicVx.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"c1-8P6xN44k8HizDlMMYDNtYMPDzek\"",
		"mtime": "2026-09-09T18:14:05.712Z",
		"size": 193,
		"path": "../public/assets/trending-up-60EJicVx.js"
	},
	"/assets/Versement-DdzL8k6O.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"17f3-GUusPgBEtqXHTUPN9U0rnkWXoyU\"",
		"mtime": "2026-09-09T18:14:05.362Z",
		"size": 6131,
		"path": "../public/assets/Versement-DdzL8k6O.js"
	},
	"/assets/Tutorial-d1P3J1Bq.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"136ad-/aPKdbzRT4FJ8joog6PB9D4BcIc\"",
		"mtime": "2026-09-09T18:14:05.361Z",
		"size": 79533,
		"path": "../public/assets/Tutorial-d1P3J1Bq.js"
	},
	"/assets/wa-sqlite-async-L_LSrxrb.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f88f-NGMPNASgtNbzZuH6O9+kt/v29/g\"",
		"mtime": "2026-09-09T18:14:05.714Z",
		"size": 63631,
		"path": "../public/assets/wa-sqlite-async-L_LSrxrb.js"
	},
	"/assets/wa-sqlite-BVXfj7bw.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"e9d6-LFag0v/Myx+4L9KqMw5YED3uQZQ\"",
		"mtime": "2026-09-09T18:14:05.713Z",
		"size": 59862,
		"path": "../public/assets/wa-sqlite-BVXfj7bw.js"
	},
	"/assets/wallet-D4Fiiw4o.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"333-2rU+nFEfZaR3YE7igPDXMsjXXL0\"",
		"mtime": "2026-09-09T18:14:05.715Z",
		"size": 819,
		"path": "../public/assets/wallet-D4Fiiw4o.js"
	},
	"/assets/websockets-BrH1W1hC.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1a557-mxpHOqZvkzHe900c1PAg5PC57RM\"",
		"mtime": "2026-09-09T18:14:05.715Z",
		"size": 107863,
		"path": "../public/assets/websockets-BrH1W1hC.js"
	},
	"/assets/websockets-E5bULUr_.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1a62c-rg3+llKpcDkOZD0Mr8foSXIMZf4\"",
		"mtime": "2026-09-09T18:14:05.850Z",
		"size": 108076,
		"path": "../public/assets/websockets-E5bULUr_.js"
	},
	"/assets/worker-DJSXMwe3.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"12df0-e0L59HHmgiflz5cssaAxMwdrPHU\"",
		"mtime": "2026-09-09T18:14:05.851Z",
		"size": 77296,
		"path": "../public/assets/worker-DJSXMwe3.js"
	},
	"/assets/x-BQO0J7P0.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"8f-CcQa4lR7Sa0wEqTRP1u9+8bxcpU\"",
		"mtime": "2026-09-09T18:14:05.717Z",
		"size": 143,
		"path": "../public/assets/x-BQO0J7P0.js"
	},
	"/assets/wa-sqlite-CagagB9I.wasm": {
		"type": "application/wasm",
		"etag": "\"112932-PVZvyjEpDlc7C+RsG8vVBaXaZyQ\"",
		"mtime": "2026-09-09T18:14:05.788Z",
		"size": 1124658,
		"path": "../public/assets/wa-sqlite-CagagB9I.wasm"
	},
	"/assets/wa-sqlite-async-DCIP8kAx.wasm": {
		"type": "application/wasm",
		"etag": "\"22d125-my2aJEczirWasFS1osydDIkHGgk\"",
		"mtime": "2026-09-09T18:14:05.790Z",
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
var globalMiddleware = [toEventHandler(static_default)].filter(Boolean);
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
//#region node_modules/.pnpm/nitro@3.0.260610-beta_jiti@_91cbdd4e5e955b08c2904203236226d4/node_modules/nitro/dist/runtime/internal/app.mjs
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
export { node_server_default as default };
