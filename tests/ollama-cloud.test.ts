import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, afterEach, describe, it } from "node:test";
import { normalizeContext, Type, type AssistantMessageEvent, type Context } from "@earendil-works/pi-ai";
import { AUTH_PROVIDER_KEYS } from "../src/core/auth-keys.ts";

// Own scratch files and synthetic keys only; no accounts or real inference.
const originalEnv = process.env;
const originalFetch = globalThis.fetch;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "lh-ollama-"));
process.env = { ...originalEnv, NODE_ENV: "test", LH_AUTH_FILE: path.join(tmp, "auth.json"), LH_DATA_DIR: tmp };
for (const { envVar } of AUTH_PROVIDER_KEYS) delete process.env[envVar];
delete process.env.LH_IGNORE_ENV_KEYS;
globalThis.fetch = async () => { throw new Error("Unexpected network request"); };
const { saveKey, deleteKey, providerKeyList, keyStatuses, providerKeyPresent } = await import("../src/server/keys.ts");
const { modelCatalog, validateModelsSettings, validateChatSettings, clampModelsLevels, catalogContextLimits } = await import("../src/server/model-catalog.ts");
const { piEngineForSpec, piModels } = await import("../src/agent/models.ts");
const provider = "ollama-cloud";
const deepseek = "deepseek-v4.1-flash";
const glm = "glm-5.3-flash";
const context: Context = { systemPrompt: "Help the learner.", messages: [{ role: "user", content: "Hello", timestamp: 1 }] };

function sse(chunks: unknown[]) {
	return new Response(chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join("") + "data: [DONE]\n\n", { headers: { "content-type": "text/event-stream" } });
}
function chunk(delta: unknown, finish_reason: string | null = null) {
	return { id: "offline", object: "chat.completion.chunk", choices: [{ index: 0, delta, finish_reason }] };
}
function answer() {
	return sse([chunk({ content: "Hello learner" }), chunk({}, "stop"), { choices: [], usage: { prompt_tokens: 20, completion_tokens: 5, total_tokens: 25, prompt_tokens_details: { cached_tokens: 4 } } }]);
}
function configured(id = deepseek, thinkingLevel: "off" | "low" | "high" | "max" = "high") {
	assert.ok(saveKey("OLLAMA_API_KEY", "synthetic-ollama-key-1234").ok);
	return piEngineForSpec({ provider, id, thinkingLevel });
}

afterEach(() => { deleteKey("OLLAMA_API_KEY"); globalThis.fetch = async () => { throw new Error("Unexpected network request"); }; });
after(() => { process.env = originalEnv; globalThis.fetch = originalFetch; fs.rmSync(tmp, { recursive: true, force: true }); });

describe("Ollama Cloud", { concurrency: false }, () => {
	it("uses the existing key form and only exposes its curated catalog while keyed", () => {
		assert.deepEqual(providerKeyList().find((p) => p.id === provider), { id: provider, envVar: "OLLAMA_API_KEY", label: "Ollama Cloud" });
		assert.ok(AUTH_PROVIDER_KEYS.some((p) => p.id === provider));
		const before = modelCatalog();
		assert.equal(providerKeyPresent(provider), false);
		assert.equal(before.providers.find((p) => p.id === provider)?.keyPresent, false);
		assert.ok(!before.models.some((m) => m.provider === provider));
		assert.equal(saveKey("OLLAMA_API_KEY", "bad paste").ok, false);
		const key = "synthetic-ollama-key-1234";
		assert.ok(saveKey("OLLAMA_API_KEY", key).ok);
		const catalog = modelCatalog();
		assert.equal(providerKeyPresent(provider), true);
		assert.deepEqual(catalog.models.filter((m) => m.provider === provider).map((m) => m.id), [deepseek, glm]);
		for (const model of catalog.models.filter((m) => m.provider === provider)) {
			assert.deepEqual(model.input, ["text", "image"]);
			assert.equal(model.contextWindow, 1_048_576);
			assert.equal(model.maxTokens, 32_768);
			assert.equal(catalogContextLimits().get(`${provider}:${model.id}`), model.contextWindow);
		}
		assert.deepEqual(catalog.slots, before.slots, "saving a key does not select or replace any model slot");
		assert.ok(!JSON.stringify({ catalog, keys: keyStatuses() }).includes(key));
		assert.equal(fs.statSync(path.join(tmp, "auth.json")).mode & 0o777, 0o600);
		deleteKey("OLLAMA_API_KEY");
		assert.ok(!modelCatalog().models.some((m) => m.provider === provider));
	});

	it("accepts explicit model selections for all slots, clamps thinking honestly, and rejects unknown ids", () => {
		configured();
		const settings = { strong: { model: { provider, id: deepseek }, thinkingLevel: "off" as const }, cheap: { model: { provider, id: glm }, thinkingLevel: "off" as const }, vision: { model: { provider, id: glm } } };
		assert.deepEqual(validateModelsSettings(settings), { ok: true });
		assert.deepEqual(validateChatSettings({ model: { provider, id: deepseek } }), { ok: true });
		assert.equal(clampModelsLevels(settings).strong?.thinkingLevel, "off");
		assert.equal(clampModelsLevels(settings).cheap?.thinkingLevel, "low");
		assert.equal(validateChatSettings({ model: { provider, id: "nonexistent" } }).ok, false);
		assert.throws(() => piEngineForSpec({ provider, id: "nonexistent" }), /catalog has no model/);
	});

	for (const [id, requested, expected] of [[deepseek, "off", "none"], [deepseek, "low", "low"], [deepseek, "max", "max"], [glm, "off", "low"], [glm, "high", "high"], [glm, "max", "max"]] as const) {
		it(`${id} maps ${requested} to reasoning_effort=${expected} using only supported request fields`, async () => {
			const engine = configured(id, requested);
			let body: Record<string, unknown> = {};
			globalThis.fetch = async (input, init) => {
				const request = new Request(input, init);
				assert.equal(request.url, "https://ollama.com/v1/chat/completions");
				assert.equal(request.headers.get("authorization"), "Bearer synthetic-ollama-key-1234");
				body = JSON.parse(await request.text());
				return answer();
			};
			const result = await engine.streamFn(engine.model, normalizeContext(context), { maxTokens: 999_999 }).result();
			assert.equal(result.stopReason, "stop", result.errorMessage);
			assert.equal(body.model, id);
			assert.equal(body.reasoning_effort, expected);
			assert.equal(body.max_tokens, 32_768, "app budget applies even to explicit larger requests");
			assert.deepEqual(body.stream_options, { include_usage: true });
			assert.deepEqual(Object.keys(body).sort(), ["max_tokens", "messages", "model", "reasoning_effort", "stream", "stream_options"]);
			assert.equal((body.messages as { role: string }[])[0]?.role, "system");
			assert.deepEqual(result.content, [{ type: "text", text: "Hello learner" }]);
			assert.equal(result.usage.cacheRead, 4);
		});
	}

	it("also caps the full stream API and preserves a smaller explicit completion budget", async () => {
		const engine = configured();
		const budgets: number[] = [];
		globalThis.fetch = async (input, init) => { const body = await new Request(input, init).json(); budgets.push(body.max_tokens); return answer(); };
		for (const maxTokens of [999_999, 1024]) {
			const result = await piModels().stream(engine.model, context, { maxTokens }).result();
			assert.equal(result.stopReason, "stop", result.errorMessage);
		}
		assert.deepEqual(budgets, [32_768, 1024]);
	});

	it("streams reasoning and fragmented tool calls, then replays tool results and images", async () => {
		const engine = configured(glm);
		const bodies: Record<string, unknown>[] = [];
		globalThis.fetch = async (input, init) => {
			const request = new Request(input, init);
			assert.equal(request.url, "https://ollama.com/v1/chat/completions");
			bodies.push(JSON.parse(await request.text()));
			return bodies.length === 1 ? sse([
				chunk({ reasoning: "I should check" }),
				chunk({ tool_calls: [{ index: 0, id: "call_check", type: "function", function: { name: "check", arguments: '{"value":' } }] }),
				chunk({ tool_calls: [{ index: 0, function: { arguments: '"answer"}' } }] }),
				chunk({}, "tool_calls"),
			]) : answer();
		};
		const tools = [{ name: "check", description: "Check a value", parameters: Type.Object({ value: Type.String() }) }];
		const initial: Context = { ...context, tools, messages: [{ role: "user", content: [{ type: "text", text: "Read this" }, { type: "image", data: "aW1hZ2U=", mimeType: "image/png" }], timestamp: 1 }] };
		const stream = engine.streamFn(engine.model, normalizeContext(initial));
		const events: AssistantMessageEvent[] = [];
		for await (const event of stream) events.push(event);
		const result = await stream.result();
		assert.equal(result.stopReason, "toolUse", result.errorMessage);
		assert.ok(events.some((e) => e.type === "thinking_delta"));
		assert.ok(events.some((e) => e.type === "toolcall_delta"));
		assert.deepEqual(result.content.find((c) => c.type === "toolCall"), { type: "toolCall", id: "call_check", name: "check", arguments: { value: "answer" } });
		const second = await engine.streamFn(engine.model, normalizeContext({ ...initial, messages: [...initial.messages, result, { role: "toolResult", toolCallId: "call_check", toolName: "check", content: [{ type: "text", text: "Correct" }], isError: false, timestamp: 2 }] })).result();
		assert.equal(second.stopReason, "stop", second.errorMessage);
		const messages = bodies[1]!.messages as Record<string, unknown>[];
		assert.equal(messages.find((m) => m.role === "assistant")?.reasoning, "I should check");
		assert.deepEqual(messages.find((m) => m.role === "tool"), { role: "tool", tool_call_id: "call_check", content: "Correct" });
		assert.ok(JSON.stringify(messages).includes("data:image/png;base64,aW1hZ2U="));
		const sentTools = bodies[0]!.tools as { function: Record<string, unknown> }[];
		assert.equal(sentTools[0]?.function.name, "check");
		assert.equal(sentTools[0]?.function.strict, undefined, "do not forward OpenAI strict mode");
	});

	it("reads rotated keys for an existing engine and fails after removal without provider fallback", async () => {
		const engine = configured();
		const headers: (string | null)[] = [];
		globalThis.fetch = async (input, init) => { const request = new Request(input, init); headers.push(request.headers.get("authorization")); return answer(); };
		await engine.streamFn(engine.model, normalizeContext(context)).result();
		saveKey("OLLAMA_API_KEY", "synthetic-rotated-key-5678");
		await engine.streamFn(engine.model, normalizeContext(context)).result();
		assert.deepEqual(headers, ["Bearer synthetic-ollama-key-1234", "Bearer synthetic-rotated-key-5678"]);
		deleteKey("OLLAMA_API_KEY");
		const result = await engine.streamFn(engine.model, normalizeContext(context)).result();
		assert.equal(result.stopReason, "error");
		assert.equal(headers.length, 2, "missing credentials must not contact any provider");
	});

	it("reports authentication rejection without falling back or changing model selection", async () => {
		const engine = configured();
		let calls = 0;
		globalThis.fetch = async (input, init) => { assert.equal(new Request(input, init).url, "https://ollama.com/v1/chat/completions"); calls++; return Response.json({ error: { message: "Invalid API key" } }, { status: 401 }); };
		const result = await engine.streamFn(engine.model, normalizeContext(context), { maxRetries: 0 }).result();
		assert.equal(result.stopReason, "error");
		assert.match(result.errorMessage ?? "", /401|Invalid API key/);
		assert.equal(calls, 1);
		assert.equal(engine.model.provider, provider);
		assert.equal(piModels().getProvider(provider)?.name, "Ollama Cloud");
	});
});
