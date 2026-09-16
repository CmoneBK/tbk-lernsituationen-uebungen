# Fortschritts-API für t-bk.de

**Stand:** 16.09.2026 — **in Betrieb.** Der Endpunkt steht und ist
abgenommen; der Client spricht dagegen. · Content-Repo
`tbk-lernsituationen-uebungen` ↔ Website-Repo `tbk-webseite`

Diese Datei ist der Vertrag zwischen Material und Server: Verhalten, Felder,
Tabellen und Grenzen, so beschrieben, dass beide Seiten sich darauf verlassen
können. Aufgebaut wie `WETTKAMPF-API.md`, weil dieselben Regeln gelten.

Das Gegenstück im Content-Repo ist `assets/fortschritt.js`. Der Baustein
merkt sich den Stand **auf dem Gerät** (`localStorage`) und spricht auf
Knopfdruck mit diesem Endpunkt, damit derselbe Stand auf einem **anderen**
Gerät wieder aufgeht.

---

## 1. Worum es geht

Eine Lernsituation hat über hundert Eingabefelder. Bis vor Kurzem überlebte
kein einziges einen Seitenwechsel; seit `assets/fortschritt.js` überlebt der
Stand alles, was auf **einem** Gerät passiert — Tabwechsel, Neuladen,
Browser-Neustart.

Was er nicht kann: das Gerät wechseln. Wer im Unterricht auf dem Schul-iPad
anfängt und zu Hause weitermachen will, fängt von vorn an. Dasselbe gilt für
geteilte Geräte und für iPads, die beim Abmelden geleert werden.

Dafür soll es einen **Code und eine PIN** geben, wie in VALIS. Mehr nicht:
kein Konto, kein Name, keine Klasse, keine Anmeldung.

### Was ihr baut

* `public/api/fortschritt.php` — vier Aktionen, JSON rein, JSON raus
* zwei Tabellen in einer **eigenen** Datenbank (Begründung in Abschnitt 7)
* ein Aufräum-Event, das nach 60 Tagen ohne Zugriff löscht

### Was ihr nicht baut

* **Keine Lehreransicht.** Nicht als Extra, nicht als Notfallzugang, nicht
  als Datenbankabfrage für den Hausgebrauch. Sobald jemand von außen
  hineinsehen kann, ist aus einer Lernhilfe eine Leistungserhebung geworden —
  mit allem, was schulrechtlich daran hängt. Das ist dieselbe Linie wie beim
  Feedback, wo es auch keine Moderationsansicht gibt.
* Keine Konten, keine E-Mail, keine Passwortwiederherstellung. Ein
  vergessener Code ist verloren, und das ist in Ordnung.
* Keine Auswertung, keine Statistik, kein Zählen, wie viele Codes es gibt.

---

## 2. Grundregeln (wie bei Feedback und Wettkampf, nicht verhandelbar)

* **Keine personenbezogenen Angaben abfragen.** Kein Name, keine Klasse,
  keine Schule. Was der Schüler in die Aufgabenfelder tippt, ist sein Inhalt;
  der Server sieht ihn als undurchsichtigen Text und rührt ihn nicht an.
* **Keine IP-Adresse speichern.** Auch nicht gehasht, auch nicht „kurz". Für
  das Ratenlimit genügt ein Zähler je Code.
* **Kein Cookie, keine Session, kein Bezeichner.** Der Code ist die Adresse,
  die PIN der Schlüssel — beides tippt der Schüler ein oder liest es aus dem
  eigenen Gerät.
* **Same-Origin.** Kein CORS, keine fremde Domain.
* **Die PIN nie im Klartext.** `password_hash()` mit dem Standardalgorithmus,
  Prüfung mit `password_verify()`.
* **Keine Protokollzeile mit Inhalt.** Fehler dürfen protokolliert werden,
  aber ohne Code, ohne PIN und ohne Daten.

---

## 3. Der Ablauf

```
Schüler füllt aus          → Stand liegt im localStorage (Stufe 1, schon da)
klickt „Auf anderem Gerät weiterarbeiten"
  → PIN eingeben (vierstellig, selbst gewählt)
  → action=neu                    → Server gibt einen Code zurück
  → action=sichern                → Stand liegt auf dem Server

anderes Gerät, dieselbe Seite
  → Code und PIN eingeben
  → action=holen                  → Stand kommt zurück, Felder füllen sich

irgendwann
  → action=loeschen               → alles zu diesem Code ist weg
```

Der Code wird **einmal** angelegt und gilt für **alle** Seiten. Ein Code je
Übung wäre unbrauchbar — niemand merkt sich siebzehn Codes.

Nach dem ersten Anlegen merkt sich das Gerät den Code (nicht die PIN) im
`localStorage`, damit man ihn nicht bei jedem Sichern eintippt. Die PIN wird
**nie** gespeichert, auch nicht auf dem Gerät.

---

## 4. Die Endpunkte

Alles über `POST` an `/api/fortschritt.php`, `Content-Type:
application/x-www-form-urlencoded`. Antwort immer JSON mit
`Content-Type: application/json; charset=utf-8`.

Gemeinsame Felder der Antwort:

| Feld | Bedeutung |
| --- | --- |
| `ok` | `true` oder `false` |
| `fehler` | nur bei `ok:false` — einer der Werte aus Abschnitt 6 |

### 4.1 `POST action=neu` — einen Code anlegen

**Rein:** `pin` (genau vier Ziffern)

**Raus:**
```json
{ "ok": true, "code": "K7M2QX" }
```

Der Server erzeugt den Code, nicht der Client: **sechs Zeichen** aus dem
Alphabet `23456789ABCDEFGHJKLMNPQRSTUVWXYZ` (32 Zeichen, ohne 0/O und 1/I/l
— dasselbe wie beim Wettkampf, aus demselben Grund: er wird abgeschrieben
und vorgelesen). Das sind 32⁶ ≈ 1,07 Milliarden Möglichkeiten.

Bei Kollision neu würfeln, höchstens zehnmal, dann `fehler: "voll"`.

Die PIN muss genau vier Ziffern haben. Trivialfolgen (`0000`, `1234`,
`1111`…) werden **nicht** abgelehnt — die PIN schützt nichts, was einen
Angriff lohnt, und eine abgelehnte PIN kostet mehr Verständnis, als sie
bringt. Der Code ist der eigentliche Schutz.

### 4.2 `POST action=sichern` — einen Stand ablegen

**Rein:** `code`, `pin`, `seite`, `daten`

* `seite` — der Pfad der Seite, höchstens 160 Zeichen, nur
  `[a-z0-9/_.-]`. Beispiel: `uebungen/drehprozess/06-auf-welches-mass-wird-geschlichtet.html`
* `daten` — JSON als Text, höchstens **64 KB**. Der Server prüft nur die
  Länge und dass es gültiges JSON ist; was drinsteht, geht ihn nichts an.

**Raus:** `{ "ok": true }`

Vorhandener Stand derselben Seite wird ersetzt. Höchstens **60 Seiten** je
Code; ist das voll, wird die älteste verdrängt.

### 4.3 `POST action=holen` — einen Stand abrufen

**Rein:** `code`, `pin`, dazu wahlweise `seite`

Ohne `seite` kommt eine Liste aller vorhandenen Seiten (ohne Inhalt), mit
`seite` der Inhalt dieser einen.

**Raus (mit `seite`):**
```json
{ "ok": true, "daten": "{…}", "geaendert": "2026-09-16T14:22:10+02:00" }
```

**Raus (ohne `seite`):**
```json
{ "ok": true, "seiten": [
  { "seite": "uebungen/…/06-…html", "geaendert": "2026-09-16T14:22:10+02:00" }
] }
```

Jeder erfolgreiche Zugriff setzt `fs_konto.zuletzt` auf jetzt — das ist die
Uhr für die 60 Tage.

### 4.4 `POST action=loeschen` — alles weg

**Rein:** `code`, `pin`

**Raus:** `{ "ok": true }`

Löscht das Konto und alle Stände dazu, sofort und endgültig. Kein
Papierkorb, keine Bestätigungsmail, kein Wiederherstellen. Der Schüler muss
das selbst können — ohne das wäre die Löschpflicht nicht erfüllbar.

---

## 5. Missbrauch und Grenzen

**Durchprobieren.** Der Code hat 32⁶ Möglichkeiten, die PIN 10⁴. Wer raten
will, muss beides treffen. Trotzdem:

* Je Code höchstens **zehn** Fehlversuche; danach eine Minute gesperrt, bei
  weiteren Fehlversuchen fünf Minuten. Zähler in `fs_konto`, kein Bedarf für
  IP-Speicherung.
* Antwortzeit bei falscher PIN künstlich gleich halten wie bei richtiger
  (`password_verify` auf einen Dummy-Hash, wenn der Code nicht existiert) —
  sonst verrät die Dauer, ob es den Code gibt.
* **Dieselbe Fehlermeldung** für „Code gibt es nicht" und „PIN falsch":
  `fehler: "unbekannt"`. Wer einen gültigen Code erraten hat, soll das nicht
  erfahren.

**Größe.** 64 KB je Seite, 60 Seiten je Code — das sind höchstens 3,8 MB je
Code, und realistisch sind es zwei bis fünf Kilobyte je Seite. Beim
Überschreiten `fehler: "zugross"`.

**Ratenlimit** auf `sichern`: höchstens ein Schreibvorgang je Seite und
**zehn Sekunden**. Der Client sichert ohnehin nur auf Knopfdruck, nicht
laufend — das Laufende macht `localStorage`.

**Fehlerwerte:** `unbekannt` · `gesperrt` · `zugross` · `ungueltig` ·
`voll` · `zuviel`

---

## 6. Die Aufbewahrung

**60 Tage ohne Zugriff, dann gelöscht.** Die Frist läuft ab dem letzten
erfolgreichen `holen` oder `sichern`, nicht ab dem Anlegen — wer weiterhin
damit arbeitet, behält seinen Stand.

Ein Event räumt auf, wie beim Wettkampf:

```sql
CREATE EVENT fs_aufraeumen
  ON SCHEDULE EVERY 1 DAY
  DO DELETE FROM fs_konto WHERE zuletzt < NOW() - INTERVAL 60 DAY;
```

`fs_stand` hängt per `ON DELETE CASCADE` daran und geht mit. Dass die Kaskade
wirklich greift, bitte einmal nachmessen — beim Wettkampf war der
`event_scheduler` anfangs aus.

Sechzig Tage sind knapp zwei Monate: lang genug für eine Lernsituation über
mehrere Wochen, kurz genug, dass nichts über ein Schuljahr hinaus liegen
bleibt.

---

## 7. Die Tabellen

**Eigene Datenbank:** `ctnutzerone_db4`, Benutzer gleichen Namens. Nicht
`ctnutzerone_db3` mitbenutzen — zwei Gründe: Die
Aufbewahrungsfristen sind verschieden (Wettkampf 24 Stunden, Fortschritt 60
Tage), und hier liegen erstmals Inhalte, die jemand selbst geschrieben hat —
eine eigene Datenbank macht die Trennung auch im Betrieb sichtbar. Das
Anlegen lief wie bei db3 über KeyHelp.

```sql
CREATE TABLE fs_konto (
  code        CHAR(6)      NOT NULL PRIMARY KEY,
  pin_hash    VARBINARY(255) NOT NULL,
  angelegt    DATETIME     NOT NULL,
  zuletzt     DATETIME     NOT NULL,
  fehlschlag  TINYINT UNSIGNED NOT NULL DEFAULT 0,
  gesperrt_bis DATETIME    NULL,
  INDEX (zuletzt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE fs_stand (
  code      CHAR(6)      NOT NULL,
  seite     VARCHAR(160) NOT NULL,
  daten     MEDIUMTEXT   NOT NULL,
  geaendert DATETIME     NOT NULL,
  PRIMARY KEY (code, seite),
  INDEX (code, geaendert),
  CONSTRAINT fs_stand_konto FOREIGN KEY (code)
    REFERENCES fs_konto (code) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

Kein Feld für Name, Klasse, Gerät, IP oder Browser. Wenn später jemand eines
vermisst, ist das ein Grund nachzufragen, kein Grund es hinzuzufügen.

---

## 8. Datenschutz

Das ist der Unterschied zu Feedback und Wettkampf, und er sollte benannt
sein: **Hier werden erstmals Daten gespeichert, die einer Person zugeordnet
werden können** — nämlich derjenigen, die Code und PIN hat. Pseudonym, aber
personenbezogen im Sinne der DSGVO.

Was daraus folgt:

* **Die Datenschutzerklärung braucht einen Abschnitt.** Vorschlag:

  > **Lernstand speichern (freiwillig).** Wer eine Aufgabe auf einem anderen
  > Gerät fortsetzen möchte, kann sich dafür einen Code anlegen und eine
  > selbst gewählte vierstellige PIN vergeben. Gespeichert werden dann
  > ausschließlich die eigenen Eingaben zu den Aufgaben, der Code und die PIN
  > in verschlüsselter Form. Name, Klasse, E-Mail-Adresse, IP-Adresse oder
  > Angaben zum Gerät werden nicht erhoben. Die Daten werden **60 Tage** nach
  > dem letzten Zugriff automatisch gelöscht; wer sie früher löschen möchte,
  > kann das jederzeit selbst tun — Code und PIN eingeben und „Alles löschen"
  > wählen. Ein Zugriff durch Lehrkräfte oder Dritte ist nicht vorgesehen und
  > technisch nicht eingerichtet. Ohne Code funktioniert das Material
  > vollständig; der Lernstand wird dann nur auf dem eigenen Gerät gemerkt
  > und verlässt es nicht.

* **Rechtsgrundlage:** Der Schüler legt den Code bewusst an — das ist die
  Einwilligung. Deshalb muss beim Anlegen ein kurzer Text stehen, nicht erst
  in der Datenschutzerklärung. Den schreibt das Content-Repo.
* **Auf dem Endgerät** wird durch die Server-Variante nichts gespeichert
  außer dem Code selbst — für den gilt dieselbe Begründung wie für Stufe 1
  (§ 25 TDDDG, erforderlich für den gewünschten Dienst).
* **Minderjährige:** Weil weder Name noch Kontaktdaten erhoben werden und die
  Nutzung freiwillig ist, sehe ich hier keine zusätzliche Hürde. Das ist
  keine Rechtsberatung — wenn die Schule eine Einschätzung hat, sticht sie.

---

## 9. Rückfallebene ohne Server

Wie beim Wettkampf: Antwortet die API nicht, sagt der Baustein es und
arbeitet weiter. Der Stand liegt dann eben nur auf dem Gerät — also genau
Stufe 1, die ohnehin immer läuft. Kein Fehlerdialog, keine
Wiederholungsschleife, keine kaputte Seite.

Ein `file:`-Aufruf (lokal geöffnete Datei) versucht gar nicht erst zu
sprechen.

---

## 10. Wie wir prüfen, dass es passt

Im Content-Repo entsteht `pruefungen/test-fortschritt-api.js` nach dem
Muster von `test-wettkampf.js`: ein nachgebauter Endpunkt in jsdom, gegen den
der Baustein spricht. Geprüft wird

* dass ohne Code nichts gesendet wird,
* dass die PIN nie im `localStorage` landet,
* dass eine falsche PIN dieselbe Meldung ergibt wie ein falscher Code,
* dass bei Serverausfall der lokale Stand weiter funktioniert,
* dass „Alles löschen" wirklich alles löscht.

Dazu eine Abnahme gegen den laufenden Endpunkt, wie beim Wettkampf am
15.09. — mit einem Wegwerf-Code, der danach gelöscht wird.

---

## 11. Entschieden

| Frage | Entscheidung |
| --- | --- |
| PIN vom Schüler oder vom Server? | **vom Schüler**, vier Ziffern |
| Aufbewahrung | **60 Tage** ohne Zugriff |
| Lehreransicht | **nein**, auch nicht als Notfallzugang |
| Ein Code für alles oder je Aufgabe? | **einer für alles** |
| Eigene Datenbank? | **ja** — andere Frist, erstmals eigene Inhalte |
| Codelänge | sechs Zeichen, Alphabet wie beim Wettkampf |
| Was wird gespeichert? | nur die Eingaben, kein Ergebnis, keine Bewertung |

---

## 12. Beantwortet

1. **Datenbank und Benutzer:** `ctnutzerone_db4`. Steht in Abschnitt 7.
2. **Ratenlimit:** passt so — ein Schreibvorgang je Seite und zehn
   Sekunden, kein IP-Zähler, weil keine IP gespeichert wird.
3. **64 KB:** unkritisch. `max_allowed_packet` = 16 MB, `MEDIUMTEXT` = 16 MB.

---

## 13. Abnahme

**Endpunkt:** abgenommen, in Betrieb. Das Aufräum-Event läuft, die Kaskade
greift — nachgemessen, `reste = 0`. Das war beim Wettkampf die Stelle, an
der es anfangs klemmte (der `event_scheduler` stand auf `OFF`), deshalb ist
es hier gleich mitgeprüft worden.

**Client:** `assets/fortschritt.js` spricht dagegen.
`pruefungen/test-fortschritt-api.js` fährt den ganzen Weg gegen eine
Attrappe, die sich an diesen Vertrag hält:

* Ohne Code geht nichts an den Server — auch das Aufmachen der Tafel nicht.
* Die PIN liegt nach dem Anlegen in keinem Speicher und in keinem Feld.
* Falscher Code und falsche PIN ergeben denselben Satz.
* Ab dem zehnten Fehlversuch wird gesperrt, auch für die richtige PIN.
* `holen` auf eine unbekannte Seite ist kein Fehler, sondern eine leere
  Antwort.
* Ein Stand, dessen Fingerabdruck nicht mehr passt, wird nicht eingesetzt.
* Schweigt der Server, läuft die Seite weiter und sagt es.
* `loeschen` räumt Konto und Stände weg; der Stand auf dem Gerät bleibt —
  er gehört dem Gerät.
* Die Seitenkennung hängt nicht am Auslieferungspfad: `/unterrichtsmaterial/`
  und `/tbk-lernsituationen-uebungen/` ergeben dieselbe.

**Live-Durchlauf gegen den echten Endpunkt**, 16.09.2026, mit einem
Wegwerf-Code, der danach über `action=loeschen` wieder verschwunden ist —
alles grün:

| Geprüft | Ergebnis |
| --- | --- |
| `neu` antwortet als `application/json` | ja |
| der Code hat sechs Zeichen aus dem vereinbarten Alphabet | ja |
| `sichern` → `holen` bringt Zeichen für Zeichen dasselbe zurück | ja |
| `geaendert` kommt mit | ja |
| `holen` auf eine unbekannte Seite | `ok:true`, `daten:null` — kein Fehler |
| `holen` ohne `seite` listet die vorhandenen | ja |
| falsche PIN | `ok:false`, `fehler:"unbekannt"` |
| unbekannter Code | derselbe Fehlerwert — nicht unterscheidbar |
| 70 KB Nutzlast | `fehler:"zugross"` |
| `loeschen`, danach `holen` mit demselben Code | `unbekannt` — wirklich weg |

Das Skript dazu liegt nicht im Repo: Es spricht mit dem laufenden Server
und legt dabei Daten an. Wer es wiederholen will, findet den Ablauf oben
in dieser Tabelle; die Attrappe in `test-fortschritt-api.js` fährt
dieselbe Reihenfolge und gehört in jeden Prüflauf.
