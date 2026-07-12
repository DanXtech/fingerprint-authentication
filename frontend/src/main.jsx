import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.jsx'
import { ToastProvider } from './components/toast/ToastContext.jsx'

createRoot(document.getElementById('root')).render(

    <ToastProvider>
      <BrowserRouter>
      <App />
    </BrowserRouter>
    </ToastProvider>,
)
