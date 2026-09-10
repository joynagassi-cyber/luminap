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
	"/assets/AccessHandlePoolVFS-CpZlhl_v.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f0f-lkHnFiGWdMK4g+9lrwVmvLQAkcg\"",
		"mtime": "2026-09-10T17:04:06.572Z",
		"size": 3855,
		"path": "../public/assets/AccessHandlePoolVFS-CpZlhl_v.js"
	},
	"/assets/AccessHandlePoolVFS-k-bp0HG6.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f02-WFkNV/KJ/xa7F3xDGFd1mY/Co6Q\"",
		"mtime": "2026-09-10T17:04:08.148Z",
		"size": 3842,
		"path": "../public/assets/AccessHandlePoolVFS-k-bp0HG6.js"
	},
	"/assets/Archives-CUarxEr4.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1368-31QunjPadG2ZzFInQn+jBd88gPY\"",
		"mtime": "2026-09-10T17:04:06.572Z",
		"size": 4968,
		"path": "../public/assets/Archives-CUarxEr4.js"
	},
	"/assets/arrow-down-right-DHUIPYGf.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"9c-dxH4aBtUiRLscwdqLsZ69fvcuFU\"",
		"mtime": "2026-09-10T17:04:06.984Z",
		"size": 156,
		"path": "../public/assets/arrow-down-right-DHUIPYGf.js"
	},
	"/assets/arrow-left-KIBBo_DK.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"99-wNX7z6QAYTlIEtU5OJpqnfXaKuQ\"",
		"mtime": "2026-09-10T17:04:06.984Z",
		"size": 153,
		"path": "../public/assets/arrow-left-KIBBo_DK.js"
	},
	"/assets/AreaChart-CUmr-M2T.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5ca96-SAVelj8bVxJf08RbJY6K+sPdLZ0\"",
		"mtime": "2026-09-10T17:04:06.574Z",
		"size": 379542,
		"path": "../public/assets/AreaChart-CUmr-M2T.js"
	},
	"/assets/arrow-up-cd7PHdml.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"105-GqQ1Cfat8TCTP2+Geovz69vLSns\"",
		"mtime": "2026-09-10T17:04:06.984Z",
		"size": 261,
		"path": "../public/assets/arrow-up-cd7PHdml.js"
	},
	"/assets/arrow-up-right-C-8lR41U.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"9a-Z8bvYgN9ghh0ziL+qBYPfZJtjl8\"",
		"mtime": "2026-09-10T17:04:06.986Z",
		"size": 154,
		"path": "../public/assets/arrow-up-right-C-8lR41U.js"
	},
	"/assets/Balance-BPS6wPZZ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2601-ZpqResdWnWAwVz5AM201QnWUHww\"",
		"mtime": "2026-09-10T17:04:06.576Z",
		"size": 9729,
		"path": "../public/assets/Balance-BPS6wPZZ.js"
	},
	"/assets/book-open-DKU8q55I.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"10b-/8kQQWyf6z8UIbFbBBVOwvN+tGg\"",
		"mtime": "2026-09-10T17:04:06.986Z",
		"size": 267,
		"path": "../public/assets/book-open-DKU8q55I.js"
	},
	"/assets/BottomNav-AcfrRrj3.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1cbb-vkZcnfdyK2j++s715Ga3wpaoSpQ\"",
		"mtime": "2026-09-10T17:04:06.576Z",
		"size": 7355,
		"path": "../public/assets/BottomNav-AcfrRrj3.js"
	},
	"/assets/building-2-CxBFSu4V.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1ab-E6q2qJuX1UPJk/ftb6c28WK4R3s\"",
		"mtime": "2026-09-10T17:04:06.988Z",
		"size": 427,
		"path": "../public/assets/building-2-CxBFSu4V.js"
	},
	"/assets/calendar-CjSyH-WX.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f6-IqMyrGvRCCbKpkSjNsYeeDv+pvU\"",
		"mtime": "2026-09-10T17:04:06.988Z",
		"size": 246,
		"path": "../public/assets/calendar-CjSyH-WX.js"
	},
	"/robots.txt": {
		"type": "text/plain; charset=utf-8",
		"etag": "\"ae-hLVBrSrDdpIw3Xl0dJPRkupPepQ\"",
		"mtime": "2026-09-01T22:18:50.689Z",
		"size": 174,
		"path": "../public/robots.txt"
	},
	"/assets/CentralAdmin-BL1u1KbB.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"295d-a1DvdkMx8aTyDwbhpB9xZZvIne8\"",
		"mtime": "2026-09-10T17:04:06.578Z",
		"size": 10589,
		"path": "../public/assets/CentralAdmin-BL1u1KbB.js"
	},
	"/assets/chevron-right-B5MLWK7e.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"76-DwBOW8QgTkE3R1uX0CgXNjpLEfU\"",
		"mtime": "2026-09-10T17:04:06.988Z",
		"size": 118,
		"path": "../public/assets/chevron-right-B5MLWK7e.js"
	},
	"/assets/circle-alert-CRTOjoUI.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"ee-z8kZ14kQ9AC8QiAwRdmSdbXxi6o\"",
		"mtime": "2026-09-10T17:04:06.990Z",
		"size": 238,
		"path": "../public/assets/circle-alert-CRTOjoUI.js"
	},
	"/assets/circle-check-big-DM-CQ0gJ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"b5-T6BDTPU47THJsSbAO6ZR8mn2uU4\"",
		"mtime": "2026-09-10T17:04:07.332Z",
		"size": 181,
		"path": "../public/assets/circle-check-big-DM-CQ0gJ.js"
	},
	"/assets/circle-plus-B9MCViW9.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"c3-yArTR+BAAbfZMPNqISa4CHqzgNw\"",
		"mtime": "2026-09-10T17:04:07.334Z",
		"size": 195,
		"path": "../public/assets/circle-plus-B9MCViW9.js"
	},
	"/assets/circle-x-D1nhbx1y.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"c3-EfcmPibDprXR9cUlO3DDkVoQ7Nk\"",
		"mtime": "2026-09-10T17:04:07.336Z",
		"size": 195,
		"path": "../public/assets/circle-x-D1nhbx1y.js"
	},
	"/assets/clock-CskK013c.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"ac-AtcJsOKOSO0gCPhDMy+WGQwmPB0\"",
		"mtime": "2026-09-10T17:04:07.372Z",
		"size": 172,
		"path": "../public/assets/clock-CskK013c.js"
	},
	"/assets/Cotisations-CVc9kJNS.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"14ac-gqtsLz3rHRyz5rR5g3kovMRRFmk\"",
		"mtime": "2026-09-10T17:04:06.578Z",
		"size": 5292,
		"path": "../public/assets/Cotisations-CVc9kJNS.js"
	},
	"/assets/CulteDetail-B7SiUNjB.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"255a-lesHwEvbYIfKZgDSs8HdddI7Ksg\"",
		"mtime": "2026-09-10T17:04:06.580Z",
		"size": 9562,
		"path": "../public/assets/CulteDetail-B7SiUNjB.js"
	},
	"/assets/CustomFields-CXiOkQ34.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1c2f-NGOtMnFz+eQuer7hJFNWiyHMwKI\"",
		"mtime": "2026-09-10T17:04:06.580Z",
		"size": 7215,
		"path": "../public/assets/CustomFields-CXiOkQ34.js"
	},
	"/assets/Dashboard-BTZBpK2x.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"431a-GCNEsNTFJYKWPk00lCKGmXlB/Qg\"",
		"mtime": "2026-09-10T17:04:06.582Z",
		"size": 17178,
		"path": "../public/assets/Dashboard-BTZBpK2x.js"
	},
	"/assets/database-CgY-goQR.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"e8-Speui6a9pfD89VE7BC/QwUGMI7U\"",
		"mtime": "2026-09-10T17:04:07.376Z",
		"size": 232,
		"path": "../public/assets/database-CgY-goQR.js"
	},
	"/assets/EventDetail-ZoaRuFWV.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"532b-dhUIlp+TfBrBZDYoqbJG0SsN3B8\"",
		"mtime": "2026-09-10T17:04:06.583Z",
		"size": 21291,
		"path": "../public/assets/EventDetail-ZoaRuFWV.js"
	},
	"/assets/EventEdit-Uvj01Wsf.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"147c-O6OWQH6UTd5lJEJYgauPR0OUhtg\"",
		"mtime": "2026-09-10T17:04:06.583Z",
		"size": 5244,
		"path": "../public/assets/EventEdit-Uvj01Wsf.js"
	},
	"/assets/EventNew-BJGt88Ll.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1f82-D0pQ62Mvr9gaiZBi/+0p1tsdYm0\"",
		"mtime": "2026-09-10T17:04:06.583Z",
		"size": 8066,
		"path": "../public/assets/EventNew-BJGt88Ll.js"
	},
	"/assets/Events-IFBiCv3O.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"12b1-9abzMP5wDIT5B77ryhlIcwvkicE\"",
		"mtime": "2026-09-10T17:04:06.585Z",
		"size": 4785,
		"path": "../public/assets/Events-IFBiCv3O.js"
	},
	"/assets/FacadeVFS-BEICR2q0.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1871-h2JM49n3k6wsMKWYG0w5CCQNUNY\"",
		"mtime": "2026-09-10T17:04:08.148Z",
		"size": 6257,
		"path": "../public/assets/FacadeVFS-BEICR2q0.js"
	},
	"/assets/FacadeVFS-cienyx25.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1870-D6dztgOh1qoneKY8jOODW2sIQps\"",
		"mtime": "2026-09-10T17:04:06.586Z",
		"size": 6256,
		"path": "../public/assets/FacadeVFS-cienyx25.js"
	},
	"/assets/Finance-J9o7iT5U.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1be0-0b6nR7HLMUArLvujQnS/mGSUnOs\"",
		"mtime": "2026-09-10T17:04:06.586Z",
		"size": 7136,
		"path": "../public/assets/Finance-J9o7iT5U.js"
	},
	"/assets/FormFill-B7ZPLkWw.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"11f6-T0G7gLUG6SIIln/yOlmk1UuRiJw\"",
		"mtime": "2026-09-10T17:04:06.654Z",
		"size": 4598,
		"path": "../public/assets/FormFill-B7ZPLkWw.js"
	},
	"/assets/FormBuilder-B0Iy2nVQ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1fb5-YIT9DNvscbgNwYe9GcNyq5MOPxw\"",
		"mtime": "2026-09-10T17:04:06.654Z",
		"size": 8117,
		"path": "../public/assets/FormBuilder-B0Iy2nVQ.js"
	},
	"/assets/formSystem-DnaCnfot.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"7ee-R8RaTHBWuJ96UpA69vHqVlBsSJA\"",
		"mtime": "2026-09-10T17:04:07.507Z",
		"size": 2030,
		"path": "../public/assets/formSystem-DnaCnfot.js"
	},
	"/assets/GroupDetail-Bf2faRpi.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"544f-uazDc6Reycfv/nyAhfT5SOBeJKY\"",
		"mtime": "2026-09-10T17:04:06.656Z",
		"size": 21583,
		"path": "../public/assets/GroupDetail-Bf2faRpi.js"
	},
	"/assets/Groups-B8UjwkCr.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"23bf-T+do1NBYhfI++DZ0wTK2Utflra8\"",
		"mtime": "2026-09-10T17:04:06.656Z",
		"size": 9151,
		"path": "../public/assets/Groups-B8UjwkCr.js"
	},
	"/assets/Help-kT7-YN51.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"bfa-Go0qRWMTzH1KnaYNRrGtTbn7aII\"",
		"mtime": "2026-09-10T17:04:06.656Z",
		"size": 3066,
		"path": "../public/assets/Help-kT7-YN51.js"
	},
	"/assets/History-CoNGteCV.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2e9e-6eDq0cphIhtqR8XSt2+OnNHCpdk\"",
		"mtime": "2026-09-10T17:04:06.656Z",
		"size": 11934,
		"path": "../public/assets/History-CoNGteCV.js"
	},
	"/assets/IDBBatchAtomicVFS-DOQZPx-g.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"32a2-6ppgZuTXuQvYK+HVWuYHmxtHCa0\"",
		"mtime": "2026-09-10T17:04:08.150Z",
		"size": 12962,
		"path": "../public/assets/IDBBatchAtomicVFS-DOQZPx-g.js"
	},
	"/assets/IDBBatchAtomicVFS-VqMX892s.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"32ae-TQokrOlEEgUUOhT6r8Fb/aL8SUs\"",
		"mtime": "2026-09-10T17:04:06.658Z",
		"size": 12974,
		"path": "../public/assets/IDBBatchAtomicVFS-VqMX892s.js"
	},
	"/assets/html2canvas-DCcDvdvP.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"30b50-/NW/tvs1950d+adFAmG+0O5qROc\"",
		"mtime": "2026-09-10T17:04:07.538Z",
		"size": 199504,
		"path": "../public/assets/html2canvas-DCcDvdvP.js"
	},
	"/assets/export-DTPf8QoW.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"af2e1-t8xYZL4GuxjA7gDDLKfjcQYxddo\"",
		"mtime": "2026-09-10T17:04:07.386Z",
		"size": 717537,
		"path": "../public/assets/export-DTPf8QoW.js"
	},
	"/assets/index-BF_rF_2q.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"c212e-LhMNoReYR6QVXxWDBWziY2Zq3jU\"",
		"mtime": "2026-09-10T17:04:06.570Z",
		"size": 794926,
		"path": "../public/assets/index-BF_rF_2q.js"
	},
	"/assets/dist-G7PDzus1.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"10d069-4aOm1fXTuRa6p2kFYxdBUgiv+4c\"",
		"mtime": "2026-09-10T17:04:07.380Z",
		"size": 1101929,
		"path": "../public/assets/dist-G7PDzus1.js"
	},
	"/assets/index-tRQoNGRC.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"10d7b-I+AgxM+LI6is3rix23DruXRrzIM\"",
		"mtime": "2026-09-10T17:04:07.938Z",
		"size": 68987,
		"path": "../public/assets/index-tRQoNGRC.css"
	},
	"/assets/index.es-Cv55OkcL.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"24f91-bSe59sy1u7ez4l59yiMFRCl29IQ\"",
		"mtime": "2026-09-10T17:04:07.540Z",
		"size": 151441,
		"path": "../public/assets/index.es-Cv55OkcL.js"
	},
	"/assets/invitation-D2Nrg3il.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"14a4-DboiyoCtghflvGRy6DF+YzJkCHw\"",
		"mtime": "2026-09-10T17:04:07.542Z",
		"size": 5284,
		"path": "../public/assets/invitation-D2Nrg3il.js"
	},
	"/assets/InvitationClaim-DQryHjVf.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"7b876-dQkHT6BL6i2fcKX9WoaVol5p3LU\"",
		"mtime": "2026-09-10T17:04:06.658Z",
		"size": 505974,
		"path": "../public/assets/InvitationClaim-DQryHjVf.js"
	},
	"/assets/InvitationManage-hsZQTQ9A.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"176c-AJaG0ieErHpq5y1iWi2A4jaGaaY\"",
		"mtime": "2026-09-10T17:04:06.826Z",
		"size": 5996,
		"path": "../public/assets/InvitationManage-hsZQTQ9A.js"
	},
	"/assets/InvitationEmit-CC6l3mJj.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5b36-3QwIxpRnse4OVKbHwn/tEgspwnI\"",
		"mtime": "2026-09-10T17:04:06.824Z",
		"size": 23350,
		"path": "../public/assets/InvitationEmit-CC6l3mJj.js"
	},
	"/assets/mc-wa-sqlite-async-OK58TZB1.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f9c7-OWgn/LbVfd6oIzizW/33tbyE9i4\"",
		"mtime": "2026-09-10T17:04:07.544Z",
		"size": 63943,
		"path": "../public/assets/mc-wa-sqlite-async-OK58TZB1.js"
	},
	"/assets/mc-wa-sqlite-Dt2CfptV.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"eb0e-ka1IvJlVUyt14/GJnJnIXiNK/CY\"",
		"mtime": "2026-09-10T17:04:07.542Z",
		"size": 60174,
		"path": "../public/assets/mc-wa-sqlite-Dt2CfptV.js"
	},
	"/assets/Members-DnBvMHDz.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1c60-VksAmrwUX46M2YvllaXdhz1cbhA\"",
		"mtime": "2026-09-10T17:04:06.826Z",
		"size": 7264,
		"path": "../public/assets/Members-DnBvMHDz.js"
	},
	"/assets/MembreDetail-Buq65MdG.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"20a1-TJ7Q0j0WsYX2Ub5EZoeSqu8o5o4\"",
		"mtime": "2026-09-10T17:04:06.826Z",
		"size": 8353,
		"path": "../public/assets/MembreDetail-Buq65MdG.js"
	},
	"/assets/MembresEnAvance-BiXM1JOb.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"d45-gI3PJz2DhVu5dWfmotMn3riMsa0\"",
		"mtime": "2026-09-10T17:04:06.828Z",
		"size": 3397,
		"path": "../public/assets/MembresEnAvance-BiXM1JOb.js"
	},
	"/assets/MemoryVFS-B0McoEU4.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"61c-1sJHXrJ6Gu2AYjNFqrXj/xoompE\"",
		"mtime": "2026-09-10T17:04:06.828Z",
		"size": 1564,
		"path": "../public/assets/MemoryVFS-B0McoEU4.js"
	},
	"/assets/MemoryVFS-DQF4WRTC.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"61c-i2gYtp7yBd03f77k1kJ2TRrrTSQ\"",
		"mtime": "2026-09-10T17:04:08.150Z",
		"size": 1564,
		"path": "../public/assets/MemoryVFS-DQF4WRTC.js"
	},
	"/assets/NotFound-BnKx7OiN.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"39c-lI++yhMZFMZzabm+pNPNRTHAQ5o\"",
		"mtime": "2026-09-10T17:04:06.828Z",
		"size": 924,
		"path": "../public/assets/NotFound-BnKx7OiN.js"
	},
	"/assets/Notifications-y16osi-B.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1768-mRht67gd2g7KIGugkN078A06li0\"",
		"mtime": "2026-09-10T17:04:06.830Z",
		"size": 5992,
		"path": "../public/assets/Notifications-y16osi-B.js"
	},
	"/assets/Onboarding-BAMcc0Hc.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"34a2-JmplwvvoYMExlnUP2nXX4VuaoTo\"",
		"mtime": "2026-09-10T17:04:06.879Z",
		"size": 13474,
		"path": "../public/assets/Onboarding-BAMcc0Hc.js"
	},
	"/assets/OPFSCoopSyncVFS-C4W9Ul96.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1dea-t112D0lNCBHxp7svhLpJ0YA4HVM\"",
		"mtime": "2026-09-10T17:04:06.830Z",
		"size": 7658,
		"path": "../public/assets/OPFSCoopSyncVFS-C4W9Ul96.js"
	},
	"/assets/OPFSCoopSyncVFS-DATtbZFi.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1dde-35NXNSgW4WGGg2Jx/DvLz8pj/JQ\"",
		"mtime": "2026-09-10T17:04:08.150Z",
		"size": 7646,
		"path": "../public/assets/OPFSCoopSyncVFS-DATtbZFi.js"
	},
	"/assets/OPFSWriteAheadVFS-CV9eCy6k.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5cf9-6HlddlhWhdx1eoulQ86bh1pDju4\"",
		"mtime": "2026-09-10T17:04:06.877Z",
		"size": 23801,
		"path": "../public/assets/OPFSWriteAheadVFS-CV9eCy6k.js"
	},
	"/assets/logo-lumina.png": {
		"type": "image/png",
		"etag": "\"c2ce-Xrm5OeE6Rcs4GqYh+OFZRZQyAYE\"",
		"mtime": "2026-09-03T16:41:02.881Z",
		"size": 49870,
		"path": "../public/assets/logo-lumina.png"
	},
	"/assets/mc-wa-sqlite-DoDpgFfE.wasm": {
		"type": "application/wasm",
		"etag": "\"1405ab-mYFvsN3agcsYu7kHk/nCjgNgqQ8\"",
		"mtime": "2026-09-10T17:04:07.940Z",
		"size": 1312171,
		"path": "../public/assets/mc-wa-sqlite-DoDpgFfE.wasm"
	},
	"/assets/OPFSWriteAheadVFS-Dceb9ZfN.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5cf2-6VWvwZq/3kDJah89Fj0JQlYKJAI\"",
		"mtime": "2026-09-10T17:04:08.152Z",
		"size": 23794,
		"path": "../public/assets/OPFSWriteAheadVFS-Dceb9ZfN.js"
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
		"mtime": "2026-09-10T17:04:07.641Z",
		"size": 36562,
		"path": "../public/assets/p-1sJ0ZDPe-YkMm5iKi.js"
	},
	"/assets/p-5ldEpNdG-6dZfqBTh.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"276c-eLE8B8Pe9lKRYBRZPz3DZQM2vmI\"",
		"mtime": "2026-09-10T17:04:07.641Z",
		"size": 10092,
		"path": "../public/assets/p-5ldEpNdG-6dZfqBTh.js"
	},
	"/assets/p-BMPN55of-C0P_qWS_.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"21a-HGYAvd2qgF1iEwCzq6eCRzodk80\"",
		"mtime": "2026-09-10T17:04:07.643Z",
		"size": 538,
		"path": "../public/assets/p-BMPN55of-C0P_qWS_.js"
	},
	"/assets/p-BmVRXR1y-Qf1gG5of.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3e6-cIzBL2cgY/c+Nd+w1vUUDnL3YhY\"",
		"mtime": "2026-09-10T17:04:07.645Z",
		"size": 998,
		"path": "../public/assets/p-BmVRXR1y-Qf1gG5of.js"
	},
	"/assets/p-BQyuFxYc-BP5sUz4F.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"624-sKMq1g03/KlKcB/qZDlMk1Tk0Qk\"",
		"mtime": "2026-09-10T17:04:07.643Z",
		"size": 1572,
		"path": "../public/assets/p-BQyuFxYc-BP5sUz4F.js"
	},
	"/assets/p-BT9-hMMz-DeoKjx0N.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1ee-rguGWc7rPK2wzL0Vb/AugNuA+fM\"",
		"mtime": "2026-09-10T17:04:07.643Z",
		"size": 494,
		"path": "../public/assets/p-BT9-hMMz-DeoKjx0N.js"
	},
	"/assets/p-BWoa-cki-UpDL1J1V.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"469-MAKOTmbsqUpzRy0RZ0/MkYlxxqE\"",
		"mtime": "2026-09-10T17:04:07.645Z",
		"size": 1129,
		"path": "../public/assets/p-BWoa-cki-UpDL1J1V.js"
	},
	"/assets/p-C-NbvXu4-B9XCdoFH.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"127b-nP1/e4Mh7JXhis9RI1WSxH7S81E\"",
		"mtime": "2026-09-10T17:04:07.647Z",
		"size": 4731,
		"path": "../public/assets/p-C-NbvXu4-B9XCdoFH.js"
	},
	"/assets/p-C09TXohi-BME7HMRv.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"c7c-eBlQFVuVp95kjyeMXHxMBBybRJM\"",
		"mtime": "2026-09-10T17:04:07.647Z",
		"size": 3196,
		"path": "../public/assets/p-C09TXohi-BME7HMRv.js"
	},
	"/assets/p-C4VpVfrJ-B7tOqQiD.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"28b6-z0kccsJcaxrsNNsPUeOkumHk1lc\"",
		"mtime": "2026-09-10T17:04:07.794Z",
		"size": 10422,
		"path": "../public/assets/p-C4VpVfrJ-B7tOqQiD.js"
	},
	"/assets/p-CG_zZq_I-Bnu5sziO.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3a9-IewWt3kc3BnoWwAVte31wTmqo4k\"",
		"mtime": "2026-09-10T17:04:07.794Z",
		"size": 937,
		"path": "../public/assets/p-CG_zZq_I-Bnu5sziO.js"
	},
	"/assets/p-CWuIRJQN-CpJ4cxhA.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"26e-fZxIO0/B5h4LVezuzSyQ2tIfW08\"",
		"mtime": "2026-09-10T17:04:07.796Z",
		"size": 622,
		"path": "../public/assets/p-CWuIRJQN-CpJ4cxhA.js"
	},
	"/assets/p-D0YpjgON-DuPvRicD.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"15f9-l2t1qtt076m1Azprcw7kb/Qo+DQ\"",
		"mtime": "2026-09-10T17:04:07.796Z",
		"size": 5625,
		"path": "../public/assets/p-D0YpjgON-DuPvRicD.js"
	},
	"/assets/p-D7-vHX0A-M28BuEVW.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4ac-++v6wgkqI6DQPAYjpbKuefeV/jU\"",
		"mtime": "2026-09-10T17:04:07.796Z",
		"size": 1196,
		"path": "../public/assets/p-D7-vHX0A-M28BuEVW.js"
	},
	"/assets/p-qAXsfUff-UrBZGjF-.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"403-VFqIV1qmCBL/QnR1Ulrs6NA9M2s\"",
		"mtime": "2026-09-10T17:04:07.798Z",
		"size": 1027,
		"path": "../public/assets/p-qAXsfUff-UrBZGjF-.js"
	},
	"/assets/p-ZjP4CjeZ-DJ1DGIsW.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"62-xIml61NROF4B1cx8XnHtA30tV1Q\"",
		"mtime": "2026-09-10T17:04:07.798Z",
		"size": 98,
		"path": "../public/assets/p-ZjP4CjeZ-DJ1DGIsW.js"
	},
	"/assets/mc-wa-sqlite-async-DYagSq56.wasm": {
		"type": "application/wasm",
		"etag": "\"263900-YXiey/3Hhr2OVYDVjdLpGtiNQfI\"",
		"mtime": "2026-09-10T17:04:07.944Z",
		"size": 2504960,
		"path": "../public/assets/mc-wa-sqlite-async-DYagSq56.wasm"
	},
	"/assets/pen-line-CLkstaxQ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"10a-FlsbZXInb5MUaJgF5WlAFTFDFAU\"",
		"mtime": "2026-09-10T17:04:07.798Z",
		"size": 266,
		"path": "../public/assets/pen-line-CLkstaxQ.js"
	},
	"/assets/play-BnTspyFT.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"7b-/pnJMBzMemulWpD40YXTUcBl/qY\"",
		"mtime": "2026-09-10T17:04:07.800Z",
		"size": 123,
		"path": "../public/assets/play-BnTspyFT.js"
	},
	"/assets/purify.es-ChwZkWde.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"68bc-bPPRDEosU/Lqj+2Oyi1ue22LViM\"",
		"mtime": "2026-09-10T17:04:07.800Z",
		"size": 26812,
		"path": "../public/assets/purify.es-ChwZkWde.js"
	},
	"/assets/refresh-cw-DKKbaidF.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"135-KpmgZiVjzL/69lxYYWPQsziCz3k\"",
		"mtime": "2026-09-10T17:04:07.802Z",
		"size": 309,
		"path": "../public/assets/refresh-cw-DKKbaidF.js"
	},
	"/assets/ReportBuilder-DuUR-fn0.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1eee-Zt3t3KwRsZkUflIo/7o2wM+uydI\"",
		"mtime": "2026-09-10T17:04:06.879Z",
		"size": 7918,
		"path": "../public/assets/ReportBuilder-DuUR-fn0.js"
	},
	"/assets/Reports-Bk0YkLEL.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2328-56EIDeKtM6Tb4hnFdGlbLyekx64\"",
		"mtime": "2026-09-10T17:04:06.879Z",
		"size": 9e3,
		"path": "../public/assets/Reports-Bk0YkLEL.js"
	},
	"/assets/resource-CUdF0Dyz.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"a46-ftSFRr98wCnJvwztOHE1awhL7As\"",
		"mtime": "2026-09-10T17:04:07.802Z",
		"size": 2630,
		"path": "../public/assets/resource-CUdF0Dyz.js"
	},
	"/assets/RoleSelection-Bo5oruMq.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1090-u7oWm2fqQSRN+lLr8h62IkPB/jw\"",
		"mtime": "2026-09-10T17:04:06.881Z",
		"size": 4240,
		"path": "../public/assets/RoleSelection-Bo5oruMq.js"
	},
	"/assets/rolldown-runtime-hePW80VL.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2cc-fA8td6k29UVF6JoPfhOPkceTK1M\"",
		"mtime": "2026-09-10T17:04:07.802Z",
		"size": 716,
		"path": "../public/assets/rolldown-runtime-hePW80VL.js"
	},
	"/assets/SaisieRapide-DXIEh5v5.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"228-IrtM4yWJ981vJsoi/gGF3/qth/s\"",
		"mtime": "2026-09-10T17:04:06.881Z",
		"size": 552,
		"path": "../public/assets/SaisieRapide-DXIEh5v5.js"
	},
	"/assets/security-CPHDFpdn.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f33-C2Miy5A4omHBoxpqDaOViatt6kc\"",
		"mtime": "2026-09-10T17:04:07.804Z",
		"size": 3891,
		"path": "../public/assets/security-CPHDFpdn.js"
	},
	"/assets/Settings-BvRxALIy.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4064-ON3oLRzTGYRxPuRNmjqlWhc2R/4\"",
		"mtime": "2026-09-10T17:04:06.881Z",
		"size": 16484,
		"path": "../public/assets/Settings-BvRxALIy.js"
	},
	"/assets/shield-XvOMULn6.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"105-3NOLNW/clgOSvcFCm7y0YEm6aFw\"",
		"mtime": "2026-09-10T17:04:07.804Z",
		"size": 261,
		"path": "../public/assets/shield-XvOMULn6.js"
	},
	"/assets/Skeleton-Boo03FH4.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"413-hzINXgqpgDD919C2H+NrpZQSyS4\"",
		"mtime": "2026-09-10T17:04:06.883Z",
		"size": 1043,
		"path": "../public/assets/Skeleton-Boo03FH4.js"
	},
	"/assets/tag-BUl-shMz.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"13b-P+OCe9HsNLIYWeF1rjVhyJtgnYw\"",
		"mtime": "2026-09-10T17:04:07.804Z",
		"size": 315,
		"path": "../public/assets/tag-BUl-shMz.js"
	},
	"/assets/TopHeader-DGULQqm4.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"eaf-+0lqhsuBD6MMIRbfQA5AQajotoI\"",
		"mtime": "2026-09-10T17:04:06.883Z",
		"size": 3759,
		"path": "../public/assets/TopHeader-DGULQqm4.js"
	},
	"/assets/Trace-DJ4NjQB-.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"efb-uAmKSu8yU6e5r1o9q65h2h+9d3I\"",
		"mtime": "2026-09-10T17:04:06.968Z",
		"size": 3835,
		"path": "../public/assets/Trace-DJ4NjQB-.js"
	},
	"/assets/TransactionCard-C5O3kmcm.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"a78-8X56CYs1rnQJO6wKH2K7nOxtNJQ\"",
		"mtime": "2026-09-10T17:04:06.970Z",
		"size": 2680,
		"path": "../public/assets/TransactionCard-C5O3kmcm.js"
	},
	"/assets/TransactionDetail-CyotAmY8.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2496-2qGgr/DQmPSKSJyDT/zPg8Fl1fw\"",
		"mtime": "2026-09-10T17:04:06.970Z",
		"size": 9366,
		"path": "../public/assets/TransactionDetail-CyotAmY8.js"
	},
	"/assets/TransactionEdit-BN8Ed6LL.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1a54-iCHDNSPj/NHJhZq454mIkFjrhCg\"",
		"mtime": "2026-09-10T17:04:06.972Z",
		"size": 6740,
		"path": "../public/assets/TransactionEdit-BN8Ed6LL.js"
	},
	"/assets/TransactionNew-B5NNcNkP.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1a82-qzUMOt0A0rixlxnRvrAirP8RfIU\"",
		"mtime": "2026-09-10T17:04:06.972Z",
		"size": 6786,
		"path": "../public/assets/TransactionNew-B5NNcNkP.js"
	},
	"/assets/TransactionNewGroup-Ca4osWUs.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"187a-jckLT1YJedzsTMGPdo1TXgaOH+8\"",
		"mtime": "2026-09-10T17:04:06.980Z",
		"size": 6266,
		"path": "../public/assets/TransactionNewGroup-Ca4osWUs.js"
	},
	"/assets/trash-2-TeOGsBfE.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"15a-4Rk6pCNA9dKwsixX9sI00zRnZ3s\"",
		"mtime": "2026-09-10T17:04:07.857Z",
		"size": 346,
		"path": "../public/assets/trash-2-TeOGsBfE.js"
	},
	"/assets/trending-down-Cxk3HQYu.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"c4-oGICiyzA73CJdOWB5z30JoFv9EA\"",
		"mtime": "2026-09-10T17:04:07.857Z",
		"size": 196,
		"path": "../public/assets/trending-down-Cxk3HQYu.js"
	},
	"/assets/trending-up-CTsvfhXD.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"c1-qRLntorZ7vRSJ5G9/1Tx0tcrehU\"",
		"mtime": "2026-09-10T17:04:07.859Z",
		"size": 193,
		"path": "../public/assets/trending-up-CTsvfhXD.js"
	},
	"/assets/Tutorial-DgSwGsB-.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"136b1-BUEUBseFDKM+EKA0+Xm2XP/SV6M\"",
		"mtime": "2026-09-10T17:04:06.982Z",
		"size": 79537,
		"path": "../public/assets/Tutorial-DgSwGsB-.js"
	},
	"/assets/user-plus-D5uQUcmD.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"12a-KezD/IBVfA+71x5BMVc+ymGDHNQ\"",
		"mtime": "2026-09-10T17:04:07.859Z",
		"size": 298,
		"path": "../public/assets/user-plus-D5uQUcmD.js"
	},
	"/assets/Versement-BzwZ88Wm.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"17b2-MQB2auJmFXKqveivlsgsAKOcgE8\"",
		"mtime": "2026-09-10T17:04:06.982Z",
		"size": 6066,
		"path": "../public/assets/Versement-BzwZ88Wm.js"
	},
	"/assets/wa-sqlite-async-L_LSrxrb.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f88f-NGMPNASgtNbzZuH6O9+kt/v29/g\"",
		"mtime": "2026-09-10T17:04:07.861Z",
		"size": 63631,
		"path": "../public/assets/wa-sqlite-async-L_LSrxrb.js"
	},
	"/assets/wa-sqlite-BVXfj7bw.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"e9d6-LFag0v/Myx+4L9KqMw5YED3uQZQ\"",
		"mtime": "2026-09-10T17:04:07.859Z",
		"size": 59862,
		"path": "../public/assets/wa-sqlite-BVXfj7bw.js"
	},
	"/assets/wallet-_yZhe9KW.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"333-4yaEoPTnmLBKF8ne+F9DkxLUI8Y\"",
		"mtime": "2026-09-10T17:04:07.861Z",
		"size": 819,
		"path": "../public/assets/wallet-_yZhe9KW.js"
	},
	"/assets/websockets-BrH1W1hC.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1a557-mxpHOqZvkzHe900c1PAg5PC57RM\"",
		"mtime": "2026-09-10T17:04:07.861Z",
		"size": 107863,
		"path": "../public/assets/websockets-BrH1W1hC.js"
	},
	"/assets/websockets-E5bULUr_.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1a62c-rg3+llKpcDkOZD0Mr8foSXIMZf4\"",
		"mtime": "2026-09-10T17:04:08.154Z",
		"size": 108076,
		"path": "../public/assets/websockets-E5bULUr_.js"
	},
	"/assets/x-BWE5bXPW.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"8f-2nYnOgkrEaaech7PzI38qRGlBRg\"",
		"mtime": "2026-09-10T17:04:07.863Z",
		"size": 143,
		"path": "../public/assets/x-BWE5bXPW.js"
	},
	"/assets/worker-DJSXMwe3.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"12df0-e0L59HHmgiflz5cssaAxMwdrPHU\"",
		"mtime": "2026-09-10T17:04:08.261Z",
		"size": 77296,
		"path": "../public/assets/worker-DJSXMwe3.js"
	},
	"/assets/wa-sqlite-CagagB9I.wasm": {
		"type": "application/wasm",
		"etag": "\"112932-PVZvyjEpDlc7C+RsG8vVBaXaZyQ\"",
		"mtime": "2026-09-10T17:04:08.142Z",
		"size": 1124658,
		"path": "../public/assets/wa-sqlite-CagagB9I.wasm"
	},
	"/assets/wa-sqlite-async-DCIP8kAx.wasm": {
		"type": "application/wasm",
		"etag": "\"22d125-my2aJEczirWasFS1osydDIkHGgk\"",
		"mtime": "2026-09-10T17:04:08.146Z",
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
