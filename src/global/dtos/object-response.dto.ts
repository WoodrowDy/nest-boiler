import { ClassConstructor, plainToInstance } from 'class-transformer';

export class ObjectResponse<T> {
    constructor(
        row: T,
        type?: ClassConstructor<T>,
        responseCode?: string,
        extras?: any,
    ) {
        this.row = type ? plainToInstance(type, row) : row;
        this.responseCode = responseCode;
        this.extras = extras;
    }

    row: T;
    responseCode: string;
    extras?: any;
}
