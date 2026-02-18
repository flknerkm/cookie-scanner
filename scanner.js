const puppeteer = require('puppeteer');
const fs = require('fs');

const URL = process.env.SITE_URL || 'https://din-hjemmeside.dk';

// Known cookie descriptions
const knownCookies = {
  '_ga': { service: 'Google Analytics', description: 'Identificerer unikke brugere på tværs af sessioner', expires: '2 år' },
  '_gid': { service: 'Google Analytics', description: 'Identificerer brugeren inden for en enkelt session', expires: '24 timer' },
  '_gat': { service: 'Google Analytics', description: 'Begrænser antallet af forespørgsler til Google', expires: '1 minut' },
  '_gcl_au': { service: 'Google Ads', description: 'Sporer konverteringer fra annoncer', expires: '90 dage' },
  '_gcl_aw': { service: 'Google Ads', description: 'Gemmer Google Ads-klik-information (GCLID)', expires: '90 dage' },
  '_gcl_dc': { service: 'Google Ads', description: 'Gemmer klikinformation fra Display & Video 360', expires: '90 dage' },
  'tawk_uuid': { service: 'Tawk.to', description: 'Genkender tilbagevendende besøgende via unikt ID', expires: 'Persistent' },
  'TawkConnectionTime': { service: 'Tawk.to', description: 'Håndterer chat-widgetten på tværs af faner', expires: 'Session' },
};

function matchCookie(name) {
  // Exact match
  if (knownCookies[name]) return knownCookies[name];

  // Prefix match (e.g. _ga_XXXXXXX, _gac_XXXXXXX, tawk_uuid_XXXXXXX)
  for (const [key, val] of Object.entries(knownCookies)) {
    if (name.startsWith(key)) return { ...val, name };
  }

  return null;
}

function formatExpiry(cookie) {
  if (!cookie.expires || cookie.expires === -1) return 'Session';
  const ms = cookie.expires * 1000 - Date.now();
  const days = Math.round(ms / (1000 * 60 * 60 * 24));
  if (days > 365) return `${Math.round(days / 365)} år`;
  if (days > 0) return `${days} dage`;
  return 'Session';
}

(async () => {
  console.log(`Scanning: ${URL}`);

  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Accept all cookies automatically to trigger third-party cookies
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'cookieEnabled', { get: () => true });
  });

  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });

  // Wait a bit for any delayed scripts (chat widgets, etc.)
  await new Promise(r => setTimeout(r, 5000));

  const cookies = await page.cookies();
  await browser.close();

  console.log(`Found ${cookies.length} cookies`);

  const results = cookies.map(cookie => {
    const known = matchCookie(cookie.name);
    return {
      name: cookie.name,
      service: known?.service || 'Ukendt',
      description: known?.description || 'Ingen beskrivelse tilgængelig',
      expires: known?.expires || formatExpiry(cookie),
      domain: cookie.domain,
    };
  });

  // Group by service
  const grouped = {};
  for (const cookie of results) {
    if (!grouped[cookie.service]) grouped[cookie.service] = [];
    grouped[cookie.service].push(cookie);
  }

  const output = {
    lastScanned: new Date().toISOString(),
    url: URL,
    cookies: grouped,
  };

  fs.writeFileSync('cookies.json', JSON.stringify(output, null, 2));
  console.log('Saved to cookies.json');
})();
