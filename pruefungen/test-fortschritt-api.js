/* Der Stand auf einem anderen Gerät - assets/fortschritt.js gegen
 * /api/fortschritt.php.
 *
 * Geprüft wird gegen eine Attrappe, die sich verhält wie der abgenommene
 * Endpunkt: Fehlerfeld `fehler`, die Werte des Vertrags, `holen` auf eine
 * unbekannte Seite liefert `daten: null` statt eines Fehlers, und ab dem
 * zehnten Fehlversuch wird gesperrt.
 *
 * Wichtig sind vor allem die Dinge, die niemandem auffallen, wenn sie
 * schiefgehen:
 *   - Ohne Code darf nichts gesendet werden. Auch nicht „nur mal nachsehen".
 *   - Die PIN darf nirgends liegen bleiben.
 *   - Falscher Code und falsche PIN müssen gleich klingen.
 *   - Fällt der Server aus, muss der Stand auf dem Gerät weiterlaufen.
 *   - Ein Stand, der nicht mehr zur Seite passt, darf nicht eingesetzt
 *     werden.
 *
 * Der Vertrag steht in docs/FORTSCHRITT-API.md.
 */
const fs = require('fs'), path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const { BASIS, mitAssets, fertig } = require('./harness');

let fehler = 0;
const p = (was, ok, zusatz) => {
  console.log((ok ? '  ok     ' : '  FEHLER ') + was + (ok || !zusatz ? '' : ' – ' + zusatz));
  if (!ok) fehler++;
};

const SEITE = 'uebungen/drehprozess/06-auf-welches-mass-wird-geschlichtet.html';
const URL = 'https://t-bk.de/unterrichtsmaterial/' + SEITE;
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/* ---------- die Attrappe ---------- */

/* Sie hält sich an den Vertrag, nicht an das, was bequem waere: dieselbe
   Meldung fuer unbekannten Code und falsche PIN, Sperre ab dem zehnten
   Fehlversuch, und `holen` auf eine unbekannte Seite ist kein Fehler. */
function server() {
  const konten = {};          // code -> { pin, fehlschlag, gesperrtBis }
  const staende = {};         // code -> { seite -> { daten, geaendert } }
  const anfragen = [];
  let naechsterCode = 0;
  let antwortet = true;

  function neuerCode() {
    /* Vorhersagbar, damit die Pruefung ihn kennt - der echte Server
       wuerfelt. */
    const n = naechsterCode++;
    let c = '';
    for (let i = 0; i < 6; i++) c += ALPHABET[(n + i * 5) % ALPHABET.length];
    return c;
  }

  function pruefen(code, pin) {
    const k = konten[code];
    /* Kein Konto: dieselbe Antwort wie bei falscher PIN. */
    if (!k) return 'unbekannt';
    if (k.gesperrtBis && k.gesperrtBis > Date.now()) return 'gesperrt';
    if (k.pin !== pin) {
      k.fehlschlag++;
      if (k.fehlschlag >= 10) {
        k.gesperrtBis = Date.now() + (k.fehlschlag >= 15 ? 300000 : 60000);
        return 'gesperrt';
      }
      return 'unbekannt';
    }
    k.fehlschlag = 0;
    k.gesperrtBis = null;
    return null;
  }

  return {
    anfragen,
    konten,
    staende,
    stumm() { antwortet = false; },
    laut() { antwortet = true; },

    /* Ein fetch-Ersatz, der urlencodierte Koerper versteht. */
    fetch(u, o) {
      const daten = {};
      String((o && o.body) || '').split('&').filter(Boolean).forEach((teil) => {
        const i = teil.indexOf('=');
        daten[decodeURIComponent(teil.slice(0, i))] =
          decodeURIComponent(teil.slice(i + 1).replace(/\+/g, ' '));
      });
      anfragen.push({ url: String(u), daten });

      if (!antwortet) return Promise.reject(new Error('kein Netz'));

      const antwort = (o2) => Promise.resolve({ json: () => Promise.resolve(o2) });
      const schief = (f) => antwort({ ok: false, fehler: f });

      if (daten.action === 'neu') {
        if (!/^[0-9]{4}$/.test(daten.pin || '')) return schief('ungueltig');
        const c = neuerCode();
        konten[c] = { pin: daten.pin, fehlschlag: 0, gesperrtBis: null };
        staende[c] = {};
        return antwort({ ok: true, code: c });
      }

      if (daten.action === 'sichern') {
        const f = pruefen(daten.code, daten.pin);
        if (f) return schief(f);
        if (!daten.seite || daten.seite.length > 160
          || !/^[a-z0-9/_.-]+$/.test(daten.seite)) return schief('ungueltig');
        if ((daten.daten || '').length > 64 * 1024) return schief('zugross');
        staende[daten.code][daten.seite] =
          { daten: daten.daten, geaendert: new Date().toISOString() };
        return antwort({ ok: true });
      }

      if (daten.action === 'holen') {
        const f = pruefen(daten.code, daten.pin);
        if (f) return schief(f);
        if (!daten.seite) {
          return antwort({ ok: true, seiten:
            Object.keys(staende[daten.code]).map((s) => ({
              seite: s, geaendert: staende[daten.code][s].geaendert })) });
        }
        const s = staende[daten.code][daten.seite];
        /* Unbekannte Seite ist kein Fehler - so macht es der echte Server. */
        if (!s) return antwort({ ok: true, daten: null, geaendert: null });
        return antwort({ ok: true, daten: s.daten, geaendert: s.geaendert });
      }

      if (daten.action === 'loeschen') {
        const f = pruefen(daten.code, daten.pin);
        if (f) return schief(f);
        delete konten[daten.code];
        delete staende[daten.code];
        return antwort({ ok: true });
      }

      return schief('ungueltig');
    },
  };
}

/* ---------- ein Gerät ---------- */

/* mitAssets setzt die Bausteine inline ein - dann hat das laufende Skript
   kein `src`, und der Baustein koennte den Auslieferungspfad nicht
   abziehen. Im Browser ist die Einbindung immer da; hier wird sie
   nachgestellt. Das fuehrende "./" haelt mitAssets davon ab, auch diese
   Zeile durch den Dateiinhalt zu ersetzen. */
function mitEinbindung(html) {
  return mitAssets(html).replace(
    '<script>/* Der Stand des Ausf',
    '<script src="./../../assets/fortschritt.js"></' + 'script>'
    + '<script>/* Der Stand des Ausf');
}

async function geraet(srv, vorrat) {
  const vc = new VirtualConsole();
  const laut = [];
  vc.on('jsdomError', (e) => laut.push((e.detail || e).toString().split('\n')[0]));
  const dom = new JSDOM(mitEinbindung(fs.readFileSync(path.join(BASIS, SEITE), 'utf8')), {
    runScripts: 'dangerously',
    url: URL,
    virtualConsole: vc,
    beforeParse(w) {
      w.Element.prototype.scrollIntoView = function () {};
      Object.keys(vorrat || {}).forEach((k) => w.localStorage.setItem(k, vorrat[k]));
      w.fetch = function (u, o) { return srv.fetch(u, o); };
    },
  });
  await fertig(dom);
  return { w: dom.window, d: dom.window.document, laut };
}

function vorratVon(w) {
  const aus = {};
  for (let i = 0; i < w.localStorage.length; i++) {
    const k = w.localStorage.key(i);
    aus[k] = w.localStorage.getItem(k);
  }
  return aus;
}

const knoepfe = (d, wo) => [...d.querySelectorAll(wo + ' button')];
const drueck = (d, wo, beschriftung) => {
  const b = knoepfe(d, wo).filter((x) => x.textContent.indexOf(beschriftung) === 0)[0];
  if (b) b.click();
  return !!b;
};
const meldung = (d) => (d.getElementById('standMeldung') || {}).textContent || '';
/* Die Antwort kommt über zwei Mikrotasks (fetch -> json). */
const atempause = () => new Promise((los) => setTimeout(los, 0));

async function alles() {
  console.log('Ohne Code wird nicht gesprochen');
  let srv = server();
  {
    const { w, d, laut } = await geraet(srv, {});
    p('die Seite laedt ohne Fehler', laut.length === 0, laut[0]);

    /* Ausfuellen und in den Hintergrund - Stufe 1 laeuft, mehr nicht. */
    d.getElementById('a_g6_es').value = '-7';
    d.dispatchEvent(new w.Event('input', { bubbles: true }));
    w.tbkStandSichern();
    p('beim Ausfuellen geht nichts an den Server', srv.anfragen.length === 0,
      String(srv.anfragen.length));

    const knopf = knoepfe(d, '#standHinweis')
      .filter((b) => /anderem Ger/.test(b.textContent))[0];
    p('der Knopf fuer das andere Geraet ist da', !!knopf,
      knoepfe(d, '#standHinweis').map((b) => b.textContent).join(' | '));
    knopf.click();
    p('die Tafel geht auf', !!d.getElementById('standTafel'));
    p('und traegt data-merken="nein"',
      !!d.querySelector('#standTafel[data-merken="nein"]'));
    p('sie wird nicht mitgedruckt',
      !!d.querySelector('#standTafel[data-druck="weg"]'));
    p('auch das Aufmachen spricht mit niemandem', srv.anfragen.length === 0);
    w.close();
  }

  console.log('\nCode anlegen und hochladen');
  let code = null, vorrat = null;
  {
    const { w, d } = await geraet(srv, {});
    const passungen = w.eval('PASSUNGEN');
    passungen.forEach((x) => {
      d.getElementById('a_' + x.id + '_es').value = String(x.es);
      d.getElementById('m_' + x.id + '_z').value = x.mitte.toFixed(4);
    });
    d.dispatchEvent(new w.Event('input', { bubbles: true }));

    knoepfe(d, '#standHinweis')
      .filter((b) => /anderem Ger/.test(b.textContent))[0].click();

    /* Eine PIN, die keine ist. */
    d.getElementById('standPin').value = '12';
    drueck(d, '#standTafel', 'Code anlegen');
    await atempause();
    p('eine zu kurze PIN wird abgefangen, ohne zu fragen',
      srv.anfragen.length === 0 && /vier Ziffern/.test(meldung(d)),
      meldung(d));

    d.getElementById('standPin').value = '4711';
    drueck(d, '#standTafel', 'Code anlegen');
    await atempause(); await atempause(); await atempause();

    const wege = srv.anfragen.map((a) => a.daten.action);
    p('es wird angelegt und gleich hochgeladen',
      wege.join(',') === 'neu,sichern', wege.join(','));
    code = Object.keys(srv.konten)[0];
    p('der Server hat einen Code vergeben', !!code, String(code));
    p('er hat sechs Zeichen aus dem vereinbarten Alphabet',
      code.length === 6 && [...code].every((z) => ALPHABET.indexOf(z) >= 0),
      code);
    p('der Code steht in der Tafel',
      d.getElementById('standTafel').textContent.indexOf(code) > 0);

    /* Die Seitenkennung kommt ohne den Auslieferungspfad. */
    const sichern = srv.anfragen.filter((a) => a.daten.action === 'sichern')[0];
    p('die Seitenkennung traegt keinen Auslieferungspfad',
      sichern.daten.seite === SEITE, sichern.daten.seite);
    p('und passt in das erlaubte Zeichenvorrat',
      /^[a-z0-9/_.-]{1,160}$/.test(sichern.daten.seite));

    vorrat = vorratVon(w);
    p('der Code wird auf dem Geraet gemerkt',
      vorrat['tbk:stand-code'] === code, vorrat['tbk:stand-code']);
    const alles = JSON.stringify(vorrat);
    p('die PIN liegt nirgends im Speicher', alles.indexOf('4711') < 0,
      Object.keys(vorrat).join(', '));
    p('und steht auch in keinem Feld',
      ![...d.querySelectorAll('input')].some((e) => e.value === '4711'));
    w.close();
  }

  console.log('\nAnderes Geraet, Code und PIN');
  {
    /* Frisches Geraet: kein localStorage, nur Code und PIN im Kopf. */
    const { w, d } = await geraet(srv, {});
    knoepfe(d, '#standHinweis')
      .filter((b) => /anderem Ger/.test(b.textContent))[0].click();
    drueck(d, '#standTafel', 'Ich habe schon einen Code');
    p('nach dem Code und der PIN wird gefragt',
      !!d.getElementById('standCode') && !!d.getElementById('standPin'));

    /* Erst die falsche PIN - sie muss klingen wie ein falscher Code. */
    d.getElementById('standCode').value = code;
    d.getElementById('standPin').value = '0000';
    drueck(d, '#standTafel', 'Stand holen');
    await atempause(); await atempause(); await atempause();
    const beiFalscherPin = meldung(d);
    p('eine falsche PIN wird zurueckgewiesen', /stimmt nicht/.test(beiFalscherPin),
      beiFalscherPin);

    d.getElementById('standCode').value = 'ZZZZZZ';
    d.getElementById('standPin').value = '4711';
    drueck(d, '#standTafel', 'Stand holen');
    await atempause(); await atempause(); await atempause();
    p('ein unbekannter Code klingt genauso', meldung(d) === beiFalscherPin,
      meldung(d) + ' gegen ' + beiFalscherPin);

    /* Und jetzt richtig. */
    d.getElementById('standCode').value = code;
    d.getElementById('standPin').value = '4711';
    drueck(d, '#standTafel', 'Stand holen');
    await atempause(); await atempause(); await atempause();

    const passungen = w.eval('PASSUNGEN');
    const da = passungen.every((x) =>
      d.getElementById('a_' + x.id + '_es').value === String(x.es)
      && d.getElementById('m_' + x.id + '_z').value === x.mitte.toFixed(4));
    p('der Stand ist da', da, meldung(d));
    p('die Meldung sagt es', /uebernommen|übernommen/.test(meldung(d)),
      meldung(d));

    /* Und er bleibt beim naechsten Neuladen, ohne noch einmal zu fragen. */
    const vorrat2 = vorratVon(w);
    p('er liegt jetzt auch auf diesem Geraet',
      Object.keys(vorrat2).some((k) => k.indexOf('tbk:stand:') === 0));
    p('die PIN auch hier nirgends',
      JSON.stringify(vorrat2).indexOf('4711') < 0);
    w.close();
  }

  console.log('\nEine Seite, zu der noch nichts da ist');
  {
    const { w, d } = await geraet(srv, { 'tbk:stand-code': code });
    knoepfe(d, '#standHinweis')
      .filter((b) => /anderem Ger/.test(b.textContent))[0].click();
    /* Der Server kennt den Code, aber nicht diese Seite - das ist kein
       Fehler, sondern eine leere Antwort. */
    srv.staende[code] = {};
    d.getElementById('standPin').value = '4711';
    drueck(d, '#standTafel', 'Stand holen');
    await atempause(); await atempause(); await atempause();
    p('eine leere Antwort ist kein Fehler',
      /noch nichts/.test(meldung(d)), meldung(d));
    w.close();
  }

  console.log('\nWenn sich die Seite geaendert hat');
  {
    const { w, d } = await geraet(srv, { 'tbk:stand-code': code });
    srv.staende[code] = {};
    srv.staende[code][SEITE] = {
      daten: JSON.stringify({ zeit: Date.now(), abdruck: 'ganz|andere|felder',
        werte: { a_g6_es: '-7' } }),
      geaendert: new Date().toISOString(),
    };
    knoepfe(d, '#standHinweis')
      .filter((b) => /anderem Ger/.test(b.textContent))[0].click();
    d.getElementById('standPin').value = '4711';
    drueck(d, '#standTafel', 'Stand holen');
    await atempause(); await atempause(); await atempause();
    p('ein Stand, der nicht mehr passt, wird nicht eingesetzt',
      d.getElementById('a_g6_es').value === '',
      d.getElementById('a_g6_es').value);
    p('und die Meldung sagt warum', /geändert/.test(meldung(d)), meldung(d));
    w.close();
  }

  console.log('\nZehn Fehlversuche');
  {
    const srv2 = server();
    const { w, d } = await geraet(srv2, {});
    knoepfe(d, '#standHinweis')
      .filter((b) => /anderem Ger/.test(b.textContent))[0].click();
    d.getElementById('standPin').value = '1234';
    drueck(d, '#standTafel', 'Code anlegen');
    await atempause(); await atempause(); await atempause();
    const c2 = Object.keys(srv2.konten)[0];
    w.close();

    const zweites = await geraet(srv2, {});
    knoepfe(zweites.d, '#standHinweis')
      .filter((b) => /anderem Ger/.test(b.textContent))[0].click();
    drueck(zweites.d, '#standTafel', 'Ich habe schon einen Code');
    for (let i = 0; i < 10; i++) {
      zweites.d.getElementById('standCode').value = c2;
      zweites.d.getElementById('standPin').value = '0000';
      drueck(zweites.d, '#standTafel', 'Stand holen');
      await atempause(); await atempause(); await atempause();
    }
    p('nach zehn Fehlversuchen wird gesperrt',
      /Fehlversuche/.test(meldung(zweites.d)), meldung(zweites.d));
    p('und die Meldung sagt, wie lange',
      /Minute/.test(meldung(zweites.d)), meldung(zweites.d));

    /* Auch mit der richtigen PIN bleibt jetzt zu. */
    zweites.d.getElementById('standPin').value = '1234';
    drueck(zweites.d, '#standTafel', 'Stand holen');
    await atempause(); await atempause(); await atempause();
    p('die Sperre gilt auch fuer die richtige PIN',
      /Fehlversuche/.test(meldung(zweites.d)), meldung(zweites.d));
    zweites.w.close();
  }

  console.log('\nWenn der Server schweigt');
  {
    const srv3 = server();
    srv3.konten['ABCDEF'] = { pin: '1111', fehlschlag: 0, gesperrtBis: null };
    srv3.staende['ABCDEF'] = {};
    srv3.stumm();
    const { w, d } = await geraet(srv3, { 'tbk:stand-code': 'ABCDEF' });

    d.getElementById('a_g6_es').value = '-7';
    d.dispatchEvent(new w.Event('input', { bubbles: true }));
    w.tbkStandSichern();

    knoepfe(d, '#standHinweis')
      .filter((b) => /anderem Ger/.test(b.textContent))[0].click();
    d.getElementById('standPin').value = '1111';
    drueck(d, '#standTafel', 'Stand hochladen');
    await atempause(); await atempause(); await atempause();
    p('der Ausfall wird gesagt, nicht verschwiegen',
      /antwortet nicht/.test(meldung(d)), meldung(d));
    p('und der Stand liegt trotzdem auf dem Geraet',
      Object.keys(vorratVon(w)).some((k) => k.indexOf('tbk:stand:') === 0));
    p('die Seite laeuft weiter', d.getElementById('a_g6_es').value === '-7');
    w.close();
  }

  console.log('\nAlles loeschen');
  {
    const srv4 = server();
    const { w, d } = await geraet(srv4, {});
    d.getElementById('a_g6_es').value = '-7';
    d.dispatchEvent(new w.Event('input', { bubbles: true }));
    knoepfe(d, '#standHinweis')
      .filter((b) => /anderem Ger/.test(b.textContent))[0].click();
    d.getElementById('standPin').value = '2468';
    drueck(d, '#standTafel', 'Code anlegen');
    await atempause(); await atempause(); await atempause();
    const c4 = Object.keys(srv4.konten)[0];
    p('ein Konto ist angelegt', !!c4);

    drueck(d, '#standTafel', 'Alles löschen');
    await atempause(); await atempause(); await atempause();
    p('das Konto ist weg', Object.keys(srv4.konten).length === 0,
      Object.keys(srv4.konten).join(', '));
    p('die Staende auch', Object.keys(srv4.staende).length === 0);
    p('der Code ist vom Geraet verschwunden',
      !vorratVon(w)['tbk:stand-code']);
    p('der Stand auf dem Geraet bleibt - er gehoert dem Geraet',
      Object.keys(vorratVon(w)).some((k) => k.indexOf('tbk:stand:') === 0));
    p('und die Meldung sagt genau das',
      /Server ist nichts mehr/.test(meldung(d)), meldung(d));
    w.close();
  }

  console.log('\nDie Seitenkennung haengt nicht am Auslieferungspfad');
  {
    /* Derselbe Inhalt unter zwei Adressen muss dieselbe Kennung ergeben -
       sonst faende ein Code von t-bk.de auf GitHub Pages nichts wieder. */
    const quelle = fs.readFileSync(path.join(BASIS, 'assets/fortschritt.js'), 'utf8');
    const SCHLUSS = '<' + '/script>';
    function kennungUnter(wurzel) {
      const html = '<!doctype html><body><input id="x">'
        + '<script src="' + wurzel + 'assets/fortschritt.js"' + '>' + SCHLUSS
        + '<script>' + quelle.split(SCHLUSS).join('') + SCHLUSS;
      const dom = new JSDOM(html, { runScripts: 'dangerously',
        url: 'https://beispiel.test' + wurzel + 'uebungen/x.html' });
      const w = dom.window;
      w.document.getElementById('x').value = 'etwas';
      w.tbkStandSichern();
      const k = Object.keys(vorratVon(w))
        .filter((s) => s.indexOf('tbk:stand:') === 0)[0] || '';
      w.close();
      return k.replace('tbk:stand:', '');
    }
    const a = kennungUnter('/unterrichtsmaterial/');
    const b = kennungUnter('/tbk-lernsituationen-uebungen/');
    p('zwei Auslieferungspfade, dieselbe Kennung', a === b && a === 'uebungen/x.html',
      a + ' gegen ' + b);
  }
}

alles().then(function () {
  console.log(fehler ? '\n' + fehler + ' Befunde' : '\nalles gruen');
  process.exit(fehler ? 1 : 0);
});
