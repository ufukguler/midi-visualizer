import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Header() {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <header className="backdrop-blur-md bg-gray-900/70 border-b border-white/10 shadow-2xl transition-all duration-300">
      <div className="container mx-auto px-6">
        <div className="flex justify-center items-center h-20">
          <nav className="hidden md:flex items-center space-x-1">
            <Link
              to="/"
              className={`px-4 py-2 rounded-lg text-lg font-semibold transition-all duration-200 relative group ${isActive('/')
                ? 'text-white bg-white/10 shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
            >
              Home
            </Link>

            <Link
              to="/player"
              className={`px-4 py-2 rounded-lg text-lg font-semibold transition-all duration-200 relative group ${isActive('/player')
                ? 'text-white bg-white/10 shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
            >
              MIDI Player
            </Link>

            <Link
              to="/practice"
              className={`px-4 py-2 rounded-lg text-lg font-semibold transition-all duration-200 relative group ${isActive('/practice')
                ? 'text-white bg-white/10 shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
            >
              Practice
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
