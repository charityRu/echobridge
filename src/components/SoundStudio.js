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

/*
|--------------------------------------------------------------------------
| Songstats Test State
|--------------------------------------------------------------------------
*/
const [trackData, setTrackData] = useState(null);
const [loadingTracklist, setLoadingTracklist] = useState(false);

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

const handleGenerateTracklist = async () => {
  try {
    setLoadingTracklist(true);

    // =========================
    // MEMORY ERA → SEARCH ARTIST
    // =========================
    const artistMap = {
      "1940s": "Frank Sinatra",
      "1950s": "Elvis Presley",
      "1960s": "Miriam Makeba",
      "1970s": "Bee Gees",
      "1980s": "Michael Jackson",
    };

    const getEraKey = (val) => {
      if (!val) return "1960s";

      const match = val.match(/\d{4}s/);

      return match ? match[0] : "1960s";
    };

    const eraKey = getEraKey(happiest);

    const query =
      artistMap[eraKey] ||
      "Michael Jackson";

    console.log("GENERATED QUERY:", query);

    const response = await fetch(
      `http://localhost:5000/api/songstats/search?q=${encodeURIComponent(query)}`
    );

    const data = await response.json();

    console.log("SONGSTATS DATA:", data);

    setTrackData(data);

  } catch (error) {
    console.error("Songstats Error:", error);
  } finally {
    setLoadingTracklist(false);
  }
};
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pb-32 sm:pb-40">
      {/* Header with branding and view toggle */}
      <header className="border-b border-purple-700/40 bg-purple-900/30 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-8 w-full sm:w-auto">
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-pink-400 to-orange-400 bg-clip-text text-transparent">
              EchoForge
            </h1>
            {/* toggle buttons for switching views */}
            <div className="flex gap-1 sm:gap-2 bg-purple-800/40 rounded-lg p-1">
              <button className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-md bg-pink-500 text-white text-xs sm:text-sm font-medium transition">
                Studio
              </button>
              <button 
                onClick={onSwitchView}
                className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-gray-300 text-xs sm:text-sm font-medium hover:bg-purple-700/40 transition"
              >
                Patient
              </button>
            </div>
          </div>

          {/* live session badge */}
          <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-emerald-500/20 rounded-full border border-emerald-500/50 text-nowrap">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
            <span className="text-emerald-300 text-xs sm:text-sm font-medium">Live</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* STEP 1: Set the Memory Frame */}
        <section className="mb-6 sm:mb-8">
          <div className="bg-gradient-to-br from-purple-800/40 to-purple-900/20 border border-purple-600/30 rounded-lg sm:rounded-xl p-4 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-1 sm:mb-2">Step 1: Set the Memory Frame</h2>
            <p className="text-gray-400 text-xs sm:text-sm mb-4 sm:mb-6">Choose the era and place that matters most</p>

            {/* two-column dropdown layout - flexbox works better here than grid for alignment */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
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
<div>
  <button
    onClick={handleGenerateTracklist}
    className="w-full px-6 sm:px-8 py-2.5 sm:py-3 bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white text-sm sm:text-base font-semibold rounded-lg transition transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
  >
    <span>
      {loadingTracklist ? "Loading..." : "Generate Tracklist"}
    </span>

    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 10V3L4 14h7v7l9-11h-7z"
      />
    </svg>
  </button>

  {trackData && (
    <div className="mt-4 p-4 rounded-lg bg-purple-900/40 border border-purple-600/30">

      <h3 className="text-white font-bold mb-3">
        Songstats Connected ✅
      </h3>

      <p className="text-gray-300">
        <strong>Track:</strong> {trackData?.track_info?.title}
      </p>

      <p className="text-gray-300">
        <strong>Artist:</strong> {trackData?.track_info?.artists?.[0]?.name}
      </p>

      <p className="text-gray-300">
        <strong>Release Date:</strong> {trackData?.track_info?.release_date}
      </p>

      <p className="text-gray-300 mb-3">
        <strong>Songstats ID:</strong> {trackData?.track_info?.songstats_track_id}
      </p>

      <div className="mt-3">
        <h4 className="text-white font-semibold mb-2">
          Top Insights
        </h4>

        <ul className="text-sm text-gray-300 space-y-1">
          {trackData?.stats?.slice(0, 6)?.map((stat, i) => (
            <li
              key={i}
              className="flex justify-between border-b border-purple-700/30 pb-1"
            >
              <span>{stat?.name || "Metric"}</span>
              <span className="text-pink-300 font-medium">
                {stat?.value ?? "N/A"}
              </span>
            </li>
          ))}
        </ul>
      </div>

    </div>
  )}
</div>
          </div>
        </section>

        {/* STEP 2: Split layout - Lyric Sheet + Recording */}
        <section className="mb-6 sm:mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            
            {/* Left: Lyric Sheet */}
            <div className="bg-gradient-to-br from-purple-800/40 to-purple-900/20 border border-purple-600/30 rounded-lg sm:rounded-xl p-4 sm:p-8">
              <h2 className="text-lg sm:text-2xl font-bold text-white mb-1 sm:mb-2">Step 2: Lyric Sheet</h2>
              <p className="text-gray-400 text-xs sm:text-sm mb-4 sm:mb-8">Ready to create</p>

              {/* placeholder state with play button - this is temporary until we have actual content */}
              <div className="h-48 sm:h-64 rounded-lg bg-purple-900/50 border-2 border-dashed border-purple-600/40 flex items-center justify-center">
                <button className="p-3 sm:p-4 bg-pink-500 hover:bg-pink-600 text-white rounded-full transition transform hover:scale-110 active:scale-95">
                  <Play size={32} fill="currentColor" />
                </button>
              </div>
            </div>

            {/* Right: Record Voice Cue */}
            <div className="bg-gradient-to-br from-purple-800/40 to-purple-900/20 border border-purple-600/30 rounded-lg sm:rounded-xl p-4 sm:p-8">
              <h2 className="text-lg sm:text-2xl font-bold text-white mb-1 sm:mb-2">Step 2: Record Voice Cue</h2>
              <p className="text-gray-400 text-xs sm:text-sm mb-4 sm:mb-6">Add your personal narration</p>

              {/* timer display - positioned at top right */}
              <div className="text-right mb-4 sm:mb-8">
                <div className="inline-block px-3 sm:px-4 py-1.5 sm:py-2 bg-purple-900/60 rounded-lg font-mono text-lg sm:text-2xl text-pink-400 font-bold">
                  <Timer seconds={recordTime} />
                </div>
              </div>

              {/* central recording button - using flexbox to center it nicely */}
              <div className="flex flex-col items-center gap-6 sm:gap-8 mb-6 sm:mb-8">
                <button 
                  onClick={isRecording ? handleStopRecording : handleStartRecording}
                  className={`w-24 h-24 sm:w-32 sm:h-32 rounded-full flex items-center justify-center transition transform hover:scale-110 active:scale-95 ${
                    isRecording 
                      ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/50' 
                      : 'bg-gradient-to-br from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600'
                  }`}
                >
                  <Mic size={48} className="text-white" fill="white" />
                </button>

                {/* audio visualization bars - TODO: hook this up to actual audio input when backend ready */}
                <WaveformVisualizer isActive={isRecording} intensity={isRecording ? 0.8 : 0.2} />
              </div>

              <button 
                onClick={handleStartRecording}
                disabled={isRecording}
                className="w-full py-2 sm:py-3 bg-purple-700/50 hover:bg-purple-700 text-gray-300 text-sm sm:text-base font-medium rounded-lg transition disabled:opacity-50 active:scale-95"
              >
                {isRecording ? 'Recording...' : 'Start Recording'}
              </button>

              {/* warning/instruction text at bottom */}
              <p className="text-xs text-gray-500 mt-3 sm:mt-4 border-t border-purple-600/30 pt-3 sm:pt-4">
                💡 Speak clearly and naturally.
              </p>
            </div>
          </div>
        </section>

        {/* STEP 3: Audio Anatomy - Waveform Stems */}
        <section className="mb-6 sm:mb-8">
          <div className="bg-gradient-to-br from-purple-800/40 to-purple-900/20 border border-purple-600/30 rounded-lg sm:rounded-xl p-4 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-2xl font-bold text-white">Step 3: Audio Anatomy</h2>
              {/* advanced mix controls dropdown toggle */}
              <button className="px-3 sm:px-4 py-1.5 sm:py-2 bg-purple-700/40 hover:bg-purple-700/60 text-gray-300 text-xs sm:text-sm rounded-lg transition flex items-center gap-2 active:scale-95">
                <Settings size={14} className="sm:size-4" />
                <span className="hidden sm:inline">Advanced Mix Controls</span>
                <span className="sm:hidden">Mix</span>
              </button>
            </div>

            {/* three stacked waveform visualizers with high contrast */}
            <div className="space-y-4 sm:space-y-6">
              <div>
                <p className="text-gray-400 text-xs sm:text-sm font-medium mb-2 sm:mb-3">Instrumental Stem</p>
                <WaveformVisualizer intensity={0.6} barCount={32} className="sm:col-span-full" barColor="from-blue-500 to-blue-600" />
              </div>

              <div>
                <p className="text-gray-400 text-xs sm:text-sm font-medium mb-2 sm:mb-3">Original Vocal Stem</p>
                <WaveformVisualizer intensity={0.7} barCount={32} className="sm:col-span-full" barColor="from-pink-500 to-pink-600" />
              </div>

              <div>
                <p className="text-gray-400 text-xs sm:text-sm font-medium mb-2 sm:mb-3">Jointly Voice Recording</p>
                <WaveformVisualizer intensity={0.5} barCount={32} className="sm:col-span-full" barColor="from-orange-500 to-orange-600" />
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Persistent footer with save action */}
      <footer className="fixed bottom-0 left-0 right-0 border-t border-purple-700/40 bg-purple-900/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
          <p className="text-gray-400 text-xs sm:text-sm">
            ✓ All changes saved automatically
          </p>
          <button className="w-full sm:w-auto px-6 sm:px-8 py-2 sm:py-3 bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white text-sm sm:text-base font-semibold rounded-lg transition transform hover:scale-105 active:scale-95">
            Save Master
          </button>
        </div>
      </footer>
    </div>
  );
}
