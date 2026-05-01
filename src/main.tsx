import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "./components/AuthProvider";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <TooltipProvider delayDuration={200}>
          <App />
          <Toaster
            richColors
          position="top-right"
          toastOptions={{
            style: {
              fontFamily: "Inter, sans-serif",
            },
          }}
        />
      </TooltipProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
