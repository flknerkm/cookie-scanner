const puppeteer = require('puppeteer');
const fs = require('fs');
const autoconsent = require('@duckduckgo/autoconsent');
const extraRules = require('@duckduckgo/autoconsent/rules/rules.json');

const SITE_URL = process.env.SITE_URL || 'https://din-hjemmeside.dk';

// Stor database af kendte cookies
const knownCookies = {
  '_ga':                { service: 'Google Analytics', category: 'Statistik', description: 'Identificerer unikke brugere på tværs af sessioner via et tilfældigt genereret klient-ID', expires: '2 år' },
  '_ga_':               { service: 'Google Analytics', category: 'Statistik', description: 'Gemmer og opdaterer sessionsdata for den specifikke GA4-ejendom', expires: '2 år' },
  '_gid':               { service: 'Google Analytics', category: 'Statistik', description: 'Identificerer brugeren inden for en enkelt session', expires: '24 timer' },
  '_gat':               { service: 'Google Analytics', category: 'Statistik', description: 'Begrænser antallet af forespørgsler til Google', expires: '1 minut' },
  '_gat_':              { service: 'Google Analytics', category: 'Statistik', description: 'Begrænser antallet af forespørgsler til Google', expires: '1 minut' },
  '__utma':             { service: 'Google Analytics', category: 'Statistik', description: 'Skelner mellem brugere og sessioner (Universal Analytics)', expires: '2 år' },
  '__utmb':             { service: 'Google Analytics', category: 'Statistik', description: 'Bestemmer nye sessioner og besøg', expires: '30 minutter' },
  '__utmc':             { service: 'Google Analytics', category: 'Statistik', description: 'Skelner nye sessioner fra tilbagevendende', expires: 'Session' },
  '__utmz':             { service: 'Google Analytics', category: 'Statistik', description: 'Gemmer trafikkilden der forklarer hvordan brugeren nåede sitet', expires: '6 måneder' },
  '_gcl_au':            { service: 'Google Ads', category: 'Marketing', description: 'Sporer konverteringer fra annoncer og forbinder annonceklik med handlinger på sitet', expires: '90 dage' },
  '_gcl_aw':            { service: 'Google Ads', category: 'Marketing', description: 'Gemmer Google Ads-klik-information (GCLID) til konverteringsattribuering', expires: '90 dage' },
  '_gcl_dc':            { service: 'Google Ads', category: 'Marketing', description: 'Gemmer klikinformation fra Display & Video 360-kampagner', expires: '90 dage' },
  '_gcl_gb':            { service: 'Google Ads', category: 'Marketing', description: 'Bruges til Google Ads konverteringssporing via Google Signals', expires: '90 dage' },
  '_gac_':              { service: 'Google Ads', category: 'Marketing', description: 'Forbinder Google Ads-klik med Google Analytics til kampagnesporing', expires: '90 dage' },
  'GCL_AW_P':           { service: 'Google Ads', category: 'Marketing', description: 'Hjælper med at måle effektiviteten af Google Ads-kampagner', expires: '90 dage' },
  'ADS_VISITOR_ID':     { service: 'Google Ads', category: 'Marketing', description: 'Unik identifikator til annoncemålretning på tværs af Google-tjenester', expires: '90 dage' },
  'IDE':                { service: 'Google Ads (DoubleClick)', category: 'Marketing', description: 'Bruges af Google til at vise annoncer baseret på tidligere besøg på andre websites', expires: '1 år' },
  'DSID':               { service: 'Google Ads (DoubleClick)', category: 'Marketing', description: 'Identificerer en logget ind bruger til annoncemålretning', expires: '2 uger' },
  '__gads':             { service: 'Google Ads', category: 'Marketing', description: 'Registrerer brugerinteraktion med Google-annoncer', expires: '2 år' },
  '__gpi':              { service: 'Google Ads', category: 'Marketing', description: 'Bruges til at spore brugeradfærd til annoncemålretning', expires: '1 år' },
  'CONSENT':            { service: 'Google', category: 'Nødvendig', description: 'Gemmer brugerens samtykkevalg til Google-tjenester', expires: '2 år' },
  'NID':                { service: 'Google', category: 'Funktionel', description: 'Gemmer brugerens præferencer til Googles tjenester', expires: '6 måneder' },
  'HSID':               { service: 'Google', category: 'Nødvendig', description: 'Sikkerhedscookie der beskytter brugerdata', expires: '2 år' },
  'APISID':             { service: 'Google', category: 'Nødvendig', description: 'Bruges af Google til at gemme brugerpræferencer og autentificering', expires: '2 år' },
  'AEC':                { service: 'Google', category: 'Nødvendig', description: 'Sikkerhedscookie der forhindrer misbrug', expires: '6 måneder' },
  'DV':                 { service: 'Google', category: 'Statistik', description: 'Bruges til at levere aggregerede søgestatistikker', expires: 'Session' },
  '__Secure-1PAPISID':  { service: 'Google', category: 'Nødvendig', description: 'Sikker version til at bygge en profil af brugerinteresser', expires: '2 år' },
  '__Secure-1PSID':     { service: 'Google', category: 'Nødvendig', description: 'Sikker session-cookie til Google-kontoautentificering', expires: '2 år' },
  '__Secure-1PSIDCC':   { service: 'Google', category: 'Nødvendig', description: 'Sikkerhedscookie der beskytter mod CSRF-angreb', expires: '1 år' },
  '__Secure-1PSIDTS':   { service: 'Google', category: 'Nødvendig', description: 'Tidsstempel-cookie til sikker Google-session', expires: '1 år' },
  '__Secure-3PAPISID':  { service: 'Google', category: 'Marketing', description: 'Bruges til at bygge en profil af brugerens interesser til annoncemålretning', expires: '2 år' },
  '__Secure-3PSID':     { service: 'Google', category: 'Marketing', description: 'Tredjepartscookie til Google-autentificering og annoncer', expires: '2 år' },
  '__Secure-3PSIDCC':   { service: 'Google', category: 'Marketing', description: 'Sikkerhedscookie til tredjeparts Google-sessioner', expires: '1 år' },
  '__Secure-3PSIDTS':   { service: 'Google', category: 'Marketing', description: 'Tidsstempel til tredjeparts Google-sessioner', expires: '1 år' },
  '__Secure-BUCKET':    { service: 'Google', category: 'Statistik', description: 'Bruges til A/B-test og eksperimenter', expires: '6 måneder' },
  '__Secure-ENID':      { service: 'Google', category: 'Funktionel', description: 'Gemmer brugerindstillinger og præferencer', expires: '13 måneder' },
  'tawk_uuid':          { service: 'Tawk.to', category: 'Funktionel', description: 'Genkender tilbagevendende besøgende via et unikt ID', expires: 'Persistent' },
  'TawkConnectionTime': { service: 'Tawk.to', category: 'Funktionel', description: 'Håndterer live chat-widgetten hvis den er åben i flere browser-faner', expires: 'Session' },
  'twk_idm_key':        { service: 'Tawk.to', category: 'Funktionel', description: 'Bruges til at identificere og administrere chat-sessioner i Tawk.to', expires: 'Session' },
  'twk_':               { service: 'Tawk.to', category: 'Funktionel', description: 'Tawk.to session- og konfigurationscookie', expires: 'Session' },
  '_hp2_id':            { service: 'Heap Analytics', category: 'Statistik', description: 'Bruges af Heap Analytics til at identificere brugere og spore adfærd', expires: '13 måneder' },
  '_fbp':               { service: 'Meta (Facebook)', category: 'Marketing', description: 'Bruges af Facebook til at levere annoncer og spore besøg på tværs af websites', expires: '90 dage' },
  '_fbc':               { service: 'Meta (Facebook)', category: 'Marketing', description: 'Gemmer klikinformation fra Facebook-annoncer', expires: '90 dage' },
  'fr':                 { service: 'Meta (Facebook)', category: 'Marketing', description: 'Bruges af Facebook til at levere og måle relevansen af annoncer', expires: '90 dage' },
  'CookieConsent':      { service: 'Cookiebot', category: 'Nødvendig', description: 'Gemmer brugerens samtykke til cookies', expires: '1 år' },
  'hcdn':               { service: 'Hosting/CDN', category: 'Nødvendig', description: 'Teknisk cookie brugt af hostingudbyder til routing og load balancing', expires: 'Session' },
  '__cf_bm':            { service: 'Cloudflare', category: 'Nødvendig', description: 'Bruges af Cloudflare til at beskytte mod bots', expires: '30 minutter' },
  'wordpress_':         { service: 'WordPress', category: 'Nødvendig', description: 'Gemmer godkendelsesoplysninger for WordPress-brugere', expires: 'Session' },
  'wordpress_logged_in_': { service: 'WordPress', category: 'Nødvendig', description: 'Angiver om brugeren er logget ind i WordPress', expires: 'Session' },
  'wp-settings-':       { service: 'WordPress', category: 'Nødvendig', description: 'Gemmer brugerindstillinger for WordPress-admin', expires: '1 år' },
  'PHPSESSID':          { service: 'PHP', category: 'Nødvendig', description: 'Gemmer en unik session-ID på serveren', expires: 'Session' },
  '_lscache_vary':      { service: 'LiteSpeed Cache', category: 'Nødvendig', description: 'Bruges af LiteSpeed Cache til at håndtere caching', expires: 'Session' },
};

function matchCookie(name) {
  if (knownCookies[name]) return { ...knownCookies[name], matched: true };
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
  console.log(`Scanning: ${SITE_URL}`);

  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  // Brug autoconsent til automatisk at håndtere Cookiebot og andre CMP-bannere
  const rules = [
    ...autoconsent.builtinRules,
    ...extraRules.consentomatic.map(r => new autoconsent.ConsentOMaticCMP(r.name, r)),
  ];

  const consentManager = new autoconsent.PuppeteerAutoconsent(page, null, rules);

  page.on('framenavigated', async () => {
    try {
      await consentManager.checkPopups();
    } catch {}
  });

  await page.goto(SITE_URL, { waitUntil: 'networkidle2', timeout: 60000 });

  // Vent på at autoconsent finder og accepterer banneret
  console.log('Venter på autoconsent...');
  try {
    await consentManager.doOptIn();
    console.log('Cookie-banner accepteret via autoconsent');
  } catch (e) {
    console.log('Autoconsent kunne ikke acceptere banner:', e.message);
  }

  await new Promise(r => setTimeout(r, 10000));
  await page.evaluate(() => window.scrollBy(0, 600));
  await new Promise(r => setTimeout(r, 4000));

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

  results.sort((a, b) => {
    if (a.knownCookie && !b.knownCookie) return -1;
    if (!a.knownCookie && b.knownCookie) return 1;
    return a.service.localeCompare(b.service);
  });

  const grouped = {};
  for (const cookie of results) {
    if (!grouped[cookie.service]) grouped[cookie.service] = [];
    grouped[cookie.service].push(cookie);
  }

  const output = {
    lastScanned: new Date().toISOString(),
    url: SITE_URL,
    totalCookies: results.length,
    cookies: grouped,
  };

  fs.writeFileSync('cookies.json', JSON.stringify(output, null, 2));
  console.log(`Gemt cookies.json – ${results.length} cookies fra ${Object.keys(grouped).length} tjenester`);
})();
