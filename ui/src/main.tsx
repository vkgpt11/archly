import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import App from './App'
import './styles.css'
import '@xyflow/react/dist/style.css'

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'missing-google-client-id'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={clientId}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>,
)
