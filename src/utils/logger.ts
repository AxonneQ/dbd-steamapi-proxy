import moment from 'moment';
import chalk from 'chalk';

export class Logger {
    static log(source: string, action: any) {
        const time = moment().format('HH:mm:ss DD/MMM/YY').toUpperCase();
        console.log(`[${chalk.bold(time)}] ${chalk.green('>>')} ${chalk.yellow(source)} ${chalk.green('>>')} ${action}`);
    }

    static error(source: string, action: any) {
        const time = moment().format('HH:mm:ss DD/MMM/YY').toUpperCase();
        console.log(`[${chalk.bold(time)}] ${chalk.green('>>')} ${chalk.yellow(source)} ${chalk.green('>>')} ${chalk.red('ERROR:')} ${action}`);
    }

    static warn(source: string, action: any) {
        const time = moment().format('HH:mm:ss DD/MMM/YY').toUpperCase();
        console.log(`[${chalk.bold(time)}] ${chalk.green('>>')} ${chalk.yellow(source)} ${chalk.green('>>')} ${chalk.yellow('WARNING:')} ${action}`);
    }
}