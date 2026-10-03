# Claude Island

Un villaggio 3D autonomo per Clawd, con controllo manuale, meteo, giorno/notte, token simulati e crescita attraverso la storia di Claude.

## Aprire in locale

```sh
python3 -m http.server 5179 --bind 127.0.0.1 --directory dist
```

Aprire `http://127.0.0.1:5179`. Non occorrono installazione npm, build, chiavi API o credenziali Claude.

## Controlli

- Trascinamento: ruota la camera. Scorrimento o pinch: zoom. Trascinamento con tasto destro o due dita: sposta la camera.
- «Guida Claude»: WASD/frecce, oppure pulsanti direzionali sul telefono. Esc torna alla vita automatica.
- Clic sugli edifici o sui sentieri: visita automatica. Clic sugli abitanti: saluto.
- 1×, 5×, 20×: velocità della simulazione. Pausa sospende crescita e attività.
- Archivio «Modelli»: 32 voci storiche; i modelli sbloccati si possono riutilizzare. Mythos rimane un riferimento storico con accesso ristretto.

## Crescita e salvataggio

La progressione ha 27 livelli e termina a Fable 5.1. Aumentano le dimensioni del protagonista, il raggio dell’isola (fino a 1,598×), le case, i percorsi e la popolazione (fino a 13 abitanti). Le release Opus/Sonnet 5.5 rimangono nell’archivio e si sbloccano alla maestria.

I progressi sono locali a questo browser (`claude-island-v1` in localStorage), con un limite di 8 ore di avanzamento fuori pagina per visita. Una simulazione salvata in pausa non progredisce fuori pagina. «Scarica i progressi» esporta una copia JSON. Il meteo, i token, il codice sul PC e i livelli sono simulati: non si collega all’account Claude e non effettua richieste all’API Anthropic.

## Fonti e crediti

- Tre.js r180, MIT: libreria e licenza incluse in `dist/vendor/`. https://github.com/mrdoob/three.js
- Mascotte di riferimento Clawd, Claude Code: https://www.stickermule.com/claudecode/item/19156131
- Storia dei modelli: ogni scheda dell’archivio include il relativo annuncio ufficiale Anthropic. Dati verificati al 3 ottobre 2026.
- Inter e JetBrains Mono tramite Google Fonts, con fallback ai font di sistema.
- La scena, gli edifici, le barche e le animazioni sono geometrie WebGL originali.

Progetto fan indipendente. Non è un prodotto ufficiale Anthropic.

## Verifica

`check_browser.py` verifica caricamento WebGL, archivio, movimento manuale, meteo, pausa, crescita accelerata, salvataggio/ripristino, stato avanzato e layout mobile usando Playwright.
