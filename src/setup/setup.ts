import fs from 'fs';
import rl from 'readline-sync';
import chalk from 'chalk';
import { rootDir } from '../main';

export function setup() {
    try {
        fs.readFileSync(rootDir + '/auth.json');
        return true;
    } catch (error) {
        switch (error.code) {
            case 'ENOENT': {
                try {
                    console.log(`${chalk.bold('Steam API Key')} not set. Enter your key below or Ctrl+C to exit.`);
                    console.log('Key must be 32 characters:');
                    let steamkey = '';
                    let certPath = '';
                    let keyPath = '';

                    while (steamkey.length !== 32) {
                        steamkey = rl.question();
                        if (steamkey.length !== 32) {
                            console.log(chalk.red('Invalid STEAM API key. Try again:'));
                        }
                    }
                    console.log(`${chalk.bold('NOTE:')} If the key is invalid Steam API will not send responses.\n`);

                    console.log(`${chalk.bold('Path to SSL cert')} must be set. (eg: /etc/letsencrypt/live/<domainname>/cert.pem):`);
                    certPath = rl.question();

                    console.log(`${chalk.bold('Path to SSL key')} must be set. (eg. /etc/letsencrypt/live/<domainname>/privkey.pem):`);
                    keyPath = rl.question();

                    fs.writeFileSync(rootDir + '/auth.json', JSON.stringify(
                        {
                            STEAMAPIKEY: steamkey.trim(),
                            CERTPATH: certPath.trim(),
                            KEYPATH: keyPath.trim(),
                        }, null, 4)
                    );
                    console.log(`${chalk.green('SUCCESS:')} Steam API Key and SSL paths saved to ${chalk.yellow('auth.json')}.`);

                    return true;

                } catch (error) {
                    console.log(`${chalk.red('ERROR:')} Failed to write file ${chalk.yellow('auth.json')}\nTerminating...`);
                    process.exit(-1);
                }
            }
            case 'EISDIR': {
                console.log(`${chalk.red('ERROR:')} Failed to read file ${chalk.yellow('auth.json')}\nTerminating...`);
                process.exit(-1);
            }
            default: {
                console.log(`${chalk.red('Unhandled error during setup.')} ${error.code}.\nTerminating...`);
                process.exit(-1);
            }
        }
    }
}