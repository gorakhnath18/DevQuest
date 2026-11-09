import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";
import "./features.css";

document.documentElement.removeAttribute("data-theme");
localStorage.removeItem("devquest_theme");

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode><App/></React.StrictMode>
);
