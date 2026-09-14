/* Vergleicht den selbst gebauten QR-Encoder Modul für Modul mit der
   Referenzbibliothek "qrcode". Verglichen wird die fertige Matrix - damit
   sind Codierung, Reed-Solomon, Verschränkung, Musterplatzierung, Maskenwahl
   und Formatinformation auf einmal geprüft. */
const fs = require('fs');
const QR = require('qrcode');
const { BASIS } = require('./harness');

const global_ = {};
new Function(fs.readFileSync(BASIS + '/assets/qr.js', 'utf8'))
  .call(global_);
// qr.js hängt sich an window/this - hier an global_
eval(fs.readFileSync(BASIS + '/assets/qr.js', 'utf8').replace(
  "})(typeof window !== 'undefined' ? window : this);",
  '})(module.exports);'));
const tbkQr = module.exports.tbkQr;

const FAELLE = [
  'https://t-bk.de/unterrichtsmaterial/uebungen/schraubverbindungen/03-wohin-geht-das-drehmoment.html',
  'https://t-bk.de/unterrichtsmaterial/uebungen/schraubverbindungen/05-querkraft-durch-reibung.html?ohne=a1b2.c3d4',
  'https://t-bk.de/u/',
  'ÄÖÜ äöü ß – Umlaute und Gedankenstrich',
  'https://t-bk.de/unterrichtsmaterial/uebungen/schraubverbindungen/04-gleiches-drehmoment-andere-spannkraft.html?ohne=aaaa.bbbb.cccc.dddd.eeee.ffff.gggg',
  'x'.repeat(200),
];

let fehler = 0;

for (const text of FAELLE) {
  const kurz = text.length > 56 ? text.slice(0, 53) + '…' : text;
  let meins;
  try {
    meins = tbkQr(text);
  } catch (e) {
    console.log('FEHLER  ' + kurz + '\n        Ausnahme: ' + e.message);
    fehler++;
    continue;
  }

  const ref = QR.create(text, { errorCorrectionLevel: 'M' });
  const n = ref.modules.size;
  const refBits = ref.modules.data;

  if (meins.length !== n) {
    console.log('FEHLER  ' + kurz + '\n        Größe ' + meins.length + ' statt ' + n +
      ' (Version ' + ref.version + ')');
    fehler++;
    continue;
  }

  let ab = 0;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const a = meins[y][x] ? 1 : 0;
      const b = refBits[y * n + x] ? 1 : 0;
      if (a !== b) ab++;
    }
  }
  if (ab) {
    console.log('FEHLER  ' + kurz + '\n        ' + ab + ' von ' + (n * n) +
      ' Modulen weichen ab (Version ' + ref.version + ', ' + n + '×' + n + ')');
    fehler++;
  } else {
    console.log('ok      ' + kurz + '   (Version ' + ref.version + ', ' + n + '×' + n + ')');
  }
}

console.log(fehler
  ? '\n' + fehler + ' von ' + FAELLE.length + ' Fällen weichen ab.'
  : '\nAlle Matrizen stimmen mit der Referenz überein.');
process.exitCode = fehler ? 1 : 0;
