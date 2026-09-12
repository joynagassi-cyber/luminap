globalThis.__nitro_main__ = import.meta.url;
import { _ as NodeResponse, a as defineEventHandler, g as toEventHandler, h as setHeader, i as createError, l as getCookie, n as HTTPError, o as defineHandler, s as defineLazyEventHandler, t as H3Core, u as getHeader, v as serve } from "./_libs/h3+rou3+srvx.mjs";
import { t as HookableCore } from "./_libs/hookable.mjs";
import { i as withoutTrailingSlash, n as joinURL, r as withLeadingSlash, t as decodePath } from "./_libs/ufo.mjs";
import { randomBytes } from "node:crypto";
import { promises } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
//#region node_modules/nitro/dist/runtime/internal/route-rules.mjs
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
		"etag": "\"1eb-Y7kttYgCEPOR8HGHYsGcvSqM47M\"",
		"mtime": "2026-09-02T17:13:42.999Z",
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
	"/assets/AccessHandlePoolVFS-B_v2Mz_k.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f02-j7MgA6DNs18EyuZOpsFnXIg4yas\"",
		"mtime": "2026-09-11T12:20:22.337Z",
		"size": 3842,
		"path": "../public/assets/AccessHandlePoolVFS-B_v2Mz_k.js"
	},
	"/assets/AccessHandlePoolVFS-CHJgoVcN.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f0f-qWB1RtzAhWzd56X7uYNlTTXRjyo\"",
		"mtime": "2026-09-11T12:20:21.383Z",
		"size": 3855,
		"path": "../public/assets/AccessHandlePoolVFS-CHJgoVcN.js"
	},
	"/assets/Archives-DFoLFTtz.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1398-GmGcJlG7yZjKN1OA+UOUUzRnR8Y\"",
		"mtime": "2026-09-11T12:20:21.383Z",
		"size": 5016,
		"path": "../public/assets/Archives-DFoLFTtz.js"
	},
	"/assets/arrow-down-right-BueWgXu9.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"9c-aD0RK3TKf2PwdVTvb9cU1UU1oRI\"",
		"mtime": "2026-09-11T12:20:21.493Z",
		"size": 156,
		"path": "../public/assets/arrow-down-right-BueWgXu9.js"
	},
	"/assets/AreaChart-DxS-UCZM.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5cfab-F/ZQudJVJ+vwJoYWOXHH0Xf/tew\"",
		"mtime": "2026-09-11T12:20:21.391Z",
		"size": 380843,
		"path": "../public/assets/AreaChart-DxS-UCZM.js"
	},
	"/assets/arrow-left-CgNY1BzQ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"99-8EL7BW/KvZ9UoGEOwdVpcl65hOA\"",
		"mtime": "2026-09-11T12:20:21.493Z",
		"size": 153,
		"path": "../public/assets/arrow-left-CgNY1BzQ.js"
	},
	"/assets/arrow-up-DhLMwo2o.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"105-4aVNtDdDrxdTO6LR/cmcITQMP9Q\"",
		"mtime": "2026-09-11T12:20:21.495Z",
		"size": 261,
		"path": "../public/assets/arrow-up-DhLMwo2o.js"
	},
	"/assets/arrow-up-right-DBaRTsXX.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"9a-RMfG/xM56mkpR4d6GXWVvUkXBUg\"",
		"mtime": "2026-09-11T12:20:21.497Z",
		"size": 154,
		"path": "../public/assets/arrow-up-right-DBaRTsXX.js"
	},
	"/assets/Balance-Bsq2kotJ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2678-Lc48aZblPKriVwrOgvW7dv8oSJc\"",
		"mtime": "2026-09-11T12:20:21.391Z",
		"size": 9848,
		"path": "../public/assets/Balance-Bsq2kotJ.js"
	},
	"/assets/book-open-DC_nqxh7.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"10b-RjWXVqehWAXCXLbj4g5G9SOf7RM\"",
		"mtime": "2026-09-11T12:20:21.497Z",
		"size": 267,
		"path": "../public/assets/book-open-DC_nqxh7.js"
	},
	"/assets/BottomNav-B3HTBzh-.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1c3f-dxS/5pFr/cnTdhLmOPQJJ4OJs/I\"",
		"mtime": "2026-09-11T12:20:21.391Z",
		"size": 7231,
		"path": "../public/assets/BottomNav-B3HTBzh-.js"
	},
	"/assets/building-2-D_ZV5Plg.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1ab-dE/rdzF/TZ/O575cK+VwwhvFJ3k\"",
		"mtime": "2026-09-11T12:20:21.497Z",
		"size": 427,
		"path": "../public/assets/building-2-D_ZV5Plg.js"
	},
	"/assets/calendar-Ihzndf7f.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f6-iSzEqKiKbcfgKn1Xlr1Vx+65DRM\"",
		"mtime": "2026-09-11T12:20:21.499Z",
		"size": 246,
		"path": "../public/assets/calendar-Ihzndf7f.js"
	},
	"/assets/CentralAdmin-wdsDo4yB.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"291e-b0dzzgmwVZlJdg3sW0bYBODr06k\"",
		"mtime": "2026-09-11T12:20:21.393Z",
		"size": 10526,
		"path": "../public/assets/CentralAdmin-wdsDo4yB.js"
	},
	"/assets/chevron-right-qmIq9Htg.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"76-lzC6OmYEsjjiWA+A3UyicDPcKwA\"",
		"mtime": "2026-09-11T12:20:21.499Z",
		"size": 118,
		"path": "../public/assets/chevron-right-qmIq9Htg.js"
	},
	"/assets/circle-alert-Crz-UYFN.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"ee-U8sH7tHUbAooNonnHteDN1zXqmM\"",
		"mtime": "2026-09-11T12:20:21.499Z",
		"size": 238,
		"path": "../public/assets/circle-alert-Crz-UYFN.js"
	},
	"/assets/circle-check-big-B1oYvd0E.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"b5-xwDlWlTHoIry1a9Gqbj8ZITSAeg\"",
		"mtime": "2026-09-11T12:20:21.531Z",
		"size": 181,
		"path": "../public/assets/circle-check-big-B1oYvd0E.js"
	},
	"/assets/circle-plus-DR9Y105l.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"c3-KHpyc7ofxndTho1gRNjjkx7xKpA\"",
		"mtime": "2026-09-11T12:20:21.531Z",
		"size": 195,
		"path": "../public/assets/circle-plus-DR9Y105l.js"
	},
	"/assets/circle-x-CIOsEMR9.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"c3-TrWsIBevjkf/6HjalkcquS8wdGc\"",
		"mtime": "2026-09-11T12:20:21.533Z",
		"size": 195,
		"path": "../public/assets/circle-x-CIOsEMR9.js"
	},
	"/assets/clock-BXfHmsN-.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"ac-F4MrSBR3GEqpV9CDC+boriOa3KM\"",
		"mtime": "2026-09-11T12:20:21.533Z",
		"size": 172,
		"path": "../public/assets/clock-BXfHmsN-.js"
	},
	"/assets/Cotisations-DaGR5vr2.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"14f2-qqGz1HUpcj1ymRQN6AbR/KFrcE4\"",
		"mtime": "2026-09-11T12:20:21.393Z",
		"size": 5362,
		"path": "../public/assets/Cotisations-DaGR5vr2.js"
	},
	"/assets/CulteDetail-BjTz20ba.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"25d1-+56P9DoLpkl2fRfwogC/IEPs8bk\"",
		"mtime": "2026-09-11T12:20:21.394Z",
		"size": 9681,
		"path": "../public/assets/CulteDetail-BjTz20ba.js"
	},
	"/assets/CustomFields-D1K8ZQDO.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1c98-OoOjvSGgjKZTNVSnk7T6GecyGhc\"",
		"mtime": "2026-09-11T12:20:21.394Z",
		"size": 7320,
		"path": "../public/assets/CustomFields-D1K8ZQDO.js"
	},
	"/assets/Dashboard-Cnu5x1tn.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"447a-a9CbZMLl7dC0KtqBtRziunkj/Ms\"",
		"mtime": "2026-09-11T12:20:21.396Z",
		"size": 17530,
		"path": "../public/assets/Dashboard-Cnu5x1tn.js"
	},
	"/assets/database-DdgT6bMP.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"e8-cdf4GWj/CO30dWTGOuIg8f2Bsy4\"",
		"mtime": "2026-09-11T12:20:21.533Z",
		"size": 232,
		"path": "../public/assets/database-DdgT6bMP.js"
	},
	"/assets/EventDetail-BRV036CW.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"543c-w9UMl+NXIc/wHsWJe68Mp2Man7g\"",
		"mtime": "2026-09-11T12:20:21.396Z",
		"size": 21564,
		"path": "../public/assets/EventDetail-BRV036CW.js"
	},
	"/assets/EventEdit-BhlzsPVg.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"148a-LbihTRmTS6W8KUMK7QiLN4KCMcc\"",
		"mtime": "2026-09-11T12:20:21.396Z",
		"size": 5258,
		"path": "../public/assets/EventEdit-BhlzsPVg.js"
	},
	"/assets/EventNew-CP5j7oZz.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1ffa-WzSW7O3cVav2vaSIUJJPNCfEpOc\"",
		"mtime": "2026-09-11T12:20:21.398Z",
		"size": 8186,
		"path": "../public/assets/EventNew-CP5j7oZz.js"
	},
	"/assets/Events-BTSCX4h7.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"12db-e7yXm/2jnN20tZrbHzgTBu/h8b0\"",
		"mtime": "2026-09-11T12:20:21.398Z",
		"size": 4827,
		"path": "../public/assets/Events-BTSCX4h7.js"
	},
	"/assets/FacadeVFS-4ewM4DQq.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1871-UKRTDPzVf5+DjjmT8DzKvEfk6Ss\"",
		"mtime": "2026-09-11T12:20:22.337Z",
		"size": 6257,
		"path": "../public/assets/FacadeVFS-4ewM4DQq.js"
	},
	"/assets/FacadeVFS-CWGesnn0.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1870-hCLADQhZK8sJg6Yr5QY9JD5Q9qM\"",
		"mtime": "2026-09-11T12:20:21.400Z",
		"size": 6256,
		"path": "../public/assets/FacadeVFS-CWGesnn0.js"
	},
	"/assets/Finance-BXiAIWUg.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1c0a-Ry2ffXoyekGPsMizd9iu5OOGYLQ\"",
		"mtime": "2026-09-11T12:20:21.400Z",
		"size": 7178,
		"path": "../public/assets/Finance-BXiAIWUg.js"
	},
	"/assets/FormBuilder-Bk5KfPuu.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"204f-llM7eKPN8P+86JJ+mC5a1BBtop0\"",
		"mtime": "2026-09-11T12:20:21.409Z",
		"size": 8271,
		"path": "../public/assets/FormBuilder-Bk5KfPuu.js"
	},
	"/assets/FormFill-CZgP49YG.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1204-q4NupOK2Fj2t8ImU3dJpz0Fx3tQ\"",
		"mtime": "2026-09-11T12:20:21.409Z",
		"size": 4612,
		"path": "../public/assets/FormFill-CZgP49YG.js"
	},
	"/assets/formSystem-C-9avzAq.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"7ee-xjLQFOtT4xD91YlQAgeTh0RQOyE\"",
		"mtime": "2026-09-11T12:20:21.538Z",
		"size": 2030,
		"path": "../public/assets/formSystem-C-9avzAq.js"
	},
	"/assets/GroupDetail-5RUc8_1F.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"561a-iMsR9E9B6LXwNVYCaUU4VNepGd8\"",
		"mtime": "2026-09-11T12:20:21.409Z",
		"size": 22042,
		"path": "../public/assets/GroupDetail-5RUc8_1F.js"
	},
	"/assets/Groups-CDtbbh5P.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"247c-lP+5A3P5LQDmI4KSQPFRyLJolQk\"",
		"mtime": "2026-09-11T12:20:21.411Z",
		"size": 9340,
		"path": "../public/assets/Groups-CDtbbh5P.js"
	},
	"/assets/Help-nBCGRK6N.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"bdd-rlKxvbbDDdMV+rlgSrtU/HUpAC4\"",
		"mtime": "2026-09-11T12:20:21.411Z",
		"size": 3037,
		"path": "../public/assets/Help-nBCGRK6N.js"
	},
	"/assets/History-D5NP5AU4.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2ed6-8kwl7KxLqWSqost45jaEXOcpMrU\"",
		"mtime": "2026-09-11T12:20:21.413Z",
		"size": 11990,
		"path": "../public/assets/History-D5NP5AU4.js"
	},
	"/assets/IDBBatchAtomicVFS-Brc5ZJDl.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"32a2-g0oRsDGKPcTEg2AO8sEgrTe94bc\"",
		"mtime": "2026-09-11T12:20:22.337Z",
		"size": 12962,
		"path": "../public/assets/IDBBatchAtomicVFS-Brc5ZJDl.js"
	},
	"/assets/html2canvas-Cm_vP64m.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"30b48-IGnv6zj943GH6wjafpyySvZzm2M\"",
		"mtime": "2026-09-11T12:20:21.538Z",
		"size": 199496,
		"path": "../public/assets/html2canvas-Cm_vP64m.js"
	},
	"/assets/IDBBatchAtomicVFS-NKUB0EFC.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"32ae-h/l6cJrOEKR0GTx/H10hAkLrqqk\"",
		"mtime": "2026-09-11T12:20:21.413Z",
		"size": 12974,
		"path": "../public/assets/IDBBatchAtomicVFS-NKUB0EFC.js"
	},
	"/assets/export-C-xhZ5mv.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"af21c-pEFXn8EXooK9nN7rotKlaXDsMe0\"",
		"mtime": "2026-09-11T12:20:21.536Z",
		"size": 717340,
		"path": "../public/assets/export-C-xhZ5mv.js"
	},
	"/assets/index-B8t-WIZ0.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"c6ac6-upJRHvqKB8DPMFdwkMIldDe8J9k\"",
		"mtime": "2026-09-11T12:20:21.383Z",
		"size": 813766,
		"path": "../public/assets/index-B8t-WIZ0.js"
	},
	"/assets/dist-Cdhn3tvA.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"10d05f-bxjatVwPrqA6Fj7eMrCJwZcrAi4\"",
		"mtime": "2026-09-11T12:20:21.536Z",
		"size": 1101919,
		"path": "../public/assets/dist-Cdhn3tvA.js"
	},
	"/assets/index-DAdLOkUq.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"1ad0f-vQNx0uulYGpLRP5eDNcT/kVyleM\"",
		"mtime": "2026-09-11T12:20:22.263Z",
		"size": 109839,
		"path": "../public/assets/index-DAdLOkUq.css"
	},
	"/assets/index.es-GlK-0frW.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"24f75-/gqJ9tt5u4FVbj73Y7qfRJRlM3I\"",
		"mtime": "2026-09-11T12:20:21.540Z",
		"size": 151413,
		"path": "../public/assets/index.es-GlK-0frW.js"
	},
	"/assets/info-DDYr8C6p.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"c1-XBR2cQVNOw4aUMIzygAWmNzECRU\"",
		"mtime": "2026-09-11T12:20:21.540Z",
		"size": 193,
		"path": "../public/assets/info-DDYr8C6p.js"
	},
	"/assets/invitation-hmUAGm2c.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"14a4-q0Ji/YWoo2XzwDpM3R5CS/UjoZE\"",
		"mtime": "2026-09-11T12:20:21.540Z",
		"size": 5284,
		"path": "../public/assets/invitation-hmUAGm2c.js"
	},
	"/assets/InvitationManage-B5SMd4Xb.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"178f-CnmmPrMfLv5CuQk2ROdMgirU/mo\"",
		"mtime": "2026-09-11T12:20:21.417Z",
		"size": 6031,
		"path": "../public/assets/InvitationManage-B5SMd4Xb.js"
	},
	"/assets/InvitationEmit-DHUBMW6C.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5b58-jax7dxO2HsOuQIFh1bqEu3YDKDY\"",
		"mtime": "2026-09-11T12:20:21.417Z",
		"size": 23384,
		"path": "../public/assets/InvitationEmit-DHUBMW6C.js"
	},
	"/assets/InvitationClaim-1KtsNKEz.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"798db-db/gLv/k4r4jrLpnBZ/Avx53s4g\"",
		"mtime": "2026-09-11T12:20:21.415Z",
		"size": 497883,
		"path": "../public/assets/InvitationClaim-1KtsNKEz.js"
	},
	"/assets/landmark-KM5_J-eD.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"18c-6hjSvwd+7t+wXB5AOA1aig3NySA\"",
		"mtime": "2026-09-11T12:20:21.543Z",
		"size": 396,
		"path": "../public/assets/landmark-KM5_J-eD.js"
	},
	"/assets/mc-wa-sqlite-async-OK58TZB1.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f9c7-OWgn/LbVfd6oIzizW/33tbyE9i4\"",
		"mtime": "2026-09-11T12:20:21.544Z",
		"size": 63943,
		"path": "../public/assets/mc-wa-sqlite-async-OK58TZB1.js"
	},
	"/assets/mc-wa-sqlite-Dt2CfptV.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"eb0e-ka1IvJlVUyt14/GJnJnIXiNK/CY\"",
		"mtime": "2026-09-11T12:20:21.543Z",
		"size": 60174,
		"path": "../public/assets/mc-wa-sqlite-Dt2CfptV.js"
	},
	"/assets/Members-EoJoWj-c.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1d0d-4ts+HSG5vTuGcFZewMwJ/AdtqW4\"",
		"mtime": "2026-09-11T12:20:21.417Z",
		"size": 7437,
		"path": "../public/assets/Members-EoJoWj-c.js"
	},
	"/assets/MembreDetail-DSOsLOFP.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"21e7-Z4SKiKDBV5bYYpGPdMy+w0YmvzA\"",
		"mtime": "2026-09-11T12:20:21.419Z",
		"size": 8679,
		"path": "../public/assets/MembreDetail-DSOsLOFP.js"
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
	"/assets/MembresEnAvance-dDuDkdpq.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"dd2-B0sw4QgEbJArGm32LB2bjnH8j4c\"",
		"mtime": "2026-09-11T12:20:21.419Z",
		"size": 3538,
		"path": "../public/assets/MembresEnAvance-dDuDkdpq.js"
	},
	"/assets/MemoryVFS-3QiueNdO.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"61c-/nfsq1i6BRxHtvwMyeI+PPPnuP0\"",
		"mtime": "2026-09-11T12:20:21.419Z",
		"size": 1564,
		"path": "../public/assets/MemoryVFS-3QiueNdO.js"
	},
	"/assets/MemoryVFS-Dq2CblyL.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"61c-qIPYhJjECt5NyX9Oi6MfEuRREvQ\"",
		"mtime": "2026-09-11T12:20:22.339Z",
		"size": 1564,
		"path": "../public/assets/MemoryVFS-Dq2CblyL.js"
	},
	"/assets/NotFound-DNtQ3Y4M.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3b8-HkGQHEbqHS4Z7hobsGDYjIinXXI\"",
		"mtime": "2026-09-11T12:20:21.421Z",
		"size": 952,
		"path": "../public/assets/NotFound-DNtQ3Y4M.js"
	},
	"/assets/Notifications-BwOVyJNo.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1793-qirE2PPRqbXZj7bMuByQlvQ2CEQ\"",
		"mtime": "2026-09-11T12:20:21.421Z",
		"size": 6035,
		"path": "../public/assets/Notifications-BwOVyJNo.js"
	},
	"/assets/Onboarding-C9Ax-7YZ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"50bd-qO1BB4qmOwrdNvjE5JYIVrcgwWE\"",
		"mtime": "2026-09-11T12:20:21.472Z",
		"size": 20669,
		"path": "../public/assets/Onboarding-C9Ax-7YZ.js"
	},
	"/assets/OPFSCoopSyncVFS-D9YqyerO.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1dea-gxpiY4TgyZD8mdJxHEIHmLOuEIg\"",
		"mtime": "2026-09-11T12:20:21.421Z",
		"size": 7658,
		"path": "../public/assets/OPFSCoopSyncVFS-D9YqyerO.js"
	},
	"/assets/OPFSCoopSyncVFS-DUHJ3gZ4.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1dde-pCdymc8QSCx7pfxLSOpBLey/aKM\"",
		"mtime": "2026-09-11T12:20:22.339Z",
		"size": 7646,
		"path": "../public/assets/OPFSCoopSyncVFS-DUHJ3gZ4.js"
	},
	"/assets/OPFSWriteAheadVFS-BNLdEFOm.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5cf9-7+xQ4opxzJPgRt9DEgWquYdR3hU\"",
		"mtime": "2026-09-11T12:20:21.472Z",
		"size": 23801,
		"path": "../public/assets/OPFSWriteAheadVFS-BNLdEFOm.js"
	},
	"/assets/mc-wa-sqlite-DoDpgFfE.wasm": {
		"type": "application/wasm",
		"etag": "\"1405ab-mYFvsN3agcsYu7kHk/nCjgNgqQ8\"",
		"mtime": "2026-09-11T12:20:22.325Z",
		"size": 1312171,
		"path": "../public/assets/mc-wa-sqlite-DoDpgFfE.wasm"
	},
	"/assets/OPFSWriteAheadVFS-DTE7rlOj.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5cf2-fSgxVyE2z4QqGSn/OowWZiFgsMU\"",
		"mtime": "2026-09-11T12:20:22.341Z",
		"size": 23794,
		"path": "../public/assets/OPFSWriteAheadVFS-DTE7rlOj.js"
	},
	"/assets/OrgSetup-Cbok6dJH.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"26ae-RakabqrKBd+hGj0A028vdRDjxXQ\"",
		"mtime": "2026-09-11T12:20:21.472Z",
		"size": 9902,
		"path": "../public/assets/OrgSetup-Cbok6dJH.js"
	},
	"/assets/p-1sJ0ZDPe-YkMm5iKi.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"8ed2-6KdNiR6CHzWsfcskhcqF/kG5SYg\"",
		"mtime": "2026-09-11T12:20:22.173Z",
		"size": 36562,
		"path": "../public/assets/p-1sJ0ZDPe-YkMm5iKi.js"
	},
	"/assets/p-5ldEpNdG-6dZfqBTh.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"276c-eLE8B8Pe9lKRYBRZPz3DZQM2vmI\"",
		"mtime": "2026-09-11T12:20:22.173Z",
		"size": 10092,
		"path": "../public/assets/p-5ldEpNdG-6dZfqBTh.js"
	},
	"/assets/p-BMPN55of-C0P_qWS_.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"21a-HGYAvd2qgF1iEwCzq6eCRzodk80\"",
		"mtime": "2026-09-11T12:20:22.173Z",
		"size": 538,
		"path": "../public/assets/p-BMPN55of-C0P_qWS_.js"
	},
	"/assets/p-BmVRXR1y-Qf1gG5of.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3e6-cIzBL2cgY/c+Nd+w1vUUDnL3YhY\"",
		"mtime": "2026-09-11T12:20:22.177Z",
		"size": 998,
		"path": "../public/assets/p-BmVRXR1y-Qf1gG5of.js"
	},
	"/assets/p-BQyuFxYc-BP5sUz4F.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"624-sKMq1g03/KlKcB/qZDlMk1Tk0Qk\"",
		"mtime": "2026-09-11T12:20:22.175Z",
		"size": 1572,
		"path": "../public/assets/p-BQyuFxYc-BP5sUz4F.js"
	},
	"/assets/p-BT9-hMMz-DeoKjx0N.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1ee-rguGWc7rPK2wzL0Vb/AugNuA+fM\"",
		"mtime": "2026-09-11T12:20:22.175Z",
		"size": 494,
		"path": "../public/assets/p-BT9-hMMz-DeoKjx0N.js"
	},
	"/assets/p-BWoa-cki-UpDL1J1V.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"469-MAKOTmbsqUpzRy0RZ0/MkYlxxqE\"",
		"mtime": "2026-09-11T12:20:22.175Z",
		"size": 1129,
		"path": "../public/assets/p-BWoa-cki-UpDL1J1V.js"
	},
	"/assets/p-C-NbvXu4-B9XCdoFH.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"127b-nP1/e4Mh7JXhis9RI1WSxH7S81E\"",
		"mtime": "2026-09-11T12:20:22.179Z",
		"size": 4731,
		"path": "../public/assets/p-C-NbvXu4-B9XCdoFH.js"
	},
	"/assets/p-C4VpVfrJ-B7tOqQiD.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"28b6-z0kccsJcaxrsNNsPUeOkumHk1lc\"",
		"mtime": "2026-09-11T12:20:22.209Z",
		"size": 10422,
		"path": "../public/assets/p-C4VpVfrJ-B7tOqQiD.js"
	},
	"/assets/p-C09TXohi-BME7HMRv.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"c7c-eBlQFVuVp95kjyeMXHxMBBybRJM\"",
		"mtime": "2026-09-11T12:20:22.179Z",
		"size": 3196,
		"path": "../public/assets/p-C09TXohi-BME7HMRv.js"
	},
	"/assets/p-CG_zZq_I-Bnu5sziO.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3a9-IewWt3kc3BnoWwAVte31wTmqo4k\"",
		"mtime": "2026-09-11T12:20:22.209Z",
		"size": 937,
		"path": "../public/assets/p-CG_zZq_I-Bnu5sziO.js"
	},
	"/assets/p-CWuIRJQN-CpJ4cxhA.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"26e-fZxIO0/B5h4LVezuzSyQ2tIfW08\"",
		"mtime": "2026-09-11T12:20:22.211Z",
		"size": 622,
		"path": "../public/assets/p-CWuIRJQN-CpJ4cxhA.js"
	},
	"/assets/p-D0YpjgON-DuPvRicD.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"15f9-l2t1qtt076m1Azprcw7kb/Qo+DQ\"",
		"mtime": "2026-09-11T12:20:22.211Z",
		"size": 5625,
		"path": "../public/assets/p-D0YpjgON-DuPvRicD.js"
	},
	"/assets/mc-wa-sqlite-async-DYagSq56.wasm": {
		"type": "application/wasm",
		"etag": "\"263900-YXiey/3Hhr2OVYDVjdLpGtiNQfI\"",
		"mtime": "2026-09-11T12:20:22.329Z",
		"size": 2504960,
		"path": "../public/assets/mc-wa-sqlite-async-DYagSq56.wasm"
	},
	"/assets/p-D7-vHX0A-M28BuEVW.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4ac-++v6wgkqI6DQPAYjpbKuefeV/jU\"",
		"mtime": "2026-09-11T12:20:22.211Z",
		"size": 1196,
		"path": "../public/assets/p-D7-vHX0A-M28BuEVW.js"
	},
	"/assets/p-qAXsfUff-UrBZGjF-.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"403-VFqIV1qmCBL/QnR1Ulrs6NA9M2s\"",
		"mtime": "2026-09-11T12:20:22.213Z",
		"size": 1027,
		"path": "../public/assets/p-qAXsfUff-UrBZGjF-.js"
	},
	"/assets/p-ZjP4CjeZ-DJ1DGIsW.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"62-xIml61NROF4B1cx8XnHtA30tV1Q\"",
		"mtime": "2026-09-11T12:20:22.211Z",
		"size": 98,
		"path": "../public/assets/p-ZjP4CjeZ-DJ1DGIsW.js"
	},
	"/assets/pen-line-BX49oSIz.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"10a-a8tEo1hGHrkrYC1emnWslYnrrUQ\"",
		"mtime": "2026-09-11T12:20:22.213Z",
		"size": 266,
		"path": "../public/assets/pen-line-BX49oSIz.js"
	},
	"/assets/play-1bP3QUcI.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"7b-G2sMs3FtZZXWeFwP5j+hIExSRIA\"",
		"mtime": "2026-09-11T12:20:22.215Z",
		"size": 123,
		"path": "../public/assets/play-1bP3QUcI.js"
	},
	"/assets/purify.es-7fJ1DZ6H.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"6930-TQSami3t0EgVH17bOcuxvbPUw2E\"",
		"mtime": "2026-09-11T12:20:22.215Z",
		"size": 26928,
		"path": "../public/assets/purify.es-7fJ1DZ6H.js"
	},
	"/assets/refresh-cw-DQWImiWw.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"135-xPE0nK3Umah6SsTBX4yFre4L8xg\"",
		"mtime": "2026-09-11T12:20:22.215Z",
		"size": 309,
		"path": "../public/assets/refresh-cw-DQWImiWw.js"
	},
	"/assets/ReportBuilder-HZAwRNFt.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1f27-Z7j9J9KRRqq41Odrje8rQq5g50M\"",
		"mtime": "2026-09-11T12:20:21.474Z",
		"size": 7975,
		"path": "../public/assets/ReportBuilder-HZAwRNFt.js"
	},
	"/assets/Reports-BtyDTodM.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"23a0-1UyNGRNAGmOqpW2Auk9rJPJ//sc\"",
		"mtime": "2026-09-11T12:20:21.474Z",
		"size": 9120,
		"path": "../public/assets/Reports-BtyDTodM.js"
	},
	"/assets/resource-Ci5Ipp7n.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"a46-RHrblWmbRFP/rpGuEqx+2vfkkDc\"",
		"mtime": "2026-09-11T12:20:22.217Z",
		"size": 2630,
		"path": "../public/assets/resource-Ci5Ipp7n.js"
	},
	"/assets/rolldown-runtime-hePW80VL.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2cc-fA8td6k29UVF6JoPfhOPkceTK1M\"",
		"mtime": "2026-09-11T12:20:22.217Z",
		"size": 716,
		"path": "../public/assets/rolldown-runtime-hePW80VL.js"
	},
	"/assets/SaisieRapide-CYg_XJRH.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"228-bVQfbvYlq634o6tufCuX560go30\"",
		"mtime": "2026-09-11T12:20:21.474Z",
		"size": 552,
		"path": "../public/assets/SaisieRapide-CYg_XJRH.js"
	},
	"/assets/security-CPHDFpdn.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f33-C2Miy5A4omHBoxpqDaOViatt6kc\"",
		"mtime": "2026-09-11T12:20:22.217Z",
		"size": 3891,
		"path": "../public/assets/security-CPHDFpdn.js"
	},
	"/assets/Settings-Cqpu9wPh.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"46ed-eSLpWSROV9HIEw9s7neRpJYmY2w\"",
		"mtime": "2026-09-11T12:20:21.476Z",
		"size": 18157,
		"path": "../public/assets/Settings-Cqpu9wPh.js"
	},
	"/assets/shield-check-Bfthhfes.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"134-5YEcMvQiZw30Fpl91sk/KapBtBQ\"",
		"mtime": "2026-09-11T12:20:22.219Z",
		"size": 308,
		"path": "../public/assets/shield-check-Bfthhfes.js"
	},
	"/assets/shield-D8ONpdyJ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"105-ipxbg4YY/lh/FDDOKpJGK9s2Ycc\"",
		"mtime": "2026-09-11T12:20:22.219Z",
		"size": 261,
		"path": "../public/assets/shield-D8ONpdyJ.js"
	},
	"/assets/Skeleton-DvGkCoKd.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"413-Og8ms5/wrqX62pzoXl/JlOqtgXw\"",
		"mtime": "2026-09-11T12:20:21.476Z",
		"size": 1043,
		"path": "../public/assets/Skeleton-DvGkCoKd.js"
	},
	"/assets/tag-LYSRsBpH.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"13b-0MRo/Xms1GAERtzJzaMVFC8H16k\"",
		"mtime": "2026-09-11T12:20:22.221Z",
		"size": 315,
		"path": "../public/assets/tag-LYSRsBpH.js"
	},
	"/assets/ThemePicker-CJQISwfa.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4a6-jLePYw4y7xclhhUuLHvdeZJt5t0\"",
		"mtime": "2026-09-11T12:20:21.478Z",
		"size": 1190,
		"path": "../public/assets/ThemePicker-CJQISwfa.js"
	},
	"/assets/TopHeader-C76V3pIH.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"ebd-5nu3PC+moQef4mLm1Dw6uJ0tDr8\"",
		"mtime": "2026-09-11T12:20:21.487Z",
		"size": 3773,
		"path": "../public/assets/TopHeader-C76V3pIH.js"
	},
	"/assets/Trace-CnY7_H0x.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f2d-KQ3C+YFrOYFt3PxEs19QMWiSmsc\"",
		"mtime": "2026-09-11T12:20:21.487Z",
		"size": 3885,
		"path": "../public/assets/Trace-CnY7_H0x.js"
	},
	"/assets/TransactionCard-BnpS3DgT.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"ab4-RyG5dEcb5Hhs7706IkbtagXlIwI\"",
		"mtime": "2026-09-11T12:20:21.487Z",
		"size": 2740,
		"path": "../public/assets/TransactionCard-BnpS3DgT.js"
	},
	"/assets/TransactionDetail-tNmXScDG.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"24f7-eWGVuh6whh+Yt/1jzc4bdTFNgiA\"",
		"mtime": "2026-09-11T12:20:21.489Z",
		"size": 9463,
		"path": "../public/assets/TransactionDetail-tNmXScDG.js"
	},
	"/assets/TransactionEdit-8gTdVhkD.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1a51-qXhQlz4DXX3Mvb4qy56d2Yrgf84\"",
		"mtime": "2026-09-11T12:20:21.489Z",
		"size": 6737,
		"path": "../public/assets/TransactionEdit-8gTdVhkD.js"
	},
	"/assets/TransactionNew-DCE_ccs_.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1a82-frlA/W2MnDoP72M/Le5JBrzcNBg\"",
		"mtime": "2026-09-11T12:20:21.489Z",
		"size": 6786,
		"path": "../public/assets/TransactionNew-DCE_ccs_.js"
	},
	"/assets/TransactionNewGroup-D_6tzbrb.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"187a-Wr8jU+E4xxzmIRfgkBm64tGpktE\"",
		"mtime": "2026-09-11T12:20:21.491Z",
		"size": 6266,
		"path": "../public/assets/TransactionNewGroup-D_6tzbrb.js"
	},
	"/assets/trash-2-D1FtSEei.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"15a-D9Ross3zQ3RYAqMXMsTtzBBf4hE\"",
		"mtime": "2026-09-11T12:20:22.221Z",
		"size": 346,
		"path": "../public/assets/trash-2-D1FtSEei.js"
	},
	"/assets/trending-down-VUMs7JNP.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"c4-AB1B0HP9XujrMMQOk21z5LVOzs4\"",
		"mtime": "2026-09-11T12:20:22.221Z",
		"size": 196,
		"path": "../public/assets/trending-down-VUMs7JNP.js"
	},
	"/assets/trending-up-Bmx2Crbk.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"c1-Etv3JVxn6Yn30kmlhi3b4esc4xk\"",
		"mtime": "2026-09-11T12:20:22.223Z",
		"size": 193,
		"path": "../public/assets/trending-up-Bmx2Crbk.js"
	},
	"/assets/Tutorial-DqMa2LQg.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1369d-vDp5Xzuflz9x1zpx8FXgqGJKgUM\"",
		"mtime": "2026-09-11T12:20:21.491Z",
		"size": 79517,
		"path": "../public/assets/Tutorial-DqMa2LQg.js"
	},
	"/assets/user-plus-D2hFIO7V.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"12a-8QWAaCo6LGSRAGDDPTvIaQ9Jr+k\"",
		"mtime": "2026-09-11T12:20:22.223Z",
		"size": 298,
		"path": "../public/assets/user-plus-D2hFIO7V.js"
	},
	"/assets/Versement-6WtQ0ixJ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"17d7-bni8zmRcsw5qpuAi9WtasxlRz20\"",
		"mtime": "2026-09-11T12:20:21.493Z",
		"size": 6103,
		"path": "../public/assets/Versement-6WtQ0ixJ.js"
	},
	"/assets/wa-sqlite-async-L_LSrxrb.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f88f-NGMPNASgtNbzZuH6O9+kt/v29/g\"",
		"mtime": "2026-09-11T12:20:22.225Z",
		"size": 63631,
		"path": "../public/assets/wa-sqlite-async-L_LSrxrb.js"
	},
	"/assets/wa-sqlite-BVXfj7bw.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"e9d6-LFag0v/Myx+4L9KqMw5YED3uQZQ\"",
		"mtime": "2026-09-11T12:20:22.223Z",
		"size": 59862,
		"path": "../public/assets/wa-sqlite-BVXfj7bw.js"
	},
	"/assets/wallet-n6nEU0Ws.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"420-PqJme1xmF+P97lHTUSj/eokkplA\"",
		"mtime": "2026-09-11T12:20:22.225Z",
		"size": 1056,
		"path": "../public/assets/wallet-n6nEU0Ws.js"
	},
	"/assets/web-pPNLHSJH.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2a5-7zPFHSXbeAgN9WBOnlWTzlLoFmY\"",
		"mtime": "2026-09-11T12:20:22.227Z",
		"size": 677,
		"path": "../public/assets/web-pPNLHSJH.js"
	},
	"/assets/websockets-CMJf2-0f.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1a549-Adtm+4amItnBtt4iiameTwUu6GY\"",
		"mtime": "2026-09-11T12:20:22.261Z",
		"size": 107849,
		"path": "../public/assets/websockets-CMJf2-0f.js"
	},
	"/assets/websockets-D5RMr4oJ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1a61e-OMf44RH/xAyFpxTjDiux84L++us\"",
		"mtime": "2026-09-11T12:20:22.341Z",
		"size": 108062,
		"path": "../public/assets/websockets-D5RMr4oJ.js"
	},
	"/assets/worker-YT9rek-h.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"12df0-qxKvQ0KOo9wxCdz6qIhJhmL6Ung\"",
		"mtime": "2026-09-11T12:20:22.343Z",
		"size": 77296,
		"path": "../public/assets/worker-YT9rek-h.js"
	},
	"/assets/x-B-nTAnYl.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"8f-5aKt9DmXlbF63kgApfULXWNRjg8\"",
		"mtime": "2026-09-11T12:20:22.263Z",
		"size": 143,
		"path": "../public/assets/x-B-nTAnYl.js"
	},
	"/assets/wa-sqlite-CagagB9I.wasm": {
		"type": "application/wasm",
		"etag": "\"112932-PVZvyjEpDlc7C+RsG8vVBaXaZyQ\"",
		"mtime": "2026-09-11T12:20:22.331Z",
		"size": 1124658,
		"path": "../public/assets/wa-sqlite-CagagB9I.wasm"
	},
	"/assets/wa-sqlite-async-DCIP8kAx.wasm": {
		"type": "application/wasm",
		"etag": "\"22d125-my2aJEczirWasFS1osydDIkHGgk\"",
		"mtime": "2026-09-11T12:20:22.335Z",
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
//#region node_modules/nitro/dist/runtime/internal/static.mjs
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
	if (!event.headers) return;
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
* Default export — global security middleware applied to EVERY response by
* Nitro's auto-discovery of `server/middleware/*`.
*
* Sets the response security headers on the underlying Node response so they
* are honored by the browser (browser-ignorable meta tags such as
* `X-Frame-Options` inside `index.html` are not — that is what produced the
* "X-Frame-Options may only be set via an HTTP header" console warning).
*
* IMPORTANT: this MUST return `undefined`, NOT an object. In the h3 engine
* (`callMiddleware`), a middleware whose return value is not `undefined` (or
* the internal `kNotFound`) is treated as the *final response* and
* short-circuits the entire route chain — returning `{}` here made every
* dynamic route (`/`, `/splash`, `/api/*`) respond with JSON `{}` (blank
* screen) instead of the SPA. Setting headers and returning `void 0` passes
* control to the next handler in the chain.
*/
function securityMiddleware(event) {
	setHeader(event, "X-Content-Type-Options", "nosniff");
	setHeader(event, "X-Frame-Options", "DENY");
	setHeader(event, "X-XSS-Protection", "0");
	setHeader(event, "Referrer-Policy", "strict-origin-when-cross-origin");
	setHeader(event, "Permissions-Policy", "camera=(self), microphone=(self), geolocation=(self)");
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
var _lazy_YxttXK = defineLazyEventHandler(() => import("./_chunks/renderer-template.mjs"));
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
		handler: _lazy_YxttXK
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
//#region node_modules/nitro/dist/runtime/internal/error/prod.mjs
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
	if (event.headers) applySecurityHeaders(event);
	const method = event.method;
	if (!method) return;
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
//#region node_modules/nitro/dist/runtime/internal/app.mjs
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
//#region node_modules/nitro/dist/runtime/internal/error/hooks.mjs
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
//#region node_modules/nitro/dist/presets/node/runtime/node-server.mjs
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
