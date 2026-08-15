if (typeof window !== 'undefined' && !window.global) {
    window.global = window;
}

// Global handler for Vite dynamic import chunk loading errors (e.g., after a new deployment on Vercel)
window.addEventListener('vite:preloadError', (event) => {
  console.warn('Vite preload error (likely due to new deployment), reloading page...');
  window.location.reload();
});

// Fallback for general unhandled promise rejections related to dynamic imports
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.message && event.reason.message.includes('Failed to fetch dynamically imported module')) {
    console.warn('Dynamic import failed (likely due to new deployment), reloading page...');
    event.preventDefault();
    window.location.reload();
  }
});

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './assets/style/global/index.css'
import App from './App.jsx'
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min";
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
