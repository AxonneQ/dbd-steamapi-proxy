import min from 'minimist';
import { setup } from './setup/setup';

const args = min(process.argv.slice(2));
export const port = args.port || 443;
export const apis = args.api || 'all';
export const rootDir = `${__dirname}`;

const isComplete = setup();

import { Server } from './server/server';

if(isComplete) {
    Server.start();
}