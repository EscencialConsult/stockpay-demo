import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider } from './context/AuthContext';
// Autohospedadas — la app tiene que abrir sin internet en el mostrador,
// nunca se llama a fonts.googleapis.com. Pesos variables, un solo archivo
// cada una.
import '@fontsource-variable/exo-2';
import '@fontsource-variable/jost';
import './brand.css';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
