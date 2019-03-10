'use strict';

const inherits = require('util').inherits;
const AesHmacEtmStream = require('./aes-hmac-etm-stream');
const ZipStream = require('zip-stream');
const CRC32Stream = require('crc32-stream');
const DeflateCRC32Stream = CRC32Stream.DeflateCRC32Stream;
const constants = require('compress-commons/lib/archivers/zip/constants');

const ZIP_AES_METHOD = 99;

/**
 * Overrides ZipStream with AES-256 encryption
 */
const ZipAesStream = function (options = {zlib: {}}) {
    if (!(this instanceof ZipAesStream)) {
        return new ZipAesStream(options);
    }

    this.key = options.password;
    if (!Buffer.isBuffer(this.key)) {
        this.key = Buffer.from(password);
    }

    ZipStream.call(this, options);
};
inherits(ZipAesStream, ZipStream);

function _buildAesExtraField(ae) {
    let buffer = new Buffer(11);
    buffer.writeUInt16LE(0x9901, 0); // AES header ID
    buffer.writeUInt16LE(0x7, 2); // data size, hardcoded
    buffer.writeUInt16LE(0x1, 4); // AE-1, i.e. CRC is present
    buffer.writeUInt16LE(0x4541, 6); // vendor id, hardcoded
    buffer.writeInt8(0x3, 8); // encryption strength: AES-256
    buffer.writeUInt16LE(ae.getMethod(), 9); // actual compression method

    return buffer;
}

ZipAesStream.prototype._writeLocalFileHeader = function (ae) {
    let gpb = ae.getGeneralPurposeBit();

    // set AES-specific fields
    gpb.useEncryption(true);
    ae.setExtra(_buildAesExtraField(ae));
    ae.setMethod(ZIP_AES_METHOD);
    ae.setVersionNeededToExtract(51);

    ZipStream.prototype._writeLocalFileHeader.call(this, ae);
};

/**
 * Pass stream from compressor through encryption stream
 */
ZipAesStream.prototype._smartStream = function (ae, callback) {
    var deflate = ae.getExtra().readInt16LE(9) === constants.METHOD_DEFLATED;
    var compressionStream = deflate ? new DeflateCRC32Stream(this.options.zlib) : new CRC32Stream();
    var encryptionStream = new AesHmacEtmStream({key: this.key, salt: this.options.salt});
    var error = null;

    function onEnd() {
        var digest = compressionStream.digest().readUInt32BE(0);
        ae.setCrc(digest);
        ae.setSize(compressionStream.size());
        ae.setCompressedSize(encryptionStream.getTotalSize());
        this._afterAppend(ae);
        callback(error, ae);
    }

    encryptionStream.once('end', onEnd.bind(this));
    compressionStream.once('error', function (err) {
        error = err;
    });

    compressionStream.pipe(encryptionStream).pipe(this, {end: false});

    return compressionStream;
};

module.exports = ZipAesStream;