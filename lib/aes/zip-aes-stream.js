'use strict';

const inherits = require('util').inherits;
const AesHmacEtmStream = require('./aes-hmac-etm-stream');
const ZipStream = require('zip-stream');
const CRC32Stream = require('crc32-stream');
const DeflateCRC32Stream = CRC32Stream.DeflateCRC32Stream;
const constants = require('compress-commons/lib/archivers/zip/constants');

const ZIP_AES_METHOD = 99;

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
    buffer.writeUInt16LE(0x9901, 0);
    buffer.writeUInt16LE(0x7, 2);
    buffer.writeUInt16LE(0x2, 4);
    buffer.writeUInt16LE(0x4541, 6);
    buffer.writeInt8(0x3, 8);
    buffer.writeInt8(0, 9); // ae.getMethod()

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

ZipAesStream.prototype._aesStream = function () {
    return new AesHmacEtmStream({key: this.key, salt: this.options.salt});
};

ZipAesStream.prototype._smartStream = function (ae, callback) {
    // TODO: use actual compression method
    var deflate = ae.getMethod() === constants.METHOD_DEFLATED;
    var process = deflate ? new DeflateCRC32Stream(this.options.zlib) : new CRC32Stream();
    var encoder = this._aesStream();
    var error = null;

    function handleStuff() {
        var digest = process.digest().readUInt32BE(0);
        ae.setCrc(digest);
        ae.setSize(process.size());
        ae.setCompressedSize(encoder.getTotalSize());
        this._afterAppend(ae);
        callback(error, ae);
    }

    encoder.once('end', handleStuff.bind(this));
    process.once('error', function (err) {
        error = err;
    });

    process.pipe(encoder);
    encoder.pipe(this, {end: false});

    return process;
};

module.exports = ZipAesStream;