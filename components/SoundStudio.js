import React, { useState } from 'react';
import { Mic, Play, Settings } from 'lucide-react';
import Timer from './shared/Timer';
import MemoryDropdown from './shared/MemoryDropdown';
import WaveformVisualizer from './shared/WaveformVisualizer';

export default function SoundStudio({ onSwitchView }) {
  // holding state for the dropdowns - will wire to actual selection logic later
  const [happiest, setHappiest] = useState('1960s - Soul & Township Jazz');
  const [homeLocation, setHomeLocation] = useState('Durban');
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);

  // basic timer logic - TODO: refactor this when we integrate real audio recording
  React.useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => setRecordTime(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const handleStartRecording = () => {
    setIsRecording(true);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    // TODO: clean this up later when connecting the real backend
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pb-28">
      {/* Header with branding and view toggle */}
      <header className="border-b border-purple-700/40 bg-purple-900/30 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-400 to-orange-400 bg-clip-text text-transparent">
              EchoForge
            </h1>
            {/* toggle buttons for switching views */}
            <div className="flex gap-2 bg-purple-800/40 rounded-lg p-1">
              <button className="px-4 py-2 rounded-md bg-pink-500 text-white text-sm font-medium">
                Sound Studio
              </button>
              <button 
                onClick={onSwitchView}
                className="px-4 py-2 rounded-md text-gray-300 text-sm font-medium hover:bg-purple-700/40 transition"
              >
                Patient View
              </button>
            </div>
          </div>

          {/* live session badge */}
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 rounded-full border border-emerald-500/50">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
            <span className="text-emerald-300 text-sm font-medium">Live session</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* STEP 1: Set the Memory Frame */}
        <section className="mb-8">
          <div className="bg-gradient-to-br from-purple-800/40 to-purple-900/20 border border-purple-600/30 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-2">Step 1: Set the Memory Frame</h2>
            <p className="text-gray-400 text-sm mb-6">Choose the era and place that matters most</p>

            {/* two-column dropdown layout - flexbox works better here than grid for alignment */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <MemoryDropdown 
                label="When were they happiest?"
                value={happiest}
                onChange={setHappiest}
                options={[
                  '1940s - Jazz Age',
                  '1950s - Rock & Roll',
                  '1960s - Soul & Township Jazz',
                  '1970s - Disco & Funk',
                  '1980s - Synth Wave',
                ]}
              />
              <MemoryDropdown 
                label="Where did they call home?"
                value={homeLocation}
                onChange={setHomeLocation}
                options={[
                  'Durban',
                  'Johannesburg',
                  'Cape Town',
                  'Soweto',
                  'Pretoria',
                ]}
              />
            </div>

            {/* generate tracklist button with icon */}
            <button className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white font-semibold rounded-lg transition transform hover:scale-105 flex items-center justify-center gap-2">
              <span>Generate Tracklist</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </button>
          </div>
        </section>

        {/* STEP 2: Split layout - Lyric Sheet + Recording */}
        <section className="mb-8">
          <div className="grid md:grid-cols-2 gap-6">
            
            {/* Left: Lyric Sheet */}
            <div className="bg-gradient-to-br from-purple-800/40 to-purple-900/20 border border-purple-600/30 rounded-xl p-8">
              <h2 className="text-2xl font-bold text-white mb-2">Step 2: Lyric Sheet</h2>
              <p className="text-gray-400 text-sm mb-8">Ready to create</p>

              {/* placeholder state with play button - this is temporary until we have actual content */}
              <div className="h-64 rounded-lg bg-purple-900/50 border-2 border-dashed border-purple-600/40 flex items-center justify-center">
                <button className="p-4 bg-pink-500 hover:bg-pink-600 text-white rounded-full transition transform hover:scale-110">
                  <Play size={32} fill="currentColor" />
                </button>
              </div>
            </div>

            {/* Right: Record Voice Cue */}
            <div className="bg-gradient-to-br from-purple-800/40 to-purple-900/20 border border-purple-600/30 rounded-xl p-8">
              <h2 className="text-2xl font-bold text-white mb-2">Step 2: Record Voice Cue</h2>
              <p className="text-gray-400 text-sm mb-6">Add your personal narration</p>

              {/* timer display - positioned at top right */}
              <div className="text-right mb-8">
                <div className="inline-block px-4 py-2 bg-purple-900/60 rounded-lg font-mono text-2xl text-pink-400 font-bold">
                  <Timer seconds={recordTime} />
                </div>
              </div>

              {/* central recording button - using flexbox to center it nicely */}
              <div className="flex flex-col items-center gap-8 mb-8">
                <button 
                  onClick={isRecording ? handleStopRecording : handleStartRecording}
                  className={`w-32 h-32 rounded-full flex items-center justify-center transition transform hover:scale-110 ${
                    isRecording 
                      ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/50' 
                      : 'bg-gradient-to-br from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600'
                  }`}
                >
                  <Mic size={56} className="text-white" fill="white" />
                </button>

                {/* audio visualization bars - TODO: hook this up to actual audio input when backend ready */}
                <WaveformVisualizer isActive={isRecording} intensity={isRecording ? 0.8 : 0.2} />
              </div>

              <button 
                onClick={handleStartRecording}
                disabled={isRecording}
                className="w-full py-3 bg-purple-700/50 hover:bg-purple-700 text-gray-300 font-medium rounded-lg transition disabled:opacity-50"
              >
                {isRecording ? 'Recording...' : 'Start Recording'}
              </button>

              {/* warning/instruction text at bottom */}
              <p className="text-xs text-gray-500 mt-4 border-t border-purple-600/30 pt-4">
                💡 Speak clearly and naturally. This will be played back to help trigger memories.
              </p>
            </div>
          </div>
        </section>

        {/* STEP 3: Audio Anatomy - Waveform Stems */}
        <section className="mb-8">
          <div className="bg-gradient-to-br from-purple-800/40 to-purple-900/20 border border-purple-600/30 rounded-xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Step 3: Audio Anatomy</h2>
              {/* advanced mix controls dropdown toggle */}
              <button className="px-4 py-2 bg-purple-700/40 hover:bg-purple-700/60 text-gray-300 text-sm rounded-lg transition flex items-center gap-2">
                <Settings size={16} />
                Advanced Mix Controls
              </button>
            </div>

            {/* three stacked waveform visualizers with high contrast */}
            <div className="space-y-6">
              <div>
                <p className="text-gray-400 text-sm font-medium mb-3">Instrumental Stem</p>
                <WaveformVisualizer intensity={0.6} barCount={64} barColor="from-blue-500 to-blue-600" />
              </div>

              <div>
                <p className="text-gray-400 text-sm font-medium mb-3">Original Vocal Stem</p>
                <WaveformVisualizer intensity={0.7} barCount={64} barColor="from-pink-500 to-pink-600" />
              </div>

              <div>
                <p className="text-gray-400 text-sm font-medium mb-3">Jointly Voice Recording</p>
                <WaveformVisualizer intensity={0.5} barCount={64} barColor="from-orange-500 to-orange-600" />
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Persistent footer with save action */}
      <footer className="fixed bottom-0 left-0 right-0 border-t border-purple-700/40 bg-purple-900/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <p className="text-gray-400 text-sm">
            ✓ All changes saved automatically
          </p>
          <button className="px-8 py-3 bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white font-semibold rounded-lg transition transform hover:scale-105">
            Save Master
          </button>
        </div>
      </footer>
    </div>
  );
}
