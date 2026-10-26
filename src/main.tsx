import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router";
import "./index.css";
import App from "./App";
import { ConfirmProvider } from "./components/ConfirmProvider";
import { StoreProvider } from "./state/StoreProvider";

// Lets the browser install this as an app and open it without the server running.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch(() => {});
  });
}

// biome-ignore lint/style/noNonNullAssertion: Vite scaffold
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <StoreProvider>
        <ConfirmProvider>
          <App />
        </ConfirmProvider>
      </StoreProvider>
    </HashRouter>
  </StrictMode>,
);
