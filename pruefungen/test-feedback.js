/* Die Rückmeldung: nimmt sie an, schickt sie das Richtige, und hält sie sich
   an die Regeln aus docs/FEEDBACK-API.md?

   Drei Dinge, die hier zusammenkommen: Der Baustein muss auf jeder
   Inhaltsseite eingebunden sein, das Formular muss die Pflichtfelder in der
   verabredeten Form schicken, und keine der drei Grundregeln - keine
   personenbezogenen Daten, trackingfrei, gleiche Herkunft - darf verletzt
   sein. */
const fs = require('fs'), path = require('path');
const { JSDOM } = require('jsdom');
const { MATERIAL, TOOLS, teilweise } = require('./orte');

let fehler = 0;
const p = (was, ok, zusatz) => {
  console.log((ok ? '  ok     ' : '  FEHLER ') + was + (ok || !zusatz ? '' : ' – ' + zusatz));
  if (!ok) fehler++;
};

const QUELLE = fs.readFileSync(path.join(MATERIAL, 'assets/feedback.js'), 'utf8');

/* Eine nackte Seite mit Fussbereich, die den Baustein lädt. fetch wird
   ersetzt: Die Sammelstelle steht nicht in der Prüfung zur Verfügung, und
   ansprechen dürfte sie eine Prüfung ohnehin nicht. */
function seite(url, antwort) {
  const dom = new JSDOM(
    '<!doctype html><html><head><title>Übung 1 – Bezeichnung lesen</title></head>'
    + '<body><main><h1>Da</h1></main><footer>Fuss</footer>'
    + '<script id="fb">' + QUELLE.split('<' + '/script>').join('<\\/script>')
    + '</script></body></html>',
    { runScripts: 'dangerously', url,
      beforeParse(w) {
        w.__rufe = [];
        w.fetch = function (adresse, o) {
          w.__rufe.push({ adresse: String(adresse), o: o || {} });
          const d = antwort ? antwort(String(adresse), o) : null;
          return Promise.resolve({ json: () => Promise.resolve(d) });
        };
      } });
  return dom.window;
}

const TOKEN = { ts: 1789452359, token: '72dbaefd' };
const mitToken = (extra) => (adresse) => (
  /action=token/.test(adresse) ? TOKEN : (extra || { ok: true }));

console.log('\nKnopf und Fenster');
{
  const w = seite('https://t-bk.de/unterrichtsmaterial/uebungen/x.html', mitToken());
  const d = w.document;
  const knopf = d.getElementById('tbk-feedback-auf');
  const fenster = d.getElementById('tbk-feedback');
  p('Knopf wird angelegt', !!knopf);
  p('Knopf sagt, wozu er da ist',
    !!knopf && /R\u00fcckmeldung/.test(knopf.getAttribute('aria-label') || ''));
  p('Knopf kuendigt ein Fenster an',
    !!knopf && knopf.getAttribute('aria-haspopup') === 'dialog');
  p('Fenster wird angelegt', !!fenster && fenster.tagName === 'DIALOG');
  p('Fenster ist zuerst zu', !!fenster && !fenster.hasAttribute('open'));
  p('Fenster steht ausserhalb von main', !!fenster && !fenster.closest('main'));
  p('wird nicht mitgedruckt', !!fenster && fenster.getAttribute('data-druck') === 'weg');

  /* Lokal geöffnet gibt es keine Sammelstelle - dann lieber kein Knopf als
     einer, der nur zu einer Fehlermeldung führt. */
  const lokal = seite('file:///K:/tmp/x.html', mitToken());
  p('lokal geoeffnet: kein Knopf', !lokal.document.getElementById('tbk-feedback-auf'));
  p('lokal geoeffnet: kein Fenster', !lokal.document.getElementById('tbk-feedback'));
}

console.log('\nDas Formular');
{
  const w = seite('https://t-bk.de/unterrichtsmaterial/uebungen/x.html', mitToken());
  const d = w.document;
  const form = d.querySelector('#tbk-feedback form');
  p('Formular ist da', !!form);
  p('Rolle als Auswahl', d.querySelectorAll('#tbk-feedback input[name="role"]').length === 2);
  const kat = d.querySelector('#tbk-feedback select[name="category"]');
  const werte = kat ? [...kat.options].map((o) => o.value).sort().join(',') : '';
  p('alle fuenf Kategorien', werte === 'fehler,lob,sonstiges,verstaendnis,vorschlag', werte);
  const text = d.querySelector('#tbk-feedback textarea[name="message"]');
  p('Freitext hoechstens 2000 Zeichen', !!text && text.getAttribute('maxlength') === '2000');
  p('Freitext ist freiwillig', !!text && !text.required);

  const hp = d.querySelector('#tbk-feedback input[name="hp"]');
  p('Honigtopf vorhanden', !!hp);
  /* Nur die Regel des Honigtopfs selbst pruefen - die Druckregel weiter
     unten blendet den ganzen Block aus und darf das auch. */
  const hpRegel = (QUELLE.match(/tbkfb-hp\{([^}]*)\}/) || ['', ''])[1];
  p('Honigtopf nicht per display:none versteckt',
    !!hp && hpRegel.length > 0 && !/display\s*:\s*none/.test(hpRegel), hpRegel);
  p('Honigtopf aus der Tastaturfolge', !!hp && hp.getAttribute('tabindex') === '-1');
  p('Honigtopf fuer Vorleseprogramme verborgen',
    !!hp && !!hp.closest('[aria-hidden="true"]'));

  /* Jedes sichtbare Feld braucht seine Beschriftung. */
  p('Kategorie hat ein label', !!d.querySelector('#tbk-feedback label[for="tbkfb-kategorie"]'));
  p('Freitext hat ein label', !!d.querySelector('#tbk-feedback label[for="tbkfb-text"]'));
}

console.log('\nDas Token kommt erst beim Oeffnen');
{
  const w = seite('https://t-bk.de/unterrichtsmaterial/uebungen/x.html', mitToken());
  p('beim Laden noch kein Ruf', w.__rufe.length === 0, JSON.stringify(w.__rufe));
  w.document.getElementById('tbk-feedback-auf').click();
  p('nach dem Oeffnen genau einer', w.__rufe.length === 1, JSON.stringify(w.__rufe));
  p('und zwar der Token-Ruf', /action=token/.test(w.__rufe[0].adresse), w.__rufe[0].adresse);
  p('Fenster ist offen', w.document.getElementById('tbk-feedback').hasAttribute('open'));
}

console.log('\nWas abgeschickt wird');
{
  const w = seite('https://t-bk.de/unterrichtsmaterial/uebungen/x.html', mitToken());
  const d = w.document;
  d.getElementById('tbk-feedback-auf').click();
  return setTimeout(() => {
    d.querySelector('#tbk-feedback textarea').value = 'Bild 3 stimmt nicht';
    d.querySelector('#tbk-feedback select').value = 'fehler';
    d.querySelector('#tbk-feedback form').dispatchEvent(
      new w.Event('submit', { bubbles: true, cancelable: true }));
    setTimeout(() => {
      const post = w.__rufe.filter((r) => (r.o.method || '') === 'POST')[0];
      p('es wird gesendet', !!post);
      if (post) {
        const b = new w.URLSearchParams(post.o.body);
        ['ts', 'token', 'hp', 'role', 'category', 'path', 'title'].forEach((k) => {
          p('Feld ' + k + ' ist dabei', b.has(k));
        });
        p('Honigtopf ist leer', b.get('hp') === '');
        p('Rolle aus der Liste', /^(schueler|lehrkraft)$/.test(b.get('role')), b.get('role'));
        p('Kategorie aus der Liste', b.get('category') === 'fehler', b.get('category'));
        p('Freitext kommt mit', b.get('message') === 'Bild 3 stimmt nicht');
        p('Pfad ist der der Seite', b.get('path') === '/unterrichtsmaterial/uebungen/x.html',
          b.get('path'));
        p('Titel ist der der Seite', b.get('title') === 'Übung 1 – Bezeichnung lesen',
          b.get('title'));
        p('als Formulardaten', /urlencoded/.test((post.o.headers || {})['Content-Type'] || ''));
        p('gleiche Herkunft, kein fremder Server', post.adresse.indexOf('/api/') === 0,
          post.adresse);
      }
      setTimeout(() => {
        p('nach dem Erfolg steht der Dank da',
          /Danke/.test(d.getElementById('tbk-feedback').textContent),
          d.getElementById('tbk-feedback').textContent.trim().slice(0, 60));
        weiter();
      }, 30);
    }, 30);
  }, 30);
}

function weiter() {
  console.log('\nKeine Spur, kein fremder Server');
  {
    /* Der Kopf der Datei sagt, dass beides nicht benutzt wird - gepruft
       wird der Code, nicht der Kommentar. */
    const code = QUELLE.replace(/\/\*[\s\S]*?\*\//g, '');
    p('kein localStorage', !/localStorage/.test(code));
    p('kein sessionStorage', !/sessionStorage/.test(code));
    p('kein Cookie', !/document\.cookie/.test(code));
    const fremd = QUELLE.match(/https?:\/\/[^\s'"]+/g) || [];
    p('keine Adresse nach draussen', fremd.length === 0, fremd.join(' '));
    /* Kein Name, keine Anschrift, keine Klasse - die Sammelstelle nimmt nur
       Rolle, Kategorie und Freitext. */
    const felder = (QUELLE.match(/b\.set\('([a-z]+)'/g) || [])
      .map((s) => s.replace(/.*'([a-z]+)'.*/, '$1')).sort().join(',');
    p('nur die verabredeten Felder',
      felder === 'category,hp,message,path,role,title,token,ts', felder);
  }

  console.log('\nAuf jeder Inhaltsseite eingebunden');
  {
    const sammeln = (ordner, tief) => {
      const aus = [];
      if (!fs.existsSync(ordner)) return aus;
      for (const e of fs.readdirSync(ordner, { withFileTypes: true })) {
        const pf = path.join(ordner, e.name);
        if (e.isDirectory()) aus.push(...sammeln(pf, true));
        else if (/\.html$/.test(e.name) && (tief || e.name !== 'index.html')) aus.push(pf);
      }
      return aus;
    };
    const seiten = [
      ...sammeln(path.join(MATERIAL, 'uebungen')),
      ...sammeln(path.join(MATERIAL, 'trainings')),
      ...sammeln(path.join(MATERIAL, 'lernsituationen')),
    ].filter((f) => !path.basename(f).startsWith('_'));
    /* Die erzeugten Paketuebersichten sind Verzeichnisse, kein Inhalt. */
    const inhalt = seiten.filter((f) => path.basename(f) !== 'index.html'
      || f.includes('lernsituationen'));
    const ohne = inhalt.filter(
      (f) => !fs.readFileSync(f, 'utf8').includes('assets/feedback.js'));
    p(inhalt.length + ' Seiten im Material, alle mit Rueckmeldung', ohne.length === 0,
      ohne.map((f) => path.relative(MATERIAL, f)).join(', '));

    if (teilweise(TOOLS, 'die Werkzeuge')) {
      const lektionen = fs.readdirSync(TOOLS)
        .filter((d) => /\.html$/.test(d) && !d.startsWith('_'))
        .map((d) => path.join(TOOLS, d))
        .filter((f) => /name="art" content="lektion"/.test(fs.readFileSync(f, 'utf8')));
      const ohneL = lektionen.filter(
        (f) => !fs.readFileSync(f, 'utf8').includes('assets/feedback.js'));
      p(lektionen.length + ' Lektionen, alle mit Rueckmeldung', ohneL.length === 0,
        ohneL.map((f) => path.basename(f)).join(', '));
      const kopie = path.join(TOOLS, 'assets', 'feedback.js');
      p('derselbe Baustein liegt bei den Werkzeugen',
        fs.existsSync(kopie) && fs.readFileSync(kopie, 'utf8') === QUELLE);
    }
  }

  console.log(fehler ? '\n' + fehler + ' Befunde' : '\nalles gruen');
  process.exit(fehler ? 1 : 0);
}
