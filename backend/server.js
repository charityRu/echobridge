const express = require("express");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = 5000;

console.log(
  "SONGSTATS API KEY LOADED:",
  process.env.SONGSTATS_API_KEY ? "YES" : "NO"
);

/**
 * SONGSTATS SEARCH ROUTE
 */
app.get("/api/songstats/search", async (req, res) => {
  try {
    const query = req.query.q;

    if (!query) {
      return res.status(400).json({
        result: "error",
        message: "Search query required",
      });
    }

    console.log("Incoming query:", query);

    const response = await axios.get(
      "https://api.songstats.com/enterprise/v1/tracks/search",
      {
        params: {
          q: query,
        },
        headers: {
          apikey: process.env.SONGSTATS_API_KEY,
          Accept: "application/json",
        },
      }
    );

    console.log("Songstats response received");

    const data = response.data;
    const firstTrack = data?.results?.[0];

    if (!firstTrack) {
      return res.json({
        result: "error",
        message: "No tracks found",
        track_info: null,
        stats: [],
      });
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
        {
          name: "Track ID",
          value: firstTrack.songstats_track_id || "N/A",
        },
        {
          name: "Release Date",
          value: firstTrack.release_date || "N/A",
        },
        {
          name: "Artist Count",
          value: firstTrack.artists?.length || 0,
        },
        {
          name: "Label Count",
          value: firstTrack.labels?.length || 0,
        },
      ],
    });

  } catch (error) {
    console.log("\n========== SONGSTATS ERROR ==========");
    console.log("STATUS:", error.response?.status);
    console.log("DATA:", error.response?.data);
    console.log("MESSAGE:", error.message);
    console.log(
      "API KEY EXISTS:",
      !!process.env.SONGSTATS_API_KEY
    );
    console.log("====================================\n");

    return res.status(500).json({
      result: "error",
      message: "Songstats API failed",
    });
  }
});

/**
 * TEST ROUTE
 */
app.get("/api/test-songstats", async (req, res) => {
  try {
    const response = await axios.get(
      "https://api.songstats.com/enterprise/v1/tracks/search",
      {
        params: {
          q: "Michael Jackson",
        },
        headers: {
          apikey: process.env.SONGSTATS_API_KEY,
          Accept: "application/json",
        },
      }
    );

    res.json(response.data);

  } catch (error) {
    res.status(500).json({
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});