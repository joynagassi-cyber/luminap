import { createHmac, timingSafeEqual } from "crypto";
//#region node_modules/.pnpm/@autonoma-ai+sdk@0.2.9_zod@3.25.76/node_modules/@autonoma-ai/sdk/dist/index.js
function signBody(body, secret) {
	return createHmac("sha256", secret).update(body).digest("hex");
}
function verifySignature(body, signature, secret) {
	const expected = signBody(body, secret);
	if (expected.length !== signature.length) return false;
	return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
function signRefs(payload, secret) {
	const header = base64url({
		alg: "HS256",
		typ: "REFS"
	});
	const body = base64url(payload);
	return `${header}.${body}.${hmac(`${header}.${body}`, secret)}`;
}
function verifyRefs(token, secret) {
	const parts = token.split(".");
	if (parts.length !== 3) throw new Error("malformed token");
	const [header, body, signature] = parts;
	const expected = hmac(`${header}.${body}`, secret);
	const expectedBuf = Buffer.from(expected);
	const signatureBuf = Buffer.from(signature);
	if (expectedBuf.length !== signatureBuf.length || !timingSafeEqual(expectedBuf, signatureBuf)) throw new Error("signature mismatch");
	return JSON.parse(Buffer.from(body, "base64url").toString());
}
function base64url(obj) {
	return Buffer.from(JSON.stringify(obj, (_key, value) => typeof value === "bigint" ? value.toString() : value)).toString("base64url");
}
function hmac(data, secret) {
	return createHmac("sha256", secret).update(data).digest("base64url");
}
var AutonomaError = class extends Error {
	constructor(message, code, status) {
		super(message);
		this.code = code;
		this.status = status;
		this.name = "AutonomaError";
	}
};
var Errors = {
	unknownAction(action) {
		return new AutonomaError(`Unknown action: ${action}`, "UNKNOWN_ACTION", 400);
	},
	unknownEnvironment(name) {
		return new AutonomaError(`Unknown environment: ${name}`, "UNKNOWN_ENVIRONMENT", 400);
	},
	invalidSignature() {
		return new AutonomaError("Invalid HMAC signature", "INVALID_SIGNATURE", 401);
	},
	invalidRefsToken(reason) {
		return new AutonomaError(`Invalid refs token: ${reason}`, "INVALID_REFS_TOKEN", 403);
	},
	/** @deprecated The SDK no longer gates on production; this is never thrown. */
	productionBlocked(detail) {
		return new AutonomaError(`Environment factory is disabled${detail != null ? `. ${detail}` : ""}`, "PRODUCTION_BLOCKED", 404);
	},
	invalidBody(reason) {
		return new AutonomaError(`Invalid request body: ${reason}`, "INVALID_BODY", 400);
	}
};
var RESERVED_KEYS = /* @__PURE__ */ new Set(["_alias", "_ref"]);
function collectRefs(value, out) {
	if (value && typeof value === "object" && !Array.isArray(value)) {
		const obj = value;
		const ref = obj._ref;
		if (typeof ref === "string") {
			out.push(ref);
			return;
		}
		for (const v of Object.values(obj)) collectRefs(v, out);
		return;
	}
	if (Array.isArray(value)) for (const v of value) collectRefs(v, out);
}
function resolveRefs(value, aliasToTempId) {
	if (value && typeof value === "object" && !Array.isArray(value)) {
		const obj = value;
		const ref = obj._ref;
		if (typeof ref === "string") {
			const real = aliasToTempId[ref];
			return real !== void 0 ? real : value;
		}
		const out = {};
		for (const [k, v] of Object.entries(obj)) out[k] = resolveRefs(v, aliasToTempId);
		return out;
	}
	if (Array.isArray(value)) return value.map((v) => resolveRefs(v, aliasToTempId));
	return value;
}
function resolvePayloadTree(create) {
	if (!create || typeof create !== "object" || Array.isArray(create)) throw Errors.invalidBody("`create` must be an object keyed by model name");
	const rawEntries = [];
	let counter = 0;
	const aliases = {};
	const aliasOwnerModel = {};
	for (const [model, entities] of Object.entries(create)) {
		if (!Array.isArray(entities)) throw Errors.invalidBody(`\`create.${model}\` must be a list of entity objects, got ${typeof entities}`);
		for (const entity of entities) {
			if (!entity || typeof entity !== "object" || Array.isArray(entity)) throw Errors.invalidBody(`\`create.${model}\` entries must be objects, got ${Array.isArray(entity) ? "array" : typeof entity}`);
			const tempId = `__temp_${model}_${counter++}`;
			const obj = entity;
			const aliasRaw = obj._alias;
			let alias = null;
			if (typeof aliasRaw === "string") {
				if (aliases[aliasRaw] !== void 0) throw Errors.invalidBody(`duplicate _alias "${aliasRaw}"`);
				aliases[aliasRaw] = tempId;
				aliasOwnerModel[aliasRaw] = model;
				alias = aliasRaw;
			} else if (aliasRaw !== void 0 && aliasRaw !== null) throw Errors.invalidBody("\"_alias\" must be a string");
			rawEntries.push({
				model,
				tempId,
				entity: obj,
				alias
			});
		}
	}
	const depsByTempId = {};
	const fieldsByTempId = {};
	const modelByTempId = {};
	for (const { model, tempId, entity } of rawEntries) {
		const deps = [];
		const cleaned = {};
		for (const [key, value] of Object.entries(entity)) {
			if (RESERVED_KEYS.has(key)) continue;
			collectRefs(value, deps);
			cleaned[key] = resolveRefs(value, aliases);
		}
		const unknowns = deps.filter((a) => aliases[a] === void 0);
		if (unknowns.length > 0) {
			const sorted = Array.from(new Set(unknowns)).sort();
			throw Errors.invalidBody(`\`create.${model}\` references unknown alias(es): ${sorted.join(", ")}`);
		}
		depsByTempId[tempId] = deps;
		fieldsByTempId[tempId] = cleaned;
		modelByTempId[tempId] = model;
	}
	const inDegree = {};
	for (const { tempId } of rawEntries) inDegree[tempId] = 0;
	const edges = {};
	for (const [tempId, deps] of Object.entries(depsByTempId)) {
		const seen = /* @__PURE__ */ new Set();
		for (const depAlias of deps) {
			const depTempId = aliases[depAlias];
			if (depTempId === tempId || seen.has(depTempId)) continue;
			seen.add(depTempId);
			(edges[depTempId] ??= []).push(tempId);
			inDegree[tempId] = (inDegree[tempId] ?? 0) + 1;
		}
	}
	const payloadOrder = {};
	rawEntries.forEach((e, i) => {
		payloadOrder[e.tempId] = i;
	});
	const ready = Object.keys(inDegree).filter((t) => inDegree[t] === 0).sort((a, b) => payloadOrder[a] - payloadOrder[b]);
	const sortedTempIds = [];
	while (ready.length > 0) {
		const tid = ready.shift();
		sortedTempIds.push(tid);
		for (const next of edges[tid] ?? []) {
			inDegree[next] = (inDegree[next] ?? 0) - 1;
			if (inDegree[next] === 0) ready.push(next);
		}
		ready.sort((a, b) => payloadOrder[a] - payloadOrder[b]);
	}
	if (sortedTempIds.length !== rawEntries.length) {
		const cycleModels = Object.entries(inDegree).filter(([, deg]) => deg > 0).map(([tid]) => tid).sort((a, b) => payloadOrder[a] - payloadOrder[b]).map((t) => modelByTempId[t]).join(", ");
		throw Errors.invalidBody(`cycle detected in _alias/_ref graph: ${cycleModels}`);
	}
	const aliasDependencies = {};
	for (const [alias, tempId] of Object.entries(aliases)) aliasDependencies[alias] = [...depsByTempId[tempId] ?? []];
	return {
		ops: sortedTempIds.map((tid) => ({
			model: modelByTempId[tid],
			fields: fieldsByTempId[tid],
			tempId: tid
		})),
		aliases,
		aliasOwnerModel,
		aliasDependencies
	};
}
function computeTeardownOrder(refs, aliasDependencies, aliasOwnerModel) {
	const models = Object.keys(refs);
	if (!aliasDependencies || !aliasOwnerModel || Object.keys(aliasDependencies).length === 0) return [...models].reverse();
	const modelDeps = {};
	for (const m of models) modelDeps[m] = /* @__PURE__ */ new Set();
	for (const [alias, deps] of Object.entries(aliasDependencies)) {
		const owner = aliasOwnerModel[alias];
		if (!owner || !(owner in modelDeps)) continue;
		for (const depAlias of deps) {
			const depModel = aliasOwnerModel[depAlias];
			if (!depModel || depModel === owner) continue;
			if (depModel in modelDeps) modelDeps[owner].add(depModel);
		}
	}
	const inDegree = {};
	for (const m of models) inDegree[m] = 0;
	const adj = {};
	for (const [owner, deps] of Object.entries(modelDeps)) for (const depModel of deps) {
		(adj[depModel] ??= []).push(owner);
		inDegree[owner] = (inDegree[owner] ?? 0) + 1;
	}
	const payloadOrder = {};
	models.forEach((m, i) => {
		payloadOrder[m] = i;
	});
	const ready = models.filter((m) => inDegree[m] === 0).sort((a, b) => payloadOrder[a] - payloadOrder[b]);
	const upOrder = [];
	while (ready.length > 0) {
		const m = ready.shift();
		upOrder.push(m);
		for (const next of adj[m] ?? []) {
			inDegree[next] = (inDegree[next] ?? 0) - 1;
			if (inDegree[next] === 0) ready.push(next);
		}
		ready.sort((a, b) => payloadOrder[a] - payloadOrder[b]);
	}
	if (upOrder.length !== models.length) return [...models].reverse();
	return [...upOrder].reverse();
}
function fieldTypeFromZod(schema) {
	return classifyZod(unwrap(schema));
}
function getDef(schema) {
	const def = schema._def;
	return def && typeof def === "object" ? def : {};
}
function unwrap(schema) {
	let current = schema;
	for (let i = 0; i < 16; i++) {
		const wrapped = wrappedSchemaFrom(getDef(current));
		if (!wrapped) return current;
		current = wrapped;
	}
	return current;
}
function wrappedSchemaFrom(def) {
	const candidate = def.innerType ?? def.schema;
	if (!candidate) return null;
	const tn = def.typeName;
	if (tn === "ZodOptional" || tn === "ZodNullable" || tn === "ZodDefault" || tn === "ZodCatch" || tn === "ZodBranded" || tn === "ZodReadonly" || tn === "ZodEffects" || tn === "ZodPipeline" || tn === "ZodLazy" || def.type === "optional" || def.type === "nullable" || def.type === "default" || def.type === "catch" || def.type === "readonly" || def.type === "pipe" || def.type === "lazy") return candidate;
	return null;
}
function classifyZod(schema) {
	const def = getDef(schema);
	const name = (def.typeName ?? def.type ?? "").toString();
	if (name === "ZodString" || name === "string") return "string";
	if (name === "ZodNumber" || name === "number") return "number";
	if (name === "ZodBigInt" || name === "bigint") return "integer";
	if (name === "ZodBoolean" || name === "boolean") return "boolean";
	if (name === "ZodDate" || name === "date") return "timestamp";
	if (name === "ZodEnum" || name === "enum") return "string";
	if (name === "ZodNativeEnum" || name === "nativeEnum") return "string";
	if (name === "ZodLiteral" || name === "literal") return "string";
	if (name === "ZodArray" || name === "array" || name === "ZodObject" || name === "object" || name === "ZodRecord" || name === "record" || name === "ZodTuple" || name === "tuple" || name === "ZodMap" || name === "map" || name === "ZodSet" || name === "set" || name === "ZodAny" || name === "any" || name === "ZodUnknown" || name === "unknown") return "json";
	return "string";
}
function isOptional(schema) {
	const def = getDef(schema);
	const tn = def.typeName ?? def.type;
	if (tn === "ZodOptional" || tn === "optional") return true;
	if (tn === "ZodDefault" || tn === "default") return true;
	if (tn === "ZodNullable" || tn === "nullable") return false;
	const inner = wrappedSchemaFrom(def);
	if (inner) return isOptional(inner);
	return false;
}
function hasDefault(schema) {
	const def = getDef(schema);
	const tn = def.typeName ?? def.type;
	if (tn === "ZodDefault" || tn === "default") return true;
	const inner = wrappedSchemaFrom(def);
	if (inner) return hasDefault(inner);
	return false;
}
function camelToSnake(name) {
	let out = "";
	for (let i = 0; i < name.length; i++) {
		const ch = name.charAt(i);
		if (ch >= "A" && ch <= "Z" && i > 0) {
			const prev = name.charAt(i - 1);
			if (!(prev >= "A" && prev <= "Z")) out += "_";
		}
		out += ch.toLowerCase();
	}
	return out;
}
function objectShape(schema) {
	const def = getDef(schema);
	const tn = def.typeName ?? def.type;
	if (tn !== "ZodObject" && tn !== "object") return null;
	const shape = def.shape;
	if (typeof shape === "function") try {
		const evaluated = shape();
		if (evaluated && typeof evaluated === "object") return evaluated;
	} catch {
		return null;
	}
	if (shape && typeof shape === "object") return shape;
	return null;
}
function modelToFields(inputSchema) {
	const fields = [{
		name: "id",
		type: "string",
		isRequired: false,
		isId: true,
		hasDefault: true
	}];
	const shape = objectShape(unwrap(inputSchema));
	if (!shape) return fields;
	for (const [name, value] of Object.entries(shape)) {
		const optional = isOptional(value);
		const defaulted = hasDefault(value);
		fields.push({
			name,
			type: fieldTypeFromZod(value),
			isRequired: !optional && !defaulted,
			isId: false,
			hasDefault: defaulted
		});
	}
	return fields;
}
function buildSchemaFromFactories(factories, scopeField) {
	const models = [];
	for (const [entity, factory] of Object.entries(factories)) {
		if (!factory.inputSchema) throw new Error(`Factory "${entity}" has no inputSchema. Every factory must declare a Zod schema in defineFactory({ ..., inputSchema }).`);
		models.push({
			name: entity,
			tableName: camelToSnake(entity),
			fields: modelToFields(factory.inputSchema)
		});
	}
	return {
		models,
		edges: [],
		relations: [],
		scopeField
	};
}
function schemaToWire(schema) {
	return {
		models: schema.models.map((m) => ({
			name: m.name,
			tableName: m.tableName,
			fields: m.fields.map((f) => ({
				name: f.name,
				type: f.type,
				isRequired: f.isRequired,
				isId: f.isId,
				hasDefault: f.hasDefault
			}))
		})),
		edges: schema.edges.map((e) => ({
			from: e.from,
			to: e.to,
			localField: e.localField,
			foreignField: e.foreignField,
			nullable: e.nullable
		})),
		relations: schema.relations.map((r) => ({
			parentModel: r.parentModel,
			childModel: r.childModel,
			parentField: r.parentField,
			childField: r.childField
		})),
		scopeField: schema.scopeField
	};
}
var TOKEN_RE = /\{\{\s*([^{}]+?)\s*\}\}/g;
var CYCLE_RE = /^cycle\((.*)\)$/;
function resolveTokens(value, testRunId, index) {
	if (typeof value === "string") return value.replace(TOKEN_RE, (_match, rawToken) => {
		const token = rawToken.trim();
		if (token === "testRunId") return testRunId;
		if (token === "index") return String(index);
		const cycle = CYCLE_RE.exec(token);
		if (cycle) {
			const parts = cycle[1].split(",").map((p) => p.trim().replace(/^['"]|['"]$/g, ""));
			return parts.length ? parts[index % parts.length] : "";
		}
		throw new AutonomaError(`Unresolved token: {{${token}}}`, "UNRESOLVED_TOKEN", 400);
	});
	if (Array.isArray(value)) return value.map((v) => resolveTokens(v, testRunId, index));
	if (value && typeof value === "object") {
		const out = {};
		for (const [k, v] of Object.entries(value)) out[k] = resolveTokens(v, testRunId, index);
		return out;
	}
	return value;
}
function buildSdkMeta(config) {
	return {
		version: "1.0",
		sdk: {
			language: "typescript",
			orm: config.sdk?.orm ?? "unknown",
			server: config.sdk?.server ?? "unknown"
		}
	};
}
var warnedDeprecatedAllowProduction = false;
async function handleRequest(config, req) {
	try {
		if (config.allowProduction !== void 0 && !warnedDeprecatedAllowProduction) {
			warnedDeprecatedAllowProduction = true;
			console.warn("[autonoma] allowProduction is deprecated and ignored - the endpoint is always enabled");
		}
		if (config.sharedSecret === config.signingSecret) throw new AutonomaError("sharedSecret and signingSecret must be different. The shared secret is known by Autonoma; the signing secret must be private.", "SAME_SECRETS", 500);
		const signature = req.headers["x-signature"] ?? req.headers["X-Signature"] ?? "";
		if (!verifySignature(req.body, signature, config.sharedSecret)) throw Errors.invalidSignature();
		let body;
		try {
			body = JSON.parse(req.body);
		} catch {
			throw Errors.invalidBody("invalid JSON");
		}
		const action = body.action;
		if (!action) throw Errors.invalidBody("missing action. expected one of \"discover\", \"up\" or \"down\"");
		switch (action) {
			case "discover": return await handleDiscover(config);
			case "up": return await handleUp(config, body);
			case "down": return await handleDown(config, body);
			default: throw Errors.unknownAction(action);
		}
	} catch (err) {
		if (err instanceof AutonomaError) return {
			status: err.status,
			body: {
				error: err.message,
				code: err.code
			}
		};
		return {
			status: 500,
			body: {
				error: err instanceof Error ? err.message : "Internal error",
				code: "INTERNAL_ERROR"
			}
		};
	}
}
async function handleDiscover(config) {
	const schema = buildSchemaFromFactories(config.factories ?? {}, config.scopeField);
	return {
		status: 200,
		body: {
			...buildSdkMeta(config),
			schema: schemaToWire(schema)
		}
	};
}
async function handleUp(config, body) {
	const create = body.create;
	if (!create) throw Errors.invalidBody("missing \"create\" in request body");
	const testRunId = body.testRunId ?? randomUUID();
	const factories = config.factories ?? {};
	if (Object.keys(factories).length === 0) throw Errors.invalidBody("no factories registered — every model in `create` must have a factory.");
	const tree = resolvePayloadTree(create);
	const refs = {};
	const idMap = /* @__PURE__ */ new Map();
	const modelIndex = {};
	for (const op of tree.ops) {
		const model = op.model;
		const factory = factories[model];
		if (!factory) throw Errors.invalidBody(`no factory registered for model "${model}". Register one with \`defineFactory(...)\` and add it to HandlerConfig.factories.`);
		const idx = modelIndex[model] ?? 0;
		modelIndex[model] = idx + 1;
		const swapped = swapTempIds(resolveTokens(op.fields, testRunId, idx), idMap);
		const parsed = factory.inputSchema.safeParse(swapped);
		if (!parsed.success) throw new AutonomaError(`Invalid input for "${model}": ${parsed.error.issues.map((i) => `${i.path.join(".") || "<root>"}: ${i.message}`).join("; ")}`, "INTERNAL_ERROR", 500);
		const ctx = {
			refs,
			scenarioName: testRunId,
			testRunId
		};
		const record = normaliseRecord(await factory.create(parsed.data, ctx));
		if (!record || record.id == null) throw new AutonomaError(`Factory for "${model}" must return a record with "id"`, "FACTORY_MISSING_PK", 500);
		(refs[model] ??= []).push(record);
		idMap.set(op.tempId, record.id);
	}
	const authUser = findFirstUser(refs);
	const scopeValue = detectScopeValue(refs, config.scopeField) ?? testRunId;
	let auth = await config.auth(authUser, {
		scopeValue,
		refs
	});
	if (config.afterUp) {
		const hookCtx = {
			scenarioName: scopeValue,
			refs
		};
		auth = await config.afterUp(hookCtx, auth);
	}
	const refsToken = signRefs({
		refs,
		testRunId: scopeValue,
		environment: "",
		aliasDependencies: tree.aliasDependencies,
		aliasOwnerModel: tree.aliasOwnerModel
	}, config.signingSecret);
	return {
		status: 200,
		body: {
			...buildSdkMeta(config),
			auth,
			refs,
			refsToken
		}
	};
}
async function handleDown(config, body) {
	const refsToken = body.refsToken;
	if (!refsToken) throw Errors.invalidBody("missing refsToken");
	let payload;
	try {
		payload = verifyRefs(refsToken, config.signingSecret);
	} catch (err) {
		const message = err instanceof Error ? err.message : "invalid token";
		throw Errors.invalidRefsToken(message);
	}
	const refs = payload.refs ?? {};
	const testRunId = payload.testRunId ?? "";
	if (config.beforeDown) {
		const hookCtx = {
			scenarioName: testRunId,
			refs
		};
		await config.beforeDown(hookCtx);
	}
	const factories = config.factories ?? {};
	const teardownOrder = computeTeardownOrder(refs, payload.aliasDependencies, payload.aliasOwnerModel);
	for (const model of teardownOrder) {
		const factory = factories[model];
		if (!factory || !factory.teardown) continue;
		const records = refs[model] ?? [];
		const ctx = {
			refs,
			scenarioName: testRunId,
			testRunId
		};
		for (const record of [...records].reverse()) {
			let teardownInput = record;
			if (factory.refSchema) {
				const parsed = factory.refSchema.safeParse(record);
				if (!parsed.success) throw new AutonomaError(`Invalid teardown record for "${model}": ${parsed.error.issues.map((i) => `${i.path.join(".") || "<root>"}: ${i.message}`).join("; ")}`, "INTERNAL_ERROR", 500);
				teardownInput = parsed.data;
			}
			await factory.teardown(teardownInput, ctx);
		}
	}
	return {
		status: 200,
		body: {
			...buildSdkMeta(config),
			ok: true
		}
	};
}
function swapTempIds(value, idMap) {
	if (typeof value === "string" && value.startsWith("__temp_")) return idMap.get(value) ?? value;
	if (Array.isArray(value)) return value.map((v) => swapTempIds(v, idMap));
	if (value && typeof value === "object") {
		const out = {};
		for (const [k, v] of Object.entries(value)) out[k] = swapTempIds(v, idMap);
		return out;
	}
	return value;
}
function normaliseRecord(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	return value;
}
function findFirstUser(refs) {
	for (const [model, records] of Object.entries(refs)) {
		const normalized = model.toLowerCase();
		if ((normalized === "user" || normalized === "users") && records.length > 0) return records[0];
	}
	return null;
}
function detectScopeValue(refs, scopeField) {
	const scopeNormalized = scopeField.replace(/_/g, "").toLowerCase();
	for (const records of Object.values(refs)) for (const record of records) for (const [key, value] of Object.entries(record)) if (key.replace(/_/g, "").toLowerCase() === scopeNormalized && typeof value === "string") return value;
	return null;
}
function randomUUID() {
	if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
	return `run-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
function defineFactory(definition) {
	if (typeof definition.create !== "function") throw new Error("Factory definition must include a \"create\" function");
	if (definition.teardown !== void 0 && typeof definition.teardown !== "function") throw new Error("Factory \"teardown\" must be a function if provided");
	if (!definition.inputSchema || !isZodSchema(definition.inputSchema)) throw new Error("Factory \"inputSchema\" must be a Zod schema (e.g. z.object({...})). Discover relies on it to describe the model to the dashboard.");
	if (definition.refSchema !== void 0 && !isZodSchema(definition.refSchema)) throw new Error("Factory \"refSchema\" must be a Zod schema if provided");
	return definition;
}
function isZodSchema(value) {
	if (!value || typeof value !== "object") return false;
	const candidate = value;
	return typeof candidate.parse === "function" && typeof candidate.safeParse === "function";
}
//#endregion
export { handleRequest as n, defineFactory as t };
