# Ei Noah Bot Setup

De **Ei Noah Bot** is de officiële Discord bot voor de **Sweaty GG Chat**!


## 1 Bot Opzetten
Om de bot te developen in een veilige manier, wordt de bot buiten de server ontwikkeld. Dit gebeurt op de **Ei Noah Test Server** of op een server waar alles kapot mag.
> Stuur een DM naar BeBoRE#6306 om uitgenodigd te worden

### 1.1 Bot Aanmaken
Om een bot aan te maken ga naar de [Discord Developer Portal.](https://discord.com/developers/applications) Registreer hier een **nieuwe applicatie**. Geef hier *Ei Noah* in of bedenk zelf iets leuks en klik op **aanmaken**. Navigeer naar **Bot** en **Aanmaken** noem hem *Ei Noah \<jou naam\>*. Gefeliciteerd je hebt nu je persoonlijke bot!

### 1.2 Bot "Inviten"
Om de bot op een Discord server te krijgen moet je een **OAuth2 Link** genereren. Ga naar **OAuth2** onderaan zie het kopje **Scopes**, selecteer hier **bot**. Je ziet nu **Bot Permissions**. Selecteer hier de permissions die de bot nodig heeft, **SELECTEER NIET ADMINISTRATOR.**
> Bot permission kunnen later nog aangepast worden

Onderaan **Scopes** is een link verschenen, ga naar deze link. Selecteer de **Ei Noah Test Server**' en druk op **Authoriseren**.

### 1.3 Scherm de bot af
Maak je eigen categorie die alleen jou bot kan zien.

## 2 Development Environment Opzetten
Gebruik een code-editor die gebruik kan maken van ESLint, ik raad aan om [VSCode te gebruiken.](https://code.visualstudio.com/)

### 2.1 ESLint
**ESLint** is een linter die bedoel is om de kwaliteit van JavaScript code te verbeteren. Links op het scherm van **VSCode** staan tapjes, ga naar **Extentions** en zoek op *ESLint*, druk op install. Om Auto-Fix in te schakelen druk op `ctrl`+`shift`+`p` of `⌘`+`⇧`+`p` op MacOS, en type in *Open Settings (JSON)* en enter.
Voeg hier
```json
"editor.codeActionsOnSave": {
	"source.fixAll.eslint": true
},
"files.insertFinalNewline": true,
```
aan toe. Je JS/TS code wordt nu automatisch geformat.

### 2.2 Node.JS
**NodeJS** is de JS runtime die we gebruiken om de bot op te draaien. Ga naar [nodejs.org](https://nodejs.org/en/) en download en installeer **LTS** (je zou ook [NVM](https://github.com/coreybutler/nvm-windows) kunnen gebruiken).

### 2.3 Clone De Repo
Open CMD en clone de repo `git clone https://github.com/Sweaty-Tryhards/ei-noah-bot.git` en `cd ei-noah-bot` om erin te navigeren. Type in `npm i` om alle dependencies te installeren. Om VSCode te openen in de directory type in `code .` (vergeet de punt niet)

### 2.4 Database
Ei-Noah maakt gebruik van Postgres. Postgres kan je [hier downloaden](https://www.postgresql.org/download/). Ik raad je aan om PGAdmin te installeren tijdens het installatie proces. Nadat je Postgres hebt geïnstalleerd, start PGAdmin. 

Voer een wachtwoord in en voeg de lokale database toe (als die er nog niet staat). Rechtermuis klik op *Servers*. Selecteer *Create* en *Server...* Geef de connectie een naam en navigeer naar *connection*. Zet bij host `localhost` neer en bij gebruiker en wachtwoord wat je bij het installatie proces hebt neergezet. 

Maak een nieuwe database aan `ei-noah`, je doet dit door rechtermuis klik op *databases* te doen en naar *Create > database...* te navigeren. Noem de database `ei-noah`. En maak hem aan.

### 2.5 Environment

De settings van de applicatie staan in een `.env` file, omdat hier gevoelige info instaat zoals de **Discord Bot Token**, je zult deze zelf moeten aanmaken in de root van bot (waar package.json staat).

```s

CLIENT_TOKEN="<Jou Discord Bot Token>"

ERROR_CHANNEL=743906228052164720

NODE_ENV="development"

DBUSER="<Jouw postgres user>"

PASSWORD="<Jouw postgres wachtwoord>"

REFRESH_DATA=false
```

Om de app in te laten loggen met jou **Discord Bot** moet je gebruik maken van jou **Discord Bot Token**. Deze staat onder het tapje **Bot** bij de applicatie die je net hebt aangemaakt op de [Discord Developer Portal.](https://discord.com/developers/applications) Vul deze in bij `CLIENT_TOKEN`.

`REFRESH_DATA` geeft aan dat de bot niet corona-data op moet halen, dit zorgt ervoor dat de bot vastloopt voor een tijdje, afhankelijk van je hardware soms meerdere kwartieren.

  

### 2.6 Start de Bot

Om de bot te starten, druk op `F5`. Als er aanpassingen gedaan worden wordt de bot opnieuw gestart.
