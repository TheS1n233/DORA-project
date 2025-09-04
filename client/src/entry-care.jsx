// English comments only
import React from 'react';
import ReactDOM from 'react-dom/client';
import AppCare from './app-care.jsx';

// Load styles kept in your repo
import './styles/index.css';
import './index.css';
import './styles/theme-green.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppCare />
  </React.StrictMode>
);
