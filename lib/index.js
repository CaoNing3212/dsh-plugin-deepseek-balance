/**
 * dsh-plugin-deepseek-balance — host half.
 *
 * Serves GET /dsh-balance with the DeepSeek official-account balance, resolved
 * through the platform credential seam (the same DEEPSEEK_API_KEY the web
 * Models page manages) with an environment fallback. Fully self-contained: it
 * depends only on shipped platform services, so the plugin works on any DSH
 * web install without patching platform packages.
 *
 * The endpoint answers 200 with `{ balance: {…} | null, reason?/error? }`;
 * `balance: null` means "nothing to show" (not the official endpoint, no key,
 * or the query failed) and the browser half renders nothing.
 */
import { credentialRef } from "@deepseek-ai/dsh-credentials";
import { launchEnvironmentOf } from "@deepseek-ai/dsh-launch-environment";

/** Stable cordis plugin name (must equal the package name). */
const name = "dsh-plugin-deepseek-balance";
/** Services required before this row activates. */
const inject = ["webServer"];

const OFFICIAL_BASE_URL = "https://api.deepseek.com";
const OFFICIAL_BASE_URL_V1 = "https://api.deepseek.com/v1";
const API_KEY_REF = "DEEPSEEK_API_KEY";
const BASE_URL_ENV = "DEEPSEEK_BASE_URL";
const ROUTE_PATH = "/dsh-balance";
const FETCH_TIMEOUT_MS = 10000;

/**
 * Whether a resolved base URL is the official DeepSeek API — the only place
 * the `/user/balance` endpoint exists. Proxies and gateways show nothing.
 */
function isOfficialBaseUrl(baseURL) {
	return baseURL === OFFICIAL_BASE_URL || baseURL === OFFICIAL_BASE_URL_V1;
}

/**
 * Resolve the DeepSeek API key through the platform credential seam first,
 * then the launching environment. Never echoes the key back.
 */
async function resolveDeepSeekApiKey(ctx) {
	const ref = credentialRef(API_KEY_REF);
	const credentials = ctx.get("credentials");
	if (credentials !== void 0) {
		try {
			const hit = await credentials.resolve(ref);
			if (hit !== void 0 && typeof hit.value === "string" && hit.value.trim().length > 0) return hit.value.trim();
		} catch {}
	}
	const ambient = launchEnvironmentOf(ctx).get(ref);
	if (ambient !== void 0 && typeof ambient.value === "string" && ambient.value.length > 0) return ambient.value;
	return void 0;
}

/** Write one JSON response (no-cache so refreshes see fresh balances). */
function sendJson(res, status, body) {
	res.writeHead(status, {
		"content-type": "application/json; charset=utf-8",
		"cache-control": "no-cache"
	});
	res.end(JSON.stringify(body));
}

/** Normalize the DeepSeek `/user/balance` payload into the wire shape. */
function normalizeBalance(data) {
	return {
		isAvailable: data?.is_available === true,
		balances: (data?.balance_infos ?? []).map((entry) => ({
			currency: entry.currency,
			totalBalance: entry.total_balance,
			grantedBalance: entry.granted_balance,
			toppedUpBalance: entry.topped_up_balance
		}))
	};
}

function apply(ctx) {
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: ROUTE_PATH,
		handler: async (req, res) => {
			if (req.method !== "GET") {
				res.writeHead(405);
				res.end();
				return;
			}
			try {
				const environment = launchEnvironmentOf(ctx);
				const baseURL = environment.get(BASE_URL_ENV)?.value ?? OFFICIAL_BASE_URL;
				if (!isOfficialBaseUrl(baseURL)) {
					sendJson(res, 200, { balance: null, reason: "not-official-endpoint" });
					return;
				}
				const apiKey = await resolveDeepSeekApiKey(ctx);
				if (apiKey === void 0) {
					sendJson(res, 200, { balance: null, reason: "missing-api-key" });
					return;
				}
				const response = await fetch(`${baseURL}/user/balance`, {
					method: "GET",
					headers: {
						authorization: `Bearer ${apiKey}`,
						accept: "application/json"
					},
					signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
				});
				if (!response.ok) {
					let message = `HTTP ${response.status}`;
					try {
						const providerError = (await response.json()).error;
						if (providerError?.message) message = providerError.message;
					} catch {}
					sendJson(res, 200, { balance: null, error: message });
					return;
				}
				sendJson(res, 200, { balance: normalizeBalance(await response.json()) });
			} catch (error) {
				sendJson(res, 200, {
					balance: null,
					error: error instanceof Error ? error.message : String(error)
				});
			}
		}
	}), "dsh-plugin-deepseek-balance: /dsh-balance route");
}

export { apply, inject, name };
