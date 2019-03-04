'use strict';

const inherits = require('util').inherits;
const {Transform} = require('stream');
const crypto = require('crypto');

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

CryptoStream.prototype.encrypt = function (data) {

};

CryptoStream.prototype._transform = function (data, encoding, cb) {
    if (!this.headerSent) {
        this.push("header");
        this.totalSize += "header".length;

        this.headerSent = true;
    }

    let encoded = this._encrypt(data);

    if (encoded.length > 0) {
        console.log(`[ZipCrypto] Writing ${Buffer.byteLength(encoded)} bytes of data`);

        this.push(encoded);
        this.totalSize += encoded.length;
    }

    cb();
};

module.exports = CryptoStream;