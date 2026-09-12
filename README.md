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
| GitHub Pages | `https://cmonebk.github.io/tbk-unterrichtsmaterial/` |

Der Weg auf den Server: `git push` → GitHub → `deploy.sh` im Repo
[tbk-webseite](https://github.com/CmoneBK/tbk-webseite) holt den neuen Stand und
spiegelt ihn nach `/unterrichtsmaterial/`. Siehe [Deployment](#-deployment).

## 📂 Ordnerstruktur

```
lernsituationen/   Lernsituationen  ─┐
uebungen/          Übungen           ├─ Inhalt; je Seite eine .html
trainings/         Trainings        ─┘  (oder ein Ordner mit index.html)
assets/back-nav.js Rücklink „← Übersicht“ – einzige Quelle
daten/kategorien.csv  Reihenfolge der Bereiche und Unterkategorien
daten/material.json   erzeugt: Bestand als Liste (für weitere Auswertungen)
build/build.mjs       Generator der Übersicht
build/uebersicht-vorlage.html  Design der Übersicht (hier ändern, dann neu bauen)
vorlagen/seite.html   Kopiervorlage für eine neue Seite
index.html            erzeugt – nicht von Hand bearbeiten
```

## ➕ Neues Material anlegen

1. `vorlagen/seite.html` in den passenden Ordner kopieren und umbenennen
   (Kleinbuchstaben, Bindestriche, keine Umlaute im Dateinamen).
2. `<title>` nach der Konvention **`Bereich: Unterkategorie - Name`** setzen.
3. Inhalt schreiben.
4. `node build/build.mjs` ausführen.
5. Committen und pushen – fertig.

Umfangreiches Material darf auch ein eigener Ordner sein:
`lernsituationen/meine-ls/index.html` plus Bilder daneben. In der Übersicht
erscheint dann nur die `index.html` als eine Karte.

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
(Node 18+). Er tut drei Dinge:

* **Übersicht erzeugen.** Gliederung: Typ → Bereich → Unterkategorie. Dazu eine
  Filterleiste (Alle / Lernsituationen / Übungen / Trainings) und eine Suche –
  beides reines clientseitiges JavaScript ohne Abhängigkeiten.
* **Rücklink nachtragen.** Fehlt in einer Seite die Zeile
  `<script src="../assets/back-nav.js"></script>`, wird sie vor dem
  schließenden `body`-Tag eingefügt – mit der zur Ablagetiefe passenden Anzahl `../`.
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
| GitHub Pages | `…/tbk-unterrichtsmaterial/uebungen/x.html` | `…/tbk-unterrichtsmaterial/` |
| t-bk.de | `t-bk.de/unterrichtsmaterial/uebungen/x.html` | `t-bk.de/unterrichtsmaterial/` |
| lokal | `…/uebungen/x.html` | Repo-Wurzel |

Aussehen oder Ziel ändert man also ausschließlich in `assets/back-nav.js`.
Der Block verwendet eine eigene ID (`#tbk-back`) und `!important`, damit ihn
die sehr unterschiedlichen Seiten-Designs (helle wie dunkle) nicht überschreiben.

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
`package.json`).

**Einmalig auf dem Server einzurichten** (siehe `DEPLOYMENT.md` in diesem Repo):

```bash
git clone https://github.com/CmoneBK/tbk-unterrichtsmaterial.git \
  /home/users/ctnutzerone/git/tbk-unterrichtsmaterial
```

Danach genügt `git push` – der nächste Cron-Lauf von `deploy.sh` zieht nach.

## 🔧 Fehlerbehebung

| Symptom | Ursache |
| --- | --- |
| Karte fehlt in der Übersicht | `node build/build.mjs` vergessen, oder Ordner ohne `index.html` |
| Karte steht unter „Allgemein“ | `:` im `<title>` fehlt |
| Unterkategorie wird ignoriert | ` - ` ohne Leerzeichen geschrieben |
| `--- title: … ---` steht sichtbar auf der Seite | Front-Matter; einmal `node build/build.mjs` laufen lassen |
| Rücklink fehlt | `assets/back-nav.js` nicht erreichbar – Anzahl der `../` prüfen |
| Reihenfolge stimmt nicht | Bereich/Kategorie in `daten/kategorien.csv` ergänzen |
