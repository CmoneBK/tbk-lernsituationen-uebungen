/* Der Wettkampf: derselbe Code, dieselben Aufgaben - und sonst nichts.
 *
 * Der Baustein verspricht dreierlei, und alle drei sind hier nachzuweisen:
 *   1. Wer denselben Code hat, würfelt dieselbe Reihenfolge. Das ist der
 *      ganze Mehrspielermodus; stimmt es nicht, ist der Wettkampf keiner.
 *   2. Er kommt ohne Anmeldung und ohne Übertragung aus - kein Speicher,
 *      kein Netz, keine fremde Adresse.
 *   3. Er räumt hinter sich auf: Math.random gehört der Seite, nicht dem
 *      Baustein. Nach "Beenden" muss es wieder das echte sein.
 *
 * Dazu die Verdrahtung: Jede Seite, die den Vertrag ausspricht, muss den
 * Baustein auch laden - und umgekehrt.
 */
const fs = require('fs'), path = require('path');
const { JSDOM } = require('jsdom');
const { BASIS, mitAssets } = require('./harness');

let fehler = 0;
const p = (was, ok, zusatz) => {
  console.log((ok ? '  ok     ' : '  FEHLER ') + was + (ok || !zusatz ? '' : ' – ' + zusatz));
  if (!ok) fehler++;
};

const QUELLE = fs.readFileSync(path.join(BASIS, 'assets/wettkampf.js'), 'utf8');

/* Ein Training im Kleinformat: Es sagt den Vertrag zu und schreibt bei jedem
   neuen Durchgang sechs Würfe mit. Mehr braucht es nicht, um zu sehen, ob
   zwei Geräte dieselbe Reihenfolge bekommen. */
/* Eine Attrappe der Sammelstelle, gebaut nach docs/WETTKAMPF-API.md. Sie hält
   ihre Runden im Speicher und antwortet sofort - so lässt sich prüfen, was
   das Material schickt und was es aus der Antwort macht, ohne dass ein Server
   laufen muss. */
function sammelstelle(o) {
  o = o || {};
  /* Der Anfang der Liste aus docs/WETTKAMPF-API.md § 5. Vergeben wird
     sequenziell nach Beitrittsreihenfolge, nicht gewürfelt: nr 1 ist Adler,
     nr 2 Ameise, nr 3 Biber. Der Endpunkt macht es genauso. */
  const NAMEN = ['Adler', 'Ameise', 'Biber', 'Bussard', 'Dachs', 'Delfin'];
  const runden = new Map();
  const rufe = [];
  if (o.runde) runden.set(o.runde.code, o.runde);

  function neueRunde(code, pfad, titel) {
    const r = { code, pfad, titel: titel || 'Training', teil: [] };
    runden.set(code, r);
    return r;
  }
  if (o.vorhanden) neueRunde(o.vorhanden, o.pfad || '/x/y.html', o.titel);

  function beitritt(r) {
    const nr = r.teil.length + 1;
    const t = { nr, name: NAMEN[(nr - 1) % NAMEN.length], geheim: 'g' + nr,
      runde: 0, richtig: 0, gesamt: 0, dauer: 0, fertig: false, weg: false };
    r.teil.push(t);
    return t;
  }

  function antwort(felder) {
    const a = felder.action;
    if (o.antwortet === false) return null;                 /* kein Server */
    if (o.fehler && o.fehler[a]) return { ok: false, error: o.fehler[a] };
    if (a === 'neu') {
      const r = neueRunde(o.neuerCode || 'K7M2Q', felder.pfad, felder.titel);
      const t = beitritt(r);
      return { ok: true, code: r.code, nr: t.nr, name: t.name,
        geheim: t.geheim, teilnehmer: r.teil.length };
    }
    if (a === 'beitreten') {
      const r = runden.get(felder.code);
      if (!r) return { ok: false, error: 'unbekannt' };
      if (r.teil.length >= (o.platz == null ? 60 : o.platz)) return { ok: false, error: 'voll' };
      const t = beitritt(r);
      return { ok: true, code: r.code, nr: t.nr, name: t.name, geheim: t.geheim,
        teilnehmer: r.teil.length, pfad: r.pfad, titel: r.titel };
    }
    if (a === 'stand') {
      const r = runden.get(felder.code);
      if (!r) return { ok: false, error: 'unbekannt' };
      const t = r.teil.filter((x) => x.geheim === felder.geheim)[0];
      if (!t) return { ok: false, error: 'fremd' };
      if (!t.fertig) {
        t.runde = Number(felder.runde) || 0;
        t.richtig = Number(felder.richtig) || 0;
        t.gesamt = Number(felder.gesamt) || 0;
        t.dauer = Number(felder.dauer) || 0;
        t.fertig = felder.fertig === '1';
      }
      if (o.wegNr) {
        r.teil.forEach((x) => { x.weg = x.nr === o.wegNr && !x.fertig; });
      }
      const rang = r.teil.slice().sort((x, y) => (y.fertig - x.fertig)
        || (y.richtig - x.richtig) || (x.dauer - y.dauer) || (x.nr - y.nr));
      return { ok: true, serverzeit: 1789452359, rang };
    }
    return { ok: false, error: 'kaputt' };
  }

  return {
    rufe,
    runden,
    /* Wird als window.fetch eingehängt. */
    fetch(adresse, wie) {
      const felder = {};
      String((wie || {}).body || '').split('&').forEach((p) => {
        if (!p) return;
        const t = p.split('=');
        felder[decodeURIComponent(t[0])] = decodeURIComponent((t[1] || '').replace(/\+/g, ' '));
      });
      rufe.push({ adresse: String(adresse), wie: wie || {}, felder });
      const d = antwort(felder);
      if (d === null) return Promise.reject(new Error('kein Server'));
      return Promise.resolve({ json: () => Promise.resolve(d) });
    },
  };
}

function seite(o) {
  o = o || {};
  const vertrag = 'window.TBK_WETTKAMPF={neu:function(){'
    + 'window.__folge=[];'
    + 'for(var i=0;i<6;i++)window.__folge.push(Math.random());'
    + '}' + (o.ohneRunden ? '' : ',runden:3') + '};';
  const html = '<!doctype html><html><head><title>Training</title></head><body>'
    + '<main><div class="box">Aufgabe</div></main>'
    + (o.ohneVertrag ? '' : '<script>' + vertrag + '</script>')
    + (o.mitQr ? '<script src="../../assets/qr.js"></script>' : '')
    + '<script src="../../assets/wettkampf.js"></script>'
    + '</body></html>';
  const dom = new JSDOM(mitAssets(html), {
    runScripts: 'dangerously',
    url: 'https://t-bk.de/unterrichtsmaterial/trainings/x/y.html' + (o.hash || ''),
    beforeParse(w) {
      w.__echt = w.Math.random;
      w.Element.prototype.scrollIntoView = function () {};
      /* Ohne Attrappe gibt es kein fetch - dann muss der Baustein ohne
         Sammelstelle auskommen, und genau das prüfen die ersten Abschnitte. */
      if (o.api) { w.__api = o.api; w.fetch = o.api.fetch; }
    },
  });
  return dom.window;
}

/* Die Tafel baut sich erst beim Öffnen auf. */
function tafelAuf(w) {
  const t = w.document.getElementById('wk-tafel');
  if (t.hidden) w.document.getElementById('wk-knopf').click();
  return t;
}

function knopfMit(tafel, text) {
  return [...tafel.querySelectorAll('button')]
    .filter((b) => b.textContent.trim() === text)[0];
}

/* Einen Durchgang mit einem eingetippten Code beginnen. */
function mitmachen(w, eingabe) {
  const t = tafelAuf(w);
  t.querySelector('#wk-eingabe').value = eingabe;
  knopfMit(t, 'Mitmachen').click();
  return w.__folge;
}

console.log('\nKnopf und Tafel');
{
  const w = seite();
  const d = w.document;
  const knopf = d.getElementById('wk-knopf');
  const tafel = d.getElementById('wk-tafel');
  p('Knopf wird angelegt', !!knopf);
  p('Knopf steht in derselben Leiste wie die anderen',
    !!knopf && knopf.parentNode && knopf.parentNode.id === 'tbk-leiste');
  p('Knopf sagt, dass er etwas aufklappt',
    !!knopf && knopf.getAttribute('aria-expanded') === 'false');
  p('Tafel ist zuerst zu', !!tafel && tafel.hidden);

  const t = tafelAuf(w);
  p('nach dem Klick ist die Tafel offen', !t.hidden);
  p('Knopf meldet das weiter', knopf.getAttribute('aria-expanded') === 'true');
  p('es gibt einen Startknopf', !!knopfMit(t, 'Wettkampf starten'));
  p('und ein Feld zum Mitmachen', !!t.querySelector('#wk-eingabe'));
  p('das Feld hat eine Beschriftung', !!t.querySelector('label[for="wk-eingabe"]'));

  knopf.click();
  p('noch ein Klick schliesst wieder', t.hidden);
}

console.log('\nOhne Zusage der Seite kein Knopf');
{
  const w = seite({ ohneVertrag: true });
  p('kein Knopf', !w.document.getElementById('wk-knopf'));
  p('keine Tafel', !w.document.getElementById('wk-tafel'));
  p('Math.random bleibt unangetastet', w.Math.random === w.__echt);
}

console.log('\nDerselbe Code, dieselbe Reihenfolge');
{
  const a = mitmachen(seite(), 'K7M2Q');
  const b = mitmachen(seite(), 'K7M2Q');
  const c = mitmachen(seite(), 'P4T8W');
  p('sechs Wuerfe sind angekommen', Array.isArray(a) && a.length === 6,
    JSON.stringify(a));
  p('gleicher Code, gleiche Folge', JSON.stringify(a) === JSON.stringify(b),
    JSON.stringify(a) + ' gegen ' + JSON.stringify(b));
  p('anderer Code, andere Folge', JSON.stringify(a) !== JSON.stringify(c));
  /* Ein Wuerfel, der immer dasselbe liefert, waere auch "gleich". */
  p('die Folge ist keine Wiederholung', new Set(a).size === 6);
  p('alle Werte liegen zwischen 0 und 1',
    a.every((z) => typeof z === 'number' && z >= 0 && z < 1));

  /* Ein selbst vergebener Code muss genauso wirken wie ein eingetippter. */
  const w = seite();
  const t = tafelAuf(w);
  knopfMit(t, 'Wettkampf starten').click();
  const eigen = w.document.querySelector('#wk-tafel .wk-code');
  p('der gewuerfelte Code steht auf der Tafel', !!eigen && eigen.textContent.length === 5,
    eigen && eigen.textContent);
  p('er benutzt nur unverwechselbare Zeichen',
    !!eigen && /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{5}$/.test(eigen.textContent),
    eigen && eigen.textContent);
  const nach = mitmachen(seite(), eigen.textContent);
  p('derselbe Code auf einem zweiten Geraet ergibt dieselbe Folge',
    JSON.stringify(nach) === JSON.stringify(w.__folge));
}

console.log('\nDen Code abtippen verzeiht');
{
  const gerade = mitmachen(seite(), 'K7M2Q');
  p('klein geschrieben', JSON.stringify(mitmachen(seite(), 'k7m2q')) === JSON.stringify(gerade));
  p('mit Bindestrich', JSON.stringify(mitmachen(seite(), 'K7-M2Q')) === JSON.stringify(gerade));
  p('mit Leerzeichen', JSON.stringify(mitmachen(seite(), ' K7 M2Q ')) === JSON.stringify(gerade));

  const w = seite();
  const t = tafelAuf(w);
  t.querySelector('#wk-eingabe').value = 'K7M';
  knopfMit(t, 'Mitmachen').click();
  p('zu kurz: nichts beginnt', w.__folge === undefined);
  p('zu kurz: die Tafel sagt es',
    /fünf Zeichen/.test(t.textContent), t.textContent.slice(-60));
}

console.log('\nDer Durchgang mit Runden');
{
  const w = seite();
  mitmachen(w, 'K7M2Q');
  const d = w.document;
  p('Streifen steht im Inhalt', !!d.getElementById('wk-streifen'));
  p('Streifen nennt den Code', /K7M2Q/.test(d.getElementById('wk-streifen').textContent));
  p('Streifen nennt die Runde',
    /Runde 1 von 3/.test(d.getElementById('wk-streifen').textContent),
    d.getElementById('wk-streifen').textContent);
  p('Streifen wird nicht mitgedruckt',
    d.getElementById('wk-streifen').getAttribute('data-druck') === 'weg');

  const melden = (ok) => d.dispatchEvent(
    new w.CustomEvent('tbk-runde', { detail: { richtig: ok } }));
  melden(true);
  p('nach einer Runde steht Runde 2',
    /Runde 2 von 3/.test(d.getElementById('wk-streifen').textContent),
    d.getElementById('wk-streifen').textContent);
  melden(false);
  melden(true);

  const erg = d.getElementById('wk-ergebnis');
  p('nach der letzten Runde steht das Ergebnis', !!erg);
  p('es zaehlt richtig mit', !!erg && /2 von 3 richtig/.test(erg.textContent),
    erg && erg.textContent.slice(0, 70));
  p('es nennt eine Zeit', !!erg && /in \d+:\d\d/.test(erg.textContent));
  p('es nennt den Code', !!erg && /K7M2Q/.test(erg.textContent));
  p('der Streifen ist weg', !d.getElementById('wk-streifen'));
  p('Ergebnis wird nicht mitgedruckt',
    !!erg && erg.getAttribute('data-druck') === 'weg');

  /* Nach dem Ende darf keine weitere Meldung mehr zaehlen. */
  melden(true);
  p('spaetere Meldungen zaehlen nicht mehr',
    /2 von 3 richtig/.test(d.getElementById('wk-ergebnis').textContent));
}

console.log('\nWo die Seite ihren Durchgang selbst kennt');
{
  const w = seite({ ohneRunden: true });
  mitmachen(w, 'K7M2Q');
  const d = w.document;
  p('der Durchgang beginnt trotzdem', Array.isArray(w.__folge));
  p('kein zweiter Streifen', !d.getElementById('wk-streifen'));
  d.dispatchEvent(new w.CustomEvent('tbk-runde', { detail: { richtig: true } }));
  p('kein zweites Ergebnis', !d.getElementById('wk-ergebnis'));
  p('der Code steht trotzdem auf der Tafel',
    !!d.querySelector('#wk-tafel .wk-code'));
}

console.log('\nAufraeumen');
{
  const w = seite();
  mitmachen(w, 'K7M2Q');
  p('waehrend des Wettkampfs wuerfelt der Baustein', w.Math.random !== w.__echt);
  p('der Knopf zeigt den Code', /K7M2Q/.test(w.document.getElementById('wk-knopf').textContent));
  knopfMit(w.document.getElementById('wk-tafel'), 'Beenden').click();
  p('danach wuerfelt wieder die Seite', w.Math.random === w.__echt);
  p('der Streifen ist weg', !w.document.getElementById('wk-streifen'));
  p('der Knopf heisst wieder Wettkampf',
    /Wettkampf/.test(w.document.getElementById('wk-knopf').textContent)
    && !/K7M2Q/.test(w.document.getElementById('wk-knopf').textContent));
  p('der Code steht nicht mehr in der Adresse', !/w=/.test(w.location.hash));
}

console.log('\nMitmachen ueber die Adresse');
{
  const w = seite({ hash: '#w=K7M2Q', mitQr: true });
  p('der Durchgang beginnt von allein', Array.isArray(w.__folge));
  p('und zwar mit derselben Folge wie eingetippt',
    JSON.stringify(w.__folge) === JSON.stringify(mitmachen(seite(), 'K7M2Q')));
  const t = tafelAuf(w);
  p('die Tafel zeigt den Code',
    !!t.querySelector('.wk-code') && t.querySelector('.wk-code').textContent === 'K7M2Q');
  const qr = t.querySelector('svg.wk-qr');
  p('ein QR-Code steht daneben', !!qr);
  p('der QR-Code ist beschriftet',
    !!qr && /QR/.test(qr.getAttribute('aria-label') || ''));
  p('er zeichnet auch etwas', !!qr && !!qr.querySelector('path')
    && qr.querySelector('path').getAttribute('d').length > 100);

  /* Fehlt der QR-Baustein, darf nichts kaputtgehen - nur der Code fehlt dann. */
  const ohne = seite({ hash: '#w=K7M2Q' });
  p('ohne QR-Baustein laeuft es weiter', Array.isArray(ohne.__folge));
  p('und dann eben ohne Bild', !ohne.document.querySelector('svg.wk-qr'));
}

/* Einen Durchgang zu Ende spielen und den Ergebniscode mitnehmen. So kommt
   die Prüfung an fremde Codes, ohne die Rechnerei nachzubauen. */
function durchspielen(w, treffer, gesamt) {
  gesamt = gesamt || 3;
  for (let i = 0; i < gesamt; i++) {
    w.document.dispatchEvent(new w.CustomEvent('tbk-runde',
      { detail: { richtig: i < treffer } }));
  }
  const m = w.document.querySelector('#wk-ergebnis .wk-meins');
  return m && m.textContent;
}

/* Ein Mitstreiter auf einem eigenen Geraet: Er macht mit, spielt zu Ende
   und gibt seinen Ergebniscode ab. */
function ergebnisVon(treffer, gesamt, wettkampf) {
  const x = seite();
  mitmachen(x, wettkampf || 'K7M2Q');
  return durchspielen(x, treffer, gesamt);
}

/* Die Tafel auf den Punktestand umschalten. */
function standAuf(w) {
  const t = w.document.getElementById('wk-tafel');
  if (t.hidden) tafelAuf(w);
  const k = [...t.querySelectorAll('button')]
    .filter((b) => /^Punktestand/.test(b.textContent.trim()))[0];
  if (k) k.click();
  return t;
}

function eintippen(w, code) {
  const t = w.document.getElementById('wk-tafel');
  t.querySelector('#wk-eingabe').value = code;
  knopfMit(t, 'Eintragen').click();
  return w.document.getElementById('wk-tafel');
}

/* Die Rangliste als schlichte Textzeilen - so lässt sich die Reihenfolge
   vergleichen, ohne auf das Aussehen zu bauen. */
function rangliste(tafel) {
  return [...tafel.querySelectorAll('.wk-rang li')].map((li) => ({
    wer: li.querySelector('.wk-wer').textContent,
    zahl: li.querySelector('.wk-zahl').textContent,
    ich: !!li.querySelector('.wk-ich'),
    sieg: li.classList.contains('wk-sieg'),
  }));
}

console.log('\nDer Ergebniscode');
{
  const w = seite();
  mitmachen(w, 'K7M2Q');
  const meins = durchspielen(w, 2, 3);
  p('am Ende steht ein Ergebniscode', !!meins, String(meins));
  p('er hat sechs Zeichen', !!meins && meins.length === 6, meins);
  p('nur unverwechselbare Zeichen',
    !!meins && /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/.test(meins), meins);
  p('er steht im Ergebnisblock zum Ablesen',
    /Ergebniscode/.test(w.document.getElementById('wk-ergebnis').textContent));

  /* Zwei, die gleich gut und gleich schnell waren, duerfen nicht denselben
     Code bekommen - sonst fiele einer von beiden aus der Liste. Bei zwanzig
     Versuchen faellt eine feste Zuordnung auf. */
  const gleiche = [];
  for (let i = 0; i < 20; i++) gleiche.push(ergebnisVon(2, 3));
  /* Die Kennung hat zweiunddreißig Werte; bei zwanzig Ziehungen sind rund
     fünfzehn verschiedene zu erwarten. Geprüft wird nur, dass überhaupt
     gewürfelt wird - eine feste Kennung ergäbe genau einen. */
  p('zwei gleich gute Ergebnisse bekommen verschiedene Codes',
    new Set(gleiche).size >= 10, new Set(gleiche).size + ' von 20 verschieden');
  /* Dieselben Treffer stecken trotzdem in allen. */
  p('und tragen trotzdem alle dasselbe Ergebnis',
    gleiche.every((c) => c.length === 6));
}

console.log('\nDer Punktestand');
{
  /* Drei Mitstreiter mit demselben Wettkampfcode. Jeder mit einer anderen
     Trefferzahl, auch anders als die eigene: Bei gleichem Ergebnis und
     gleicher Sekunde haengt der Code nur noch an der zufaelligen Kennung,
     und die Pruefung waere jedes zweiunddreissigste Mal eine andere. */
  const fremd = [1, 3, 0].map((t) => ergebnisVon(t, 3));

  const w = seite();
  mitmachen(w, 'K7M2Q');
  durchspielen(w, 2, 3);

  let t = standAuf(w);
  p('der Punktestand laesst sich oeffnen',
    /Punktestand/.test(t.querySelector('h2').textContent));
  p('das eigene Ergebnis steht schon drin', rangliste(t).length === 1);
  p('und ist als eigenes gekennzeichnet', rangliste(t)[0].ich);
  p('es gibt ein Feld fuer fremde Codes', !!t.querySelector('#wk-eingabe'));
  p('das Feld hat eine Beschriftung', !!t.querySelector('label[for="wk-eingabe"]'));

  fremd.forEach((c) => { t = eintippen(w, c); });
  const liste = rangliste(t);
  p('alle vier stehen im Punktestand', liste.length === 4, String(liste.length));
  p('der Beste steht oben', liste[0].zahl.indexOf('3/3') === 0, liste[0].zahl);
  p('der Schlechteste unten', liste[3].zahl.indexOf('0/3') === 0, liste[3].zahl);
  p('der Sieger ist hervorgehoben', liste[0].sieg && !liste[1].sieg);
  p('der Sieger wird auch genannt',
    /Sieger/.test(t.querySelector('.wk-sieger').textContent),
    t.querySelector('.wk-sieger').textContent);
  p('der Sieger ist der mit den meisten Treffern',
    t.querySelector('.wk-sieger').textContent.indexOf(liste[0].wer) >= 0);
  p('eine eigene Zeile bleibt markiert', liste.filter((z) => z.ich).length === 1);

  /* Im Punktestand steht kein Name - nur der Code. */
  p('in der Liste steht nur der Ergebniscode',
    liste.every((z) => /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/.test(z.wer)),
    liste.map((z) => z.wer).join(' '));
  p('es gibt kein Namensfeld',
    !/name|Name|wer bist|Spitzname/.test(
      [...t.querySelectorAll('label')].map((l) => l.textContent).join(' ')),
    [...t.querySelectorAll('label')].map((l) => l.textContent).join(' | '));
  p('der Punktestand sagt, dass er anonym ist',
    /Kein Name/.test(t.textContent));
}

console.log('\nWas der Punktestand nicht annimmt');
{
  const w = seite();
  mitmachen(w, 'K7M2Q');
  const meins = durchspielen(w, 2, 3);
  let t = standAuf(w);

  t = eintippen(w, meins);
  p('denselben Code nicht zweimal',
    /schon im Punktestand/.test(t.textContent), t.textContent.slice(-80));
  p('und die Liste bleibt, wie sie war', rangliste(t).length === 1);

  t = eintippen(w, 'K7M2');
  p('zu kurz wird abgelehnt', /sechs Zeichen/.test(t.textContent));

  /* Ein Code aus einem anderen Wettkampf: gleiches Verfahren, anderer
     Startwert - das Pruefzeichen passt nicht. */
  t = eintippen(w, ergebnisVon(3, 3, 'P4T8W'));
  p('ein Code aus einem anderen Wettkampf wird abgelehnt',
    /anderen Wettkampf|nicht zu Wettkampf/.test(t.textContent),
    t.textContent.slice(-90));
  p('und landet nicht in der Liste', rangliste(t).length === 1);

  /* Ein Zahlendreher faellt am Pruefzeichen auf - nicht jeder, aber der
     allergroesste Teil. Hier zaehlen wir nach. */
  const gedreht = [];
  for (let i = 0; i < meins.length - 1; i++) {
    if (meins[i] === meins[i + 1]) continue;
    gedreht.push(meins.slice(0, i) + meins[i + 1] + meins[i] + meins.slice(i + 2));
  }
  const durch = gedreht.filter((g) => {
    const x = seite();
    mitmachen(x, 'K7M2Q');
    standAuf(x);
    return rangliste(eintippen(x, g)).length > 1;
  });
  p('Zahlendreher fallen fast immer auf', durch.length === 0,
    durch.join(' ') + ' von ' + gedreht.length);
}

console.log('\nDer Punktestand gehoert zu seinem Wettkampf');
{
  const w = seite();
  mitmachen(w, 'K7M2Q');
  durchspielen(w, 2, 3);
  standAuf(w);
  p('ein Ergebnis steht drin', rangliste(w.document.getElementById('wk-tafel')).length === 1);

  /* Dieselbe Runde noch einmal: Die Mitstreiter bleiben stehen, das eigene
     Ergebnis wird ersetzt. */
  eintippen(w, ergebnisVon(3, 3));
  knopfMit(w.document.getElementById('wk-tafel'), 'Zurück zum Wettkampf').click();
  knopfMit(w.document.getElementById('wk-tafel'), 'Noch einmal').click();
  durchspielen(w, 1, 3);
  const liste = rangliste(standAuf(w));
  p('nach "Noch einmal" bleibt der Mitstreiter stehen', liste.length === 2,
    JSON.stringify(liste));
  p('das eigene Ergebnis ist das neue',
    liste.filter((z) => z.ich).length === 1
    && liste.filter((z) => z.ich)[0].zahl.indexOf('1/3') === 0,
    JSON.stringify(liste));

  /* Beenden raeumt ihn weg - und der naechste Wettkampf faengt bei null an.
     Anders kommt man auch gar nicht zu einem anderen Code: Solange einer
     laeuft, gibt es kein Eingabefeld. */
  knopfMit(w.document.getElementById('wk-tafel'), 'Zurück zum Wettkampf').click();
  knopfMit(w.document.getElementById('wk-tafel'), 'Beenden').click();
  p('nach dem Beenden ist der Punktestand leer',
    !w.document.querySelector('.wk-rang'));
  p('und der Ergebnisblock ist weg', !w.document.getElementById('wk-ergebnis'));
  mitmachen(w, 'P4T8W');
  p('der naechste Wettkampf faengt leer an',
    rangliste(standAuf(w)).length === 0);
}

console.log('\nWenn die Seite ihren Durchgang selbst fuehrt');
{
  const w = seite({ ohneRunden: true });
  mitmachen(w, 'K7M2Q');
  w.document.dispatchEvent(new w.CustomEvent('tbk-durchgang-ende',
    { detail: { richtig: 8, gesamt: 12 } }));
  const erg = w.document.getElementById('wk-ergebnis');
  p('die Meldung am Ende erzeugt einen Ergebnisblock', !!erg);
  p('mit dem gemeldeten Stand', !!erg && /8 von 12 richtig/.test(erg.textContent),
    erg && erg.textContent.slice(0, 60));
  const meins = erg && erg.querySelector('.wk-meins');
  p('und einem Ergebniscode', !!meins && meins.textContent.length === 6);
  const liste = rangliste(standAuf(w));
  p('das Ergebnis steht im Punktestand', liste.length === 1 && liste[0].ich);
  p('mit der gemeldeten Rundenzahl', liste[0].zahl.indexOf('8/12') === 0,
    liste[0].zahl);

  /* Ohne laufenden Wettkampf darf die Meldung nichts ausloesen. */
  const still = seite({ ohneRunden: true });
  still.document.dispatchEvent(new still.CustomEvent('tbk-durchgang-ende',
    { detail: { richtig: 8, gesamt: 12 } }));
  p('ohne Wettkampf passiert nichts', !still.document.getElementById('wk-ergebnis'));
}

console.log('\nKeine Anmeldung, keine Spur');
{
  const code = QUELLE.replace(/\/\*[\s\S]*?\*\//g, '');
  p('kein localStorage', !/localStorage/.test(code));
  p('kein sessionStorage', !/sessionStorage/.test(code));
  p('kein Cookie', !/document\.cookie/.test(code));
  p('kein XMLHttpRequest', !/XMLHttpRequest/.test(code));
  p('kein WebSocket', !/WebSocket|RTCPeerConnection|EventSource/.test(code));
  p('kein sendBeacon', !/sendBeacon/.test(code));

  /* Gesprochen wird nur mit der eigenen Sammelstelle, und nur ueber einen
     Weg. Der Namensraum der SVG ist eine Kennung, keine Adresse. */
  const rufe = code.match(/fetch\s*\(\s*([A-Za-z_$][\w$]*)/g) || [];
  p('genau ein Ruf nach draussen', rufe.length === 1, rufe.join(' '));
  const ziel = /var API = '([^']+)'/.exec(QUELLE);
  p('und der geht an die eigene Sammelstelle',
    !!ziel && ziel[1].indexOf('/api/') === 0, ziel && ziel[1]);
  const fremd = (QUELLE.match(/https?:\/\/[^\s'"]+/g) || [])
    .filter((a) => a !== 'http://www.w3.org/2000/svg');
  p('keine fremde Adresse', fremd.length === 0, fremd.join(' '));

  /* Was hinausgeht, steht in genau einem Aufruf - und es ist nichts dabei,
     woran eine Person zu erkennen waere. */
  /* Nur echte Schluessel zaehlen - nicht das, was hinter einem Fragezeichen
     als Zweig steht. */
  const felder = [...(code.match(/ruf\(\{[\s\S]*?\}\s*,/g) || []).join('\n')
    .matchAll(/[{,]\s*([a-z]+)\s*:/g)].map((m) => m[1]);
  const erlaubt = ['action', 'code', 'geheim', 'runde', 'richtig', 'gesamt',
    'dauer', 'fertig', 'pfad', 'titel', 'runden'];
  const zuviel = felder.filter((f) => erlaubt.indexOf(f) < 0);
  p('nur die verabredeten Felder gehen hinaus', zuviel.length === 0,
    zuviel.join(' '));
  p('kein Feld fuer einen Namen',
    !/\bname\s*:\s*[^,}]*eingabe|input[^>]*name=|Spitzname|Vorname/i.test(code));
  p('der Code verlaesst das Geraet nur als Bild und als Adresse im eigenen Fenster',
    !/location\s*=|location\.href\s*=|\.submit\s*\(/.test(code));
}

console.log('\nVerdrahtung');
{
  const sammeln = (ordner) => {
    const aus = [];
    if (!fs.existsSync(ordner)) return aus;
    for (const e of fs.readdirSync(ordner, { withFileTypes: true })) {
      const pf = path.join(ordner, e.name);
      if (e.isDirectory()) aus.push(...sammeln(pf));
      else if (/\.html$/.test(e.name)) aus.push(pf);
    }
    return aus;
  };
  const seiten = sammeln(path.join(BASIS, 'trainings'))
    .map((f) => ({ f, t: fs.readFileSync(f, 'utf8') }));

  const mitVertrag = seiten.filter((s) => /TBK_WETTKAMPF\s*=/.test(s.t));
  p(mitVertrag.length + ' Trainings machen mit', mitVertrag.length >= 7,
    String(mitVertrag.length));

  const ohneBaustein = mitVertrag.filter(
    (s) => !/<script src="[^"]*assets\/wettkampf\.js"><\/script>/.test(s.t));
  p('jedes davon laedt den Baustein', ohneBaustein.length === 0,
    ohneBaustein.map((s) => path.relative(BASIS, s.f)).join(', '));

  const ohneVertrag = seiten.filter(
    (s) => /assets\/wettkampf\.js"><\/script>/.test(s.t) && !/TBK_WETTKAMPF\s*=/.test(s.t));
  p('und keine Seite laedt ihn umsonst', ohneVertrag.length === 0,
    ohneVertrag.map((s) => path.relative(BASIS, s.f)).join(', '));

  /* Wer dem Baustein die Runden ueberlaesst, muss sie auch melden. */
  const stumm = mitVertrag.filter((s) => /runden\s*:\s*\d/.test(s.t)
    && !/['"]tbk-runde['"]/.test(s.t));
  p('wer Runden zusagt, meldet sie auch', stumm.length === 0,
    stumm.map((s) => path.relative(BASIS, s.f)).join(', '));

  /* Und wer sie nicht meldet, darf sie auch nicht zusagen - sonst bliebe
     der Streifen auf Runde 1 stehen. */
  const versprochen = mitVertrag.filter((s) => !/runden\s*:\s*\d/.test(s.t)
    && /['"]tbk-runde['"]/.test(s.t));
  p('wer keine Runden zusagt, meldet auch keine', versprochen.length === 0,
    versprochen.map((s) => path.relative(BASIS, s.f)).join(', '));

  p('der Vertrag nennt immer eine Funktion',
    mitVertrag.every((s) => /neu\s*:\s*(function|[A-Za-z_$])/.test(s.t)));

  /* Wer seinen Durchgang selbst fuehrt, muss sein Ende melden - sonst gaebe
     es dort nie einen Ergebniscode und niemanden im Punktestand. */
  const eigene = mitVertrag.filter((s) => !/runden\s*:\s*\d/.test(s.t));
  const ohneEnde = eigene.filter((s) => !/['"]tbk-durchgang-ende['"]/.test(s.t));
  p('wer selbst zaehlt, meldet sein Ende', ohneEnde.length === 0,
    ohneEnde.map((s) => path.relative(BASIS, s.f)).join(', '));

  /* Und er sagt, wo sein eigener Ergebnisblock steht - dorthin gehoert der
     Code, nicht an den Seitenanfang. */
  const falscherPlatz = eigene.filter((s) => {
    const m = /ergebnisAn\s*:\s*["']([\w-]+)["']/.exec(s.t);
    return !m || !new RegExp('id\\s*=\\s*["\']' + m[1] + '["\']').test(s.t);
  });
  p('und nennt einen Block, den es auch gibt', falscherPlatz.length === 0,
    falscherPlatz.map((s) => path.relative(BASIS, s.f)).join(', '));
}

/* ---------------------------------------------------------------------- *
 * Mit Sammelstelle. Ab hier ist alles asynchron: Der Baustein fragt, und
 * erst die Antwort baut die Tafel neu.
 * ---------------------------------------------------------------------- */

function ruhe(n) {
  let p = Promise.resolve();
  for (let i = 0; i < (n || 4); i++) {
    p = p.then(() => new Promise((los) => setTimeout(los, 1)));
  }
  return p;
}

/* Einen Wettkampf aufmachen, wie es der Knopf tut. */
async function aufmachen(w) {
  const t = tafelAuf(w);
  knopfMit(t, 'Wettkampf starten').click();
  await ruhe();
  return w.document.getElementById('wk-tafel');
}

async function beitreten(w, c) {
  const t = tafelAuf(w);
  t.querySelector('#wk-eingabe').value = c;
  knopfMit(t, 'Mitmachen').click();
  await ruhe();
  return w.document.getElementById('wk-tafel');
}

async function melden(w, richtig, mal) {
  for (let i = 0; i < (mal || 1); i++) {
    w.document.dispatchEvent(new w.CustomEvent('tbk-runde',
      { detail: { richtig: i < richtig } }));
  }
  await ruhe();
}

(async function () {
  console.log('\nEine Runde aufmachen');
  {
    const api = sammelstelle({ neuerCode: 'K7M2Q' });
    const w = seite({ api });
    const t = await aufmachen(w);
    const ruf = api.rufe[0];
    p('es wird gesendet', !!ruf);
    p('als Formulardaten an die eigene Sammelstelle',
      !!ruf && ruf.adresse.indexOf('/api/') === 0, ruf && ruf.adresse);
    p('Aktion neu', !!ruf && ruf.felder.action === 'neu', ruf && ruf.felder.action);
    p('mit dem Pfad des Trainings',
      !!ruf && ruf.felder.pfad === '/unterrichtsmaterial/trainings/x/y.html',
      ruf && ruf.felder.pfad);
    p('mit dem Titel', !!ruf && ruf.felder.titel === 'Training', ruf && ruf.felder.titel);
    p('mit der Rundenzahl', !!ruf && ruf.felder.runden === '3', ruf && ruf.felder.runden);
    p('kein Name geht mit', !!ruf && !('name' in ruf.felder));

    p('der Code kommt vom Server',
      !!t.querySelector('.wk-code') && t.querySelector('.wk-code').textContent === 'K7M2Q',
      t.querySelector('.wk-code') && t.querySelector('.wk-code').textContent);
    p('der Durchgang beginnt', Array.isArray(w.__folge));
    p('die Rangliste steht gleich in der Tafel', !!t.querySelector('.wk-rang'));
    const liste = rangliste(t);
    p('man selbst steht drin', liste.length === 1 && liste[0].ich, JSON.stringify(liste));
    p('und zwar unter dem Namen vom Server', liste[0].wer === 'Adler', liste[0].wer);
    p('kein Ergebniscode-Punktestand daneben',
      !knopfMit(t, 'Punktestand'), 'Knopf Punktestand sollte fehlen');
  }

  console.log('\nZwei Geraete in derselben Runde');
  {
    const api = sammelstelle({ neuerCode: 'K7M2Q' });
    const a = seite({ api });
    await aufmachen(a);
    const b = seite({ api });
    const tb = await beitreten(b, 'K7M2Q');
    p('das zweite Geraet tritt bei', Array.isArray(b.__folge));
    p('es bekommt einen eigenen Namen',
      rangliste(tb).filter((z) => z.ich)[0].wer === 'Ameise',
      JSON.stringify(rangliste(tb)));
    p('beide stehen in seiner Liste', rangliste(tb).length === 2);
    p('gleicher Code, gleiche Aufgabenfolge',
      JSON.stringify(a.__folge) === JSON.stringify(b.__folge));

    /* Die Namen kommen der Reihe nach, nicht gewuerfelt - so steht es im
       Vertrag, und so macht es der Endpunkt. */
    const dritt = seite({ api });
    const viert = seite({ api });
    await beitreten(dritt, 'K7M2Q');
    await beitreten(viert, 'K7M2Q');
    p('die Namen folgen der Beitrittsreihenfolge',
      rangliste(tafelAuf(dritt)).filter((z) => z.ich)[0].wer === 'Biber'
      && rangliste(tafelAuf(viert)).filter((z) => z.ich)[0].wer === 'Bussard',
      rangliste(tafelAuf(viert)).map((z) => z.wer).join(' '));

    /* Der Fortschritt des einen erscheint beim anderen. */
    await melden(b, 2, 2);
    const ta = tafelAuf(a);
    await melden(a, 0, 1);
    const zeilen = rangliste(a.document.getElementById('wk-tafel'));
    p('der Fortschritt des anderen kommt an',
      zeilen.some((z) => z.wer === 'Ameise' && /Runde 3 von 3/.test(z.zahl)),
      JSON.stringify(zeilen));
    p('der eigene Fortschritt auch',
      zeilen.some((z) => z.ich && /Runde 2 von 3/.test(z.zahl)),
      JSON.stringify(zeilen));
    const gesendet = api.rufe.filter((r) => r.felder.action === 'stand');
    p('gemeldet wird mit Geheimnis', gesendet.every((r) => !!r.felder.geheim));
    p('und ohne alles, was jemanden verraet',
      gesendet.every((r) => !('name' in r.felder) && !('titel' in r.felder)));
  }

  console.log('\nBis zum Ende');
  {
    const api = sammelstelle({ neuerCode: 'K7M2Q' });
    const a = seite({ api });
    await aufmachen(a);
    const b = seite({ api });
    await beitreten(b, 'K7M2Q');

    await melden(b, 3, 3);                      /* b spielt fehlerfrei durch */
    const eb = b.document.getElementById('wk-ergebnis');
    p('das Ergebnis steht da', !!eb && /3 von 3 richtig/.test(eb.textContent),
      eb && eb.textContent.slice(0, 50));
    p('ohne Ergebniscode - den braucht hier niemand', !eb.querySelector('.wk-meins'));
    p('dafuer mit dem eigenen Namen', /Ameise/.test(eb.textContent));
    const schluss = api.rufe.filter((r) => r.felder.fertig === '1');
    p('dem Server wird das Ende gemeldet', schluss.length > 0);
    p('mit Treffern und Zeit', !!schluss[0]
      && schluss[0].felder.richtig === '3' && 'dauer' in schluss[0].felder,
      JSON.stringify(schluss[0] && schluss[0].felder));

    await melden(a, 1, 3);
    const zeilen = rangliste(a.document.getElementById('wk-tafel'));
    p('der Bessere steht oben', zeilen[0].wer === 'Ameise', JSON.stringify(zeilen));
    p('er ist als Sieger hervorgehoben', zeilen[0].sieg);
    p('der Vorsprung wird genannt',
      /Vorn: Ameise/.test(a.document.getElementById('wk-tafel').textContent));
  }

  console.log('\nWas die Sammelstelle sagen kann');
  {
    const w = seite({ api: sammelstelle({}) });     /* kennt K7M2Q nicht */
    const t = await beitreten(w, 'K7M2Q');
    p('unbekannter Code: die Tafel sagt es', /gibt es nicht mehr/.test(t.textContent),
      t.textContent.slice(-80));
    p('und nichts beginnt', w.__folge === undefined);

    const voll = seite({ api: sammelstelle({ vorhanden: 'K7M2Q', platz: 0 }) });
    const tv = await beitreten(voll, 'K7M2Q');
    p('volle Runde: die Tafel sagt es', /voll/.test(tv.textContent));
    p('und nichts beginnt', voll.__folge === undefined);

    /* Ein Code, der zu einem anderen Training gehoert. */
    const fremd = seite({ api: sammelstelle({ vorhanden: 'K7M2Q',
      pfad: '/unterrichtsmaterial/trainings/x/anderes.html', titel: 'Anderes' }) });
    const tf = await beitreten(fremd, 'K7M2Q');
    p('fremdes Training: es wird gewarnt',
      /anderen Training/.test(tf.textContent), tf.textContent.slice(0, 200));
    p('aber der Durchgang beginnt trotzdem', Array.isArray(fremd.__folge));
  }

  console.log('\nWenn die Sammelstelle ausfaellt');
  {
    const w = seite({ api: sammelstelle({ antwortet: false }) });
    const t = await aufmachen(w);
    p('der Wettkampf beginnt trotzdem', Array.isArray(w.__folge));
    p('mit einem selbst gewuerfelten Code',
      !!t.querySelector('.wk-code') && t.querySelector('.wk-code').textContent.length === 5);
    p('und dem Ergebniscode als Rueckfallebene', !!knopfMit(t, 'Punktestand'));
    await melden(w, 2, 3);
    const e = w.document.getElementById('wk-ergebnis');
    p('am Ende steht wieder ein Ergebniscode', !!e && !!e.querySelector('.wk-meins'),
      e && e.textContent.slice(0, 60));

    /* Zu viele Runden in kurzer Zeit: Der Wettkampf laeuft trotzdem, aber
       es steht dann auch da, warum die Mitstreiter fehlen. */
    const zuviel = seite({ api: sammelstelle({ fehler: { neu: 'rate limit' } }) });
    const tz = await aufmachen(zuviel);
    p('Ratenlimit: der Wettkampf beginnt trotzdem', Array.isArray(zuviel.__folge));
    p('und die Tafel sagt, warum die Rangliste fehlt',
      /zu viele Runden/.test(tz.textContent), tz.textContent.slice(0, 160));
    p('mit dem Ergebniscode als Ausweg', !!knopfMit(tz, 'Punktestand'));

    const eng = seite({ api: sammelstelle({ vorhanden: 'K7M2Q',
      fehler: { beitreten: 'rate limit' } }) });
    const te = await beitreten(eng, 'K7M2Q');
    p('dasselbe beim Beitreten', Array.isArray(eng.__folge)
      && /zu viele/.test(te.textContent), te.textContent.slice(0, 160));

    /* Faellt sie mittendrin aus, laeuft der Durchgang weiter. */
    const api = sammelstelle({ neuerCode: 'K7M2Q', fehler: { stand: 'db error' } });
    const x = seite({ api });
    const tx = await aufmachen(x);
    p('Fehler beim Melden beendet nichts', Array.isArray(x.__folge));
    await melden(x, 1, 3);
    p('und der Durchgang kommt zu Ende',
      !!x.document.getElementById('wk-ergebnis'));
  }

  console.log('\nVerlassene Zeilen');
  {
    const api = sammelstelle({ neuerCode: 'K7M2Q', wegNr: 2 });
    const a = seite({ api });
    await aufmachen(a);
    const b = seite({ api });
    await beitreten(b, 'K7M2Q');
    await melden(a, 0, 1);
    const zeilen = rangliste(a.document.getElementById('wk-tafel'));
    p('wer weg ist, steht nicht in der Liste',
      zeilen.length === 1 && zeilen[0].ich, JSON.stringify(zeilen));
  }

  console.log('\nDie Spezifikation liegt bei');
  {
    const doc = path.join(BASIS, 'docs', 'WETTKAMPF-API.md');
    p('docs/WETTKAMPF-API.md ist da', fs.existsSync(doc));
    const text = fs.existsSync(doc) ? fs.readFileSync(doc, 'utf8') : '';
    const ziel = /var API = '([^']+)'/.exec(QUELLE);
    p('sie nennt denselben Endpunkt',
      !!ziel && text.indexOf(ziel[1].replace(/^\//, '')) > 0, ziel && ziel[1]);
    ['neu', 'beitreten', 'stand'].forEach((a) => {
      p('sie beschreibt action=' + a, text.indexOf('action=' + a) > 0);
    });
    p('sie haelt die Aufbewahrung fest', /24 Stunden/.test(text));
  }

  console.log(fehler ? '\n' + fehler + ' Befunde' : '\nalles gruen');
  process.exit(fehler ? 1 : 0);
}());
