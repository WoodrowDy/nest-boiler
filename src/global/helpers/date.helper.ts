import dayjs from 'dayjs';

/**
 * DTO 정의 시 @Transform decorator에서 사용하는 함수(@IsDate decorator와 함께 사용)
 */
export const transformStringToDate = function (stringDate: string): Date {
    if (stringDate) {
        const date = new Date(stringDate);

        return date;
    }

    return null;
};

/**
 * DTO 정의 시 @Transform decorator에서 사용하는 함수(@IsDate decorator와 함께 사용)
 */
export const transformStringToDateStart = function (stringDate: string): Date {
    if (stringDate) {
        const date = new Date(stringDate);
        const dateStart = dayjs(date).startOf('day').toDate();

        return dateStart;
    }

    return null;
};

/**
 * DTO 정의 시 @Transform decorator에서 사용하는 함수(@IsDate decorator와 함께 사용)
 */
export const transformStringToDateEnd = function (stringDate: string): Date {
    if (stringDate) {
        const date = new Date(stringDate);
        const dateEnd = dayjs(date).endOf('day').toDate();

        return dateEnd;
    }

    return null;
};

/**
 * YYYY-MM-DD HH:mm:ss와 같은 형태의 stringifiedDate를 반환
 */
// export const getStringifiedDateTypeA = function (date = new Date()): string {};

/**
 * YYYYMMDD_HHmmss와 같은 형태의 stringifiedDate를 반환
 */
// export const getStringifiedDateTypeB = function (date = new Date()): string {};

/**
 * 현재날짜 리턴
 * seqNo 생성 시, 날짜 부분 사용 위해 활용
 */
export const getNowDate = function () {
    const now = new Date();
    return (
        now.getFullYear() +
        (now.getMonth() + 1 > 9
            ? (now.getMonth() + 1).toString()
            : '0' + (now.getMonth() + 1)) +
        (now.getDate() > 9
            ? now.getDate().toString()
            : '0' + now.getDate().toString())
    );
};
