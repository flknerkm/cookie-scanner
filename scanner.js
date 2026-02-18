const puppeteer = require('puppeteer');
const fs = require('fs');

const URL = process.env.SITE_URL || 'https://din-hjemmeside.dk';

// Stor database af kendte cookies
const knownCookies = {
  // Google Analytics
  '_ga':              { service: 'Google Analytics', category: 'Statistik', description: 'Identificerer unikke brugere på tværs af sessioner via et tilfældigt genereret klient-ID', expires: '2 år' },
  '_ga_':             { service: 'Google Analytics', category: 'Statistik', description: 'Gemmer og opdaterer sessionsdata for den specifikke GA4-ejendom', expires: '2 år' },
  '_gid':             { service: 'Google Analytics', category: 'Statistik', description: 'Identificerer brugeren inden for en enkelt session', expires: '24 timer' },
  '_gat':             { service: 'Google Analytics', category: 'Statistik', description: 'Begrænser antallet af forespørgsler til Google (throttling)', expires: '1 minut' },
  '_gat_':            { service: 'Google Analytics', category: 'Statistik', description: 'Begrænser antallet af forespørgsler til Google (throttling)', expires: '1 minut' },
  '__utma':           { service: 'Google Analytics', category: 'Statistik', description: 'Skelner mellem brugere og sessioner (Universal Analytics)', expires: '2 år' },
  '__utmb':           { service: 'Google Analytics', category: 'Statistik', description: 'Bestemmer nye sessioner og besøg (Universal Analytics)', expires: '30 minutter' },
  '__utmc':           { service: 'Google Analytics', category: 'Statistik', description: 'Bruges til at skelne nye sessioner fra tilbagevendende (Universal Analytics)', expires: 'Session' },
  '__utmz':           { service: 'Google Analytics', category: 'Statistik', description: 'Gemmer trafikkilden eller kampagnen der forklarer hvordan brugeren nåede sitet', expires: '6 måneder' },
  '__utmt':           { service: 'Google Analytics', category: 'Statistik', description: 'Bruges til at throttle forespørgsler (Universal Analytics)', expires: '10 minutter' },

  // Google Ads
  '_gcl_au':          { service: 'Google Ads', category: 'Marketing', description: 'Sporer konverteringer fra annoncer – forbinder annonceklik med handlinger på sitet', expires: '90 dage' },
  '_gcl_aw':          { service: 'Google Ads', category: 'Marketing', description: 'Gemmer Google Ads-klik-information (GCLID) til konverteringsattribuering', expires: '90 dage' },
  '_gcl_dc':          { service: 'Google Ads', category: 'Marketing', description: 'Gemmer klikinformation fra Display & Video 360-kampagner', expires: '90 dage' },
  '_gcl_gb':          { service: 'Google Ads', category: 'Marketing', description: 'Bruges til Google Ads konverteringssporing via Google Signals', expires: '90 dage' },
  '_gac_':            { service: 'Google Ads', category: 'Marketing', description: 'Forbinder Google Ads-klik med Google Analytics til kampagnesporingen', expires: '90 dage' },
  'IDE':              { service: 'Google Ads (DoubleClick)', category: 'Marketing', description: 'Bruges af Google til at vise annoncer baseret på tidligere besøg på andre websites', expires: '1 år' },
  'DSID':             { service: 'Google Ads (DoubleClick)', category: 'Marketing', description: 'Identificerer en logget ind bruger på ikke-Google sites til annoncemålretning', expires: '2 uger' },
  '__gads':           { service: 'Google Ads', category: 'Marketing', description: 'Registrerer brugerinteraktion med Google-annoncer og måler annoncers effektivitet', expires: '2 år' },
  '__gpi':            { service: 'Google Ads', category: 'Marketing', description: 'Bruges til at spore brugeradfærd til annoncemålretning', expires: '1 år' },

  // Tawk.to
  'tawk_uuid':        { service: 'Tawk.to', category: 'Funktionel', description: 'Genkender tilbagevendende besøgende via et unikt ID – gemmer ingen personlige oplysninger', expires: 'Persistent' },
  'TawkConnectionTime': { service: 'Tawk.to', category: 'Funktionel', description: 'Håndterer live chat-widgetten hvis den er åben i flere browser-faner', expires: 'Session' },
  'tawkUUID':         { service: 'Tawk.to', category: 'Funktionel', description: 'Genkender tilbagevendende besøgende i live chat', expires: 'Persistent' },

  // WordPress
  'wordpress_':       { service: 'WordPress', category: 'Nødvendig', description: 'Gemmer godkendelsesoplysninger for WordPress-brugere', expires: 'Session' },
  'wordpress_logged_in_': { service: 'WordPress', category: 'Nødvendig', description: 'Angiver om brugeren er logget ind i WordPress', expires: 'Session' },
  'wp-settings-':     { service: 'WordPress', category: 'Nødvendig', description: 'Gemmer brugerindstillinger for WordPress-admin', expires: '1 år' },
  'wordpress_test_cookie': { service: 'WordPress', category: 'Nødvendig', description: 'Tester om cookies er aktiveret i browseren', expires: 'Session' },
  'woocommerce_':     { service: 'WooCommerce', category: 'Nødvendig', description: 'Gemmer indkøbskurv- og sessionsdata for WooCommerce-butikken', expires: 'Session' },
  'wc_':              { service: 'WooCommerce', category: 'Nødvendig', description: 'Gemmer WooCommerce-relaterede præferencer', expires: 'Session' },

  // Facebook / Meta
  '_fbp':             { service: 'Meta (Facebook)', category: 'Marketing', description: 'Bruges af Facebook til at levere annoncer og spore besøg på tværs af websites', expires: '90 dage' },
  '_fbc':             { service: 'Meta (Facebook)', category: 'Marketing', description: 'Gemmer klikinformation fra Facebook-annoncer', expires: '90 dage' },
  'fr':               { service: 'Meta (Facebook)', category: 'Marketing', description: 'Bruges af Facebook til at levere, måle og forbedre relevansen af annoncer', expires: '90 dage' },
  'datr':             { service: 'Meta (Facebook)', category: 'Marketing', description: 'Identificerer browseren til sikkerhed og integritet på Facebook', expires: '2 år' },

  // Cookiebot / Consent
  'CookieConsent':    { service: 'Cookiebot', category: 'Nødvendig', description: 'Gemmer brugerens samtykke til cookies', expires: '1 år' },
  'cookielawinfo-':   { service: 'Cookie Notice', category: 'Nødvendig', description: 'Gemmer brugerens cookiesamtykke', expires: '1 år' },
  'viewed_cookie_policy': { service: 'Cookie Notice', category: 'Nødvendig', description: 'Registrerer om brugeren har accepteret cookiepolitikken', expires: '1 år' },
  'CONSENT':          { service: 'Google', category: 'Nødvendig', description: 'Gemmer brugerens samtykkevalg på Google-tjenester', expires: '2 år' },

  // Diverse / Session
  'PHPSESSID':        { service: 'PHP', category: 'Nødvendig', description: 'Gemmer en unik session-ID for at opretholde brugerens session på serveren', expires: 'Session' },
  'JSESSIONID':       { service: 'Java', category: 'Nødvendig', description: 'Gemmer session-ID for Java-baserede webapplikationer', expires: 'Session' },
};

function matchCookie(name) {
  if (knownCookies[name]) return { ...knownCookies[name], matched: true };

  // Prefix match – longest prefix wins
  let bestMatch = null;
  let bestLength = 0;
  for (const [key, val] of Object.entries(knownCookies)) {
    if (name.startsWith(key) && key.length > bestLength) {
      bestMatch = val;
      bestLength = key.length;
    }
  }
  if (bestMatch) return { ...bestMatch, matched: true };

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

  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });

  // Prøv at klikke på "Accepter alle"-knapper i cookie-bannere
  const acceptTexts = [
    'accepter alle', 'accepter', 'accept all', 'accept cookies',
    'tillad alle', 'tillad', 'godkend alle', 'godkend',
    'jeg accepterer', 'ok', 'forstået', 'enig', 'allow all',
    'allow cookies', 'got it', 'agree'
  ];

  try {
    const buttons = await page.$$('button, a, [role="button"], input[type="button"], input[type="submit"]');
    for (const button of buttons) {
      const text = await page.evaluate(el => el.innerText?.toLowerCase().trim() || el.value?.toLowerCase().trim(), button);
      if (text && acceptTexts.some(t => text.includes(t))) {
        console.log(`Klikker på cookie-knap: "${text}"`);
        await button.click();
        await new Promise(r => setTimeout(r, 3000));
        break;
      }
    }
  } catch (e) {
    console.log('Ingen cookie-banner fundet:', e.message);
  }

  // Vent på forsinkede scripts
  console.log('Venter på forsinkede scripts...');
  await new Promise(r => setTimeout(r, 10000));

  // Scroll lidt ned for at trigge lazy-loaded scripts
  await page.evaluate(() => window.scrollBy(0, 500));
  await new Promise(r => setTimeout(r, 3000));

  const cookies = await page.cookies();
  await browser.close();

  console.log(`Fandt ${cookies.length} cookies`);

  const results = cookies.map(cookie => {
    const known = matchCookie(cookie.name);
    return {
      name: cookie.name,
      service: known?.service || 'Ukendt',
      category: known?.category || 'Ukendt',
      description: known?.description || 'Cookien er ikke genkendt i databasen – undersøg eventuelt manuelt',
      expires: known?.expires || formatExpiry(cookie),
      domain: cookie.domain,
      knownCookie: known?.matched || false,
    };
  });

  // Sorter: kendte cookies først, derefter alfabetisk på service
  results.sort((a, b) => {
    if (a.knownCookie && !b.knownCookie) return -1;
    if (!a.knownCookie && b.knownCookie) return 1;
    return a.service.localeCompare(b.service);
  });

  // Gruppér efter service
  const grouped = {};
  for (const cookie of results) {
    if (!grouped[cookie.service]) grouped[cookie.service] = [];
    grouped[cookie.service].push(cookie);
  }

  const output = {
    lastScanned: new Date().toISOString(),
    url: URL,
    totalCookies: results.length,
    cookies: grouped,
  };

  fs.writeFileSync('cookies.json', JSON.stringify(output, null, 2));
  console.log(`Gemt cookies.json – ${results.length} cookies fra ${Object.keys(grouped).length} tjenester`);
})();
