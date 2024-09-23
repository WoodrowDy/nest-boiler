import axios from 'axios';

const axiosRequest = async function (
    method: 'get' | 'post' | 'put' | 'delete',
    url: string,
    params?: Record<string, any>,
    data?: Record<string, any>,
    headers?: Record<string, any>,
) {
    return await axios({
        method,
        url,
        params,
        data,
        headers,
    });
};

export const httpGet = async function (
    url: string,
    params?: Record<string, any>,
    headers?: Record<string, any>,
): Promise<any> {
    return await axiosRequest('get', url, params, undefined, headers);
};

export const httpPost = async function (
    url: string,
    data?: Record<string, any>,
    headers?: Record<string, any>,
): Promise<any> {
    return await axiosRequest('post', url, undefined, data, headers);
};

export const httpPut = async function (
    url: string,
    data?: Record<string, any>,
    headers?: Record<string, any>,
): Promise<any> {
    return await axiosRequest('put', url, undefined, data, headers);
};

export const httpDelete = async function (
    url: string,
    data?: Record<string, any>,
    headers?: Record<string, any>,
): Promise<any> {
    return await axiosRequest('delete', url, undefined, data, headers);
};
