import { IsCustomEnum, IsCustomNumber } from '../decorators/dto.decorator';
import { Services } from '../enums/common.enums';

export class SessionDto {
    @IsCustomNumber({
        required: true,
        minNumber: 1,
        maxNumber: Number.MAX_SAFE_INTEGER,
    })
    accountId: number;

    @IsCustomNumber({
        required: true,
        minNumber: 1,
        maxNumber: Number.MAX_SAFE_INTEGER,
    })
    accountHistoryId: number;

    @IsCustomEnum({ required: true, type: Services })
    service: Services;
}
