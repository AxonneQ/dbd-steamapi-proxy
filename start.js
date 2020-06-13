const https = require("https");
const port = process.argv[2] || 11059; //node start.js <?port>
const url = require("url");
const fs = require("fs");

const totalPlayersApi = "https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=381210";
const playerStatsApi = `https://api.steampowered.com/ISteamUserStats/GetUserStatsForGame/v0002/?appid=381210&key=${process.env.STEAMAPIKEY}&steamid=`;
const playerTimePlayedApi = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${process.env.STEAMAPIKEY}&input_json={%22steamid%22:__STEAM__ID__,%22appids_filter%22:%20[%20381210%20]}`;

const options = {
    key: fs.readFileSync("ssl/server-key.pem"),
    cert: fs.readFileSync("ssl/server-cert.pem"),
};

var server = https.createServer(options, (s_req, s_res) => {
    s_res.setHeader("Access-Control-Allow-Origin", "*");

    var steamRequest = parseRequest(s_req);

    if (steamRequest.req == null) {
        s_res.statusCode = 400;
        s_res.end();
        console.log(`\n${s_req.socket.remoteAddress}:${s_req.socket.remotePort} -> Bad Request`);
        return;
    }

    https.get(steamRequest.req, (res) => {
        res.on("error", (err) => {
            console.log(`SteamAPI -> Bad Request (${err})`);
            s_res.statusCode = 400;
            s_res.end();
            return;
        });

        if (res.statusCode === 500) {
            console.log("SteamAPI -> 500 Internal Server Error");
            s_res.statusCode = 500;
            s_res.end();
        } else {
            console.log("SteamAPI -> Data Received.");
            s_res.setHeader("content-type", `${steamRequest.type}; charset=utf-8`);
            res.pipe(s_res, { end: true });
            console.log("Server -> Response sent.");
        }
    });

    s_req.on("close", () => {
        console.log(`Closed connection with ${s_req.socket.remoteAddress}:${s_req.socket.remotePort}`);
    });
});

server.listen(port, () => {
    console.log(`Listening on port: ${port}`);
});

function parseRequest(request) {
    var action = url.parse(request.url, true).query.action;
    var args = url.parse(request.url, true).query.args;

    if(args != undefined){
        try {
            args = JSON.parse(args);
        } catch (err) {
            return { req: null };
        }
    }

    var client_ip = request.socket.remoteAddress;
    var client_port = request.socket.remotePort;

    var steamRequest;
    var contentType = "application/json";

    switch (action) {
        case "getPlayerCount": {
            steamRequest = totalPlayersApi;
            break;
        }
        case "getPlayerInfo": {
            steamRequest = `${args.link}?xml=1`;
            contentType = "text/xml";
            break;
        }
        case "getPlayerTime": {
            steamRequest = playerTimePlayedApi;
            steamRequest = steamRequest.replace("__STEAM__ID__", args.steamid);
            break;
        }
        case "getPlayerGameStats": {
            steamRequest = `${playerStatsApi}${args.steamid}`;
            break;
        }
        default: {
            steamRequest = null;
        }
    }

    if (steamRequest !== null) {
        console.log(`\nIncoming: ${client_ip}:${client_port} -> ${action}`);
    }
    return { req: steamRequest, type: contentType };
}
