# KT Team Discord Bot

Gotov Discord.js v14 bot za KT Team.

## Funkcije

- Welcome embed u kanalu `1549159837261238422`
- Ticket Center dropdown u `1549159878642368553`
- Otvoreni ticketi u kategoriji `1549159877279223808`
- Zatvoreni ticket log + `.txt` transcript u `1549159961647521983`
- Ticket podaci + transcript u Railway MySQL
- Discord invite panel u `1549159840658628688`
- Whitelist button u `1549159888373153833`
- Automatska whitelist rola `1549159797994037400`
- Roleplay koncept u `1549159848502108170`
- FiveM status u `1549159845087940728`
- Pravila u `1549159849810591848`
- `/notify` modal
- `/pravila` modal
- `/setup` za ponovno postavljanje stalnih poruka
- FiveM: `151.242.16.51:30120`
- Status se osvježava svakih 30 sekundi uređivanjem ISTE poruke

## Railway instalacija

1. Upload/push projekt na GitHub i napravi Railway service iz repozitorija.
2. U Railway Variables dodaj:
   - `DISCORD_TOKEN`
   - `CLIENT_ID`
   - `GUILD_ID`
   - `MYSQLHOST`
   - `MYSQLPORT`
   - `MYSQLUSER`
   - `MYSQLPASSWORD`
   - `MYSQLDATABASE`
   - `FIVEM_HOST=151.242.16.51`
   - `FIVEM_PORT=30120`
3. Za MySQL varijable preporuka je koristiti Railway Variable Reference prema MySQL servisu.
4. Start command je `npm start`.
5. Bot pri pokretanju sam kreira tablice:
   - `discord_tickets`
   - `discord_bot_messages`
6. Nakon prvog pokretanja `/setup` može ručno osvježiti stalne poruke.

## Discord Developer Portal

Bot mora imati uključene:
- SERVER MEMBERS INTENT
- MESSAGE CONTENT INTENT

Preporučene Discord permisije:
- View Channels
- Send Messages
- Embed Links
- Attach Files
- Read Message History
- Manage Channels
- Manage Roles
- Use Application Commands

VAŽNO: botova rola mora biti IZNAD whitelist role `1549159797994037400`, inače Discord neće dopustiti automatsku dodjelu role.

## Slash komande

### /notify
Otvara modal:
- Ime obavijesti
- Opis

Embed se šalje u kanal u kojem je `/notify` pokrenut.

### /pravila
Otvara modal za:
- naslov
- kompletan sadržaj pravila

Uvijek uređuje istu spremljenu poruku u rules kanalu.

### /setup
Postavlja ili ažurira Ticket Center, Invite, Whitelist i Roleplay panel te FiveM status.

## Ticket sustav

Jedan korisnik može imati jedan otvoreni ticket. Kod zatvaranja:
1. Dohvate se poruke iz ticketa.
2. Generira se tekstualni transcript.
3. Ticket se označi `closed` u MySQL.
4. Transcript se spremi u MySQL.
5. `.txt` transcript i informacije se pošalju u closed-ticket kanal.
6. Ticket kanal se obriše.

## Sigurnost

NIKADA ne stavljaj Discord token ili MySQL password u source code/GitHub.
Koristi Railway Variables.

Ako je MySQL password bio vidljiv na screenshotu ili javno podijeljen, regeneriraj ga prije deploya.


## FiveM status fix
Status endpointi se sada provjeravaju neovisno preko `Promise.allSettled()`. Ako jedan endpoint ne odgovori, drugi dostupni endpoint može potvrditi da je server online.


## v2.0 - FiveM heartbeat status

FiveM status više ne ovisi o Cfx API-ju niti o direktnom `players.json`.

Railway Variables:
- `FIVEM_STATUS_SECRET` = potpuno isti secret kao `Config.Secret` u `kt-discord-status/config.lua`
- `FIVEM_HEARTBEAT_TIMEOUT` = `90000` (opcionalno)

Railway mora imati javni domain. U FiveM resourceu postavi:

`Config.BotURL = 'https://TVOJ-RAILWAY-DOMAIN/fivem/heartbeat'`

Heartbeat:
- `POST /fivem/heartbeat`
- secret se provjerava preko `X-KT-Status-Secret`
- nakon 90 sekundi bez heartbeata status postaje OFFLINE
- `/health` vraća health check bota

Discord MySQL i FiveM MySQL ostaju potpuno odvojeni. Heartbeat ne koristi FiveM bazu.
