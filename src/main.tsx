import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { useUiStore } from "./store/uiStore";
import "./styles.css";

// Dil ilk boyamadan önce kök öğeye yazılır; geçiş sırasında titreme olmaz.
document.documentElement.lang = useUiStore.getState().language;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
