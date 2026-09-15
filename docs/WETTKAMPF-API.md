# Wettkampf-API für t-bk.de — Anforderung an das Backend

**Stand:** 15.09.2026 · **Absender:** Content-Repo `tbk-lernsituationen-uebungen`
· **Adressat:** Website-/Infra-Chat

Diese Datei beschreibt einen Endpunkt, den es **noch nicht gibt**. Sie ist die
Bestellung, nicht die Dokumentation: Verhalten, Felder, Tabellen und Grenzen
sind so beschrieben, dass sie sich ohne Rückfragen bauen lassen. Wo eine
Entscheidung offen ist, steht sie ausdrücklich als Frage am Ende.

Das Gegenstück im Content-Repo ist `assets/wettkampf.js`. Es läuft heute schon
ohne Server (siehe [Rückfallebene](#rückfallebene-ohne-server)) und schaltet
auf die API um, sobald sie antwortet.

---

## 1. Worum es geht

Ein Training lässt sich gegeneinander spielen. Alle Geräte, die denselben
fünfstelligen **Wettkampfcode** haben, bekommen dieselben Aufgaben in
derselben Reihenfolge — der Code ist der Startwert des Zufallsgenerators, das
passiert vollständig im Browser und geht den Server nichts an.

Was der Server dazutun soll, ist genau eines: **die Mitstreiter sichtbar
machen.** Wer liegt vorn, wer ist bei Runde 7, wer ist fertig. Ohne Konten,
ohne Namen, ohne dass jemand etwas eintippen muss außer dem Code.

### Was ihr baut
`public/api/wettkampf.php` mit drei Aktionen (Runde anlegen, beitreten, Stand
melden) und eine eigene Config für `ctnutzerone_db3`. Die Tabellen und der
Aufräumlauf stehen bereits (§ 7).

### Was ihr nicht baut
Keine Anmeldung, keine Oberfläche, keine Auswertung über Runden hinweg, keine
Klassen- oder Kursverwaltung. Die Anzeige baut das Content-Repo — sie steht
schon und ruft diesen Endpunkt bereits auf (§ 12).

---

## 2. Grundregeln (wie bei der Feedback-API, nicht verhandelbar)

- **Kein Name, keine PII.** Der Server vergibt die Anzeigenamen selbst (§ 5).
  Es gibt **kein Feld**, in das jemand einen Namen schreiben könnte — auch
  kein optionales. Kommt später der Wunsch auf: bitte hier ablehnen, nicht im
  Content-Repo.
- **Trackingfrei.** Keine Cookies, kein localStorage, keine Wiedererkennung
  über Runden hinweg. Ein Gerät ist innerhalb **einer** Runde identifizierbar
  (über ein Geheimnis im Arbeitsspeicher) und danach nicht mehr.
- **Same-Origin.** Alles unter `t-bk.de`, normale `fetch`-Aufrufe.
- **IP nur gehasht**, wie bei `feedback.php`, und nur für das Ratenlimit.
- **24 Stunden Aufbewahrung.** Danach löscht der Server Runde und Ergebnisse
  von selbst (§ 7). Es gibt nichts, was später noch jemandem zuzuordnen wäre.

---

## 3. Der Ablauf

```
Lehrkraft, Gerät am Beamer          Schüler, eigenes Gerät
──────────────────────────          ──────────────────────
POST action=neu
  → code "K7M2Q", geheim, name
                                    (Code ablesen oder QR scannen)
                                    POST action=beitreten code=K7M2Q
                                      → nr 4, name "Falke", geheim
  [Code + QR am Beamer]

  alle 4 s:                         nach jeder Aufgabe, höchstens alle 3 s:
  POST action=stand                 POST action=stand
    → Rangliste                       → Rangliste
                                    (zeigt Platz und Vorsprung)

                                    am Ende: POST action=stand fertig=1
  [Rangliste am Beamer]               → Schlussrangliste
```

Der Wettkampfcode ist zugleich Schlüssel der Runde **und** Startwert der
Aufgabenfolge. Der Server muss über die Aufgaben nichts wissen.

---

## 4. Die Endpunkte

`https://t-bk.de/api/wettkampf.php`, Aktion über `action`. Anfragen als
`application/x-www-form-urlencoded` (POST) bzw. Query (GET), Antworten als
JSON. Fehler immer `{ "ok": false, "error": "…" }` mit passendem HTTP-Status.

**Wo die Datei hingehört** (vom Website-Chat geklärt, hier nur festgehalten,
damit es niemand anders versucht):

- Quelle: `tbk-webseite/public/api/wettkampf.php` — **nur dort**. Der Ordner
  `/api/` wird bei jedem Deploy per `rsync --delete` neu gespiegelt; eine
  Datei, die direkt auf dem Server unter
  `/home/users/ctnutzerone/www/t-bk.de/api/` abgelegt wird, ist beim nächsten
  Deploy verschwunden.
- Zugangsdaten: eine **eigene** Config, z. B.
  `/home/users/ctnutzerone/files/wettkampf-config.php`, nach dem Muster von
  `feedback-config.php` (in `files/`, open_basedir-tauglich, nicht deployt,
  nicht web-erreichbar). Nicht `feedback-config.php` einbinden: Die zeigt auf
  `ctnutzerone_db2`, und deren Benutzer hat auf `db3` keine Rechte.

Im Material steht die Adresse an genau einer Stelle — `var API` in
`assets/wettkampf.js`.

### 4.1 `POST action=neu` — eine Runde aufmachen

| Feld | Pflicht | Wert |
|---|---|---|
| `action` | ja | `neu` |
| `pfad` | ja | `location.pathname` des Trainings, z. B. `/unterrichtsmaterial/trainings/schraubverbindungen/04-reicht-die-laenge.html` |
| `titel` | ja | Anzeigetitel des Trainings, max. 200 Zeichen |
| `runden` | nein | Rundenzahl, falls die Seite eine feste hat (1–99) |

**Der Server vergibt den Code**, nicht der Client — sonst könnten zwei
Lerngruppen gleichzeitig denselben ziehen und säßen in einer Runde.

Zeichenvorrat (unverwechselbar, kein `O`/`0`, kein `I`/`1`):
`23456789ABCDEFGHJKLMNPQRSTUVWXYZ`, fünf Zeichen. Der Code muss unter den
**noch nicht gelöschten** Runden eindeutig sein; bei Kollision neu ziehen.

```json
{ "ok": true, "code": "K7M2Q", "nr": 1, "name": "Adler",
  "geheim": "9f3c…", "teilnehmer": 1 }
```

Wer eine Runde aufmacht, ist damit auch gleich beigetreten (das Gerät am
Beamer spielt in der Regel mit).

### 4.2 `POST action=beitreten` — mitmachen

| Feld | Pflicht | Wert |
|---|---|---|
| `action` | ja | `beitreten` |
| `code` | ja | fünf Zeichen aus dem Vorrat, Groß-/Kleinschreibung egal |
| `pfad` | ja | wie oben — zur Warnung, wenn jemand den Code auf dem falschen Training eingibt |

```json
{ "ok": true, "code": "K7M2Q", "nr": 4, "name": "Falke",
  "geheim": "2b71…", "teilnehmer": 4,
  "pfad": "/unterrichtsmaterial/trainings/…/04-reicht-die-laenge.html",
  "titel": "Reicht die Länge?", "runden": 10 }
```

Weicht `pfad` von dem der Runde ab, ist das **kein Fehler**: Der Server
antwortet normal und gibt den Pfad der Runde zurück; das Content-Repo sagt
dann „Dieser Wettkampf gehört zu einem anderen Training" und bietet den Link
an. Das ist der häufigste Bedienfehler und soll freundlich aufgefangen werden.

### 4.3 `POST action=stand` — melden und in einem Zug die Rangliste holen

Eine Anfrage für beides. Bei 25 Geräten ist das die Hälfte der Last.

Getaktet wird alle 4 Sekunden, solange der eigene Durchgang läuft, und alle
8 Sekunden, wenn er vorbei ist (dann schaut man nur noch zu). Eine
beantwortete Aufgabe meldet sich sofort und setzt den Takt neu — es kommt
also nie eine zweite Anfrage unmittelbar hinterher.

| Feld | Pflicht | Wert |
|---|---|---|
| `action` | ja | `stand` |
| `code` | ja | der Wettkampfcode |
| `geheim` | ja | aus `neu`/`beitreten` |
| `runde` | ja | beantwortete Aufgaben, 0–99 |
| `richtig` | ja | davon richtig, ≤ `runde` |
| `gesamt` | ja | Aufgaben im Durchgang, 0–99 (0 = noch unbekannt) |
| `dauer` | ja | Sekunden seit Beginn, 0–36000 |
| `fertig` | ja | `0` oder `1` |

```json
{ "ok": true, "serverzeit": 1789452359,
  "rang": [
    { "nr": 2, "name": "Luchs", "runde": 10, "richtig": 9, "gesamt": 10,
      "dauer": 168, "fertig": true,  "weg": false },
    { "nr": 4, "name": "Falke", "runde": 7,  "richtig": 6, "gesamt": 10,
      "dauer": 141, "fertig": false, "weg": false }
  ] }
```

**Sortierung macht der Server:** fertige vor laufenden; dann mehr `richtig`
zuerst; bei Gleichstand kleinere `dauer` zuerst; dann kleinere `nr`. So steht
auf allen Geräten dieselbe Reihenfolge.

Ein `fertig=1` darf **nicht** zurückgenommen werden: Ist die Zeile einmal
fertig, ignoriert der Server spätere Meldungen mit kleinerem `runde` (schützt
vor einem nachgereichten Paket aus der Warteschlange). Ein zweites `fertig=1`
mit besseren Zahlen ebenfalls ignorieren — wer noch einmal spielen will,
tritt neu bei.

### 4.4 `GET action=stand&code=K7M2Q` — nur lesen

Für ein Gerät, das nur anzeigt und nicht mitspielt. Gleiche Antwort wie 4.3,
ohne `geheim`, ohne Schreibzugriff.

---

## 5. Die Anzeigenamen

Der Server vergibt sie beim Beitreten aus einer **festen Liste**, in
Beitrittsreihenfolge, **eindeutig innerhalb der Runde**. Ab dem 49. Gerät
hängt eine Zahl an (`Adler 2`, `Bussard 2`, …).

```
Adler    Ameise   Biber    Bussard  Dachs    Delfin   Distel   Eiche
Eisvogel Elch     Falke    Fasan    Fichte   Fuchs    Gemse    Habicht
Hase     Hecht    Igel     Iltis    Kauz     Kiebitz  Kranich  Krebs
Lachs    Luchs    Marder   Mauser   Möwe     Otter    Pirol    Rabe
Reiher   Robbe    Rotkehl  Salamander Schwalbe Seehund Specht  Star
Steinbock Storch  Tanne    Taube    Uhu      Wiesel   Zeisig   Zilpzalp
```

Nichts daran ist wertend, nichts lässt sich einer Person zuordnen, und am
Beamer liest sich „Luchs 9 von 10" ungleich besser als eine Spalte Codes.
Die Liste gehört auf den Server, damit sie sich ohne Deploy des Materials
ändern lässt.

---

## 6. Missbrauch und Grenzen

| Grenze | Vorschlag | Warum |
|---|---|---|
| Runden je IP-Hash | 20 / Stunde | Eine Lehrkraft macht ein paar Runden auf, kein Skript |
| Beitritte je IP-Hash | 60 / Stunde | Eine Klasse hängt oft an einer IP |
| `stand` je IP-Hash | siehe Frage 2 | 25 Geräte × 4 s ≈ 22.500/h — **bitte prüfen** |
| Teilnehmer je Runde | 60 | Darüber `{"ok":false,"error":"voll"}` |
| Runden gleichzeitig offen | 500 | Notbremse |

Kein Honeypot, kein Zeitfenster-Token wie bei der Rückmeldung: Hier wird
nichts eingereicht, was jemand lesen würde. Der Code selbst ist die Hürde —
33 Millionen Möglichkeiten, und geraten wird nichts Interessantes.

Das `geheim` ist ein zufälliger 32-Zeichen-Wert, der **nur im
Arbeitsspeicher** des Browsers lebt. Es schützt eine Zeile davor, von einem
anderen Gerät überschrieben zu werden — mehr nicht.

### Geisterzeilen nach dem Neuladen

Ein Gerät, das die Seite neu lädt, tritt als **neuer** Teilnehmer bei (das
Geheimnis war ja nur im Speicher). Damit die alte Zeile nicht stehen bleibt:

- Der Server führt `zuletzt` je Zeile mit.
- In `rang` bekommt jede Zeile ein `weg: true`, wenn sie **nicht fertig** ist
  und `zuletzt` älter als **90 Sekunden**.
- Das Content-Repo blendet diese Zeilen aus.

So verschwindet eine verlassene Zeile von selbst, und eine fertige bleibt
stehen, auch wenn das Gerät längst zugeklappt ist.

---

## 7. Die Tabellen

**Steht schon — hier ist nichts mehr anzulegen.** Datenbank
`ctnutzerone_db3` (KeyHelp), Benutzer `ctnutzerone_db3`@`localhost` mit
`ALL PRIVILEGES` genau darauf und `USAGE` sonst. Bewusst getrennt von der
Rückmeldungs-Datenbank `db2`: Deren Inhalt ist vertraulich und bleibt, der
hier ist weder das eine noch das andere.

Angelegt ist dies (MariaDB, `utf8mb4`, Collation `utf8mb4_uca1400_ai_ci`):

```sql
CREATE TABLE wk_runde (
  code      CHAR(5)           NOT NULL,
  pfad      VARCHAR(255)      NOT NULL,
  titel     VARCHAR(200)      NOT NULL,
  runden    TINYINT UNSIGNED  NULL,
  erstellt  DATETIME          NOT NULL,
  ip_hash   CHAR(64)          NOT NULL,
  PRIMARY KEY (code),
  KEY idx_erstellt (erstellt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE wk_teil (
  id        INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  code      CHAR(5)           NOT NULL,
  nr        SMALLINT UNSIGNED NOT NULL,   -- Beitrittsreihenfolge, ab 1
  name      VARCHAR(32)       NOT NULL,   -- aus der festen Liste
  geheim    CHAR(32)          NOT NULL,
  runde     SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  richtig   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  gesamt    SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  dauer     INT UNSIGNED      NOT NULL DEFAULT 0,   -- Sekunden
  fertig    TINYINT(1)        NOT NULL DEFAULT 0,
  zuletzt   DATETIME          NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_platz (code, nr),
  KEY idx_runde (code, zuletzt),
  CONSTRAINT fk_wk_runde FOREIGN KEY (code) REFERENCES wk_runde(code)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

Kein Feld für einen Namen, keine IP im Klartext, keine Kennung, die zwei
Runden verbindet. Wer die Tabelle ausliest, sieht Tiernamen und Zahlen.

**Aufräumen** — ebenfalls schon eingerichtet, als Event in der Datenbank:

```sql
CREATE EVENT wk_aufraeumen
  ON SCHEDULE EVERY 1 HOUR
  DO DELETE FROM wk_runde WHERE erstellt < NOW() - INTERVAL 24 HOUR;
```

`ON DELETE CASCADE` nimmt die Teilnehmer mit. Zu prüfen bleibt, ob
`event_scheduler = ON` auch in der `[mysqld]`-Sektion der `my.cnf` steht —
per `SET GLOBAL` gesetzt, überlebt es keinen Neustart, und dann wüchse die
Datenbank still weiter.

---

## 8. Antworten, die das Content-Repo behandelt

| `error` (HTTP) | Bedeutung | Anzeige im Material |
|---|---|---|
| `unbekannt` (404) | Code gibt es nicht (mehr) | „Diesen Wettkampf gibt es nicht mehr. Nach 24 Stunden wird eine Runde gelöscht." |
| `voll` (409) | mehr als 60 Teilnehmer | „Dieser Wettkampf ist voll." |
| `fremd` (403) | `geheim` passt nicht zur Zeile | Neu beitreten |
| `rate limit` (429) | zu viele Anfragen | Takt verdoppeln, weiterlaufen |
| `db error` / `config missing` (500) | serverseitig | Rückfall auf den Ergebniscode (§ 9) |
| Netzfehler / Zeitüberschreitung | kein Server erreichbar | dito, ohne Meldung |

Wichtig: **Ein Fehler darf den Durchgang nie unterbrechen.** Die Aufgaben
laufen im Browser; die Rangliste ist Beiwerk. Fällt sie aus, wird still auf
den Ergebniscode zurückgeschaltet.

---

## 9. Rückfallebene ohne Server

`assets/wettkampf.js` kann den Wettkampf heute schon vollständig ohne Netz:
Jedes Gerät zeigt am Ende einen sechsstelligen **Ergebniscode**, in dem
Treffer, Rundenzahl und Zeit stecken; wer ihn am Anzeigegerät einträgt, steht
in der Liste. Das bleibt erhalten und greift automatisch, wenn die API nicht
antwortet — lokal geöffnet, auf GitHub Pages, oder wenn im Raum das WLAN
streikt. Das Backend muss dafür nichts tun; es ist nur der Grund, warum ein
Ausfall hier kein Drama ist.

---

## 10. Wie wir prüfen, dass es passt

Im Content-Repo liegt `pruefungen/test-wettkampf.js`. Es fährt die API als
Attrappe nach dieser Datei und prüft beide Wege. Wenn der Endpunkt steht,
genügt für die Abnahme:

1. Auf einem Gerät ein Training öffnen, **Wettkampf starten** → Code + QR.
2. Auf zwei weiteren Geräten den QR scannen → beide erscheinen in der Liste,
   mit Tiernamen, innerhalb von ein paar Sekunden.
3. Auf Gerät 2 den Durchgang zu Ende spielen → es steht als *fertig* oben.
4. Gerät 3 die Seite neu laden → nach spätestens 90 Sekunden steht seine alte
   Zeile nicht mehr da, die neue schon.
5. Am nächsten Tag denselben Code eingeben → „Diesen Wettkampf gibt es nicht
   mehr."

---

## 11. Offene Fragen an euch

1. **Taktrate und Ratenlimit.** Vorgesehen ist ein Takt von 4 Sekunden je
   laufendem Gerät. Bei einer Klasse an einer IP sind das rund 22.000
   Anfragen in der Stunde. Sagt uns, was der Server verträgt — wir stellen
   den Takt im Material darauf ein (8 s wäre auch noch gut spielbar). Das ist
   die einzige Zahl hier, die wir von euch brauchen.
2. **Datenschutzerklärung**: Muss dort etwas ergänzt werden, oder ist
   „24 Stunden, keine personenbezogenen Daten" von der bestehenden Formulierung
   gedeckt?
3. **Ausfallverhalten**: Bei `rate limit` drosselt das Material den Takt
   selbst (Verdoppelung bis höchstens 30 s) und läuft weiter. Passt das, oder
   soll es bei zu viel Last hart auf den Ergebniscode zurückfallen?
4. **`GET action=stand`** (§ 4.4) braucht das Material heute nicht — das Gerät
   am Beamer spielt mit und bekommt die Liste über seine eigene Meldung. Baut
   es nur, wenn es euch ohnehin nichts kostet.

Alles Übrige ist entschieden: Der Endpunkt gehört ins `tbk-webseite`-Repo, die
Datenbank steht, die Tabellen stehen, das Aufräum-Event läuft.

---

## 12. Was im Material schon steht

`assets/wettkampf.js` ruft diese API bereits nach dieser Beschreibung auf und
fällt auf den Ergebniscode zurück, solange sie nicht antwortet. Es ist also
nichts nachzuziehen, wenn der Endpunkt steht — er muss nur antworten.

Ändert sich am Entwurf etwas, sind im Material zwei Stellen betroffen:
`var API` und die Funktionen `aufmachen`, `beitreten` und `melden` ganz oben
in der Datei. `pruefungen/test-wettkampf.js` fährt die API als Attrappe nach
**dieser** Datei nach; weicht die gebaute davon ab, sagt uns bitte wie, damit
die Attrappe mitzieht — sonst prüft sie etwas, das es nicht gibt.
