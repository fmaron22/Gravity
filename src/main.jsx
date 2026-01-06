import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/variables.css'
import './styles/global.css'
import './styles/components.css'
import './styles/layout.css'

import ErrorBoundary from './components/ErrorBoundary.jsx'

// DEBUG: Confirm JS loads
// try { alert('Gravity App Loaded'); } catch(e) {}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
