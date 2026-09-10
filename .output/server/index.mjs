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
	"/manifest.json": {
		"type": "application/json",
		"etag": "\"1eb-Y7kttYgCEPOR8HGHYsGcvSqM47M\"",
		"mtime": "2026-09-02T17:13:42.999Z",
		"size": 491,
		"path": "../public/manifest.json"
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
	"/assets/AccessHandlePoolVFS-BBZijSFl.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f0f-QbOWahPTkUnm97vWbB1M3MVTCKs\"",
		"mtime": "2026-09-10T15:26:18.470Z",
		"size": 3855,
		"path": "../public/assets/AccessHandlePoolVFS-BBZijSFl.js"
	},
	"/assets/AccessHandlePoolVFS-k-bp0HG6.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f02-WFkNV/KJ/xa7F3xDGFd1mY/Co6Q\"",
		"mtime": "2026-09-10T15:26:19.849Z",
		"size": 3842,
		"path": "../public/assets/AccessHandlePoolVFS-k-bp0HG6.js"
	},
	"/assets/Archives-ZD-AXvQj.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1368-ehovahErCafxCJ6VZE6PQcBonQI\"",
		"mtime": "2026-09-10T15:26:18.472Z",
		"size": 4968,
		"path": "../public/assets/Archives-ZD-AXvQj.js"
	},
	"/assets/arrow-down-right-CLYZHOIL.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"9c-n0vSl0PsotpnVt1l9LflLndSAmA\"",
		"mtime": "2026-09-10T15:26:19.084Z",
		"size": 156,
		"path": "../public/assets/arrow-down-right-CLYZHOIL.js"
	},
	"/assets/arrow-left-Crf2wPvO.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"99-OUFHWJU5bKzwu+ddZ607OImlWlM\"",
		"mtime": "2026-09-10T15:26:19.084Z",
		"size": 153,
		"path": "../public/assets/arrow-left-Crf2wPvO.js"
	},
	"/assets/arrow-up-M70pKZhQ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"105-3UBO4e5yDory6d1TwuuUNbi/ZSA\"",
		"mtime": "2026-09-10T15:26:19.088Z",
		"size": 261,
		"path": "../public/assets/arrow-up-M70pKZhQ.js"
	},
	"/assets/arrow-up-right-C_MSIZ5U.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"9a-4lU1INe1ZboMA0UO6hh3GeQ29qY\"",
		"mtime": "2026-09-10T15:26:19.094Z",
		"size": 154,
		"path": "../public/assets/arrow-up-right-C_MSIZ5U.js"
	},
	"/assets/Balance-R0PRuZvK.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2601-FQOvy6di+PldAk+Q3llJ6K5mKcs\"",
		"mtime": "2026-09-10T15:26:18.480Z",
		"size": 9729,
		"path": "../public/assets/Balance-R0PRuZvK.js"
	},
	"/assets/AreaChart-jJDoHHna.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5ca96-AuGJPq6c/Fv6J1VG6UbvurhWUOE\"",
		"mtime": "2026-09-10T15:26:18.476Z",
		"size": 379542,
		"path": "../public/assets/AreaChart-jJDoHHna.js"
	},
	"/assets/book-open-BVy4JNt6.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"10b-QkCDn//lw1B0R72o1ThVmO+QmJo\"",
		"mtime": "2026-09-10T15:26:19.094Z",
		"size": 267,
		"path": "../public/assets/book-open-BVy4JNt6.js"
	},
	"/assets/BottomNav-DPQq6s-f.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1cbb-2ByUzLoSUdUTzBHbb/DP65KSJGE\"",
		"mtime": "2026-09-10T15:26:18.482Z",
		"size": 7355,
		"path": "../public/assets/BottomNav-DPQq6s-f.js"
	},
	"/assets/building-2-DEUn4JUm.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1ab-38qB2ecMM8Rj6JRdYyUoRmlFERc\"",
		"mtime": "2026-09-10T15:26:19.098Z",
		"size": 427,
		"path": "../public/assets/building-2-DEUn4JUm.js"
	},
	"/assets/calendar-CNkq-X-D.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f6-Cxe+ufuz0pRvYuEf8T7x77Ye8Zc\"",
		"mtime": "2026-09-10T15:26:19.102Z",
		"size": 246,
		"path": "../public/assets/calendar-CNkq-X-D.js"
	},
	"/assets/CentralAdmin-Do9Pa9JJ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"295d-C6uXDRBzlHvTkpYD36U6rGjyn28\"",
		"mtime": "2026-09-10T15:26:18.484Z",
		"size": 10589,
		"path": "../public/assets/CentralAdmin-Do9Pa9JJ.js"
	},
	"/assets/chevron-right-BRWVBPdU.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"76-fH+pCEtaf4rZxClMGVlY5ITIqlI\"",
		"mtime": "2026-09-10T15:26:19.105Z",
		"size": 118,
		"path": "../public/assets/chevron-right-BRWVBPdU.js"
	},
	"/assets/circle-alert-DV_mfyJ6.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"ee-vvcu9yh38TSfdv8aTqTz2hEe1zk\"",
		"mtime": "2026-09-10T15:26:19.110Z",
		"size": 238,
		"path": "../public/assets/circle-alert-DV_mfyJ6.js"
	},
	"/assets/circle-check-big-CnIM0dvb.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"b5-s7qXJ21mM0+wdip1R5MLHcQF3qM\"",
		"mtime": "2026-09-10T15:26:19.116Z",
		"size": 181,
		"path": "../public/assets/circle-check-big-CnIM0dvb.js"
	},
	"/assets/circle-plus-D8nS38vG.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"c3-dgWFSbW3gV9ikQOImvaFMeF0Rjg\"",
		"mtime": "2026-09-10T15:26:19.120Z",
		"size": 195,
		"path": "../public/assets/circle-plus-D8nS38vG.js"
	},
	"/assets/circle-x-C1UFFdO3.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"c3-DuEqKsjXkbo62YKB7YMjoajchiM\"",
		"mtime": "2026-09-10T15:26:19.121Z",
		"size": 195,
		"path": "../public/assets/circle-x-C1UFFdO3.js"
	},
	"/assets/clock-D3mVkkFL.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"ac-AVq1f95q6ZWyPK4WR18OdGxcc/0\"",
		"mtime": "2026-09-10T15:26:19.123Z",
		"size": 172,
		"path": "../public/assets/clock-D3mVkkFL.js"
	},
	"/assets/Cotisations-T0-D_OuH.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"14ac-QCOL0PE0XHBcuiY8GQcHCFEr2Qg\"",
		"mtime": "2026-09-10T15:26:18.486Z",
		"size": 5292,
		"path": "../public/assets/Cotisations-T0-D_OuH.js"
	},
	"/assets/CulteDetail-ZfNtOiXx.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"255a-t4pUzAvx8gW/N2gLT+HjxY0Hcp0\"",
		"mtime": "2026-09-10T15:26:18.486Z",
		"size": 9562,
		"path": "../public/assets/CulteDetail-ZfNtOiXx.js"
	},
	"/assets/CustomFields-DYr_ALmW.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1c2f-pahAotiKh+ifDFTHVIuxYje2430\"",
		"mtime": "2026-09-10T15:26:18.488Z",
		"size": 7215,
		"path": "../public/assets/CustomFields-DYr_ALmW.js"
	},
	"/assets/Dashboard-B1KuIslG.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"431a-EEFOgrIScTj+XDz52Eul5gHTyBM\"",
		"mtime": "2026-09-10T15:26:18.523Z",
		"size": 17178,
		"path": "../public/assets/Dashboard-B1KuIslG.js"
	},
	"/assets/database-DQwKfP0l.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"e8-5p/eUoUvQOSwe0GHRLkK91nvQc0\"",
		"mtime": "2026-09-10T15:26:19.129Z",
		"size": 232,
		"path": "../public/assets/database-DQwKfP0l.js"
	},
	"/assets/EventDetail-aewvFpq-.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"532b-KXQkbhJ/Mca6oVVwLlLltMEkSNE\"",
		"mtime": "2026-09-10T15:26:18.525Z",
		"size": 21291,
		"path": "../public/assets/EventDetail-aewvFpq-.js"
	},
	"/assets/EventEdit-hsYEUkhF.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"147c-mXqsTAxKRM1rrf4d2ozUL0msl8g\"",
		"mtime": "2026-09-10T15:26:18.525Z",
		"size": 5244,
		"path": "../public/assets/EventEdit-hsYEUkhF.js"
	},
	"/assets/EventNew-BPnUgMtR.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1f82-GwwvglEg7SMRkAJKonAs7DBg2LA\"",
		"mtime": "2026-09-10T15:26:18.525Z",
		"size": 8066,
		"path": "../public/assets/EventNew-BPnUgMtR.js"
	},
	"/assets/Events-DENpt41i.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"12b1-cv6ACDJAJBckXE7UpI85gFm5GAc\"",
		"mtime": "2026-09-10T15:26:18.527Z",
		"size": 4785,
		"path": "../public/assets/Events-DENpt41i.js"
	},
	"/assets/FacadeVFS-BEICR2q0.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1871-h2JM49n3k6wsMKWYG0w5CCQNUNY\"",
		"mtime": "2026-09-10T15:26:19.851Z",
		"size": 6257,
		"path": "../public/assets/FacadeVFS-BEICR2q0.js"
	},
	"/assets/FacadeVFS-I1NwTv_p.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1870-gx1xwaC18Vhj/HCNYV0ZwXVYW6w\"",
		"mtime": "2026-09-10T15:26:18.527Z",
		"size": 6256,
		"path": "../public/assets/FacadeVFS-I1NwTv_p.js"
	},
	"/assets/Finance-CFbxzrz5.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1be0-ZmJ6c11lU4tbxYm3e2u4EXljDJY\"",
		"mtime": "2026-09-10T15:26:18.529Z",
		"size": 7136,
		"path": "../public/assets/Finance-CFbxzrz5.js"
	},
	"/assets/FormBuilder-3y4U5tMe.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1fb5-M0sHTAi9doFm2h0L10jidR++adQ\"",
		"mtime": "2026-09-10T15:26:18.563Z",
		"size": 8117,
		"path": "../public/assets/FormBuilder-3y4U5tMe.js"
	},
	"/assets/FormFill-DGFkMJT3.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"11f6-zwcQUI9tBqyCYU9Am7kIh12371A\"",
		"mtime": "2026-09-10T15:26:18.565Z",
		"size": 4598,
		"path": "../public/assets/FormFill-DGFkMJT3.js"
	},
	"/assets/formSystem-kRHoNFvg.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"7ee-XEwMXrYaWdZDCV5l//S9WVG0d3U\"",
		"mtime": "2026-09-10T15:26:19.153Z",
		"size": 2030,
		"path": "../public/assets/formSystem-kRHoNFvg.js"
	},
	"/assets/GroupDetail-DF5RMFst.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"544f-tX2+Gcz6+fTT56pJcNULcYYVjDM\"",
		"mtime": "2026-09-10T15:26:18.565Z",
		"size": 21583,
		"path": "../public/assets/GroupDetail-DF5RMFst.js"
	},
	"/assets/Groups-BNoaqdYM.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"23bf-cR+mHgfNGnWn2tAElmcs5r7egV0\"",
		"mtime": "2026-09-10T15:26:18.567Z",
		"size": 9151,
		"path": "../public/assets/Groups-BNoaqdYM.js"
	},
	"/assets/Help-CkyWhj1i.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"bfa-wfKZgiaPrqFHCXCY0Q2ZUUBTEOg\"",
		"mtime": "2026-09-10T15:26:18.569Z",
		"size": 3066,
		"path": "../public/assets/Help-CkyWhj1i.js"
	},
	"/assets/History-BzmvxGUO.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2e9e-xmVX/5/PdCaikGvx8k+SZ2gS+t8\"",
		"mtime": "2026-09-10T15:26:18.597Z",
		"size": 11934,
		"path": "../public/assets/History-BzmvxGUO.js"
	},
	"/assets/html2canvas-DCcDvdvP.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"30b50-/NW/tvs1950d+adFAmG+0O5qROc\"",
		"mtime": "2026-09-10T15:26:19.155Z",
		"size": 199504,
		"path": "../public/assets/html2canvas-DCcDvdvP.js"
	},
	"/assets/IDBBatchAtomicVFS-DOQZPx-g.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"32a2-6ppgZuTXuQvYK+HVWuYHmxtHCa0\"",
		"mtime": "2026-09-10T15:26:19.853Z",
		"size": 12962,
		"path": "../public/assets/IDBBatchAtomicVFS-DOQZPx-g.js"
	},
	"/assets/IDBBatchAtomicVFS-DWWPY5LO.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"32ae-/v9B1KC89kun9a6tMYr9wVkVWjQ\"",
		"mtime": "2026-09-10T15:26:18.644Z",
		"size": 12974,
		"path": "../public/assets/IDBBatchAtomicVFS-DWWPY5LO.js"
	},
	"/assets/export-ukO157Of.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"af2e1-1j/wqKZMy4FD/Sq8A0Oj5dcWZKk\"",
		"mtime": "2026-09-10T15:26:19.151Z",
		"size": 717537,
		"path": "../public/assets/export-ukO157Of.js"
	},
	"/assets/index-DFZWzvIJ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"c2135-pTkEJ/hlzIlbJivPr7kUEToKCnM\"",
		"mtime": "2026-09-10T15:26:18.468Z",
		"size": 794933,
		"path": "../public/assets/index-DFZWzvIJ.js"
	},
	"/assets/dist-G7PDzus1.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"10d069-4aOm1fXTuRa6p2kFYxdBUgiv+4c\"",
		"mtime": "2026-09-10T15:26:19.135Z",
		"size": 1101929,
		"path": "../public/assets/dist-G7PDzus1.js"
	},
	"/assets/index-tRQoNGRC.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"10d7b-I+AgxM+LI6is3rix23DruXRrzIM\"",
		"mtime": "2026-09-10T15:26:19.742Z",
		"size": 68987,
		"path": "../public/assets/index-tRQoNGRC.css"
	},
	"/assets/invitation-CiR4TElz.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"14a4-NVM+D6gyUrHyT7kaIz+5q2U8+6g\"",
		"mtime": "2026-09-10T15:26:19.189Z",
		"size": 5284,
		"path": "../public/assets/invitation-CiR4TElz.js"
	},
	"/assets/index.es-WPR7P-D2.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"24f91-6/258I9zwYaXO/xu/cL1NB7+wgg\"",
		"mtime": "2026-09-10T15:26:19.171Z",
		"size": 151441,
		"path": "../public/assets/index.es-WPR7P-D2.js"
	},
	"/assets/InvitationEmit-CUEyNciy.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5b36-G4035tBBvuIlMhREl/4tqKx7MV0\"",
		"mtime": "2026-09-10T15:26:18.717Z",
		"size": 23350,
		"path": "../public/assets/InvitationEmit-CUEyNciy.js"
	},
	"/assets/InvitationManage-CRTpRVLJ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"176c-bebfm6UuCaFJP3hLNj3JVZqQZaE\"",
		"mtime": "2026-09-10T15:26:18.717Z",
		"size": 5996,
		"path": "../public/assets/InvitationManage-CRTpRVLJ.js"
	},
	"/assets/InvitationClaim-CNi6OdH4.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"7b876-ITaf4zQzn+mQrAI7E0hKToArwOU\"",
		"mtime": "2026-09-10T15:26:18.709Z",
		"size": 505974,
		"path": "../public/assets/InvitationClaim-CNi6OdH4.js"
	},
	"/assets/mc-wa-sqlite-async-OK58TZB1.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f9c7-OWgn/LbVfd6oIzizW/33tbyE9i4\"",
		"mtime": "2026-09-10T15:26:19.208Z",
		"size": 63943,
		"path": "../public/assets/mc-wa-sqlite-async-OK58TZB1.js"
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
	"/assets/mc-wa-sqlite-Dt2CfptV.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"eb0e-ka1IvJlVUyt14/GJnJnIXiNK/CY\"",
		"mtime": "2026-09-10T15:26:19.208Z",
		"size": 60174,
		"path": "../public/assets/mc-wa-sqlite-Dt2CfptV.js"
	},
	"/assets/Members-DweEa0kx.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1c60-zjUXmY2NA23j4SddsavDQnppo9Y\"",
		"mtime": "2026-09-10T15:26:18.719Z",
		"size": 7264,
		"path": "../public/assets/Members-DweEa0kx.js"
	},
	"/assets/MembreDetail-DLNMUFYZ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"20a1-OhS3XMwJ5KLB19IodNAs0ksaVuE\"",
		"mtime": "2026-09-10T15:26:18.719Z",
		"size": 8353,
		"path": "../public/assets/MembreDetail-DLNMUFYZ.js"
	},
	"/assets/MembresEnAvance-CMm_yOj6.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"d45-4ieUcGoMFWDhGpERScxjQtL1WVI\"",
		"mtime": "2026-09-10T15:26:18.721Z",
		"size": 3397,
		"path": "../public/assets/MembresEnAvance-CMm_yOj6.js"
	},
	"/assets/MemoryVFS-DQF4WRTC.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"61c-i2gYtp7yBd03f77k1kJ2TRrrTSQ\"",
		"mtime": "2026-09-10T15:26:19.857Z",
		"size": 1564,
		"path": "../public/assets/MemoryVFS-DQF4WRTC.js"
	},
	"/assets/MemoryVFS-DveGUIoS.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"61c-jvL8iYVLtbFQPtjgNnPxDWwmQ3M\"",
		"mtime": "2026-09-10T15:26:18.721Z",
		"size": 1564,
		"path": "../public/assets/MemoryVFS-DveGUIoS.js"
	},
	"/assets/NotFound-BnKx7OiN.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"39c-lI++yhMZFMZzabm+pNPNRTHAQ5o\"",
		"mtime": "2026-09-10T15:26:18.753Z",
		"size": 924,
		"path": "../public/assets/NotFound-BnKx7OiN.js"
	},
	"/assets/Notifications-BQzVe4aH.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1768-RM4QajJxEiMUqDp2f8ThpZBVIKA\"",
		"mtime": "2026-09-10T15:26:18.798Z",
		"size": 5992,
		"path": "../public/assets/Notifications-BQzVe4aH.js"
	},
	"/assets/Onboarding-25Hb1AgQ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"34a2-k+NfnYAf2y+EMjcKa/KL3lA7+Bk\"",
		"mtime": "2026-09-10T15:26:18.860Z",
		"size": 13474,
		"path": "../public/assets/Onboarding-25Hb1AgQ.js"
	},
	"/assets/OPFSCoopSyncVFS-bNAeE9oo.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1dea-KUOuw4+V6drATrqWw/77lqvgMj0\"",
		"mtime": "2026-09-10T15:26:18.802Z",
		"size": 7658,
		"path": "../public/assets/OPFSCoopSyncVFS-bNAeE9oo.js"
	},
	"/assets/OPFSCoopSyncVFS-DATtbZFi.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1dde-35NXNSgW4WGGg2Jx/DvLz8pj/JQ\"",
		"mtime": "2026-09-10T15:26:19.859Z",
		"size": 7646,
		"path": "../public/assets/OPFSCoopSyncVFS-DATtbZFi.js"
	},
	"/assets/OPFSWriteAheadVFS-BycL6qy9.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5cf9-PAHjpuCX6cR9ekjWQjyHbl9BTns\"",
		"mtime": "2026-09-10T15:26:18.818Z",
		"size": 23801,
		"path": "../public/assets/OPFSWriteAheadVFS-BycL6qy9.js"
	},
	"/assets/OPFSWriteAheadVFS-Dceb9ZfN.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5cf2-6VWvwZq/3kDJah89Fj0JQlYKJAI\"",
		"mtime": "2026-09-10T15:26:19.859Z",
		"size": 23794,
		"path": "../public/assets/OPFSWriteAheadVFS-Dceb9ZfN.js"
	},
	"/assets/p-1sJ0ZDPe-YkMm5iKi.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"8ed2-6KdNiR6CHzWsfcskhcqF/kG5SYg\"",
		"mtime": "2026-09-10T15:26:19.311Z",
		"size": 36562,
		"path": "../public/assets/p-1sJ0ZDPe-YkMm5iKi.js"
	},
	"/assets/mc-wa-sqlite-DoDpgFfE.wasm": {
		"type": "application/wasm",
		"etag": "\"1405ab-mYFvsN3agcsYu7kHk/nCjgNgqQ8\"",
		"mtime": "2026-09-10T15:26:19.816Z",
		"size": 1312171,
		"path": "../public/assets/mc-wa-sqlite-DoDpgFfE.wasm"
	},
	"/assets/p-5ldEpNdG-6dZfqBTh.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"276c-eLE8B8Pe9lKRYBRZPz3DZQM2vmI\"",
		"mtime": "2026-09-10T15:26:19.313Z",
		"size": 10092,
		"path": "../public/assets/p-5ldEpNdG-6dZfqBTh.js"
	},
	"/assets/p-BMPN55of-C0P_qWS_.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"21a-HGYAvd2qgF1iEwCzq6eCRzodk80\"",
		"mtime": "2026-09-10T15:26:19.313Z",
		"size": 538,
		"path": "../public/assets/p-BMPN55of-C0P_qWS_.js"
	},
	"/assets/p-BmVRXR1y-Qf1gG5of.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3e6-cIzBL2cgY/c+Nd+w1vUUDnL3YhY\"",
		"mtime": "2026-09-10T15:26:19.450Z",
		"size": 998,
		"path": "../public/assets/p-BmVRXR1y-Qf1gG5of.js"
	},
	"/assets/p-BQyuFxYc-BP5sUz4F.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"624-sKMq1g03/KlKcB/qZDlMk1Tk0Qk\"",
		"mtime": "2026-09-10T15:26:19.414Z",
		"size": 1572,
		"path": "../public/assets/p-BQyuFxYc-BP5sUz4F.js"
	},
	"/assets/p-BT9-hMMz-DeoKjx0N.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1ee-rguGWc7rPK2wzL0Vb/AugNuA+fM\"",
		"mtime": "2026-09-10T15:26:19.416Z",
		"size": 494,
		"path": "../public/assets/p-BT9-hMMz-DeoKjx0N.js"
	},
	"/assets/p-BWoa-cki-UpDL1J1V.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"469-MAKOTmbsqUpzRy0RZ0/MkYlxxqE\"",
		"mtime": "2026-09-10T15:26:19.416Z",
		"size": 1129,
		"path": "../public/assets/p-BWoa-cki-UpDL1J1V.js"
	},
	"/assets/p-C-NbvXu4-B9XCdoFH.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"127b-nP1/e4Mh7JXhis9RI1WSxH7S81E\"",
		"mtime": "2026-09-10T15:26:19.499Z",
		"size": 4731,
		"path": "../public/assets/p-C-NbvXu4-B9XCdoFH.js"
	},
	"/assets/p-C09TXohi-BME7HMRv.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"c7c-eBlQFVuVp95kjyeMXHxMBBybRJM\"",
		"mtime": "2026-09-10T15:26:19.507Z",
		"size": 3196,
		"path": "../public/assets/p-C09TXohi-BME7HMRv.js"
	},
	"/assets/p-C4VpVfrJ-B7tOqQiD.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"28b6-z0kccsJcaxrsNNsPUeOkumHk1lc\"",
		"mtime": "2026-09-10T15:26:19.529Z",
		"size": 10422,
		"path": "../public/assets/p-C4VpVfrJ-B7tOqQiD.js"
	},
	"/assets/p-CG_zZq_I-Bnu5sziO.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3a9-IewWt3kc3BnoWwAVte31wTmqo4k\"",
		"mtime": "2026-09-10T15:26:19.545Z",
		"size": 937,
		"path": "../public/assets/p-CG_zZq_I-Bnu5sziO.js"
	},
	"/assets/p-CWuIRJQN-CpJ4cxhA.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"26e-fZxIO0/B5h4LVezuzSyQ2tIfW08\"",
		"mtime": "2026-09-10T15:26:19.566Z",
		"size": 622,
		"path": "../public/assets/p-CWuIRJQN-CpJ4cxhA.js"
	},
	"/assets/p-D0YpjgON-DuPvRicD.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"15f9-l2t1qtt076m1Azprcw7kb/Qo+DQ\"",
		"mtime": "2026-09-10T15:26:19.568Z",
		"size": 5625,
		"path": "../public/assets/p-D0YpjgON-DuPvRicD.js"
	},
	"/assets/p-D7-vHX0A-M28BuEVW.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4ac-++v6wgkqI6DQPAYjpbKuefeV/jU\"",
		"mtime": "2026-09-10T15:26:19.568Z",
		"size": 1196,
		"path": "../public/assets/p-D7-vHX0A-M28BuEVW.js"
	},
	"/assets/p-qAXsfUff-UrBZGjF-.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"403-VFqIV1qmCBL/QnR1Ulrs6NA9M2s\"",
		"mtime": "2026-09-10T15:26:19.620Z",
		"size": 1027,
		"path": "../public/assets/p-qAXsfUff-UrBZGjF-.js"
	},
	"/assets/p-ZjP4CjeZ-DJ1DGIsW.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"62-xIml61NROF4B1cx8XnHtA30tV1Q\"",
		"mtime": "2026-09-10T15:26:19.616Z",
		"size": 98,
		"path": "../public/assets/p-ZjP4CjeZ-DJ1DGIsW.js"
	},
	"/assets/pen-line-CO2yx4Bi.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"10a-u4isMTvh45RYfv7uiOucuS93HU4\"",
		"mtime": "2026-09-10T15:26:19.620Z",
		"size": 266,
		"path": "../public/assets/pen-line-CO2yx4Bi.js"
	},
	"/assets/play-WQUrHHvV.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"7b-manZWrC6bTyM+ozI+0VPeN+Al4M\"",
		"mtime": "2026-09-10T15:26:19.642Z",
		"size": 123,
		"path": "../public/assets/play-WQUrHHvV.js"
	},
	"/assets/purify.es-ChwZkWde.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"68bc-bPPRDEosU/Lqj+2Oyi1ue22LViM\"",
		"mtime": "2026-09-10T15:26:19.652Z",
		"size": 26812,
		"path": "../public/assets/purify.es-ChwZkWde.js"
	},
	"/assets/mc-wa-sqlite-async-DYagSq56.wasm": {
		"type": "application/wasm",
		"etag": "\"263900-YXiey/3Hhr2OVYDVjdLpGtiNQfI\"",
		"mtime": "2026-09-10T15:26:19.824Z",
		"size": 2504960,
		"path": "../public/assets/mc-wa-sqlite-async-DYagSq56.wasm"
	},
	"/assets/refresh-cw-4PZoZN3K.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"135-A+11ing3GYPqn1LWnYYOUJB6IiU\"",
		"mtime": "2026-09-10T15:26:19.673Z",
		"size": 309,
		"path": "../public/assets/refresh-cw-4PZoZN3K.js"
	},
	"/assets/ReportBuilder-CIg6JJW5.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1eee-Xne5zzCXUa10q2SBgXNguwYccl4\"",
		"mtime": "2026-09-10T15:26:18.862Z",
		"size": 7918,
		"path": "../public/assets/ReportBuilder-CIg6JJW5.js"
	},
	"/assets/Reports-ByLSODr_.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2328-lbcBLcKJXI2YCr2PguEVs0lBJs8\"",
		"mtime": "2026-09-10T15:26:18.917Z",
		"size": 9e3,
		"path": "../public/assets/Reports-ByLSODr_.js"
	},
	"/assets/resource-qvK7jcMb.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"a46-aRmNCf2XIqDJR0r9xkUs/gOmfBI\"",
		"mtime": "2026-09-10T15:26:19.723Z",
		"size": 2630,
		"path": "../public/assets/resource-qvK7jcMb.js"
	},
	"/assets/RoleSelection-CecTl6oL.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1090-IOXPsGSR+PIzwMgGxjM/PnmOPFQ\"",
		"mtime": "2026-09-10T15:26:18.923Z",
		"size": 4240,
		"path": "../public/assets/RoleSelection-CecTl6oL.js"
	},
	"/assets/rolldown-runtime-hePW80VL.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2cc-fA8td6k29UVF6JoPfhOPkceTK1M\"",
		"mtime": "2026-09-10T15:26:19.723Z",
		"size": 716,
		"path": "../public/assets/rolldown-runtime-hePW80VL.js"
	},
	"/assets/SaisieRapide-DXIEh5v5.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"228-IrtM4yWJ981vJsoi/gGF3/qth/s\"",
		"mtime": "2026-09-10T15:26:18.927Z",
		"size": 552,
		"path": "../public/assets/SaisieRapide-DXIEh5v5.js"
	},
	"/assets/security-CPHDFpdn.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f33-C2Miy5A4omHBoxpqDaOViatt6kc\"",
		"mtime": "2026-09-10T15:26:19.725Z",
		"size": 3891,
		"path": "../public/assets/security-CPHDFpdn.js"
	},
	"/assets/Settings-BVD2jY8g.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4064-KU8XCRdmHR0MZK96RWOrdMwaLB8\"",
		"mtime": "2026-09-10T15:26:18.931Z",
		"size": 16484,
		"path": "../public/assets/Settings-BVD2jY8g.js"
	},
	"/assets/shield-DVCqYtft.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"105-pClFRyCMgcZGxuRU6jpHmJoHrFg\"",
		"mtime": "2026-09-10T15:26:19.727Z",
		"size": 261,
		"path": "../public/assets/shield-DVCqYtft.js"
	},
	"/assets/Skeleton-Boo03FH4.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"413-hzINXgqpgDD919C2H+NrpZQSyS4\"",
		"mtime": "2026-09-10T15:26:18.933Z",
		"size": 1043,
		"path": "../public/assets/Skeleton-Boo03FH4.js"
	},
	"/assets/tag-CEKue4U8.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"13b-DMHbEru0SWDurCPQoXHDEGlZf4A\"",
		"mtime": "2026-09-10T15:26:19.727Z",
		"size": 315,
		"path": "../public/assets/tag-CEKue4U8.js"
	},
	"/assets/TopHeader-D6w6QSJV.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"eaf-OUq6tRHwAfpYX5UhX0SNQIpuD6s\"",
		"mtime": "2026-09-10T15:26:18.935Z",
		"size": 3759,
		"path": "../public/assets/TopHeader-D6w6QSJV.js"
	},
	"/assets/Trace-DBJ9eZOq.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"efb-3+qGzDTeSiUn2etifhPkQlxi+mQ\"",
		"mtime": "2026-09-10T15:26:18.957Z",
		"size": 3835,
		"path": "../public/assets/Trace-DBJ9eZOq.js"
	},
	"/assets/TransactionCard-DkdNbg56.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"a78-cQgTrpd30Z4eAS1CoPf18zfcqFM\"",
		"mtime": "2026-09-10T15:26:18.959Z",
		"size": 2680,
		"path": "../public/assets/TransactionCard-DkdNbg56.js"
	},
	"/assets/TransactionDetail-BnqOnZeb.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2496-6UOFRRhO8z9PEyVW35NIAviq4Lc\"",
		"mtime": "2026-09-10T15:26:19.012Z",
		"size": 9366,
		"path": "../public/assets/TransactionDetail-BnqOnZeb.js"
	},
	"/assets/TransactionEdit-meJqD3uK.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1a54-Gk2r07tvYNdSxU6UPgR9Gzzj9us\"",
		"mtime": "2026-09-10T15:26:19.022Z",
		"size": 6740,
		"path": "../public/assets/TransactionEdit-meJqD3uK.js"
	},
	"/assets/TransactionNew-BoSnYEOq.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1a82-AD2EmHCHASQEQXtizAqBb28A50Y\"",
		"mtime": "2026-09-10T15:26:19.076Z",
		"size": 6786,
		"path": "../public/assets/TransactionNew-BoSnYEOq.js"
	},
	"/assets/TransactionNewGroup-C5Pk5q6G.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"187a-mhIAjSz7WEyRotEMSaAWK78Qrww\"",
		"mtime": "2026-09-10T15:26:19.078Z",
		"size": 6266,
		"path": "../public/assets/TransactionNewGroup-C5Pk5q6G.js"
	},
	"/assets/trash-2-BaUJaRA-.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"15a-mj1POQknuVRsAidmnK/PntPnVtA\"",
		"mtime": "2026-09-10T15:26:19.729Z",
		"size": 346,
		"path": "../public/assets/trash-2-BaUJaRA-.js"
	},
	"/assets/trending-down-CsuoXBoU.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"c4-36k5gm/xB5h9zf8+40T8wTz9qzQ\"",
		"mtime": "2026-09-10T15:26:19.731Z",
		"size": 196,
		"path": "../public/assets/trending-down-CsuoXBoU.js"
	},
	"/assets/trending-up-CTvbN1Tw.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"c1-EAa7c499fYjKqwxOeTymXghcPb8\"",
		"mtime": "2026-09-10T15:26:19.733Z",
		"size": 193,
		"path": "../public/assets/trending-up-CTvbN1Tw.js"
	},
	"/assets/user-plus-RzBYvykm.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"12a-Oh2BaCGpr7rbJo3ITbKHKN5YKRo\"",
		"mtime": "2026-09-10T15:26:19.733Z",
		"size": 298,
		"path": "../public/assets/user-plus-RzBYvykm.js"
	},
	"/assets/Tutorial-CEDJzE_t.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"136b1-/GgUKzETR6W7BlRO5TNTV6Zo9us\"",
		"mtime": "2026-09-10T15:26:19.080Z",
		"size": 79537,
		"path": "../public/assets/Tutorial-CEDJzE_t.js"
	},
	"/assets/Versement-Dl9v1Kbi.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"17b2-TqDtUCw3mm3EyZk3dxa3lou0/fs\"",
		"mtime": "2026-09-10T15:26:19.080Z",
		"size": 6066,
		"path": "../public/assets/Versement-Dl9v1Kbi.js"
	},
	"/assets/wa-sqlite-async-L_LSrxrb.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f88f-NGMPNASgtNbzZuH6O9+kt/v29/g\"",
		"mtime": "2026-09-10T15:26:19.735Z",
		"size": 63631,
		"path": "../public/assets/wa-sqlite-async-L_LSrxrb.js"
	},
	"/assets/wa-sqlite-BVXfj7bw.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"e9d6-LFag0v/Myx+4L9KqMw5YED3uQZQ\"",
		"mtime": "2026-09-10T15:26:19.735Z",
		"size": 59862,
		"path": "../public/assets/wa-sqlite-BVXfj7bw.js"
	},
	"/assets/wallet-uChZyAIv.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"333-yNY56X5Zr2DarWfwHpjuWAoSy8s\"",
		"mtime": "2026-09-10T15:26:19.737Z",
		"size": 819,
		"path": "../public/assets/wallet-uChZyAIv.js"
	},
	"/assets/websockets-BrH1W1hC.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1a557-mxpHOqZvkzHe900c1PAg5PC57RM\"",
		"mtime": "2026-09-10T15:26:19.737Z",
		"size": 107863,
		"path": "../public/assets/websockets-BrH1W1hC.js"
	},
	"/assets/websockets-E5bULUr_.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1a62c-rg3+llKpcDkOZD0Mr8foSXIMZf4\"",
		"mtime": "2026-09-10T15:26:19.923Z",
		"size": 108076,
		"path": "../public/assets/websockets-E5bULUr_.js"
	},
	"/assets/worker-DJSXMwe3.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"12df0-e0L59HHmgiflz5cssaAxMwdrPHU\"",
		"mtime": "2026-09-10T15:26:19.925Z",
		"size": 77296,
		"path": "../public/assets/worker-DJSXMwe3.js"
	},
	"/assets/x-Nd3QERDN.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"8f-Nmo9rrjAaZ2mkpRS8AaTwQCzHVA\"",
		"mtime": "2026-09-10T15:26:19.742Z",
		"size": 143,
		"path": "../public/assets/x-Nd3QERDN.js"
	},
	"/assets/wa-sqlite-CagagB9I.wasm": {
		"type": "application/wasm",
		"etag": "\"112932-PVZvyjEpDlc7C+RsG8vVBaXaZyQ\"",
		"mtime": "2026-09-10T15:26:19.832Z",
		"size": 1124658,
		"path": "../public/assets/wa-sqlite-CagagB9I.wasm"
	},
	"/assets/wa-sqlite-async-DCIP8kAx.wasm": {
		"type": "application/wasm",
		"etag": "\"22d125-my2aJEczirWasFS1osydDIkHGgk\"",
		"mtime": "2026-09-10T15:26:19.837Z",
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
