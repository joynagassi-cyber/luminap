globalThis.__nitro_main__ = import.meta.url;
import { a as setHeader, b as serve, d as defineLazyEventHandler, i as getHeader, n as defineEventHandler, o as H3Core, r as getCookie, s as HTTPError, t as createError, u as defineHandler, v as toEventHandler, y as NodeResponse } from "./_libs/h3+rou3+srvx.mjs";
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
	"/robots.txt": {
		"type": "text/plain; charset=utf-8",
		"etag": "\"ae-hLVBrSrDdpIw3Xl0dJPRkupPepQ\"",
		"mtime": "2026-09-01T22:18:50.689Z",
		"size": 174,
		"path": "../public/robots.txt"
	},
	"/assets/AccessHandlePoolVFS-C87C_48M.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f0f-3vIn7/PVVk+eEjMunMBdIp1uUvM\"",
		"mtime": "2026-09-09T19:41:23.539Z",
		"size": 3855,
		"path": "../public/assets/AccessHandlePoolVFS-C87C_48M.js"
	},
	"/assets/AccessHandlePoolVFS-k-bp0HG6.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f02-WFkNV/KJ/xa7F3xDGFd1mY/Co6Q\"",
		"mtime": "2026-09-09T19:41:25.085Z",
		"size": 3842,
		"path": "../public/assets/AccessHandlePoolVFS-k-bp0HG6.js"
	},
	"/manifest.json": {
		"type": "application/json",
		"etag": "\"1eb-Y7kttYgCEPOR8HGHYsGcvSqM47M\"",
		"mtime": "2026-09-02T17:13:42.999Z",
		"size": 491,
		"path": "../public/manifest.json"
	},
	"/assets/Archives-BROuKu87.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1386-4P4SwJHoQXdEyDBHV1gWPkvINAg\"",
		"mtime": "2026-09-09T19:41:23.952Z",
		"size": 4998,
		"path": "../public/assets/Archives-BROuKu87.js"
	},
	"/assets/arrow-down-right-BWqfOhWd.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"9c-H3Nx1J8iMP2lLBSOVF4BtjQU2fA\"",
		"mtime": "2026-09-09T19:41:24.439Z",
		"size": 156,
		"path": "../public/assets/arrow-down-right-BWqfOhWd.js"
	},
	"/assets/arrow-left-nETGIZw0.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"99-hh6FZi3hbkZ+n0XQy9I0e3cy7iA\"",
		"mtime": "2026-09-09T19:41:24.440Z",
		"size": 153,
		"path": "../public/assets/arrow-left-nETGIZw0.js"
	},
	"/assets/arrow-up-Doxy4it7.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"105-d4B0bEHxJelsE+YsnJ5Q1RsXTBk\"",
		"mtime": "2026-09-09T19:41:24.441Z",
		"size": 261,
		"path": "../public/assets/arrow-up-Doxy4it7.js"
	},
	"/assets/arrow-up-right-3Eq7MwsA.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"9a-Yen7HcxB6QsaI8iNg0dRoIi3Dmk\"",
		"mtime": "2026-09-09T19:41:24.442Z",
		"size": 154,
		"path": "../public/assets/arrow-up-right-3Eq7MwsA.js"
	},
	"/assets/Balance-B_heFPoE.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"263b-9DX/tPvyz2HG+Vi1xixAUfkOOZ4\"",
		"mtime": "2026-09-09T19:41:23.954Z",
		"size": 9787,
		"path": "../public/assets/Balance-B_heFPoE.js"
	},
	"/assets/BottomNav-B2nVDdZf.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1cbb-5PWMMvISG7Gmhh22QH614da3M4A\"",
		"mtime": "2026-09-09T19:41:23.955Z",
		"size": 7355,
		"path": "../public/assets/BottomNav-B2nVDdZf.js"
	},
	"/assets/AreaChart-D73jphdM.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5ca95-bJaNe9cxIKXVa0pWyE1crz8av1U\"",
		"mtime": "2026-09-09T19:41:23.953Z",
		"size": 379541,
		"path": "../public/assets/AreaChart-D73jphdM.js"
	},
	"/assets/book-open-BsxzBGNP.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"10b-JCLSwRvG4WloXoh9Tr8qGhHjNSQ\"",
		"mtime": "2026-09-09T19:41:24.443Z",
		"size": 267,
		"path": "../public/assets/book-open-BsxzBGNP.js"
	},
	"/assets/building-2-j-ssS7R9.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1ab-j5+GBXX1P+lWMfFxWtS1dxGLhSI\"",
		"mtime": "2026-09-09T19:41:24.512Z",
		"size": 427,
		"path": "../public/assets/building-2-j-ssS7R9.js"
	},
	"/assets/calendar-h7r7h1zG.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f6-oRRU72CafQ9vxwbqTE2yMExnFXc\"",
		"mtime": "2026-09-09T19:41:24.539Z",
		"size": 246,
		"path": "../public/assets/calendar-h7r7h1zG.js"
	},
	"/assets/chevron-right-9AslI2EG.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"76-vsPMXT+w3s+90xYrcNdk6GyjESY\"",
		"mtime": "2026-09-09T19:41:24.539Z",
		"size": 118,
		"path": "../public/assets/chevron-right-9AslI2EG.js"
	},
	"/assets/circle-alert-Cz1BcgGH.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"ee-mrmVNQy4LaL1lIA8Ei4hZ5MEAuw\"",
		"mtime": "2026-09-09T19:41:24.540Z",
		"size": 238,
		"path": "../public/assets/circle-alert-Cz1BcgGH.js"
	},
	"/assets/circle-check-big-CEJl797_.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"b5-sAxNfGgXwMX2Kbyy41DDOi2P4fQ\"",
		"mtime": "2026-09-09T19:41:24.577Z",
		"size": 181,
		"path": "../public/assets/circle-check-big-CEJl797_.js"
	},
	"/assets/circle-plus-C2KfRqBH.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"c3-b7x85AGVs+EIVkZzUjdpTGzubE8\"",
		"mtime": "2026-09-09T19:41:24.578Z",
		"size": 195,
		"path": "../public/assets/circle-plus-C2KfRqBH.js"
	},
	"/assets/clock-D2aF0Ee2.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"ac-BrQf+aymiSU2DPVjLHbUq0m5ax0\"",
		"mtime": "2026-09-09T19:41:24.579Z",
		"size": 172,
		"path": "../public/assets/clock-D2aF0Ee2.js"
	},
	"/assets/Cotisations-BXzvzM6t.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"14c9-jZONKgbmXLgD9jawtNsPmV5K+9s\"",
		"mtime": "2026-09-09T19:41:23.971Z",
		"size": 5321,
		"path": "../public/assets/Cotisations-BXzvzM6t.js"
	},
	"/assets/CulteDetail-DFKcRYWg.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2568-2nB898UR+uhh53dMMLa5NU6fJxw\"",
		"mtime": "2026-09-09T19:41:23.972Z",
		"size": 9576,
		"path": "../public/assets/CulteDetail-DFKcRYWg.js"
	},
	"/assets/CustomFields-DvV0NjBr.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1c2b-oMjoBnG4TZYCyNRcz5+eyH4wHto\"",
		"mtime": "2026-09-09T19:41:23.972Z",
		"size": 7211,
		"path": "../public/assets/CustomFields-DvV0NjBr.js"
	},
	"/assets/Dashboard-brFfHmCT.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4302-UlvgkSxFl1wHKUYveL3vxvbb3JI\"",
		"mtime": "2026-09-09T19:41:23.973Z",
		"size": 17154,
		"path": "../public/assets/Dashboard-brFfHmCT.js"
	},
	"/assets/database-Cxvt_TQM.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"e8-uH0cBKDgf2SVPARLw0/oIqtCMaU\"",
		"mtime": "2026-09-09T19:41:24.580Z",
		"size": 232,
		"path": "../public/assets/database-Cxvt_TQM.js"
	},
	"/assets/EventDetail-Q2qF9CSI.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"53f0-xohCVvka4DsFPubZG6KF/lByGxE\"",
		"mtime": "2026-09-09T19:41:23.974Z",
		"size": 21488,
		"path": "../public/assets/EventDetail-Q2qF9CSI.js"
	},
	"/assets/EventEdit-BgkrbhBf.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"14ad-zCN9WMLT1TmYh67LbQalAZAcGFg\"",
		"mtime": "2026-09-09T19:41:23.975Z",
		"size": 5293,
		"path": "../public/assets/EventEdit-BgkrbhBf.js"
	},
	"/assets/EventNew-DvZTtbfo.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1fee-NAr1/tg4BqczvOAOvYR5Mu5XlSU\"",
		"mtime": "2026-09-09T19:41:23.975Z",
		"size": 8174,
		"path": "../public/assets/EventNew-DvZTtbfo.js"
	},
	"/assets/Events-BuXdFpYK.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"12c9-ea8b0C2i+AX23Q1Bkzj57SFDOaw\"",
		"mtime": "2026-09-09T19:41:23.976Z",
		"size": 4809,
		"path": "../public/assets/Events-BuXdFpYK.js"
	},
	"/assets/FacadeVFS-BEICR2q0.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1871-h2JM49n3k6wsMKWYG0w5CCQNUNY\"",
		"mtime": "2026-09-09T19:41:25.086Z",
		"size": 6257,
		"path": "../public/assets/FacadeVFS-BEICR2q0.js"
	},
	"/assets/FacadeVFS-BzA_px1z.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1870-51XXsYQFqd4+O0L/pBe7RfFfcxA\"",
		"mtime": "2026-09-09T19:41:23.977Z",
		"size": 6256,
		"path": "../public/assets/FacadeVFS-BzA_px1z.js"
	},
	"/assets/Finance-CylF1gNl.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1c16-Xf4rNk6znymOJiUfMSBd4j0Dgbk\"",
		"mtime": "2026-09-09T19:41:23.978Z",
		"size": 7190,
		"path": "../public/assets/Finance-CylF1gNl.js"
	},
	"/assets/FormBuilder-BP8A5d5Z.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1fb4-d4MfrdpzDg1P86G4rR2euQ6A4g8\"",
		"mtime": "2026-09-09T19:41:23.978Z",
		"size": 8116,
		"path": "../public/assets/FormBuilder-BP8A5d5Z.js"
	},
	"/assets/FormFill-Di53C6wd.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"11f6-gk1uPbBLjfWLscSvsyZ5chgXa8k\"",
		"mtime": "2026-09-09T19:41:24.006Z",
		"size": 4598,
		"path": "../public/assets/FormFill-Di53C6wd.js"
	},
	"/assets/formSystem-BitzrI0Z.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"7ed-ZCzdotz8iFYEeRBeFuoteN8Xp+M\"",
		"mtime": "2026-09-09T19:41:24.584Z",
		"size": 2029,
		"path": "../public/assets/formSystem-BitzrI0Z.js"
	},
	"/assets/GroupDetail-BijWajdg.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"55b4-6E645X/Ialg68WHmZZcxHr7haqo\"",
		"mtime": "2026-09-09T19:41:24.007Z",
		"size": 21940,
		"path": "../public/assets/GroupDetail-BijWajdg.js"
	},
	"/assets/Groups-Db50iZza.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2402-2CaRGBWDMcYZZnN1uAMULEG9jok\"",
		"mtime": "2026-09-09T19:41:24.007Z",
		"size": 9218,
		"path": "../public/assets/Groups-Db50iZza.js"
	},
	"/assets/Help-Co10ToPV.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"ca9-tGBveEAYRh8TwlXffZ8GImAiYuU\"",
		"mtime": "2026-09-09T19:41:24.008Z",
		"size": 3241,
		"path": "../public/assets/Help-Co10ToPV.js"
	},
	"/assets/History-Ct1Ccm4W.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2edc-dlN+RSxvgf1/bNFHH3FOoPIrjxU\"",
		"mtime": "2026-09-09T19:41:24.009Z",
		"size": 11996,
		"path": "../public/assets/History-Ct1Ccm4W.js"
	},
	"/assets/IDBBatchAtomicVFS-Cj13NG-S.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"32ae-4U1StHiZs2eKxbiQzHuOcdBym/U\"",
		"mtime": "2026-09-09T19:41:24.010Z",
		"size": 12974,
		"path": "../public/assets/IDBBatchAtomicVFS-Cj13NG-S.js"
	},
	"/assets/IDBBatchAtomicVFS-DOQZPx-g.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"32a2-6ppgZuTXuQvYK+HVWuYHmxtHCa0\"",
		"mtime": "2026-09-09T19:41:25.086Z",
		"size": 12962,
		"path": "../public/assets/IDBBatchAtomicVFS-DOQZPx-g.js"
	},
	"/assets/html2canvas-DCcDvdvP.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"30b50-/NW/tvs1950d+adFAmG+0O5qROc\"",
		"mtime": "2026-09-09T19:41:24.585Z",
		"size": 199504,
		"path": "../public/assets/html2canvas-DCcDvdvP.js"
	},
	"/assets/index-BsGaAvQB.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"108ce-2hKmQANOyInWpAcr0HmKnpoSPfE\"",
		"mtime": "2026-09-09T19:41:25.075Z",
		"size": 67790,
		"path": "../public/assets/index-BsGaAvQB.css"
	},
	"/assets/export-in7gR_n2.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"af2eb-vhIXQkg4NewPzfod/MUFuOFpVD0\"",
		"mtime": "2026-09-09T19:41:24.583Z",
		"size": 717547,
		"path": "../public/assets/export-in7gR_n2.js"
	},
	"/assets/index-BugrjKXu.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"bf80f-Ve4iVMuYCHwES5FXBTDLWk9pz2Q\"",
		"mtime": "2026-09-09T19:41:23.538Z",
		"size": 784399,
		"path": "../public/assets/index-BugrjKXu.js"
	},
	"/assets/dist-D9PSg3_W.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"109d05-tfIPLczBSUv6HorYtpyfev4HhrE\"",
		"mtime": "2026-09-09T19:41:24.582Z",
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
	"/assets/index.es-Cf3oWm6x.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"24f91-sJOhr1X4oW/yP8z4UjdbFiKLK4I\"",
		"mtime": "2026-09-09T19:41:24.616Z",
		"size": 151441,
		"path": "../public/assets/index.es-Cf3oWm6x.js"
	},
	"/assets/logo-lumina.png": {
		"type": "image/png",
		"etag": "\"c2ce-Xrm5OeE6Rcs4GqYh+OFZRZQyAYE\"",
		"mtime": "2026-09-03T16:41:02.881Z",
		"size": 49870,
		"path": "../public/assets/logo-lumina.png"
	},
	"/placeholder.svg": {
		"type": "image/svg+xml",
		"etag": "\"cb5-3cfZ/x0uNhX4kurZGAkOBE4K/G0\"",
		"mtime": "2026-09-01T22:18:50.682Z",
		"size": 3253,
		"path": "../public/placeholder.svg"
	},
	"/assets/mc-wa-sqlite-async-OK58TZB1.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f9c7-OWgn/LbVfd6oIzizW/33tbyE9i4\"",
		"mtime": "2026-09-09T19:41:24.618Z",
		"size": 63943,
		"path": "../public/assets/mc-wa-sqlite-async-OK58TZB1.js"
	},
	"/assets/mc-wa-sqlite-Dt2CfptV.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"eb0e-ka1IvJlVUyt14/GJnJnIXiNK/CY\"",
		"mtime": "2026-09-09T19:41:24.617Z",
		"size": 60174,
		"path": "../public/assets/mc-wa-sqlite-Dt2CfptV.js"
	},
	"/assets/Members-D9xJF_zN.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1ca0-/FePUdrneuxJVNls3kHcksyISug\"",
		"mtime": "2026-09-09T19:41:24.010Z",
		"size": 7328,
		"path": "../public/assets/Members-D9xJF_zN.js"
	},
	"/assets/MembreDetail-ClbTSCLd.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1f95-Ep51xJ0RndduY2Fff40KBH/9x7w\"",
		"mtime": "2026-09-09T19:41:24.011Z",
		"size": 8085,
		"path": "../public/assets/MembreDetail-ClbTSCLd.js"
	},
	"/assets/MembresEnAvance-DD8uOYEp.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"cc0-5Yt2nwzhIagrn1ZQYdqX5f3+Wk0\"",
		"mtime": "2026-09-09T19:41:24.019Z",
		"size": 3264,
		"path": "../public/assets/MembresEnAvance-DD8uOYEp.js"
	},
	"/assets/MemoryVFS-BZhSq9V-.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"61c-UwNTsiFCDnBSG8aWsoR16xDTKe4\"",
		"mtime": "2026-09-09T19:41:24.020Z",
		"size": 1564,
		"path": "../public/assets/MemoryVFS-BZhSq9V-.js"
	},
	"/assets/MemoryVFS-DQF4WRTC.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"61c-i2gYtp7yBd03f77k1kJ2TRrrTSQ\"",
		"mtime": "2026-09-09T19:41:25.087Z",
		"size": 1564,
		"path": "../public/assets/MemoryVFS-DQF4WRTC.js"
	},
	"/assets/NotFound-BnP8zMWW.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"39c-S8sXgiiYp8LDjpxYPHacawIAs3Q\"",
		"mtime": "2026-09-09T19:41:24.021Z",
		"size": 924,
		"path": "../public/assets/NotFound-BnP8zMWW.js"
	},
	"/assets/Notifications--CQQpmPx.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"17a7-eF+gmnDniw7PimHQVWVDs8ERKnE\"",
		"mtime": "2026-09-09T19:41:24.022Z",
		"size": 6055,
		"path": "../public/assets/Notifications--CQQpmPx.js"
	},
	"/assets/Onboarding-De8fGlWb.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"34a2-3gHt4IFdfw5gPAMh5oMXPRiO/Rs\"",
		"mtime": "2026-09-09T19:41:24.025Z",
		"size": 13474,
		"path": "../public/assets/Onboarding-De8fGlWb.js"
	},
	"/assets/OPFSCoopSyncVFS-DATtbZFi.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1dde-35NXNSgW4WGGg2Jx/DvLz8pj/JQ\"",
		"mtime": "2026-09-09T19:41:25.088Z",
		"size": 7646,
		"path": "../public/assets/OPFSCoopSyncVFS-DATtbZFi.js"
	},
	"/assets/OPFSCoopSyncVFS-_7IriKLc.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1dea-pYGx1KwwDqfXd3Xd4t2YyJTcoCc\"",
		"mtime": "2026-09-09T19:41:24.023Z",
		"size": 7658,
		"path": "../public/assets/OPFSCoopSyncVFS-_7IriKLc.js"
	},
	"/assets/OPFSWriteAheadVFS-Bb3p_avk.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5cf9-A/byPYIOGSladaEfdXamox/AHjE\"",
		"mtime": "2026-09-09T19:41:24.024Z",
		"size": 23801,
		"path": "../public/assets/OPFSWriteAheadVFS-Bb3p_avk.js"
	},
	"/assets/OPFSWriteAheadVFS-Dceb9ZfN.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5cf2-6VWvwZq/3kDJah89Fj0JQlYKJAI\"",
		"mtime": "2026-09-09T19:41:25.089Z",
		"size": 23794,
		"path": "../public/assets/OPFSWriteAheadVFS-Dceb9ZfN.js"
	},
	"/assets/p-1sJ0ZDPe-YkMm5iKi.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"8ed2-6KdNiR6CHzWsfcskhcqF/kG5SYg\"",
		"mtime": "2026-09-09T19:41:24.620Z",
		"size": 36562,
		"path": "../public/assets/p-1sJ0ZDPe-YkMm5iKi.js"
	},
	"/assets/p-5ldEpNdG-6dZfqBTh.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"276c-eLE8B8Pe9lKRYBRZPz3DZQM2vmI\"",
		"mtime": "2026-09-09T19:41:24.620Z",
		"size": 10092,
		"path": "../public/assets/p-5ldEpNdG-6dZfqBTh.js"
	},
	"/assets/p-BMPN55of-C0P_qWS_.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"21a-HGYAvd2qgF1iEwCzq6eCRzodk80\"",
		"mtime": "2026-09-09T19:41:24.621Z",
		"size": 538,
		"path": "../public/assets/p-BMPN55of-C0P_qWS_.js"
	},
	"/assets/mc-wa-sqlite-DoDpgFfE.wasm": {
		"type": "application/wasm",
		"etag": "\"1405ab-mYFvsN3agcsYu7kHk/nCjgNgqQ8\"",
		"mtime": "2026-09-09T19:41:25.077Z",
		"size": 1312171,
		"path": "../public/assets/mc-wa-sqlite-DoDpgFfE.wasm"
	},
	"/assets/p-BmVRXR1y-Qf1gG5of.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3e6-cIzBL2cgY/c+Nd+w1vUUDnL3YhY\"",
		"mtime": "2026-09-09T19:41:24.624Z",
		"size": 998,
		"path": "../public/assets/p-BmVRXR1y-Qf1gG5of.js"
	},
	"/assets/p-BQyuFxYc-BP5sUz4F.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"624-sKMq1g03/KlKcB/qZDlMk1Tk0Qk\"",
		"mtime": "2026-09-09T19:41:24.622Z",
		"size": 1572,
		"path": "../public/assets/p-BQyuFxYc-BP5sUz4F.js"
	},
	"/assets/p-BT9-hMMz-DeoKjx0N.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1ee-rguGWc7rPK2wzL0Vb/AugNuA+fM\"",
		"mtime": "2026-09-09T19:41:24.623Z",
		"size": 494,
		"path": "../public/assets/p-BT9-hMMz-DeoKjx0N.js"
	},
	"/assets/p-BWoa-cki-UpDL1J1V.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"469-MAKOTmbsqUpzRy0RZ0/MkYlxxqE\"",
		"mtime": "2026-09-09T19:41:24.623Z",
		"size": 1129,
		"path": "../public/assets/p-BWoa-cki-UpDL1J1V.js"
	},
	"/assets/p-C-NbvXu4-B9XCdoFH.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"127b-nP1/e4Mh7JXhis9RI1WSxH7S81E\"",
		"mtime": "2026-09-09T19:41:24.625Z",
		"size": 4731,
		"path": "../public/assets/p-C-NbvXu4-B9XCdoFH.js"
	},
	"/assets/p-C09TXohi-BME7HMRv.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"c7c-eBlQFVuVp95kjyeMXHxMBBybRJM\"",
		"mtime": "2026-09-09T19:41:24.626Z",
		"size": 3196,
		"path": "../public/assets/p-C09TXohi-BME7HMRv.js"
	},
	"/assets/p-C4VpVfrJ-B7tOqQiD.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"28b6-z0kccsJcaxrsNNsPUeOkumHk1lc\"",
		"mtime": "2026-09-09T19:41:24.693Z",
		"size": 10422,
		"path": "../public/assets/p-C4VpVfrJ-B7tOqQiD.js"
	},
	"/assets/p-CG_zZq_I-Bnu5sziO.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3a9-IewWt3kc3BnoWwAVte31wTmqo4k\"",
		"mtime": "2026-09-09T19:41:24.724Z",
		"size": 937,
		"path": "../public/assets/p-CG_zZq_I-Bnu5sziO.js"
	},
	"/assets/p-CWuIRJQN-CpJ4cxhA.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"26e-fZxIO0/B5h4LVezuzSyQ2tIfW08\"",
		"mtime": "2026-09-09T19:41:24.725Z",
		"size": 622,
		"path": "../public/assets/p-CWuIRJQN-CpJ4cxhA.js"
	},
	"/assets/p-D0YpjgON-DuPvRicD.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"15f9-l2t1qtt076m1Azprcw7kb/Qo+DQ\"",
		"mtime": "2026-09-09T19:41:24.726Z",
		"size": 5625,
		"path": "../public/assets/p-D0YpjgON-DuPvRicD.js"
	},
	"/assets/p-D7-vHX0A-M28BuEVW.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4ac-++v6wgkqI6DQPAYjpbKuefeV/jU\"",
		"mtime": "2026-09-09T19:41:24.727Z",
		"size": 1196,
		"path": "../public/assets/p-D7-vHX0A-M28BuEVW.js"
	},
	"/assets/p-qAXsfUff-UrBZGjF-.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"403-VFqIV1qmCBL/QnR1Ulrs6NA9M2s\"",
		"mtime": "2026-09-09T19:41:24.728Z",
		"size": 1027,
		"path": "../public/assets/p-qAXsfUff-UrBZGjF-.js"
	},
	"/assets/p-ZjP4CjeZ-DJ1DGIsW.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"62-xIml61NROF4B1cx8XnHtA30tV1Q\"",
		"mtime": "2026-09-09T19:41:24.727Z",
		"size": 98,
		"path": "../public/assets/p-ZjP4CjeZ-DJ1DGIsW.js"
	},
	"/assets/pen-line-CyIPx3un.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"10a-4PtaWhSiTtBjE3kZh6BP40yrGVI\"",
		"mtime": "2026-09-09T19:41:24.729Z",
		"size": 266,
		"path": "../public/assets/pen-line-CyIPx3un.js"
	},
	"/assets/purify.es-ChwZkWde.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"68bc-bPPRDEosU/Lqj+2Oyi1ue22LViM\"",
		"mtime": "2026-09-09T19:41:24.730Z",
		"size": 26812,
		"path": "../public/assets/purify.es-ChwZkWde.js"
	},
	"/assets/refresh-cw-CKyHwbvl.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"135-NUwiKdOATpHZZhV0tMsfKFnu4+U\"",
		"mtime": "2026-09-09T19:41:24.904Z",
		"size": 309,
		"path": "../public/assets/refresh-cw-CKyHwbvl.js"
	},
	"/assets/mc-wa-sqlite-async-DYagSq56.wasm": {
		"type": "application/wasm",
		"etag": "\"263900-YXiey/3Hhr2OVYDVjdLpGtiNQfI\"",
		"mtime": "2026-09-09T19:41:25.080Z",
		"size": 2504960,
		"path": "../public/assets/mc-wa-sqlite-async-DYagSq56.wasm"
	},
	"/assets/ReportBuilder-Cq8rdW8-.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1eed-cE3bGF13U024R/gsteMs3ISPRsg\"",
		"mtime": "2026-09-09T19:41:24.025Z",
		"size": 7917,
		"path": "../public/assets/ReportBuilder-Cq8rdW8-.js"
	},
	"/assets/Reports-DZFQFt_v.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"23b8-aKScph7qJUwNcz/p5S5L77oeYwA\"",
		"mtime": "2026-09-09T19:41:24.026Z",
		"size": 9144,
		"path": "../public/assets/Reports-DZFQFt_v.js"
	},
	"/assets/resource-CRkHq0Kj.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"9cb-DzCm7FKmoqLiLKYpVSRmy/4LlYA\"",
		"mtime": "2026-09-09T19:41:24.935Z",
		"size": 2507,
		"path": "../public/assets/resource-CRkHq0Kj.js"
	},
	"/assets/RoleSelection-CTiz2I4F.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"110e-P8qP9As4m2JXJ4fvXmauEBBCsbk\"",
		"mtime": "2026-09-09T19:41:24.040Z",
		"size": 4366,
		"path": "../public/assets/RoleSelection-CTiz2I4F.js"
	},
	"/assets/rolldown-runtime-hePW80VL.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2cc-fA8td6k29UVF6JoPfhOPkceTK1M\"",
		"mtime": "2026-09-09T19:41:24.936Z",
		"size": 716,
		"path": "../public/assets/rolldown-runtime-hePW80VL.js"
	},
	"/assets/SaisieRapide-Dggsd7x9.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"228-TpzZQ44QNVoE6Smwa9fjPawCprU\"",
		"mtime": "2026-09-09T19:41:24.041Z",
		"size": 552,
		"path": "../public/assets/SaisieRapide-Dggsd7x9.js"
	},
	"/assets/search-BR0_8ljL.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"a1-dQ2uiOODBUHNGbbJg1lPvjX1Ayo\"",
		"mtime": "2026-09-09T19:41:24.937Z",
		"size": 161,
		"path": "../public/assets/search-BR0_8ljL.js"
	},
	"/assets/security-CPHDFpdn.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f33-C2Miy5A4omHBoxpqDaOViatt6kc\"",
		"mtime": "2026-09-09T19:41:24.977Z",
		"size": 3891,
		"path": "../public/assets/security-CPHDFpdn.js"
	},
	"/assets/Settings-QvXo3wMg.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3d0a-qIH+TKsa5jEr9nMDysl/9Xf88TQ\"",
		"mtime": "2026-09-09T19:41:24.042Z",
		"size": 15626,
		"path": "../public/assets/Settings-QvXo3wMg.js"
	},
	"/assets/Skeleton-DRSq4mVD.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"413-0iXwsdjT11qfSzz1EAoSShZ96U0\"",
		"mtime": "2026-09-09T19:41:24.042Z",
		"size": 1043,
		"path": "../public/assets/Skeleton-DRSq4mVD.js"
	},
	"/assets/tag-BHDr78ec.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"13b-4qxziwsI+W6O1phADegLO78SdZA\"",
		"mtime": "2026-09-09T19:41:24.978Z",
		"size": 315,
		"path": "../public/assets/tag-BHDr78ec.js"
	},
	"/assets/TopHeader-CfEIG7PM.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"75f-SbTB3wUQdHeGwW9UqjsRGq36nDQ\"",
		"mtime": "2026-09-09T19:41:24.043Z",
		"size": 1887,
		"path": "../public/assets/TopHeader-CfEIG7PM.js"
	},
	"/assets/Trace-705l7TjN.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1252-jmd5Xcv2mlX3QCzxw9oF5nmXC5g\"",
		"mtime": "2026-09-09T19:41:24.044Z",
		"size": 4690,
		"path": "../public/assets/Trace-705l7TjN.js"
	},
	"/assets/TransactionCard-7DzUPhKm.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"a74-Hs4dtiQJfMmCo8p0qupL4AwPNa8\"",
		"mtime": "2026-09-09T19:41:24.045Z",
		"size": 2676,
		"path": "../public/assets/TransactionCard-7DzUPhKm.js"
	},
	"/assets/TransactionDetail-CCsk9b80.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"24ff-uT21G/a7R4Lu7MRME8y/BTPEh60\"",
		"mtime": "2026-09-09T19:41:24.045Z",
		"size": 9471,
		"path": "../public/assets/TransactionDetail-CCsk9b80.js"
	},
	"/assets/TransactionEdit-5ourN7a7.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1a7c-CDeb8riRjQLwKhTuDKUI8+m1GkU\"",
		"mtime": "2026-09-09T19:41:24.046Z",
		"size": 6780,
		"path": "../public/assets/TransactionEdit-5ourN7a7.js"
	},
	"/assets/TransactionNew-BtaQYo1E.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1ad3-sNXF5r8n67iSK7ARwjfcNv+tNvs\"",
		"mtime": "2026-09-09T19:41:24.053Z",
		"size": 6867,
		"path": "../public/assets/TransactionNew-BtaQYo1E.js"
	},
	"/assets/TransactionNewGroup-D75kMXJy.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"18a9-2O0YZxSjyGvgXXz/sKIaBr1MQ/E\"",
		"mtime": "2026-09-09T19:41:24.054Z",
		"size": 6313,
		"path": "../public/assets/TransactionNewGroup-D75kMXJy.js"
	},
	"/assets/trash-2-ByfZnlFT.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"15a-M62T9IKHww/VMyBwrFjnSHb3MVQ\"",
		"mtime": "2026-09-09T19:41:24.979Z",
		"size": 346,
		"path": "../public/assets/trash-2-ByfZnlFT.js"
	},
	"/assets/trending-down-CTRDwtNR.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"c4-WhEyhCPqArXAOPtZnzSWe445iw0\"",
		"mtime": "2026-09-09T19:41:24.980Z",
		"size": 196,
		"path": "../public/assets/trending-down-CTRDwtNR.js"
	},
	"/assets/trending-up-a6ahRrK3.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"c1-AgJm9B5yGFwJC/IK/oLW5jJDxV4\"",
		"mtime": "2026-09-09T19:41:24.980Z",
		"size": 193,
		"path": "../public/assets/trending-up-a6ahRrK3.js"
	},
	"/assets/Tutorial-j8L105PC.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"136ad-WC5ueCPHVO7tKlgOCuJ5it7PM6c\"",
		"mtime": "2026-09-09T19:41:24.054Z",
		"size": 79533,
		"path": "../public/assets/Tutorial-j8L105PC.js"
	},
	"/assets/Versement-CLD2TtIS.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"17f3-SR+SU9mPgYYZAUyIr+tpHDfkUrc\"",
		"mtime": "2026-09-09T19:41:24.437Z",
		"size": 6131,
		"path": "../public/assets/Versement-CLD2TtIS.js"
	},
	"/assets/wa-sqlite-async-L_LSrxrb.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f88f-NGMPNASgtNbzZuH6O9+kt/v29/g\"",
		"mtime": "2026-09-09T19:41:24.982Z",
		"size": 63631,
		"path": "../public/assets/wa-sqlite-async-L_LSrxrb.js"
	},
	"/assets/wa-sqlite-BVXfj7bw.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"e9d6-LFag0v/Myx+4L9KqMw5YED3uQZQ\"",
		"mtime": "2026-09-09T19:41:24.981Z",
		"size": 59862,
		"path": "../public/assets/wa-sqlite-BVXfj7bw.js"
	},
	"/assets/wallet-DWb7wAmO.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"333-uOqjEk07q1PiifoqJqs2CbDwBhs\"",
		"mtime": "2026-09-09T19:41:24.983Z",
		"size": 819,
		"path": "../public/assets/wallet-DWb7wAmO.js"
	},
	"/assets/websockets-BrH1W1hC.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1a557-mxpHOqZvkzHe900c1PAg5PC57RM\"",
		"mtime": "2026-09-09T19:41:24.984Z",
		"size": 107863,
		"path": "../public/assets/websockets-BrH1W1hC.js"
	},
	"/assets/websockets-E5bULUr_.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1a62c-rg3+llKpcDkOZD0Mr8foSXIMZf4\"",
		"mtime": "2026-09-09T19:41:25.292Z",
		"size": 108076,
		"path": "../public/assets/websockets-E5bULUr_.js"
	},
	"/assets/worker-DJSXMwe3.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"12df0-e0L59HHmgiflz5cssaAxMwdrPHU\"",
		"mtime": "2026-09-09T19:41:25.310Z",
		"size": 77296,
		"path": "../public/assets/worker-DJSXMwe3.js"
	},
	"/assets/x-LlWoPrav.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"8f-6pMEA5uKCF17apRrNILTKnb+o+k\"",
		"mtime": "2026-09-09T19:41:24.985Z",
		"size": 143,
		"path": "../public/assets/x-LlWoPrav.js"
	},
	"/assets/wa-sqlite-CagagB9I.wasm": {
		"type": "application/wasm",
		"etag": "\"112932-PVZvyjEpDlc7C+RsG8vVBaXaZyQ\"",
		"mtime": "2026-09-09T19:41:25.082Z",
		"size": 1124658,
		"path": "../public/assets/wa-sqlite-CagagB9I.wasm"
	},
	"/assets/wa-sqlite-async-DCIP8kAx.wasm": {
		"type": "application/wasm",
		"etag": "\"22d125-my2aJEczirWasFS1osydDIkHGgk\"",
		"mtime": "2026-09-09T19:41:25.084Z",
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
