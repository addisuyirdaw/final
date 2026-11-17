/** @format */

import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import axios from "axios";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { FeatureVisibilityProvider } from "./contexts/FeatureVisibilityContext.jsx";
import "./index.css";

// Configure global Axios defaults and request interceptor for Localtunnel bypass
axios.defaults.headers.common["bypass-tunnel-reminder"] = "true";
axios.defaults.headers.common["Content-Type"] = "application/json";
if (axios.interceptors && axios.interceptors.request) {
	axios.interceptors.request.use((config) => {
		config.headers = config.headers || {};
		config.headers["bypass-tunnel-reminder"] = "true";
		return config;
	});
}

// Global fetch interceptor to attach Localtunnel and tunnel bypass header to all requests
if (typeof window !== "undefined" && window.fetch) {
	const originalFetch = window.fetch;
	window.fetch = async function (input, init = {}) {
		let headers;
		if (init.headers instanceof Headers) {
			headers = new Headers(init.headers);
			if (!headers.has("bypass-tunnel-reminder")) {
				headers.set("bypass-tunnel-reminder", "true");
			}
		} else if (Array.isArray(init.headers)) {
			headers = new Headers(init.headers);
			if (!headers.has("bypass-tunnel-reminder")) {
				headers.set("bypass-tunnel-reminder", "true");
			}
		} else if (typeof init.headers === "object" && init.headers !== null) {
			headers = {
				"bypass-tunnel-reminder": "true",
				...init.headers,
			};
		} else {
			headers = {
				"bypass-tunnel-reminder": "true",
			};
		}
		return originalFetch.call(this, input, { ...init, headers });
	};
}

const rootElement = document.getElementById("root");

if (rootElement) {
	createRoot(rootElement).render(
		<StrictMode>
			<ErrorBoundary>
				<FeatureVisibilityProvider>
					<App />
				</FeatureVisibilityProvider>
			</ErrorBoundary>
		</StrictMode>
	);
}
