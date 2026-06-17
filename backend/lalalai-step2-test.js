const axios = require('axios');
const FormData = require('form-data');

async function run() {
  const sourceId = 'test-source-id-1234';
  const form = new FormData();
  form.append('source_id', sourceId);
  form.append('split_input', JSON.stringify({ presets: ['voice_clean'] }));

  const headers = {
    ...form.getHeaders(),
    'X-License-Key': 'TEST'
  };
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
    const res = await axios.post('https://www.lalal.ai/api/v1/split/voice_clean/', form, {
      headers,
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
