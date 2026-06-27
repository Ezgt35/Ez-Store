const https = require('https');
const url = 'https://fhdyzyklqixgvmvhajfs.supabase.co/functions/v1/create-payment';
const auth = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoZHl6eWtscWl4Z3ZtdmhhamZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0OTExMTksImV4cCI6MjA5ODA2NzExOX0.FDLdj95Uvk2ZRIxiaDuMqK_jqHEA3ossyfWJEsvRaaQ';
const body = JSON.stringify({ orderId: '0f5e9247-d8f9-40c8-a1d6-9d249164802b', amount: 100 });
const options = new URL(url);
options.method = 'POST';
options.headers = {
  'Content-Type': 'application/json',
  Authorization: auth,
  'Content-Length': Buffer.byteLength(body),
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('STATUS', res.statusCode);
    console.log('HEADERS', JSON.stringify(res.headers, null, 2));
    console.log('BODY', data);
  });
});
req.on('error', (err) => {
  console.error('REQ ERROR', err);
});
req.write(body);
req.end();
