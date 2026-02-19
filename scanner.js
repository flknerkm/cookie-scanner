const puppeteer = require('puppeteer');
const fs = require('fs');

const SITE_URL = process.env.SITE_URL || 'https://din-hjemmeside.dk';

const knownCookies = {
  '_ga':                { service: 'Google Analytics', category: 'Statistik', description: 'Identificerer unikke brugere på tværs af sessioner via et tilfældigt genereret klient-ID', expires: '2 år' },
  '_ga_':               { service: 'Google Analytics', category: 'Statistik', description: 'Gemmer og opdaterer sessionsdata for den specifikke GA4-ejendom', expires: '2 år' },
  '_gid':               { service: 'Google Analytics', category: 'Statistik', description: 'Identificerer brugeren inden for en enkelt session', expires: '24 timer' },
  '_gat':               { service: 'Google Analytics', category: 'Statistik', description: 'Begrænser antallet af forespørgsler til Google', expires: '1 minut' },
  '_gat_':              { service: 'Google Analytics', category: 'Statistik', description: 'Begrænser antallet af forespørgsler til Google', expires: '1 minut' },
  '_gcl_au':            { service: 'Google Ads', category: 'Marketing', description: 'Sporer konverteringer og forbinder annonceklik med handlinger på sitet', expires: '90 dage' },
  '_gcl_aw':            { service: 'Google Ads', category: 'Marketing', description: 'Gemmer Google Ads-klik-information (GCLID) til konverteringsattribuering', expires: '90 dage' },
  '_gcl_dc':            { service: 'Google Ads', category: 'Marketing', description: 'Gemmer klikinformation fra Display & Video 360-kampagner', expires: '90 dage' },
  '_gac_':              { service: 'Google Ads', category: 'Marketing', description: 'Forbinder Google Ads-klik med Google Analytics', expires: '90 dage' },
  'GCL_AW_P':           { service: 'Google Ads', category: 'Marketing', description: 'Hjælper med at måle effektiviteten af Google Ads-kampagner', expires: '90 dage' },
  'ADS_VISITOR_ID':     { service: 'Google Ads', category: 'Marketing', description: 'Unik identifikator til annoncemålretning på tværs af Google-tjenester', expires: '90 dage' },
  'IDE':                { service: 'Google Ads (DoubleClick)', category: 'Marketing', description: 'Bruges af Google til at vise annoncer baseret på tidligere besøg', expires: '1 år' },
  'CONSENT':            { service: 'Google', category: 'Nødvendig', description: 'Gemmer brugerens samtykkevalg til Google-tjenester', expires: '2 år' },
  'NID':                { service: 'Google', category: 'Funktionel', description: 'Gemmer brugerens præferencer til Googles tjenester', expires: '6 måneder' },
  'AEC':                { service: 'Google', category: 'Nødvendig', description: 'Sikkerhedscookie der forhindrer misbrug', expires: '6 måneder' },
  'DV':                 { service: 'Google', category: 'Statistik', description: 'Bruges til at levere aggregerede søgestatistikker', expires: 'Session' },
  '__Secure-1PAPISID':  { service: 'Google', category: 'Nødvendig', description: 'Sikker version til at bygge en profil af brugerinteresser', expires: '2 år' },
  '__Secure-1PSID':     { service: 'Google', category: 'Nødvendig', description: 'Sikker session-cookie til Google-kontoautentificering', expires: '2 år' },
  '__Secure-1PSIDCC':   { service: 'Google', category: 'Nødvendig', description: 'Sikkerhedscookie der beskytter mod CSRF-angreb', expires: '1 år' },
  '__Secure-3PAPISID':  { service: 'Google', category: 'Marketing', description: 'Bruges til annoncemålretning på tværs af Google-tjenester', expires: '2 år' },
  '__Secure-3PSID':     { service: 'Google', category: 'Marketing', description: 'Tredjepartscookie til Google-autentificering og annoncer', expires: '2 år' },
  '__Secure-ENID':      { service: 'Google', category: 'Funktionel', description: 'Gemmer brugerindstillinger og præferencer', expires: '13 måneder' },
  'tawk_uuid':          { service: 'Tawk.to', category: 'Funktionel', description: 'Genkender tilbagevendende besøgende via et unikt ID', expires: 'Persistent' },
  'TawkConnectionTime': { service: 'Tawk.to', category: 'Funktionel', description: 'Håndterer live chat-widgetten hvis den er åben i flere browser-faner', expires: 'Session' },
  'twk_idm_key':        { service: 'Tawk.to', category: 'Funktionel', description: 'Bruges til at identificere og administrere chat-sessioner i Tawk.to', expires: 'Session' },
  'twk_':               { service: 'Tawk.to', category: 'Funktionel', description: 'Tawk.to session- og konfigurationscookie', expires: 'Session' },
  '_fbp':               { service: 'Meta (Facebook)', category: 'Marketing', description: 'Bruges af Facebook til at levere annoncer og spore besøg på tværs af websites', expires: '90 dage' },
  '_fbc':               { service: 'Meta (Facebook)', category: 'Marketing', description: 'Gemmer klikinformation fra Facebook-annoncer', expires: '90 dage' },
  'CookieConsent':      { service: 'Cookiebot', category: 'Nødvendig', description: 'Gemmer brugerens samtykke til cookies', expires: '1 år' },
  'hcdn':               { service: 'Hosting/CDN', category: 'Nødvendig', description: 'Teknisk cookie brugt af hostingudbyder til routing og load balancing', expires: 'Session' },
  '__cf_bm':            { service: 'Cloudflare', category: 'Nødvendig', description: 'Bruges af Cloudflare til at beskytte mod bots', expires: '30 minutter' },
  'wordpress_':         { service: 'WordPress', category: 'Nødvendig', description: 'Gemmer godkendelsesoplysninger for WordPress-brugere', expires: 'Session' },
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
  console.log('Scanning: ' + SITE_URL);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  await page.goto(SITE_URL, { waitUntil: 'networkidle2', timeout: 60000 });

  // Vent på at banner loader
  console.log('Venter på cookie-banner...');
  await new Promise(r => setTimeout(r, 5000));

  // Debug: log alle knapper scanneren kan se
  const allButtons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button, [role="button"]')).map(function(el) {
      return {
        id: el.id,
        className: el.className,
        text: (el.innerText || '').trim().substring(0, 80),
        ariaLabel: el.getAttribute('aria-label'),
        visible: el.offsetParent !== null
      };
    });
  });

  console.log('--- Knapper fundet ---');
  allButtons.forEach(function(b) {
    console.log(JSON.stringify(b));
  });
  console.log('--- Slut ---');

  // Tjek om Silktide accept-knappen findes
  const silktideExists = await page.evaluate(function() {
    return document.querySelector('.preferences-accept-all') !== null;
  });
  console.log('Silktide .preferences-accept-all fundet: ' + silktideExists);

  // Forsøg at klikke på kendte selektorer
  const selectors = [
    '.accept-all',
    '.preferences-accept-all',
    'button[aria-label="Accept all cookies"]',
    '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
    '#CybotCookiebotDialogBodyButtonAccept',
    '#onetrust-accept-btn-handler',
  ];

  let accepted = false;
  for (const sel of selectors) {
    try {
      const el = await page.$(sel);
      if (el) {
        console.log('Klikker på: ' + sel);
        await el.click();
        accepted = true;
        await new Promise(r => setTimeout(r, 3000));
        break;
      }
    } catch (e) {
      console.log('Fejl ved klik på ' + sel + ': ' + e.message);
    }
  }

  // Generisk tekst-fallback
  if (!accepted) {
    console.log('Ingen kendte selektorer fundet - prøver tekst-søgning...');
    try {
      const acceptTexts = ['accept', 'accepter alle', 'tillad alle', 'allow all', 'godkend alle'];
      const buttons = await page.$$('button');
      for (const btn of buttons) {
        const text = await page.evaluate(function(el) {
          return (el.innerText || '').toLowerCase().trim();
        }, btn);
        if (text && acceptTexts.some(function(t) { return text === t; })) {
          console.log('Klikker på knap med tekst: ' + text);
          await btn.click();
          accepted = true;
          await new Promise(r => setTimeout(r, 3000));
          break;
        }
      }
    } catch (e) {
      console.log('Tekst-søgning fejlede: ' + e.message);
    }
  }

  if (accepted) {
    console.log('Banner accepteret - venter på cookies...');
    await new Promise(r => setTimeout(r, 10000));
  } else {
    console.log('Intet banner fundet');
    await new Promise(r => setTimeout(r, 5000));
  }

  await page.evaluate(function() { window.scrollBy(0, 600); });
  await new Promise(r => setTimeout(r, 3000));

  const cookies = await page.cookies();
  await browser.close();

  console.log('Fandt ' + cookies.length + ' cookies');

  const results = cookies.map(function(cookie) {
    const known = matchCookie(cookie.name);
    return {
      name: cookie.name,
      service: known ? known.service : 'Ukendt',
      category: known ? known.category : 'Ukendt',
      description: known ? known.description : 'Cookien er ikke genkendt i databasen',
      expires: known ? known.expires : formatExpiry(cookie),
      domain: cookie.domain,
      knownCookie: known ? true : false,
    };
  });

  results.sort(function(a, b) {
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
  console.log('Gemt cookies.json - ' + results.length + ' cookies fra ' + Object.keys(grouped).length + ' tjenester');
})();
