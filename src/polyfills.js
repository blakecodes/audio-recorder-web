(function(global) {
  'use strict';

  if (!Array.prototype.forEach) {
    Array.prototype.forEach = function(callback, thisArg) {
      var T, k;
      if (this == null) {
        throw new TypeError('this is null or not defined');
      }
      var O = Object(this);
      var len = O.length >>> 0;
      if (typeof callback !== 'function') {
        throw new TypeError(callback + ' is not a function');
      }
      if (arguments.length > 1) {
        T = thisArg;
      }
      k = 0;
      while (k < len) {
        var kValue;
        if (k in O) {
          kValue = O[k];
          callback.call(T, kValue, k, O);
        }
        k++;
      }
    };
  }

  if (!Array.isArray) {
    Array.isArray = function(arg) {
      return Object.prototype.toString.call(arg) === '[object Array]';
    };
  }

  if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function(searchElement, fromIndex) {
      var k;
      if (this == null) {
        throw new TypeError('"this" is null or not defined');
      }
      var o = Object(this);
      var len = o.length >>> 0;
      if (len === 0) {
        return -1;
      }
      var n = fromIndex | 0;
      if (n >= len) {
        return -1;
      }
      k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);
      while (k < len) {
        if (k in o && o[k] === searchElement) {
          return k;
        }
        k++;
      }
      return -1;
    };
  }

  if (!Function.prototype.bind) {
    Function.prototype.bind = function(oThis) {
      if (typeof this !== 'function') {
        throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
      }
      var aArgs = Array.prototype.slice.call(arguments, 1),
          fToBind = this,
          fNOP = function() {},
          fBound = function() {
            return fToBind.apply(
              this instanceof fNOP ? this : oThis,
              aArgs.concat(Array.prototype.slice.call(arguments))
            );
          };
      if (this.prototype) {
        fNOP.prototype = this.prototype;
      }
      fBound.prototype = new fNOP();
      return fBound;
    };
  }

  if (!Object.keys) {
    Object.keys = (function() {
      var hasOwnProperty = Object.prototype.hasOwnProperty,
          hasDontEnumBug = !({ toString: null }).propertyIsEnumerable('toString'),
          dontEnums = [
            'toString',
            'toLocaleString',
            'valueOf',
            'hasOwnProperty',
            'isPrototypeOf',
            'propertyIsEnumerable',
            'constructor'
          ],
          dontEnumsLength = dontEnums.length;

      return function(obj) {
        if (typeof obj !== 'function' && (typeof obj !== 'object' || obj === null)) {
          throw new TypeError('Object.keys called on non-object');
        }
        var result = [], prop, i;
        for (prop in obj) {
          if (hasOwnProperty.call(obj, prop)) {
            result.push(prop);
          }
        }
        if (hasDontEnumBug) {
          for (i = 0; i < dontEnumsLength; i++) {
            if (hasOwnProperty.call(obj, dontEnums[i])) {
              result.push(dontEnums[i]);
            }
          }
        }
        return result;
      };
    }());
  }

  if (typeof Object.assign !== 'function') {
    Object.assign = function(target) {
      if (target == null) {
        throw new TypeError('Cannot convert undefined or null to object');
      }
      var to = Object(target);
      for (var index = 1; index < arguments.length; index++) {
        var nextSource = arguments[index];
        if (nextSource != null) {
          for (var nextKey in nextSource) {
            if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
              to[nextKey] = nextSource[nextKey];
            }
          }
        }
      }
      return to;
    };
  }

  if (!String.prototype.trim) {
    String.prototype.trim = function() {
      return this.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
    };
  }

  if (typeof JSON === 'undefined' || !JSON.parse) {
    global.JSON = {
      parse: function(text) {
        return eval('(' + text + ')');
      },
      stringify: (function() {
        var toString = Object.prototype.toString;
        var isArray = Array.isArray || function(a) {
          return toString.call(a) === '[object Array]';
        };
        var escMap = {'"': '\\"', '\\': '\\\\', '\b': '\\b', '\f': '\\f', '\n': '\\n', '\r': '\\r', '\t': '\\t'};
        var escFunc = function(m) {
          return escMap[m] || '\\u' + (m.charCodeAt(0) + 0x10000).toString(16).substr(1);
        };
        var escRE = /[\\"\u0000-\u001F\u2028\u2029]/g;
        return function stringify(value) {
          if (value == null) {
            return 'null';
          } else if (typeof value === 'number') {
            return isFinite(value) ? value.toString() : 'null';
          } else if (typeof value === 'boolean') {
            return value.toString();
          } else if (typeof value === 'object') {
            if (typeof value.toJSON === 'function') {
              return stringify(value.toJSON());
            } else if (isArray(value)) {
              var res = '[';
              for (var i = 0; i < value.length; i++) {
                res += (i ? ', ' : '') + stringify(value[i]);
              }
              return res + ']';
            } else if (toString.call(value) === '[object Object]') {
              var tmp = [];
              for (var k in value) {
                if (value.hasOwnProperty(k)) {
                  tmp.push(stringify(k) + ': ' + stringify(value[k]));
                }
              }
              return '{' + tmp.join(', ') + '}';
            }
          }
          return '"' + value.toString().replace(escRE, escFunc) + '"';
        };
      })()
    };
  }

  if (!Date.now) {
    Date.now = function() {
      return new Date().getTime();
    };
  }

  if (!global.console) {
    global.console = {
      log: function() {},
      warn: function() {},
      error: function() {},
      info: function() {},
      debug: function() {}
    };
  }

  (function() {
    var lastTime = 0;
    var vendors = ['webkit', 'moz', 'ms', 'o'];
    
    for (var x = 0; x < vendors.length && !global.requestAnimationFrame; ++x) {
      global.requestAnimationFrame = global[vendors[x] + 'RequestAnimationFrame'];
      global.cancelAnimationFrame = global[vendors[x] + 'CancelAnimationFrame'] ||
                                    global[vendors[x] + 'CancelRequestAnimationFrame'];
    }
    
    if (!global.requestAnimationFrame) {
      global.requestAnimationFrame = function(callback) {
        var currTime = new Date().getTime();
        var timeToCall = Math.max(0, 16 - (currTime - lastTime));
        var id = global.setTimeout(function() {
          callback(currTime + timeToCall);
        }, timeToCall);
        lastTime = currTime + timeToCall;
        return id;
      };
    }
    
    if (!global.cancelAnimationFrame) {
      global.cancelAnimationFrame = function(id) {
        clearTimeout(id);
      };
    }
  })();

  if (!global.atob) {
    global.atob = function(input) {
      var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
      var str = String(input).replace(/=+$/, '');
      var output = '';
      
      if (str.length % 4 === 1) {
        throw new Error("'atob' failed: The string to be decoded is not correctly encoded.");
      }
      
      for (var bc = 0, bs, buffer, idx = 0;
        buffer = str.charAt(idx++);
        ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer,
          bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0
      ) {
        buffer = chars.indexOf(buffer);
      }
      
      return output;
    };
  }

  if (!global.btoa) {
    global.btoa = function(input) {
      var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
      var str = String(input);
      var output = '';
      
      for (var block, charCode, idx = 0, map = chars;
        str.charAt(idx | 0) || (map = '=', idx % 1);
        output += map.charAt(63 & block >> 8 - idx % 1 * 8)
      ) {
        charCode = str.charCodeAt(idx += 3/4);
        if (charCode > 0xFF) {
          throw new Error("'btoa' failed: The string to be encoded contains characters outside of the Latin1 range.");
        }
        block = block << 8 | charCode;
      }
      
      return output;
    };
  }

  if (!global.Uint8Array) {
    global.Uint8Array = function(arg) {
      var arr;
      if (typeof arg === 'number') {
        arr = new Array(arg);
        for (var i = 0; i < arg; i++) {
          arr[i] = 0;
        }
      } else if (arg && arg.length) {
        arr = new Array(arg.length);
        for (var i = 0; i < arg.length; i++) {
          arr[i] = arg[i] & 0xFF;
        }
      } else {
        arr = [];
      }
      arr.length = arr.length || 0;
      arr.byteLength = arr.length;
      arr.BYTES_PER_ELEMENT = 1;
      arr.set = function(array, offset) {
        offset = offset || 0;
        for (var i = 0; i < array.length; i++) {
          this[offset + i] = array[i];
        }
      };
      arr.subarray = function(start, end) {
        return new global.Uint8Array(this.slice(start, end));
      };
      return arr;
    };
  }

  if (!global.Float32Array) {
    global.Float32Array = function(arg) {
      var arr;
      if (typeof arg === 'number') {
        arr = new Array(arg);
        for (var i = 0; i < arg; i++) {
          arr[i] = 0.0;
        }
      } else if (arg && arg.length) {
        arr = new Array(arg.length);
        for (var i = 0; i < arg.length; i++) {
          arr[i] = arg[i];
        }
      } else {
        arr = [];
      }
      arr.length = arr.length || 0;
      arr.byteLength = arr.length * 4;
      arr.BYTES_PER_ELEMENT = 4;
      arr.set = function(array, offset) {
        offset = offset || 0;
        for (var i = 0; i < array.length; i++) {
          this[offset + i] = array[i];
        }
      };
      arr.subarray = function(start, end) {
        return new global.Float32Array(this.slice(start, end));
      };
      return arr;
    };
  }

  if (!global.ArrayBuffer) {
    global.ArrayBuffer = function(length) {
      this.byteLength = length;
      this._bytes = new Array(length);
      for (var i = 0; i < length; i++) {
        this._bytes[i] = 0;
      }
    };
  }

  if (!global.DataView) {
    global.DataView = function(buffer, byteOffset, byteLength) {
      this.buffer = buffer;
      this.byteOffset = byteOffset || 0;
      this.byteLength = byteLength || buffer.byteLength;
    };
    
    global.DataView.prototype = {
      setUint8: function(offset, value) {
        this.buffer._bytes[this.byteOffset + offset] = value & 0xFF;
      },
      setUint16: function(offset, value, littleEndian) {
        if (littleEndian) {
          this.buffer._bytes[this.byteOffset + offset] = value & 0xFF;
          this.buffer._bytes[this.byteOffset + offset + 1] = (value >> 8) & 0xFF;
        } else {
          this.buffer._bytes[this.byteOffset + offset] = (value >> 8) & 0xFF;
          this.buffer._bytes[this.byteOffset + offset + 1] = value & 0xFF;
        }
      },
      setUint32: function(offset, value, littleEndian) {
        if (littleEndian) {
          this.buffer._bytes[this.byteOffset + offset] = value & 0xFF;
          this.buffer._bytes[this.byteOffset + offset + 1] = (value >> 8) & 0xFF;
          this.buffer._bytes[this.byteOffset + offset + 2] = (value >> 16) & 0xFF;
          this.buffer._bytes[this.byteOffset + offset + 3] = (value >> 24) & 0xFF;
        } else {
          this.buffer._bytes[this.byteOffset + offset] = (value >> 24) & 0xFF;
          this.buffer._bytes[this.byteOffset + offset + 1] = (value >> 16) & 0xFF;
          this.buffer._bytes[this.byteOffset + offset + 2] = (value >> 8) & 0xFF;
          this.buffer._bytes[this.byteOffset + offset + 3] = value & 0xFF;
        }
      },
      setInt16: function(offset, value, littleEndian) {
        this.setUint16(offset, value < 0 ? value + 0x10000 : value, littleEndian);
      }
    };
  }

  if (!global.Blob) {
    global.Blob = function(parts, options) {
      options = options || {};
      this.type = options.type || '';
      this.size = 0;
      this._data = [];
      
      if (parts) {
        for (var i = 0; i < parts.length; i++) {
          var part = parts[i];
          if (part instanceof global.ArrayBuffer) {
            this._data = this._data.concat(part._bytes);
            this.size += part.byteLength;
          } else if (part instanceof global.Blob) {
            this._data = this._data.concat(part._data);
            this.size += part.size;
          } else if (typeof part === 'string') {
            for (var j = 0; j < part.length; j++) {
              this._data.push(part.charCodeAt(j));
            }
            this.size += part.length;
          }
        }
      }
    };
  }

  if (!global.URL) {
    global.URL = {};
  }
  
  if (!global.URL.createObjectURL) {
    global.URL.createObjectURL = function(blob) {
      var dataUrl = 'data:' + (blob.type || 'application/octet-stream') + ';base64,';
      var base64 = '';
      var bytes = blob._data || [];
      
      for (var i = 0; i < bytes.length; i += 3) {
        var b1 = bytes[i];
        var b2 = bytes[i + 1];
        var b3 = bytes[i + 2];
        
        var enc1 = b1 >> 2;
        var enc2 = ((b1 & 3) << 4) | (b2 >> 4);
        var enc3 = ((b2 & 15) << 2) | (b3 >> 6);
        var enc4 = b3 & 63;
        
        if (isNaN(b2)) {
          enc3 = enc4 = 64;
        } else if (isNaN(b3)) {
          enc4 = 64;
        }
        
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        base64 += chars.charAt(enc1) + chars.charAt(enc2) + chars.charAt(enc3) + chars.charAt(enc4);
      }
      
      return dataUrl + base64;
    };
  }
  
  if (!global.URL.revokeObjectURL) {
    global.URL.revokeObjectURL = function() {};
  }

  if (!document.querySelector) {
    document.querySelector = function(selector) {
      if (selector.charAt(0) === '#') {
        return document.getElementById(selector.substr(1));
      }
      if (selector.charAt(0) === '.') {
        var elements = document.getElementsByTagName('*');
        var className = selector.substr(1);
        for (var i = 0; i < elements.length; i++) {
          if ((' ' + elements[i].className + ' ').indexOf(' ' + className + ' ') > -1) {
            return elements[i];
          }
        }
      }
      var elements = document.getElementsByTagName(selector);
      return elements.length > 0 ? elements[0] : null;
    };
  }

  if (!document.querySelectorAll) {
    document.querySelectorAll = function(selector) {
      if (selector.charAt(0) === '.') {
        var elements = document.getElementsByTagName('*');
        var className = selector.substr(1);
        var result = [];
        for (var i = 0; i < elements.length; i++) {
          if ((' ' + elements[i].className + ' ').indexOf(' ' + className + ' ') > -1) {
            result.push(elements[i]);
          }
        }
        return result;
      }
      return document.getElementsByTagName(selector);
    };
  }

  if (!Element.prototype.addEventListener) {
    Element.prototype.addEventListener = function(type, listener) {
      this.attachEvent('on' + type, listener);
    };
    Element.prototype.removeEventListener = function(type, listener) {
      this.detachEvent('on' + type, listener);
    };
    global.addEventListener = function(type, listener) {
      global.attachEvent('on' + type, listener);
    };
    global.removeEventListener = function(type, listener) {
      global.detachEvent('on' + type, listener);
    };
  }

  if (!Element.prototype.classList) {
    Object.defineProperty(Element.prototype, 'classList', {
      get: function() {
        var self = this;
        
        function update(fn) {
          return function(token) {
            var classes = self.className.split(/\s+/).filter(function(c) { return c.length > 0; });
            fn(classes, token);
            self.className = classes.join(' ');
          };
        }
        
        return {
          add: update(function(classes, token) {
            if (classes.indexOf(token) === -1) {
              classes.push(token);
            }
          }),
          remove: update(function(classes, token) {
            var idx = classes.indexOf(token);
            if (idx !== -1) {
              classes.splice(idx, 1);
            }
          }),
          toggle: update(function(classes, token) {
            var idx = classes.indexOf(token);
            if (idx === -1) {
              classes.push(token);
            } else {
              classes.splice(idx, 1);
            }
          }),
          contains: function(token) {
            return self.className.split(/\s+/).indexOf(token) !== -1;
          }
        };
      }
    });
  }

  if (!('textContent' in document.createElement('div'))) {
    Object.defineProperty(Element.prototype, 'textContent', {
      get: function() {
        return this.innerText;
      },
      set: function(value) {
        this.innerText = value;
      }
    });
  }

})(typeof window !== 'undefined' ? window : this);
