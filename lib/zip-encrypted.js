'use strict';

/**
 * ZIP with encryption
 */
const inherits = require('util').inherits;
const ZipCryptoStream = require('./zip20/zip-crypto-stream');
const ZipAesStream = require('./aes/zip-aes-stream');
const Zip = require('archiver/lib/plugins/zip');

/**
 * Options copied from Zip plugin in archiver, with inclusion of password and method of encryption
 * @constructor
 * @param {ZipOptions} [options]
 * @param {String | Buffer} [options.password] password for encrypted data
 * @param {String} [options.encryptionMethod] "aes256" for AES-256 or "zip20" for legacy Zip 2.0 encryption
 * @param {String} [options.comment] Sets the zip archive comment.
 * @param {Boolean} [options.forceLocalTime=false] Forces the archive to contain local file times instead of UTC.
 * @param {Boolean} [options.forceZip64=false] Forces the archive to contain ZIP64 headers.
 * @param {Boolean} [options.store=false] Sets the compression method to STORE.
 * @param {Object} [options.zlib] Passed to [zlib]{@link https://nodejs.org/api/zlib.html#zlib_class_options}
 */
const ZipEncrypted = function (options = {}) {
    if (!options.password) {
        throw new Error('options.password is required');
    }
    if (!Buffer.isBuffer(options.password)) {
        options.password = Buffer.from(options.password, 'utf-8');
    }

    if (!(this instanceof ZipEncrypted)) {
        return new ZipEncrypted(options);
    }

    Zip.call(this, options);

    switch (options.encryptionMethod) {
    case 'aes256': this.engine = new ZipAesStream(options); break;
    case 'zip20': this.engine = new ZipCryptoStream(options); break;
    default: throw new Error(`Unsupported encryption method: '${options.encryptionMethod}'. Please use either 'aes256' or 'zip20'.`);
    }
};
inherits(ZipEncrypted, Zip);

module.exports = ZipEncrypted;
