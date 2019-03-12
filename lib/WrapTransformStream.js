'use strict';

const inherits = require('util').inherits;
const {Transform} = require('stream');

function WrapTransformStream(stream) {
    if (!(this instanceof WrapTransformStream)) {
        return new WrapTransformStream();
    }
    Transform.call(this);

    this.stream = stream;

    this.stream.on('data', (data) => {
        this.push(data);
    });
}
inherits(WrapTransformStream, Transform);

WrapTransformStream.prototype._transform = function (chunk, encoding, callback) {
    this.stream.write(chunk, encoding, callback);
};

module.exports = WrapTransformStream;