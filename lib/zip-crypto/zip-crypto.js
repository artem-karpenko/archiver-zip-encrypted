'use strict';

/**
 * ZIP with ZipCrypto encryption
 */
const inherits = require('util').inherits;
const ZipCryptoStream = require('./zip-crypto-stream');
const Zip = require('archiver/lib/plugins/zip');

/**
 * Options copied from Zip plugin in archiver
 * @constructor
 * @param {ZipOptions} [options]
 * @param {String} [options.comment] Sets the zip archive comment.
 * @param {Boolean} [options.forceLocalTime=false] Forces the archive to contain local file times instead of UTC.
 * @param {Boolean} [options.forceZip64=false] Forces the archive to contain ZIP64 headers.
 * @param {Boolean} [options.store=false] Sets the compression method to STORE.
 * @param {Object} [options.zlib] Passed to [zlib]{@link https://nodejs.org/api/zlib.html#zlib_class_options}
 */
const ZipCrypto = function (options = {}) {
    if (!options.password) {
        throw new Error('options.password is required');
    }
    if (!Buffer.isBuffer(options.password)) {
        options.password = Buffer.from(options.password, 'utf-8');
    }

    if (!(this instanceof ZipCrypto)) {
        return new ZipCrypto(options);
    }

    Zip.call(this, options);

    this.engine = new ZipCryptoStream(this.options);
};
inherits(ZipCrypto, Zip);

module.exports = ZipCrypto;
