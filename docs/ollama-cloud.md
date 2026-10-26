# Ollama Cloud

Add an API key in setup or Settings → Keys by selecting **Ollama Cloud**.
Create the key in [Ollama's API key settings](https://ollama.com/settings/keys).
Then select an Ollama Cloud model explicitly for the strong, cheap, and vision
slots in Settings → Models. Adding a key does not change existing selections.

The provider ID is `ollama-cloud`; the managed secret is `OLLAMA_API_KEY`.
The existing server key manager stores it in the server's `auth.json` (mode
0600), or reads it from the server environment. A real environment value takes
precedence over a saved key; the existing settings status explains that case.
Saving, rotating, or deleting a file-managed key takes effect on the next
request without restarting. Clients receive masked status only. Enter the key
through the authenticated app; do not put it in a mobile build or client env.

Requests use the fixed official `https://ollama.com/v1/chat/completions`
endpoint with Bearer authentication. No local Ollama installation is needed.
The app uses pi-ai's existing OpenAI-compatible streaming transport for text,
images, reasoning, function calls, tool results, and usage. It explicitly uses
`max_tokens`, `reasoning_effort`, system messages, and streaming usage; it does
not send OpenAI store, developer-role, or strict-tool options. Errors remain
with the chosen provider; there is no provider fallback.

## Curated catalog

This is a small static catalog, not automatic discovery of every cloud model.
Metadata was checked on 2026-10-25 against Ollama's public library, `/api/tags`,
and unauthenticated `POST https://ollama.com/api/show` for each model.

| API model ID | Inputs | Context | Supported thinking | Estimated USD / 1M input / cached / output |
| --- | --- | --- | --- | --- |
| `deepseek-v4.1-flash` | Text, images | 1,048,576 | off, low, high, max | $0.30 / $0.006 / $1.20 |
| `glm-5.3-flash` | Text, images | 1,048,576 | low, high, max | $0.15 / $0.03 / $0.50 |

Both models support function tools. DeepSeek maps off to `reasoning_effort:
"none"`; other supported levels use their exact names. GLM always reasons:
off is unavailable and an old off pin clamps to low through the existing
settings behavior. Unset thinking follows the app's existing default order.

Each response has an **app completion budget of 32,768 tokens**, shared by
reasoning and answer. This is enforced on both stream entry points, including
explicit requests for a larger budget, and exposed as `maxTokens` in the model
catalog. It is not a claim about Ollama's maximum output capacity, which its
public model metadata does not specify. Context meters use the verified
context size above.

Costs are estimates from advertised per-token rates, using DeepSeek's peak
rates conservatively; off-peak prices may be lower. Cache-write pricing is not
separately advertised and is recorded as zero; ordinary input still counts at
the input rate. These estimates do not measure subscription allowances,
remaining credits, or actual charges. Ollama's account dashboard is the source
for subscription usage and billing.

To extend the catalog, edit `src/agent/ollama-cloud.ts`. Verify exact direct
cloud IDs, capabilities, context, and thinking values using Ollama's library,
`/api/tags`, and `/api/show`; verify prices on the model page. Keep unsupported
thinking levels explicitly null, and update the mocked transport/catalog tests.
Do not infer another provider's limits or reasoning format for Ollama.

## Deployment and validation

The current iPhone client fetches the key-provider roster from `/api/keys` and
models/capabilities/thinking levels from `/api/models`. This feature needs a
server deployment; it does not require a new native build. Existing client
and API contract shapes are unchanged. Reload setup/settings after deployment
to fetch the updated roster. Preserve the deployment's mounted state directory,
auth file, and existing model selections.

Automated tests use scratch files and synthetic keys with mocked HTTP only.
They cover endpoint/auth, reasoning mapping, streamed text/reasoning/tools,
tool replay, image serialization, usage, key rotation/deletion, keyless catalog
gating, selections, and the existing setup UI's dynamic provider/model lists.
A real-account smoke test remains necessary after deployment: enter the key
in settings, choose models explicitly, send a short teaching prompt that uses
a tool, and test an image with the vision slot. Check Ollama's dashboard for
subscription usage; never paste the key into a chat, card, or log.

Sources: [authentication](https://docs.ollama.com/api/authentication),
[OpenAI compatibility](https://docs.ollama.com/api/openai-compatibility),
[thinking metadata](https://docs.ollama.com/capabilities/thinking),
[DeepSeek V4.1 Flash](https://ollama.com/library/deepseek-v4.1-flash),
[GLM 5.3 Flash](https://ollama.com/library/glm-5.3-flash).
