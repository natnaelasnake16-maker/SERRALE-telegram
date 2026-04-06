import { createLogger, format, transports } from 'winston';
import { config } from '../config';

export const logger = createLogger({
    level: config.logLevel,
    format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.printf(({ level, message, timestamp, stack, ...meta }) => {
            const suffix = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
            return `${timestamp} [${level}] ${stack || message}${suffix}`;
        })
    ),
    transports: [new transports.Console()],
});
