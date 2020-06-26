# dbd-steamapi-proxy

This is a simple proxy server that fetches Dead By Daylight statistics and total online player count.

### Available API Calls:
#### Steam API:
1. `/?action=getPlayerGameStats&args={"steamid":"<INSERT STEAMID64"}` - fetches a JSON file containing game statistics for given steamid profile. 
    
    Note: **Game details setting on a given Steam profile must be public in order to get the stats. Otherwise `500 Internal Server Error` status will be received from Steam API.**

2. `/?action=getPlayerCount` - fetches total amount of online players currently playing Dead By Daylight. Only players who are logged in to Steam are taken into account.

3. `/?action=getPlayerInfo&args={"link":"<INSERT STEAM PROFILE LINK>"}` Fetches an XML containing steam profile information, including SteamID64.

4. `/?action=getPlayerTime&args={"steamid":"<INSERT STEAMID64>"}` Fetches time played for Dead By Daylight.

Note that all arguments must be passed as string, by using quotes `""`, otherwise long numbers such as SteamID will lose precision and be rounded to 0 at the end. This will fetch a wrong/invalid profile.

#### DBD API: (As of 23 of June 2020, the DBD api seems to be down or changed the endpoints and this is currently not working anymore)
1. `/?action=getShrine` Fetches Current Shrine in DBD Store and time remaining. 

    Note: **This is currently not working due to incorrect POST body, feel free to correct it.**

2. `/?action=getOutfits` Fetches Current Outfits in DBD Store 

    Note: **This doesn't always include the newest data. Still working on it, again, feel free to correct it :)**

3. `/?action=getConfig` Fetches Current DBD config. This lists the latest settings of DBD as well as contains Kraken Decryption Key for CDN which I have not implemented yet. This allows to fetch and decrypt news and other CDN content.
#### How to run:
1. Install [Node.js](https://nodejs.org/en/download/). Works with version 13.12.0. Should work with newest.
2. Clone/download this repository.
3. run `npm install` from the repository directory to install dependencies.
4. Get Steam API key (if you don't have one, get one [here](https://steamcommunity.com/dev/apikey)).
5. Get a SSL key and certificate, you can get a self signed one using openssl [Linux](https://www.openssl.org/source/) or [Windows](https://slproweb.com/products/Win32OpenSSL.html). Use the following command in the root directory of this project: `openssl req -nodes -x509 -keyout ssl/server-key.pem -out ssl/server-cert.pem`. You can also sign it using certified SSL services like Let's Encrypt (a requirement for certain hosting services like Github Pages, openssl doesn't seem to work).
6. Once everything is done, run `npm start <port>` to start the server on desired port, else it will default to `443`. Make sure your port is open and if running on linux use `sudo`. You will be prompted for your Steam API Key. It will be saved in `auth.json` in the root folder. Upon next server launch, it will be loaded from there.

### How to use:
Once the server is running, you can request a https request from your website/service using one of the available calls. e.g.
`https://<your-domain>/?action=getPlayerCount` or locally `https://localhost:<port>/?action=getPlayerCount`

### Error handling:
If Steam or DBD API fails to return a response, the server will return error response with status and the origin API.
```
{
    error:      <message>
    from:       <api name>
    statusCode: <code>
    message:    <data returned from api>
}
```

