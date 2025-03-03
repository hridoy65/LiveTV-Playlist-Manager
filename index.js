require('dotenv').config(); // Load environment variables from .env
const https = require('https');
const fs = require('fs-extra');

// ============================
// GitHub Credentials
// ============================

const githubToken = process.env.GITHUB_TOKEN; // Replace with your GitHub token
const gistId = process.env.GIST_ID; // Replace with your Gist ID (optional for updates)

console.log("Loaded environment variables:");
console.log(`GITHUB_TOKEN: ${githubToken ? "Present" : "Missing"}`);
console.log(`GIST_ID: ${gistId ? "Present" : "Missing"}`);

if (!githubToken) {
  console.error("Error: GITHUB_TOKEN is missing. Please check your environment variables.");
  process.exit(1);
}

// ============================
// URLs to Fetch
// ============================

const urls = {
  Toffee: 'https://raw.githubusercontent.com/byte-capsule/Toffee-Channels-Link-Headers/refs/heads/main/toffee_OTT_Navigator.m3u',
  'T-Sport': 'https://raw.githubusercontent.com/byte-capsule/TSports-m3u8-Grabber/refs/heads/main/OTT_Navigator_Tspots_live.m3u',
  'CricHD VIP': 'https://gist.githubusercontent.com/hridoy65/64a87bcbdd5825ab2c5c063621607f31/raw/crichdvip.m3u',
  'SonyLiv Live': 'https://raw.githubusercontent.com/drmlive/sliv-live-events/refs/heads/main/sonyliv.m3u',
  'JadooBD IPTV': 'https://playlist.nayeem-parvez.pw/jadoox.m3u',
  'FanCode Live': 'https://raw.githubusercontent.com/byte-capsule/FanCode-Hls-Fetcher/refs/heads/main/Fancode_Live.m3u',
  RabbitholeBD: 'https://nayeem0.tech/rabbitXX/playlist.php',
  'SonyLiv BD': 'https://playlist.nayeem-parvez.pw/Sonyx.m3u',
  JioCinema: 'https://raw.githubusercontent.com/khankimagi23221/okk-1/refs/heads/main/Jiocinema.m3u',
  'JioCinema Events': 'https://raw.githubusercontent.com/alex4528/jevents/refs/heads/main/jevents_live.m3u',
  Zee5: 'https://raw.githubusercontent.com/khankimagi23221/okk-1/refs/heads/main/zee5.m3u',
  Ayna: 'https://api.sportzxtv.com/sportzx/aynaa.php',
  JagoBD: 'https://s1.sadman0.workers.dev/jagobd.m3u8',
  BDCast: 'https://raw.githubusercontent.com/nayeem086/playlists/main/bdcast.m3u',
  BDIX: 'https://playlist.nayeem-parvez.pw/bdix.m3u',
  Voot: 'https://fifabangladesh.live/VHOD/vootXranapk.m3u',
  'Star Sports': 'https://playlist.nayeem-parvez.pw/starx.m3u',
  HimelOP: 'https://himel-op.top/himelop-premium/playlist-op.m3u',
  'Toffee Script': 'https://bdiptv24.com/Toffeelive/kaya_app.php?route=getIPTVList',
  'DaddyHD Live': 'https://raw.githubusercontent.com/dtankdempse/daddylive-m3u/refs/heads/main/vlc_playlist.m3u8',
  'DaddyHD Events': 'https://raw.githubusercontent.com/stein-dev/iptvs/refs/heads/main/dlhd-events.m3u8',
  'Adult (DaddyHD)': 'https://raw.githubusercontent.com/dtankdempse/daddylive-m3u/refs/heads/main/adult/vlc_playlist.m3u8',
  MoveOnJoy: 'https://bit.ly/moj-m3u8',
  SportsLive: 'https://raw.githubusercontent.com/steinxborg/iptvs/refs/heads/main/sportslive-channels.m3u8',
  'SportsLive Events': 'https://raw.githubusercontent.com/steinxborg/iptvs/refs/heads/main/sportslive-events.m3u8',
};

// ============================
// Helper Functions
// ============================

/**
 * Parses an EXTINF line and returns its attributes as an object.
 */
function parseExtInf(extinfLine) {
  const attributes = {};
  const parts = extinfLine.split(',');
  if (parts.length < 2) return attributes;

  const attrString = parts[0];
  const channelName = parts[1].trim();

  // Use regex to extract key="value" pairs
  const matches = attrString.matchAll(/(\w+)="([^"]*)"/g);
  for (const match of matches) {
    attributes[match[1]] = match[2];
  }

  attributes.name = channelName;
  return attributes;
}

/**
 * Builds an EXTINF line from attributes and channel name.
 */
function buildExtInf(attributes, channelName) {
  const attrParts = Object.entries(attributes)
    .filter(([key, value]) => value !== '')
    .map(([key, value]) => `${key}="${value}"`);
  const attrString = attrParts.join(' ');
  return `#EXTINF:-1 ${attrString},${channelName}`;
}

// ============================
// Main Script
// ============================

(async () => {
  console.log("Starting script...");

  let playlistContent = '#EXTM3U\n\n';
  const channels = {};

  try {
    // Fetch and process each playlist
    for (const [playlistName, playlistUrl] of Object.entries(urls)) {
      console.log(`Processing playlist: ${playlistName}`);
      try {
        const content = await new Promise((resolve, reject) => {
          https.get(playlistUrl, (res) => {
            if (res.statusCode !== 200) {
              reject(new Error(`Failed to fetch ${playlistUrl}: HTTP ${res.statusCode}`));
            }
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => resolve(data));
          }).on('error', (err) => reject(err));
        });

        console.log(`Fetched content for playlist: ${playlistName}`);
        console.log(`Content length: ${content.length} characters`);

        const lines = content.split('\n');

        let currentAttributes = {};
        let currentUrl = '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith('#EXTINF')) {
            // Parse EXTINF line
            currentAttributes = parseExtInf(trimmedLine);
            currentAttributes['group-title'] = playlistName;

            // Collect channel metadata
            const channelKey = currentAttributes.name.toLowerCase();
            if (!channels[channelKey]) {
              channels[channelKey] = {
                name: currentAttributes.name,
                category: currentAttributes['group-title'],
                'tvg-logo': currentAttributes['tvg-logo'] || '',
              };
            }

            // Rebuild EXTINF line with updated group-title
            const modifiedExtInf = buildExtInf(currentAttributes, currentAttributes.name);
            playlistContent += `${modifiedExtInf}\n`;
          } else if (trimmedLine && trimmedLine.startsWith('http')) {
            // This is the URL for the previous EXTINF
            currentUrl = trimmedLine;
            playlistContent += `${currentUrl}\n\n`;
          } else {
            // Append other lines as-is
            playlistContent += `${line}\n`;
          }
        }
      } catch (fetchError) {
        console.error(`Error processing playlist ${playlistName}:`, fetchError.message);
      }
    }

    console.log("Finished processing all playlists.");

    // Prepare JSON metadata
    const channelsList = Object.values(channels);
    channelsList.sort((a, b) => a.name.localeCompare(b.name));
    const channelsJson = JSON.stringify(channelsList, null, 2);

    console.log("Generated playlist content:");
    console.log(playlistContent);
    console.log("Generated channels metadata:");
    console.log(channelsJson);

    // Save files locally
    await fs.writeFile('LiveTV.m3u', playlistContent);
    await fs.writeFile('Channels.json', channelsJson);
    console.log('Files saved locally.');

    // Prepare Gist data
    const gistData = JSON.stringify({
      description: 'Combined LiveTV Playlist and Channel Metadata',
      public: true,
      files: {
        'LiveTV.m3u': { content: playlistContent },
        'Channels.json': { content: channelsJson },
      },
    });

    // Upload to GitHub Gist
    const apiEndpoint = gistId ? `https://api.github.com/gists/${gistId}` : 'https://api.github.com/gists';
    const method = gistId ? 'PATCH' : 'POST';

    await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.github.com',
        path: gistId ? `/gists/${gistId}` : '/gists',
        method,
        headers: {
          Authorization: `token ${githubToken}`,
          'User-Agent': 'Node.js Script',
          'Content-Type': 'application/json',
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const response = JSON.parse(data);
            console.log(`Gist successfully ${gistId ? 'updated' : 'created'}!`);
            console.log(`Gist URL: ${response.html_url}`);
            resolve();
          } else {
            reject(new Error(`Failed to upload Gist: ${res.statusCode} - ${data}`));
          }
        });
      });

      req.on('error', (err) => reject(err));
      req.write(gistData);
      req.end();
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
