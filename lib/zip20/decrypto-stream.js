'use strict';

const inherits = require('util').inherits;
const {Transform} = require('stream');
const CryptoCipher = require('./CryptoCipher');

const HEADER_LENGTH = 12;

/**
 * Transform stream that encodes data with CryptoCipher
 */
function DecryptoStream(options = {key: null, crc: null, transformOptions: {}}) {
    if (!(this instanceof DecryptoStream)) {
        return new DecryptoStream(options);
    }
    Transform.call(this, options);

    this.key = options.key;
    this.crc = options.crc;
    this.cipher = new CryptoCipher(this.key);

    this.header = Buffer.alloc(0);
    this.headerProcessed = false;
    this.totalSize = 0;
}

inherits(DecryptoStream, Transform);

DecryptoStream.prototype.getTotalSize = function () {
    return this.totalSize;
};

DecryptoStream.prototype._decrypt = function (data) {
    return this.cipher.decrypt(data);
};

DecryptoStream.prototype._transform = function (data, encoding, cb) {
    if (!this.headerProcessed) {
        this.header = Buffer.concat([this.header, data]);
        if (this.header.length > HEADER_LENGTH) {
            data = data.slice(HEADER_LENGTH - this.header.length);
            this.header = this.header.slice(0, HEADER_LENGTH);

            this._decrypt(this.header);

            this.headerProcessed = true;
        } else {
            data = Buffer.alloc(0);
        }
    }

    let decrypted = this._decrypt(data);

    if (decrypted.length > 0) {
        this.push(decrypted);
        this.totalSize += decrypted.length;
    }

    cb();
};

module.exports = DecryptoStream;