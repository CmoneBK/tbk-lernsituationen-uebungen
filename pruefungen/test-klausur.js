/* Der Klausurbereich: halten die Versprechen?
 *
 * Der Bereich liegt im Webseiten-Repo (public/klausur/) und ist bewusst
 * nicht freigegeben. Geprüft wird hier trotzdem - und zwar vor allem das,
 * was man einem Bildschirmfoto nicht ansieht:
 *
 *   1. Der Server sieht nichts. Keine IP, kein Name, keine Antwort, keine
 *      Punktzahl, kein Lösungsschlüssel. Das sind Zusagen aus
 *      docs/KLAUSUR-API.md, und eine Zusage ohne Prüfung ist ein Wunsch.
 *   2. Auf dem Gerät bleibt nichts liegen. Kein localStorage, kein Cookie -
 *      anders als im übrigen Material, und mit Absicht.
 *   3. Die Rechnung stimmt: Verschlüsseln und Entschlüsseln gehen
 *      zusammen, die Bewertung rechnet wie beschrieben, und die
 *      Arbeitsmappe ist eine, die sich öffnen lässt.
 *
 * Fehlt das Webseiten-Repo, gibt es nichts zu prüfen - das ist kein Fehler
 * im Material.
 */
const fs = require('fs'), path = require('path'), vm = require('vm');
/* Node 18 haelt WebCrypto noch nicht global bereit. */
const webcrypto = require('node:crypto').webcrypto;

const { WEBSEITE, dran } = require('./orte');
if (!dran(WEBSEITE, 'Webseite')) { return; }

const K = path.join(WEBSEITE, 'public', 'klausur');
const D = path.join(WEBSEITE, 'docs');

let fehler = 0;
const p = (was, ok, zusatz) => {
  console.log((ok ? '  ok     ' : '  FEHLER ') + was
    + (ok || !zusatz ? '' : ' – ' + zusatz));
  if (!ok) fehler++;
};

const lies = (...teile) => {
  const voll = path.join(...teile);
  return fs.existsSync(voll) ? fs.readFileSync(voll, 'utf8') : '';
};

/* Die Browser-Bausteine in Node laufen lassen. Sie hängen sich an "window";
   mehr als ein paar Standardbausteine brauchen sie nicht. */
function laden(...dateien) {
  const fenster = {
    crypto: webcrypto,
    TextEncoder, TextDecoder, Blob, URL,
    atob: (s) => Buffer.from(s, 'base64').toString('binary'),
    btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
    console,
  };
  const zusammen = { window: fenster, ...fenster };
  const ctx = vm.createContext(zusammen);
  for (const d of dateien) {
    vm.runInContext(lies(K, 'assets', d), ctx, { filename: d });
  }
  return fenster;
}

async function main() {

/* ================= 1. Der Server sieht nichts ================= */
console.log('\nWas der Server nicht sieht');
{
  const php = lies(K, 'api', 'pruefung.php');
  const sql = lies(D, 'klausur-schema.sql');
  p('der Endpunkt ist da', php.length > 1000);
  p('das Schema ist da', sql.length > 500);

  p('keine IP-Adresse im Endpunkt',
    !/REMOTE_ADDR|X_FORWARDED_FOR|CLIENT_IP/i.test(php));
  p('keine Spalte für Name, Klasse, Schule oder Fach',
    !/\b(name|nachname|vorname|klasse|schule|fach)\s+(VARCHAR|CHAR|TEXT)/i.test(sql),
    (sql.match(/\b(name|klasse|schule|fach)\s+\w+/i) || [''])[0]);
  p('keine IP-Spalte im Schema', !/\bip\w*\s+(VARCHAR|CHAR|VARBINARY)/i.test(sql));

  /* Der Teilnehmer bekommt Fragen und den oeffentlichen Schluessel - und
     sonst nichts. Ein Loesungsschluessel in dieser Antwort waere der
     Totalschaden. */
  const start = php.slice(php.indexOf("action === 'start'"),
    php.indexOf("action === 'abgeben'"));
  p('start liefert keinen Lösungsschlüssel', !/loesung/i.test(start),
    (start.match(/loesung\w*/i) || [''])[0]);
  p('start liefert keinen Titel', !/meta_chiffre/.test(start));
  p('start gibt nur Fragen und den öffentlichen Schlüssel',
    /'fragen'\s*=>/.test(start) && /'oeff'\s*=>/.test(start));

  /* Beim Anlegen darf im Klartextteil nichts stehen, was die Antwort
     verraet - der Endpunkt weist solche Felder ab. */
  p('der Endpunkt weist verräterische Felder ab',
    /'richtig',\s*'loesung',\s*'korrekt'/.test(php));

  p('eine Meldung für falschen Code und falsche Passphrase',
    (php.match(/fail\('unbekannt', 403\)/g) || []).length >= 4);
  p('Sperre nach wenigen Fehlversuchen', /\$f >= 5/.test(php));
  p('der Endpunkt rechnet keine Punkte aus',
    !/punkte|bewert/i.test(php.replace(/\/\/[^\n]*/g, '')));
}

/* ============ 2. Auf dem Gerät bleibt nichts liegen ============ */
console.log('\nWas auf dem Gerät nicht liegen bleibt');
{
  /* Ohne Kommentare pruefen: Beide Dateien schreiben im Kopf ausdruecklich,
     dass sie nichts speichern - das ist die Zusage, nicht ihr Bruch. */
  const ohneKommentar = (t) => t
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n').map((z) => z.replace(/(^|[^:])\/\/.*$/, '$1 ')).join('\n');
  for (const datei of ['teilnahme.js', 'lehrkraft.js']) {
    const js = ohneKommentar(lies(K, 'assets', datei));
    p(datei + ': kein localStorage', !/localStorage/.test(js));
    p(datei + ': kein sessionStorage', !/sessionStorage/.test(js));
    p(datei + ': kein Cookie', !/document\.cookie/.test(js));
  }
  const html = lies(K, 'teilnahme.html') + lies(K, 'index.html');
  p('beide Seiten tragen noindex',
    (html.match(/name="robots"\s+content="noindex/g) || []).length === 2);
  p('kein Feld für einen Namen',
    !/id="(name|nachname|vorname|klasse|schule)"/i.test(html));

  const robots = lies(WEBSEITE, 'public', 'robots.txt');
  p('robots.txt sperrt den Bereich', /Disallow:\s*\/klausur\//.test(robots));

  const cfg = lies(D, 'klausur-config.sample.php');
  p('die Vorlage ist nicht freigegeben', /'freigegeben'\s*=>\s*false/.test(cfg));
  p('der Fragenpool liegt außerhalb von public',
    /'fragenpool'\s*=>\s*'\/home/.test(cfg)
    && !fs.existsSync(path.join(K, 'fragenpool.json')));
}

/* ==================== 3. Die Schlüssel ==================== */
console.log('\nVerschlüsseln und wieder auf');
{
  const w = laden('krypto.js');
  const Krypto = w.Krypto;
  p('Baustein geladen', !!Krypto && Krypto.verfuegbar);

  const salt = Krypto.zufall(32);
  const a1 = await Krypto.ableiten('vier zufaellige woerter hier', salt);
  const a2 = await Krypto.ableiten('vier zufaellige woerter hier', salt);
  const a3 = await Krypto.ableiten('etwas ganz anderes als das', salt);
  p('dieselbe Passphrase ergibt denselben auth-Wert', a1.auth === a2.auth);
  p('eine andere Passphrase einen anderen', a1.auth !== a3.auth);
  p('der auth-Wert ist 32 Byte lang',
    Krypto.ausB64(a1.auth).length === 32, String(Krypto.ausB64(a1.auth).length));

  /* Der Wert, den der Server bekommt, darf den Schluessel nicht enthalten,
     mit dem der private Schluessel ausgepackt wird. */
  const paar = await Krypto.paarErzeugen();
  const verpackt = await Krypto.privVerpacken(paar, a1.wrapKey);
  p('der verpackte Schlüssel enthält den auth-Wert nicht',
    verpackt.indexOf(a1.auth) === -1);

  const wieder = await Krypto.privAuspacken(verpackt, a1.wrapKey);
  p('mit der richtigen Passphrase geht er auf', !!wieder);
  let ging = false;
  try { await Krypto.privAuspacken(verpackt, a3.wrapKey); ging = true; }
  catch (e) { /* so soll es sein */ }
  p('mit der falschen nicht', !ging);

  const oeff = await Krypto.oeffExportieren(paar);
  const umschlag = await Krypto.anOeffentlich(oeff, { antworten: [[0, 2], [1]] });
  const auf = await Krypto.mitPrivat(paar.privateKey, umschlag);
  p('an den öffentlichen Schlüssel und zurück',
    JSON.stringify(auf.antworten) === JSON.stringify([[0, 2], [1]]));
  p('der Umschlag verrät den Inhalt nicht',
    umschlag.indexOf('antworten') === -1);
  p('der Umschlag hat die Felder, die der Server prüft',
    (() => { const u = JSON.parse(umschlag);
      return !!(u.iv && u.daten && u.schluessel); })());

  const s = Krypto.staerke('Sommer1!');
  p('eine kurze Passphrase gilt als zu schwach', s.urteil === 'zu schwach',
    s.urteil + ' / ' + s.bits + ' Bit');
  p('vier Wörter gelten als gut',
    Krypto.staerke('anker wolke tisch regen').urteil === 'gut');
}

/* ==================== 4. Die Bewertung ==================== */
console.log('\nWie aus Kreuzen Punkte werden');
{
  const w = laden('bewertung.js');
  const B = w.Bewertung;
  const frage = { text: 'x', optionen: ['a', 'b', 'c', 'd'], anzahl: 2 };
  const t = B.VERFAHREN.teilpunkte.punkte;

  p('alles richtig gibt volle Punktzahl',
    t(frage, [0, 2], [0, 2]).punkte === 2);
  p('eines richtig gibt einen Teilpunkt',
    t(frage, [0, 2], [0]).punkte === 1);
  p('eines falsch gibt nichts dafür',
    t(frage, [0, 2], [1]).punkte === 0);
  const zuViel = t(frage, [0, 2], [0, 1, 2]);
  p('zu viele Kreuze geben null', zuViel.punkte === 0, String(zuViel.punkte));
  p('und sagen warum', /zu viele/i.test(zuViel.hinweis));
  p('nichts angekreuzt gibt null', t(frage, [0, 2], []).punkte === 0);

  const a = B.VERFAHREN.alles_oder_nichts.punkte;
  p('alles oder nichts: vollständig zählt', a(frage, [0, 2], [2, 0]).punkte === 1);
  p('alles oder nichts: unvollständig zählt nicht',
    a(frage, [0, 2], [0]).punkte === 0);

  const frage1 = { text: 'y', optionen: ['a', 'b', 'c'], anzahl: 1 };
  const ganz = B.abgabe([frage, frage1], [[0, 2], [1]], [[0], [1]], 'teilpunkte');
  p('eine ganze Abgabe zählt zusammen',
    ganz.punkte === 2 && ganz.max === 3, ganz.punkte + '/' + ganz.max);

  /* Der Server kann nicht pruefen, ob Angabe und Loesungsschluessel
     zusammenpassen - er kennt den Schluessel nicht. Wenn sie es nicht tun,
     gilt der Schluessel, und es wird gesagt. */
  const schief = t(frage, [0], [0]);
  p('bei Widerspruch gilt der Lösungsschlüssel',
    schief.max === 1, String(schief.max));
  p('und der Widerspruch wird gemeldet',
    /widersprechen/i.test(schief.hinweis), schief.hinweis);
  p('die Zeilen nennen das Verfahren', /Teilpunkte/.test(ganz.verfahren));
  p('Optionen werden als Buchstaben ausgegeben',
    B.buchstaben([0, 2]) === 'a c', B.buchstaben([0, 2]));
}

/* ==================== 5. Die Arbeitsmappe ==================== */
console.log('\nDie Arbeitsmappe');
{
  const w = laden('xlsx.js');
  const X = w.Xlsx;

  p('CRC-32 stimmt mit dem bekannten Wert überein',
    X.crc32(new TextEncoder().encode('123456789')) === 0xCBF43926,
    '0x' + X.crc32(new TextEncoder().encode('123456789')).toString(16));
  p('Spaltennamen zählen weiter als Z',
    X.spalte(0) === 'A' && X.spalte(25) === 'Z' && X.spalte(26) === 'AA',
    X.spalte(26));
  p('spitze Klammern werden maskiert',
    /&lt;b&gt;/.test(X.blattXml([['<b>']])));
  p('Zahlen stehen als Zahl in der Zelle',
    /<v>42<\/v>/.test(X.blattXml([[42]])));

  const blob = X.erzeugen([
    { name: 'Übersicht', zeilen: [['Code', 'Punkte'], ['AB23CD', 7]] },
    { name: 'Einzeln', zeilen: [['Code', 'Aufgabe'], ['AB23CD', 1]] },
  ]);
  const roh = Buffer.from(await blob.arrayBuffer());
  p('die Datei ist ein ZIP', roh.readUInt32LE(0) === 0x04034b50);
  p('sie hat einen Endblock',
    roh.readUInt32LE(roh.length - 22) === 0x06054b50);
  p('sechs Einträge – vier Gerüst, zwei Blätter',
    roh.readUInt16LE(roh.length - 14) === 6,
    String(roh.readUInt16LE(roh.length - 14)));

  /* Jeden Eintrag durchgehen und die Pruefsumme nachrechnen: Ein ZIP mit
     falscher CRC laesst sich nicht oeffnen, und das merkt man sonst erst
     in Excel. */
  let pos = 0, namen = [], heil = true;
  while (roh.readUInt32LE(pos) === 0x04034b50) {
    const crcSoll = roh.readUInt32LE(pos + 14);
    const laenge = roh.readUInt32LE(pos + 18);
    const nLaenge = roh.readUInt16LE(pos + 26);
    const eLaenge = roh.readUInt16LE(pos + 28);
    const name = roh.slice(pos + 30, pos + 30 + nLaenge).toString('utf8');
    const von = pos + 30 + nLaenge + eLaenge;
    const inhalt = roh.slice(von, von + laenge);
    if (X.crc32(new Uint8Array(inhalt)) !== crcSoll) { heil = false; }
    namen.push(name);
    pos = von + laenge;
  }
  p('alle Prüfsummen stimmen', heil);
  p('das Gerüst ist vollständig',
    ['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml',
      'xl/_rels/workbook.xml.rels', 'xl/worksheets/sheet1.xml',
      'xl/worksheets/sheet2.xml'].every((n) => namen.includes(n)),
    namen.join(' '));
  p('der Blattname mit Umlaut kommt an',
    /name="Übersicht"/.test(roh.toString('utf8')));
}

/* ==================== 6. Der Vertrag ==================== */
console.log('\nDer Vertrag');
{
  const doc = lies(D, 'KLAUSUR-API.md');
  p('das Vertragsdokument ist da', doc.length > 3000);
  p('es nennt die Rollen nach Art. 28', /Auftragsverarbeiter/.test(doc));
  p('es sagt, dass die Technik vor der Rechtslage steht',
    /nicht freigegeben|nicht in Betrieb/.test(doc));
  p('es verlangt Punkte statt Noten', /Punkte, keine Noten/.test(doc));
  p('es verlangt, den Endpunkt aus dem Protokoll zu nehmen',
    /CustomLog|Zugriffsprotokoll/.test(doc));
}

console.log(fehler ? '\n' + fehler + ' Fehler.'
  : '\nDer Klausurbereich hält, was er zusagt.');
process.exitCode = fehler ? 1 : 0;
}

main();
