import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./App.css";
import "./globals.css";
import "./ionic/theme.css";
import { initOneSignal } from "@/lib/onesignal";

// Initialize OneSignal after app mounts
initOneSignal();

createRoot(document.getElementById("root")!).render(<App />);
