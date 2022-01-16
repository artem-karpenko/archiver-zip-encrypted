'use strict';

const inherits = require('util').inherits;
const AesHmacEtmStream = require('./aes-hmac-etm-stream');
const ZipStream = require('zip-stream');
const {DeflateCRC32Stream, CRC32Stream} = require('crc32-stream');
var crc32 = require('buffer-crc32');
const constants = require("compress-commons/lib/archivers/zip/constants");
const zipUtil = require("compress-commons/lib/archivers/zip/util");

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
        this.key = Buffer.from(this.key);
    }

    ZipStream.call(this, options);
};
inherits(ZipAesStream, ZipStream);

function _buildAesExtraField(ae) {
    let buffer = Buffer.alloc(11);
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
    ae.setExtra(Buffer.concat([ae.getExtra(), _buildAesExtraField(ae)]));
    ae.setMethod(ZIP_AES_METHOD);
    ae.setVersionNeededToExtract(51);

    ZipStream.prototype._writeLocalFileHeader.call(this, ae);
};

ZipAesStream.prototype._writeCentralFileHeader = function(ae) {
    var gpb = ae.getGeneralPurposeBit();
    var method = ae.getMethod();
    var offsets = ae._offsets;

    var size = ae.getSize();
    var compressedSize = ae.getCompressedSize();

    if (ae.isZip64() || offsets.file > constants.ZIP64_MAGIC) {
        size = constants.ZIP64_MAGIC;
        compressedSize = constants.ZIP64_MAGIC;

        ae.setVersionNeededToExtract(constants.MIN_VERSION_ZIP64);

        var extraBuf = Buffer.concat([
            zipUtil.getShortBytes(constants.ZIP64_EXTRA_ID),
            zipUtil.getShortBytes(24),
            zipUtil.getEightBytes(ae.getSize()),
            zipUtil.getEightBytes(ae.getCompressedSize()),
            zipUtil.getEightBytes(offsets.file)
        ], 28);

        ae.setExtra(Buffer.concat([ae.getExtra(), extraBuf]));
    }

    // signature
    this.write(zipUtil.getLongBytes(constants.SIG_CFH));

    // version made by
    this.write(zipUtil.getShortBytes((ae.getPlatform() << 8) | constants.VERSION_MADEBY));

    // version to extract and general bit flag
    this.write(zipUtil.getShortBytes(ae.getVersionNeededToExtract()));
    this.write(gpb.encode());

    // compression method
    this.write(zipUtil.getShortBytes(method));

    // datetime
    this.write(zipUtil.getLongBytes(ae.getTimeDos()));

    // crc32 checksum
    this.write(zipUtil.getLongBytes(ae.getCrc()));

    // sizes
    this.write(zipUtil.getLongBytes(compressedSize));
    this.write(zipUtil.getLongBytes(size));

    var name = ae.getName();
    var comment = ae.getComment();
    var extra = ae.getCentralDirectoryExtra();

    if (gpb.usesUTF8ForNames()) {
        name = Buffer.from(name);
        comment = Buffer.from(comment);
    }

    // name length
    this.write(zipUtil.getShortBytes(name.length));

    // extra length
    this.write(zipUtil.getShortBytes(extra.length));

    // comments length
    this.write(zipUtil.getShortBytes(comment.length));

    // disk number start
    this.write(constants.SHORT_ZERO);

    // internal attributes
    this.write(zipUtil.getShortBytes(ae.getInternalAttributes()));

    // external attributes
    this.write(zipUtil.getLongBytes(ae.getExternalAttributes()));

    // relative offset of LFH
    if (offsets.file > constants.ZIP64_MAGIC) {
        this.write(zipUtil.getLongBytes(constants.ZIP64_MAGIC));
    } else {
        this.write(zipUtil.getLongBytes(offsets.file));
    }

    // name
    this.write(name);

    // extra
    this.write(extra);

    // comment
    this.write(comment);
};

ZipAesStream.prototype._appendBuffer = function(ae, source, callback) {
    ae.setSize(source.length);
    ae.setCompressedSize(source.length + 28);
    ae.setCrc(crc32.unsigned(source));

    this._writeLocalFileHeader(ae);

    this._smartStream(ae, callback).end(source);
};

/**
 * Pass stream from compressor through encryption stream
 */
ZipAesStream.prototype._smartStream = function (ae, callback) {
    var deflate = ae.getExtra().readInt16LE(9) > 0;
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