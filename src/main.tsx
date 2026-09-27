import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/inter-tight";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource-variable/playfair-display/wght-italic.css";
import "./styles/global.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
