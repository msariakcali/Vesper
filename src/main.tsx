import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { useUiStore } from "./store/uiStore";
import "./styles.css";

// Tema, ilk boyamadan önce kök öğeye yazılmalı — aksi halde açık/koyu geçişi göze çarpar.
document.documentElement.dataset.theme = useUiStore.getState().theme;
document.documentElement.lang = useUiStore.getState().language;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
