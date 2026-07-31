import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import App from './App.jsx';
import './index.css';

// Automatically switch between localhost backend when running on localhost and Render when live
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
axios.defaults.baseURL = import.meta.env.VITE_API_URL || (isLocal ? 'http://localhost:5000' : 'https://le-tohfa-booking-1.onrender.com');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
