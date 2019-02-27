'use strict';

const ZipStream = require('zip-stream');
const ZipArchiveOutputStream = require('compress-commons').ZipArchiveOutputStream;
const inherits = require('util').inherits;

const ZipAesStream = function (options = {zlib: {}}) {
    if (!(this instanceof ZipAesStream)) {
        return new ZipAesStream(options);
    }

    ZipStream.call(this, options);
};

inherits(ZipAesStream, ZipStream);

module.exports = ZipAesStream;