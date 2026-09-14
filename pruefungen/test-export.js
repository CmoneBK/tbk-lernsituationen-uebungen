/* Herunterladen: PDF und Word. Entstehen die Dateien, tragen sie die
   Inhalte der Seite, und halten sie sich an ihr eigenes Format? */
const fs = require('fs'), path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const { BASIS } = require('./harness');

/* Alle Pakete, in denen Uebungen oder Trainings liegen. */
const PAKETE = ['uebungen/schraubverbindungen', 'uebungen/fuegeverfahren',
  'trainings/schraubverbindungen', 'trainings/fuegeverfahren'];
let dir = path.join(BASIS, PAKETE[0]);
let netz = 'uebungen/schraubverbindungen';
const SCHLUSS = '<' + '/script>';

function mitAllen(html) {
  return html.replace(
    /<script src="(?:\.\.\/)+(assets\/[a-z-]+\.js)"[^>]*>[\s\S]*?<\/script>/g,
    (_, datei) => '<script>'
      + fs.readFileSync(BASIS + '/' + datei, 'utf8').split(SCHLUSS).join('<\\' + '/script>')
      + SCHLUSS);
}

function seite(datei) {
  const fehler = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => fehler.push('Laufzeit: ' + (e.detail || e).toString().split('\n')[0]));
  const dom = new JSDOM(mitAllen(fs.readFileSync(path.join(dir, datei), 'utf8')), {
    runScripts: 'dangerously', virtualConsole: vc,
    url: 'https://t-bk.de/unterrichtsmaterial/' + netz + '/' + datei,
  });
  const w = dom.window;
  w.Element.prototype.scrollIntoView = function () {};
  w.print = function () { w.__gedruckt = (w.__gedruckt || 0) + 1; };
  // jsdom kennt weder Canvas noch Blob-URLs - beides für den Test ersetzen.
  w.HTMLCanvasElement.prototype.getContext = function () {
    // measureText braucht der PDF-Baustein fuer den Zeilenumbruch; jsdom misst
    // nichts, also eine grobe Schaetzung ueber die Zeichenzahl.
    return {
      fillRect() {}, drawImage() {}, set fillStyle(v) {}, set font(v) {},
      measureText(t) { return { width: String(t).length * 5.2 }; },
    };
  };
  w.HTMLCanvasElement.prototype.toDataURL = function (typ) {
    // Ein winziges, aber gueltiges JPEG bzw. PNG - fuer den Aufbau reicht das.
    return typ === 'image/jpeg'
      ? 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='
      : 'data:image/png;base64,iVBORw0KGgo=';
  };
  // jsdom-Blobs haben kein text(); den Inhalt deshalb beim Erzeugen mitnehmen.
  const EchterBlob = w.Blob;
  w.Blob = function (teile, opt) {
    w.__inhalt = (teile || []).join('');
    w.__typ = (opt || {}).type;
    return new EchterBlob(teile, opt);
  };
  w.URL.createObjectURL = function (b) { w.__blob = b; return 'blob:test'; };
  w.URL.revokeObjectURL = function () {};
  // Der Download-Link wuerde jsdom zum Navigieren bringen - nur mitschreiben.
  w.HTMLAnchorElement.prototype.click = function () { w.__download = this.download; };
  // Bilder laden nicht wirklich; setAttribute nicht vergessen, sonst fehlt das
  // src im serialisierten HTML (im Browser spiegelt die Eigenschaft es selbst).
  Object.defineProperty(w.Image.prototype, 'src', {
    set(v) {
      this.setAttribute('src', v);
      setTimeout(() => this.onload && this.onload(), 0);
    },
    get() { return this.getAttribute('src'); },
  });
  return { dom, w, d: w.document, fehler };
}

function fertig(dom) {
  return new Promise(los => {
    if (dom.window.document.readyState === 'complete') return los();
    dom.window.addEventListener('load', () => los());
    setTimeout(los, 2000);
  });
}

const warte = ms => new Promise(l => setTimeout(l, ms));

async function main() {
  let fehlerGesamt = 0;

  for (const paket of PAKETE) {
  dir = path.join(BASIS, paket);
  netz = paket;
  for (const datei of fs.readdirSync(dir).filter(f => /^\d/.test(f)).sort()) {
    const { dom, w, d, fehler } = seite(datei);
    await fertig(dom);
    const p = (was, ok) => { if (!ok) fehler.push(was); };

    const knopf = d.getElementById('ex-knopf');
    p('kein Download-Knopf', !!knopf);
    if (!knopf) { console.log('FEHLER ' + datei + '\n  ' + fehler.join('\n  ')); fehlerGesamt++; continue; }

    // Beide Knöpfe teilen sich eine Leiste
    p('Leiste fehlt', !!d.getElementById('tbk-leiste'));
    p('Baukasten-Knopf nicht in der Leiste',
      d.getElementById('tbk-leiste').contains(d.getElementById('bk-knopf')));
    p('Download-Knopf nicht in der Leiste',
      d.getElementById('tbk-leiste').contains(knopf));

    // Nur ein Fenster zur Zeit
    knopf.click();
    p('Download-Fenster öffnet nicht', !d.getElementById('ex-tafel').hidden);
    d.getElementById('bk-knopf').click();
    p('Download-Fenster bleibt offen', d.getElementById('ex-tafel').hidden);
    p('Baukasten öffnet nicht', !d.getElementById('bk-tafel').hidden);
    knopf.click();
    p('Baukasten schließt nicht', d.getElementById('bk-tafel').hidden);

    const details = [...d.querySelectorAll('main details')].filter(x => !x.closest('[hidden]'));

    // --- PDF, Lösungen unter den Aufgaben ---
    d.getElementById('ex-pdf').click();
    await warte(120);
    p('nicht gedruckt', w.__gedruckt === 1);
    p('Lösungen nicht aufgeklappt', details.every(x => x.open));
    p('Lösungsabschnitt fälschlich angelegt', !d.getElementById('ex-loesungen'));
    w.dispatchEvent(new w.Event('afterprint'));
    p('Zustand nicht zurückgesetzt', details.every(x => !x.open));

    // --- PDF, Lösungen am Ende ---
    d.querySelector('input[value="ende"]').checked = true;
    d.getElementById('ex-pdf').click();
    await warte(120);
    const abschnitt = d.getElementById('ex-loesungen');
    p('kein Lösungsabschnitt', !!abschnitt);
    if (abschnitt) {
      p('Lösungsabschnitt ohne Überschrift',
        (abschnitt.querySelector('h2') || {}).textContent === 'Lösungen');
      p('Zahl der Lösungen stimmt nicht (' + abschnitt.querySelectorAll('h3').length
        + ' gegen ' + details.length + ')',
        abschnitt.querySelectorAll('h3').length === details.length);
      // Ohne aufgedeckte Aufgaben gibt es nichts zu verweisen - so gewollt:
      // ausgegeben wird nur, was gerade sichtbar ist.
      if (details.length) {
        p('Verweis auf den Teil fehlt',
          [...abschnitt.querySelectorAll('h3')].some(h => /Teil \d/.test(h.textContent)));
      }
      p('Aufgaben nicht zugeklappt', details.every(x => !x.open));
      p('Aufgabeninhalt nicht ausgeblendet',
        details.every(x => x.classList.contains('ex-nur-aufgabe')));
    }
    w.dispatchEvent(new w.Event('afterprint'));
    p('Lösungsabschnitt bleibt stehen', !d.getElementById('ex-loesungen'));
    p('Klasse bleibt hängen', details.every(x => !x.classList.contains('ex-nur-aufgabe')));

    // --- Word ---
    d.querySelector('input[value="unten"]').checked = true;
    d.getElementById('ex-word').click();
    await warte(400);
    p('keine Word-Datei erzeugt', !!w.__inhalt);
    p('falscher Dateityp', w.__typ === 'application/msword');
    if (w.__inhalt) {
      const text = w.__inhalt;
      // Die Datei ist ein Web-Archiv: Kopfzeilen, ein HTML-Teil und je ein
      // Teil pro Bild. Der HTML-Teil steckt base64-codiert darin.
      p('kein Web-Archiv', text.startsWith('MIME-Version: 1.0'));
      p('kein mehrteiliger Inhalt', text.includes('multipart/related'));
      p('HTML-Teil fehlt', text.includes('Content-Type: text/html; charset="utf-8"'));
      const htmlTeil = (() => {
        const m = text.split('Content-Location: file:///C:/tbk/uebung.htm');
        if (m.length < 2) return '';
        const roh = m[1].split('--' + '----=_TBK_Unterrichtsmaterial')[0];
        return Buffer.from(roh.replace(/\s+/g, ''), 'base64').toString('utf8');
      })();
      p('HTML-Teil nicht lesbar', htmlTeil.length > 500);
      const text2 = htmlTeil;
      p('Word-Datei ohne Word-Namensraum', text2.includes('urn:schemas-microsoft-com:office:word'));
      p('Word-Datei ohne Hinweis auf die Interaktivität', text2.includes('interaktiv'));
      p('Word-Datei enthält noch Skripte', !/<script/i.test(text2));
      p('Word-Datei enthält noch Eingabefelder', !/<input/i.test(text2));
      p('Word-Datei enthält noch SVG', !/<svg/i.test(text2));
      // Auch hier zaehlt nur, was sichtbar ist.
      if ([...d.querySelectorAll('main svg')].some(x => !x.closest('[hidden]'))) {
        p('Bilder nicht als eigene Teile beigelegt', text.includes('Content-Type: image/png'));
        p('Bilder nicht im HTML verlinkt', /<img[^>]+src="bild\d+\.png"/.test(text2));
        p('Bilder noch als data-Adresse', !text2.includes('data:image/png'));
      }
      p('Word-Datei ohne Titel', text2.includes(d.title));
      p('kein Download ausgeloest', (w.__download || '').endsWith('.doc'));
    }
    p('Seite nach dem Word-Export nicht zurückgesetzt', details.every(x => !x.open));

    // --- PDF als Datei ---
    w.__inhalt = null; w.__typ = null;
    d.getElementById('ex-pdf-datei').click();
    await warte(500);
    p('kein PDF erzeugt', w.__typ === 'application/pdf');
    p('PDF-Datei ohne Endung .pdf', (w.__download || '').endsWith('.pdf'));
    p('Seite nach dem PDF-Bau nicht zurückgesetzt', details.every(x => !x.open));

    console.log((fehler.length ? 'FEHLER ' : 'ok     ') + datei +
      (fehler.length ? '\n         ' + fehler.join('\n         ') : ''));
    fehlerGesamt += fehler.length;
  }
  }

  /* Der Sonderfall steht wieder im ersten Paket. */
  dir = path.join(BASIS, PAKETE[0]);
  netz = PAKETE[0];

  /* Der eigentliche Fall: erst aufdecken, dann ausgeben. Uebung 3 blendet
     Teil 2 und 3 erst nach dem Aufloesen ein - danach muessen sie im Ausdruck
     stehen, vorher nicht. */
  {
    const { dom, w, d, fehler } = seite('03-wohin-geht-das-drehmoment.html');
    await fertig(dom);
    const p = (was, ok) => { if (!ok) fehler.push(was); };

    p('Teil 2 vorzeitig sichtbar', d.getElementById('aufloesung').hidden);
    d.getElementById('btnAufloesen').click();
    p('Teil 2 nach dem Aufloesen noch verborgen', !d.getElementById('aufloesung').hidden);

    const sichtbare = [...d.querySelectorAll('main details')]
      .filter(x => !x.closest('[hidden]'));
    p('keine Aufgaben sichtbar', sichtbare.length > 0);

    d.getElementById('ex-knopf').click();
    d.querySelector('input[value="ende"]').checked = true;
    d.getElementById('ex-pdf').click();
    await warte(120);

    const abschnitt = d.getElementById('ex-loesungen');
    p('kein Loesungsabschnitt nach dem Aufloesen', !!abschnitt);
    if (abschnitt) {
      p('Zahl der Loesungen stimmt nicht ('
        + abschnitt.querySelectorAll('h3').length + ' gegen ' + sichtbare.length + ')',
        abschnitt.querySelectorAll('h3').length === sichtbare.length);
      p('Verweis auf den Teil fehlt',
        [...abschnitt.querySelectorAll('h3')].some(h => /Teil \d/.test(h.textContent)));
    }
    w.dispatchEvent(new w.Event('afterprint'));

    console.log((fehler.length ? 'FEHLER ' : 'ok     ')
      + 'nach dem Aufloesen: Teil 2 und 3 im Ausdruck'
      + (fehler.length ? '\n         ' + fehler.join('\n         ') : ''));
    fehlerGesamt += fehler.length;
  }

  /* jsdom laesst die Fenster offen - ohne ein ausdrueckliches Ende
     bliebe der Prozess haengen, und der Reihenlauf wartete
     vergeblich. Beendet wird erst, wenn die Ausgabe geschrieben ist. */
  process.stdout.write((fehlerGesamt ? '\n' + fehlerGesamt + ' Fehler.'
    : '\nPDF- und Word-Ausgabe laufen.') + '\n',
    function(){ process.exit(fehlerGesamt ? 1 : 0); });
}

main();
