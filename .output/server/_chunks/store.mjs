import { createHash } from "node:crypto";
//#region server/store.ts
function hashPassword(password) {
	return createHash("sha256").update(password).digest("hex");
}
var ORG = {
	id: "org-1",
	name: "Église MFE-JC Centrale",
	type: "Eglise",
	accentColor: "#FF6B00"
};
var adminUser = {
	id: "user-1",
	email: "admin@mfe-jc.org",
	hashedPassword: hashPassword("lumina-admin-2026"),
	firstName: "Pasteur",
	lastName: "Jean",
	role: "ADMIN",
	org: ORG
};
var USERS = [adminUser];
var CATEGORIES = [
	{
		id: "cat-1",
		key: "dime",
		labelFr: "Dîme",
		type: "INCOME",
		orgId: "org-1"
	},
	{
		id: "cat-2",
		key: "offrande",
		labelFr: "Offrande",
		type: "INCOME",
		orgId: "org-1"
	},
	{
		id: "cat-3",
		key: "offrande_mission",
		labelFr: "Offrande Mission",
		type: "INCOME",
		orgId: "org-1"
	},
	{
		id: "cat-4",
		key: "don",
		labelFr: "Don",
		type: "INCOME",
		orgId: "org-1"
	},
	{
		id: "cat-5",
		key: "salaire_pasteur",
		labelFr: "Salaire Pasteur",
		type: "EXPENSE",
		orgId: "org-1"
	},
	{
		id: "cat-6",
		key: "frais_fonctionnement",
		labelFr: "Frais de Fonctionnement",
		type: "EXPENSE",
		orgId: "org-1"
	},
	{
		id: "cat-7",
		key: "mission",
		labelFr: "Mission",
		type: "EXPENSE",
		orgId: "org-1"
	},
	{
		id: "cat-8",
		key: "entretien",
		labelFr: "Entretien",
		type: "EXPENSE",
		orgId: "org-1"
	},
	{
		id: "cat-9",
		key: "aumone",
		labelFr: "Aumône",
		type: "EXPENSE",
		orgId: "org-1"
	}
];
var ORG_UNITS = [
	{
		id: "ou-1",
		name: "Diacres",
		type: "groupe",
		orgId: "org-1"
	},
	{
		id: "ou-2",
		name: "Jeunesse",
		type: "groupe",
		orgId: "org-1"
	},
	{
		id: "ou-3",
		name: "Dames",
		type: "groupe",
		orgId: "org-1"
	},
	{
		id: "ou-4",
		name: "Messieurs",
		type: "groupe",
		orgId: "org-1"
	},
	{
		id: "ou-5",
		name: "Chorale",
		type: "groupe",
		orgId: "org-1"
	}
];
var now = /* @__PURE__ */ new Date();
var daysAgo = (n) => {
	const d = new Date(now);
	d.setDate(d.getDate() - n);
	return d.toISOString().split("T")[0];
};
var TRANSACTIONS = [
	{
		id: "tx-1",
		orgId: "org-1",
		type: "INCOME",
		amount: 5e6,
		description: "Dîme dimanche",
		date: daysAgo(6),
		status: "APPROVED",
		createdAt: (/* @__PURE__ */ new Date(now.getTime() - 6048e5)).toISOString(),
		updatedAt: (/* @__PURE__ */ new Date(now.getTime() - 5184e5)).toISOString(),
		createdById: "user-1",
		approvedById: "user-1",
		approvedAt: (/* @__PURE__ */ new Date(now.getTime() - 5184e5)).toISOString(),
		categoryId: "cat-1",
		orgUnitId: null,
		compensatesFor: null,
		comment: null,
		version: 1,
		category: CATEGORIES[0],
		creator: adminUser,
		approver: adminUser
	},
	{
		id: "tx-2",
		orgId: "org-1",
		type: "INCOME",
		amount: 15e5,
		description: "Offrande oeuvre sociale",
		date: daysAgo(6),
		status: "APPROVED",
		createdAt: (/* @__PURE__ */ new Date(now.getTime() - 6048e5)).toISOString(),
		updatedAt: (/* @__PURE__ */ new Date(now.getTime() - 5184e5)).toISOString(),
		createdById: "user-1",
		approvedById: "user-1",
		approvedAt: (/* @__PURE__ */ new Date(now.getTime() - 5184e5)).toISOString(),
		categoryId: "cat-2",
		orgUnitId: null,
		compensatesFor: null,
		comment: null,
		version: 1,
		category: CATEGORIES[1],
		creator: adminUser,
		approver: adminUser
	},
	{
		id: "tx-3",
		orgId: "org-1",
		type: "EXPENSE",
		amount: 25e4,
		description: "Frais électricité église",
		date: daysAgo(8),
		status: "PENDING",
		createdAt: (/* @__PURE__ */ new Date(now.getTime() - 6912e5)).toISOString(),
		updatedAt: (/* @__PURE__ */ new Date(now.getTime() - 6912e5)).toISOString(),
		createdById: "user-1",
		approvedById: null,
		approvedAt: null,
		categoryId: "cat-6",
		orgUnitId: null,
		compensatesFor: null,
		comment: null,
		version: 1,
		category: CATEGORIES[5],
		creator: adminUser
	},
	{
		id: "tx-4",
		orgId: "org-1",
		type: "INCOME",
		amount: 75e4,
		description: "Offrande mission",
		date: daysAgo(3),
		status: "DRAFT",
		createdAt: (/* @__PURE__ */ new Date(now.getTime() - 2592e5)).toISOString(),
		updatedAt: (/* @__PURE__ */ new Date(now.getTime() - 2592e5)).toISOString(),
		createdById: "user-1",
		approvedById: null,
		approvedAt: null,
		categoryId: "cat-3",
		orgUnitId: null,
		compensatesFor: null,
		comment: null,
		version: 1,
		category: CATEGORIES[2],
		creator: adminUser
	},
	{
		id: "tx-5",
		orgId: "org-1",
		type: "EXPENSE",
		amount: 1e5,
		description: "Aumône aux nécessiteux",
		date: daysAgo(10),
		status: "APPROVED",
		createdAt: (/* @__PURE__ */ new Date(now.getTime() - 864e6)).toISOString(),
		updatedAt: (/* @__PURE__ */ new Date(now.getTime() - 7776e5)).toISOString(),
		createdById: "user-1",
		approvedById: "user-1",
		approvedAt: (/* @__PURE__ */ new Date(now.getTime() - 7776e5)).toISOString(),
		categoryId: "cat-9",
		orgUnitId: null,
		compensatesFor: null,
		comment: null,
		version: 1,
		category: CATEGORIES[8],
		creator: adminUser,
		approver: adminUser
	}
];
var AUDIT_ENTRIES = [
	{
		id: "audit-1",
		orgId: "org-1",
		transactionId: "tx-1",
		userId: "user-1",
		action: "CREATED",
		entityType: "transaction",
		entityId: "tx-1",
		comment: null,
		createdAt: (/* @__PURE__ */ new Date(now.getTime() - 6048e5)).toISOString(),
		user: adminUser
	},
	{
		id: "audit-2",
		orgId: "org-1",
		transactionId: "tx-1",
		userId: "user-1",
		action: "APPROVED",
		entityType: "transaction",
		entityId: "tx-1",
		comment: null,
		createdAt: (/* @__PURE__ */ new Date(now.getTime() - 5184e5)).toISOString(),
		user: adminUser
	},
	{
		id: "audit-3",
		orgId: "org-1",
		transactionId: "tx-3",
		userId: "user-1",
		action: "CREATED",
		entityType: "transaction",
		entityId: "tx-3",
		comment: null,
		createdAt: (/* @__PURE__ */ new Date(now.getTime() - 6912e5)).toISOString(),
		user: adminUser
	}
];
function findUserByEmail(email) {
	return USERS.find((u) => u.email === email);
}
function createUserRecord(firstName, lastName, email, password) {
	const user = {
		id: `user-${Date.now()}`,
		email,
		hashedPassword: hashPassword(password),
		firstName,
		lastName,
		role: "TREASURER",
		org: ORG
	};
	USERS.push(user);
	return user;
}
var store = {
	isAuthenticated: true,
	user: {
		id: "user-1",
		email: "admin@mfe-jc.org",
		firstName: "Pasteur",
		lastName: "Jean",
		role: "ADMIN",
		org: ORG
	},
	transactions: TRANSACTIONS,
	categories: CATEGORIES,
	orgUnits: ORG_UNITS,
	auditEntries: AUDIT_ENTRIES,
	events: [],
	orgConfig: {
		name: ORG.name,
		logoUrl: void 0
	}
};
//#endregion
export { findUserByEmail as n, store as r, createUserRecord as t };
