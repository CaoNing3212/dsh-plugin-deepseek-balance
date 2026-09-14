window.__ModuleLoader__.load({
	id: "dsh-plugin-deepseek-balance",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		//#region lib/types/client/index.js
		/** Locale namespace owned by this plugin. */
		const NS = "dsh-balance";
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"label": "余额：{amount}",
			"refresh": "点击刷新余额"
		};
		/** English dictionary, checked complete against the zh key set. */
		const en = {
			"label": "Balance: {amount}",
			"refresh": "Click to refresh balance"
		};
		/** Format one balance row; CNY gets its currency symbol. */
		function formatEntry(entry) {
			return entry.currency === "CNY" ? `¥${entry.totalBalance}` : `${entry.totalBalance} ${entry.currency}`;
		}
		/** Fallback translator when the slot renderer does not hand down `t`. */
		function fallbackT(key, params) {
			const text = zh[key] ?? key;
			return params?.amount === void 0 ? text : text.replace("{amount}", params.amount);
		}
		/**
		 * One-line dock layout so the balance (order -1) sits in front of the
		 * shipped stats line. No width cap and no shrink: both render at full
		 * content width so the input/output token figures are never ellipsized.
		 * The dock anchor is the official addressable seam ([data-slot]); its
		 * inline `display: contents` is overridden with !important.
		 */
		const LAYOUT_CSS = [
			'[data-slot="conversation.composer.dock"] {',
			'  display: flex !important;',
			'  flex-direction: row !important;',
			'  align-items: center !important;',
			'  justify-content: center !important;',
			'  flex-wrap: nowrap !important;',
			'  column-gap: 10px !important;',
			'  margin: 0 auto !important;',
			'  padding: 4px calc(var(--dsh-composer-side-clearance) + 16px) 0 !important;',
			'  box-sizing: border-box !important;',
			'}',
			'[data-slot="conversation.composer.dock"] > * {',
			'  flex: 0 0 auto !important;',
			'}',
			'[data-slot="conversation.composer.dock"] > div {',
			'  width: auto !important;',
			'  max-width: none !important;',
			'  margin: 0 !important;',
			'  padding: 0 !important;',
			'}',
		].join("\n");
		/**
		 * The composer-dock balance readout: fetches the plugin's host route once
		 * per open session, renders nothing unless the DeepSeek official endpoint
		 * reported a balance, and refreshes on click. A trailing "|" separator
		 * (same token as the stats line's own separators) carries the spacing.
		 * @param props - slot standard props plus the locale-bound `t`.
		 */
		function BalanceDock(props) {
			const t = typeof props.t === "function" ? props.t : fallbackT;
			const [state, setState] = react.useState({ status: "loading", balance: null });
			const [seq, setSeq] = react.useState(0);
			react.useEffect(() => {
				let cancelled = false;
				fetch("/dsh-balance", { headers: { accept: "application/json" } })
					.then((response) => response.json())
					.then((data) => {
						if (cancelled) return;
						setState({ status: "ready", balance: data?.balance ?? null, error: data?.error ?? null });
					})
					.catch((error) => {
						if (cancelled) return;
						setState({ status: "error", balance: null, error: String(error) });
					});
				return () => {
					cancelled = true;
				};
			}, [seq, props.sessionId]);
			const balance = state.balance;
			if (balance === null || typeof balance !== "object" || balance.balances.length === 0) return null;
			const amount = balance.balances.map(formatEntry).join(" · ");
			return react.createElement("button", {
				type: "button",
				title: t("refresh"),
				"aria-label": t("refresh"),
				onClick: () => setSeq((s) => s + 1),
				style: {
					border: "none",
					background: "transparent",
					cursor: "pointer",
					padding: 0,
					display: "inline-flex",
					alignItems: "center",
					flexShrink: 0,
					color: "var(--dsw-alias-label-secondary)",
					font: "inherit",
					fontSize: 12,
					lineHeight: "20px",
					whiteSpace: "nowrap"
				}
			},
				t("label", { amount }),
				react.createElement("span", {
					"aria-hidden": "true",
					style: {
						color: "var(--dsw-alias-separator-primary)",
						marginLeft: 10
					}
				}, "|"));
		}
		/**
		 * Required services: the client slot registry (dock seat) and the locale
		 * service. Declaring `locale` is load-bearing: the dictionary is
		 * registered in `apply`, and with only `slots` declared cordis may run
		 * this plugin before `locale` is provided (that provider also waits on
		 * `remote`/`settingsScope`, which this plugin does not). A missing
		 * service then skips registration silently and the dock renders the raw
		 * i18n key ("label") instead of the balance.
		 */
		const inject = ["slots", "locale"];
		/**
		 * Client plugin body: register dictionaries and the dock layout CSS,
		 * then mount one `conversation.composer.dock` entry ordered before the
		 * shipped stats line.
		 * @param ctx - client root context.
		 */
		function apply(ctx) {
			const style = document.createElement("style");
			style.setAttribute("data-dsh-balance", NS);
			style.textContent = LAYOUT_CSS;
			document.head.append(style);
			ctx.effect(() => () => style.remove(), "dsh-plugin-deepseek-balance: layout css");

			const locale = ctx.get("locale");
			if (locale === undefined) {
				// Unreachable while `locale` is a declared injection, and loud because
				// the silent path renders the bare i18n key with no other symptom.
				console.warn("dsh-plugin-deepseek-balance: locale service unavailable; the dock will show its i18n key");
			} else {
				ctx.effect(() => locale.register(NS, { zh, en }), "dsh-plugin-deepseek-balance: dictionaries");
			}

			ctx.slots.inject("conversation.composer.dock", () => ctx.slots.register({
				name: "conversation.composer.dock",
				id: "deepseek-balance",
				order: -1,
				locale: NS,
				label: "DeepSeek balance"
			}, BalanceDock));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
