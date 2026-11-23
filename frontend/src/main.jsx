import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import "./styles/tables.css";
import "./styles/buttons.css";
import App from "./App";
import { BrowserRouter } from "react-router-dom";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);