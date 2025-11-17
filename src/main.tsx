import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/responsive-utilities.css";
import { ThemeProvider } from "./components/ThemeProvider";

// Render app immediately - no service dependencies
const rootElement = document.getElementById("root");
if (rootElement) {
  try {
    createRoot(rootElement).render(
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <App />
      </ThemeProvider>
    );
    
    // Mark root as loaded to remove FOUC
    requestAnimationFrame(() => {
      rootElement.classList.add('loaded');
    });
  } catch (error) {
    console.error('Failed to render app:', error);
    rootElement.innerHTML = `<div style="padding: 20px; color: red;">Failed to load application. Please refresh the page.</div>`;
  }
}

// Initialize services in background after app renders
setTimeout(() => {
  import('./services/pincodeService').then(({ pincodeService }) => {
    pincodeService.initialize().catch(err => {
      console.warn('Pincode service initialization failed:', err);
    });
  });
  
  import('./services/locaService').then(({ locaService }) => {
    locaService.initialize().catch(err => {
      console.warn('Loca service initialization failed:', err);
    });
  });
}, 1000);
