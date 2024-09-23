import { Logger } from '@nestjs/common';
import { Logger as TypeORMLogger } from 'typeorm';

export class CustomDbLogger implements TypeORMLogger {
    private loggerLog: Logger = new Logger('QUERY_LOG');

    private loggerError: Logger = new Logger('QUERY_ERROR');

    private loggerSlow: Logger = new Logger('QUERY_SLOW');

    logQuery(query: string, parameters: any[] = []) {
        if (process.env.NODE_ENV === 'dev') {
            this.loggerLog.log(`${query}, ${parameters}`);
        }
    }
    logQueryError(
        error: string | Error,
        query: string,
        parameters: any[] = [],
    ): any {
        this.loggerError.log(`${error} ${query}, ${parameters}`);
    }

    logQuerySlow(time: number, query: string, parameters: any[] = []): any {
        this.loggerSlow.log(`${time} ${query}, ${parameters}`);
    }

    logSchemaBuild(message: string) {
        this.loggerSchemaBuild.log(`Schema Build : ${message}`);
    }

    logMigration(message: string): any {
        this.loggerMigration.log(`Migration : ${message}`);
    }

    log(level: 'log' | 'info' | 'warn', message: string) {
        if (level !== 'warn') {
            this.loggerDBLog.log(`DB Log Level : ${level}, ${message}`);
        } else {
            this.loggerDBLog.warn(`DB Log Level : ${level}, ${message}`);
        }
    }

    private loggerSchemaBuild: Logger = new Logger('QUERY_SCHEMA_BUILD');

    private loggerMigration: Logger = new Logger('QUERY_MIGRATION');

    private loggerDBLog: Logger = new Logger('DB_LOG');
}
