import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import './index.css';

const envBasePaths = ['/prash-dev1', '/prash-qa1', '/prash-stg'];
const matchedBasePath = envBasePaths.find((basePath) => window.location.pathname.startsWith(basePath));
const routerBaseName = matchedBasePath || undefined;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={routerBaseName}>
      <AuthProvider>
        <CartProvider>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#1a1a1a',
                color: '#fff',
                border: '1px solid #3a3a3a',
                borderRadius: '12px',
                fontSize: '14px'
              },
              success: {
                iconTheme: { primary: '#f59e0b', secondary: '#000' }
              },
              error: {
                iconTheme: { primary: '#ef4444', secondary: '#fff' }
              }
            }}
          />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
