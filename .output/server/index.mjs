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
	"/manifest.json": {
		"type": "application/json",
		"etag": "\"1eb-Y7kttYgCEPOR8HGHYsGcvSqM47M\"",
		"mtime": "2026-09-02T17:13:42.999Z",
		"size": 491,
		"path": "../public/manifest.json"
	},
	"/assets/AccessHandlePoolVFS-BBHxZmN1.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f0f-lxQFhcqerDW30Wh/ZVekxGyG+NY\"",
		"mtime": "2026-09-09T13:56:34.522Z",
		"size": 3855,
		"path": "../public/assets/AccessHandlePoolVFS-BBHxZmN1.js"
	},
	"/placeholder.svg": {
		"type": "image/svg+xml",
		"etag": "\"cb5-3cfZ/x0uNhX4kurZGAkOBE4K/G0\"",
		"mtime": "2026-09-01T22:18:50.682Z",
		"size": 3253,
		"path": "../public/placeholder.svg"
	},
	"/assets/AccessHandlePoolVFS-k-bp0HG6.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f02-WFkNV/KJ/xa7F3xDGFd1mY/Co6Q\"",
		"mtime": "2026-09-09T13:56:35.280Z",
		"size": 3842,
		"path": "../public/assets/AccessHandlePoolVFS-k-bp0HG6.js"
	},
	"/assets/Archives-BiG7dG58.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"134f-mrcD7fKYojC/24BUPB4ZSkp0nM0\"",
		"mtime": "2026-09-09T13:56:34.522Z",
		"size": 4943,
		"path": "../public/assets/Archives-BiG7dG58.js"
	},
	"/robots.txt": {
		"type": "text/plain; charset=utf-8",
		"etag": "\"ae-hLVBrSrDdpIw3Xl0dJPRkupPepQ\"",
		"mtime": "2026-09-01T22:18:50.689Z",
		"size": 174,
		"path": "../public/robots.txt"
	},
	"/assets/arrow-down-right-BK_kId_y.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"9c-2CsZVo9lmebpCS0FZBJbd0P7zt4\"",
		"mtime": "2026-09-09T13:56:34.957Z",
		"size": 156,
		"path": "../public/assets/arrow-down-right-BK_kId_y.js"
	},
	"/assets/AreaChart-BMbBG1vt.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5ca95-zkCWa8YHm0u46p8QEl9TVycfJww\"",
		"mtime": "2026-09-09T13:56:34.532Z",
		"size": 379541,
		"path": "../public/assets/AreaChart-BMbBG1vt.js"
	},
	"/assets/arrow-left-C6uzbwK2.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"99-/44C3oHVRU2BTF/DYDbVY+HOEvI\"",
		"mtime": "2026-09-09T13:56:34.959Z",
		"size": 153,
		"path": "../public/assets/arrow-left-C6uzbwK2.js"
	},
	"/assets/arrow-up-BG_viRUS.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"105-BwbT3XR5uAMV4UdLmvAREfVbSSs\"",
		"mtime": "2026-09-09T13:56:34.959Z",
		"size": 261,
		"path": "../public/assets/arrow-up-BG_viRUS.js"
	},
	"/assets/arrow-up-right-BBj-8lsx.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"9a-VCHiqYZP0uSSzwhiHzG16F4Evxc\"",
		"mtime": "2026-09-09T13:56:34.959Z",
		"size": 154,
		"path": "../public/assets/arrow-up-right-BBj-8lsx.js"
	},
	"/assets/Balance-6wbebh1q.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"250c-EYJaon22/80SVTZRTqdF4RtEjH8\"",
		"mtime": "2026-09-09T13:56:34.534Z",
		"size": 9484,
		"path": "../public/assets/Balance-6wbebh1q.js"
	},
	"/assets/book-open-t6Wuxq2Q.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"10b-IrZtXJTJUdnGpQ+W421bIGspPWo\"",
		"mtime": "2026-09-09T13:56:34.961Z",
		"size": 267,
		"path": "../public/assets/book-open-t6Wuxq2Q.js"
	},
	"/assets/BottomNav-QSwM7x2B.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1bc1-lAzi2DTtCECpskoPBH2JYHDD53k\"",
		"mtime": "2026-09-09T13:56:34.534Z",
		"size": 7105,
		"path": "../public/assets/BottomNav-QSwM7x2B.js"
	},
	"/assets/building-2-CMqZPpE2.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1ab-r2oVrivFrX5GZgIArFNI+x5eeks\"",
		"mtime": "2026-09-09T13:56:34.961Z",
		"size": 427,
		"path": "../public/assets/building-2-CMqZPpE2.js"
	},
	"/assets/calendar-CMs78aUQ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f6-mJPO57nK9NSuUBvO0eei+uOFoqM\"",
		"mtime": "2026-09-09T13:56:34.961Z",
		"size": 246,
		"path": "../public/assets/calendar-CMs78aUQ.js"
	},
	"/assets/chevron-right-CdTgRs1l.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"76-LXdAZqkvhp8lcC+IkW4iSqb7e6I\"",
		"mtime": "2026-09-09T13:56:34.963Z",
		"size": 118,
		"path": "../public/assets/chevron-right-CdTgRs1l.js"
	},
	"/assets/circle-alert-CFY2NiOX.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"ee-n9rjDY2u47N9tSU8ySoteBFJ7Sc\"",
		"mtime": "2026-09-09T13:56:34.963Z",
		"size": 238,
		"path": "../public/assets/circle-alert-CFY2NiOX.js"
	},
	"/assets/circle-check-big-DYq64ssS.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"b5-Vc5IgSLvddgByNckrqmrfT5cpKA\"",
		"mtime": "2026-09-09T13:56:34.983Z",
		"size": 181,
		"path": "../public/assets/circle-check-big-DYq64ssS.js"
	},
	"/assets/circle-plus-CZQOyaEt.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"c3-FoZ6B7kzIizjthsq8/foBz/YIso\"",
		"mtime": "2026-09-09T13:56:34.983Z",
		"size": 195,
		"path": "../public/assets/circle-plus-CZQOyaEt.js"
	},
	"/assets/clock-eWoIEwE9.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"ac-llMHKD/1Yqq90o6vxUpk0lNxlwk\"",
		"mtime": "2026-09-09T13:56:34.985Z",
		"size": 172,
		"path": "../public/assets/clock-eWoIEwE9.js"
	},
	"/assets/Cotisations-DMR2Xoxc.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1454-oi0XZ166bxJArhsjn+0urDto9hk\"",
		"mtime": "2026-09-09T13:56:34.534Z",
		"size": 5204,
		"path": "../public/assets/Cotisations-DMR2Xoxc.js"
	},
	"/assets/CulteDetail-nUmtgBhG.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"24c0-uAYU1WrBgZ2sGpy8ZfIxDXpL5Hs\"",
		"mtime": "2026-09-09T13:56:34.536Z",
		"size": 9408,
		"path": "../public/assets/CulteDetail-nUmtgBhG.js"
	},
	"/favicon.ico": {
		"type": "image/vnd.microsoft.icon",
		"etag": "\"15f09-4MFHRo4azA6knOGNmsefGO+QUAE\"",
		"mtime": "2026-09-01T22:18:50.675Z",
		"size": 89865,
		"path": "../public/favicon.ico"
	},
	"/lumina-logo.png": {
		"type": "image/png",
		"etag": "\"c2ce-Xrm5OeE6Rcs4GqYh+OFZRZQyAYE\"",
		"mtime": "2026-09-04T20:43:25.384Z",
		"size": 49870,
		"path": "../public/lumina-logo.png"
	},
	"/assets/CustomFields-CBZaD8Oy.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1b79-GCMKoo/owNGIV7icPDp6gT2rN0U\"",
		"mtime": "2026-09-09T13:56:34.536Z",
		"size": 7033,
		"path": "../public/assets/CustomFields-CBZaD8Oy.js"
	},
	"/assets/Dashboard-Clt6EE4-.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4134-0NTK66nhj9I1PYUlYV44OZs1zIs\"",
		"mtime": "2026-09-09T13:56:34.538Z",
		"size": 16692,
		"path": "../public/assets/Dashboard-Clt6EE4-.js"
	},
	"/assets/database-CrrWOpAL.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"e8-0KUoXcF7npaAvIzGOlFDu2HAGtI\"",
		"mtime": "2026-09-09T13:56:34.985Z",
		"size": 232,
		"path": "../public/assets/database-CrrWOpAL.js"
	},
	"/assets/EventDetail-c55Q8w6V.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"52c9-djZpm/YIXMfPBTaDcaDal+drLIQ\"",
		"mtime": "2026-09-09T13:56:34.538Z",
		"size": 21193,
		"path": "../public/assets/EventDetail-c55Q8w6V.js"
	},
	"/assets/EventEdit-CbK5jHBH.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"14fa-JmmT9JbzovQOiIuaechUuTyEHdU\"",
		"mtime": "2026-09-09T13:56:34.538Z",
		"size": 5370,
		"path": "../public/assets/EventEdit-CbK5jHBH.js"
	},
	"/assets/EventNew-Cjsuogqj.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2008-Uf/GGy65MEwEefg9tWPBNMv2D3U\"",
		"mtime": "2026-09-09T13:56:34.540Z",
		"size": 8200,
		"path": "../public/assets/EventNew-Cjsuogqj.js"
	},
	"/assets/Events-C9LwXioN.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"124a-HpWsriL90XI0zTqlIYFdQxOMLhk\"",
		"mtime": "2026-09-09T13:56:34.540Z",
		"size": 4682,
		"path": "../public/assets/Events-C9LwXioN.js"
	},
	"/assets/FacadeVFS-BEICR2q0.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1871-h2JM49n3k6wsMKWYG0w5CCQNUNY\"",
		"mtime": "2026-09-09T13:56:35.280Z",
		"size": 6257,
		"path": "../public/assets/FacadeVFS-BEICR2q0.js"
	},
	"/assets/FacadeVFS-Zb3v5BVa.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1870-VaWlSUoM5KPZovTHWPkc2ip/L+k\"",
		"mtime": "2026-09-09T13:56:34.542Z",
		"size": 6256,
		"path": "../public/assets/FacadeVFS-Zb3v5BVa.js"
	},
	"/assets/Finance-C_xPTDyW.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1b8a-NTsfSlbIfDMLqXBFpQWwnQuOdyM\"",
		"mtime": "2026-09-09T13:56:34.542Z",
		"size": 7050,
		"path": "../public/assets/Finance-C_xPTDyW.js"
	},
	"/assets/FormBuilder-3q5Cftrb.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1fe7-l+W5yAtHyL8bpCFAdXTuu/QpH+Y\"",
		"mtime": "2026-09-09T13:56:34.542Z",
		"size": 8167,
		"path": "../public/assets/FormBuilder-3q5Cftrb.js"
	},
	"/assets/FormFill-BQDhoTk4.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1226-BsxymZ44hrKBEf6/I4D4x1MOlmo\"",
		"mtime": "2026-09-09T13:56:34.810Z",
		"size": 4646,
		"path": "../public/assets/FormFill-BQDhoTk4.js"
	},
	"/assets/formSystem-ZUrNRQUe.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"7ed-5I1qqH1s60kMIMWgDYDJcOjTZI4\"",
		"mtime": "2026-09-09T13:56:34.991Z",
		"size": 2029,
		"path": "../public/assets/formSystem-ZUrNRQUe.js"
	},
	"/assets/GroupDetail-CGJEmMbC.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"55db-9LnOqN5mcdRoqfhRW/O7ugyYm1E\"",
		"mtime": "2026-09-09T13:56:34.810Z",
		"size": 21979,
		"path": "../public/assets/GroupDetail-CGJEmMbC.js"
	},
	"/assets/Groups-oZn9lqUT.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2443-hrJ1V3VIBVnwvMePpABVrrQQt7g\"",
		"mtime": "2026-09-09T13:56:34.810Z",
		"size": 9283,
		"path": "../public/assets/Groups-oZn9lqUT.js"
	},
	"/assets/Help-dXT5rise.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"ca9-eZdkjgx57vkZrlmvwCRfo/HyLho\"",
		"mtime": "2026-09-09T13:56:34.813Z",
		"size": 3241,
		"path": "../public/assets/Help-dXT5rise.js"
	},
	"/assets/History-DO22XIu2.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2edc-sZ6T+A+xwg2YVuMc3JK6jY7miwA\"",
		"mtime": "2026-09-09T13:56:34.813Z",
		"size": 11996,
		"path": "../public/assets/History-DO22XIu2.js"
	},
	"/assets/IDBBatchAtomicVFS-DCPCRbTq.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"32ae-cbCaGJfwVGDuIjuVvODyqToTgHY\"",
		"mtime": "2026-09-09T13:56:34.815Z",
		"size": 12974,
		"path": "../public/assets/IDBBatchAtomicVFS-DCPCRbTq.js"
	},
	"/assets/html2canvas-DCcDvdvP.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"30b50-/NW/tvs1950d+adFAmG+0O5qROc\"",
		"mtime": "2026-09-09T13:56:34.991Z",
		"size": 199504,
		"path": "../public/assets/html2canvas-DCcDvdvP.js"
	},
	"/assets/IDBBatchAtomicVFS-DOQZPx-g.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"32a2-6ppgZuTXuQvYK+HVWuYHmxtHCa0\"",
		"mtime": "2026-09-09T13:56:35.282Z",
		"size": 12962,
		"path": "../public/assets/IDBBatchAtomicVFS-DOQZPx-g.js"
	},
	"/assets/index-BPhyCFiV.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"1013f-mvzycb3HNlriJlE/81qvolIRwDA\"",
		"mtime": "2026-09-09T13:56:35.171Z",
		"size": 65855,
		"path": "../public/assets/index-BPhyCFiV.css"
	},
	"/assets/export-CAN538qL.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"af2eb-iK3qADvrkX11WVX4Q9Irm1Q2iig\"",
		"mtime": "2026-09-09T13:56:34.989Z",
		"size": 717547,
		"path": "../public/assets/export-CAN538qL.js"
	},
	"/assets/index.es-CO-Ii1Vz.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"24f91-RCtYy3+/EVcQcIYgJNuWthg4x34\"",
		"mtime": "2026-09-09T13:56:34.991Z",
		"size": 151441,
		"path": "../public/assets/index.es-CO-Ii1Vz.js"
	},
	"/assets/dist-D9PSg3_W.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"109d05-tfIPLczBSUv6HorYtpyfev4HhrE\"",
		"mtime": "2026-09-09T13:56:34.987Z",
		"size": 1088773,
		"path": "../public/assets/dist-D9PSg3_W.js"
	},
	"/assets/index-DZn_O1Qy.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"bf8e8-487/xDD27X5MCeKa0wtoj3QBUl8\"",
		"mtime": "2026-09-09T13:56:34.522Z",
		"size": 784616,
		"path": "../public/assets/index-DZn_O1Qy.js"
	},
	"/assets/mc-wa-sqlite-async-OK58TZB1.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f9c7-OWgn/LbVfd6oIzizW/33tbyE9i4\"",
		"mtime": "2026-09-09T13:56:34.995Z",
		"size": 63943,
		"path": "../public/assets/mc-wa-sqlite-async-OK58TZB1.js"
	},
	"/assets/mc-wa-sqlite-Dt2CfptV.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"eb0e-ka1IvJlVUyt14/GJnJnIXiNK/CY\"",
		"mtime": "2026-09-09T13:56:34.993Z",
		"size": 60174,
		"path": "../public/assets/mc-wa-sqlite-Dt2CfptV.js"
	},
	"/assets/Members-BGccw5TM.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1d6f-QFRisHcd09GLpsqz7NLAVLC3EY0\"",
		"mtime": "2026-09-09T13:56:34.815Z",
		"size": 7535,
		"path": "../public/assets/Members-BGccw5TM.js"
	},
	"/assets/MembreDetail-D_8w848S.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1f95-nx6H5LSyLJ1rHZa7Lb5sAu/IlQk\"",
		"mtime": "2026-09-09T13:56:34.817Z",
		"size": 8085,
		"path": "../public/assets/MembreDetail-D_8w848S.js"
	},
	"/assets/MembresEnAvance-BF3MwzyQ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"cc0-Nf9Wzv129mQFVEmfLBaq4P0fBSE\"",
		"mtime": "2026-09-09T13:56:34.852Z",
		"size": 3264,
		"path": "../public/assets/MembresEnAvance-BF3MwzyQ.js"
	},
	"/assets/MemoryVFS-CDaH4cwM.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"61c-yULvbqLgoSVvMq9saYz4X5pwoxk\"",
		"mtime": "2026-09-09T13:56:34.852Z",
		"size": 1564,
		"path": "../public/assets/MemoryVFS-CDaH4cwM.js"
	},
	"/assets/MemoryVFS-DQF4WRTC.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"61c-i2gYtp7yBd03f77k1kJ2TRrrTSQ\"",
		"mtime": "2026-09-09T13:56:35.282Z",
		"size": 1564,
		"path": "../public/assets/MemoryVFS-DQF4WRTC.js"
	},
	"/assets/NotFound-BnP8zMWW.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"39c-S8sXgiiYp8LDjpxYPHacawIAs3Q\"",
		"mtime": "2026-09-09T13:56:34.854Z",
		"size": 924,
		"path": "../public/assets/NotFound-BnP8zMWW.js"
	},
	"/assets/Notifications-D9S3QsNP.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"17a6-F2Vv86zrRbFHuD+ONOlpE3qcsVc\"",
		"mtime": "2026-09-09T13:56:34.854Z",
		"size": 6054,
		"path": "../public/assets/Notifications-D9S3QsNP.js"
	},
	"/assets/Onboarding-B047nHpl.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"34a2-nNKTzhVcEFUFu99xlyTMe+Y3REw\"",
		"mtime": "2026-09-09T13:56:34.860Z",
		"size": 13474,
		"path": "../public/assets/Onboarding-B047nHpl.js"
	},
	"/assets/OPFSCoopSyncVFS-B-QgOkHN.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1dea-mrc6zSUFDQFUcBwuJ586RfkndBo\"",
		"mtime": "2026-09-09T13:56:34.856Z",
		"size": 7658,
		"path": "../public/assets/OPFSCoopSyncVFS-B-QgOkHN.js"
	},
	"/assets/OPFSCoopSyncVFS-DATtbZFi.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1dde-35NXNSgW4WGGg2Jx/DvLz8pj/JQ\"",
		"mtime": "2026-09-09T13:56:35.284Z",
		"size": 7646,
		"path": "../public/assets/OPFSCoopSyncVFS-DATtbZFi.js"
	},
	"/assets/OPFSWriteAheadVFS-CX_4GWcg.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5cf9-cI2LfB2+suz1Uy8hZSH+FmyX+7k\"",
		"mtime": "2026-09-09T13:56:34.860Z",
		"size": 23801,
		"path": "../public/assets/OPFSWriteAheadVFS-CX_4GWcg.js"
	},
	"/assets/OPFSWriteAheadVFS-Dceb9ZfN.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5cf2-6VWvwZq/3kDJah89Fj0JQlYKJAI\"",
		"mtime": "2026-09-09T13:56:35.284Z",
		"size": 23794,
		"path": "../public/assets/OPFSWriteAheadVFS-Dceb9ZfN.js"
	},
	"/assets/p-1sJ0ZDPe-YkMm5iKi.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"8ed2-6KdNiR6CHzWsfcskhcqF/kG5SYg\"",
		"mtime": "2026-09-09T13:56:34.995Z",
		"size": 36562,
		"path": "../public/assets/p-1sJ0ZDPe-YkMm5iKi.js"
	},
	"/assets/p-5ldEpNdG-6dZfqBTh.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"276c-eLE8B8Pe9lKRYBRZPz3DZQM2vmI\"",
		"mtime": "2026-09-09T13:56:34.995Z",
		"size": 10092,
		"path": "../public/assets/p-5ldEpNdG-6dZfqBTh.js"
	},
	"/assets/p-BMPN55of-C0P_qWS_.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"21a-HGYAvd2qgF1iEwCzq6eCRzodk80\"",
		"mtime": "2026-09-09T13:56:34.997Z",
		"size": 538,
		"path": "../public/assets/p-BMPN55of-C0P_qWS_.js"
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
	"/assets/p-BmVRXR1y-Qf1gG5of.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3e6-cIzBL2cgY/c+Nd+w1vUUDnL3YhY\"",
		"mtime": "2026-09-09T13:56:34.999Z",
		"size": 998,
		"path": "../public/assets/p-BmVRXR1y-Qf1gG5of.js"
	},
	"/assets/p-BQyuFxYc-BP5sUz4F.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"624-sKMq1g03/KlKcB/qZDlMk1Tk0Qk\"",
		"mtime": "2026-09-09T13:56:34.997Z",
		"size": 1572,
		"path": "../public/assets/p-BQyuFxYc-BP5sUz4F.js"
	},
	"/assets/mc-wa-sqlite-DoDpgFfE.wasm": {
		"type": "application/wasm",
		"etag": "\"1405ab-mYFvsN3agcsYu7kHk/nCjgNgqQ8\"",
		"mtime": "2026-09-09T13:56:35.171Z",
		"size": 1312171,
		"path": "../public/assets/mc-wa-sqlite-DoDpgFfE.wasm"
	},
	"/assets/p-BT9-hMMz-DeoKjx0N.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1ee-rguGWc7rPK2wzL0Vb/AugNuA+fM\"",
		"mtime": "2026-09-09T13:56:34.999Z",
		"size": 494,
		"path": "../public/assets/p-BT9-hMMz-DeoKjx0N.js"
	},
	"/assets/p-BWoa-cki-UpDL1J1V.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"469-MAKOTmbsqUpzRy0RZ0/MkYlxxqE\"",
		"mtime": "2026-09-09T13:56:34.999Z",
		"size": 1129,
		"path": "../public/assets/p-BWoa-cki-UpDL1J1V.js"
	},
	"/assets/p-C-NbvXu4-B9XCdoFH.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"127b-nP1/e4Mh7JXhis9RI1WSxH7S81E\"",
		"mtime": "2026-09-09T13:56:35.001Z",
		"size": 4731,
		"path": "../public/assets/p-C-NbvXu4-B9XCdoFH.js"
	},
	"/assets/p-C09TXohi-BME7HMRv.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"c7c-eBlQFVuVp95kjyeMXHxMBBybRJM\"",
		"mtime": "2026-09-09T13:56:35.001Z",
		"size": 3196,
		"path": "../public/assets/p-C09TXohi-BME7HMRv.js"
	},
	"/assets/p-C4VpVfrJ-B7tOqQiD.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"28b6-z0kccsJcaxrsNNsPUeOkumHk1lc\"",
		"mtime": "2026-09-09T13:56:35.064Z",
		"size": 10422,
		"path": "../public/assets/p-C4VpVfrJ-B7tOqQiD.js"
	},
	"/assets/p-CG_zZq_I-Bnu5sziO.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3a9-IewWt3kc3BnoWwAVte31wTmqo4k\"",
		"mtime": "2026-09-09T13:56:35.064Z",
		"size": 937,
		"path": "../public/assets/p-CG_zZq_I-Bnu5sziO.js"
	},
	"/assets/p-CWuIRJQN-CpJ4cxhA.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"26e-fZxIO0/B5h4LVezuzSyQ2tIfW08\"",
		"mtime": "2026-09-09T13:56:35.064Z",
		"size": 622,
		"path": "../public/assets/p-CWuIRJQN-CpJ4cxhA.js"
	},
	"/assets/p-D0YpjgON-DuPvRicD.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"15f9-l2t1qtt076m1Azprcw7kb/Qo+DQ\"",
		"mtime": "2026-09-09T13:56:35.066Z",
		"size": 5625,
		"path": "../public/assets/p-D0YpjgON-DuPvRicD.js"
	},
	"/assets/p-D7-vHX0A-M28BuEVW.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4ac-++v6wgkqI6DQPAYjpbKuefeV/jU\"",
		"mtime": "2026-09-09T13:56:35.066Z",
		"size": 1196,
		"path": "../public/assets/p-D7-vHX0A-M28BuEVW.js"
	},
	"/assets/p-qAXsfUff-UrBZGjF-.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"403-VFqIV1qmCBL/QnR1Ulrs6NA9M2s\"",
		"mtime": "2026-09-09T13:56:35.068Z",
		"size": 1027,
		"path": "../public/assets/p-qAXsfUff-UrBZGjF-.js"
	},
	"/assets/p-ZjP4CjeZ-DJ1DGIsW.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"62-xIml61NROF4B1cx8XnHtA30tV1Q\"",
		"mtime": "2026-09-09T13:56:35.066Z",
		"size": 98,
		"path": "../public/assets/p-ZjP4CjeZ-DJ1DGIsW.js"
	},
	"/assets/pen-line-B4P1LMxQ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"10a-nvS0M8haJnY8w+w/51styWXetiY\"",
		"mtime": "2026-09-09T13:56:35.068Z",
		"size": 266,
		"path": "../public/assets/pen-line-B4P1LMxQ.js"
	},
	"/assets/purify.es-ChwZkWde.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"68bc-bPPRDEosU/Lqj+2Oyi1ue22LViM\"",
		"mtime": "2026-09-09T13:56:35.068Z",
		"size": 26812,
		"path": "../public/assets/purify.es-ChwZkWde.js"
	},
	"/assets/mc-wa-sqlite-async-DYagSq56.wasm": {
		"type": "application/wasm",
		"etag": "\"263900-YXiey/3Hhr2OVYDVjdLpGtiNQfI\"",
		"mtime": "2026-09-09T13:56:35.276Z",
		"size": 2504960,
		"path": "../public/assets/mc-wa-sqlite-async-DYagSq56.wasm"
	},
	"/assets/refresh-cw-T-j2il72.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"135-+POq6p5wqr/JUXRpCSMobSeO/W0\"",
		"mtime": "2026-09-09T13:56:35.157Z",
		"size": 309,
		"path": "../public/assets/refresh-cw-T-j2il72.js"
	},
	"/assets/ReportBuilder-DTbGzl-Q.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1e2a-J/uMFDOZPDhHAzllEi1hfp7xG8g\"",
		"mtime": "2026-09-09T13:56:34.862Z",
		"size": 7722,
		"path": "../public/assets/ReportBuilder-DTbGzl-Q.js"
	},
	"/assets/Reports-hZhuv40N.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"23b8-7/sDN91Ht6SIiymSEJEccbh97HQ\"",
		"mtime": "2026-09-09T13:56:34.862Z",
		"size": 9144,
		"path": "../public/assets/Reports-hZhuv40N.js"
	},
	"/assets/resource-bfoRr-xc.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"9cb-jbDbTxbdV4dgLA2uszdMqd03nVY\"",
		"mtime": "2026-09-09T13:56:35.159Z",
		"size": 2507,
		"path": "../public/assets/resource-bfoRr-xc.js"
	},
	"/assets/RoleSelection-BmdkjXSL.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"110e-6WmBD4s2HVgrQ4Vva8qoMeC0dms\"",
		"mtime": "2026-09-09T13:56:34.898Z",
		"size": 4366,
		"path": "../public/assets/RoleSelection-BmdkjXSL.js"
	},
	"/assets/rolldown-runtime-hePW80VL.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2cc-fA8td6k29UVF6JoPfhOPkceTK1M\"",
		"mtime": "2026-09-09T13:56:35.159Z",
		"size": 716,
		"path": "../public/assets/rolldown-runtime-hePW80VL.js"
	},
	"/assets/SaisieRapide-Dggsd7x9.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"228-TpzZQ44QNVoE6Smwa9fjPawCprU\"",
		"mtime": "2026-09-09T13:56:34.898Z",
		"size": 552,
		"path": "../public/assets/SaisieRapide-Dggsd7x9.js"
	},
	"/assets/search-CZR-c9ND.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"a1-GNuy9jmCVetZwg2INIbqQEJEkg8\"",
		"mtime": "2026-09-09T13:56:35.161Z",
		"size": 161,
		"path": "../public/assets/search-CZR-c9ND.js"
	},
	"/assets/security-CPHDFpdn.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f33-C2Miy5A4omHBoxpqDaOViatt6kc\"",
		"mtime": "2026-09-09T13:56:35.163Z",
		"size": 3891,
		"path": "../public/assets/security-CPHDFpdn.js"
	},
	"/assets/Settings-D94wpIov.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3aed-qgyexnyCjVMY0rJsEeVyBDiLhKw\"",
		"mtime": "2026-09-09T13:56:34.900Z",
		"size": 15085,
		"path": "../public/assets/Settings-D94wpIov.js"
	},
	"/assets/Skeleton-DRSq4mVD.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"413-0iXwsdjT11qfSzz1EAoSShZ96U0\"",
		"mtime": "2026-09-09T13:56:34.900Z",
		"size": 1043,
		"path": "../public/assets/Skeleton-DRSq4mVD.js"
	},
	"/assets/tag-BhiFS3Bp.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"13b-jnk7TiNDJRr886Uq+fSRB+9MN5E\"",
		"mtime": "2026-09-09T13:56:35.163Z",
		"size": 315,
		"path": "../public/assets/tag-BhiFS3Bp.js"
	},
	"/assets/TopHeader-B6zthqMu.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"743-ll2HKyCtMX+g+f6BzfeGTpUBaM0\"",
		"mtime": "2026-09-09T13:56:34.902Z",
		"size": 1859,
		"path": "../public/assets/TopHeader-B6zthqMu.js"
	},
	"/assets/Trace-DpkF-9Z3.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"125e-c8q1OoyGh3gfCBW8cAOUp0AGHa4\"",
		"mtime": "2026-09-09T13:56:34.902Z",
		"size": 4702,
		"path": "../public/assets/Trace-DpkF-9Z3.js"
	},
	"/assets/TransactionCard-C-f2Ss9C.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"a74-kGsbQVUPgkhAN+Z87lEX0GSiChE\"",
		"mtime": "2026-09-09T13:56:34.902Z",
		"size": 2676,
		"path": "../public/assets/TransactionCard-C-f2Ss9C.js"
	},
	"/assets/TransactionDetail-DfKf0nlZ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2517-supI9c8KUJNEl8d0itJx9gzekKo\"",
		"mtime": "2026-09-09T13:56:34.904Z",
		"size": 9495,
		"path": "../public/assets/TransactionDetail-DfKf0nlZ.js"
	},
	"/assets/TransactionEdit-Y1lpZKaz.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1a0f-H5ztI1XUY+1QWnFl9vAD/Mp/xPw\"",
		"mtime": "2026-09-09T13:56:34.904Z",
		"size": 6671,
		"path": "../public/assets/TransactionEdit-Y1lpZKaz.js"
	},
	"/assets/TransactionNew-CYgUoRlM.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1b0f-CRYNihXwzTvg8lNttYm4uAs2bVE\"",
		"mtime": "2026-09-09T13:56:34.955Z",
		"size": 6927,
		"path": "../public/assets/TransactionNew-CYgUoRlM.js"
	},
	"/assets/TransactionNewGroup-Bi2_25pB.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"18fd-J+BivCSygzp6spwHveZJjgBrdKk\"",
		"mtime": "2026-09-09T13:56:34.955Z",
		"size": 6397,
		"path": "../public/assets/TransactionNewGroup-Bi2_25pB.js"
	},
	"/assets/trash-2-Dk3AhX7M.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"15a-BHbLjOnvU9+JPzjT2o0e6+krEVg\"",
		"mtime": "2026-09-09T13:56:35.163Z",
		"size": 346,
		"path": "../public/assets/trash-2-Dk3AhX7M.js"
	},
	"/assets/trending-down-CQ7mqD2a.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"c4-92qYeIqUon/TO3gguV5cm6GM69M\"",
		"mtime": "2026-09-09T13:56:35.165Z",
		"size": 196,
		"path": "../public/assets/trending-down-CQ7mqD2a.js"
	},
	"/assets/trending-up-BzEVdRNU.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"c1-KSOfHBBASBPQPop3nCTjKySB3+0\"",
		"mtime": "2026-09-09T13:56:35.165Z",
		"size": 193,
		"path": "../public/assets/trending-up-BzEVdRNU.js"
	},
	"/assets/Versement-Dl-wB1-W.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"183f-B9vKykx7i7re4lsBQo9tYsn4/5Q\"",
		"mtime": "2026-09-09T13:56:34.957Z",
		"size": 6207,
		"path": "../public/assets/Versement-Dl-wB1-W.js"
	},
	"/assets/Tutorial-DqMEbhGV.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"136e6-fuZSRfStsD0pE5FpgmNSFqDf3QA\"",
		"mtime": "2026-09-09T13:56:34.957Z",
		"size": 79590,
		"path": "../public/assets/Tutorial-DqMEbhGV.js"
	},
	"/assets/wa-sqlite-async-L_LSrxrb.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f88f-NGMPNASgtNbzZuH6O9+kt/v29/g\"",
		"mtime": "2026-09-09T13:56:35.167Z",
		"size": 63631,
		"path": "../public/assets/wa-sqlite-async-L_LSrxrb.js"
	},
	"/assets/wa-sqlite-BVXfj7bw.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"e9d6-LFag0v/Myx+4L9KqMw5YED3uQZQ\"",
		"mtime": "2026-09-09T13:56:35.165Z",
		"size": 59862,
		"path": "../public/assets/wa-sqlite-BVXfj7bw.js"
	},
	"/assets/wallet-C90zLlTO.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"333-W4ZhZxp673U7RCOSxpNsLCFyBT8\"",
		"mtime": "2026-09-09T13:56:35.167Z",
		"size": 819,
		"path": "../public/assets/wallet-C90zLlTO.js"
	},
	"/assets/websockets-BrH1W1hC.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1a557-mxpHOqZvkzHe900c1PAg5PC57RM\"",
		"mtime": "2026-09-09T13:56:35.169Z",
		"size": 107863,
		"path": "../public/assets/websockets-BrH1W1hC.js"
	},
	"/assets/websockets-E5bULUr_.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1a62c-rg3+llKpcDkOZD0Mr8foSXIMZf4\"",
		"mtime": "2026-09-09T13:56:35.651Z",
		"size": 108076,
		"path": "../public/assets/websockets-E5bULUr_.js"
	},
	"/assets/worker-DJSXMwe3.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"12df0-e0L59HHmgiflz5cssaAxMwdrPHU\"",
		"mtime": "2026-09-09T13:56:35.651Z",
		"size": 77296,
		"path": "../public/assets/worker-DJSXMwe3.js"
	},
	"/assets/x-BgfNcCdD.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"8f-1AVCVJreTrugpDJd15+TIpd0Pgw\"",
		"mtime": "2026-09-09T13:56:35.169Z",
		"size": 143,
		"path": "../public/assets/x-BgfNcCdD.js"
	},
	"/assets/wa-sqlite-CagagB9I.wasm": {
		"type": "application/wasm",
		"etag": "\"112932-PVZvyjEpDlc7C+RsG8vVBaXaZyQ\"",
		"mtime": "2026-09-09T13:56:35.278Z",
		"size": 1124658,
		"path": "../public/assets/wa-sqlite-CagagB9I.wasm"
	},
	"/assets/wa-sqlite-async-DCIP8kAx.wasm": {
		"type": "application/wasm",
		"etag": "\"22d125-my2aJEczirWasFS1osydDIkHGgk\"",
		"mtime": "2026-09-09T13:56:35.280Z",
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
