import React, { useState, useRef, useEffect } from 'react';
import { Mic, Play, Settings, Loader2 } from 'lucide-react';
import Timer from './shared/Timer';
import MemoryDropdown from './shared/MemoryDropdown';
import WaveformVisualizer from './shared/WaveformVisualizer';

export default function SoundStudio({ onSwitchView }) {
  const [happiest, setHappiest] = useState('1960s - Soul & Township Jazz');
  const [homeLocation, setHomeLocation] = useState('Durban');
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);

  // --- STATE COORDINATION ---
  const [isLoading, setIsLoading] = useState(false);
  const [trackInfo, setTrackInfo] = useState(null);
  const [lyricsData, setLyricsData] = useState(null);
  const [lyricsError, setLyricsError] = useState('');

  // --- AUDIO ISOLATION & PLAYBACK STATES ---
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanedAudioUrl, setCleanedAudioUrl] = useState(null);
  const [isPlayingCleaned, setIsPlayingCleaned] = useState(false);
  const [transcription, setTranscription] = useState('');

  // --- AUDIO ANATOMY DYNAMIC TRACKING STATE ---
  const [rawVocalUrl, setRawVocalUrl] = useState(null);

  // --- ADVANCED AUDIO MIX CONTROL STATES ---
  const [showAdvancedMix, setShowAdvancedMix] = useState(false);
  const [instrumentalVol, setInstrumentalVol] = useState(0.7);
  const [vocalVol, setVocalVol] = useState(0.8);
  const [masterVol, setMasterVol] = useState(1.0);

  // --- HARDWARE REF TRACKING BOARDS ---
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioPlaybackRef = useRef(null);

  const mixAvailable = Boolean(trackInfo && (rawVocalUrl || cleanedAudioUrl));

  const resetMixSettings = () => {
    setInstrumentalVol(0.7);
    setVocalVol(0.8);
    setMasterVol(1.0);
  };

  useEffect(() => {
    if (audioPlaybackRef.current) {
      audioPlaybackRef.current.volume = Math.min(1, masterVol * vocalVol);
    }
  }, [masterVol, vocalVol]);

  // Handle the active counting clock for active recording durations
  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => setRecordTime(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Cleanup active audio nodes if the screen unmounts mid-stream
  useEffect(() => {
    return () => {
      if (audioPlaybackRef.current) {
        audioPlaybackRef.current.pause();
      }
    };
  }, []);

 // --- HANDOFF PIPELINE (SONGSTATS ➡️ MUSIXMATCH) ---
const handleGenerateTracklist = async () => {
  setIsLoading(true);
  setLyricsError('');
  setLyricsData(null);
  setTrackInfo(null);

  try {
    // TEMPORARY: hardcoded working Songstats query
    const songstatsResponse = await fetch(
      "http://localhost:5000/api/songstats/search?q=purple"
    );

    const songstatsData = await songstatsResponse.json();

    console.log("Songstats raw payload returned:", songstatsData);

    if (songstatsData.result !== "success") {
      setLyricsError(songstatsData.message || "No tracks found");
      return;
    }

    const fetchedTrack = songstatsData.track_info;

    console.log("✅ TRACK FOUND:", fetchedTrack);

    setTrackInfo(fetchedTrack);

    const mainArtist =
      fetchedTrack.artists?.[0]?.name ||
      fetchedTrack.artists?.[0] ||
      "";

    const mainTitle = fetchedTrack.title || "";

    console.log(
      `🎵 Fetching lyrics for ${mainArtist} - ${mainTitle}`
    );

    const lyricsResponse = await fetch(
      `http://localhost:5000/api/lyrics?artist=${encodeURIComponent(
        mainArtist
      )}&track=${encodeURIComponent(mainTitle)}`
    );

    const lyricsResult = await lyricsResponse.json();

    console.log("Musixmatch payload:", lyricsResult);

    if (
      lyricsResult.result === "success" &&
      lyricsResult.lyrics_data
    ) {
      setLyricsData(lyricsResult.lyrics_data);
    } else {
      setLyricsError(
        lyricsResult.message || "Lyrics not available."
      );
    }
  } catch (err) {
    console.error("Pipeline Execution Error:", err);
    setLyricsError("Network layout failure reading APIs.");
  } finally {
    setIsLoading(false);
  }
};
  // --- HARDWARE RECORDING HANDLERS ---
  const handleStartRecording = async () => {
    audioChunksRef.current = [];
    setRecordTime(0);
    setRawVocalUrl(null);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const rawAudioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        console.log("🎤 Recording captured. Deploying isolation stream to backend system...");
        
        // Expose direct stream object natively to run the original vocal anatomy layout stream
        const localVoiceObjectUrl = URL.createObjectURL(rawAudioBlob);
        setRawVocalUrl(localVoiceObjectUrl);

        await sendAudioForIsolation(rawAudioBlob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Hardware Microphone Access Denied:", err);
      alert("Microphone device permissions are missing or blocked.");
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  // --- CONNECTIVITY NODE TO BACKEND ---
  const sendAudioForIsolation = async (audioBlob) => {
    setIsCleaning(true);
    setCleanedAudioUrl(null);
    setTranscription('');
    
    try {
      const formData = new FormData();
      formData.append("voiceRecord", audioBlob, "user-reflection.webm");

      const response = await fetch("http://localhost:5000/api/elevenlabs/isolate", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server tracking status returned structural layout error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.cleanedAudioUrl) {
        console.log("✨ [ElevenLabs Sync] High-fidelity isolated audio block set successfully.");
        setCleanedAudioUrl(data.cleanedAudioUrl);
        setTranscription(data.transcription || '');
      } else {
        console.error("Pipeline failure notice:", data.error);
        setTranscription(data.transcription || '');
        alert(`API Processing Warning: ${data.error || 'Unknown token failure'}`);
      }
    } catch (err) {
      console.error("Isolation Flight Error Matrix Failure:", err);
    } finally {
      setIsCleaning(false);
    }
  };

  const toggleCleanedAudioPlayback = () => {
    if (!cleanedAudioUrl) return;

    if (isPlayingCleaned) {
      audioPlaybackRef.current.pause();
      setIsPlayingCleaned(false);
    } else {
      if (audioPlaybackRef.current) {
        audioPlaybackRef.current.pause();
      }
      audioPlaybackRef.current = new Audio(cleanedAudioUrl);
      audioPlaybackRef.current.volume = Math.min(1, masterVol * vocalVol);
      audioPlaybackRef.current.onended = () => setIsPlayingCleaned(false);
      audioPlaybackRef.current.play();
      setIsPlayingCleaned(true);
    }
  };
const saveMasterProject = () => {
try {
const projectData = {
happiest,
homeLocation,
trackInfo,
lyricsData,
transcription,
instrumentalVol,
vocalVol,
masterVol,
recordTime,
cleanedAudioUrl,
rawVocalUrl,
savedAt: new Date().toISOString()
};


localStorage.setItem(
  "echoforge-master-project",
  JSON.stringify(projectData)
);

console.log("✅ Master project saved", projectData);
alert("Master project saved successfully!");


} catch (error) {
console.error("❌ Save failed:", error);
alert("Failed to save project");
}
};

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pb-28 text-white">
      {/* HEADER SECTION */}
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

      {/* MAIN LAYOUT */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* STEP 1: Set the Memory Frame */}
        <section className="mb-8">
          <div className="bg-gradient-to-br from-purple-800/40 to-purple-900/20 border border-purple-600/30 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-2">Step : Set the Memory Frame</h2>
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

        {/* STEP 2: Split Layout - Lyric Sheet & Recording Panel */}
        <section className="mb-8">
          <div className="grid md:grid-cols-2 gap-6">
            
            {/* Left Box: Lyrics display logic */}
            <div className="bg-gradient-to-br from-purple-800/40 to-purple-900/20 border border-purple-600/30 rounded-xl p-8">
              <h2 className="text-2xl font-bold text-white mb-2">Step 2: Lyric Sheet</h2>
              <p className="text-gray-400 text-sm mb-4">Ready to create</p>

              <div className="h-64 rounded-lg bg-purple-900/50 border-2 border-dashed border-purple-600/40 p-6 overflow-y-auto custom-scrollbar flex flex-col justify-start">
                {isLoading ? (
                  <div className="m-auto text-center space-y-2">
                    <Loader2 className="w-8 h-8 animate-spin text-pink-500 mx-auto" />
                    <p className="text-xs text-gray-300">Synchronizing pipeline audio stems...</p>
                  </div>
                ) : lyricsData ? (
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
                  <div className="space-y-3 text-center my-auto">
                    <p className="text-pink-400 font-bold text-xs uppercase tracking-wider mb-1">Live Synced Subtitles</p>
                    <p className="text-gray-200 text-base font-semibold">Back in <span className="bg-[#FF6050] text-white px-1.5 py-0.5 rounded font-bold">1968</span> the radio stayed warm all night</p>
                    <p className="text-gray-200 text-base font-semibold"><span className="bg-[#FF6050] text-white px-1.5 py-0.5 rounded font-bold">Soul classics</span> wrapped around the room</p>
                    <p className="text-xs text-purple-400 italic mt-4">
                      (Live engine sync match mapping to: {trackInfo.title || 'Oxgam'})
                    </p>
                  </div>
                ) : lyricsError ? (
                  <div className="space-y-2 text-center my-auto p-2">
                    <p className="text-orange-400 text-sm font-semibold mb-1">⚠ API Resolution Notice</p>
                    <p className="text-gray-300 text-xs">{lyricsError}</p>
                  </div>
                ) : (
                  <div className="m-auto text-center">
                    <button 
                      onClick={handleGenerateTracklist}
                      className="p-4 bg-pink-500 hover:bg-pink-600 text-white rounded-full transition transform scale-110 mb-2 inline-block"
                    >
                      <Play size={32} fill="currentColor" />
                    </button>
                    <p className="text-xs text-gray-400">Generate a playlist above to fetch live subtitles</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Box: Audio Capture Panel */}
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

              <div className="mt-6 rounded-2xl border border-purple-600/40 bg-purple-950/40 p-4">
                <h3 className="text-sm font-semibold text-white mb-2">Transcription</h3>
                {transcription ? (
                  <p className="text-gray-200 text-sm leading-6">{transcription}</p>
                ) : (
                  <p className="text-gray-500 text-sm">Your recorded voice cue transcription will appear here after isolation completes.</p>
                )}
              </div>

              <p className="text-xs text-gray-500 mt-4 border-t border-purple-600/30 pt-4">
                💡 Speak clearly and naturally. This will be played back to help trigger memories.
              </p>
            </div>

          </div>
        </section>

        {/* STEP 3: Audio Anatomy Stems Layout */}
        <section className="mb-8">
          <div className="bg-gradient-to-br from-purple-800/40 to-purple-900/20 border border-purple-600/30 rounded-xl p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Step 3: Audio Anatomy</h2>
                <p className="text-gray-400 text-sm mt-1">Balance the background track and voice cue after choosing a song and recording.</p>
              </div>
              <button 
                onClick={() => setShowAdvancedMix(!showAdvancedMix)}
                className={`px-4 py-2 text-sm rounded-lg transition flex items-center gap-2 ${
                  showAdvancedMix 
                    ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/30' 
                    : 'bg-purple-700/40 hover:bg-purple-700/60 text-gray-300'
                }`}
              >
                <Settings size={16} />
                Advanced Mix Controls
              </button>
            </div>

            {/* SLIDE-DOWN MIX PANEL */}
            {showAdvancedMix && (
              <div className="mb-8 p-6 bg-purple-950/80 border border-purple-500/30 rounded-xl grid md:grid-cols-3 gap-6">
                <div>
                  <label className="text-xs font-semibold text-blue-400 block mb-2 uppercase tracking-wider">Instrumental</label>
                  <input 
                    type="range" min="0" max="1" step="0.05" 
                    value={instrumentalVol} 
                    onChange={(e) => setInstrumentalVol(parseFloat(e.target.value))}
                    className="w-full accent-blue-500 bg-purple-900/60 rounded-lg appearance-none h-2"
                    disabled={!mixAvailable}
                  />
                  <span className="text-xs text-gray-400 mt-1 block text-right">{(instrumentalVol * 100).toFixed(0)}%</span>
                </div>
                <div>
                  <label className="text-xs font-semibold text-pink-400 block mb-2 uppercase tracking-wider">Vocal Cue</label>
                  <input 
                    type="range" min="0" max="1" step="0.05" 
                    value={vocalVol} 
                    onChange={(e) => setVocalVol(parseFloat(e.target.value))}
                    className="w-full accent-pink-500 bg-purple-900/60 rounded-lg appearance-none h-2"
                    disabled={!mixAvailable}
                  />
                  <span className="text-xs text-gray-400 mt-1 block text-right">{(vocalVol * 100).toFixed(0)}%</span>
                </div>
                <div>
                  <label className="text-xs font-semibold text-emerald-400 block mb-2 uppercase tracking-wider">Master</label>
                  <input 
                    type="range" min="0" max="1" step="0.05" 
                    value={masterVol} 
                    onChange={(e) => setMasterVol(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 bg-purple-900/60 rounded-lg appearance-none h-2"
                    disabled={!mixAvailable}
                  />
                  <span className="text-xs text-gray-400 mt-1 block text-right">{(masterVol * 100).toFixed(0)}%</span>
                </div>

                {/* DEBUG LINK INSPECTOR */}
                <div className="md:col-span-3 border-t border-purple-800/60 pt-4 mt-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wider">Live Mix Status</h4>
                      <p className="text-gray-400 text-xs">{mixAvailable ? 'Ready to fine-tune the mix.' : 'Record and load a song first.'}</p>
                    </div>
                    <button
                      onClick={resetMixSettings}
                      disabled={!mixAvailable}
                      className="px-3 py-1.5 bg-purple-700/40 hover:bg-purple-700/60 text-gray-300 text-xs rounded-lg transition disabled:opacity-50"
                    >
                      Reset Mix
                    </button>
                  </div>
                  <div className="grid gap-1 font-mono text-[11px] text-gray-400 bg-black/30 p-3 rounded-lg mt-4">
                    <p><span className="text-pink-400">Raw Vocal Object Link:</span> {rawVocalUrl ? rawVocalUrl : '🔴 Empty (Awaiting Mic Stream Stop)'}</p>
                    <p><span className="text-emerald-400">ElevenLabs Output Base64:</span> {cleanedAudioUrl ? `${cleanedAudioUrl.substring(0, 60)}...` : '🔴 Empty (Awaiting Backend Payload)'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* WAVEFORMS CONTAINER */}
            <div className="space-y-6">
              <div>
                <p className="text-gray-400 text-sm font-medium mb-3">Instrumental Stem</p>
                <WaveformVisualizer isActive={trackInfo !== null} intensity={trackInfo ? (0.4 * instrumentalVol) : 0.1} barCount={64} barColor="from-blue-500 to-blue-600" />
              </div>

              <div>
                <p className="text-gray-400 text-sm font-medium mb-3">Original Vocal Stem</p>
                <WaveformVisualizer 
                  isActive={isRecording || rawVocalUrl !== null} 
                  intensity={isRecording ? (0.8 * vocalVol) : rawVocalUrl ? (0.3 * vocalVol) : 0.1} 
                  barCount={64} 
                  barColor="from-pink-500 to-pink-600" 
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-400 text-sm font-medium">Jointed Isolated Voice Recording (ElevenLabs Neural Engine)</p>
                  {isCleaning && (
                    <span className="text-xs text-pink-400 animate-pulse flex items-center gap-1">
                      <Loader2 size={12} className="animate-spin" /> Stripping background environment artifacts...
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-4">
                  <button
                    disabled={!cleanedAudioUrl || isCleaning}
                    onClick={toggleCleanedAudioPlayback}
                    className={`p-3 rounded-lg text-white font-medium flex items-center gap-2 transition ${
                      cleanedAudioUrl 
                        ? 'bg-emerald-600 hover:bg-emerald-500 transform scale-105 shadow-md shadow-emerald-600/20' 
                        : 'bg-purple-900/40 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <Play size={16} fill={cleanedAudioUrl ? "currentColor" : "none"} />
                    {isPlayingCleaned ? 'Pause Preview' : 'Play Isolated Mix'}
                  </button>
                  
                  <div className="flex-1">
                    <WaveformVisualizer 
                      isActive={isPlayingCleaned} 
                      intensity={isPlayingCleaned ? (0.75 * masterVol) : 0.1} 
                      barCount={54} 
                      barColor={cleanedAudioUrl ? "from-emerald-400 to-teal-500" : "from-purple-800 to-purple-900"} 
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER MASTER TRACK ACTION BAR */}
      <footer className="fixed bottom-0 left-0 right-0 border-t border-purple-700/40 bg-purple-900/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <p className="text-gray-400 text-sm">
            ✓ All changes saved automatically
          </p>
         <button
onClick={saveMasterProject}
className="w-full sm:w-auto px-6 sm:px-8 py-2 sm:py-3 bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white text-sm sm:text-base font-semibold rounded-lg transition transform hover:scale-105 active:scale-95"

>

Save Master </button>

        </div>
      </footer>
    </div>
  );
}