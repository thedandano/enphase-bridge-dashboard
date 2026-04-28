import '@fontsource/bebas-neue';
import '@fontsource/barlow-condensed';
import '@fontsource/jetbrains-mono';
import './styles/theme.css';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
