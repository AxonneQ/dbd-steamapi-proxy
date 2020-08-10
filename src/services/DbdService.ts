import { Shrine, ShrinePerk } from './../models/shrine';
import { rootDir } from './../main';
import got from 'got';
import tough from 'tough-cookie';
import _ from 'lodash';

import fs from 'fs';

import { Request } from './../models/request';
import { Logger } from '../utils/logger';
import { CONSTANTS } from '../constants';
import moment from 'moment';

export class DbdService {
	private static _userAgent = 'DeadByDaylight/++DeadByDaylight+Live-CL-296874 Windows/10.0.18363.1.256.64bit';
    private static _cookieJar = new tough.CookieJar();
    private static _maxRetries = 3;

    public static async sendRequest(request: Request) {
        await this.validateSession();

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
                            'User-Agent': this._userAgent,
                        },
                        json: request.body as {},
                        allowGetBody: true,
                        cookieJar: this._cookieJar,
                    });

                    let data;

                    switch(request.destination.path) {
                        case CONSTANTS.dbdApi_shrine: {
                            data = this.constructShrine(response.body) as {};
                            break;
                        }
                    }

                    resolve({ content: data || response.body, contentType: request.headers.returnContentType, statusCode: response.statusCode });
                    return;
                } catch (error) {
                    if(_.isUndefined(error.response)) {
						reject({ body: '500 Internal Server Error', statusCode: 500 });
                        Logger.error(request.api, `500 - Service error occured.`);
                        return;
                    }

                    switch (error.response.statusCode) {
                        case 403: {
                            if(request.api === 'DbD CDN') {
                                Logger.error(request.api, 'Cannot retrieve CDN content.');
                                reject({body: error.response.body, statusCode: error.response.statusCode});
                                return;
                            }
                            if (tries === 0) {
                                Logger.warn(request.api, `${error.response.statusCode} - Unauthorized. Logging in to DbD backend service as guest and retrying..`);
                            } else {
                                Logger.warn(request.api, `Cannot Login. Retrying (${tries + 1})`);
                            }

                            try {
                                await this.login();
                                break;
                            } catch (error) {
                                Logger.error(request.api, error);
                            }
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

    private static async login() {
        const clientVersion = await this.getVersion();

        const res = await got('https://' + CONSTANTS.dbdApi_addr + CONSTANTS.dbdApi_login, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/JSON',
                'User-Agent': this._userAgent,
            },
            json: {
                clientData: {
                    catalogId: clientVersion,
                    gameContentId: clientVersion,
                    consentId: clientVersion
                }
            }
        })

        if(res.headers["set-cookie"]) {
            res.headers["set-cookie"].forEach(cookie => {
                const newCookie = tough.Cookie.parse(cookie);
                if(newCookie?.key === 'bhvrSession') {
                    this._cookieJar.setCookie(newCookie as tough.Cookie, 'https://' + CONSTANTS.dbdApi_addr);
                    const data = { session_cookie: cookie, expires: newCookie.expires };
                    try {
                        fs.writeFileSync(rootDir + '/session.json', JSON.stringify(data, null, 4));
                    } catch (error) {
                        Logger.warn('Server', `${error.message}. Session token won't be persistent.`);
                    }
                }
            })
        } else {
            throw new Error('Login Failed. Session token not received.');
        }
    }

    private static async validateSession() {
        this._cookieJar.getCookieString('https://' + CONSTANTS.dbdApi_addr).then(async cookies => {
            if(cookies === ''){
                try {
                    const sessionJson = JSON.parse(fs.readFileSync(rootDir + '/session.json', 'utf-8'));
                    if(moment(new Date(sessionJson.expires), 'X').unix() <= moment().unix()) {
                        await this.login();
                    } else {
                        const newCookie = tough.Cookie.parse(sessionJson.session_cookie);
                        this._cookieJar.removeAllCookies();
                        this._cookieJar.setCookie(newCookie as tough.Cookie, 'https://' + CONSTANTS.dbdApi_addr);
                    }
                } catch (error) {
                    Logger.warn('Server', `${error.message}.`);
                }
            } else {
                if(moment(new Date(tough.Cookie.parse(cookies)?.expires as Date), 'X').unix() <= moment().unix()) {
                    await this.login();
                } else {
                    return;
                }
            }
        })
    }

    private static async getVersion() {
        const versionsResponse = await got('https://' + CONSTANTS.dbdApi_addr + CONSTANTS.dbdApi_version, {
            method: 'GET',
        });

        const sortedVersions = Object.keys(JSON.parse(versionsResponse.body).availableVersions).filter(element => {
            return !element.startsWith('m_');
        }).sort();

        return sortedVersions[sortedVersions.length - 1];
    }

    private static constructShrine(response: string) {
        const rawShrine = JSON.parse(response);
        const shrineResponse = {} as Shrine;

        shrineResponse.startDate = rawShrine.startDate;
        shrineResponse.endDate = rawShrine.endDate;
        shrineResponse.week = rawShrine.week;
        shrineResponse.perks = [];

        for(const entry in rawShrine.items) {
            if(entry) {
                const perk = {} as ShrinePerk;

                perk.id = rawShrine.items[entry].id;
                perk.bloodpointValue = rawShrine.items[entry].bloodpointValue;
                perk.cost = rawShrine.items[entry].cost[0].price;
                perk.currency = rawShrine.items[entry].cost[0].currencyId;

                shrineResponse.perks.push(perk);
            }
        }

        return shrineResponse;
    }
}
