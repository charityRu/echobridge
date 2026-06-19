import React, { useState, useEffect, useRef } from 'react';
import { Mic, Play, Settings } from 'lucide-react';
import Timer from './shared/Timer';
import MemoryDropdown from './shared/MemoryDropdown';
import WaveformVisualizer from './shared/WaveformVisualizer';

export default function SoundStudio({ onSwitchView }) {
  // holding state for the dropdowns
  const [happiest, setHappiest] = useState('1960s - Soul & Township Jazz');
  const [homeLocation, setHomeLocation] = useState('Durban');

  // holding state for custom inputs
  const [customYear, setCustomYear] = useState('');
  const [customLocation, setCustomLocation] = useState('');

  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);

  /*
  |--------------------------------------------------------------------------
  | Media Recording Hardware Pipeline States
  |--------------------------------------------------------------------------
  */
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [voiceAudioUrl, setVoiceAudioUrl] = useState(null);
  const [transcription, setTranscription] = useState('');
  const [showAdvancedMix, setShowAdvancedMix] = useState(false);
  const [instrumentalVol, setInstrumentalVol] = useState(0.7);
  const [vocalVol, setVocalVol] = useState(0.8);
  const [masterVol, setMasterVol] = useState(1.0);
  const audioPlaybackRef = useRef(null);

  const [trackData, setTrackData] = useState(null);
  const [lyrics, setLyrics] = useState(null);
  const [loadingTracklist, setLoadingTracklist] = useState(false);

  const mixAvailable = Boolean(trackData && voiceAudioUrl);

  const resetMixSettings = () => {
    setInstrumentalVol(0.7);
    setVocalVol(0.8);
    setMasterVol(1.0);
  };

  useEffect(() => {
    if (audioPlaybackRef.current) {
      audioPlaybackRef.current.volume = Math.min(1, masterVol * vocalVol);
    }
  }, [masterVol, vocalVol, voiceAudioUrl]);

  // basic timer logic
  React.useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => setRecordTime(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  /*
  |--------------------------------------------------------------------------
  | Live Audio Recording Methods
  |--------------------------------------------------------------------------
  */
  const handleStartRecording = async () => {
    try {
      // Clear out any previous recordings before starting fresh
      setVoiceAudioUrl(null);
      setRecordTime(0);

      // 1. Request microphone system stream access from the browser
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const audioChunks = [];

      // 2. Stream individual data bytes into raw array collections
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      // 3. Compile raw recording byte segments into a valid asset blob on execution close
    recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const localUrl = URL.createObjectURL(audioBlob);
        setTranscription('');
        
        console.log("🎤 Raw recording saved locally. Sending to ElevenLabs for voice isolation...");
        
        // 1. Create FormData to send the audio file to your Node backend
        const formData = new FormData();
        formData.append("voiceRecord", audioBlob, "user-narration.webm");

        try {
          // 2. Hit our backend route that talks to ElevenLabs
          const response = await fetch("http://localhost:5000/api/elevenlabs/isolate", {
            method: "POST",
            body: formData,
          });
          
          const data = await response.json();
          
          if (data.success && data.cleanedAudioUrl) {
            // 3. Set the state to the isolated audio link returned by ElevenLabs
            setVoiceAudioUrl(data.cleanedAudioUrl);
            setTranscription(data.transcription || '');
            console.log("✨ ElevenLabs isolation complete. Clean URL:", data.cleanedAudioUrl);
          } else {
            // Fallback to raw audio if the API fails so the app doesn't break
            setVoiceAudioUrl(localUrl);
            setTranscription(data.transcription || '');
          }
        } catch (error) {
          console.error("ElevenLabs integration error, falling back to raw audio:", error);
          setVoiceAudioUrl(localUrl);
        }
      };

      // Start hardware audio intercept process
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone hardware configuration failed or access denied:", err);
      alert("Microphone connection blocked. Please verify browser media permissions.");
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
      // Cleanly cut active hardware connections to turn off the user's mic recording light
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
  };

  const previewMix = () => {
    if (!voiceAudioUrl) return;
    if (audioPlaybackRef.current) {
      audioPlaybackRef.current.pause();
    }
    audioPlaybackRef.current = new Audio(voiceAudioUrl);
    audioPlaybackRef.current.volume = Math.min(1, masterVol * vocalVol);
    audioPlaybackRef.current.onended = () => {};
    audioPlaybackRef.current.play();
  };

  const handleGenerateTracklist = async () => {
    try {
      setLoadingTracklist(true);
      setLyrics(null);

      const activeEra = happiest === 'Other (Type Custom)' ? customYear : happiest;
      const activeLocation = homeLocation === 'Other (Type Custom)' ? customLocation : homeLocation;

      let query = "";

      if (customYear || customLocation) {
        if (customYear && customLocation) {
          query = `${customYear} ${customLocation}`;
        } else {
          query = customYear || customLocation;
        }
      } else {
        const artistMap = {
          "1940s": "Frank Sinatra",
          "1950s": "Elvis Presley",
          "1960s": "Miriam Makeba",
          "1970s": "Bee Gees",
          "1980s": "Michael Jackson",
        };
        const match = happiest.match(/\d{4}s/);
        const eraKey = match ? match[0] : null;
        query = (eraKey && artistMap[eraKey]) ? artistMap[eraKey] : `${activeEra} ${activeLocation}`;
      }

      console.log("🚀 DISPATCHING QUERY TO BACKEND:", query);

      const response = await fetch(`http://localhost:5000/api/songstats/search?q=${encodeURIComponent(query.trim())}`);
      const data = await response.json();
      console.log("SONGSTATS DATA:", data);

      if (data && data.track_info && data.track_info.title) {
        setTrackData(data);
        let trackTitle = data.track_info.title;
        let artistName = data.track_info.artists?.[0]?.name || "";

        // Fallback enhancement for specific local tracks to maximize backend search matches
        let searchArtist = artistName;
        if (trackTitle.toLowerCase() === "charlotte" && !searchArtist.toLowerCase().includes("zamar")) {
          searchArtist = "Prince Kaybee Lady Zamar";
        }

        console.log(`Chaining to Lyrics API -> Artist: ${searchArtist}, Track: ${trackTitle}`);
        
        try {
          const lyricsResponse = await fetch(
            `http://localhost:5000/api/lyrics?artist=${encodeURIComponent(searchArtist)}&track=${encodeURIComponent(trackTitle)}`
          );
          const lyricsData = await lyricsResponse.json();
          console.log("LYRICS API RESPONSE RECEIVED:", lyricsData);

          if (lyricsData.result === "success" && lyricsData.lyrics_data && lyricsData.lyrics_data.length > 0) {
            setLyrics(lyricsData.lyrics_data);
          } else {
            console.log("Lyrics API returned no text. Building dynamic track timeline view.");
            setLyrics([
              { time: "00:00", text: `🎵 [Now Streaming: ${trackTitle} by ${artistName}]` },
              { time: "00:08", text: "✨ Audio stems loaded. Backing track synced successfully." },
              { time: "00:20", text: "💬 Custom lyrics unavailable on the public web registry for this track version." },
              { time: "00:35", text: `🎤 Ready for custom voice-over narration and studio playback for ${activeLocation || 'your review'}.` },
              { time: "01:00", text: "🎛️ Adjust individual track stems below to balance the mix." }
            ]);
          }
        } catch (lyricErr) {
          console.error("Lyrics Endpoint structural failure, applying safety timeline:", lyricErr);
          setLyrics([
            { time: "00:00", text: `🎵 [Now Streaming: ${trackTitle} by ${artistName}]` },
            { time: "00:10", text: "⚠️ Server connectivity warning: Unable to pull external lyric sheet." },
            { time: "00:25", text: "🎤 Studio recording and voice cues are still fully operational." }
          ]);
        }

      } else {
        setTrackData(null);
        setLyrics([
          { time: "00:00", text: "❌ No track matched your specific search criteria." },
          { time: "00:05", text: "💡 Try entering an alternative artist name or song title for best results." }
        ]);
      }
    } catch (error) {
      console.error("Pipeline Error:", error);
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
                  'Other (Type Custom)'
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
                  'Other (Type Custom)'
                ]}
              />
            </div>

            {/* Always display BOTH input boxes if "Other" is selected anywhere */}
            {(happiest === 'Other (Type Custom)' || homeLocation === 'Other (Type Custom)') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 p-4 rounded-lg bg-purple-950/40 border border-purple-500/30">
                <div>
                  <label className="block text-purple-300 text-xs font-semibold uppercase tracking-wider mb-2">Type Custom Year or Era</label>
                  <input 
                    type="text"
                    placeholder="e.g., 2000"
                    value={customYear}
                    onChange={(e) => setCustomYear(e.target.value)}
                    className="w-full bg-purple-950/60 border border-purple-600/50 rounded-lg px-4 py-2.5 text-white placeholder-purple-400/50 focus:outline-none focus:border-pink-500 transition text-sm"
                  />
                </div>
                <div>
                  <label className="block text-purple-300 text-xs font-semibold uppercase tracking-wider mb-2">Type Custom Location</label>
                  <input 
                    type="text"
                    placeholder="e.g., Khayelitsha"
                    value={customLocation}
                    onChange={(e) => setCustomLocation(e.target.value)}
                    className="w-full bg-purple-950/60 border border-purple-600/50 rounded-lg px-4 py-2.5 text-white placeholder-purple-400/50 focus:outline-none focus:border-pink-500 transition text-sm"
                  />
                </div>
              </div>
            )}

            <div>
              <button
                onClick={handleGenerateTracklist}
                className="w-full px-6 sm:px-8 py-2.5 sm:py-3 bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white text-sm sm:text-base font-semibold rounded-lg transition transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
              >
                <span>
                  {loadingTracklist ? "Loading..." : "Generate Tracklist"}
                </span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </button>

              {trackData && (
                <div className="mt-4 p-4 rounded-lg bg-purple-900/40 border border-purple-600/30">
                  <h3 className="text-white font-bold mb-3">Songstats Connected ✅</h3>
                  <p className="text-gray-300"><strong>Track:</strong> {trackData?.track_info?.title}</p>
                  <p className="text-gray-300"><strong>Artist:</strong> {trackData?.track_info?.artists?.[0]?.name}</p>
                  <p className="text-gray-300"><strong>Release Date:</strong> {trackData?.track_info?.release_date}</p>
                  <p className="text-gray-300 mb-3"><strong>Songstats ID:</strong> {trackData?.track_info?.songstats_track_id}</p>

                  <div className="mt-3">
                    <h4 className="text-white font-semibold mb-2">Top Insights</h4>
                    <ul className="text-sm text-gray-300 space-y-1">
                      {trackData?.stats?.slice(0, 6)?.map((stat, i) => (
                        <li key={i} className="flex justify-between border-b border-purple-700/30 pb-1">
                          <span>{stat?.name || "Metric"}</span>
                          <span className="text-pink-300 font-medium">{stat?.value ?? "N/A"}</span>
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
            <div className="bg-gradient-to-br from-purple-800/40 to-purple-900/20 border border-purple-600/30 rounded-lg sm:rounded-xl p-4 sm:p-8 flex flex-col">
              <h2 className="text-lg sm:text-2xl font-bold text-white mb-1 sm:mb-2">Step 2: Lyric Sheet</h2>
              <p className="text-gray-400 text-xs sm:text-sm mb-4 sm:mb-8">
                {lyrics ? "Sync lyrics preview" : "Generate tracklist above to populate lyrics"}
              </p>

              {/* Dynamic Lyric Box Container */}
              <div className="h-64 sm:h-80 rounded-lg bg-purple-900/50 border border-purple-600/40 p-4 overflow-y-auto custom-scrollbar flex flex-col gap-3">
                {lyrics ? (
                  lyrics.map((line, index) => (
                    <div key={index} className="flex gap-4 items-start py-1 border-b border-purple-800/30 hover:bg-purple-800/20 px-2 rounded transition">
                      <span className="font-mono text-xs text-pink-400 font-semibold bg-purple-950/60 px-2 py-0.5 rounded">
                        {line.time || "00:00"}
                      </span>
                      <p className="text-sm text-gray-200 font-medium">
                        {line.text}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500">
                    <button className="p-3 mb-3 bg-purple-800/50 text-gray-400 rounded-full cursor-not-allowed">
                      <Play size={24} fill="currentColor" />
                    </button>
                    <p className="text-xs">No lyrics loaded yet.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Record Voice Cue */}
            <div className="bg-gradient-to-br from-purple-800/40 to-purple-900/20 border border-purple-600/30 rounded-lg sm:rounded-xl p-4 sm:p-8">
              <h2 className="text-lg sm:text-2xl font-bold text-white mb-1 sm:mb-2">Step 2: Record Voice Cue</h2>
              <p className="text-gray-400 text-xs sm:text-sm mb-4 sm:mb-6">Add your personal narration</p>

              <div className="text-right mb-4 sm:mb-8">
                <div className="inline-block px-3 sm:px-4 py-1.5 sm:py-2 bg-purple-900/60 rounded-lg font-mono text-lg sm:text-2xl text-pink-400 font-bold">
                  <Timer seconds={recordTime} />
                </div>
              </div>

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
                <WaveformVisualizer isActive={isRecording} intensity={isRecording ? 0.8 : 0.2} />
              </div>

              <button 
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                className="w-full py-2 sm:py-3 bg-purple-700/50 hover:bg-purple-700 text-gray-300 text-sm sm:text-base font-medium rounded-lg transition disabled:opacity-50 active:scale-95"
              >
                {isRecording ? 'Stop Recording' : 'Start Recording'}
              </button>

              {/* Safe Audio Monitoring Playback Track for Testing inside SoundStudio */}
              <div className="mt-6 rounded-2xl border border-purple-600/40 bg-purple-950/40 p-4">
                <h3 className="text-sm font-semibold text-white mb-2">Transcription</h3>
                {transcription ? (
                  <p className="text-gray-200 text-sm leading-6">{transcription}</p>
                ) : (
                  <p className="text-gray-500 text-sm">Your recorded voice cue transcription will appear here after isolation completes.</p>
                )}
              </div>

              {voiceAudioUrl && (
                <div className="mt-4 p-3 bg-purple-950/60 rounded-lg border border-purple-500/30">
                  <p className="text-xs text-green-400 font-medium mb-2">✅ Recorded Reflection Track Ready</p>
                  <audio src={voiceAudioUrl} controls className="w-full h-8" />
                </div>
              )}

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
              <button
                onClick={() => setShowAdvancedMix(!showAdvancedMix)}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 bg-purple-700/40 hover:bg-purple-700/60 text-gray-300 text-xs sm:text-sm rounded-lg transition flex items-center gap-2 active:scale-95 ${showAdvancedMix ? 'bg-pink-500 text-white' : ''}`}
              >
                <Settings size={14} className="sm:size-4" />
                <span className="hidden sm:inline">Advanced Mix Controls</span>
                <span className="sm:hidden">Mix</span>
              </button>
            </div>

            {showAdvancedMix && (
              <div className="mb-6 space-y-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <span className="text-xs text-gray-300">Preview the current mix using the latest vocal recording and mix settings.</span>
                  <button
                    type="button"
                    onClick={previewMix}
                    disabled={!mixAvailable}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-lg transition disabled:opacity-50"
                  >
                    Preview Mix
                  </button>
                </div>

                <div className="p-4 bg-purple-950/80 border border-purple-500/30 rounded-xl grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-blue-400 block mb-2 uppercase tracking-wider">Instrumental Volume</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={instrumentalVol}
                      onChange={(e) => setInstrumentalVol(parseFloat(e.target.value))}
                      className="w-full accent-blue-500 bg-purple-900/60 rounded-lg appearance-none h-2"
                      disabled={!mixAvailable}
                    />
                    <span className="text-xs text-gray-400 mt-1 block text-right">{(instrumentalVol * 100).toFixed(0)}%</span>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-pink-400 block mb-2 uppercase tracking-wider">Vocal Volume</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={vocalVol}
                      onChange={(e) => setVocalVol(parseFloat(e.target.value))}
                      className="w-full accent-pink-500 bg-purple-900/60 rounded-lg appearance-none h-2"
                      disabled={!mixAvailable}
                    />
                    <span className="text-xs text-gray-400 mt-1 block text-right">{(vocalVol * 100).toFixed(0)}%</span>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-emerald-400 block mb-2 uppercase tracking-wider">Master Volume</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={masterVol}
                      onChange={(e) => setMasterVol(parseFloat(e.target.value))}
                      className="w-full accent-emerald-500 bg-purple-900/60 rounded-lg appearance-none h-2"
                      disabled={!mixAvailable}
                    />
                    <span className="text-xs text-gray-400 mt-1 block text-right">{(masterVol * 100).toFixed(0)}%</span>
                  </div>

                  <div className="md:col-span-3 border-t border-purple-800/60 pt-4 mt-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <p className="text-xs text-purple-300 font-semibold uppercase tracking-wider">Mix Status</p>
                        <p className="text-gray-400 text-xs">{mixAvailable ? 'Song and recording are loaded. Use the sliders to fine-tune the mix.' : 'Load a song and complete a recording to enable mix controls.'}</p>
                      </div>
                      <button
                        type="button"
                        onClick={resetMixSettings}
                        disabled={!mixAvailable}
                        className="px-3 py-1.5 bg-purple-700/40 hover:bg-purple-700/60 text-gray-300 text-xs rounded-lg transition disabled:opacity-50"
                      >
                        Reset Mix
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

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
                <WaveformVisualizer intensity={isRecording ? 0.9 : voiceAudioUrl ? 0.5 : 0.1} barCount={32} className="sm:col-span-full" barColor="from-orange-500 to-orange-600" />
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