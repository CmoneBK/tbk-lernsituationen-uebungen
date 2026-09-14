/* Wo liegt was?
 *
 * Die Prüfungen gehören zum Material und finden es über ihren eigenen Ort -
 * sie liegen in pruefungen/, das Material eine Ebene darüber. Damit laufen
 * sie auf jedem Rechner, nicht nur auf dem, auf dem sie entstanden sind.
 *
 * Zwei Nachbarn braucht ein Teil der Prüfungen zusätzlich:
 *   - das Werkzeug-Repo (CmoneBK-Unterrichtsmaterial) mit den Werkzeugen,
 *     auf die das Material verlinkt,
 *   - den Auslieferungsordner der Webseite mit deploy.sh.
 * Beide liegen daneben, sind aber nicht immer ausgecheckt. Eine fehlende
 * Nachbarschaft ist kein Fehler im Material - wer sie braucht, fragt vorher
 * nach und meldet sich ab. Liegen sie woanders, sagen das die
 * Umgebungsvariablen TBK_WERKZEUGE und TBK_WEBSEITE.
 */
const fs = require('fs'), path = require('path');

const MATERIAL = path.resolve(__dirname, '..');
const WERKZEUGE = process.env.TBK_WERKZEUGE
  || path.resolve(MATERIAL, '..', 'CmoneBK-Unterrichtsmaterial');
const TOOLS = path.join(WERKZEUGE, 'tools');
const WEBSEITE = process.env.TBK_WEBSEITE
  || path.resolve(MATERIAL, '..', '..', 'Webseiten', 'TBK');

/* Für Prüfungen, die ganz dem Nachbarn gelten: Fehlt er, ist nichts zu tun.
   Still überspringen wäre schlimmer als gar nicht prüfen - deshalb sagt sie
   es laut und schreibt sich ihre Schlusszeile gleich selbst. */
function dran(ort, wofuer) {
  if (fs.existsSync(ort)) return true;
  console.log('  ohne   ' + wofuer + ': ' + ort + ' ist hier nicht ausgecheckt');
  console.log('\nnichts zu pruefen');
  return false;
}

/* Für Prüfungen, denen nur ein Teil fehlt: Der Rest gilt weiter, also auch
   die eigene Schlusszeile. */
function teilweise(ort, wofuer) {
  if (fs.existsSync(ort)) return true;
  console.log('  ohne   ' + wofuer + ': ' + ort + ' ist hier nicht ausgecheckt');
  return false;
}

module.exports = { MATERIAL, WERKZEUGE, TOOLS, WEBSEITE, dran, teilweise };
