var args = require('minimist')(process.argv.slice(2));
const port = args.port || 443;
const apis = args.api || 'all';

const https = require('https');
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
	key: fs.readFileSync(require('./auth.json').KEYPATH),
    cert: fs.readFileSync(require('./auth.json').CERTPATH),
    requestCert: true,
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

if (apis.includes('dbd') || apis.includes('all')) {
    login();
}

var server = https.createServer(server_options, async (s_req, s_res) => {
	if (!isLoggedIn() && state !== loginState.LOGGINGIN && (apis.includes('all') || apis.includes('dbd'))) {
		state = loginState.LOGGINGIN;
		login();
	}

	var request = {
		origin_ip: s_req.socket.remoteAddress,
		origin_port: s_req.socket.remotePort,
	};

    request = parseRequest(s_req, request);

    if(request.status == 0) {
        s_res.statusCode = 404;
        s_res.end();
        return;
    }

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
    var err_ct;

	if (request.method == 'POST' || 'GET') {
		await getData(request)
			.then((res) => {
                data = res.data;
                s_res.statusCode = res.statusCode;
			})
			.catch((err) => {
                data = err.data;
                s_res.statusCode = err.statusCode;
                err_ct = err.content_type;
			});
	} else {
		log(`${request.origin_ip}:${request.origin_port}`, `Invalid Method '${request.method}'`);
		s_res.statusCode = 400;
		s_res.end();
		return;
	}

	s_res.setHeader('Access-Control-Allow-Origin', '*');
	s_res.setHeader('content-type', `${request.content_type}; charset=utf-8`);

	if (data != null && s_res.statusCode === 200) {
		s_res.write(data);
		log(`Server`, `Response sent.`);
	} else {
        if (err_ct.includes('json')) {
            data = JSON.parse(data);
        }
        s_res.write(JSON.stringify({error: 'Could not retrieve data.', from: request.api, statusCode: s_res.statusCode, message: data }));
		log(`Server`, `Could not get response.`);
	}
	s_res.end();

	s_req.on('close', () => {
		log(`Server`, `Closed connection with ${chalk.bold(`${request.origin_ip}:${request.origin_port}.\n`)}`);
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
            data_ct = res.headers["content-type"];

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                if (res.statusCode === 200) {
                    log(`Server`, `Data Received from ${chalk.bold(request.api)}.`);
                    resolve({ statusCode: res.statusCode, data: data });
                } else if (request.api === 'DbD API' && res.statusCode === 403) {
                    log(request.api, `403 Forbidden. Attempting to login...`);
                    login();
                    reject({ statusCode: res.statusCode, data: data, content_type: data_ct });
                } else {
                    log(request.api, `Error: ${chalk.red(res.statusCode)}`);
                    reject({ statusCode: res.statusCode, data: data, content_type: data_ct });
                }
            })            
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
			log('Server', 'Logged into DbD API, refresh in 30 minutes.');
			state = loginState.LOGGEDIN;
		} else {
			log('Server', 'Could not login into DbD API.');
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
    
    if (request.api === 'Steam API' && (apis != 'steam' && apis != 'all')) {
        request.status = 0;
        return request;
    }

    if (request.api === 'DbD API' && apis != 'dbd' && apis != 'all') {
        request.status = 0;
        return request;
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