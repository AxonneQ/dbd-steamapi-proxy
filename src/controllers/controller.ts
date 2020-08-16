import { WikiService } from './../services/WikiService';
import { SteamService } from './../services/SteamService';
import { DbdService } from './../services/DbdService';
import { Request } from './../models/request';
import { CONSTANTS } from '../constants';
import { Logger } from '../utils/logger';
import { apis } from '../main';

import { IncomingMessage } from 'http';
import URL from 'url';

export enum API {
	steam = 'Steam API',
	dbd = 'DbD API',
    wiki = 'DbD Wiki',
    dbdCdn = 'DbD CDN'
}

export class Controller {
	public static parseRequest(req: IncomingMessage): Request {
		const request = new Request();
        const url = (request.url = URL.parse(req.url as string, true));

        request.source.address = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress as string;;
		request.action = url.query.action as string;

		if (url.query.args !== undefined) {
			try {
				request.args = JSON.parse(url.query.args as string);
			} catch (err) {
				request.status = -1;
				Logger.warn('Server', `Bad Request from ${request.source.address}. (Could not parse 'args' query)`);
				return request;
			}
		}

		const isArgsAvailable = () => {
			if (url.query.args === undefined) {
				request.status = -1;
				Logger.warn('Server', `Bad Request from ${request.source.address}. (Missing 'args' query)`);
				return false;
			}
			return true;
		};

        try {
            switch (request.action) {
                case 'getPlayerCount': {
                    request.api = API.steam;
                    request.destination.hostname = CONSTANTS.steamApi_addr;
                    request.destination.path = CONSTANTS.steamApi_app_players;
                    request.headers.contentType = 'application/json';
                    request.headers.returnContentType = 'application/json';
                    request.method = 'GET';
                    request.status = 1;
                    break;
                }
                case 'getPlayerInfo': {
                    if (!isArgsAvailable()) return request;
                    const address = URL.parse(request.args.link, true);
                    request.api = API.steam;
                    request.destination.hostname = address.hostname as string;
                    request.destination.path = address.pathname + '?xml=1';
                    request.headers.contentType = 'text/xml';
                    request.headers.returnContentType = 'text/xml';
                    request.method = 'GET';
                    request.status = 1;
                    break;
                }
                case 'getPlayerTime': {
                    if (!isArgsAvailable()) return request;
                    request.api = API.steam;
                    request.destination.hostname = CONSTANTS.steamApi_addr;
                    request.destination.path = CONSTANTS.steamApi_usr_time.replace('__STEAM_ID__', request.args.steamid);
                    request.headers.contentType = 'application/json';
                    request.headers.returnContentType = 'application/json';
                    request.method = 'GET';
                    request.status = 1;
                    break;
                }
                case 'getPlayerGameStats': {
                    if (!isArgsAvailable()) return request;
                    request.api = API.steam;
                    request.destination.hostname = CONSTANTS.steamApi_addr;
                    request.destination.path = CONSTANTS.steamApi_usr_stats + request.args.steamid;
                    request.headers.contentType = 'application/json';
                    request.headers.returnContentType = 'application/json';
                    request.method = 'GET';
                    request.status = 1;
                    break;
                }
                case 'getConfig': {
                    request.api = API.dbd;
                    request.destination.hostname = CONSTANTS.dbdApi_addr;
                    request.destination.path = CONSTANTS.dbdApi_config;
                    request.headers.contentType = 'application/json';
                    request.headers.returnContentType = 'application/json';
                    request.method = 'GET';
                    request.status = 1;
                    break;
                }
                case 'getShrine': {
                    request.api = API.dbd;
                    request.headers.contentType = 'application/json';
                    request.headers.returnContentType = 'application/json';
                    request.destination.hostname = CONSTANTS.dbdApi_addr;
                    request.destination.path = CONSTANTS.dbdApi_shrine;
                    request.body = { data: { version: 'steam' } };
                    request.method = 'POST';
                    request.status = 1;

                    // Wiki shrine page
                    // request.api = API.wiki;
                    // request.destination.hostname = CONSTANTS.dbdWiki_addr;
                    // request.destination.path = CONSTANTS.dbdWiki_shrine;
                    // request.headers.contentType = 'text/html';
                    // request.method = 'GET';
                    // request.status = 1;
                    break;
                }
                case 'getOutfits': {
                    request.api = API.dbd;
                    request.headers.contentType = 'application/json';
                    request.headers.returnContentType = 'application/json';
                    request.destination.hostname = CONSTANTS.dbdApi_addr;
                    request.destination.path = CONSTANTS.dbdApi_outfits;
                    request.body = { data: {} };
                    request.method = 'POST';
                    request.status = 1;
                    break;
                }
                // case 'getArchive': {
                //     request.api = API.dbdCdn;
                //     request.headers.contentType = 'application/json';
                //     request.headers.returnContentType = 'application/json';
                //     request.destination.hostname = CONSTANTS.dbdCdn_addr;
                //     request.destination.path = CONSTANTS.dbdCdn_archive;
                //     request.method = 'GET';
                //     request.status = 1;
                //     break;
                // }
                case 'getPerks': {
                    request.api = API.wiki;
                    request.headers.contentType = 'text/html';
                    request.headers.returnContentType = 'application/json';
                    request.destination.hostname = CONSTANTS.dbdWiki_addr;
                    request.destination.path = CONSTANTS.dbdWiki_perks;
                    request.method = 'GET';
                    request.status = 1;
                    break;
                }
                default: {
                    Logger.warn('Server', `Bad Request from ${request.source.address}. (Invalid action query)`);
                    request.status = -1;
                    return request;
                }
            }

            if (request.api === API.steam && apis !== 'steam' && apis !== 'all') {
                request.status = 0;
                return request;
            }

            if (request.api === API.dbd && apis !== 'dbd' && apis !== 'all') {
                request.status = 0;
                return request;
            }

            if (request.status !== -1) {
                Logger.log(`${request.source.address}`, `${request.action}`);
            }

            return request;
        } catch (error) {
            Logger.error('Controller', `Couldn't parse request.`)
            request.status = -1;
            return request;
        }
	}

	public static async getData(req: Request) {
		switch (req.api) {
			case API.steam: {
                return await SteamService.sendRequest(req);
			}
			case API.dbd: {
				return await DbdService.sendRequest(req);
			}
			case API.dbdCdn: {
				return await DbdService.sendRequest(req);
			}
			case API.wiki: {
                return await WikiService.sendRequest(req);
			}
		}
	}
}
