import got from 'got';
import _ from 'lodash';

import { Request } from './../models/request';
import { Logger } from '../utils/logger';

export class SteamService {
    private static _maxRetries = 3;

    public static async sendRequest(request: Request) {
        let tries = 0;

        return new Promise(async (resolve, reject) => {
            while(true) {
                try {
                    const response = await got('https://' + request.destination.hostname + request.destination.path, {
                        hostname: request.destination.hostname,
                        path: request.destination.path,
                        method: request.method as 'POST' | 'GET',
                        headers: {
                            'Content-Type': request.headers.contentType,
                        },
                    });

                    resolve({ content: response.body, contentType: response.headers['content-type'], statusCode: response.statusCode });
                    return;
                } catch (error) {
					if (_.isUndefined(error.response)) {
						reject({ body: '500 Internal Server Error', statusCode: 500 });
						Logger.error(request.api, `500 - Service error occured.`);
						return;
					}

                    switch (error.response.statusCode) {
                        case 403: {
                            Logger.error(request.api, `${error.response.statusCode} - Unauthorized. Steam API key is probably invalid..`);
                            reject(error.response.body);
                            return;
                        }
                        default: {
                            Logger.error(request.api, `${error.response.statusCode} - Retrying.. (${tries + 1})`);
                        }
                    }

                    if(++tries === this._maxRetries) {
                        reject({body: error.response.body, statusCode: error.response.statusCode});
                        return;
                    }
                }
            }
        });
    }
}
