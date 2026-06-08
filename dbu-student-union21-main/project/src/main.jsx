/** @format */

import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { FeatureVisibilityProvider } from "./contexts/FeatureVisibilityContext.jsx";
import "./index.css";

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
