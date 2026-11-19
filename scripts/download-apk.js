const fs = require('fs');
const https = require('https');
const path = require('path');
const { execSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(REPO_ROOT, 'Release_APK_AAB');
const DEST_ROOT = path.join(REPO_ROOT, 'KhmerAmountConverter.apk');
const DEST_RELEASE = path.join(OUT_DIR, 'KhmerAmountConverter.apk');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

let token = '';
try {
  const creds = execSync('git credential fill', { input: 'protocol=https\nhost=github.com\n\n' }).toString();
  const m = creds.match(/password=([^\r\n]+)/);
  if (m) token = m[1];
} catch (e) {}

const headers = { 'User-Agent': 'KhmerAmountConverter-Downloader/1.0' };
if (token) headers['Authorization'] = 'token ' + token;

async function run() {
  console.log('Fetching latest release from GitHub...');
  const res = await fetch('https://api.github.com/repos/igpubinfo-max/Read-Khmer-Number/releases', { headers });
  const releases = await res.json();

  if (!releases || releases.length === 0) {
    console.error('No releases found!');
    process.exit(1);
  }

  const latest = releases[0];
  console.log(`Latest release: ${latest.name} (${latest.tag_name})`);

  const apkAsset = latest.assets.find(a => a.name === 'KhmerAmountConverter.apk') || latest.assets.find(a => a.name.endsWith('.apk'));
  if (!apkAsset) {
    console.error('No APK asset in release!');
    process.exit(1);
  }

  console.log(`Downloading ${apkAsset.name} (${(apkAsset.size / 1024 / 1024).toFixed(2)} MB)...`);

  function download(url, dest, cb) {
    https.get(url, { headers: { 'User-Agent': 'Downloader' } }, (resp) => {
      if (resp.statusCode === 301 || resp.statusCode === 302 || resp.statusCode === 307) {
        return download(resp.headers.location, dest, cb);
      }
      const file = fs.createWriteStream(dest);
      resp.pipe(file);
      file.on('finish', () => {
        file.close(cb);
      });
    }).on('error', err => {
      console.error('Download error:', err.message);
      process.exit(1);
    });
  }

  download(apkAsset.browser_download_url, DEST_ROOT, () => {
    fs.copyFileSync(DEST_ROOT, DEST_RELEASE);
    const sizeMb = (fs.statSync(DEST_ROOT).size / 1024 / 1024).toFixed(2);
    console.log('\n======================================================================');
    console.log(`✅ SUCCESS! APK FILE DOWNLOADED (${sizeMb} MB):`);
    console.log(`   -> ${DEST_ROOT}`);
    console.log(`   -> ${DEST_RELEASE}`);
    console.log('======================================================================\n');
  });
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
