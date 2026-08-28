# Elisa & Alberto — 19.09.2026 💙

Sito statico dove gli invitati possono caricare foto, video e messaggi vocali
per gli sposi. Costo: **zero**. Stack: HTML/CSS/JS puro + Supabase (piano
gratuito) + GitHub Pages (hosting gratuito).

---

## 1. Crea il progetto Supabase (5 minuti)

1. Vai su [supabase.com](https://supabase.com) → crea un account gratuito → **New project**.
2. Scegli un nome (es. `elisa-alberto-matrimonio`) e una password per il database (salvala da parte, non serve per il sito ma è utile tenerla).
3. Aspetta che il progetto finisca di essere creato (circa 1-2 minuti).

### 1a. Crea la tabella e i permessi

1. Nel menu a sinistra vai su **SQL Editor** → **New query**.
2. Apri il file [`sql/schema.sql`](sql/schema.sql) di questo progetto, copia tutto il contenuto e incollalo nell'editor.
3. Premi **Run**. Questo crea la tabella `memories` e i permessi di sicurezza (chiunque può caricare, ma nessuno può cancellare o modificare i ricordi altrui).

### 1b. Crea il bucket per i file

1. Nel menu a sinistra vai su **Storage** → **New bucket**.
2. Nome: `wedding-memories` (esattamente così, minuscolo).
3. Attiva **Public bucket** → **Create bucket**.
4. Le policy di upload/lettura per questo bucket sono già state create dallo script SQL al punto 1a.

### 1c. Recupera le chiavi

1. Vai su **Project Settings** (icona ingranaggio) → **API**.
2. Copia:
   - **Project URL**
   - **anon public key**

---

## 2. Collega il sito a Supabase

Apri il file [`js/config.js`](js/config.js) e sostituisci i due segnaposto:

```js
const SUPABASE_URL = 'INSERISCI_QUI_LA_TUA_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'INSERISCI_QUI_LA_TUA_ANON_KEY';
```

con i valori copiati al punto 1c. Salva il file.

> La `anon key` è pensata per essere pubblica (è quella usata dal browser
> di ogni invitato): non è un segreto da proteggere, le vere protezioni
> sono le policy di sicurezza create nello script SQL.

---

## 3. Metti il sito online con GitHub Pages (gratis)

1. Crea un nuovo repository su GitHub (es. `elisa-alberto-matrimonio`), pubblico.
2. Carica dentro tutti i file di questa cartella (`index.html`, `gallery.html`, `css/`, `js/`, `sql/`, `README.md`) mantenendo la stessa struttura di cartelle.
3. Nel repository vai su **Settings** → **Pages**.
4. In **Source** scegli **Deploy from a branch**, branch `main`, cartella `/ (root)` → **Save**.
5. Dopo circa un minuto il sito sarà online a un indirizzo tipo:
   `https://tuo-utente.github.io/elisa-alberto-matrimonio/`

Puoi anche collegare un dominio personalizzato gratuitamente dallo stesso pannello **Pages**, se ne avete uno.

---

## 4. Genera il QR code

Usa un generatore gratuito come [qr-code-generator.com](https://www.qr-code-generator.com/)
o [il generatore di Google](https://chrome.google.com/webstore) con il link del punto 3,
e stampalo sui segnaposto dei tavoli o inseriscilo nelle partecipazioni digitali.

---

## 5. Moderazione (facoltativa)

Ogni riga nella tabella `memories` ha un campo `approved` (di default `true`,
cioè visibile subito in galleria). Se volete controllare i contenuti prima
che appaiano:

1. In `sql/schema.sql`, prima di eseguirlo, cambia `default true` in `default false` nella definizione della tabella.
2. Per approvare un ricordo, andate su Supabase → **Table Editor** → `memories` → mettete `true` sulla riga da mostrare.

---

## 6. Struttura del progetto

```
├── index.html          pagina di caricamento per gli invitati
├── gallery.html         galleria live dei ricordi (utile anche proiettata durante la festa)
├── css/style.css        stile del sito
├── js/config.js         le tue chiavi Supabase (da compilare)
├── js/app.js            logica di upload e registrazione audio
├── js/gallery.js        logica della galleria in tempo reale
└── sql/schema.sql       schema del database e permessi di sicurezza
```

## Limiti del piano gratuito Supabase

- 1 GB di spazio di archiviazione, 5 GB di banda al mese: più che sufficiente
  per un matrimonio (qualche centinaio di foto/audio).
- I progetti gratuiti vengono messi in pausa dopo 7 giorni di inattività:
  basta riaprire la dashboard Supabase per riattivarli in pochi secondi,
  utile saperlo se il sito resta a lungo senza visite dopo l'evento.

## Scaricare tutti i ricordi a fine evento

Da Supabase → **Storage** → bucket `wedding-memories`, potete selezionare
tutti i file e scaricarli in blocco direttamente dalla dashboard.
