'use strict';

const inherits = require('util').inherits;
const {Transform} = require('stream');
const CryptoCipher = require('./CryptoCipher');

/**
 * Transform stream that encodes data with AES stream and prepends additional data for authentication and verification:
 * ${salt}${passwordVerifier}${encodedData}${hmac}
 */
function CryptoStream(options = {key: null, transformOptions: {}}) {
    if (!(this instanceof CryptoStream)) {
        return new CryptoStream(options);
    }
    Transform.call(this, options);

    this.key = options.key;
    this.cipher = new CryptoCipher(this.key);

    this.headerSent = false;
    this.totalSize = 0;
}
inherits(CryptoStream, Transform);

CryptoStream.prototype.getTotalSize = function () {
    return this.totalSize;
};

CryptoStream.prototype._encrypt = function (data) {
    return this.cipher.encrypt(data);
};

CryptoStream.prototype._transform = function (data, encoding, cb) {
    if (!this.headerSent) {
        let header = Buffer.from("01020304050607080910F0AB", "hex");
        let encryptedHeader = this._encrypt(header);
        console.log(`[ZipCrypto] Writing header: ${encryptedHeader.toString('hex')} of ${encryptedHeader.length} bytes`);

        this.push(encryptedHeader);
        this.totalSize += header.length;

        this.headerSent = true;
    }

    let encrypted = this._encrypt(data);

    if (encrypted.length > 0) {
        console.log(`[ZipCrypto] Writing ${Buffer.byteLength(encrypted)} bytes of data`);
        console.log(`[ZipCrypto] Data: ${encrypted.toString('hex')}`);

        this.push(encrypted);
        this.totalSize += encrypted.length;
    }

    cb();
};

module.exports = CryptoStream;