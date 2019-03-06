'use strict';

/**
 * ZIP with AES encryption
 */
const inherits = require('util').inherits;
const ZipAesStream = require('./zip-aes-stream');
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
const ZipAes = function (options = {}) {
    if (!options.password) {
        throw new Error('options.password is required');
    }
    if (!Buffer.isBuffer(options.password)) {
        options.password = Buffer.from(options.password, 'utf-8');
    }

    if (!(this instanceof ZipAes)) {
        return new ZipAes(options);
    }

    Zip.call(this, options);

    this.engine = new ZipAesStream(this.options);
};
inherits(ZipAes, Zip);

module.exports = ZipAes;
