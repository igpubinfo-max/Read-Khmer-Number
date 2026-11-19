const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

const PORT = 3000;
const PUBLIC_DIR = path.join(__dirname, 'app');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }

  const filePath = path.join(PUBLIC_DIR, reqPath);
  
  // Security check: prevent directory traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const localIps = getLocalIpAddresses();
  const primaryIp = localIps[0] || 'localhost';

  console.log('\n================================================================');
  console.log('🇰🇭 កម្មវិធីអាន និងសរសេរចំនួនទឹកប្រាក់ជាអក្សរខ្មែរ');
  console.log('   Khmer Amount to Words Converter - Android & Web App');
  console.log('================================================================');
  console.log(`\n💻 Local PC Access:    http://localhost:${PORT}`);
  if (localIps.length > 0) {
    console.log(`📱 Android Phone Link: http://${primaryIp}:${PORT}`);
    console.log('\n📌 របៀបដំឡើងលើទូរស័ព្ទ Android:');
    console.log(`   1. ភ្ជាប់ទូរស័ព្ទទៅកាន់ Wi-Fi តែមួយ`);
    console.log(`   2. បើក Google Chrome ហើយចូលទៅកាន់: http://${primaryIp}:${PORT}`);
    console.log('   3. ចុចសញ្ញាចុចបី (⋮) នៅជ្រុងខាងស្តាំ');
    console.log('   4. ជ្រើសយក "Add to Home screen" ឬ "Install App"');
  }
  console.log('================================================================\n');

  // Auto-open browser on PC
  const startCmd = process.platform === 'win32' ? `start http://localhost:${PORT}` : `open http://localhost:${PORT}`;
  exec(startCmd, () => {});
});
