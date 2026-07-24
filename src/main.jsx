if (typeof window !== 'undefined' && !window.global) {
    window.global = window;
}
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
