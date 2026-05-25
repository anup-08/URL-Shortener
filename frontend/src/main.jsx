import React from 'react';
import ReactDOM from 'react-dom/client';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './styles.css';

window.addEventListener('error', (event) => {
  toast.error(event.message || 'Unexpected application error.');
  if (event.error instanceof Error) {
    console.error('Unhandled error:', event.error);
  }
});

window.addEventListener('unhandledrejection', (event) => {
  toast.error('A request failed outside the normal error flow.');
  console.error('Unhandled rejection:', event.reason);
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
      <ToastContainer
        position="top-right"
        autoClose={2800}
        hideProgressBar
        newestOnTop
        closeOnClick
        pauseOnHover
        theme="dark"
      />
    </ErrorBoundary>
  </React.StrictMode>,
);