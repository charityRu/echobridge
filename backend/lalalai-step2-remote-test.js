const axios = require('axios');
const FormData = require('form-data');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const key = process.env.LALALAI_LICENSE_KEY;
if (!key) {
  console.error('Missing LALALAI_LICENSE_KEY in backend/.env');
  process.exit(1);
}

const sourceId = 'dcc2cbe7-dd8f-47bf-b71d-26a3a62d2037';

async function testMultipart() {
  const form = new FormData();
  form.append('source_id', sourceId);
  form.append('split_input', JSON.stringify({ presets: ['voice_clean'] }));
  const headers = { ...form.getHeaders(), 'X-License-Key': key };
  const length = await new Promise((resolve, reject) => {
    form.getLength((err, len) => {
      if (err) return reject(err);
      resolve(len);
    });
  });
  headers['Content-Length'] = length;

  console.log('=== multipart/form-data test ===');
  try {
    const res = await axios.post('https://www.lalal.ai/api/v1/split/voice_clean/', form, {
      headers,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      validateStatus: () => true
    });
    console.log('status', res.status);
    console.log('data', res.data);
  } catch (err) {
    console.error('error', err.message);
  }
}

async function testUrlencoded() {
  const params = new URLSearchParams();
  params.append('source_id', sourceId);
  params.append('split_input', JSON.stringify({ presets: ['voice_clean'] }));

  console.log('=== application/x-www-form-urlencoded test ===');
  try {
    const res = await axios.post('https://www.lalal.ai/api/v1/split/voice_clean/', params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-License-Key': key
      },
      validateStatus: () => true
    });
    console.log('status', res.status);
    console.log('data', res.data);
  } catch (err) {
    console.error('error', err.message);
  }
}

(async () => {
  await testMultipart();
  await testUrlencoded();
})();
