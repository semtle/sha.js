var u = require('./util')
var hexpp = require('./hexpp').defaults({bigendian: false})
var toBuffer = require('bops/typedarray/from')
module.exports = Hash

//prototype class for hash functions
function Hash (blockSize, finalSize) {
  this._block = new Uint32Array(blockSize/4)
  this._dv = new DataView(this._block.buffer)
  this._finalSize = finalSize
  this._len = 0
  this._l = 0
}

function lengthOf(data, enc) {
  if(enc == null)     return data.byteLength || data.length
  if(enc == 'ascii')  return data.length
  if(enc == 'hex')    return data.length/2
  if(enc == 'base64') return data.length/3
}

Hash.prototype.update = function (data, enc) {
  //for encoding/decoding utf8, see here:
  //https://github.com/chrisdickinson/bops/blob/master/typedarray/from.js#L36-L57
  //https://github.com/chrisdickinson/to-utf8
  var bl = this._block.byteLength
  //for now, assume ascii.

  //I'd rather do this with a streaming encoder, like the opposite of
  //http://nodejs.org/api/string_decoder.html
  if('string' === typeof data && !enc)
    enc = 'utf8'

  if(enc === 'utf-8')
    enc = 'utf8'

  if(enc === 'base64' || enc === 'utf8')
    data = toBuffer(data, enc), enc = null
 
  var length = lengthOf(data, enc)
  var l = this._len += length
  var s = this._s = (this._s || 0)
  var f = 0
  while(s < l) {
    var t = Math.min(length, f + bl)
    u.write(this._block.buffer, data, enc, s%bl, f, t)
    var ch = (t - f); s += ch; f += ch

    if(!(s%bl)) {
      this._update(this._block.buffer)
      u.zeroFill(this._block.buffer, 0)
    }

  }
  this._s = s

  return this

}

Hash.prototype.digest = function (enc) {
  //how much message is leftover
  var bl = this._block.byteLength
  var fl = this._finalSize
  var len = this._len*8

  var x = this._block.buffer
  var X = this._dv

  var bits = len % (bl*8)

  //add end marker, so that appending 0's creats a different hash.
  //console.log('--- final ---', bits, fl, this._len % bl, fl + 4, fl*8, bits >= fl*8)
  //console.log(hexpp(x))
  x[this._len % bl] = 0x80
  
  if(bits >= fl*8) {
    this._update(this._block.buffer)
    u.zeroFill(this._block, 0)
  }

  //TODO: handle case where the bit length is > Math.pow(2, 29)
  X.setUint32(fl + 4, len, false) //big endian

  var hash = this._update(this._block.buffer) || this._hash()
  return u.toString(new Uint8Array(hash.buffer || hash), enc)
}

Hash.prototype._update = function () {
  throw new Error('_update must be implemented by subclass')
}

