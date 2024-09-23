import * as bcrypt from 'bcryptjs';
import {
    pbkdf2Sync,
    createCipheriv,
    createDecipheriv,
    createHash,
    createHmac,
} from 'crypto';
import * as CryptoJS from 'crypto-js';

export const bcryptHash = async function (string: string): Promise<string> {
    const salt = await bcrypt.genSalt();
    const hashedString = await bcrypt.hash(string, salt);

    return hashedString;
};

export const bcryptCompare = async function (
    string: string,
    bcryptHashedString: string,
): Promise<boolean> {
    return await bcrypt.compare(string, bcryptHashedString);
};

export const singleSaltHash = function (string: string): string {
    const hashedString = pbkdf2Sync(
        string,
        process.env.SALT,
        parseInt(process.env.ITERATIONS),
        parseInt(process.env.KEYLEN),
        process.env.DIGEST,
    ).toString('base64');

    return hashedString;
};

// AES256 암호화
export const aesEncrypt = function (string: string, key: string): string {
    const iv = Buffer.alloc(16, 0);
    const cipher = createCipheriv('aes-256-cbc', key, iv);

    let encryptedString = cipher.update(string, 'utf8', 'base64');
    encryptedString += cipher.final('base64');

    return encryptedString;
};

// AES256 복호화
export const aesDecrypt = function (
    encryptedString: string,
    key: string,
): string {
    const iv = Buffer.alloc(16, 0);
    const decipher = createDecipheriv('aes-256-cbc', key, iv);

    let decryptedString = decipher.update(encryptedString, 'base64', 'utf8');
    decryptedString += decipher.final('utf8');

    return decryptedString;
};

// AES256 암호화
export const aesEncryptWithCryptoJSWithPadding = function (
    string: string,
    option: { key: string },
): string {
    const cipher = CryptoJS.AES.encrypt(
        string,
        CryptoJS.enc.Utf8.parse(option.key),
        {
            iv: CryptoJS.enc.Utf8.parse('0000000000000000'),
            mode: CryptoJS.mode.ECB,
            padding: CryptoJS.pad.Pkcs7,
        },
    ).toString();
    // return cipher.toString();
    return cipher;
};

// AES256 복호화
export const aesDecryptWithOption = function (
    encryptedString: string,
    option: { key: string; iv; algorithm: string },
): string {
    const decipher = createDecipheriv(option.algorithm, option.key, option.iv);

    let decryptedString = decipher.update(encryptedString, 'base64', 'utf8');
    decryptedString += decipher.final('utf8');

    return decryptedString;
};

// SHA256 암호화
export const sha256Encrypt = function (string: string) {
    return createHash('sha256').update(string).digest('hex');
};

export const sha256EncryptWithSecretKey = function (
    string: string,
    secretKey: string,
) {
    return createHmac('sha256', secretKey).update(string).digest('hex');
};

function encryptValueWithCryptoOption(
    data: any,
    options: {
        key: string;
        iv: string;
    },
): string {
    const key = CryptoJS.enc.Utf8.parse(options.key);
    const iv = CryptoJS.enc.Utf8.parse(options.iv);
    return CryptoJS.AES.encrypt(data, key, { iv: iv }).toString();
}

function decryptValueWithCryptoOption(
    data: any,
    options: {
        key: string;
        iv: string;
    },
): string {
    const key = CryptoJS.enc.Utf8.parse(options.key);
    const iv = CryptoJS.enc.Utf8.parse(options.iv);
    return CryptoJS.AES.decrypt(data, key, { iv }).toString(CryptoJS.enc.Utf8);
}

function checkEncryptedString(
    data: any,
    options: {
        key: string;
        iv: string;
    },
): boolean {
    try {
        if (decryptValueWithCryptoOption(data, options) === '') {
            return false;
        }
        const decryptedString = decryptValueWithCryptoOption(data, options);
        const reEncryptString = encryptValueWithCryptoOption(
            decryptedString,
            options,
        );
        if (reEncryptString !== data) return false;
    } catch (e) {
        if (e.message !== 'Malformed UTF-8 data') throw e;
        return false;
    }
    return true;
}

export {
    encryptValueWithCryptoOption,
    decryptValueWithCryptoOption,
    checkEncryptedString,
};
