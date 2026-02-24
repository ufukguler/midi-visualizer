import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './index.css';
import Home from './pages/Home';
import Player from './pages/Player';
import Header from "./components/Header";

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <Router>
      <div className="min-h-[calc(100vh-65px)] bg-gray-900">
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/player" element={<Player />} />
        </Routes>
      </div>
    </Router>
  </React.StrictMode>
);
