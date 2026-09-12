# 📚 Unterrichtsmaterial – Lernsituationen, Übungen, Trainings

Dieses Repository füllt den Bereich **Unterrichtsmaterial** auf [t-bk.de](https://t-bk.de).
Es funktioniert nach demselben Muster wie [CmoneBK-Unterrichtsmaterial](https://github.com/CmoneBK/CmoneBK-Unterrichtsmaterial)
(dort die Werkzeuge), mit einem bewussten Unterschied: **hier wird kein Jekyll verwendet.**

| | Werkzeuge-Repo | dieses Repo |
| --- | --- | --- |
| Übersicht entsteht durch | Jekyll/Liquid beim GitHub-Pages-Build | `build/build.mjs`, Ergebnis liegt als `index.html` im Repo |
| Rücklink kommt in die Seiten durch | Jekyll-Layout bzw. `deploy.sh` | eine Skript-Zeile in der Seite selbst |
| GitHub Pages | baut mit Jekyll | liefert nur aus (`.nojekyll`) |

Die ausgelieferten Dateien sind damit überall byte-gleich – auf GitHub Pages, auf t-bk.de
und beim lokalen Öffnen per Doppelklick.

## 🌐 Wo es landet

| Umgebung | Adresse |
| --- | --- |
| t-bk.de | `https://t-bk.de/unterrichtsmaterial/` |
| GitHub Pages | `https://cmonebk.github.io/tbk-lernsituationen-uebungen/` |

Der Weg auf den Server: `git push` → GitHub → `deploy.sh` im Repo
[tbk-webseite](https://github.com/CmoneBK/tbk-webseite) holt den neuen Stand und
spiegelt ihn nach `/unterrichtsmaterial/`. Siehe [Deployment](#-deployment).

## 📂 Ordnerstruktur

```
lernsituationen/<name>/index.html   Lernsituation – selbst geschrieben
uebungen/<paket>/                   Übungspaket   – index.html wird ERZEUGT
trainings/<paket>/                  Trainingspaket – index.html wird ERZEUGT
assets/uebung.css        gemeinsames Aussehen aller Übungen und Trainings
assets/back-nav.js       Rücklink „← Übersicht“ – einzige Quelle
assets/werkzeug-link.js  löst Links auf die Werkzeuge je nach Umgebung auf
daten/kategorien.csv     Reihenfolge der Bereiche und Unterkategorien
daten/material.json      erzeugt: Bestand als Liste (für weitere Auswertungen)
build/build.mjs          Generator
build/uebersicht-vorlage.html  Design der Startseite   ┐ hier ändern,
build/paket-vorlage.html       Design der Paketseiten  ┘ dann neu bauen
vorlagen/lernsituation.html    Kopiervorlage für eine Lernsituation
vorlagen/uebung.html           Kopiervorlage für eine Übung im Paket
index.html               erzeugt – nicht von Hand bearbeiten
```

Die Trennung ist bewusst: **Übungen und Trainings sind Sammlungen**, deren
Übersichtsseite der Build schreibt. **Eine Lernsituation ist ein Dokument**,
das man selbst verfasst – ihre `index.html` fasst niemand an.

Einzelne `.html` direkt in `uebungen/` oder `trainings/` sind weiterhin
erlaubt; sie erscheinen dann als eigene Karte statt in einem Paket.

## 📦 Ein Paket anlegen

Ein Paket ist ein Ordner mit `info.json` und den einzelnen Übungen:

```
uebungen/schraubverbindungen/
    info.json
    03-wohin-geht-das-drehmoment.html
    index.html      ← erzeugt
```

```json
{
  "titel": "Maschinenelemente: Schrauben - Schraubverbindungen",
  "lead": "Ein Satz, der auf der Karte und über der Paketseite steht.",
  "werkzeuge": [
    { "datei": "maschinenelemente-schrauben-schraubverbindungen.html",
      "name": "Werkzeug Schraubverbindungen", "fach": "1" }
  ],
  "reihenfolge": ["03-wohin-geht-das-drehmoment.html"]
}
```

| Feld | |
| --- | --- |
| `titel` | folgt der [Titelkonvention](#titelkonvention) – **er** bestimmt Bereich und Unterkategorie |
| `lead` | optional, ein Satz |
| `werkzeuge` | optional, Dateinamen im Werkzeuge-Repo; siehe [Werkzeug-Links](#-werkzeug-links) |
| `reihenfolge` | optional; was fehlt, wird alphabetisch angehängt – deshalb Dateien nummerieren |

Die Übungen im Paket brauchen im `<title>` **nur ihren Namen** – Bereich und
Kategorie stehen schon in `info.json`. Zusätzlich ausgewertet werden
`<meta name="description">` (Zeile unter dem Namen) und `<meta name="dauer">`.

### Das Aussehen einer Übung

Übungen und Trainings binden `assets/uebung.css` ein und sehen dadurch gleich
aus, ohne dass jede Datei ihr eigenes CSS mitschleppt:

```html
<link rel="stylesheet" href="../../assets/uebung.css">
```

Bereit stehen unter anderem `.box` / `.auftrag` (Kästen), `.felder` / `.feld`
(Eingaben), `.ergebnis` / `.ez` (Ergebniszeilen), `.rueckmeldung` mit den
Zuständen `ja` / `fast` / `nein`, `details` für Lösungen, `.merksatz` und
`a.werkzeug`. Was nur **eine** Übung braucht – eine Zeichnung, ein Diagramm –
gehört in ein eigenes `<style>` in der Datei selbst.

Lernsituationen bringen ihr Aussehen dagegen selbst mit; sie sind Dokumente
mit eigenem Aufbau.

## ➕ Neues Material anlegen

1. Vorlage kopieren: `vorlagen/uebung.html` in ein Paket,
   `vorlagen/lernsituation.html` nach `lernsituationen/<name>/index.html`
   (Dateinamen klein, mit Bindestrichen, ohne Umlaute).
2. Titel setzen – bei einer Lernsituation nach der Konvention unten, in einem
   Paket nur den Namen der Übung.
3. Inhalt schreiben.
4. `node build/build.mjs` ausführen.
5. Committen und pushen – fertig.

Eine Lernsituation darf weitere Seiten und Bilder neben ihrer `index.html`
haben; in der Übersicht erscheint sie trotzdem als eine Karte. Optional kann
auch sie eine `info.json` bekommen – genutzt werden dort `titel`, `lead` und
`werkzeuge`, was besonders für Lernsituationen praktisch ist, die **mehrere**
Werkzeuge brauchen.

### Titelkonvention

`Bereich: Unterkategorie - Name`

* `Fertigungstechnik: Messmittel - Messschieber ablesen` → Bereich *Fertigungstechnik*, Kategorie *Messmittel*, Karte *Messschieber ablesen*
* `Fertigungstechnik: ISO-Toleranzen und Passungen` → ohne Unterkategorie, steht direkt unter dem Bereich
* ohne `:` → Bereich *Allgemein*

Zwei Regeln, die man kennen muss – identisch zum Werkzeuge-Repo:

1. Getrennt wird am ` - ` **mit Leerzeichen davor und dahinter**. Bindestriche im
   Text stören deshalb nicht: `Form- und Lagetoleranzen`, `Welle-Nabe-Verbindung`.
2. Ohne ` - ` gibt es keine Unterkategorie. `Messmittel Messschieber`
   (Bindestrich vergessen) landet also **nicht** unter „Messmittel“.
   Mehrfache Leerzeichen werden dagegen automatisch zusammengezogen.

### Reihenfolge der Kategorien

`daten/kategorien.csv` bestimmt, in welcher Reihenfolge Bereiche und
Unterkategorien erscheinen – nützlich überall dort, wo alphabetisch fachlich
falsch wäre (z. B. Instandhaltung nach DIN 31051: Wartung, Inspektion,
Instandsetzung, Verbesserung).

```csv
bereich,unterkategorie
Fertigungstechnik,Messmittel
Instandhaltung,Wartung
```

Was dort **nicht** steht, wird alphabetisch hinten angehängt – neues Material
erscheint also auch ohne Pflege der CSV, nur eben nicht an der gewünschten
Position. Kommata sind in den Werten nicht erlaubt.

## 🔨 Der Build

```bash
node build/build.mjs          # index.html + daten/material.json erzeugen
node build/build.mjs --check  # nur prüfen (Exit 1, wenn nicht aktuell)
```

Kein `npm install` nötig – der Generator kommt ohne Abhängigkeiten aus
(Node 18+). Er tut vier Dinge:

* **Startseite erzeugen.** Gliederung: Typ → Bereich → Unterkategorie. Dazu eine
  Filterleiste (Alle / Lernsituationen / Übungen / Trainings) und eine Suche –
  beides reines clientseitiges JavaScript ohne Abhängigkeiten. Die Suche eines
  Pakets greift auch auf die Titel der enthaltenen Übungen zu.
* **Paketseiten erzeugen.** Je Paket eine nummerierte Liste seiner Übungen samt
  Dauer, Kurzbeschreibung und Link zum passenden Werkzeug.
* **Bausteine nachtragen.** Fehlt `assets/back-nav.js` oder – sobald die Seite
  einen Werkzeug-Link enthält – `assets/werkzeug-link.js`, wird die Zeile vor
  dem schließenden `body`-Tag eingefügt, mit der zur Ablagetiefe passenden
  Anzahl `../`. In einem Paket zusätzlich mit `data-ziel="./"`.
* **Front-Matter entfernen.** Ein `--- … ---`-Block am Dateianfang stammt aus dem
  Jekyll-Workflow des Werkzeuge-Repos. Ohne Jekyll stünde er als Text auf der
  Seite; er wird entfernt, ein dort notierter `title` aber vorher übernommen.

Jede dieser Änderungen wird auf der Konsole gemeldet.

Wird Material **direkt auf GitHub** abgelegt (Web-Oberfläche, API, Make.com),
übernimmt der Workflow [`.github/workflows/uebersicht.yml`](.github/workflows/uebersicht.yml)
denselben Build und committet das Ergebnis zurück.

## ↩️ Rücklink zur Übersicht

Jede Seite bekommt oben links eine schwebende Schaltfläche **„← Übersicht“**
(auf schmalen Displays nur den Pfeil). `assets/back-nav.js` ist die einzige
Quelle für Aussehen und Ziel.

Das Ziel wird aus dem eigenen Skript-Pfad abgeleitet, nicht fest verdrahtet:
`…/assets/back-nav.js` minus `assets/back-nav.js` ist immer die Wurzel des
Materialbereichs – unabhängig von Ablagetiefe und Ausspielpfad.

| Umgebung | Seiten-URL | Ziel |
| --- | --- | --- |
| GitHub Pages | `…/tbk-lernsituationen-uebungen/uebungen/x.html` | `…/tbk-lernsituationen-uebungen/` |
| t-bk.de | `t-bk.de/unterrichtsmaterial/uebungen/x.html` | `t-bk.de/unterrichtsmaterial/` |
| lokal | `…/uebungen/x.html` | Repo-Wurzel |

Innerhalb eines Pakets wäre das aber einen Schritt zu weit: Von einer Übung
will man zurück zum Paket, nicht bis zur Startseite. Dafür trägt der Build am
Skript-Tag `data-ziel="./"` ein.

Aussehen oder Ziel ändert man also ausschließlich in `assets/back-nav.js`.
Der Block verwendet eine eigene ID (`#tbk-back`) und `!important`, damit ihn
die sehr unterschiedlichen Seiten-Designs (helle wie dunkle) nicht überschreiben.

## 🔗 Werkzeug-Links

Die interaktiven Werkzeuge liegen im **anderen** Repo. Wo sie zu finden sind,
hängt davon ab, wo die Seite gerade ausgeliefert wird – ein fester Pfad
funktioniert deshalb nicht. `assets/werkzeug-link.js` nimmt das ab: Im Text
wird nur das Ziel benannt, das `href` entsteht beim Laden.

```html
<a class="werkzeug" data-werkzeug="maschinenelemente-schrauben-schraubverbindungen.html"
   data-fach="1">Werkzeug öffnen</a>
```

| Umgebung | aufgelöst zu |
| --- | --- |
| t-bk.de | `/werkzeuge/tools/<datei>` |
| GitHub Pages | `https://cmonebk.github.io/CmoneBK-Unterrichtsmaterial/tools/<datei>` |
| lokal (`file:`) | Nachbarordner `CmoneBK-Unterrichtsmaterial/tools/` |

Weitere Angaben, alle optional: `data-fach="1"` startet das Werkzeug mit
Fachbegriffen statt Alltagssprache, `data-sym="1"` mit Formelzeichen,
`data-neu="0"` öffnet im selben Tab. `data-reiter="…"` ist vorbereitet – es
wirkt erst, wenn das Werkzeug den Parameter auswertet, und schadet bis dahin nicht.

Ein Paket braucht den Link nicht in jeder Übung zu wiederholen: Was in
`info.json` unter `werkzeuge` steht, erscheint schon oben auf der Paketseite.

## 🚀 Deployment

`deploy.sh` im Repo [tbk-webseite](https://github.com/CmoneBK/tbk-webseite) läuft
auf dem Server, holt bei jedem Lauf die beteiligten Repos ab und spiegelt sie
nur bei Änderungen:

```
tbk-webseite/public          → DocumentRoot
CmoneBK-Unterrichtsmaterial  → /werkzeuge/
dieses Repo                  → /unterrichtsmaterial/
valis, bk-e-plan             → /projekte/…
```

Für diesen Bereich ist das ein reines `rsync` – die fertige `index.html` liegt
ja schon im Repo. Ausgenommen werden nur die Dateien, die im Web nichts zu
suchen haben (`.git/`, `.github/`, `build/`, `vorlagen/`, `README.md`,
`DEPLOYMENT.md`, `package.json`).

**Einmalig auf dem Server einzurichten** (siehe `DEPLOYMENT.md` in diesem Repo):

```bash
git clone https://github.com/CmoneBK/tbk-lernsituationen-uebungen.git \
  /home/users/ctnutzerone/git/tbk-lernsituationen-uebungen
```

Danach genügt `git push` – der nächste Cron-Lauf von `deploy.sh` zieht nach.

## 🔧 Fehlerbehebung

| Symptom | Ursache |
| --- | --- |
| Karte fehlt in der Übersicht | `node build/build.mjs` vergessen, Paket ohne `info.json`, oder Lernsituation ohne `index.html` |
| Karte steht unter „Allgemein“ | `:` im `<title>` fehlt |
| Unterkategorie wird ignoriert | ` - ` ohne Leerzeichen geschrieben |
| `--- title: … ---` steht sichtbar auf der Seite | Front-Matter; einmal `node build/build.mjs` laufen lassen |
| Rücklink fehlt | `assets/back-nav.js` nicht erreichbar – Anzahl der `../` prüfen |
| Rücklink springt zu weit zurück | `data-ziel="./"` am Skript-Tag fehlt (Datei liegt in einem Paket) |
| Werkzeug-Link führt ins Leere | `data-werkzeug` statt `href` verwenden; Dateiname muss dem im Werkzeuge-Repo entsprechen |
| Übung fehlt auf der Paketseite | Datei heißt `index.html` – die wird erzeugt und deshalb übersprungen |
| Reihenfolge stimmt nicht | Bereich/Kategorie in `daten/kategorien.csv` ergänzen, im Paket `reihenfolge` in `info.json` |
