import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Header() {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <header className="bg-gray-800 border-b border-gray-700 shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link 
              to="/" 
              className="text-xl font-bold text-white hover:text-blue-400 transition-colors"
            >
              MIDI Visualizer
            </Link>
            
            <nav className="flex space-x-6">
              <Link
                to="/"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/')
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                Home
              </Link>
              
              <Link
                to="/player"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/player')
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                MIDI Player
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
