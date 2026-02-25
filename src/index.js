import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './index.css';
import Header from "./components/Header";

// Lazy load heavy page components
const Home = lazy(() => import('./pages/Home'));
const Player = lazy(() => import('./pages/Player'));
const Practice = lazy(() => import('./pages/Practice'));

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="flex flex-col items-center space-y-4">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-gray-400 font-medium">Loading session...</p>
    </div>
  </div>
);

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <Router>
      <div className="min-h-[calc(100vh-81px)] bg-gray-900">
        <Header />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/player" element={<Player />} />
            <Route path="/practice" element={<Practice />} />
          </Routes>
        </Suspense>
      </div>
    </Router>
  </React.StrictMode>
);
