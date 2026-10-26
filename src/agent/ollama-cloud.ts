import { createProvider, envApiKeyAuth, type Model } from "@earendil-works/pi-ai";
import { openAICompletionsApi } from "@earendil-works/pi-ai/api/openai-completions.lazy";

const PROVIDER = "ollama-cloud";
const BASE_URL = "https://ollama.com/v1";
const COMPLETION_BUDGET = 32_768;

/** Curated cloud catalog, verified against Ollama's library and /api/show
 * on 2026-10-25. No local server, discovery, or endpoint override.
 * See docs/ollama-cloud.md for sources, costs, and extension instructions. */
const models = ([
	{
		id: "deepseek-v4.1-flash",
		name: "Ollama Cloud: DeepSeek V4.1 Flash",
		api: "openai-completions",
		provider: PROVIDER,
		baseUrl: BASE_URL,
		reasoning: true,
		thinkingLevelMap: { off: "none", minimal: null, low: "low", medium: null, high: "high", xhigh: null, max: "max" },
		input: ["text", "image"],
		// Peak USD / 1M tokens; estimates, not subscription usage/billing.
		cost: { input: 0.3, output: 1.2, cacheRead: 0.006, cacheWrite: 0 },
		contextWindow: 1_048_576,
		// App completion budget; Ollama does not publish an output ceiling.
		maxTokens: COMPLETION_BUDGET,
	},
	{
		id: "glm-5.3-flash",
		name: "Ollama Cloud: GLM 5.3 Flash",
		api: "openai-completions",
		provider: PROVIDER,
		baseUrl: BASE_URL,
		reasoning: true,
		thinkingLevelMap: { off: null, minimal: null, low: "low", medium: null, high: "high", xhigh: null, max: "max" },
		input: ["text", "image"],
		cost: { input: 0.15, output: 0.5, cacheRead: 0.03, cacheWrite: 0 },
		contextWindow: 1_048_576,
		maxTokens: COMPLETION_BUDGET,
	},
] satisfies Model<"openai-completions">[]).map((model): Model<"openai-completions"> => ({
	...model,
	compat: {
		// Explicitly override OpenAI defaults: Ollama implements a subset.
		supportsStore: false,
		supportsDeveloperRole: false,
		supportsReasoningEffort: true,
		supportsUsageInStreaming: true,
		supportsStrictMode: false,
		maxTokensField: "max_tokens",
		thinkingFormat: "openai",
	},
}));

/** pi resolves the env key for every request, including after save/rotation. */
export function ollamaCloudProvider() {
	const api = openAICompletionsApi();
	return createProvider({
		id: PROVIDER,
		name: "Ollama Cloud",
		baseUrl: BASE_URL,
		auth: { apiKey: envApiKeyAuth("Ollama Cloud API key", ["OLLAMA_API_KEY"]) },
		models,
		api: {
			stream: (model, context, options) => api.stream(model, context, { ...options, maxTokens: Math.min(options?.maxTokens ?? COMPLETION_BUDGET, COMPLETION_BUDGET) }),
			streamSimple: (model, context, options) => api.streamSimple(model, context, { ...options, maxTokens: Math.min(options?.maxTokens ?? COMPLETION_BUDGET, COMPLETION_BUDGET) }),
		},
	});
}
