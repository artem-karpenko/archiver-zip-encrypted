'use strict';

const inherits = require('util').inherits;
const {Transform} = require('stream');
const ZipCryptoStream = require('./zip20/zip-crypto-stream');
const ZipAesStream = require('./aes/zip-aes-stream');
const WrapTransformStream = require('../lib/WrapTransformStream');

function ZipEncryptedStream(options = {}) {
    if (!(this instanceof ZipEncryptedStream)) {
        return new ZipEncryptedStream(options);
    }
    if (!options.password) {
        throw new Error('options.password is required');
    }
    if (!Buffer.isBuffer(options.password)) {
        options.password = Buffer.from(options.password, 'utf-8');
    }

    switch (options.encryptionMethod) {
        case "aes256": this.encryptionStream = new ZipAesStream(options); break;
        case "zip20": this.encryptionStream = new ZipCryptoStream(options); break;
        default: throw new Error(`Unsupported encryption method: '${options.encryptionMethod}'. Please use either 'aes256' or 'zip20'.`);
    }

    WrapTransformStream.call(this, this.encryptionStream);
}
inherits(ZipEncryptedStream, WrapTransformStream);

module.exports = ZipEncryptedStream;