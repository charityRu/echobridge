import React, { useState, useRef, useEffect } from 'react';
import { Mic, Play, Settings, Loader2 } from 'lucide-react';
import Timer from './shared/Timer';
import MemoryDropdown from './shared/MemoryDropdown';
import WaveformVisualizer from './shared/WaveformVisualizer';

const API_TIMEOUT_MS = 9000;
const SOUNDHELIX_BACKUP_TRACKS = [
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
];

const LOCAL_FALLBACK_LIBRARY = [
  {
    title: 'Moonlight Dancefloor',
    artists: [{ name: 'Michael Jackson' }],
    release_date: '1983',
    songstats_track_id: 'fallback-michael-jackson-demo',
    backgroundAudioUrl: SOUNDHELIX_BACKUP_TRACKS[0],
    fallback_lyrics: [
      'Neon lights are glowing, footsteps hit the floor',
      'Midnight rhythm calling, hearts are wanting more',
      'When the bassline wakes the windows, every shadow starts to dance',
      'Spin into the spotlight, let the moment take a chance',
      'Echoes in the hallway, moonlight on the mirror frame',
      'Every hand is lifted when the chorus calls your name',
      'Feel the room remember every spark you ever gave',
      'Keep the beat alive and let the summer night behave',
      'Side by side we move as one through every shining door',
      'Till the music folds us gently back into the floor',
      'Every beat remembers, your hand in mine',
    ],
  },
  {
    title: 'Backstreet Soul Memory',
    artists: [{ name: 'EchoForge Local Ensemble' }],
    release_date: '1968',
    songstats_track_id: 'fallback-township-jazz-1968',
    backgroundAudioUrl: SOUNDHELIX_BACKUP_TRACKS[0],
    fallback_lyrics: [
      'Back in 1968 the radio stayed warm all night',
      'Soul classics wrapped around the room',
      'Streetlights glowed while voices sang in time',
      'Every chorus carried home again',
    ],
  },
  {
    title: 'Township Brass Sunset',
    artists: [{ name: 'Local Township Jazz Collective' }],
    release_date: '1966',
    songstats_track_id: 'fallback-township-jazz-1966',
    backgroundAudioUrl: SOUNDHELIX_BACKUP_TRACKS[1],
    fallback_lyrics: [
      'Trumpets rising through the summer dusk',
      'Township rhythm moves from door to door',
      'Hands keep time with every passing verse',
      'Memory echoes on the dance floor',
    ],
  },
];

const RESEARCHED_GAUTENG_1980_TRACK = {
  title: 'Paradise Road',
  artists: [{ name: 'Joy (South African group)' }],
  release_date: '1980',
  songstats_track_id: 'fallback-paradise-road-1980-gauteng',
  avatar: '',
  site_url: '',
  source_note: 'Researched fallback: recorded in 1980; first major performance memory in Sharpeville (Gauteng).',
};

const RESEARCHED_GAUTENG_1980_LYRICS = [
  'Road of hope, keep the night alight',
  'Gauteng skies carry every voice tonight',
  'Hold each memory close, step by step',
  'Better days ahead, we sing as one',
].join('\n');

function trackId(track, idx = 0) {
  return track?.songstats_track_id || `${track?.title || 'track'}-${track?.release_date || idx}`;
}

function parseTimeToSeconds(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const parts = timeStr.split(':').map((x) => Number(x));
  if (parts.some(Number.isNaN)) return null;
  if (parts.length === 2) return (parts[0] * 60) + parts[1];
  if (parts.length === 3) return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
  return null;
}

async function fetchJsonWithTimeout(url, timeoutMs = API_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  } finally {
    clearTimeout(timeoutId);
  }
}

export default function SoundStudio({ onSwitchView }) {
  const [happiest, setHappiest] = useState('1960s - Soul & Township Jazz');
  const [homeLocation, setHomeLocation] = useState('Durban');
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);

  const [customYear, setCustomYear] = useState('');
  const [customLocation, setCustomLocation] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [trackInfo, setTrackInfo] = useState(null);
  const [trackOptions, setTrackOptions] = useState([]);
  const [selectedTrackId, setSelectedTrackId] = useState('');
  const [lyricsData, setLyricsData] = useState(null);
  const [timelineLyrics, setTimelineLyrics] = useState([]);
  const [, setLyricsError] = useState('');
  const [lyricsText, setLyricsText] = useState('');

  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanedAudioUrl, setCleanedAudioUrl] = useState(null);
  const [isPlayingCleaned, setIsPlayingCleaned] = useState(false);
  const [isPlayingMaster, setIsPlayingMaster] = useState(false);
  const [isSpeakingPreview, setIsSpeakingPreview] = useState(false);
  const [speechVoices, setSpeechVoices] = useState([]);
  const [selectedSpeechVoice, setSelectedSpeechVoice] = useState('');
  const [speechRate, setSpeechRate] = useState(0.95);
  const [transcription, setTranscription] = useState('');

  const [rawVocalUrl, setRawVocalUrl] = useState(null);

  const [showAdvancedMix, setShowAdvancedMix] = useState(false);
  const [instrumentalVol, setInstrumentalVol] = useState(0.7);
  const [vocalVol, setVocalVol] = useState(0.8);
  const [masterVol, setMasterVol] = useState(1.0);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioPlaybackRef = useRef(null);
  const backgroundMixRef = useRef(null);
  const vocalMixRef = useRef(null);

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

    if (backgroundMixRef.current) {
      backgroundMixRef.current.volume = Math.min(1, masterVol * instrumentalVol);
    }

    if (vocalMixRef.current) {
      vocalMixRef.current.volume = Math.min(1, masterVol * vocalVol);
    }
  }, [masterVol, vocalVol, instrumentalVol]);

  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => setRecordTime((prev) => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    return () => {
      if (audioPlaybackRef.current) {
        audioPlaybackRef.current.pause();
      }

      if (backgroundMixRef.current) {
        backgroundMixRef.current.pause();
      }

      if (vocalMixRef.current) {
        vocalMixRef.current.pause();
      }
    };
  }, []);

  useEffect(() => {
    setIsPlayingMaster(false);
    if (backgroundMixRef.current) {
      backgroundMixRef.current.pause();
      backgroundMixRef.current = null;
    }
    if (vocalMixRef.current) {
      vocalMixRef.current.pause();
      vocalMixRef.current = null;
    }
  }, [trackInfo?.songstats_track_id, rawVocalUrl, cleanedAudioUrl]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const syncVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices() || [];
      setSpeechVoices(availableVoices);

      if (!selectedSpeechVoice && availableVoices.length > 0) {
        const preferred =
          availableVoices.find((voice) => /en/i.test(voice.lang) && /female|zira|samantha|heather|google/i.test(voice.name)) ||
          availableVoices.find((voice) => /en/i.test(voice.lang)) ||
          availableVoices[0];

        if (preferred) {
          setSelectedSpeechVoice(preferred.name);
        }
      }
    };

    syncVoices();
    window.speechSynthesis.addEventListener('voiceschanged', syncVoices);

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', syncVoices);
    };
  }, [selectedSpeechVoice]);

  const toLyricsText = (lines) => {
    if (!Array.isArray(lines)) return '';
    return lines
      .map((line) => (line?.text || line?.line || '').trim())
      .filter(Boolean)
      .join('\n');
  };

  const buildTimelineFromText = (text) => {
    const lines = text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 32);

    return lines.map((textLine, idx) => ({
      time: `${String(Math.floor((idx * 6) / 60)).padStart(2, '0')}:${String((idx * 6) % 60).padStart(2, '0')}`,
      seconds: idx * 6,
      text: textLine,
    }));
  };

  const buildTimelineFromPayload = (lines) => {
    if (!Array.isArray(lines)) return [];

    return lines
      .map((line, idx) => {
        const textLine = (line?.text || line?.line || '').trim();
        if (!textLine) return null;

        const seconds =
          Number.isFinite(line?.seconds)
            ? line.seconds
            : parseTimeToSeconds(line?.time || line?.timestamp) ?? idx * 6;

        return {
          time: line?.time || `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`,
          seconds,
          text: textLine,
        };
      })
      .filter(Boolean);
  };

  const fallbackLyricsForTrack = (track) => {
    const trackId = track?.songstats_track_id || '';
    if (trackId === RESEARCHED_GAUTENG_1980_TRACK.songstats_track_id) {
      return RESEARCHED_GAUTENG_1980_LYRICS;
    }

    if (Array.isArray(track?.fallback_lyrics) && track.fallback_lyrics.length > 0) {
      return track.fallback_lyrics.join('\n');
    }

    const title = track?.title || 'this song';
    const artist = track?.artists?.[0]?.name || track?.artists?.[0] || 'Unknown Artist';
    return [
      `Tonight we remember ${title}`,
      `With ${artist} guiding every beat`,
      'Hold this moment close and sing along',
      'Your story lives in every line',
    ].join('\n');
  };

  const applyLyricsPayload = (lyricsPayload, track) => {
    if (Array.isArray(lyricsPayload) && lyricsPayload.length > 0) {
      const mappedTimeline = buildTimelineFromPayload(lyricsPayload);
      setLyricsData(lyricsPayload);
      setTimelineLyrics(mappedTimeline);
      setLyricsText(toLyricsText(lyricsPayload));
      return;
    }
    const fallback = fallbackLyricsForTrack(track);
    setLyricsData(null);
    setTimelineLyrics(buildTimelineFromText(fallback));
    setLyricsText(fallback);
    setLyricsError('Live lyrics unavailable. Using editable fallback lyrics.');
  };

  const fetchLyricsForTrack = async (track) => {
    const mainArtist = track?.artists?.[0]?.name || track?.artists?.[0] || '';
    const mainTitle = track?.title || '';

    if (!mainArtist || !mainTitle) {
      applyLyricsPayload([], track);
      return;
    }

    try {
      const lyricsResponse = await fetchJsonWithTimeout(
        `http://localhost:5000/api/lyrics?artist=${encodeURIComponent(mainArtist)}&track=${encodeURIComponent(mainTitle)}`
      );
      const lyricsResult = lyricsResponse.data;

      if (lyricsResult.result === 'success') {
        applyLyricsPayload(lyricsResult.lyrics_data, track);
      } else {
        applyLyricsPayload([], track);
      }
    } catch (err) {
      console.error('Lyrics fetch error:', err);
      applyLyricsPayload([], track);
    }
  };

  const handleGenerateTracklist = async () => {
    setIsLoading(true);
    setLyricsError('');
    setLyricsData(null);
    setTrackInfo(null);
    setTrackOptions([]);
    setSelectedTrackId('');
    setTimelineLyrics([]);
    setLyricsText('');

    try {
      const activeEra = happiest === 'Other (Type Custom)' ? customYear : happiest;
      const activeLocation = homeLocation === 'Other (Type Custom)' ? customLocation : homeLocation;
      const searchQuery = `${activeEra} ${activeLocation}`;

      const songstatsResponse = await fetchJsonWithTimeout(
        `http://localhost:5000/api/songstats/search?q=${encodeURIComponent(searchQuery)}`
      );
      const songstatsData = songstatsResponse.data;

      console.log('[EchoForge][Step1][Songstats]', {
        query: searchQuery,
        status: songstatsResponse.status,
        ok: songstatsResponse.ok,
        result: songstatsData?.result,
      });

      if (songstatsData.result === 'success' && songstatsData.track_info) {
        const apiOptions = songstatsData.track_options?.length
          ? songstatsData.track_options
          : [songstatsData.track_info];

        const options = [
          RESEARCHED_GAUTENG_1980_TRACK,
          ...apiOptions.filter((track, idx) => {
            const id = trackId(track, idx);
            return id !== RESEARCHED_GAUTENG_1980_TRACK.songstats_track_id;
          }),
          ...LOCAL_FALLBACK_LIBRARY,
        ];

        const firstTrack = options[0];

        setTrackOptions(options);
        setTrackInfo(firstTrack);
        setSelectedTrackId(firstTrack.songstats_track_id || `${firstTrack.title}-${Date.now()}`);

        await fetchLyricsForTrack(firstTrack);
      } else {
        const fallbackTrack = RESEARCHED_GAUTENG_1980_TRACK;
        const fallbackOptions = [fallbackTrack, ...LOCAL_FALLBACK_LIBRARY];
        setTrackOptions(fallbackOptions);
        setTrackInfo(fallbackTrack);
        setSelectedTrackId(fallbackTrack.songstats_track_id);
        setLyricsData(null);
        setTimelineLyrics(buildTimelineFromText(RESEARCHED_GAUTENG_1980_LYRICS));
        setLyricsText(RESEARCHED_GAUTENG_1980_LYRICS);
        setLyricsError('No tracks found from API. Using researched 1980 Gauteng fallback track and editable fallback lyrics.');
      }
    } catch (err) {
      console.error('Pipeline Execution Error:', err);
      const fallbackTrack = RESEARCHED_GAUTENG_1980_TRACK;
      const fallbackOptions = [fallbackTrack, ...LOCAL_FALLBACK_LIBRARY];
      setTrackOptions(fallbackOptions);
      setTrackInfo(fallbackTrack);
      setSelectedTrackId(fallbackTrack.songstats_track_id);
      setLyricsData(null);
      setTimelineLyrics(buildTimelineFromText(RESEARCHED_GAUTENG_1980_LYRICS));
      setLyricsText(RESEARCHED_GAUTENG_1980_LYRICS);
      setLyricsError('Network failure reading APIs. Loaded researched fallback track and lyrics.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrackSelection = async (event) => {
    const nextId = event.target.value;
    setSelectedTrackId(nextId);

    const selected = trackOptions.find((track) => {
      const id = track.songstats_track_id || `${track.title}-${track.release_date}`;
      return id === nextId;
    });

    if (!selected) return;

    setTrackInfo(selected);
    if (selected.songstats_track_id === RESEARCHED_GAUTENG_1980_TRACK.songstats_track_id) {
      setLyricsData(null);
      setTimelineLyrics(buildTimelineFromText(RESEARCHED_GAUTENG_1980_LYRICS));
      setLyricsText(RESEARCHED_GAUTENG_1980_LYRICS);
      setLyricsError('Using researched fallback lyrics for this track. You can edit them.');
      return;
    }

    if (Array.isArray(selected.fallback_lyrics) && selected.fallback_lyrics.length > 0) {
      const localLyrics = selected.fallback_lyrics.join('\n');
      setLyricsData(null);
      setTimelineLyrics(buildTimelineFromText(localLyrics));
      setLyricsText(localLyrics);
      setLyricsError('Using local curated fallback lyrics. You can edit them.');
      return;
    }

    setLyricsError('');
    setLyricsData(null);
    await fetchLyricsForTrack(selected);
  };

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
        const localVoiceObjectUrl = URL.createObjectURL(rawAudioBlob);
        setRawVocalUrl(localVoiceObjectUrl);

        console.log('[EchoForge][Step2][RecordingCaptured]', {
          chunks: audioChunksRef.current.length,
          blobSize: rawAudioBlob.size,
        });

        await sendAudioForIsolation(rawAudioBlob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Hardware microphone access denied:', err);
      alert('Microphone device permissions are missing or blocked.');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
    }
  };

  const sendAudioForIsolation = async (audioBlob) => {
    setIsCleaning(true);
    setCleanedAudioUrl(null);
    setTranscription('');

    try {
      const formData = new FormData();
      formData.append('voiceRecord', audioBlob, 'user-reflection.webm');

      const response = await fetch('http://localhost:5000/api/elevenlabs/isolate', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.cleanedAudioUrl) {
        setCleanedAudioUrl(data.cleanedAudioUrl);
        setTranscription(data.transcription || '');
      } else {
        setTranscription(data.transcription || '');
      }

      console.log('[EchoForge][Step2][IsolationResult]', {
        success: data.success,
        hasCleanedAudio: Boolean(data.cleanedAudioUrl),
        hasTranscription: Boolean(data.transcription),
      });
    } catch (err) {
      console.error('Isolation error:', err);
    } finally {
      setIsCleaning(false);
    }
  };

  const toggleCleanedAudioPlayback = () => {
    const playableSource = cleanedAudioUrl || rawVocalUrl;
    if (!playableSource) return;

    if (isPlayingCleaned) {
      audioPlaybackRef.current.pause();
      setIsPlayingCleaned(false);
    } else {
      if (audioPlaybackRef.current) {
        audioPlaybackRef.current.pause();
      }
      audioPlaybackRef.current = new Audio(playableSource);
      audioPlaybackRef.current.volume = Math.min(1, masterVol * vocalVol);
      audioPlaybackRef.current.onended = () => setIsPlayingCleaned(false);
      audioPlaybackRef.current.play();
      setIsPlayingCleaned(true);
    }
  };

  const toggleSpeechPreview = () => {
    const previewText = transcription || lyricsText;
    if (!previewText || typeof window === 'undefined' || !window.speechSynthesis) return;

    if (isSpeakingPreview) {
      window.speechSynthesis.cancel();
      setIsSpeakingPreview(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(previewText);
    utterance.rate = speechRate;
    utterance.pitch = 1;
    const matchedVoice = speechVoices.find((voice) => voice.name === selectedSpeechVoice);
    if (matchedVoice) {
      utterance.voice = matchedVoice;
      utterance.lang = matchedVoice.lang || 'en-US';
    }
    utterance.onend = () => setIsSpeakingPreview(false);
    utterance.onerror = () => setIsSpeakingPreview(false);

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setIsSpeakingPreview(true);
  };

  const toggleMasterMixPlayback = async () => {
    const backgroundSource = trackInfo?.backgroundAudioUrl || SOUNDHELIX_BACKUP_TRACKS[0];
    const vocalSource = cleanedAudioUrl || rawVocalUrl;

    if (!trackInfo || !backgroundSource) {
      return;
    }

    if (isPlayingMaster) {
      if (backgroundMixRef.current) {
        backgroundMixRef.current.pause();
      }
      if (vocalMixRef.current) {
        vocalMixRef.current.pause();
      }
      setIsPlayingMaster(false);
      return;
    }

    try {
      const currentBackgroundSrc = backgroundMixRef.current?.src || '';
      if (!backgroundMixRef.current || !currentBackgroundSrc.includes(backgroundSource)) {
        backgroundMixRef.current = new Audio(backgroundSource);
        backgroundMixRef.current.onended = () => {
          setIsPlayingMaster(false);
          if (vocalMixRef.current) {
            vocalMixRef.current.pause();
          }
        };
      }

      backgroundMixRef.current.volume = Math.min(1, masterVol * instrumentalVol);
      await backgroundMixRef.current.play();

      if (vocalSource) {
        const currentVocalSrc = vocalMixRef.current?.src || '';
        if (!vocalMixRef.current || !currentVocalSrc.includes(vocalSource)) {
          vocalMixRef.current = new Audio(vocalSource);
        }

        vocalMixRef.current.currentTime = backgroundMixRef.current.currentTime;
        vocalMixRef.current.volume = Math.min(1, masterVol * vocalVol);
        vocalMixRef.current.play().catch((err) => {
          console.error('Master vocal playback warning:', err);
        });
      }

      setIsPlayingMaster(true);
    } catch (err) {
      console.error('Master mix playback failed:', err);
      setIsPlayingMaster(false);
    }
  };

  const handleSaveMaster = () => {
    const lines = lyricsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 32);

    const timeline = timelineLyrics.length > 0
      ? timelineLyrics.slice(0, 32)
      : buildTimelineFromText(lyricsText).slice(0, 32);

    const fallbackTrack = {
      title: 'Memory Session',
      artists: ['Unknown Artist'],
      release_date: '',
      backgroundAudioUrl: SOUNDHELIX_BACKUP_TRACKS[0],
    };

    const masterPayload = {
      savedAt: new Date().toISOString(),
      happiest,
      homeLocation,
      customYear,
      customLocation,
      trackInfo: trackInfo || fallbackTrack,
      lyricsLines: lines,
      timelineLyrics: timeline,
      lyricsSource: lyricsData?.length ? 'musixmatch' : 'fallback',
      transcription,
      rawVocalUrl,
      cleanedAudioUrl,
      backgroundTrackUrl: trackInfo?.backgroundAudioUrl || SOUNDHELIX_BACKUP_TRACKS[0],
      backupTrackUrls: SOUNDHELIX_BACKUP_TRACKS,
      mix: {
        instrumentalVol,
        vocalVol,
        masterVol,
      },
    };

    console.group('[EchoForge][MasterSave]');
    console.log('Metadata', {
      happiest,
      homeLocation,
      trackTitle: masterPayload.trackInfo?.title,
      lyricsLines: masterPayload.lyricsLines.length,
      timelineLines: masterPayload.timelineLyrics.length,
    });
    console.log('Audio', {
      hasBackgroundTrack: Boolean(masterPayload.backgroundTrackUrl),
      hasRawVocal: Boolean(masterPayload.rawVocalUrl),
      hasCleanedAudio: Boolean(masterPayload.cleanedAudioUrl),
    });
    console.groupEnd();

    localStorage.setItem('echoforge-master-project', JSON.stringify(masterPayload));
    window.dispatchEvent(new Event('echoforge-update'));
    onSwitchView(masterPayload);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pb-32 sm:pb-28 text-white">
      <header className="border-b border-purple-700/40 bg-purple-900/30 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-8 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-pink-400 to-orange-400 bg-clip-text text-transparent shrink-0">
              EchoForge
            </h1>
            <div className="flex gap-1 sm:gap-2 bg-purple-800/40 rounded-lg p-1 overflow-x-auto">
              <button className="px-3 sm:px-4 py-2 rounded-md bg-pink-500 text-white text-xs sm:text-sm font-medium whitespace-nowrap">
                Sound Studio
              </button>
              <button
                onClick={onSwitchView}
                className="px-3 sm:px-4 py-2 rounded-md text-gray-300 text-xs sm:text-sm font-medium hover:bg-purple-700/40 transition whitespace-nowrap"
              >
                Patient View
              </button>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-emerald-500/20 rounded-full border border-emerald-500/50">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
            <span className="text-emerald-300 text-sm font-medium">Live session</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <section className="mb-8">
          <div className="bg-gradient-to-br from-purple-800/40 to-purple-900/20 border border-purple-600/30 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-2">Step 1: Set the Memory Frame</h2>
            <p className="text-gray-400 text-sm mb-6">Choose the era and place that matters most, then choose a song.</p>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
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
                  'Other (Type Custom)',
                ]}
              />
              <MemoryDropdown
                label="Where did they call home?"
                value={homeLocation}
                onChange={setHomeLocation}
                options={['Durban', 'Johannesburg', 'Gauteng', 'Cape Town', 'Soweto', 'Pretoria', 'Other (Type Custom)']}
              />
            </div>

            {(happiest === 'Other (Type Custom)' || homeLocation === 'Other (Type Custom)') && (
              <div className="flex flex-col sm:flex-row gap-4 mb-6 p-4 rounded-xl bg-black/20 border border-purple-600/30">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-purple-300 uppercase mb-2">Custom Era or Year</label>
                  <input
                    type="text"
                    placeholder="e.g., 1990s or 1994"
                    value={customYear}
                    onChange={(e) => setCustomYear(e.target.value)}
                    className="w-full bg-purple-950/60 border border-purple-600/40 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-pink-500 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-purple-300 uppercase mb-2">Custom Location</label>
                  <input
                    type="text"
                    placeholder="e.g., Khayelitsha"
                    value={customLocation}
                    onChange={(e) => setCustomLocation(e.target.value)}
                    className="w-full bg-purple-950/60 border border-purple-600/40 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-pink-500 text-sm"
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleGenerateTracklist}
              disabled={isLoading}
              className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white font-semibold rounded-lg transition transform hover:scale-105 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Generating...</span>
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

            {trackOptions.length > 0 && (
              <div className="mt-5">
                <label className="block text-xs font-semibold text-purple-300 uppercase mb-2">Choose Song</label>
                <select
                  value={selectedTrackId}
                  onChange={handleTrackSelection}
                  className="w-full bg-purple-950/60 border border-purple-600/40 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-pink-500 text-sm"
                >
                  {trackOptions.map((track, idx) => {
                    const id = track.songstats_track_id || `${track.title}-${track.release_date || idx}`;
                    const artistLabel = track.artists?.[0]?.name || track.artists?.[0] || 'Unknown';
                    return (
                      <option key={id} value={id}>
                        {track.title} - {artistLabel}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {trackInfo && (
              <div className="mt-6 p-4 rounded-lg bg-purple-950/60 border border-purple-500/30 text-sm text-gray-200">
                <p className="text-emerald-400 font-bold mb-2">Song selected</p>
                <p>
                  <strong>Track:</strong> {trackInfo.title}
                </p>
                <p>
                  <strong>Artist:</strong> {trackInfo.artists?.[0]?.name || trackInfo.artists?.[0] || 'Unknown'}
                </p>
                <p>
                  <strong>Release Date:</strong> {trackInfo.release_date || 'N/A'}
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="mb-8">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-purple-800/40 to-purple-900/20 border border-purple-600/30 rounded-xl p-8">
              <h2 className="text-2xl font-bold text-white mb-2">Step 2: Lyric Sheet</h2>
              <p className="text-gray-400 text-sm mb-4">Live lyrics synced to your selected track</p>

              <textarea
                value={lyricsText}
                onChange={(e) => setLyricsText(e.target.value)}
                rows={12}
                placeholder="Type or edit lyrics here..."
                className="w-full rounded-lg bg-purple-900/50 border border-purple-600/40 p-4 text-sm text-gray-100 text-center focus:outline-none focus:border-pink-500"
              />
            </div>

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
                  <p className="text-gray-500 text-sm">Your transcription appears here after processing.</p>
                )}

                {rawVocalUrl && (
                  <div className="mt-3">
                    <p className="text-xs text-purple-300 mb-2">Recorded Voice Preview</p>
                    <audio controls src={rawVocalUrl} className="w-full" />
                  </div>
                )}

                {(transcription || lyricsText) && (
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={toggleSpeechPreview}
                      className={`px-3 py-1.5 text-xs rounded-lg transition ${
                        isSpeakingPreview
                          ? 'bg-pink-500 text-white'
                          : 'bg-purple-700/50 hover:bg-purple-700 text-gray-200'
                      }`}
                    >
                      {isSpeakingPreview ? 'Stop Speech Preview' : 'Play Speech Preview'}
                    </button>
                    <span className="text-xs text-gray-500">Reads the recorded/transcribed text aloud</span>
                  </div>
                )}

                {(transcription || lyricsText) && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-purple-300 mb-2">Voice</label>
                      <select
                        value={selectedSpeechVoice}
                        onChange={(e) => setSelectedSpeechVoice(e.target.value)}
                        className="w-full rounded-lg bg-purple-900/60 border border-purple-600/40 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-pink-500"
                      >
                        {speechVoices.length > 0 ? (
                          speechVoices.map((voice) => (
                            <option key={voice.name} value={voice.name}>
                              {voice.name} {voice.lang ? `(${voice.lang})` : ''}
                            </option>
                          ))
                        ) : (
                          <option value="">Default voice</option>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-purple-300 mb-2">Rate</label>
                      <input
                        type="range"
                        min="0.7"
                        max="1.2"
                        step="0.05"
                        value={speechRate}
                        onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                        className="w-full accent-pink-500 bg-purple-900/60 rounded-lg appearance-none h-2"
                      />
                      <div className="mt-1 text-right text-xs text-gray-400">{speechRate.toFixed(2)}x</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <div className="bg-gradient-to-br from-purple-800/40 to-purple-900/20 border border-purple-600/30 rounded-xl p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Step 3: Audio Anatomy</h2>
                <p className="text-gray-400 text-sm mt-1">Balance track and voice, then save master to Patient View.</p>
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

            {showAdvancedMix && (
              <div className="mb-8 p-6 bg-purple-950/80 border border-purple-500/30 rounded-xl grid md:grid-cols-3 gap-6">
                <div>
                  <label className="text-xs font-semibold text-blue-400 block mb-2 uppercase tracking-wider">Instrumental</label>
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
                  <label className="text-xs font-semibold text-pink-400 block mb-2 uppercase tracking-wider">Vocal Cue</label>
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
                  <label className="text-xs font-semibold text-emerald-400 block mb-2 uppercase tracking-wider">Master</label>
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

                <div className="md:col-span-3 border-t border-purple-800/60 pt-4 mt-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wider">Live Mix Status</h4>
                      <p className="text-gray-400 text-xs">{mixAvailable ? 'Ready to fine-tune the mix.' : 'Record and load a song first.'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={toggleMasterMixPlayback}
                        disabled={!trackInfo}
                        className="px-3 py-1.5 bg-emerald-700/50 hover:bg-emerald-600 text-gray-100 text-xs rounded-lg transition disabled:opacity-50"
                      >
                        {isPlayingMaster ? 'Pause Master Preview' : 'Play Master Preview'}
                      </button>
                      <button
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

            <div className="space-y-6">
              <div>
                <p className="text-gray-400 text-sm font-medium mb-3">Instrumental Stem</p>
                <WaveformVisualizer
                  isActive={trackInfo !== null}
                  intensity={trackInfo ? 0.4 * instrumentalVol : 0.1}
                  barCount={64}
                  barColor="from-blue-500 to-blue-600"
                />
              </div>

              <div>
                <p className="text-gray-400 text-sm font-medium mb-3">Original Vocal Stem</p>
                <WaveformVisualizer
                  isActive={isRecording || rawVocalUrl !== null}
                  intensity={isRecording ? 0.8 * vocalVol : rawVocalUrl ? 0.3 * vocalVol : 0.1}
                  barCount={64}
                  barColor="from-pink-500 to-pink-600"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-400 text-sm font-medium">Isolated Voice Recording</p>
                  {isCleaning && (
                    <span className="text-xs text-pink-400 animate-pulse flex items-center gap-1">
                      <Loader2 size={12} className="animate-spin" /> Processing...
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <button
                      disabled={!(cleanedAudioUrl || rawVocalUrl) || isCleaning}
                    onClick={toggleCleanedAudioPlayback}
                    className={`p-3 rounded-lg text-white font-medium flex items-center gap-2 transition ${
                      (cleanedAudioUrl || rawVocalUrl)
                        ? 'bg-emerald-600 hover:bg-emerald-500 transform scale-105 shadow-md shadow-emerald-600/20'
                        : 'bg-purple-900/40 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <Play size={16} fill={cleanedAudioUrl || rawVocalUrl ? 'currentColor' : 'none'} />
                    {isPlayingCleaned
                      ? 'Pause Preview'
                      : cleanedAudioUrl
                        ? 'Play Isolated Mix'
                        : 'Play Vocal Preview'}
                  </button>

                  <div className="flex-1">
                    <WaveformVisualizer
                      isActive={isPlayingCleaned}
                      intensity={isPlayingCleaned ? 0.75 * masterVol : 0.1}
                      barCount={54}
                      barColor={cleanedAudioUrl ? 'from-emerald-400 to-teal-500' : 'from-purple-800 to-purple-900'}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 border-t border-purple-700/40 bg-purple-900/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
          <p className="text-gray-400 text-xs sm:text-sm">Save your master mix to publish it to Patient View</p>
          <button
            onClick={handleSaveMaster}
            className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white font-semibold rounded-lg transition transform sm:scale-105 active:scale-95"
          >
            Save Master
          </button>
        </div>
      </footer>
    </div>
  );
}
