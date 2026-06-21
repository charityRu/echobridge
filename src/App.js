import React, { useState } from 'react';
import SoundStudio from './components/SoundStudio';
import PatientView from './components/PatientView';

export default function App() {
  // controls which screen is currently visible
  const [currentView, setCurrentView] = useState('studio');
  const [masterSession, setMasterSession] = useState(null);

  const handleSwitchToPatient = (sessionPayload) => {
    if (sessionPayload) {
      setMasterSession(sessionPayload);
    }
    setCurrentView('patient');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {currentView === 'studio' ? (
        <SoundStudio
          onSwitchView={handleSwitchToPatient}
        />
      ) : (
        <PatientView
          initialMasterSession={masterSession}
          onSwitchView={() => setCurrentView('studio')}
        />
      )}
    </div>
  );
}