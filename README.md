# archiver-zip-encrypted

> AES-256 and legacy Zip 2.0 encryption for Zip files.

[![Build Status](https://travis-ci.org/artem-karpenko/archiver-zip-encrypted.svg?branch=master)](https://travis-ci.org/artem-karpenko/archiver-zip-encrypted)
[![Coverage Status](https://coveralls.io/repos/github/artem-karpenko/archiver-zip-encrypted/badge.svg)](https://coveralls.io/github/artem-karpenko/archiver-zip-encrypted)

Plugin for [archiver](https://www.npmjs.com/package/archiver) that adds encryption 
capabilities to Zip compression. Pure JS, no external zip software needed.

## Install

```shell
npm install archiver-zip-encrypted --save
```

## Usage

```js
const archiver = require('archiver');

// register format for archiver
// note: only do it once per Node.js process/application, as duplicate registration will throw an error
archiver.registerFormat('zip-encrypted', require("archiver-zip-encrypted"));

// create archive and specify method of encryption and password
let archive = archiver.create('zip-encrypted', {zlib: {level: 8}, encryptionMethod: 'aes256', password: '123'});
archive.append('File contents', {name: 'file.name'})
// ... add contents to archive as usual using archiver
```
## Encryption methods

Plugin supports 2 encryption methods:

* 'aes256' - this is implementation of AES-256 encryption introduced by WinZip in 2003.
   It is the most safe option in regards of encryption, but limits possibilities of opening resulting archives.
   It's known to be supported by recent versions 7-Zip and WinZip. It is NOT supported by
   Linux unzip 6.00 (by Info-Zip). It is also NOT supported by Windows explorer (it's possible to browse contents of archive
   but not possible to view or extract files, i.e. perform operations that require decryption), even in Windows 10. 
* 'zip20' - this is implementation of legacy Zip 2.0 encryption (also called "ZipCrypto" in 7-Zip application).
   This is the first encryption method added to Zip format and hence is widely supported, in particular 
   by standard tools in Linux and Windows. However its security is proven to be breakable
   so I would not recommend using it unless you absolutely have to make it work w/o external software.
      
For more information on these encryption methods and its drawbacks in particular see [WinZip documentation](http://kb.winzip.com/help/RU/WZ/help_encryption.htm).
It's worth noting that neither of these encryption methods encrypt file names and their metainformation, 
such as original size, filesystem dates, permissions etc.