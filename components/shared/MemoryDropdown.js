import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export default function MemoryDropdown({ label, value, onChange, options }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // close dropdown when clicking outside - standard pattern
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <label className="block text-gray-400 text-sm font-medium mb-2">
        {label}
      </label>

      {/* main dropdown button with neon border on focus */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-purple-900/60 border border-purple-600/40 hover:border-purple-500/60 text-white text-left rounded-lg transition flex items-center justify-between group"
      >
        <span>{value}</span>
        <ChevronDown 
          size={18} 
          className={`text-gray-500 transition-transform group-hover:text-pink-400 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* dropdown menu - using absolute positioning for overlay */}
      {isOpen && (
        <div className="absolute z-20 top-full left-0 right-0 mt-2 bg-purple-900 border border-purple-600/60 rounded-lg shadow-2xl overflow-hidden">
          {options.map((option, idx) => (
            <button
              key={idx}
              onClick={() => {
                onChange(option);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-3 text-left text-sm transition ${
                value === option
                  ? 'bg-gradient-to-r from-pink-500/30 to-orange-500/30 border-l-2 border-pink-400 text-pink-300 font-medium'
                  : 'text-gray-300 hover:bg-purple-800/50 hover:text-white'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
