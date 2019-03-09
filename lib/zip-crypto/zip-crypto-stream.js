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

/**
 * Overrides ZipStream with ZipCrypto/Zip2.0 encryption
 */
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
    // set encryption
    ae.getGeneralPurposeBit().useEncryption(true);
    ZipStream.prototype._writeLocalFileHeader.call(this, ae);
};

/**
 * As opposed to original implementation which streamed deflated data into target stream,
 * this implementation buffers deflated data. This is done for 2 reasons:
 * 1) encryption header is prepended to encrypted file datamust include bytes from file's CRC
 * 2) using data descriptor along with ZipCrypto encryption seems unsupported (this may be
 * the consequence of 1st reason but I don't know that for sure)
 */
ZipCryptoStream.prototype._smartStream = function (ae, callback) {
    let deflate = ae.getMethod() === constants.METHOD_DEFLATED;
    let compressionStream = deflate ? new DeflateCRC32Stream(this.options.zlib) : new CRC32Stream();
    let error = null;
    let bufferedData = [];

    compressionStream.once('error', function (err) {
        error = err;
    });

    compressionStream.on('data', (data) => {
        bufferedData.push(data);
    });

    compressionStream.once('end', () => {
        let crc = compressionStream.digest();

        // gather complete information for CRC and sizes
        ae.setCrc(crc.readUInt32BE(0));
        ae.setSize(compressionStream.size());
        ae.setCompressedSize(compressionStream.size() + 12);

        // write local header now
        this._writeLocalFileHeader(ae);

        // write all buffered data to encrypt stream
        let encrypt = new CryptoStream({key: this.key, crc});
        let writes = [];
        for (let chunk of bufferedData) {
            writes.push(() => writeBufferToStream(encrypt, chunk));
        }
        promiseSerial(writes).then(() => encrypt.end());

        encrypt.once('end', () => {
            this._afterAppend(ae);
            callback(error, ae);
        });
        encrypt.once('error', function (err) {
            error = err;
        });

        encrypt.pipe(this, {end: false});
    });

    return compressionStream;
};

ZipCryptoStream.prototype._appendStream = function(ae, source, callback) {
    ae.setVersionNeededToExtract(constants.MIN_VERSION_DATA_DESCRIPTOR);

    ae.getGeneralPurposeBit().useDataDescriptor(false);
    // we will write local file header after we get CRC back
    // it seems as if using data descriptor is not supported when encrypting data with ZipCrypto
    // so we have to write CRC into local file header
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

/**
 * Execute promises sequentially. Input is an array of functions that return promises to execute.
 */
const promiseSerial = funcs =>
    funcs.reduce((promise, func) =>
            promise.then(result =>
                func().then(Array.prototype.concat.bind(result))),
        Promise.resolve([]));

module.exports = ZipCryptoStream;