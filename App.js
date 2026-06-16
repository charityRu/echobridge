import React, { useState } from 'react';
import SoundStudio from './components/SoundStudio';
import PatientView from './components/PatientView';

export default function App() {
  const [currentView, setCurrentView] = useState('studio');

  // NEW: store Songstats result
  const [songstatsData, setSongstatsData] = useState(null);

  // NEW: loading state
  const [loading, setLoading] = useState(false);

  // NEW: function to test backend connection
  const fetchSongstats = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        "http://localhost:5000/api/songstats-test"
      );

      const data = await response.json();

      console.log("SONGSTATS DATA:", data);

      setSongstatsData(data);

      setLoading(false);
    } catch (error) {
      console.log("Frontend error:", error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">

      {/* TEST BUTTON (temporary for debugging) */}
      <div className="p-4">
        <button
          onClick={fetchSongstats}
          className="bg-pink-500 px-4 py-2 rounded-lg"
        >
          {loading ? "Loading..." : "Test Songstats API"}
        </button>

        {/* show raw data */}
        {songstatsData && (
          <pre className="text-xs mt-4 bg-black p-2 overflow-auto">
            {JSON.stringify(songstatsData, null, 2)}
          </pre>
        )}
      </div>

      {/* EXISTING APP LOGIC (UNCHANGED) */}
      {currentView === 'studio' ? (
        <SoundStudio onSwitchView={() => setCurrentView('patient')} />
      ) : (
        <PatientView onSwitchView={() => setCurrentView('studio')} />
      )}
    </div>
  );
}