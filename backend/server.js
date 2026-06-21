const express = require("express");
const cors = require("cors");
const axios = require("axios");
const multer = require("multer");
require("dotenv").config();

const app = express();
const upload = multer({ limits: { fileSize: 100 * 1024 * 1024 } }); // 100MB limit

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

console.log("\n==================================================");
console.log("🎵 SONGSTATS API KEY:", process.env.SONGSTATS_API_KEY ? "✅ YES" : "❌ NO");
console.log("🎙️ ELEVENLABS API KEY:", process.env.ELEVENLABS_API_KEY ? "✅ YES" : "❌ NO");
console.log("🎼 MUSIXMATCH KEY:", process.env.MUSIXMATCH_API_KEY ? "✅ YES" : "❌ NO");
console.log("==================================================\n");

/**
 * SONGSTATS SEARCH ROUTE
 */
app.get("/api/songstats/search", async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) return res.status(400).json({ result: "error", message: "Search query required" });

    const response = await axios.get("https://api.songstats.com/enterprise/v1/tracks/search", {
      params: { q: query },
      headers: { apikey: process.env.SONGSTATS_API_KEY, Accept: "application/json" }
    });

    const results = response.data?.results || [];
    const firstTrack = results[0];
    if (!firstTrack) return res.json({ result: "error", message: "No tracks found", track_info: null, stats: [] });

    const trackOptions = results.slice(0, 10).map((item) => ({
      title: item.title || "",
      artists: item.artists || [],
      release_date: item.release_date || "",
      songstats_track_id: item.songstats_track_id || "",
      avatar: item.avatar || "",
      site_url: item.site_url || "",
    }));

    return res.json({
      result: "success",
      track_info: {
        title: firstTrack.title || "",
        artists: firstTrack.artists || [],
        release_date: firstTrack.release_date || "",
        songstats_track_id: firstTrack.songstats_track_id || "",
        avatar: firstTrack.avatar || "",
        site_url: firstTrack.site_url || "",
      },
      track_options: trackOptions,
      stats: [
        { name: "Track ID", value: firstTrack.songstats_track_id || "N/A" },
        { name: "Release Date", value: firstTrack.release_date || "N/A" },
        { name: "Artist Count", value: firstTrack.artists?.length || 0 },
        { name: "Label Count", value: firstTrack.labels?.length || 0 },
      ],
    });
  } catch (error) {
    return res.status(500).json({ result: "error", message: "Songstats API failed" });
  }
});

/**
 * MUSIXMATCH LYRICS ROUTE
 */
app.get("/api/lyrics", async (req, res) => {
  try {
    const { artist, track } = req.query;
    if (!artist || !track) return res.status(400).json({ result: "error", message: "Parameters required" });

    const MUSIXMATCH_API_KEY = process.env.MUSIXMATCH_API_KEY;
    if (!MUSIXMATCH_API_KEY) {
      return res.json({ result: "success", track_id: "FALLBACK", lyrics_data: [{ time: "00:00", text: "Add API Key" }] });
    }

    const searchResponse = await axios.get(`https://api.musixmatch.com/ws/1.1/track.search`, {
      params: { q_artist: artist, q_track: track, f_has_subtitle: 1, apikey: MUSIXMATCH_API_KEY }
    });

    const trackList = searchResponse.data?.message?.body?.track_list;
    if (!trackList || trackList.length === 0) {
      return res.json({
        result: "success",
        track_id: "FALLBACK_ID",
        lyrics_data: [
          { time: "00:00", text: `🎵 [Now Streaming: ${track} by ${artist}]` },
          { time: "00:06", text: "♪ (Studio Audio Stem Stream Active) ♪" }
        ]
      });
    }

    const musixmatchTrackId = trackList[0].track.track_id;
    const subtitleResponse = await axios.get(`https://api.musixmatch.com/ws/1.1/track.subtitle.get`, {
      params: { track_id: musixmatchTrackId, subtitle_format: "json", apikey: MUSIXMATCH_API_KEY }
    });

    let parsedLyrics = [];
    const subtitleBody = subtitleResponse.data?.message?.body?.subtitle;
    if (subtitleBody && subtitleBody.subtitle_body) {
      try {
        parsedLyrics = typeof subtitleBody.subtitle_body === "string" ? JSON.parse(subtitleBody.subtitle_body) : subtitleBody.subtitle_body;
      } catch (e) {
        parsedLyrics = [{ text: subtitleBody.subtitle_body }];
      }
    }
    return res.json({ result: "success", track_id: musixmatchTrackId, lyrics_data: parsedLyrics });
  } catch (error) {
    return res.json({ result: "success", track_id: "FALLBACK", lyrics_data: [] });
  }
});

/**
 * ELEVENLABS AUDIO ISOLATION ROUTE
 */
app.post("/api/elevenlabs/isolate", upload.single("voiceRecord"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No audio file uploaded." });
    }

    const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
    if (!ELEVENLABS_API_KEY) {
      console.warn('No ELEVENLABS_API_KEY found; ElevenLabs isolation will be skipped.');
    }

    console.log("🎙️ [ElevenLabs] Processing raw voice recording buffer through Isolation Engine...");

    // Try ElevenLabs isolation if key is present. If it fails (permissions or otherwise), continue to transcription fallback.
    let cleanedAudioUrl = null;
    try {
      if (ELEVENLABS_API_KEY) {
        const apiFormData = new (require("form-data"))();
        apiFormData.append("audio", req.file.buffer, {
          filename: "user-reflection.webm",
          contentType: "audio/webm",
        });

        const response = await axios.post(
          "https://api.elevenlabs.io/v1/audio-isolation",
          apiFormData,
          {
            headers: {
              ...apiFormData.getHeaders(),
              "xi-api-key": ELEVENLABS_API_KEY,
            },
            responseType: "arraybuffer",
          }
        );

        // Turn processed binary audio output back into clean base64 data for HTML5 player
        const base64Audio = Buffer.from(response.data, "binary").toString("base64");
        cleanedAudioUrl = `data:audio/mp3;base64,${base64Audio}`;
        console.log("✨ [ElevenLabs] Voice isolation complete!");
      }
    } catch (eleErr) {
      console.error('ElevenLabs isolation failed:', eleErr.response?.data || eleErr.message);
      // don't throw - we'll try transcription fallback below
    }

    // --- Transcription fallback using OpenAI Whisper (if configured) ---
    let transcription = '';
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (OPENAI_API_KEY) {
      try {
        const openaiForm = new (require('form-data'))();
        openaiForm.append('file', req.file.buffer, { filename: 'user-reflection.webm' });
        openaiForm.append('model', 'whisper-1');

        const openResp = await axios.post('https://api.openai.com/v1/audio/transcriptions', openaiForm, {
          headers: {
            ...openaiForm.getHeaders(),
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        });

        transcription = openResp.data?.text || '';
        console.log('✨ OpenAI transcription complete.');
      } catch (openErr) {
        console.error('OpenAI transcription failed:', openErr.response?.data || openErr.message);
      }
    } else {
      console.warn('No OPENAI_API_KEY present; transcription fallback skipped.');
    }

    const success = Boolean(cleanedAudioUrl);
    return res.json({ success, cleanedAudioUrl, transcription });
  } catch (error) {
    console.error("❌ ElevenLabs Pipeline Error:", error.response?.data?.toString() || error.message);
    return res.status(500).json({ success: false, error: error.message, transcription: '' });
  }
});

app.use((req, res) => res.status(404).json({ message: "Not found" }));

app.listen(PORT, () => {
  console.log(`🚀 EchoForge Backend Active on Port ${PORT}`);
});