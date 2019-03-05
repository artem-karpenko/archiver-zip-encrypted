'use strict';

const inherits = require('util').inherits;
const CryptoStream = require('./crypto-stream');
const ZipStream = require('zip-stream');
const ZipArchiveOutputStream = require('compress-commons').ZipArchiveOutputStream;
const ZipArchiveEntry = require('compress-commons').ZipArchiveEntry;
const CRC32Stream = require('crc32-stream');
const DeflateCRC32Stream = CRC32Stream.DeflateCRC32Stream;
const zipUtil = require('compress-commons/lib/archivers/zip/util');
const constants = require('compress-commons/lib/archivers/zip/constants');

const ZipCryptoStream = function (options = {zlib: {}}) {
    if (!(this instanceof ZipCryptoStream)) {
        return new ZipCryptoStream(options);
    }

    this.key = options.password;
    if (!Buffer.isBuffer(this.key)) {
        this.key = Buffer.from(password);
    }

    ZipStream.call(this, options);
};
inherits(ZipCryptoStream, ZipStream);

ZipCryptoStream.prototype._writeLocalFileHeader = function (ae) {
    let gpb = ae.getGeneralPurposeBit();
    gpb.useEncryption(true);

    ZipStream.prototype._writeLocalFileHeader.call(this, ae);
};

ZipCryptoStream.prototype._cryptoStream = function () {
    return new CryptoStream({key: this.key});
};

ZipCryptoStream.prototype._smartStream = function (ae, callback) {
    var deflate = ae.getMethod() === constants.METHOD_DEFLATED;
    var process = deflate ? new DeflateCRC32Stream(this.options.zlib) : new CRC32Stream();
    var encrypt = this._cryptoStream();
    var error = null;

    function handleStuff() {
        var digest = process.digest().readUInt32BE(0);
        ae.setCrc(digest);
        ae.setSize(process.size());
        ae.setCompressedSize(encrypt.getTotalSize());
        this._afterAppend(ae);
        callback(error, ae);
    }

    encrypt.once('end', handleStuff.bind(this));
    process.once('error', function (err) {
        error = err;
    });

    process.pipe(encrypt);
    encrypt.pipe(this, {end: false});

    return process;
};

module.exports = ZipCryptoStream;