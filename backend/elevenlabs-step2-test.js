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
  const length = await new Promise((resolve, reject) => {
    form.getLength((err, len) => {
      if (err) return reject(err);
      resolve(len);
    });
  });
  headers['Content-Length'] = length;

  console.log('Headers:', headers);
  console.log('Body preview:');
  console.log(form.getBuffer().toString('utf8').slice(0, 1024));

  try {
    const res = await axios.post('http://localhost:5000/api/elevenlabs/isolate', form, {
      headers: { ...form.getHeaders() },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    console.log('Response status:', res.status);
    console.log('Response data:', res.data);
  } catch (err) {
    console.error('Request failed:', err.response?.status, err.response?.data || err.message);
  }
}

run();
