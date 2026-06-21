import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause } from 'lucide-react';

const BACKUP_AUDIO_URLS = [
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
];

export default function PatientView({ onSwitchView, initialMasterSession }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [backgroundAudioEl, setBackgroundAudioEl] = useState(null);
  const [overlayAudioEl, setOverlayAudioEl] = useState(null);
  const [activeLyricIndex, setActiveLyricIndex] = useState(0);
  const [overlayTriggered, setOverlayTriggered] = useState(false);
  const lyricScrollRef = useRef(null);
  const lyricLineRefs = useRef([]);

  // ================================
  // PROJECT STATE (from Save Master)
  // ================================
  const [project, setProject] = useState(initialMasterSession || null);

  const safeBackgroundUrl =
    initialMasterSession?.backgroundTrackUrl ||
    initialMasterSession?.backupTrackUrls?.[0] ||
    BACKUP_AUDIO_URLS[0];

  // ================================
  // LOAD + LIVE SYNC FIX
  // ================================
  useEffect(() => {
    const loadProject = () => {
      try {
        const saved = localStorage.getItem("echoforge-master-project");
        if (saved) {
          setProject(JSON.parse(saved));
        }
      } catch (err) {
        console.error("Failed to load project:", err);
      }
    };

    if (!initialMasterSession) {
      loadProject();
    }

    // 🔥 live update listener (same tab + future updates)
    const handleUpdate = () => loadProject();

    window.addEventListener("storage", handleUpdate);
    window.addEventListener("echoforge-update", handleUpdate);

    return () => {
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("echoforge-update", handleUpdate);
    };
  }, [initialMasterSession]);

  useEffect(() => {
    return () => {
      if (backgroundAudioEl) {
        backgroundAudioEl.pause();
      }
      if (overlayAudioEl) {
        overlayAudioEl.pause();
      }
    };
  }, [backgroundAudioEl, overlayAudioEl]);

  useEffect(() => {
    if (!backgroundAudioEl) return;

    const onTimeUpdate = () => {
      if (backgroundAudioEl.duration > 0) {
        const nextProgress = (backgroundAudioEl.currentTime / backgroundAudioEl.duration) * 100;
        setProgress(nextProgress);

        const timeline = project?.timelineLyrics || [];
        if (timeline.length > 0) {
          const currentSeconds = backgroundAudioEl.currentTime;
          let matched = 0;
          for (let i = 0; i < timeline.length; i += 1) {
            if ((timeline[i]?.seconds ?? 0) <= currentSeconds) {
              matched = i;
            }
          }
          setActiveLyricIndex(matched);
        }

        if (
          !overlayTriggered &&
          nextProgress >= 50 &&
          overlayAudioEl
        ) {
          overlayAudioEl.currentTime = 0;
          overlayAudioEl.play().catch((err) => {
            console.error('[EchoForge][Patient][OverlayPlayError]', err);
          });
          setOverlayTriggered(true);
          console.log('[EchoForge][Patient][OverlayTrigger] Fired at >= 50% timeline progress.');
        }
      }
    };

    const onEnded = () => {
      setIsPlaying(false);
      setProgress(100);
      setOverlayTriggered(false);
      if (overlayAudioEl) {
        overlayAudioEl.pause();
        overlayAudioEl.currentTime = 0;
      }
    };

    const onAudioError = () => {
      console.warn('[EchoForge][Patient][BackgroundError] falling back to backup URL');
      const backup = project?.backupTrackUrls?.[0] || BACKUP_AUDIO_URLS[0];
      if (backgroundAudioEl.src !== backup) {
        backgroundAudioEl.src = backup;
        backgroundAudioEl.load();
      }
    };

    backgroundAudioEl.addEventListener('timeupdate', onTimeUpdate);
    backgroundAudioEl.addEventListener('ended', onEnded);
    backgroundAudioEl.addEventListener('error', onAudioError);

    return () => {
      backgroundAudioEl.removeEventListener('timeupdate', onTimeUpdate);
      backgroundAudioEl.removeEventListener('ended', onEnded);
      backgroundAudioEl.removeEventListener('error', onAudioError);
    };
  }, [backgroundAudioEl, overlayAudioEl, overlayTriggered, project]);

  useEffect(() => {
    const activeLine = lyricLineRefs.current[activeLyricIndex];
    if (activeLine) {
      activeLine.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeLyricIndex]);

  useEffect(() => {
    const bgSource = project?.backgroundTrackUrl || project?.backupTrackUrls?.[0] || safeBackgroundUrl;
    const vocalSource = project?.cleanedAudioUrl || project?.rawVocalUrl || null;

    try {
      const bg = new Audio(bgSource);
      bg.volume = Math.min(1, (project?.mix?.masterVol ?? 1) * (project?.mix?.instrumentalVol ?? 0.7));
      bg.preload = 'auto';
      setBackgroundAudioEl(bg);

      if (vocalSource) {
        const overlay = new Audio(vocalSource);
        overlay.volume = Math.min(1, (project?.mix?.masterVol ?? 1) * (project?.mix?.vocalVol ?? 0.8));
        overlay.preload = 'auto';
        setOverlayAudioEl(overlay);
      } else {
        setOverlayAudioEl(null);
      }

      console.log('[EchoForge][Patient][AudioInit]', {
        hasBackground: Boolean(bgSource),
        hasOverlay: Boolean(vocalSource),
      });
    } catch (err) {
      console.error('[EchoForge][Patient][AudioInitError]', err);
    }
  }, [project, safeBackgroundUrl]);

  // ================================
  // PLAY STATE
  // ================================
  const handlePlayPause = () => {
    try {
      if (!backgroundAudioEl) {
        setIsPlaying((prev) => !prev);
        return;
      }

      if (isPlaying) {
        backgroundAudioEl.pause();
        if (overlayAudioEl) {
          overlayAudioEl.pause();
        }
        setIsPlaying(false);
      } else {
        backgroundAudioEl.play().catch((err) => {
          console.error('[EchoForge][Patient][BackgroundPlayError]', err);
        });
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('[EchoForge][Patient][PlayPauseError]', err);
    }
  };

  // ================================
  // SAFE DERIVED DATA
  // ================================
  const trackTitle =
    project?.trackInfo?.title || "Memory Session";

  const sessionYear =
    project?.happiest?.match(/\d{4}/)?.[0] || project?.customYear?.match(/\d{4}/)?.[0] || "1968";

  const genre =
    project?.happiest?.split(" - ")[1] || "Soul Classics";

  const lyricsLines = project?.lyricsLines?.length
    ? project.lyricsLines.slice(0, 4)
    : [
        `Back in ${sessionYear} the radio stayed warm all night`,
        `${genre} wrapped around the room`,
      ];

  const timelineLines = project?.timelineLyrics?.length
    ? project.timelineLyrics
    : lyricsLines.map((line, idx) => ({
        time: `${String(Math.floor((idx * 6) / 60)).padStart(2, '0')}:${String((idx * 6) % 60).padStart(2, '0')}`,
        seconds: idx * 6,
        text: line,
      }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">

      {/* HEADER */}
      <header className="border-b border-purple-700/40 bg-purple-900/30 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">

          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wider">
              Session Now Playing
            </p>

            <p className="text-white text-sm sm:text-lg font-semibold">
              {trackTitle} • {genre}
            </p>
          </div>

          <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-emerald-500/20 rounded-full border border-emerald-500/50">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
            <span className="text-emerald-300 text-xs sm:text-sm font-medium">
              Connected
            </span>
          </div>

        </div>
      </header>

      {/* MAIN DISPLAY */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">

        <div className="w-full max-w-2xl">

          <div className="bg-gradient-to-br from-purple-800/40 to-purple-900/20 border border-purple-600/30 rounded-lg sm:rounded-2xl p-6 sm:p-12 md:p-16">

            <div className="space-y-4 sm:space-y-8 text-center">

              <p className="text-3xl sm:text-5xl md:text-6xl font-black text-white leading-tight">
                Back in{' '}
                <span className="bg-gradient-to-r from-pink-500 to-orange-500 text-white px-2 sm:px-4 py-1 sm:py-2 rounded-lg inline-block mx-1 sm:mx-2">
                  {sessionYear}
                </span>
                {' '}the radio stayed warm all night
              </p>

              <p className="text-2xl sm:text-4xl md:text-5xl font-black text-gray-200 leading-tight">
                <span className="bg-gradient-to-r from-blue-500 to-cyan-400 text-white px-2 sm:px-4 py-1 sm:py-2 rounded-lg inline-block mx-1 sm:mx-2 mb-2 sm:mb-4">
                  {genre}
                </span>
                {' '}wrapped around the room
              </p>

              <div
                ref={lyricScrollRef}
                className="mx-auto mt-2 max-h-[34vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-purple-500/20 bg-black/15 px-4 py-5 sm:px-6 sm:py-6 custom-scrollbar"
              >
                <div className="space-y-3 text-center">
                  {timelineLines.map((line, idx) => {
                    const isActiveLine = idx === activeLyricIndex;

                    return (
                      <p
                        key={`${line.time}-${idx}`}
                        ref={(element) => {
                          lyricLineRefs.current[idx] = element;
                        }}
                        className={`mx-auto max-w-2xl rounded-xl px-3 py-2 text-sm sm:text-lg md:text-xl leading-relaxed transition-all duration-300 ${
                          isActiveLine
                            ? 'bg-pink-500/20 text-pink-200 shadow-lg shadow-pink-500/10 scale-[1.02]'
                            : 'text-gray-400'
                        }`}
                      >
                        <span className="block text-[10px] sm:text-xs uppercase tracking-[0.3em] text-gray-500 mb-1">
                          {line.time}
                        </span>
                        <span>{line.text}</span>
                      </p>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>

        </div>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-purple-700/40 bg-purple-900/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">

          {/* PROGRESS BAR */}
          <div className="mb-4 sm:mb-6">
            <div className="relative h-1 bg-purple-800/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-pink-500 to-orange-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>

            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={(e) => {
                const nextProgress = Number(e.target.value);
                setProgress(nextProgress);
                if (backgroundAudioEl && backgroundAudioEl.duration > 0) {
                  backgroundAudioEl.currentTime = (nextProgress / 100) * backgroundAudioEl.duration;
                }
              }}
              className="w-full mt-2 opacity-0 h-8 cursor-pointer"
              style={{ position: 'relative', top: '-16px' }}
            />
          </div>

          {/* CONTROLS */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">

            <button
              onClick={handlePlayPause}
              className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition transform hover:scale-110 active:scale-95 ${
                isPlaying
                  ? 'bg-gradient-to-br from-pink-500 to-orange-500 shadow-lg shadow-pink-500/50'
                  : 'bg-gradient-to-br from-pink-400 to-orange-400 shadow-lg shadow-pink-400/50'
              }`}
            >
              {isPlaying ? (
                <Pause size={32} className="text-white" fill="white" />
              ) : (
                <Play size={32} className="text-white" fill="white" />
              )}
            </button>

            <div className="text-gray-300 font-medium text-center sm:text-left">
              <p className="text-xs uppercase tracking-wider text-gray-500">
                Memory Timeline
              </p>
              <p className="text-base sm:text-lg">
                {progress}% complete
              </p>
            </div>

          </div>

          {/* BACK BUTTON */}
          <div className="mt-4 sm:mt-6 text-center">
            <button
              onClick={onSwitchView}
              className="text-gray-400 hover:text-gray-200 text-xs sm:text-sm transition"
            >
              ← Back to Sound Studio
            </button>
          </div>

        </div>
      </footer>

    </div>
  );
}