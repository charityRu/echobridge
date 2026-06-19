const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const audioPath = path.join(__dirname, 'test-audio.webm');
if (!fs.existsSync(audioPath)) {
  console.error(`Missing test audio file at ${audioPath}`);
  process.exit(1);
}

async function run() {
  const form = new FormData();
  form.append('voiceRecord', fs.createReadStream(audioPath), 'test-audio.webm');

  console.log('=== ElevenLabs isolation route test ===');
  try {
    const res = await axios.post('http://localhost:5000/api/elevenlabs/isolate', form, {
      headers: { ...form.getHeaders() },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      validateStatus: () => true
    });
    console.log('status', res.status);
    console.log('data', res.data);
  } catch (err) {
    console.error('error', err.response?.status, err.response?.data || err.message);
  }
}

run();
