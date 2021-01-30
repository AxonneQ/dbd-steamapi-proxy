import { rootDir } from './main';
import fs from 'fs';

const auth = JSON.parse(fs.readFileSync(rootDir + '/auth.json', 'utf-8'));

export const CONSTANTS = {
    // Steam Web API
    steamApi_addr: 'api.steampowered.com',
    steamApi_app_players: '/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=381210',
    steamApi_usr_time: `/IPlayerService/GetOwnedGames/v0001/?key=${auth.STEAMAPIKEY}&input_json={"steamid":__STEAM_ID__,"appids_filter":[381210]}`,
    steamApi_usr_stats: `/ISteamUserStats/GetUserStatsForGame/v0002/?appid=381210&key=${auth.STEAMAPIKEY}&steamid=`,
    // DbD Backend
    dbdApi_addr: 'steam.live.bhvrdbd.com',
    dbdApi_login: '/api/v1/auth/login/guest',
    dbdApi_version: '/api/v1/utils/contentVersion/version',
    dbdApi_config: '/api/v1/config',
    dbdApi_shrine: '/api/v1/extensions/shrine/getAvailable',
    dbdApi_outfits: '/api/v1/extensions/store/getOutfits',
    // Dbd Backend CDN
    dbdCdn_addr: 'cdn.live.dbd.bhvronline.com',
    dbdCdn_archive: '/gameinfo/archiveStories/v1/Tome04.json',
    // Dbd Wiki
    dbdWiki_addr: 'deadbydaylight.fandom.com',
    dbdWiki_shrine: '/Shrine_of_Secrets',
    dbdWiki_perks: '/Perks',
}