import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initOverflowDetector } from "./lib/overflowDetector";

initOverflowDetector();

createRoot(document.getElementById("root")!).render(<App />);
