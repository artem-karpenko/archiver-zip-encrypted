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

ZipCryptoStream.prototype._cryptoStream = function (crc) {
    return new CryptoStream({key: this.key, crc});
};

ZipCryptoStream.prototype._smartStream = function (ae, callback) {
    let deflate = ae.getMethod() === constants.METHOD_DEFLATED;
    let process = deflate ? new DeflateCRC32Stream(this.options.zlib) : new CRC32Stream();
    let error = null;
    let bufferedData = [];

    let _t = this;
    function handleStuff(compressedSize) {
        _t._afterAppend(ae);
        callback(error, ae);
    }

    process.once('error', function (err) {
        error = err;
    });
    process.on('data', (data) => {
        bufferedData.push(data);
    });
    process.once('end', () => {
        let crc = process.digest();

        ae.setCrc(crc.readUInt32BE(0));
        ae.setSize(process.size());
        ae.setCompressedSize(process.size() + 12);

        // write local header now
        _t._writeLocalFileHeader(ae);

        let encrypt = this._cryptoStream(crc);
        let writes = [];
        for (let chunk of bufferedData) {
            writes.push(() => writeBufferToStream(encrypt, chunk));
        }
        promiseSerial(writes).then(() => encrypt.end());

        encrypt.pipe(this, {end: false});
        encrypt.once('end', () => {
            handleStuff(encrypt.getTotalSize())
        });
    });

    return process;
};

ZipCryptoStream.prototype._appendStream = function(ae, source, callback) {
    ae.getGeneralPurposeBit().useDataDescriptor(false);
    ae.setVersionNeededToExtract(constants.MIN_VERSION_DATA_DESCRIPTOR);

    // we will write local file header after we get CRC back
    // this._writeLocalFileHeader(ae);

    var smart = this._smartStream(ae, callback);
    source.once('error', function(err) {
        smart.emit('error', err);
        smart.end();
    });
    source.pipe(smart);
};

function writeBufferToStream(writable, data) {
    return new Promise((resolve, reject) => {
        writable.write(data, (err) => {
            if (err) {
                reject();
            } else {
                resolve();
            }
        });
    });
}

const promiseSerial = funcs =>
    funcs.reduce((promise, func) =>
            promise.then(result =>
                func().then(Array.prototype.concat.bind(result))),
        Promise.resolve([]));

module.exports = ZipCryptoStream;