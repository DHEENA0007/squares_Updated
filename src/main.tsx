import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/responsive-utilities.css";
import { ThemeProvider } from "./components/ThemeProvider";
import { pincodeService } from "./services/pincodeService";
import { locaService } from "./services/locaService";

// Initialize services early
pincodeService.initialize().catch(console.error);
locaService.initialize().catch(console.error);

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
    <App />
  </ThemeProvider>
);
