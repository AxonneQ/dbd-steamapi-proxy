const fs = require('fs');
const rl = require('readline-sync');
const chalk = require('chalk');

try {
	fs.readFileSync('./auth.json');
} catch (error) {
	switch (error.code) {
		case 'ENOENT': {
			try {
				console.log(`${chalk.bold('Steam API Key')} not set. Enter your key below or Ctrl+C to exit.`);
				console.log('Key must be 32 characters:');
				var answer = '';

				while (answer.length !== 32) {
					answer = rl.question();
					if (answer.length !== 32) {
						console.log(chalk.red('Invalid STEAM API key. Try again:'));
					}
				}

                fs.writeFileSync('./auth.json', JSON.stringify({ STEAMAPIKEY: answer.trim() }, null, 4));
                console.log(`${chalk.green('SUCCESS:')} Steam API Key saved in ${chalk.yellow('auth.json')}.`);
                console.log(`${chalk.bold('NOTE:')} If the key is invalid Steam API will not send responses.\n`);
			} catch (error) {
                console.log(`${chalk.red('ERROR:')} Failed to write file ${chalk.yellow('auth.json')}\nTerminating...`);
				process.exit(0);
			}
			break;
		}
		case 'EISDIR': {
			console.log(`${chalk.red('ERROR:')} Failed to read file ${chalk.yellow('auth.json')}\nTerminating...`);
			process.exit(0);
		}
	}
}

require('./server');
