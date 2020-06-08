# dbd-steamapi-proxy

This is a simple proxy server that fetches Dead By Daylight statistics and total online player count.

#### Available Calls:
1. `/?steamid=<INSERT STEAMID64>` - fetches a JSON file containing game statistics for given steamid profile*. 

    *Note: Game details setting on a given Steam profile must be public in order to get the stats. Otherwise `500 Internal Server Error` status will be received from Steam API.

2. `/?getPlayers` - fetches total amount of online players currently playing Dead By Daylight. Only players who are logged in to Steam are taken into account.

#### How to run:
1. Install [Node.js](https://nodejs.org/en/download/). Works with version 13.12.0. Should work with newest.
2. Clone/download this repository.
3. Get Steam API key (if you don't have one, get one [here](https://steamcommunity.com/dev/apikey)) and add it to your environment variables. Name it `STEAMAPIKEY`, and set it's value to your Steam API key and restart your commandline to detect changes.
4. Get a SSL key and certificate, you can get a self signed one using openssl [Linux](https://www.openssl.org/source/) or [Windows](https://slproweb.com/products/Win32OpenSSL.html). Use the following command in the root directory of this project: `openssl req -nodes -x509 -keyout ssl/server.key -out ssl/server.cert`. You can also sign it using certified SSL services like Let's Encrypt.
5. Once everything is done, run `npm start <port>` to start the server on desired port, else it will default to `11059`.

#### How to use:
Once the server is running, you can request a https request from your website/service using one of the available calls. e.g.
`https://<server-ip>:<server-port>/?getPlayers`

