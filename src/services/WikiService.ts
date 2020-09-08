import { Perks, initPerks } from './../models/perks';
import { CONSTANTS } from './../constants';
import { Request } from './../models/request';
import { Logger } from '../utils/logger';

import _ from 'lodash';
import got from 'got/dist/source';
import { JSDOM } from 'jsdom';
import { Tabletojson } from 'tabletojson';

export class WikiService {
	private static _maxRetries = 3;

	public static sendRequest(request: Request) {
		let tries = 0;

		return new Promise(async (resolve, reject) => {
			while (true) {
				try {
					const response = await got('https://' + request.destination.hostname + request.destination.path, {
						hostname: request.destination.hostname,
						path: request.destination.path,
						method: request.method as 'POST' | 'GET',
						headers: {
							'Content-Type': request.headers.contentType,
						},
					});

					let data;

					switch (request.destination.path) {
						case CONSTANTS.dbdWiki_perks: {
							data = this.constructPerks(response.body) as {};
						}
					}

					resolve({ content: data, contentType: 'application/json', statusCode: 200 });
					return;
				} catch (error) {
					if (_.isUndefined(error.response)) {
						reject({ body: '500 Internal Server Error', statusCode: 500 });
						Logger.error(request.api, `500 - Service error occured.`);
						return;
					}

					Logger.error(request.api, `${error.response.statusCode} - Retrying.. (${tries + 1})`);

					if (++tries === this._maxRetries) {
						reject({ body: error.response.body, statusCode: error.response.statusCode });
						return;
					}
				}
			}
		});
	}

	private static constructPerks(htmlString: string) {
		const tables = Tabletojson.convert(htmlString, { stripHtmlFromCells: false, useFirstRowForHeadings: true });
		const perkTables: [][] = tables.filter((element) => element.length > 70);
		const wikiPerks: { name: string; description: string }[] = [];

		const perkList = {} as Perks;
		initPerks(perkList);

		perkTables.forEach((table) => {
			for (const entry in table) {
				if (entry !== '0') {
                    const keyName = 'Name';
                    const keyDescription = 'Description';

					const _name = new JSDOM(`<body>${table[entry][keyName] as string}</body>`).window.document.querySelector('body')?.textContent as string;
					const _description = table[entry][keyDescription];

					wikiPerks.push({ name: _name, description: _description });
				}
			}
		});

		for (const perk in perkList) {
			if (perk) {
                const name = perkList[perk].displayName;

                perkList[perk].description = wikiPerks.find(_perk => _perk.name === name)?.description;
			}
		}

		return perkList;
	}
}
