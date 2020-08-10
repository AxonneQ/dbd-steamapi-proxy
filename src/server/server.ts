import { rootDir } from './../main';
import fs from 'fs';
import https from 'https';
import chalk from 'chalk';

import { port } from '../main';

import { Logger } from '../utils/logger';
import { Controller } from '../controllers/controller';

export class Server {
	public static start() {
        let auth;

		try {
			auth = JSON.parse(fs.readFileSync(rootDir + '/auth.json', 'utf-8'));
		} catch (error) {
			Logger.error('Server', 'auth.json not found. Terminating...');
			process.exit(1);
        }

        const serverOptions = {
            key: fs.readFileSync(auth.KEYPATH),
            cert: fs.readFileSync(auth.CERTPATH),
            ciphers: 'ECDHE-RSA-AES128-GCM-SHA256',
            user_agent: 'game=DeadByDaylight, engine=UE4, version=4.13.2-0+UE4',
        };

		const server = https.createServer(serverOptions, async (req, res) => {

			const parsedRequest = Controller.parseRequest(req);

			if (parsedRequest.status === 0) {
                res.statusCode = 404;
                res.setHeader('content-type', `text/html; charset=utf-8`);
                res.write('404 Not found.');
				res.end();
				return;
			}

			if (parsedRequest.status === -1) {
                res.statusCode = 400;
                res.setHeader('content-type', `text/html; charset=utf-8`);
                res.write('400 Bad Request.');
                res.end();
				return;
            }

            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('content-type', `${parsedRequest.headers.returnContentType}; charset=utf-8`);

            let resBody: any;

            await Controller.getData(parsedRequest).then((response: any) => {
                Logger.log(parsedRequest.api, `Response sent to ${parsedRequest.source.address}.`);
                res.statusCode = response.statusCode;
                resBody = response.content;
            }).catch((err) => {
                Logger.error(parsedRequest.api, `Status code: ${err.statusCode}`);
                res.statusCode = err.statusCode;
                resBody = err.body;
            });

            if(resBody instanceof Object) {
                res.end(JSON.stringify(resBody));
            } else {
                res.end(resBody);
            }

			req.on('close', () => {
				Logger.log(`Server`, `Closed connection with ${chalk.bold(`${parsedRequest.source.address}.`)}`);
			});
		});

		server.listen(port, () => {
			Logger.log(`Server`, `Listening on port: ${port}`);
		});
	}
}
