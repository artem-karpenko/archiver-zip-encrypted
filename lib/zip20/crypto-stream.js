'use strict';

const inherits = require('util').inherits;
const {Transform} = require('stream');
const crypto = require('crypto');
const CryptoCipher = require('./CryptoCipher');

const HEADER_LENGTH = 12;

/**
 * Transform stream that encodes data with CryptoCipher
 */
function CryptoStream(options = {key: null, crc: null, transformOptions: {}}) {
    if (!(this instanceof CryptoStream)) {
        return new CryptoStream(options);
    }
    Transform.call(this, options);

    this.key = options.key;
    this.crc = options.crc;
    this.cipher = new CryptoCipher(this.key);

    this.headerSent = false;
}
inherits(CryptoStream, Transform);

CryptoStream.prototype._encrypt = function (data) {
    return this.cipher.encrypt(data);
};

CryptoStream.prototype._transform = function (data, encoding, cb) {
    if (!this.headerSent) {
        let header = crypto.randomBytes(HEADER_LENGTH);
        header.writeUInt16LE(this.crc.readUInt16BE(0), HEADER_LENGTH - 2);

        let encryptedHeader = this._encrypt(header);

        this.push(encryptedHeader);

        this.headerSent = true;
    }

    let encrypted = this._encrypt(data);

    if (encrypted.length > 0) {
        this.push(encrypted);
    }

    cb();
};

module.exports = CryptoStream;