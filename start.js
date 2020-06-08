const https = require("https");
const http = require("http");
const port = process.argv[2] || 11059; //node start.js <?port>
const url = require("url");
const fs = require("fs");

const totalPlayersApi = "https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=381210";
const playerStatsApi = `https://api.steampowered.com/ISteamUserStats/GetUserStatsForGame/v0002/?appid=381210&key=${process.env.STEAMAPIKEY}&steamid=`;

// const options = {
//     key: fs.readFileSync("ssl/server.key"),
//     cert: fs.readFileSync("ssl/server.cert"),
// };

var server = http.createServer((s_req, s_res) => {
    var client_ip = s_req.socket.remoteAddress;
    var client_port = s_req.socket.remotePort;
    var steamid = url.parse(s_req.url, true).query.steamid;
    var players = url.parse(s_req.url, true).query.getPlayers;
    var requestApi;

    if (steamid !== undefined) {
        requestApi = `${playerStatsApi}${steamid}`;
        console.log(`Incoming connection from: ${client_ip}:${client_port}, requested player stats for ${steamid}`);
    } else if (players !== undefined) {
        requestApi = totalPlayersApi;
        console.log(`Incoming connection from: ${client_ip}:${client_port}, requested total online players`);
    } else {
        s_res.statusCode = 400;
        s_res.end();
        return;
    }

    https.get(requestApi, (res) => {
        res.on("error", (err) => {
            console.error(err);
            s_res.statusCode = 400;
            s_res.end();
        });

        if (res.statusCode === 500) {
            console.log("500 Internal Server Error.");
            s_res.statusCode = 500;
            s_res.end();
        } else {
            console.log("Retrieved player data.");
            s_res.setHeader("content-type", "application/json; charset=utf-8");
            s_res.setHeader("Access-Control-Allow-Origin", "*");
            res.pipe(s_res, { end: true });
            console.log("Player data response sent.");
        }
    });

    s_req.on("close", () => {
        console.log(`Closed connection with ${s_req.socket.remoteAddress}:${s_req.socket.remotePort}\n`);
    });
});

server.listen(port, () => {
    console.log(`Listening on port: ${port}`);
});