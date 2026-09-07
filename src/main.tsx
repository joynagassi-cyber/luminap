import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./App.css";
import "./globals.css";
import { initOneSignalService } from "@/lib/onesignal";

// Initialize OneSignal after app mounts
initOneSignalService();

createRoot(document.getElementById("root")!).render(<App />);
