const https = require('https');
const port = process.argv[2] || 11059; //node start.js <?port>
const url = require('url');
const fs = require('fs');
const moment = require('moment');
const chalk = require('chalk');
const {
	steamApi_addr,
	steamApi_usr_stats,
	steamApi_usr_time,
	steamApi_app_players,
	dbdApi_addr,
	dbdApi_config,
	dbdApi_shrine,
	dbdApi_outfits,
} = require('./constants');

const server_options = {
	key: fs.readFileSync('ssl/server-key.pem'),
	cert: fs.readFileSync('ssl/server-cert.pem'),
	user_agent: 'game=DeadByDaylight, engine=UE4, version=4.13.2-0+UE4',
};

const loginState = {
	LOGGEDOUT: 0,
	LOGGEDIN: 1,
	LOGGINGIN: 2,
};

var nextLogin = 0;
var state = 0;
var auth_cookie = '';

login();

var server = https.createServer(server_options, async (s_req, s_res) => {
	if (!isLoggedIn() && state !== loginState.LOGGINGIN) {
		state = loginState.LOGGINGIN;
		login();
	}

	var request = {
		origin_ip: s_req.socket.remoteAddress,
		origin_port: s_req.socket.remotePort,
	};

	request = parseRequest(s_req, request);

	if (request.status == -1) {
		s_res.statusCode = 400;
		s_res.end();
		log(`${request.origin_ip}:${request.origin_port}`, `Bad Request:
            \t${chalk.green('Path: ')}${chalk.bold(request.url.pathname)}
            \t${chalk.green('Request: ')}${chalk.bold(request.url.search)}\n`
		);
		return;
	}

	var data;

	if (request.method == 'POST' || 'GET') {
		await getData(request)
			.then((res) => {
				data = res.data;
			})
			.catch((err) => {
				log('Server', `Error: ${err.statusCode}`);
			});
	} else {
		log(`${request.origin_ip}:${request.origin_port}`, `Invalid Method '${request.method}'`);
		s_res.statusCode = 400;
		s_res.end();
		return;
	}

	s_res.setHeader('Access-Control-Allow-Origin', '*');
	s_res.setHeader('content-type', `${request.content_type}; charset=utf-8`);

	if (data != null) {
		s_res.write(data);
		log(`Server`, `Response sent to ${chalk.bold(request.origin_ip)}.`);
	} else {
		log(`Server`, `Response is undefined. Ending connection.`);
	}

	s_res.end();

	s_req.on('close', () => {
		log(`Server`, `Closed connection with ${chalk.bold(`${request.origin_ip}:${request.origin_port}\n`)}`);
	});
});

server.listen(port, () => {
	log(`Server`, `Listening on port: ${port}`);
});

async function getData(request) {
	return new Promise((resolve, reject) => {
		let options = {
			method: request.method,
			hostname: request.hostname,
			port: request.port == undefined ? 443 : request.port,
			path: request.path,
			headers: {
				'Content-Type': request.content_type,
				'User-Agent': request.api == 'Steam API' ? '' : server_options.user_agent,
				Cookie: request.auth == true ? auth_cookie : '',
			},
			body: request.body == undefined ? '' : request.body,
		};

		let data = '';

		var req = https.request(options, (res) => {
			switch (res.statusCode) {
				case 403: {
					log(request.api, `403 Forbidden`);
					login();
					reject({ statusCode: 403 });
					req.end();
					break;
				}
				case 404: {
					log(request.api, `404 Not Found`);
					reject({ statusCode: 404 });
					req.end();
					break;
				}
				case 500: {
					log(request.api, `500 Internal Server Error`);
					reject({ statusCode: 500 });
					req.end();
					break;
				}
				case 200: {
					log(`Server`, `Receiving data from ${chalk.bold(request.api)}.`);
					res.on('data', (chunk) => {
						data += chunk;
					});

					res.on('end', () => {
						log(`Server`, `Data Received from ${chalk.bold(request.api)}.`);
						resolve({ statusCode: 200, data: data });
					});
					break;
				}
				default: {
					log(request.api, `${res.statusCode} Error`);
					reject({ statusCode: res.statusCode });
					req.end();
					break;
				}
			}
		});

		req.on('error', (err) => {
			log(request.api, `Error: ${err.message}`);
			reject({ statusCode: -1 });
		});

		req.end();
	});
}

function isLoggedIn() {
	return nextLogin > moment().unix();
}

function login() {
	let options = {
		hostname: 'latest.live.dbd.bhvronline.com',
		path: '/api/v1/auth/login/guest',
		method: 'POST',
		port: 443,
		headers: {
			'Content-Type': 'application/JSON',
			'User-Agent': 'game=DeadByDaylight, engine=UE4, version=4.13.2-0+UE4',
		},
		body: { clientData: { consentId: '2' } },
		key: server_options.key,
		cert: server_options.cert,
	};

	var req = https.request(options, (res) => {
		if (res.headers['set-cookie']) {
			auth_cookie = res.headers['set-cookie'];
			nextLogin = moment().unix() + 1800;
			log('Server', 'Logged Into DBD API, refresh in 30 minutes.');
			state = loginState.LOGGEDIN;
		} else {
			log('Server', 'Could not loggin into DBD API.');
			state = loginState.LOGGEDOUT;
		}
	});

	req.on('error', (e) => {
		console.error(e);
	});

	req.end();
}

function parseRequest(s_req, request) {
	request.url = url.parse(s_req.url, true);
	request.action = request.url.query.action;
	request.args = request.url.query.args;

	if (request.args != undefined) {
		try {
			request.args = JSON.parse(request.args);
		} catch (err) {
			request.status = -1;
			return request;
		}
	}

	switch (request.action) {
		case 'getPlayerCount': {
			request.api = 'Steam API';
			request.hostname = steamApi_addr;
			request.path = steamApi_app_players;
			request.content_type = 'application/json';
			request.method = 'GET';
			request.status = 1;
			break;
		}
		case 'getPlayerInfo': {
			let address = url.parse(request.args.link, true);
			request.api = 'Steam API';
			request.hostname = address.hostname;
			request.path = address.pathname + '?xml=1';
			request.content_type = 'text/xml';
			request.method = 'GET';
			request.status = 1;
			break;
		}
		case 'getPlayerTime': {
			request.api = 'Steam API';
			request.hostname = steamApi_addr;
			request.path = steamApi_usr_time.replace('__STEAM_ID__', request.args.steamid);
			request.content_type = 'application/json';
			request.method = 'GET';
			request.status = 1;
			break;
		}
		case 'getPlayerGameStats': {
			request.api = 'Steam API';
			request.hostname = steamApi_addr;
			request.path = steamApi_usr_stats + request.args.steamid;
			request.content_type = 'application/json';
			request.method = 'GET';
			request.status = 1;
			break;
		}
		case 'getConfig': {
			request.api = 'DbD API';
			request.auth = true;
			request.hostname = dbdApi_addr;
			request.path = dbdApi_config;
			request.content_type = 'application/json';
			request.method = 'GET';
			request.status = 1;
			break;
		}
		case 'getShrine': {
			request.api = 'DbD API';
			request.auth = true;
			request.content_type = 'application/json';
			request.hostname = dbdApi_addr;
			request.path = dbdApi_shrine;
			request.body = JSON.stringify({ data: { version: 'steam' } }, null, 8);
			request.method = 'POST';
			request.status = 1;
			break;
		}
		case 'getOutfits': {
			request.api = 'DbD API';
			request.auth = true;
			request.content_type = 'application/json';
            request.hostname = dbdApi_addr;
            request.path = dbdApi_outfits;
            request.body = { data: { version: 'steam' } };
			request.method = 'POST';
			request.status = 1;
			break;
		}
		default: {
			request.status = -1;
		}
	}

	if (request.status !== -1) {
		log(`${request.origin_ip}:${request.origin_port}`, `${request.action}`);
	}

	return request;
}

function log(source, action) {
	time = moment().format('HH:mm:ss DD/MMM/YY').toUpperCase();
	console.log(`(${chalk.bold(time)}) ${chalk.green('>>')} ${chalk.yellow(source)} ${chalk.green('>>')} ${action}`);
}
