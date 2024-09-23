const nodeEnvs = {
    LOCAL: 'local',
    DEV: 'dev',
    PROD: 'prod',
} as const;

const NODE_ENV_ARRAY: string[] = Object.values(nodeEnvs);

export const commonConstants = {
    props: {
        nodeEnvs,
        NODE_ENV_ARRAY,
    },
    errorMessages: {},

    defaultQuery: {
        PAGE: 1,
        PAGE_SIZE: 10,
        MAX_PAGE_SIZE: 1000,
        ORDER_KEY: 'createdAt',
        ORDER_VALUE: 'DESC',
    },
    injectionToken: {},
};
