'use strict';

// const crc32 = require('crc').crc32;

const _uint8 = n => n & 0xFF;
const _uint16 = n => n << 16 >>> 16;
const _uint32 = n => n & 0xFFFFFFFF;

let CRC_TABLE = [];
for (let i = 0; i < 256; i++) {
    let r = i;
    for (let j = 0; j < 8; j++) {
        if ((r & 1) === 1) {
            r = (r >>> 1) ^ 0xedb88320;
        } else {
            r >>>= 1;
        }
    }
    CRC_TABLE[i] = r;
}

/*
0
-522852066
450548861
-99664541
755167117
 */

console.log(CRC_TABLE[0])
console.log(CRC_TABLE[10])
console.log(CRC_TABLE[20])
console.log(CRC_TABLE[30])
console.log(CRC_TABLE[255])

function crc32(oldCrc, charAt) {
    return oldCrc >>> 8 ^ CRC_TABLE[(oldCrc ^ charAt) & 0xff];
}

function CryptoCipher(key) {
    this.key = key;
    if (!Buffer.isBuffer(key)) {
        this.key = Buffer.from(this.key);
    }

    this._init();
}

/**
 * Incredibly slow multiplication
 */
function mult(a, b) {
    // let result = 0;
    // let inv = false;
    // if (b < 0) {
    //     b = -b;
    //     inv = true;
    // }
    // while (b > 0) {
    //     result = _uint32(result + a);
    //     b--;
    // }
    // if (inv) {
    //     result = -result;
    // }
    // return result;
    // return Number(BigInt(a) * BigInt(b));
    return Math.imul(a, b);
}

function mult2(a, b) {
    let result = 0;
    // while ()
}

CryptoCipher.prototype._init = function () {
    this.key0 = 0x12345678;
    this.key1 = 0x23456789;
    this.key2 = 0x34567890;

    for (let b of this.key) {
        this._updateKeys(b);
    }
    // [-524382883, 1891316032, 2123907071]
    console.log(`Updated keys: ${this.key0}, ${this.key1}, ${this.key2}`);
};

/*
key1':591751147
key1:289944472
key1':289944529
key1:-1213675754
key1':-1213675661
key1:1891316032
[-524382883, 1891316032, 2123907071]
 */

CryptoCipher.prototype._updateKeys = function (b) {
    this.key0 = crc32(this.key0, b);
    this.key1 = _uint32(this.key1 + (this.key0 & 0xFF));
    // console.log("key1':" + this.key1);
    this.key1 = _uint32(mult(this.key1, 134775813) + 1);
    // console.log('key1:' + this.key1);
    this.key2 = crc32(this.key2, this.key1 >>> 24);
};

CryptoCipher.prototype._streamByte = function () {
    let tmp = this.key2 | 2;
    return _uint8(mult(tmp, (tmp ^ 1)) >>> 8);
};

CryptoCipher.prototype._encryptByte = function (b) {
    console.log("Incoming byte:" + b);
    let encryptedByte = this._streamByte() ^ b;
    console.log("New byte:" + encryptedByte);
    this._updateKeys(b);
    console.log(`Keys:${this.key0},${this.key1},${this.key2},`)
    return encryptedByte;
};

/*
header: 4139338279719ec5d162f96d
 */
CryptoCipher.prototype.encrypt = function (data) {
    console.log(`Encrypting ${data.toString('hex')}`);
    let encryptedData = Buffer.alloc(Buffer.byteLength(data)), offset = 0;
    for (let b of data) {
        encryptedData.writeUInt8(this._encryptByte(b), offset++);
    }
    return encryptedData;
};

CryptoCipher.prototype._numberToBuffer = function (n) {
    let b = Buffer.alloc(4);
    b.writeUInt32LE(n);
    return b;
};

/*

Incoming byte:1
New byte: 65
Keys:1648206674,-708362277,-607825431,
Incoming byte:2
New byte: 57
Keys:1795779671,2072905979,517617465,
Incoming byte:3
New byte: 51
Keys:1819122817,-762699923,935780807,
Incoming byte:4
New byte: 130
Keys:-1648485837,1375804961,-2142068438,
Incoming byte:5
New byte: 121
Keys:-819516541,1123166517,1139391435,
Incoming byte:6
New byte: 113
Keys:-1659023228,1107702942,-1809329601,
Incoming byte:7
New byte: 158
Keys:1949093834,1760078601,-174333051,
Incoming byte:8
New byte: 197
Keys:1964937043,1069992141,725729649,
Incoming byte:9
New byte: 209
Keys:-1949587867,-1741703685,-637723875,
Incoming byte:16
New byte: 98
Keys:551833109,-1018245551,1639056072,
Incoming byte:51
New byte: 249
Keys:-768777805,191372053,34349320,
Incoming byte:-40
New byte: 109
Keys:-625830479,-175463713,-1022459264,


 */

module.exports = CryptoCipher;