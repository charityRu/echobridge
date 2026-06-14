import React, { useState } from 'react';
import SoundStudio from './components/SoundStudio';
import PatientView from './components/PatientView';

export default function App() {
  // temp state hack to switch between views for demo purposes
  const [currentView, setCurrentView] = useState('studio');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {currentView === 'studio' ? (
        <SoundStudio onSwitchView={() => setCurrentView('patient')} />
      ) : (
        <PatientView onSwitchView={() => setCurrentView('studio')} />
      )}
    </div>
  );
}
