module.exports = {
    ZipEncryptedFormat: require('./lib/zip-encrypted'),
    ZipEncryptedAesStream: require('./lib/aes/zip-aes-stream'),
    ZipEncryptedLegacyStream: require('./lib/zip20/zip-crypto-stream'),
    ZipEncryptedStream: require('./lib/zip-encrypted-stream'),
};