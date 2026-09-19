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

  /* Seit dem Mischen gibt es zwei erlaubte Formen des Feldes "fragen": die
     blanke Liste und {v, mischen, aufgaben}. Beide muessen durch denselben
     Filter - sonst waere die neue Form der Weg, einen Loesungshinweis
     daneben zu schmuggeln. */
  p('der Endpunkt kennt beide Formen von "fragen"',
    /array_is_list\(\$fdec\)/.test(php) && /'aufgaben'/.test(php));
  p('die Objektform laesst nur v, mischen und aufgaben zu',
    /\['v',\s*'mischen',\s*'aufgaben'\]/.test(php));
  p('mischen laesst nur fragen, optionen und teilmenge zu',
    /\['fragen',\s*'optionen',\s*'teilmenge'\]/.test(php));
  p('die Teilmenge muss in die Aufgabenzahl passen',
    /\$tm\s*<\s*1\s*\|\|\s*\$tm\s*>\s*count\(\$aufgaben\)/.test(php));
  p('der Aufgabenfilter greift bei beiden Formen',
    php.indexOf('foreach ($aufgaben as $frage)')
      > php.indexOf('array_is_list($fdec)'));

  /* Die Lehrkraft schickt je Aufgabe genau drei Schluessel. Ein aus dem Pool
     durchgereichtes "standard" oder "thema" stuende sonst im Klartext auf
     dem Server - kein Leck, aber auch kein Grund. */
  const lk = lies(K, 'assets', 'lehrkraft.js');
  p('die Aufgabe geht mit genau drei Feldern zum Server',
    /aufgaben\.push\(\{\s*text:[^}]*optionen:[^}]*anzahl:[^}]*\}\)/.test(lk)
      && !/standard:/.test(lk.split('aufgaben.push')[1] || ''));
  p('anzahl wird aus der tatsächlichen Auswahl berechnet',
    /anzahl:\s*richtigNeu\.length/.test(lk));

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
  /* ALLE Seiten des Bereichs, nicht nur die beiden urspruenglichen. Es sind
     inzwischen mehr geworden - Nutzungshinweise und ein AV-Vertrag zum
     Ausdrucken -, und gerade die rechtlichen Seiten sind der Ort, an dem
     spaeter jemand "ein Formular waere bequemer" denkt. */
  const seiten = fs.readdirSync(K).filter((d) => d.endsWith('.html'));
  p('mindestens vier Seiten im Bereich', seiten.length >= 4, seiten.join(' '));

  seiten.forEach((datei) => {
    const h = lies(K, datei);
    p(datei + ': noindex', /name="robots"\s+content="noindex/.test(h));
    p(datei + ': kein Feld für einen Namen',
      !/id="(name|nachname|vorname|klasse|schule)"/i.test(h));
  });

  /* Der AV-Vertrag nennt Schule, Name und Anschrift - er wird ausgedruckt,
     unterschrieben und per Post oder Mail geschickt. Auf der SEITE darf
     davon nichts getippt und schon gar nichts gesendet werden. Dasselbe
     gilt fuer die Hinweise. */
  ['av-vertrag.html', 'hinweise.html'].forEach((datei) => {
    const h = lies(K, datei);
    if (!h) { return; }
    p(datei + ': kein Eingabefeld', !/<input|<textarea|<select/i.test(h));
    p(datei + ': kein Formular', !/<form/i.test(h));
    p(datei + ': sendet nichts', !/fetch\(|XMLHttpRequest|navigator\.send/i.test(h));
  });

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

  /* Seit dem Mischen reist die Zuordnung im Umschlag mit. Auch sie darf
     nicht im Klartext dastehen - sonst liesse sich aus der Reihenfolge
     zurueckschliessen, welche Aufgaben jemand gezogen hat. */
  const mitAuswahl = await Krypto.anOeffentlich(oeff, {
    antworten: [[1], [0, 2]],
    auswahl: { fragen: [2, 0], optionen: [[3, 1, 0, 2], [1, 0]] }
  });
  const zurueck = await Krypto.mitPrivat(paar.privateKey, mitAuswahl);
  p('die Zuordnung reist im Umschlag mit',
    JSON.stringify(zurueck.auswahl.fragen) === '[2,0]');
  p('und steht nicht im Klartext darin',
    mitAuswahl.indexOf('auswahl') === -1 && mitAuswahl.indexOf('fragen') === -1);

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

/* ============ 4b. Mischen: kommt die Zuordnung zurueck? ============
   Seit die Klausur Aufgaben und Antworten je Teilnehmer mischen kann, sieht
   jeder eine andere Reihenfolge. Was er ankreuzt, sind Positionen in SEINER
   Ansicht; bewertet wird gegen die feste Reihenfolge des
   Loesungsschluessels. Dazwischen liegt eine Abbildung, und ein
   Vorzeichenfehler darin faellt niemandem auf: Die Punktzahl sieht
   plausibel aus, sie ist nur falsch.

   Der Vertrag (KLAUSUR-API.md, Abschnitt 5):
     auswahl.fragen[p]        = welche feste Aufgabe an Anzeigeposition p steht
     auswahl.optionen[p][pos] = welche feste Option an Anzeigeposition pos steht
     antworten[p]             = angekreuzte Anzeigepositionen              */
console.log('\nGemischt und zurückgerechnet');
{
  const w = laden('bewertung.js');
  const B = w.Bewertung;

  /* Drei Aufgaben in fester Reihenfolge. */
  const aufgaben = [
    { text: 'A', optionen: ['a0', 'a1', 'a2', 'a3'], anzahl: 2 },
    { text: 'B', optionen: ['b0', 'b1', 'b2'], anzahl: 1 },
    { text: 'C', optionen: ['c0', 'c1', 'c2', 'c3'], anzahl: 2 },
  ];
  const richtig = [[0, 3], [2], [1, 2]];

  /* Ein Teilnehmer sieht sie in der Reihenfolge C, A, B, und in jeder
     Aufgabe eine andere Antwortreihenfolge. */
  const auswahl = {
    fragen: [2, 0, 1],
    optionen: [[3, 1, 0, 2], [2, 0, 3, 1], [1, 2, 0]],
  };

  /* Er kreuzt genau das Richtige an - ausgedrueckt in SEINEN Positionen.
     Aufgabe C (richtig 1 und 2): in seiner Karte [3,1,0,2] steht die 1 an
     Position 1 und die 2 an Position 3.
     Aufgabe A (richtig 0 und 3): Karte [2,0,3,1] -> Positionen 1 und 2.
     Aufgabe B (richtig 2):       Karte [1,2,0]   -> Position 1.            */
  const perfekt = [[1, 3], [1, 2], [1]];

  const e = B.abgabe(aufgaben, richtig, perfekt, 'teilpunkte', auswahl);
  p('gemischt und alles richtig gibt die volle Punktzahl',
    e.punkte === 5 && e.max === 5, e.punkte + '/' + e.max);
  p('die Zeilen stehen in der Reihenfolge des Teilnehmers',
    e.zeilen.map((z) => z.text).join('') === 'CAB',
    e.zeilen.map((z) => z.text).join(''));
  p('die Nummern zaehlen von eins',
    e.zeilen.map((z) => z.nr).join('') === '123');

  /* Der Gegenbeweis: Ohne die Zuordnung MUSS es schiefgehen. Ginge es auch
     so durch, pruefte der Test oben gar nichts. */
  const ohne = B.abgabe(aufgaben, richtig, perfekt, 'teilpunkte', null);
  p('ohne die Zuordnung faellt dieselbe Abgabe durch',
    ohne.punkte < e.punkte, ohne.punkte + '/' + ohne.max);

  /* Und eine falsche Antwort bleibt falsch. */
  const daneben = B.abgabe(aufgaben, richtig, [[0, 2], [0], [0]],
    'teilpunkte', auswahl);
  p('falsch bleibt falsch', daneben.punkte < 5, String(daneben.punkte));

  /* Teilmenge: Wer nur zwei der drei Aufgaben gezogen hat, wird auch nur
     ueber zwei bewertet. */
  const teil = B.abgabe(aufgaben, richtig,
    [[1, 3], [1]], 'teilpunkte',
    { fragen: [2, 1], optionen: [[3, 1, 0, 2], [1, 2, 0]] });
  p('bei einer Teilmenge zaehlt nur das Gezogene',
    teil.max === 3 && teil.zeilen.length === 2,
    teil.punkte + '/' + teil.max + ' aus ' + teil.zeilen.length);

  /* Die Buchstaben in der Tabelle beziehen sich auf die FESTE Reihenfolge -
     sonst stuenden in zwei Zeilen dieselben Buchstaben fuer Verschiedenes. */
  p('die Buchstaben meinen die feste Reihenfolge',
    e.zeilen[0].richtig.join(',') === '1,2', e.zeilen[0].richtig.join(','));
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

  /* Das Beispiel ist die Vorlage fuer alle Poolbeitraege - es muss die neue
     Form zeigen, sonst schreibt der Naechste wieder fuenf Optionen. */
  let pool = [];
  try { pool = JSON.parse(lies(D, 'klausur-fragenpool.beispiel.json')); }
  catch (x) { /* faellt unten auf */ }
  p('das Pool-Beispiel ist lesbares JSON', Array.isArray(pool) && pool.length > 0);
  p('jede Beispielfrage hat Thema, Text, Optionen und Loesung',
    pool.every((f2) => f2.thema && f2.text && Array.isArray(f2.optionen)
      && Array.isArray(f2.richtig)));
  p('die Loesungsindizes liegen im Bereich der Optionen',
    pool.every((f2) => f2.richtig.every((i) => i >= 0 && i < f2.optionen.length)));
  p('wo "standard" steht, liegt es ebenfalls im Bereich',
    pool.every((f2) => !f2.standard
      || f2.standard.every((i) => i >= 0 && i < f2.optionen.length)));
  p('mindestens eine Frage zeigt den groesseren Antwortpool',
    pool.some((f2) => f2.optionen.length > 5),
    pool.map((f2) => f2.optionen.length).join(','));
  p('wo "anzahl" steht, passt es zur Loesung',
    pool.every((f2) => f2.anzahl === undefined
      || f2.anzahl === f2.richtig.length));
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
