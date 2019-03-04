'use strict';

const inherits = require('util').inherits;
const AesHmacEtmStream = require('./aes-hmac-etm-stream');
const ZipStream = require('zip-stream');
const ZipArchiveOutputStream = require('compress-commons').ZipArchiveOutputStream;
const ZipArchiveEntry = require('compress-commons').ZipArchiveEntry;
const CRC32Stream = require('crc32-stream');
const DeflateCRC32Stream = CRC32Stream.DeflateCRC32Stream;
const zipUtil = require('compress-commons/lib/archivers/zip/util');
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

    gpb.useDataDescriptor(false);

    // set AES-specific fields
    gpb.useEncryption(true);
    ae.setExtra(_buildAesExtraField(ae));
    ae.setMethod(ZIP_AES_METHOD);
    ae.setVersionNeededToExtract(51);

    ZipStream.prototype._writeLocalFileHeader.call(this, ae);

    // // continue with standard zip header
    // let method = ae.getMethod();
    // let name = ae.getName();
    // let extra = ae.getLocalFileDataExtra();
    //
    // if (ae.isZip64()) {
    //     gpb.useDataDescriptor(true);
    //     ae.setVersionNeededToExtract(constants.MIN_VERSION_ZIP64);
    // }
    //
    // if (gpb.usesUTF8ForNames()) {
    //     name = new Buffer(name);
    // }
    //
    // ae._offsets.file = this.offset;
    //
    // // signature
    // this.write(zipUtil.getLongBytes(constants.SIG_LFH));
    //
    // // version to extract and general bit flag
    // this.write(zipUtil.getShortBytes(ae.getVersionNeededToExtract()));
    // this.write(gpb.encode());
    //
    // // compression method
    // this.write(zipUtil.getShortBytes(method));
    //
    // // datetime
    // this.write(zipUtil.getLongBytes(ae.getTimeDos()));
    //
    // ae._offsets.data = this.offset;
    //
    // // crc32 checksum and sizes
    // if (gpb.usesDataDescriptor()) {
    //     this.write(constants.LONG_ZERO);
    //     this.write(constants.LONG_ZERO);
    //     this.write(constants.LONG_ZERO);
    // } else {
    //     this.write(zipUtil.getLongBytes(ae.getCrc()));
    //     this.write(zipUtil.getLongBytes(ae.getCompressedSize())); // TODO change
    //     this.write(zipUtil.getLongBytes(ae.getSize()));
    // }
    //
    // // name length
    // this.write(zipUtil.getShortBytes(name.length));
    //
    // // extra length
    // this.write(zipUtil.getShortBytes(extra.length));
    //
    // // name
    // this.write(name);
    //
    // // extra
    // this.write(extra);
    //
    // ae._offsets.contents = this.offset;
};

ZipAesStream.prototype._writeCentralFileHeader = function (ae) {
    let gpb = ae.getGeneralPurposeBit();

    // set AES-specific fields
    gpb.useEncryption(true);
    ae.setExtra(_buildAesExtraField(ae));
    ae.setMethod(ZIP_AES_METHOD);

    // TODO: ZIP64 support
    ZipStream.prototype._writeCentralFileHeader.call(this, ae);
};

ZipAesStream.prototype._aesStream = function () {
    return new AesHmacEtmStream({key: this.key, salt: this.options.salt});
};

ZipAesStream.prototype._smartStream = function (ae, callback) {
    var deflate = ae.getMethod() === constants.METHOD_DEFLATED;
    var process = deflate ? new DeflateCRC32Stream(this.options.zlib) : new CRC32Stream();
    var encoder = this._aesStream();
    var error = null;

    function handleStuff() {
        var digest = process.digest().readUInt32BE(0);
        ae.setCrc(null);
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