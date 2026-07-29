import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import App from './App.jsx';
import './index.css';

// Default API URL points to live Render backend production server
axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'https://le-tohfa-booking-1.onrender.com';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
