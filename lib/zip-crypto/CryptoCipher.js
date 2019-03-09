'use strict';

/**
 * Implementation of "ZipCrypto"/"Zip 2.0 encryption" cipher used in Zip.
 * This is old and insecure algorithm, AES-based encryption has been introduced into ZIP format since then.
 * Yet, this is the only encryption method supported by Windows systems to open ZIP files as folders.
 */

const crc32 = require('./crc');

const _uint8 = n => n & 0xFF;
const _uint32 = n => n & 0xFFFFFFFF;

function CryptoCipher(key) {
    this.key = key;
    if (!Buffer.isBuffer(key)) {
        this.key = Buffer.from(this.key);
    }

    this._init();
}

CryptoCipher.prototype._init = function () {
    this.key0 = 0x12345678;
    this.key1 = 0x23456789;
    this.key2 = 0x34567890;

    for (let b of this.key) {
        this._updateKeys(b);
    }
};

CryptoCipher.prototype._updateKeys = function (b) {
    this.key0 = crc32(this.key0, b);
    this.key1 = _uint32(this.key1 + (this.key0 & 0xFF));
    this.key1 = _uint32(Math.imul(this.key1, 134775813) + 1);
    this.key2 = crc32(this.key2, this.key1 >>> 24);
};

CryptoCipher.prototype._streamByte = function () {
    let tmp = this.key2 | 2;
    return _uint8(Math.imul(tmp, (tmp ^ 1)) >>> 8);
};

CryptoCipher.prototype._encryptByte = function (b) {
    let encryptedByte = this._streamByte() ^ b;
    this._updateKeys(b);
    return encryptedByte;
};

CryptoCipher.prototype._decryptByte = function (b) {
    let decryptedByte = this._streamByte() ^ b;
    this._updateKeys(decryptedByte);
    return decryptedByte;
};

CryptoCipher.prototype.encrypt = function (data) {
    let encryptedData = Buffer.alloc(Buffer.byteLength(data)), offset = 0;
    for (let b of data) {
        encryptedData.writeUInt8(this._encryptByte(b), offset++);
    }
    return encryptedData;
};

CryptoCipher.prototype.decrypt = function (data) {
    let decryptedData = Buffer.alloc(Buffer.byteLength(data)), offset = 0;
    for (let b of data) {
        decryptedData.writeUInt8(this._decryptByte(b), offset++);
    }
    return decryptedData;
};

module.exports = CryptoCipher;