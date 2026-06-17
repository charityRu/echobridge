const express = require("express");
const cors = require("cors");
const axios = require("axios");
const multer = require("multer");

// Load environment variables cleanly
require("dotenv").config();

const app = express();
const upload = multer(); 

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

console.log("\n==================================================");
console.log(
  "🎵 SONGSTATS API KEY LOADED:",
  process.env.SONGSTATS_API_KEY ? "✅ YES" : "❌ NO"
);
console.log("==================================================\n");

/**
 * SONGSTATS SEARCH ROUTE
 */
app.get("/api/songstats/search", async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.status(400).json({ result: "error", message: "Search query required" });
    }

    console.log(`[Songstats] Incoming track search query: "${query}"`);

    const response = await axios.get(
      "https://api.songstats.com/enterprise/v1/tracks/search",
      {
        params: { q: query },
        headers: {
          apikey: process.env.SONGSTATS_API_KEY,
          Accept: "application/json",
        },
      }
    );

    const data = response.data;
    const firstTrack = data?.results?.[0];

    if (!firstTrack) {
      return res.json({ result: "error", message: "No tracks found", track_info: null, stats: [] });
    }

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
    if (!artist || !track) {
      return res.status(400).json({ result: "error", message: "Both artist and track parameters are required" });
    }

    const MUSIXMATCH_API_KEY = process.env.MUSIXMATCH_API_KEY || '6f39fae7c9977823fbd37f1b1c67623a';
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

    const subtitleBody = subtitleResponse.data?.message?.body?.subtitle;
    let parsedLyrics = [];

    if (subtitleBody && subtitleBody.subtitle_body) {
      try {
        parsedLyrics = typeof subtitleBody.subtitle_body === "string" 
          ? JSON.parse(subtitleBody.subtitle_body) 
          : subtitleBody.subtitle_body;
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
 * LALAL.AI VOICE CLEANER ROUTE
 */
app.post("/api/lalalai/clean", upload.single("voiceRecord"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No audio file uploaded." });
    }

    const LALALAI_LICENSE_KEY = process.env.LALALAI_LICENSE_KEY;
    if (!LALALAI_LICENSE_KEY) {
      throw new Error("Missing LALALAI_LICENSE_KEY token.");
    }

    console.log("🤖 [LALAL.AI] Step 1: Uploading audio stream...");
    const uploadRes = await fetch("https://www.lalal.ai/api/v1/upload/", {
      method: "POST",
      headers: {
        "X-License-Key": LALALAI_LICENSE_KEY,
        "Content-Disposition": `attachment; filename="user-reflection.webm"`,
        "Content-Type": "application/octet-stream"
      },
      body: req.file.buffer
    });

    const uploadData = await uploadRes.json();
    if (uploadData.status === "error" || !uploadRes.ok) {
      throw new Error(`Upload failed: ${uploadData.error || "Unknown error"}`);
    }

    const sourceId = uploadData.id;
    console.log(`🤖 [LALAL.AI] Step 2: Split setup for ID: ${sourceId}`);

    const urlParams = new URLSearchParams();
    urlParams.append("source_id", sourceId);
    urlParams.append("split_input", JSON.stringify({ presets: ["voice_clean"] }));

    const splitResponse = await fetch("https://www.lalal.ai/api/v1/split/voice_clean/", {
      method: "POST",
      headers: {
        "X-License-Key": LALALAI_LICENSE_KEY,
        "Content-Type": "application/x-www-form-urlencoded" 
      },
      body: urlParams.toString()
    });

    const splitData = await splitResponse.json();
    if (splitData.status === "error" || !splitResponse.ok) {
      throw new Error(`Split worker failed: ${JSON.stringify(splitData)}`);
    }

    console.log(`🤖 [LALAL.AI] Step 3: Polling queue...`);
    let isComplete = false;
    let cleanedAudioUrl = "";
    let pollingAttempts = 0;

    while (!isComplete && pollingAttempts < 15) {
      await new Promise((resolve) => setTimeout(resolve, 2500));
      pollingAttempts++;

      const checkRes = await fetch(`https://www.lalal.ai/api/v1/check/?id=${sourceId}`);
      const checkData = await checkRes.json();

      if (checkData.status === "error") throw new Error(checkData.error);

      if (checkData.task && (checkData.task.state === "success" || checkData.task.state === "complete")) {
        isComplete = true;
        cleanedAudioUrl = checkData.split?.voice_cleaner || checkData.split?.vocals || checkData.split?.voice_clean;
      } else if (checkData.split && (checkData.split.voice_cleaner || checkData.split.voice_clean || checkData.split.vocals)) {
        isComplete = true;
        cleanedAudioUrl = checkData.split.voice_cleaner || checkData.split.voice_clean || checkData.split.vocals;
      }
    }

    if (!cleanedAudioUrl) throw new Error("Processing timed out.");

    console.log("✨ [LALAL.AI] Cleaned track ready:", cleanedAudioUrl);
    return res.json({ success: true, cleanedAudioUrl: cleanedAudioUrl });

  } catch (error) {
    console.error("❌ Backend LALAL.AI Failure:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.use((req, res) => res.status(404).json({ message: "Not found" }));

app.listen(PORT, () => {
  console.log("==================================================");
  console.log(`🚀 EchoForge Backend Active: http://localhost:${PORT}`);
  console.log("==================================================\n");
});