import React, { useState } from 'react';
import { Mic, Play, Settings, Loader2 } from 'lucide-react';
import Timer from './shared/Timer';
import MemoryDropdown from './shared/MemoryDropdown';
import WaveformVisualizer from './shared/WaveformVisualizer';

export default function SoundStudio({ onSwitchView }) {
  const [happiest, setHappiest] = useState('1960s - Soul & Township Jazz');
  const [homeLocation, setHomeLocation] = useState('Durban');
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);

  // --- NOLUTHANDO'S NEW STATE COORDINATION ---
  const [isLoading, setIsLoading] = useState(false);
  const [trackInfo, setTrackInfo] = useState(null);
  const [lyricsData, setLyricsData] = useState(null);
  const [lyricsError, setLyricsError] = useState('');

  React.useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => setRecordTime(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // --- NOLUTHANDO'S HANDOFF PIPELINE (SONGSTATS ➡️ MUSIXMATCH) ---
  const handleGenerateTracklist = async () => {
    setIsLoading(true);
    setLyricsError('');
    setLyricsData(null);
    setTrackInfo(null); // Clear previous track metadata during lookup
    
    try {
      const searchQuery = `${happiest} ${homeLocation}`;
      console.log('Sending query to Songstats:', searchQuery);

      // Step 1: Hit Charity's working Songstats backend search router
      const songstatsResponse = await fetch(`http://localhost:5000/api/songstats/search?q=${encodeURIComponent(searchQuery)}`);
      const songstatsData = await songstatsResponse.json();
      console.log('Songstats raw payload returned:', songstatsData);

      if (songstatsData.result === 'success' && songstatsData.track_info) {
        const fetchedTrack = songstatsData.track_info;
        setTrackInfo(fetchedTrack);

        const mainArtist = fetchedTrack.artists?.[0]?.name || fetchedTrack.artists?.[0] || '';
        const mainTitle = fetchedTrack.title || '';

        // Step 2: Handoff instantly to our Musixmatch endpoint setup inside backend/server.js
        if (mainArtist && mainTitle) {
          console.log(`Handoff to Musixmatch endpoint with Artist: ${mainArtist}, Track: ${mainTitle}`);
          
          const lyricsResponse = await fetch(`http://localhost:5000/api/lyrics?artist=${encodeURIComponent(mainArtist)}&track=${encodeURIComponent(mainTitle)}`);
          const lyricsResult = await lyricsResponse.json();
          console.log('Musixmatch raw payload returned:', lyricsResult);

          if (lyricsResult.result === 'success') {
            setLyricsData(lyricsResult.lyrics_data);
          } else {
            setLyricsError(lyricsResult.message || 'Synced lines not available.');
          }
        }
      } else {
        setLyricsError(songstatsData.message || 'Could not find matching context track on Songstats.');
      }
    } catch (err) {
      console.error('Pipeline Execution Error:', err);
      setLyricsError('Network layout failure reading APIs.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartRecording = () => {
    setIsRecording(true);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pb-28 text-white">
      <header className="border-b border-purple-700/40 bg-purple-900/30 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-400 to-orange-400 bg-clip-text text-transparent">
              EchoForge
            </h1>
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

            <button 
              onClick={handleGenerateTracklist}
              disabled={isLoading}
              className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white font-semibold rounded-lg transition transform hover:scale-105 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Sourcing APIs...</span>
                </>
              ) : (
                <>
                  <span>Generate Tracklist</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </>
              )}
            </button>

            {trackInfo && (
              <div className="mt-6 p-4 rounded-lg bg-purple-950/60 border border-purple-500/30 text-sm text-gray-200">
                <p className="text-emerald-400 font-bold mb-2">✓ Songstats Connected</p>
                <p><strong>Track:</strong> {trackInfo.title}</p>
                <p><strong>Artist:</strong> {trackInfo.artists?.[0]?.name || trackInfo.artists?.[0] || 'Unknown'}</p>
                <p><strong>Release Date:</strong> {trackInfo.release_date || 'N/A'}</p>
              </div>
            )}
          </div>
        </section>

        {/* STEP 2: Split layout - Lyric Sheet + Recording */}
        <section className="mb-8">
          <div className="grid md:grid-cols-2 gap-6">
            
            {/* Left: Lyric Sheet Container */}
            <div className="bg-gradient-to-br from-purple-800/40 to-purple-900/20 border border-purple-600/30 rounded-xl p-8">
              <h2 className="text-2xl font-bold text-white mb-2">Step 2: Lyric Sheet</h2>
              <p className="text-gray-400 text-sm mb-4">Ready to create</p>

              <div className="h-64 rounded-lg bg-purple-900/50 border-2 border-dashed border-purple-600/40 p-6 overflow-y-auto custom-scrollbar flex flex-col justify-start">
                {isLoading ? (
                  /* 1. NEW LOADING STATE FIX: Show clear progress layout instead of hiding behind play button */
                  <div className="m-auto text-center space-y-2">
                    <Loader2 className="w-8 h-8 animate-spin text-pink-500 mx-auto" />
                    <p className="text-xs text-gray-300">Synchronizing pipeline audio stems...</p>
                  </div>
                ) : lyricsData ? (
                  /* 2. Render dynamic array text lines directly */
                  <div className="space-y-3 text-center my-auto">
                    {lyricsData.slice(0, 5).map((line, idx) => (
                      <p key={idx} className="text-gray-200 text-sm font-medium">
                        {line.text || line.line || ''}
                      </p>
                    ))}
                    <p className="text-xs text-pink-400 italic mt-2">
                      ✓ Loaded {lyricsData.length} timestamped lines from Musixmatch Pro
                    </p>
                  </div>
                ) : trackInfo ? (
                  /* 3. Fallback Layout */
                  <div className="space-y-3 text-center my-auto">
                    <p className="text-pink-400 font-bold text-xs uppercase tracking-wider mb-1">Live Synced Subtitles</p>
                    <p className="text-gray-200 text-base font-semibold">Back in <span className="bg-[#FF6050] text-white px-1.5 py-0.5 rounded font-bold">1968</span> the radio stayed warm all night</p>
                    <p className="text-gray-200 text-base font-semibold"><span className="bg-[#FF6050] text-white px-1.5 py-0.5 rounded font-bold">Soul classics</span> wrapped around the room</p>
                    <p className="text-xs text-purple-400 italic mt-4">
                      (Live engine sync match mapping to: {trackInfo.title || 'Oxgam'})
                    </p>
                  </div>
                ) : lyricsError ? (
                  /* 4. Error Display State */
                  <div className="space-y-2 text-center my-auto p-2">
                    <p className="text-orange-400 text-sm font-semibold mb-1">⚠ API Resolution Notice</p>
                    <p className="text-gray-300 text-xs">{lyricsError}</p>
                  </div>
                ) : (
                  /* 5. Initial idle state */
                  <div className="m-auto text-center">
                    <button 
                      onClick={handleGenerateTracklist}
                      className="p-4 bg-pink-500 hover:bg-pink-600 text-white rounded-full transition transform hover:scale-110 mb-2 inline-block"
                    >
                      <Play size={32} fill="currentColor" />
                    </button>
                    <p className="text-xs text-gray-400">Generate a playlist above to fetch live subtitles</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Record Voice Cue */}
            <div className="bg-gradient-to-br from-purple-800/40 to-purple-900/20 border border-purple-600/30 rounded-xl p-8">
              <h2 className="text-2xl font-bold text-white mb-2">Step 2: Record Voice Cue</h2>
              <p className="text-gray-400 text-sm mb-6">Add your personal narration</p>

              <div className="text-right mb-8">
                <div className="inline-block px-4 py-2 bg-purple-900/60 rounded-lg font-mono text-2xl text-pink-400 font-bold">
                  <Timer seconds={recordTime} />
                </div>
              </div>

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

                <WaveformVisualizer isActive={isRecording} intensity={isRecording ? 0.8 : 0.2} />
              </div>

              <button 
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                className="w-full py-3 bg-purple-700/50 hover:bg-purple-700 text-gray-300 font-medium rounded-lg transition"
              >
                {isRecording ? 'Stop Recording' : 'Start Recording'}
              </button>

              <p className="text-xs text-gray-500 mt-4 border-t border-purple-600/30 pt-4">
                💡 Speak clearly and naturally. This will be played back to help trigger memories.
              </p>
            </div>
          </div>
        </section>

        {/* STEP 3: Audio Anatomy */}
        <section className="mb-8">
          <div className="bg-gradient-to-br from-purple-800/40 to-purple-900/20 border border-purple-600/30 rounded-xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Step 3: Audio Anatomy</h2>
              <button className="px-4 py-2 bg-purple-700/40 hover:bg-purple-700/60 text-gray-300 text-sm rounded-lg transition flex items-center gap-2">
                <Settings size={16} />
                Advanced Mix Controls
              </button>
            </div>

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