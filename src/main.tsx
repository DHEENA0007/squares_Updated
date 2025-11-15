import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/responsive-utilities.css";
import { ThemeProvider } from "./components/ThemeProvider";
import { pincodeService } from "./services/pincodeService";
import { locaService } from "./services/locaService";

// Initialize services early with error handling
Promise.all([
  pincodeService.initialize().catch(err => {
    console.warn('Pincode service initialization failed:', err);
  }),
  locaService.initialize().catch(err => {
    console.warn('Loca service initialization failed:', err);
  })
]).catch(err => {
  console.error('Service initialization error:', err);
});

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
    <App />
  </ThemeProvider>
);
