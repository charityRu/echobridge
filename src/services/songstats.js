// getting the API key from .env
const API_KEY = process.env.REACT_APP_SONGSTATS_API_KEY;

// simple test function
// purpose: verify that React can talk to Songstats
export async function testSongstats() {
  try {

    console.log("Testing Songstats connection...");

    // sending request to Songstats
    const response = await fetch(
      "https://api.songstats.com/enterprise/v1/tracks/stats?isrc=USSM12209777",
      {
        headers: {
          apikey: API_KEY,
          Accept: "application/json",
        },
      }
    );

    console.log("HTTP Status:", response.status);

    // converting response into JSON
    const data = await response.json();

    console.log("SONGSTATS RESPONSE:", data);

    return data;

  } catch (error) {

    console.error(
      "Songstats connection failed:",
      error
    );

  }
}