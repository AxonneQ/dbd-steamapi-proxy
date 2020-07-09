const STEAMAPIKEY = require('./auth.json').STEAMAPIKEY;

module.exports = {
    steamApi_addr: 'api.steampowered.com',
    steamApi_app_players: '/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=381210',
    steamApi_usr_time: `/IPlayerService/GetOwnedGames/v0001/?key=${STEAMAPIKEY}&input_json={"steamid":__STEAM_ID__,"appids_filter":[381210]}`,
    steamApi_usr_stats: `/ISteamUserStats/GetUserStatsForGame/v0002/?appid=381210&key=${STEAMAPIKEY}&steamid=`,
    dbdApi_addr: 'steam.live.bhvrdbd.com',
    dbdApi_config: '/api/v1/config',
    dbdApi_shrine: '/api/v1/extensions/shrine/getAvailable',
    dbdApi_outfits: '/api/v1/extensions/store/getOutfits',
    dbdWiki_addr: 'deadbydaylight.gamepedia.com',
    dbdWiki_shrine: '/Shrine_of_Secrets',
}
