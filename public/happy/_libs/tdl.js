define(function(){
/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview Base for all tdl sample utilties.
 *
 * The main point of this module is to provide a central place to
 * have an init function to register an tdl namespace object because many other
 * modules need access to it.
 */

/**
 * A namespace for all the tdl utility libraries.
 * @namespace
 */
var tdl = tdl || {};

/**
 * Define this because the Google internal JSCompiler needs goog.typedef below.
 */
var goog = goog || {};


if (!window.Int32Array) {
  window.Int32Array = function() { };
  window.Float32Array = function() { };
  window.Uint16Array = function() { };
}

/**
 * A macro for defining composite types.
 *
 * By assigning goog.typedef to a name, this tells Google internal JSCompiler
 * that this is not the name of a class, but rather it's the name of a composite
 * type.
 *
 * For example,
 * /** @type {Array|NodeList} / goog.ArrayLike = goog.typedef;
 * will tell JSCompiler to replace all appearances of goog.ArrayLike in type
 * definitions with the union of Array and NodeList.
 *
 * Does nothing in uncompiled code.
 */
goog.typedef = true;

/**
 * Reference to the global context.  In most cases this will be 'window'.
 */
tdl.global = this;

/**
 * Some javascripts don't support __defineGetter__ or __defineSetter__
 * so we define some here so at least we don't get compile errors.
 * We expect the initialzation code will check and complain. This stubs
 * are just here to make sure we can actually get to the initialization code.
 */
//if (!Object.prototype.__defineSetter__) {
//  Object.prototype.__defineSetter__ = function() {}
//  Object.prototype.__defineGetter__ = function() {}
//}
//
/**
 * Flag used to force a function to run in the browser when it is called
 * from V8.
 * @type {boolean}
 */
tdl.BROWSER_ONLY = true;

/**
 * Array of namespaces that have been provided.
 * @private
 * @type {!Array.<string>}
 */
tdl.provided_ = [];

/**
 * Creates object stubs for a namespace. When present in a file,
 * tdl.provide also indicates that the file defines the indicated
 * object.
 * @param {string} name name of the object that this file defines.
 */
tdl.provide = function(name) {
  // Ensure that the same namespace isn't provided twice.
  if (tdl.getObjectByName(name) &&
      !tdl.implicitNamespaces_[name]) {
    throw 'Namespace "' + name + '" already declared.';
  }

  var namespace = name;
  while ((namespace = namespace.substring(0, namespace.lastIndexOf('.')))) {
    tdl.implicitNamespaces_[namespace] = true;
  }

  tdl.exportPath_(name);
  tdl.provided_.push(name);
};


/**
 * Namespaces implicitly defined by tdl.provide. For example,
 * tdl.provide('tdl.events.Event') implicitly declares
 * that 'tdl' and 'tdl.events' must be namespaces.
 *
 * @type {Object}
 * @private
 */
tdl.implicitNamespaces_ = {};

/**
 * Builds an object structure for the provided namespace path,
 * ensuring that names that already exist are not overwritten. For
 * example:
 * "a.b.c" -> a = {};a.b={};a.b.c={};
 * Used by tdl.provide and tdl.exportSymbol.
 * @param {string} name name of the object that this file defines.
 * @param {Object} opt_object the object to expose at the end of the path.
 * @param {Object} opt_objectToExportTo The object to add the path to; default
 *     is |tdl.global|.
 * @private
 */
tdl.exportPath_ = function(name, opt_object, opt_objectToExportTo) {
  var parts = name.split('.');
  var cur = opt_objectToExportTo || tdl.global;
  var part;

  // Internet Explorer exhibits strange behavior when throwing errors from
  // methods externed in this manner.  See the testExportSymbolExceptions in
  // base_test.html for an example.
  if (!(parts[0] in cur) && cur.execScript) {
    cur.execScript('var ' + parts[0]);
  }

  // Parentheses added to eliminate strict JS warning in Firefox.
  while (parts.length && (part = parts.shift())) {
    if (!parts.length && tdl.isDef(opt_object)) {
      // last part and we have an object; use it.
      cur[part] = opt_object;
    } else if (cur[part]) {
      cur = cur[part];
    } else {
      cur = cur[part] = {};
    }
  }
};


/**
 * Returns an object based on its fully qualified external name.  If you are
 * using a compilation pass that renames property names beware that using this
 * function will not find renamed properties.
 *
 * @param {string} name The fully qualified name.
 * @param {Object} opt_obj The object within which to look; default is
 *     |tdl.global|.
 * @return {Object} The object or, if not found, null.
 */
tdl.getObjectByName = function(name, opt_obj) {
  var parts = name.split('.');
  var cur = opt_obj || tdl.global;
  for (var pp = 0; pp < parts.length; ++pp) {
    var part = parts[pp];
    if (cur[part]) {
      cur = cur[part];
    } else {
      return null;
    }
  }
  return cur;
};


/**
 * Implements a system for the dynamic resolution of dependencies.
 * @param {string} rule Rule to include, in the form tdl.package.part.
 */
tdl.require = function(rule) {
  // TODO(gman): For some unknown reason, when we call
  // tdl.util.getScriptTagText_ it calls
  // document.getElementsByTagName('script') and for some reason the scripts do
  // not always show up. Calling it here seems to fix that as long as we
  // actually ask for the length, at least in FF 3.5.1 It would be nice to
  // figure out why.
  var dummy = document.getElementsByTagName('script').length;
  // if the object already exists we do not need do do anything
  if (tdl.getObjectByName(rule)) {
    return;
  }
  var path = tdl.getPathFromRule_(rule);
  if (path) {
    tdl.included_[path] = true;
    tdl.writeScripts_();
  } else {
    throw new Error('tdl.require could not find: ' + rule);
  }
};


/**
 * Path for included scripts.
 * @type {string}
 */
tdl.basePath = '';


/**
 * Object used to keep track of urls that have already been added. This
 * record allows the prevention of circular dependencies.
 * @type {Object}
 * @private
 */
tdl.included_ = {};


/**
 * This object is used to keep track of dependencies and other data that is
 * used for loading scripts.
 * @private
 * @type {Object}
 */
tdl.dependencies_ = {
  visited: {},  // used when resolving dependencies to prevent us from
                // visiting the file twice.
  written: {}  // used to keep track of script files we have written.
};


/**
 * Tries to detect the base path of the tdl-base.js script that
 * bootstraps the tdl libraries.
 * @private
 */
tdl.findBasePath_ = function() {
  var doc = tdl.global.document;
  if (typeof doc == 'undefined') {
    return;
  }
  if (tdl.global.BASE_PATH) {
    tdl.basePath = tdl.global.BASE_PATH;
    return;
  } else {
    // HACKHACK to hide compiler warnings :(
    tdl.global.BASE_PATH = null;
  }
  var expectedBase = 'tdl/base.js';
  var scripts = doc.getElementsByTagName('script');
  for (var script, i = 0; script = scripts[i]; i++) {
    var src = script.src;
    var l = src.length;
    if (src.substr(l - expectedBase.length) == expectedBase) {
      tdl.basePath = src.substr(0, l - expectedBase.length);
      return;
    }
  }
};


/**
 * Writes a script tag if, and only if, that script hasn't already been added
 * to the document.  (Must be called at execution time.)
 * @param {string} src Script source.
 * @private
 */
tdl.writeScriptTag_ = function(src) {
  var doc = tdl.global.document;
  if (typeof doc != 'undefined' &&
      !tdl.dependencies_.written[src]) {
    tdl.dependencies_.written[src] = true;
    var html = '<script type="text/javascript" src="' +
               src + '"></' + 'script>'
    doc.write(html);
  }
};


/**
 * Resolves dependencies based on the dependencies added using addDependency
 * and calls writeScriptTag_ in the correct order.
 * @private
 */
tdl.writeScripts_ = function() {
  // the scripts we need to write this time.
  var scripts = [];
  var seenScript = {};
  var deps = tdl.dependencies_;

  function visitNode(path) {
    if (path in deps.written) {
      return;
    }

    // we have already visited this one. We can get here if we have cyclic
    // dependencies.
    if (path in deps.visited) {
      if (!(path in seenScript)) {
        seenScript[path] = true;
        scripts.push(path);
      }
      return;
    }

    deps.visited[path] = true;

    if (!(path in seenScript)) {
      seenScript[path] = true;
      scripts.push(path);
    }
  }

  for (var path in tdl.included_) {
    if (!deps.written[path]) {
      visitNode(path);
    }
  }

  for (var i = 0; i < scripts.length; i++) {
    if (scripts[i]) {
      tdl.writeScriptTag_(tdl.basePath + scripts[i]);
    } else {
      throw Error('Undefined script input');
    }
  }
};


/**
 * Looks at the dependency rules and tries to determine the script file that
 * fulfills a particular rule.
 * @param {string} rule In the form tdl.namespace.Class or
 *     project.script.
 * @return {string?} Url corresponding to the rule, or null.
 * @private
 */
tdl.getPathFromRule_ = function(rule) {
  var parts = rule.split('.');
  return parts.join('/') + '.js';
};

tdl.findBasePath_();

/**
 * Returns true if the specified value is not |undefined|.
 * WARNING: Do not use this to test if an object has a property. Use the in
 * operator instead.
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is defined.
 */
tdl.isDef = function(val) {
  return typeof val != 'undefined';
};


/**
 * Exposes an unobfuscated global namespace path for the given object.
 * Note that fields of the exported object *will* be obfuscated,
 * unless they are exported in turn via this function or
 * tdl.exportProperty.
 *
 * <p>Also handy for making public items that are defined in anonymous
 * closures.
 *
 * ex. tdl.exportSymbol('Foo', Foo);
 *
 * ex. tdl.exportSymbol('public.path.Foo.staticFunction',
 *                        Foo.staticFunction);
 *     public.path.Foo.staticFunction();
 *
 * ex. tdl.exportSymbol('public.path.Foo.prototype.myMethod',
 *                        Foo.prototype.myMethod);
 *     new public.path.Foo().myMethod();
 *
 * @param {string} publicPath Unobfuscated name to export.
 * @param {Object} object Object the name should point to.
 * @param {Object} opt_objectToExportTo The object to add the path to; default
 *     is |tdl.global|.
 */
tdl.exportSymbol = function(publicPath, object, opt_objectToExportTo) {
  tdl.exportPath_(publicPath, object, opt_objectToExportTo);
};

//tdl.provide('tdl.base');

/**
 * The base module for tdl.
 * @namespace
 */
tdl.base = tdl.base || {};

/**
 * Determine whether a value is an array. Do not use instanceof because that
 * will not work for V8 arrays (the browser thinks they are Objects).
 * @param {*} value A value.
 * @return {boolean} Whether the value is an array.
 */
tdl.base.isArray = function(value) {
  var valueAsObject = /** @type {!Object} */ (value);
  return typeof(value) === 'object' && value !== null &&
      'length' in valueAsObject && 'splice' in valueAsObject;
};

/**
 * A stub for later optionally converting obfuscated names
 * @private
 * @param {string} name Name to un-obfuscate.
 * @return {string} un-obfuscated name.
 */
tdl.base.maybeDeobfuscateFunctionName_ = function(name) {
  return name;
};

/**
 * Makes one class inherit from another.
 * @param {!Object} subClass Class that wants to inherit.
 * @param {!Object} superClass Class to inherit from.
 */
tdl.base.inherit = function(subClass, superClass) {
  /**
   * TmpClass.
   * @ignore
   * @constructor
   */
  var TmpClass = function() { };
  TmpClass.prototype = superClass.prototype;
  subClass.prototype = new TmpClass();
};

/**
 * Parses an error stack from an exception
 * @param {!Exception} excp The exception to get a stack trace from.
 * @return {!Array.<string>} An array of strings of the stack trace.
 */
tdl.base.parseErrorStack = function(excp) {
  var stack = [];
  var name;
  var line;

  if (!excp || !excp.stack) {
    return stack;
  }

  var stacklist = excp.stack.split('\n');

  for (var i = 0; i < stacklist.length - 1; i++) {
    var framedata = stacklist[i];

    name = framedata.match(/^([a-zA-Z0-9_$]*)/)[1];
    if (name) {
      name = tdl.base.maybeDeobfuscateFunctionName_(name);
    } else {
      name = 'anonymous';
    }

    var result = framedata.match(/(.*:[0-9]+)$/);
    line = result && result[1];

    if (!line) {
      line = '(unknown)';
    }

    stack[stack.length] = name + ' : ' + line
  }

  // remove top level anonymous functions to match IE
  var omitRegexp = /^anonymous :/;
  while (stack.length && omitRegexp.exec(stack[stack.length - 1])) {
    stack.length = stack.length - 1;
  }

  return stack;
};

/**
 * Gets a function name from a function object.
 * @param {!function(...): *} aFunction The function object to try to get a
 *      name from.
 * @return {string} function name or 'anonymous' if not found.
 */
tdl.base.getFunctionName = function(aFunction) {
  var regexpResult = aFunction.toString().match(/function(\s*)(\w*)/);
  if (regexpResult && regexpResult.length >= 2 && regexpResult[2]) {
    return tdl.base.maybeDeobfuscateFunctionName_(regexpResult[2]);
  }
  return 'anonymous';
};

/**
 * Pretty prints an exception's stack, if it has one.
 * @param {Array.<string>} stack An array of errors.
 * @return {string} The pretty stack.
 */
tdl.base.formatErrorStack = function(stack) {
  var result = '';
  for (var i = 0; i < stack.length; i++) {
    result += '> ' + stack[i] + '\n';
  }
  return result;
};

/**
 * Gets a stack trace as a string.
 * @param {number} stripCount The number of entries to strip from the top of the
 *     stack. Example: Pass in 1 to remove yourself from the stack trace.
 * @return {string} The stack trace.
 */
tdl.base.getStackTrace = function(stripCount) {
  var result = '';

  if (typeof(arguments.caller) != 'undefined') { // IE, not ECMA
    for (var a = arguments.caller; a != null; a = a.caller) {
      result += '> ' + tdl.base.getFunctionName(a.callee) + '\n';
      if (a.caller == a) {
        result += '*';
        break;
      }
    }
  } else { // Mozilla, not ECMA
    // fake an exception so we can get Mozilla's error stack
    var testExcp;
    try {
      eval('var var;');
    } catch (testExcp) {
      var stack = tdl.base.parseErrorStack(testExcp);
      result += tdl.base.formatErrorStack(stack.slice(3 + stripCount,
                                                        stack.length));
    }
  }

  return result;
};

/**
 * Returns true if the user's browser is Microsoft IE.
 * @return {boolean} true if the user's browser is Microsoft IE.
 */
tdl.base.IsMSIE = function() {
  var ua = navigator.userAgent.toLowerCase();
  var msie = /msie/.test(ua) && !/opera/.test(ua);
  return msie;
};

/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview This file contains objects to deal with WebGL
 *               buffers.
 */

//tdl.provide('tdl.buffers');

/**
 * A module for buffers.
 * @namespace
 */
tdl.buffers = tdl.buffers || {};

tdl.buffers.Buffer = function(array, opt_target) {
  var target = opt_target || gl.ARRAY_BUFFER;
  var buf = gl.createBuffer();
  this.target = target;
  this.buf = buf;
  this.set(array);
  this.numComponents_ = array.numComponents;
  this.numElements_ = array.numElements;
  this.totalComponents_ = this.numComponents_ * this.numElements_;
  if (array.buffer instanceof Float32Array) {
    this.type_ = gl.FLOAT;
    this.normalize_ = false;
  } else if (array.buffer instanceof Uint8Array) {
    this.type_ = gl.UNSIGNED_BYTE;
    this.normalize_ = true;
  } else if (array.buffer instanceof Int8Array) {
    this.type_ = gl.BYTE;
    this.normalize_ = true;
  } else if (array.buffer instanceof Uint16Array) {
    this.type_ = gl.UNSIGNED_SHORT;
    this.normalize_ = true;
  } else if (array.buffer instanceof Int16Array) {
    this.type_ = gl.SHORT;
    this.normalize_ = true;
  } else {
    throw("unhandled type:" + (typeof array.buffer));
  }
};

tdl.buffers.Buffer.prototype.set = function(array, opt_usage) {
  gl.bindBuffer(this.target, this.buf);
  gl.bufferData(this.target, array.buffer, opt_usage || gl.STATIC_DRAW);
}

tdl.buffers.Buffer.prototype.setRange = function(array, offset) {
  gl.bindBuffer(this.target, this.buf);
  gl.bufferSubData(this.target, offset, array);
}

tdl.buffers.Buffer.prototype.type = function() {
  return this.type_;
};

tdl.buffers.Buffer.prototype.numComponents = function() {
  return this.numComponents_;
};

tdl.buffers.Buffer.prototype.numElements = function() {
  return this.numElements_;
};

tdl.buffers.Buffer.prototype.totalComponents = function() {
  return this.totalComponents_;
};

tdl.buffers.Buffer.prototype.buffer = function() {
  return this.buf;
};

tdl.buffers.Buffer.prototype.stride = function() {
  return 0;
};

tdl.buffers.Buffer.prototype.normalize = function() {
  return this.normalize_;
}

tdl.buffers.Buffer.prototype.offset = function() {
  return 0;
};


/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview This file contains various functions for managing a clock
 */

//tdl.provide('tdl.clock');

//tdl.require('tdl.io');
//tdl.require('tdl.log');
tdl.clock = {};
/**
 * Creates a clock. Optionally synced to a server
 * @param {number} opt_syncRate. If passed, this is the number of seconds
 *        between syncing to the server. If not passed the local clock is used.
 *        Note: If the client is faster than the server this means it's possible
 *        the clock will report a certain time and then later a previous time.
 */
tdl.clock.createClock = function(opt_syncRate, opt_url) {
  if (opt_syncRate) {
    return new tdl.clock.SyncedClock(opt_syncRate, opt_url);
  } else {
    return new tdl.clock.LocalClock();
  }
};


/**
 * A clock that gets the local current time in seconds.
 * @private
 */
tdl.clock.LocalClock = function() {
}

/**
 * Gets the current time in seconds.
 * @private
 */
tdl.clock.LocalClock.prototype.getTime = function() {
  return (new Date()).getTime() * 0.001;
}

/**
 * A clock that gets the current time in seconds attempting to eep the clock
 * synced to the server.
 * @private
 */
tdl.clock.SyncedClock = function(opt_syncRate, opt_url) {
  this.url = opt_url || window.location.href;
  this.syncRate = opt_syncRate || 10;
  this.timeOffset = 0;
  this.syncToServer();
}

tdl.clock.SyncedClock.prototype.getLocalTime_ = function() {
  return (new Date()).getTime() * 0.001;
}

tdl.clock.SyncedClock.prototype.syncToServer = function() {
  var that = this;
  var sendTime = this.getLocalTime_();
  tdl.io.sendJSON(this.url, {cmd: 'time'}, function(obj, exception) {
    if (exception) {
      tdl.log("error: syncToServer: " + exception);
    } else {
      var receiveTime = that.getLocalTime_();
      var duration = receiveTime - sendTime;
      var serverTime = obj.time + duration * 0.5;
      that.timeOffset = serverTime - receiveTime;
      tdl.log("new timeoffset: " + that.timeOffset);
    }
    setTimeout(function() {
        that.syncToServer();
      }, that.syncRate * 1000);
  });
};

/**
 * Gets the current time in seconds.
 * @private
 */
tdl.clock.SyncedClock.prototype.getTime = function() {
  return (new Date()).getTime() * 0.001 + this.timeOffset;
}

/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview This file contains matrix/vector math functions.
 */

//tdl.provide('tdl.fast');

/**
 * A module for math for tdl.fast.
 * @namespace
 */
tdl.fast = tdl.fast || {};


if (!window.Float32Array) {
  // This just makes some errors go away when there is no WebGL.
  window.Float32Array = function() { };
}

tdl.fast.temp0v3_ = new Float32Array(3);
tdl.fast.temp1v3_ = new Float32Array(3);
tdl.fast.temp2v3_ = new Float32Array(3);

tdl.fast.temp0v4_ = new Float32Array(4);
tdl.fast.temp1v4_ = new Float32Array(4);
tdl.fast.temp2v4_ = new Float32Array(4);

tdl.fast.temp0m4_ = new Float32Array(16);
tdl.fast.temp1m4_ = new Float32Array(16);
tdl.fast.temp2m4_ = new Float32Array(16);

/**
 * Functions which deal with 4-by-4 transformation matrices are kept in their
 * own namespsace.
 * @namespace
 */
tdl.fast.matrix4 = tdl.fast.matrix4 || {};

/**
 * Functions that are specifically row major are kept in their own namespace.
 * @namespace
 */
tdl.fast.rowMajor = tdl.fast.rowMajor || {};

/**
 * Functions that are specifically column major are kept in their own namespace.
 * @namespace
 */
tdl.fast.columnMajor = tdl.fast.columnMajor || {};

/**
 * An Array of 2 floats
 * @type {!Float32Array}
 */
tdl.fast.Vector2 = goog.typedef;

/**
 * An Array of 3 floats
 * @type {!Float32Array}
 */
tdl.fast.Vector3 = goog.typedef;

/**
 * An Array of 4 floats
 * @type {!Float32Array}
 */
tdl.fast.Vector4 = goog.typedef;

/**
 * An Array of floats.
 * @type {!Float32Array}
 */
tdl.fast.Vector = goog.typedef;

/**
 * A 2x2 Matrix of floats
 * @type {!Float32Array}
 */
tdl.fast.Matrix2 = goog.typedef;

/**
 * A 3x3 Matrix of floats
 * @type {!Float32Array}
 */
tdl.fast.Matrix3 = goog.typedef;

/**
 * A 4x4 Matrix of floats
 * @type {!Float32Array}
 */
tdl.fast.Matrix4 = goog.typedef;

/**
 * A arbitrary size Matrix of floats
 * @type {!Array.<!Array.<number>>}
 */
tdl.fast.Matrix = goog.typedef;

/**
 * Adds two vectors; assumes a and b have the same dimension.
 * @param {!tdl.fast.Vector} dst vector.
 * @param {!tdl.fast.Vector} a Operand vector.
 * @param {!tdl.fast.Vector} b Operand vector.
 */
tdl.fast.addVector = function(dst, a, b) {
  var aLength = a.length;
  for (var i = 0; i < aLength; ++i)
    dst[i] = a[i] + b[i];
  return dst;
};

/**
 * Subtracts two vectors.
 * @param {!tdl.fast.Vector} dst vector.
 * @param {!tdl.fast.Vector} a Operand vector.
 * @param {!tdl.fast.Vector} b Operand vector.
 */
tdl.fast.subVector = function(dst, a, b) {
  var aLength = a.length;
  for (var i = 0; i < aLength; ++i)
    dst[i] = a[i] - b[i];
  return dst;
};

/**
 * Performs linear interpolation on two vectors.
 * Given vectors a and b and interpolation coefficient t, returns
 * (1 - t) * a + t * b.
 * @param {!tdl.fast.Vector} dst vector.
 * @param {!tdl.fast.Vector} a Operand vector.
 * @param {!tdl.fast.Vector} b Operand vector.
 * @param {number} t Interpolation coefficient.
 */
tdl.fast.lerpVector = function(dst, a, b, t) {
  var aLength = a.length;
  for (var i = 0; i < aLength; ++i)
    dst[i] = (1 - t) * a[i] + t * b[i];
  return dst;
};

/**
 * Divides a vector by a scalar.
 * @param {!tdl.fast.Vector} dst The vector.
 * @param {!tdl.fast.Vector} v The vector.
 * @param {number} k The scalar.
 * @return {!tdl.fast.Vector} dst.
 */
tdl.fast.divVectorScalar = function(dst, v, k) {
  var vLength = v.length;
  for (var i = 0; i < vLength; ++i)
    dst[i] = v[i] / k;
  return dst;
};

/**
 * Computes the cross product of two vectors; assumes both vectors have
 * three entries.
 * @param {!tdl.fast.Vector} dst vector.
 * @param {!tdl.fast.Vector} a Operand vector.
 * @param {!tdl.fast.Vector} b Operand vector.
 * @return {!tdl.fast.Vector} The vector a cross b.
 */
tdl.fast.cross = function(dst, a, b) {
  dst[0] = a[1] * b[2] - a[2] * b[1];
  dst[1] = a[2] * b[0] - a[0] * b[2];
  dst[2] = a[0] * b[1] - a[1] * b[0];
  return dst;
};

/**
 * Computes the dot product of two vectors; assumes both vectors have
 * three entries.
 * @param {!tdl.fast.Vector} a Operand vector.
 * @param {!tdl.fast.Vector} b Operand vector.
 * @return {number} dot product
 */
tdl.fast.dot = function(a, b) {
  return (a[0] * b[0]) + (a[1] * b[1]) + (a[2] * b[2]);
};

/**
 * Divides a vector by its Euclidean length and returns the quotient.
 * @param {!tdl.fast.Vector} dst vector.
 * @param {!tdl.fast.Vector} a The vector.
 * @return {!tdl.fast.Vector} The normalized vector.
 */
tdl.fast.normalize = function(dst, a) {
  var n = 0.0;
  var aLength = a.length;
  for (var i = 0; i < aLength; ++i)
    n += a[i] * a[i];
  n = Math.sqrt(n);
  if (n > 0.00001) {
    for (var i = 0; i < aLength; ++i)
      dst[i] = a[i] / n;
  } else {
    for (var i = 0; i < aLength; ++i)
      dst[i] = 0;
  }
  return dst;
};

/**
 * Negates a vector.
 * @param {!tdl.fast.Vector} dst vector.
 * @param {!tdl.fast.Vector} v The vector.
 * @return {!tdl.fast.Vector} -v.
 */
tdl.fast.negativeVector = function(dst, v) {
 var vLength = v.length;
 for (var i = 0; i < vLength; ++i) {
   dst[i] = -v[i];
 }
 return dst;
};

/**
 * Negates a matrix.
 * @param {!tdl.fast.Matrix} dst matrix.
 * @param {!tdl.fast.Matrix} v The matrix.
 * @return {!tdl.fast.Matrix} -v.
 */
tdl.fast.negativeMatrix = function(dst, v) {
  var vLength = v.length;
  for (var i = 0; i < vLength; ++i) {
    dst[i] = -v[i];
  }
  return dst;
};

/**
 * Copies a vector.
 * @param {!tdl.fast.Vector} v The vector.
 * @return {!tdl.fast.Vector} A copy of v.
 */
tdl.fast.copyVector = function(dst, v) {
  dst.set(v);
  return dst;
};

/**
 * Copies a matrix.
 * @param {!tdl.fast.Matrix} m The matrix.
 * @return {!tdl.fast.Matrix} A copy of m.
 */
tdl.fast.copyMatrix = function(dst, m) {
  dst.set(m);
  return dst;
};

/**
 * Multiplies a scalar by a vector.
 * @param {!tdl.fast.Vector} dst vector.
 * @param {number} k The scalar.
 * @param {!tdl.fast.Vector} v The vector.
 * @return {!tdl.fast.Vector} The product of k and v.
 */
tdl.fast.mulScalarVector = function(dst, k, v) {
  var vLength = v.length;
  for (var i = 0; i < vLength; ++i) {
    dst[i] = k * v[i];
  }
  return dst;
};

/**
 * Multiplies a vector by a scalar.
 * @param {!tdl.fast.Vector} dst vector.
 * @param {!tdl.fast.Vector} v The vector.
 * @param {number} k The scalar.
 * @return {!tdl.fast.Vector} The product of k and v.
 */
tdl.fast.mulVectorScalar = function(dst, v, k) {
  return tdl.fast.mulScalarVector(dst, k, v);
};

/**
 * Multiplies a scalar by a matrix.
 * @param {!tdl.fast.Matrix} dst matrix.
 * @param {number} k The scalar.
 * @param {!tdl.fast.Matrix} m The matrix.
 * @return {!tdl.fast.Matrix} The product of m and k.
 */
tdl.fast.mulScalarMatrix = function(dst, k, m) {
  var mLength = m.length;
  for (var i = 0; i < mLength; ++i) {
    dst[i] = k * m[i];
  }
  return dst;
};

/**
 * Multiplies a matrix by a scalar.
 * @param {!tdl.fast.Matrix} dst matrix.
 * @param {!tdl.fast.Matrix} m The matrix.
 * @param {number} k The scalar.
 * @return {!tdl.fast.Matrix} The product of m and k.
 */
tdl.fast.mulMatrixScalar = function(dst, m, k) {
  return tdl.fast.mulScalarMatrix(dst, k, m);
};

/**
 * Multiplies a vector by another vector (component-wise); assumes a and
 * b have the same length.
 * @param {!tdl.fast.Vector} dst vector.
 * @param {!tdl.fast.Vector} a Operand vector.
 * @param {!tdl.fast.Vector} b Operand vector.
 * @return {!tdl.fast.Vector} The vector of products of entries of a and
 *     b.
 */
tdl.fast.mulVectorVector = function(dst, a, b) {
  var aLength = a.length;
  for (var i = 0; i < aLength; ++i)
    dst[i] = a[i] * b[i];
  return dst;
};

/**
 * Divides a vector by another vector (component-wise); assumes a and
 * b have the same length.
 * @param {!tdl.fast.Vector} dst vector.
 * @param {!tdl.fast.Vector} a Operand vector.
 * @param {!tdl.fast.Vector} b Operand vector.
 * @return {!tdl.fast.Vector} The vector of quotients of entries of a and
 *     b.
 */
tdl.fast.divVectorVector = function(dst, a, b) {
  var aLength = a.length;
  for (var i = 0; i < aLength; ++i)
    dst[i] = a[i] / b[i];
  return dst;
};

/**
 * Multiplies a vector by a matrix; treats the vector as a row vector; assumes
 * matrix entries are accessed in [row][column] fashion.
 * @param {!tdl.fast.Vector} dst vector.
 * @param {!tdl.fast.Vector} v The vector.
 * @param {!tdl.fast.Matrix} m The matrix.
 * @return {!tdl.fast.Vector} The product of v and m as a row vector.
 */
tdl.fast.rowMajor.mulVectorMatrix4 = function(dst, v, m) {
  for (var i = 0; i < 4; ++i) {
    dst[i] = 0.0;
    for (var j = 0; j < 4; ++j)
      dst[i] += v[j] * m[j * 4 + i];
  }
  return dst;
};

/**
 * Multiplies a vector by a matrix; treats the vector as a row vector; assumes
 * matrix entries are accessed in [column][row] fashion.
 * @param {!tdl.fast.Vector} dst vector.
 * @param {!tdl.fast.Vector} v The vector.
 * @param {!tdl.fast.Matrix} m The matrix.
 * @return {!tdl.fast.Vector} The product of v and m as a row vector.
 */
tdl.fast.columnMajor.mulVectorMatrix4 = function(dst, v, m) {
  var mLength = m.length;
  var vLength = v.length;
  for (var i = 0; i < 4; ++i) {
    dst[i] = 0.0;
    var col = i * 4;
    for (var j = 0; j < 4; ++j)
      dst[i] += v[j] * m[col + j];
  }
  return dst;
};

/**
 * Multiplies a vector by a matrix; treats the vector as a row vector.
 * @param {!tdl.fast.Matrix} m The matrix.
 * @param {!tdl.fast.Vector} v The vector.
 * @return {!tdl.fast.Vector} The product of m and v as a row vector.
 */
tdl.fast.mulVectorMatrix4 = null;

/**
 * Multiplies a matrix by a vector; treats the vector as a column vector.
 * assumes matrix entries are accessed in [row][column] fashion.
 * @param {!tdl.fast.Vector} dst vector.
 * @param {!tdl.fast.Matrix} m The matrix.
 * @param {!tdl.fast.Vector} v The vector.
 * @return {!tdl.fast.Vector} The product of m and v as a column vector.
 */
tdl.fast.rowMajor.mulMatrix4Vector = function(dst, m, v) {
  for (var i = 0; i < 4; ++i) {
    dst[i] = 0.0;
    var row = i * 4;
    for (var j = 0; j < 4; ++j)
      dst[i] += m[row + j] * v[j];
  }
  return dst;
};

/**
 * Multiplies a matrix by a vector; treats the vector as a column vector;
 * assumes matrix entries are accessed in [column][row] fashion.
 * @param {!tdl.fast.Vector} dst vector.
 * @param {!tdl.fast.Matrix} m The matrix.
 * @param {!tdl.fast.Vector} v The vector.
 * @return {!tdl.fast.Vector} The product of m and v as a column vector.
 */
tdl.fast.columnMajor.mulMatrix4Vector = function(dst, m, v) {
  for (var i = 0; i < 4; ++i) {
    dst[i] = 0.0;
    for (var j = 0; j < 4; ++j)
      dst[i] += v[j] * m[j * 4 + i];
  }
  return dst;
};

/**
 * Multiplies a matrix by a vector; treats the vector as a column vector.
 * @param {!tdl.fast.Matrix} m The matrix.
 * @param {!tdl.fast.Vector} v The vector.
 * @return {!tdl.fast.Vector} The product of m and v as a column vector.
 */
tdl.fast.mulMatrix4Vector = null;

/**
 * Multiplies two 3-by-3 matrices; assumes that the given matrices are 3-by-3;
 * assumes matrix entries are accessed in [row][column] fashion.
 * @param {!tdl.fast.Matrix3} dst matrix.
 * @param {!tdl.fast.Matrix3} a The matrix on the left.
 * @param {!tdl.fast.Matrix3} b The matrix on the right.
 * @return {!tdl.fast.Matrix3} The matrix product of a and b.
 */
tdl.fast.rowMajor.mulMatrixMatrix3 = function(dst, a, b) {
  var a00 = a[0];
  var a01 = a[1];
  var a02 = a[2];
  var a10 = a[3 + 0];
  var a11 = a[3 + 1];
  var a12 = a[3 + 2];
  var a20 = a[6 + 0];
  var a21 = a[6 + 1];
  var a22 = a[6 + 2];
  var b00 = b[0];
  var b01 = b[1];
  var b02 = b[2];
  var b10 = b[3 + 0];
  var b11 = b[3 + 1];
  var b12 = b[3 + 2];
  var b20 = b[6 + 0];
  var b21 = b[6 + 1];
  var b22 = b[6 + 2];
  dst[0] = a00 * b00 + a01 * b10 + a02 * b20;
  dst[1] = a00 * b01 + a01 * b11 + a02 * b21;
  dst[2] = a00 * b02 + a01 * b12 + a02 * b22;
  dst[3] = a10 * b00 + a11 * b10 + a12 * b20;
  dst[4] = a10 * b01 + a11 * b11 + a12 * b21;
  dst[5] = a10 * b02 + a11 * b12 + a12 * b22;
  dst[6] = a20 * b00 + a21 * b10 + a22 * b20;
  dst[7] = a20 * b01 + a21 * b11 + a22 * b21;
  dst[8] = a20 * b02 + a21 * b12 + a22 * b22;
  return dst;
};

/**
 * Multiplies two 3-by-3 matrices; assumes that the given matrices are 3-by-3;
 * assumes matrix entries are accessed in [column][row] fashion.
 * @param {!tdl.fast.Matrix3} dst matrix.
 * @param {!tdl.fast.Matrix3} a The matrix on the left.
 * @param {!tdl.fast.Matrix3} b The matrix on the right.
 * @return {!tdl.fast.Matrix3} The matrix product of a and b.
 */
tdl.fast.columnMajor.mulMatrixMatrix3 = function(dst, a, b) {
  var a00 = a[0];
  var a01 = a[1];
  var a02 = a[2];
  var a10 = a[3 + 0];
  var a11 = a[3 + 1];
  var a12 = a[3 + 2];
  var a20 = a[6 + 0];
  var a21 = a[6 + 1];
  var a22 = a[6 + 2];
  var b00 = b[0];
  var b01 = b[1];
  var b02 = b[2];
  var b10 = b[3 + 0];
  var b11 = b[3 + 1];
  var b12 = b[3 + 2];
  var b20 = b[6 + 0];
  var b21 = b[6 + 1];
  var b22 = b[6 + 2];
  dst[0] = a00 * b00 + a10 * b01 + a20 * b02;
  dst[1] = a01 * b00 + a11 * b01 + a21 * b02;
  dst[2] = a02 * b00 + a12 * b01 + a22 * b02;
  dst[3] = a00 * b10 + a10 * b11 + a20 * b12;
  dst[4] = a01 * b10 + a11 * b11 + a21 * b12;
  dst[5] = a02 * b10 + a12 * b11 + a22 * b12;
  dst[6] = a00 * b20 + a10 * b21 + a20 * b22;
  dst[7] = a01 * b20 + a11 * b21 + a21 * b22;
  dst[8] = a02 * b20 + a12 * b21 + a22 * b22;
  return dst;
};

/**
 * Multiplies two 3-by-3 matrices; assumes that the given matrices are 3-by-3.
 * @param {!tdl.fast.Matrix3} a The matrix on the left.
 * @param {!tdl.fast.Matrix3} b The matrix on the right.
 * @return {!tdl.fast.Matrix3} The matrix product of a and b.
 */
tdl.fast.mulMatrixMatrix3 = null;

/**
 * Multiplies two 4-by-4 matrices; assumes that the given matrices are 4-by-4;
 * assumes matrix entries are accessed in [row][column] fashion.
 * @param {!tdl.fast.Matrix4} dst matrix.
 * @param {!tdl.fast.Matrix4} a The matrix on the left.
 * @param {!tdl.fast.Matrix4} b The matrix on the right.
 * @return {!tdl.fast.Matrix4} The matrix product of a and b.
 */
tdl.fast.rowMajor.mulMatrixMatrix4 = function(dst, a, b) {
  var a00 = a[0];
  var a01 = a[1];
  var a02 = a[2];
  var a03 = a[3];
  var a10 = a[ 4 + 0];
  var a11 = a[ 4 + 1];
  var a12 = a[ 4 + 2];
  var a13 = a[ 4 + 3];
  var a20 = a[ 8 + 0];
  var a21 = a[ 8 + 1];
  var a22 = a[ 8 + 2];
  var a23 = a[ 8 + 3];
  var a30 = a[12 + 0];
  var a31 = a[12 + 1];
  var a32 = a[12 + 2];
  var a33 = a[12 + 3];
  var b00 = b[0];
  var b01 = b[1];
  var b02 = b[2];
  var b03 = b[3];
  var b10 = b[ 4 + 0];
  var b11 = b[ 4 + 1];
  var b12 = b[ 4 + 2];
  var b13 = b[ 4 + 3];
  var b20 = b[ 8 + 0];
  var b21 = b[ 8 + 1];
  var b22 = b[ 8 + 2];
  var b23 = b[ 8 + 3];
  var b30 = b[12 + 0];
  var b31 = b[12 + 1];
  var b32 = b[12 + 2];
  var b33 = b[12 + 3];
  dst[ 0] = a00 * b00 + a01 * b10 + a02 * b20 + a03 * b30;
  dst[ 1] = a00 * b01 + a01 * b11 + a02 * b21 + a03 * b31;
  dst[ 2] = a00 * b02 + a01 * b12 + a02 * b22 + a03 * b32;
  dst[ 3] = a00 * b03 + a01 * b13 + a02 * b23 + a03 * b33;
  dst[ 4] = a10 * b00 + a11 * b10 + a12 * b20 + a13 * b30;
  dst[ 5] = a10 * b01 + a11 * b11 + a12 * b21 + a13 * b31;
  dst[ 6] = a10 * b02 + a11 * b12 + a12 * b22 + a13 * b32;
  dst[ 7] = a10 * b03 + a11 * b13 + a12 * b23 + a13 * b33;
  dst[ 8] = a20 * b00 + a21 * b10 + a22 * b20 + a23 * b30;
  dst[ 9] = a20 * b01 + a21 * b11 + a22 * b21 + a23 * b31;
  dst[10] = a20 * b02 + a21 * b12 + a22 * b22 + a23 * b32;
  dst[11] = a20 * b03 + a21 * b13 + a22 * b23 + a23 * b33;
  dst[12] = a30 * b00 + a31 * b10 + a32 * b20 + a33 * b30;
  dst[13] = a30 * b01 + a31 * b11 + a32 * b21 + a33 * b31;
  dst[14] = a30 * b02 + a31 * b12 + a32 * b22 + a33 * b32;
  dst[15] = a30 * b03 + a31 * b13 + a32 * b23 + a33 * b33;
  return dst;
};

/**
 * Multiplies two 4-by-4 matrices; assumes that the given matrices are 4-by-4;
 * assumes matrix entries are accessed in [column][row] fashion.
 * @param {!tdl.fast.Matrix4} dst matrix.
 * @param {!tdl.fast.Matrix4} a The matrix on the left.
 * @param {!tdl.fast.Matrix4} b The matrix on the right.
 * @return {!tdl.fast.Matrix4} The matrix product of a and b.
 */
tdl.fast.columnMajor.mulMatrixMatrix4 = function(dst, a, b) {
  var a00 = a[0];
  var a01 = a[1];
  var a02 = a[2];
  var a03 = a[3];
  var a10 = a[ 4 + 0];
  var a11 = a[ 4 + 1];
  var a12 = a[ 4 + 2];
  var a13 = a[ 4 + 3];
  var a20 = a[ 8 + 0];
  var a21 = a[ 8 + 1];
  var a22 = a[ 8 + 2];
  var a23 = a[ 8 + 3];
  var a30 = a[12 + 0];
  var a31 = a[12 + 1];
  var a32 = a[12 + 2];
  var a33 = a[12 + 3];
  var b00 = b[0];
  var b01 = b[1];
  var b02 = b[2];
  var b03 = b[3];
  var b10 = b[ 4 + 0];
  var b11 = b[ 4 + 1];
  var b12 = b[ 4 + 2];
  var b13 = b[ 4 + 3];
  var b20 = b[ 8 + 0];
  var b21 = b[ 8 + 1];
  var b22 = b[ 8 + 2];
  var b23 = b[ 8 + 3];
  var b30 = b[12 + 0];
  var b31 = b[12 + 1];
  var b32 = b[12 + 2];
  var b33 = b[12 + 3];
  dst[ 0] = a00 * b00 + a10 * b01 + a20 * b02 + a30 * b03;
  dst[ 1] = a01 * b00 + a11 * b01 + a21 * b02 + a31 * b03;
  dst[ 2] = a02 * b00 + a12 * b01 + a22 * b02 + a32 * b03;
  dst[ 3] = a03 * b00 + a13 * b01 + a23 * b02 + a33 * b03;
  dst[ 4] = a00 * b10 + a10 * b11 + a20 * b12 + a30 * b13;
  dst[ 5] = a01 * b10 + a11 * b11 + a21 * b12 + a31 * b13;
  dst[ 6] = a02 * b10 + a12 * b11 + a22 * b12 + a32 * b13;
  dst[ 7] = a03 * b10 + a13 * b11 + a23 * b12 + a33 * b13;
  dst[ 8] = a00 * b20 + a10 * b21 + a20 * b22 + a30 * b23;
  dst[ 9] = a01 * b20 + a11 * b21 + a21 * b22 + a31 * b23;
  dst[10] = a02 * b20 + a12 * b21 + a22 * b22 + a32 * b23;
  dst[11] = a03 * b20 + a13 * b21 + a23 * b22 + a33 * b23;
  dst[12] = a00 * b30 + a10 * b31 + a20 * b32 + a30 * b33;
  dst[13] = a01 * b30 + a11 * b31 + a21 * b32 + a31 * b33;
  dst[14] = a02 * b30 + a12 * b31 + a22 * b32 + a32 * b33;
  dst[15] = a03 * b30 + a13 * b31 + a23 * b32 + a33 * b33;
  return dst;
};

/**
 * Multiplies two 4-by-4 matrices; assumes that the given matrices are 4-by-4.
 * @param {!tdl.fast.Matrix4} a The matrix on the left.
 * @param {!tdl.fast.Matrix4} b The matrix on the right.
 * @return {!tdl.fast.Matrix4} The matrix product of a and b.
 */
tdl.fast.mulMatrixMatrix4 = null;

/**
 * Gets the jth column of the given matrix m; assumes matrix entries are
 * accessed in [row][column] fashion.
 * @param {!tdl.fast.Vector} dst vector.
 * @param {!tdl.fast.Matrix} m The matrix.
 * @param {number} j The index of the desired column.
 * @return {!tdl.fast.Vector} The jth column of m as a vector.
 */
tdl.fast.rowMajor.column4 = function(dst, m, j) {
  for (var i = 0; i < 4; ++i) {
    dst[i] = m[i * 4 + j];
  }
  return dst;
};

/**
 * Gets the jth column of the given matrix m; assumes matrix entries are
 * accessed in [column][row] fashion.
 * @param {!tdl.fast.Vector} dst vector.
 * @param {!tdl.fast.Matrix} m The matrix.
 * @param {number} j The index of the desired column.
 * @return {!tdl.fast.Vector} The jth column of m as a vector.
 */
tdl.fast.columnMajor.column4 = function(dst, m, j) {
  var off = j * 4;
  dst[0] = m[off + 0];
  dst[1] = m[off + 1];
  dst[2] = m[off + 2];
  dst[3] = m[off + 3];
  return dst;
};

/**
 * Gets the jth column of the given matrix m.
 * @param {!tdl.fast.Vector} dst vector.
 * @param {!tdl.fast.Matrix} m The matrix.
 * @param {number} j The index of the desired column.
 * @return {!tdl.fast.Vector} The jth column of m as a vector.
 */
tdl.fast.column4 = null;

/**
 * Gets the ith row of the given matrix m; assumes matrix entries are
 * accessed in [row][column] fashion.
 * @param {!tdl.fast.Vector} dst vector.
 * @param {!tdl.fast.Matrix} m The matrix.
 * @param {number} i The index of the desired row.
 * @return {!tdl.fast.Vector} The ith row of m.
 */
tdl.fast.rowMajor.row4 = function(dst, m, i) {
  var off = i * 4;
  dst[0] = m[off + 0];
  dst[1] = m[off + 1];
  dst[2] = m[off + 2];
  dst[3] = m[off + 3];
  return dst;
};

/**
 * Gets the ith row of the given matrix m; assumes matrix entries are
 * accessed in [column][row] fashion.
 * @param {!tdl.fast.Vector} dst vector.
 * @param {!tdl.fast.Matrix} m The matrix.
 * @param {number} i The index of the desired row.
 * @return {!tdl.fast.Vector} The ith row of m.
 */
tdl.fast.columnMajor.row4 = function(dst, m, i) {
  for (var j = 0; j < 4; ++j) {
    dst[j] = m[j * 4 + i];
  }
  return dst;
};

/**
 * Gets the ith row of the given matrix m.
 * @param {!tdl.fast.Matrix} m The matrix.
 * @param {number} i The index of the desired row.
 * @return {!tdl.fast.Vector} The ith row of m.
 */
tdl.fast.row4 = null;

/**
 * Creates an n-by-n identity matrix.
 *
 * @param {!tdl.fast.Matrix} dst matrix.
 * @return {!tdl.fast.Matrix} An n-by-n identity matrix.
 */
tdl.fast.identity4 = function(dst) {
  dst[ 0] = 1;
  dst[ 1] = 0;
  dst[ 2] = 0;
  dst[ 3] = 0;
  dst[ 4] = 0;
  dst[ 5] = 1;
  dst[ 6] = 0;
  dst[ 7] = 0;
  dst[ 8] = 0;
  dst[ 9] = 0;
  dst[10] = 1;
  dst[11] = 0;
  dst[12] = 0;
  dst[13] = 0;
  dst[14] = 0;
  dst[15] = 1;
  return dst;
};

/**
 * Takes the transpose of a matrix.
 * @param {!tdl.fast.Matrix} dst matrix.
 * @param {!tdl.fast.Matrix} m The matrix.
 * @return {!tdl.fast.Matrix} The transpose of m.
 */
tdl.fast.transpose4 = function(dst, m) {
  if (dst === m) {
    var t;

    t = m[1];
    m[1] = m[4];
    m[4] = t;

    t = m[2];
    m[2] = m[8];
    m[8] = t;

    t = m[3];
    m[3] = m[12];
    m[12] = t;

    t = m[6];
    m[6] = m[9];
    m[9] = t;

    t = m[7];
    m[7] = m[13];
    m[13] = t;

    t = m[11];
    m[11] = m[14];
    m[14] = t;
    return dst;
  }

  var m00 = m[0 * 4 + 0];
  var m01 = m[0 * 4 + 1];
  var m02 = m[0 * 4 + 2];
  var m03 = m[0 * 4 + 3];
  var m10 = m[1 * 4 + 0];
  var m11 = m[1 * 4 + 1];
  var m12 = m[1 * 4 + 2];
  var m13 = m[1 * 4 + 3];
  var m20 = m[2 * 4 + 0];
  var m21 = m[2 * 4 + 1];
  var m22 = m[2 * 4 + 2];
  var m23 = m[2 * 4 + 3];
  var m30 = m[3 * 4 + 0];
  var m31 = m[3 * 4 + 1];
  var m32 = m[3 * 4 + 2];
  var m33 = m[3 * 4 + 3];

  dst[ 0] = m00;
  dst[ 1] = m10;
  dst[ 2] = m20;
  dst[ 3] = m30;
  dst[ 4] = m01;
  dst[ 5] = m11;
  dst[ 6] = m21;
  dst[ 7] = m31;
  dst[ 8] = m02;
  dst[ 9] = m12;
  dst[10] = m22;
  dst[11] = m32;
  dst[12] = m03;
  dst[13] = m13;
  dst[14] = m23;
  dst[15] = m33;
  return dst;
};

/**
 * Computes the inverse of a 4-by-4 matrix.
 * @param {!tdl.fast.Matrix4} dst matrix.
 * @param {!tdl.fast.Matrix4} m The matrix.
 * @return {!tdl.fast.Matrix4} The inverse of m.
 */
tdl.fast.inverse4 = function(dst, m) {
  var m00 = m[0 * 4 + 0];
  var m01 = m[0 * 4 + 1];
  var m02 = m[0 * 4 + 2];
  var m03 = m[0 * 4 + 3];
  var m10 = m[1 * 4 + 0];
  var m11 = m[1 * 4 + 1];
  var m12 = m[1 * 4 + 2];
  var m13 = m[1 * 4 + 3];
  var m20 = m[2 * 4 + 0];
  var m21 = m[2 * 4 + 1];
  var m22 = m[2 * 4 + 2];
  var m23 = m[2 * 4 + 3];
  var m30 = m[3 * 4 + 0];
  var m31 = m[3 * 4 + 1];
  var m32 = m[3 * 4 + 2];
  var m33 = m[3 * 4 + 3];
  var tmp_0  = m22 * m33;
  var tmp_1  = m32 * m23;
  var tmp_2  = m12 * m33;
  var tmp_3  = m32 * m13;
  var tmp_4  = m12 * m23;
  var tmp_5  = m22 * m13;
  var tmp_6  = m02 * m33;
  var tmp_7  = m32 * m03;
  var tmp_8  = m02 * m23;
  var tmp_9  = m22 * m03;
  var tmp_10 = m02 * m13;
  var tmp_11 = m12 * m03;
  var tmp_12 = m20 * m31;
  var tmp_13 = m30 * m21;
  var tmp_14 = m10 * m31;
  var tmp_15 = m30 * m11;
  var tmp_16 = m10 * m21;
  var tmp_17 = m20 * m11;
  var tmp_18 = m00 * m31;
  var tmp_19 = m30 * m01;
  var tmp_20 = m00 * m21;
  var tmp_21 = m20 * m01;
  var tmp_22 = m00 * m11;
  var tmp_23 = m10 * m01;

  var t0 = (tmp_0 * m11 + tmp_3 * m21 + tmp_4 * m31) -
      (tmp_1 * m11 + tmp_2 * m21 + tmp_5 * m31);
  var t1 = (tmp_1 * m01 + tmp_6 * m21 + tmp_9 * m31) -
      (tmp_0 * m01 + tmp_7 * m21 + tmp_8 * m31);
  var t2 = (tmp_2 * m01 + tmp_7 * m11 + tmp_10 * m31) -
      (tmp_3 * m01 + tmp_6 * m11 + tmp_11 * m31);
  var t3 = (tmp_5 * m01 + tmp_8 * m11 + tmp_11 * m21) -
      (tmp_4 * m01 + tmp_9 * m11 + tmp_10 * m21);

  var d = 1.0 / (m00 * t0 + m10 * t1 + m20 * t2 + m30 * t3);

  dst[ 0] = d * t0;
  dst[ 1] = d * t1;
  dst[ 2] = d * t2;
  dst[ 3] = d * t3;
  dst[ 4] = d * ((tmp_1 * m10 + tmp_2 * m20 + tmp_5 * m30) -
          (tmp_0 * m10 + tmp_3 * m20 + tmp_4 * m30));
  dst[ 5] = d * ((tmp_0 * m00 + tmp_7 * m20 + tmp_8 * m30) -
          (tmp_1 * m00 + tmp_6 * m20 + tmp_9 * m30));
  dst[ 6] = d * ((tmp_3 * m00 + tmp_6 * m10 + tmp_11 * m30) -
          (tmp_2 * m00 + tmp_7 * m10 + tmp_10 * m30));
  dst[ 7] = d * ((tmp_4 * m00 + tmp_9 * m10 + tmp_10 * m20) -
          (tmp_5 * m00 + tmp_8 * m10 + tmp_11 * m20));
  dst[ 8] = d * ((tmp_12 * m13 + tmp_15 * m23 + tmp_16 * m33) -
          (tmp_13 * m13 + tmp_14 * m23 + tmp_17 * m33));
  dst[ 9] = d * ((tmp_13 * m03 + tmp_18 * m23 + tmp_21 * m33) -
          (tmp_12 * m03 + tmp_19 * m23 + tmp_20 * m33));
  dst[10] = d * ((tmp_14 * m03 + tmp_19 * m13 + tmp_22 * m33) -
          (tmp_15 * m03 + tmp_18 * m13 + tmp_23 * m33));
  dst[11] = d * ((tmp_17 * m03 + tmp_20 * m13 + tmp_23 * m23) -
          (tmp_16 * m03 + tmp_21 * m13 + tmp_22 * m23));
  dst[12] = d * ((tmp_14 * m22 + tmp_17 * m32 + tmp_13 * m12) -
          (tmp_16 * m32 + tmp_12 * m12 + tmp_15 * m22));
  dst[13] = d * ((tmp_20 * m32 + tmp_12 * m02 + tmp_19 * m22) -
          (tmp_18 * m22 + tmp_21 * m32 + tmp_13 * m02));
  dst[14] = d * ((tmp_18 * m12 + tmp_23 * m32 + tmp_15 * m02) -
          (tmp_22 * m32 + tmp_14 * m02 + tmp_19 * m12));
  dst[15] = d * ((tmp_22 * m22 + tmp_16 * m02 + tmp_21 * m12) -
          (tmp_20 * m12 + tmp_23 * m22 + tmp_17 * m02));
  return dst;
};

/**
 * Computes the inverse of a 4-by-4 matrix.
 * Note: It is faster to call this than tdl.fast.inverse.
 * @param {!tdl.fast.Matrix4} m The matrix.
 * @return {!tdl.fast.Matrix4} The inverse of m.
 */
tdl.fast.matrix4.inverse = function(dst,m) {
  return tdl.fast.inverse4(dst,m);
};

/**
 * Multiplies two 4-by-4 matrices; assumes that the given matrices are 4-by-4.
 * Note: It is faster to call this than tdl.fast.mul.
 * @param {!tdl.fast.Matrix4} a The matrix on the left.
 * @param {!tdl.fast.Matrix4} b The matrix on the right.
 * @return {!tdl.fast.Matrix4} The matrix product of a and b.
 */
tdl.fast.matrix4.mul = function(dst, a, b) {
  return tdl.fast.mulMatrixMatrix4(dst, a, b);
};

/**
 * Copies a Matrix4.
 * Note: It is faster to call this than tdl.fast.copy.
 * @param {!tdl.fast.Matrix4} m The matrix.
 * @return {!tdl.fast.Matrix4} A copy of m.
 */
tdl.fast.matrix4.copy = function(dst, m) {
  return tdl.fast.copyMatrix(dst, m);
};

/**
 * Sets the translation component of a 4-by-4 matrix to the given
 * vector.
 * @param {!tdl.fast.Matrix4} a The matrix.
 * @param {(!tdl.fast.Vector3|!tdl.fast.Vector4)} v The vector.
 * @return {!tdl.fast.Matrix4} a once modified.
 */
tdl.fast.matrix4.setTranslation = function(a, v) {
  a[12] = v[0];
  a[13] = v[1];
  a[14] = v[2];
  a[15] = 1;
  return a;
};

/**
 * Returns the translation component of a 4-by-4 matrix as a vector with 3
 * entries.
 * @return {!tdl.fast.Vector3} dst vector..
 * @param {!tdl.fast.Matrix4} m The matrix.
 * @return {!tdl.fast.Vector3} The translation component of m.
 */
tdl.fast.matrix4.getTranslation = function(dst, m) {
  dst[0] = m[12];
  dst[1] = m[13];
  dst[2] = m[14];
  return dst;
};

/**
 * Creates a 4-by-4 identity matrix.
 * @param {!tdl.fast.Matrix4} dst matrix.
 * @return {!tdl.fast.Matrix4} The 4-by-4 identity.
 */
tdl.fast.matrix4.identity = function(dst) {
  return tdl.fast.identity4(dst);
};

tdl.fast.matrix4.getAxis = function(dst, m, axis) {
  var off = axis * 4;
  dst[0] = m[off + 0];
  dst[1] = m[off + 1];
  dst[2] = m[off + 2];
  return dst;
};

/**
 * Computes a 4-by-4 perspective transformation matrix given the angular height
 * of the frustum, the aspect ratio, and the near and far clipping planes.  The
 * arguments define a frustum extending in the negative z direction.  The given
 * angle is the vertical angle of the frustum, and the horizontal angle is
 * determined to produce the given aspect ratio.  The arguments near and far are
 * the distances to the near and far clipping planes.  Note that near and far
 * are not z coordinates, but rather they are distances along the negative
 * z-axis.  The matrix generated sends the viewing frustum to the unit box.
 * We assume a unit box extending from -1 to 1 in the x and y dimensions and
 * from 0 to 1 in the z dimension.
 * @param {!tdl.fast.Matrix4} dst matrix.
 * @param {number} angle The camera angle from top to bottom (in radians).
 * @param {number} aspect The aspect ratio width / height.
 * @param {number} zNear The depth (negative z coordinate)
 *     of the near clipping plane.
 * @param {number} zFar The depth (negative z coordinate)
 *     of the far clipping plane.
 * @return {!tdl.fast.Matrix4} The perspective matrix.
 */
tdl.fast.matrix4.perspective = function(dst, angle, aspect, zNear, zFar) {
  var f = Math.tan(Math.PI * 0.5 - 0.5 * angle);
  var rangeInv = 1.0 / (zNear - zFar);

  dst[0]  = f / aspect;
  dst[1]  = 0;
  dst[2]  = 0;
  dst[3]  = 0;

  dst[4]  = 0;
  dst[5]  = f;
  dst[6]  = 0;
  dst[7]  = 0;

  dst[8]  = 0;
  dst[9]  = 0;
  dst[10] = (zNear + zFar) * rangeInv;
  dst[11] = -1;

  dst[12] = 0;
  dst[13] = 0;
  dst[14] = zNear * zFar * rangeInv * 2;
  dst[15] = 0;

  return dst;
};


/**
 * Computes a 4-by-4 othogonal transformation matrix given the left, right,
 * bottom, and top dimensions of the near clipping plane as well as the
 * near and far clipping plane distances.
 * @param {!tdl.fast.Matrix4} dst Output matrix.
 * @param {number} left Left side of the near clipping plane viewport.
 * @param {number} right Right side of the near clipping plane viewport.
 * @param {number} top Top of the near clipping plane viewport.
 * @param {number} bottom Bottom of the near clipping plane viewport.
 * @param {number} near The depth (negative z coordinate)
 *     of the near clipping plane.
 * @param {number} far The depth (negative z coordinate)
 *     of the far clipping plane.
 * @return {!tdl.fast.Matrix4} The perspective matrix.
 */
tdl.fast.matrix4.ortho = function(dst, left, right, bottom, top, near, far) {


  dst[0]  = 2 / (right - left);
  dst[1]  = 0;
  dst[2]  = 0;
  dst[3]  = 0;

  dst[4]  = 0;
  dst[5]  = 2 / (top - bottom);
  dst[6]  = 0;
  dst[7]  = 0;

  dst[8]  = 0;
  dst[9]  = 0;
  dst[10] = -1 / (far - near);
  dst[11] = 0;

  dst[12] = (right + left) / (left - right);
  dst[13] = (top + bottom) / (bottom - top);
  dst[14] = -near / (near - far);
  dst[15] = 1;

  return dst;
}

/**
 * Computes a 4-by-4 perspective transformation matrix given the left, right,
 * top, bottom, near and far clipping planes. The arguments define a frustum
 * extending in the negative z direction. The arguments near and far are the
 * distances to the near and far clipping planes. Note that near and far are not
 * z coordinates, but rather they are distances along the negative z-axis. The
 * matrix generated sends the viewing frustum to the unit box. We assume a unit
 * box extending from -1 to 1 in the x and y dimensions and from 0 to 1 in the z
 * dimension.
 * @param {number} left The x coordinate of the left plane of the box.
 * @param {number} right The x coordinate of the right plane of the box.
 * @param {number} bottom The y coordinate of the bottom plane of the box.
 * @param {number} top The y coordinate of the right plane of the box.
 * @param {number} near The negative z coordinate of the near plane of the box.
 * @param {number} far The negative z coordinate of the far plane of the box.
 * @return {!tdl.fast.Matrix4} The perspective projection matrix.
 */
tdl.fast.matrix4.frustum = function(dst, left, right, bottom, top, near, far) {
  var dx = (right - left);
  var dy = (top - bottom);
  var dz = (near - far);

  dst[ 0] = 2 * near / dx;
  dst[ 1] = 0;
  dst[ 2] = 0;
  dst[ 3] = 0;
  dst[ 4] = 0;
  dst[ 5] = 2 * near / dy;
  dst[ 6] = 0;
  dst[ 7] = 0;
  dst[ 8] = (left + right) / dx;
  dst[ 9] = (top + bottom) / dy;
  dst[10] = far / dz;
  dst[11] = -1;
  dst[12] = 0;
  dst[13] = 0;
  dst[14] = near * far / dz;
  dst[15] = 0;

  return dst;
};

/**
 * Computes a 4-by-4 look-at transformation.  The transformation generated is
 * an orthogonal rotation matrix with translation component.  The translation
 * component sends the eye to the origin.  The rotation component sends the
 * vector pointing from the eye to the target to a vector pointing in the
 * negative z direction, and also sends the up vector into the upper half of
 * the yz plane.
 * @return {!tdl.fast.Matrix4} dst matrix.
 * @param {(!tdl.fast.Vector3} eye The
 *     position of the eye.
 * @param {(!tdl.fast.Vector3} target The
 *     position meant to be viewed.
 * @param {(!tdl.fast.Vector3} up A vector
 *     pointing up.
 * @return {!tdl.fast.Matrix4} The look-at matrix.
 */
tdl.fast.matrix4.lookAt = function(dst, eye, target, up) {
  var t0 = tdl.fast.temp0v3_;
  var t1 = tdl.fast.temp1v3_;
  var t2 = tdl.fast.temp2v3_;

  var vz = tdl.fast.normalize(t0, tdl.fast.subVector(t0, eye, target));
  var vx = tdl.fast.normalize(t1, tdl.fast.cross(t1, up, vz));
  var vy = tdl.fast.cross(t2, vz, vx);

  dst[ 0] = vx[0];
  dst[ 1] = vy[0];
  dst[ 2] = vz[0];
  dst[ 3] = 0;
  dst[ 4] = vx[1];
  dst[ 5] = vy[1];
  dst[ 6] = vz[1];
  dst[ 7] = 0;
  dst[ 8] = vx[2];
  dst[ 9] = vy[2];
  dst[10] = vz[2];
  dst[11] = 0;
  dst[12] = -tdl.fast.dot(vx, eye);
  dst[13] = -tdl.fast.dot(vy, eye);
  dst[14] = -tdl.fast.dot(vz, eye);
  dst[15] = 1;

  return dst;
};

/**
 * Computes a 4-by-4 camera look-at transformation. This is the
 * inverse of lookAt The transformation generated is an
 * orthogonal rotation matrix with translation component.
 * @param {(!tdl.fast.Vector3|!tdl.fast.Vector4)} eye The position
 *     of the eye.
 * @param {(!tdl.fast.Vector3|!tdl.fast.Vector4)} target The
 *     position meant to be viewed.
 * @param {(!tdl.fast.Vector3|!tdl.fast.Vector4)} up A vector
 *     pointing up.
 * @return {!tdl.fast.Matrix4} The camera look-at matrix.
 */
tdl.fast.matrix4.cameraLookAt = function(dst, eye, target, up) {
  var t0 = tdl.fast.temp0v3_;
  var t1 = tdl.fast.temp1v3_;
  var t2 = tdl.fast.temp2v3_;

  var vz = tdl.fast.normalize(t0, tdl.fast.subVector(t0, eye, target));
  var vx = tdl.fast.normalize(t1, tdl.fast.cross(t1, up, vz));
  var vy = tdl.fast.cross(t2, vz, vx);

  dst[ 0] = vx[0];
  dst[ 1] = vx[1];
  dst[ 2] = vx[2];
  dst[ 3] = 0;
  dst[ 4] = vy[0];
  dst[ 5] = vy[1];
  dst[ 6] = vy[2];
  dst[ 7] = 0;
  dst[ 8] = vz[0];
  dst[ 9] = vz[1];
  dst[10] = vz[2];
  dst[11] = 0;
  dst[12] = eye[0];
  dst[13] = eye[1];
  dst[14] = eye[2];
  dst[15] = 1;

  return dst;
};

/**
 * Creates a 4-by-4 matrix which translates by the given vector v.
 * @param {(!tdl.fast.Vector3|!tdl.fast.Vector4)} v The vector by
 *     which to translate.
 * @return {!tdl.fast.Matrix4} The translation matrix.
 */
tdl.fast.matrix4.translation = function(dst, v) {
  dst[ 0] = 1;
  dst[ 1] = 0;
  dst[ 2] = 0;
  dst[ 3] = 0;
  dst[ 4] = 0;
  dst[ 5] = 1;
  dst[ 6] = 0;
  dst[ 7] = 0;
  dst[ 8] = 0;
  dst[ 9] = 0;
  dst[10] = 1;
  dst[11] = 0;
  dst[12] = v[0];
  dst[13] = v[1];
  dst[14] = v[2];
  dst[15] = 1;
  return dst;
};

/**
 * Modifies the given 4-by-4 matrix by translation by the given vector v.
 * @param {!tdl.fast.Matrix4} m The matrix.
 * @param {(!tdl.fast.Vector3|!tdl.fast.Vector4)} v The vector by
 *     which to translate.
 * @return {!tdl.fast.Matrix4} m once modified.
 */
tdl.fast.matrix4.translate = function(m, v) {
  var v0 = v[0];
  var v1 = v[1];
  var v2 = v[2];
  var m00 = m[0];
  var m01 = m[1];
  var m02 = m[2];
  var m03 = m[3];
  var m10 = m[1 * 4 + 0];
  var m11 = m[1 * 4 + 1];
  var m12 = m[1 * 4 + 2];
  var m13 = m[1 * 4 + 3];
  var m20 = m[2 * 4 + 0];
  var m21 = m[2 * 4 + 1];
  var m22 = m[2 * 4 + 2];
  var m23 = m[2 * 4 + 3];
  var m30 = m[3 * 4 + 0];
  var m31 = m[3 * 4 + 1];
  var m32 = m[3 * 4 + 2];
  var m33 = m[3 * 4 + 3];

  m[12] = m00 * v0 + m10 * v1 + m20 * v2 + m30;
  m[13] = m01 * v0 + m11 * v1 + m21 * v2 + m31;
  m[14] = m02 * v0 + m12 * v1 + m22 * v2 + m32;
  m[15] = m03 * v0 + m13 * v1 + m23 * v2 + m33;

  return m;
};

tdl.fast.matrix4.transpose = tdl.fast.transpose4;

/**
 * Creates a 4-by-4 matrix which rotates around the x-axis by the given angle.
 * @param {number} angle The angle by which to rotate (in radians).
 * @return {!tdl.fast.Matrix4} The rotation matrix.
 */
tdl.fast.matrix4.rotationX = function(dst, angle) {
  var c = Math.cos(angle);
  var s = Math.sin(angle);

  dst[ 0] = 1;
  dst[ 1] = 0;
  dst[ 2] = 0;
  dst[ 3] = 0;
  dst[ 4] = 0;
  dst[ 5] = c;
  dst[ 6] = s;
  dst[ 7] = 0;
  dst[ 8] = 0;
  dst[ 9] = -s;
  dst[10] = c;
  dst[11] = 0;
  dst[12] = 0;
  dst[13] = 0;
  dst[14] = 0;
  dst[15] = 1;

  return dst;
};

/**
 * Modifies the given 4-by-4 matrix by a rotation around the x-axis by the given
 * angle.
 * @param {!tdl.fast.Matrix4} m The matrix.
 * @param {number} angle The angle by which to rotate (in radians).
 * @return {!tdl.fast.Matrix4} m once modified.
 */
tdl.fast.matrix4.rotateX = function(m, angle) {
  var m10 = m[4];
  var m11 = m[5];
  var m12 = m[6];
  var m13 = m[7];
  var m20 = m[8];
  var m21 = m[9];
  var m22 = m[10];
  var m23 = m[11];
  var c = Math.cos(angle);
  var s = Math.sin(angle);

  m[4]  = c * m10 + s * m20;
  m[5]  = c * m11 + s * m21;
  m[6]  = c * m12 + s * m22;
  m[7]  = c * m13 + s * m23;
  m[8]  = c * m20 - s * m10;
  m[9]  = c * m21 - s * m11;
  m[10] = c * m22 - s * m12;
  m[11] = c * m23 - s * m13;

  return m;
};

/**
 * Creates a 4-by-4 matrix which rotates around the y-axis by the given angle.
 * @param {number} angle The angle by which to rotate (in radians).
 * @return {!tdl.fast.Matrix4} The rotation matrix.
 */
tdl.fast.matrix4.rotationY = function(dst, angle) {
  var c = Math.cos(angle);
  var s = Math.sin(angle);

  dst[ 0] = c;
  dst[ 1] = 0;
  dst[ 2] = -s;
  dst[ 3] = 0;
  dst[ 4] = 0;
  dst[ 5] = 1;
  dst[ 6] = 0;
  dst[ 7] = 0;
  dst[ 8] = s;
  dst[ 9] = 0;
  dst[10] = c;
  dst[11] = 0;
  dst[12] = 0;
  dst[13] = 0;
  dst[14] = 0;
  dst[15] = 1;

  return dst;
};

/**
 * Modifies the given 4-by-4 matrix by a rotation around the y-axis by the given
 * angle.
 * @param {!tdl.fast.Matrix4} m The matrix.
 * @param {number} angle The angle by which to rotate (in radians).
 * @return {!tdl.fast.Matrix4} m once modified.
 */
tdl.fast.matrix4.rotateY = function(m, angle) {
  var m00 = m[0*4+0];
  var m01 = m[0*4+1];
  var m02 = m[0*4+2];
  var m03 = m[0*4+3];
  var m20 = m[2*4+0];
  var m21 = m[2*4+1];
  var m22 = m[2*4+2];
  var m23 = m[2*4+3];
  var c = Math.cos(angle);
  var s = Math.sin(angle);

  m[ 0] = c * m00 - s * m20;
  m[ 1] = c * m01 - s * m21;
  m[ 2] = c * m02 - s * m22;
  m[ 3] = c * m03 - s * m23;
  m[ 8] = c * m20 + s * m00;
  m[ 9] = c * m21 + s * m01;
  m[10] = c * m22 + s * m02;
  m[11] = c * m23 + s * m03;

  return m;
};

/**
 * Creates a 4-by-4 matrix which rotates around the z-axis by the given angle.
 * @param {number} angle The angle by which to rotate (in radians).
 * @return {!tdl.fast.Matrix4} The rotation matrix.
 */
tdl.fast.matrix4.rotationZ = function(dst, angle) {
  var c = Math.cos(angle);
  var s = Math.sin(angle);

  dst[ 0] = c;
  dst[ 1] = s;
  dst[ 2] = 0;
  dst[ 3] = 0;
  dst[ 4] = -s;
  dst[ 5] = c;
  dst[ 6] = 0;
  dst[ 7] = 0;
  dst[ 8] = 0;
  dst[ 9] = 0;
  dst[10] = 1;
  dst[11] = 0;
  dst[12] = 0;
  dst[13] = 0;
  dst[14] = 0;
  dst[15] = 1;

  return dst;
};

/**
 * Modifies the given 4-by-4 matrix by a rotation around the z-axis by the given
 * angle.
 * @param {!tdl.fast.Matrix4} m The matrix.
 * @param {number} angle The angle by which to rotate (in radians).
 * @return {!tdl.fast.Matrix4} m once modified.
 */
tdl.fast.matrix4.rotateZ = function(m, angle) {
  var m00 = m[0*4+0];
  var m01 = m[0*4+1];
  var m02 = m[0*4+2];
  var m03 = m[0*4+3];
  var m10 = m[1*4+0];
  var m11 = m[1*4+1];
  var m12 = m[1*4+2];
  var m13 = m[1*4+3];
  var c = Math.cos(angle);
  var s = Math.sin(angle);

  m[ 0] = c * m00 + s * m10;
  m[ 1] = c * m01 + s * m11;
  m[ 2] = c * m02 + s * m12;
  m[ 3] = c * m03 + s * m13;
  m[ 4] = c * m10 - s * m00;
  m[ 5] = c * m11 - s * m01;
  m[ 6] = c * m12 - s * m02;
  m[ 7] = c * m13 - s * m03;

  return m;
};

/**
 * Creates a 4-by-4 matrix which rotates around the given axis by the given
 * angle.
 * @param {(!tdl.fast.Vector3|!tdl.fast.Vector4)} axis The axis
 *     about which to rotate.
 * @param {number} angle The angle by which to rotate (in radians).
 * @return {!tdl.fast.Matrix4} A matrix which rotates angle radians
 *     around the axis.
 */
tdl.fast.matrix4.axisRotation = function(dst, axis, angle) {
  var x = axis[0];
  var y = axis[1];
  var z = axis[2];
  var n = Math.sqrt(x * x + y * y + z * z);
  x /= n;
  y /= n;
  z /= n;
  var xx = x * x;
  var yy = y * y;
  var zz = z * z;
  var c = Math.cos(angle);
  var s = Math.sin(angle);
  var oneMinusCosine = 1 - c;

  dst[ 0] = xx + (1 - xx) * c;
  dst[ 1] = x * y * oneMinusCosine + z * s;
  dst[ 2] = x * z * oneMinusCosine - y * s;
  dst[ 3] = 0;
  dst[ 4] = x * y * oneMinusCosine - z * s;
  dst[ 5] = yy + (1 - yy) * c;
  dst[ 6] = y * z * oneMinusCosine + x * s;
  dst[ 7] = 0;
  dst[ 8] = x * z * oneMinusCosine + y * s;
  dst[ 9] = y * z * oneMinusCosine - x * s;
  dst[10] = zz + (1 - zz) * c;
  dst[11] = 0;
  dst[12] = 0;
  dst[13] = 0;
  dst[14] = 0;
  dst[15] = 1;

  return dst;
};

/**
 * Modifies the given 4-by-4 matrix by rotation around the given axis by the
 * given angle.
 * @param {!tdl.fast.Matrix4} m The matrix.
 * @param {(!tdl.fast.Vector3|!tdl.fast.Vector4)} axis The axis
 *     about which to rotate.
 * @param {number} angle The angle by which to rotate (in radians).
 * @return {!tdl.fast.Matrix4} m once modified.
 */
tdl.fast.matrix4.axisRotate = function(m, axis, angle) {
  var x = axis[0];
  var y = axis[1];
  var z = axis[2];
  var n = Math.sqrt(x * x + y * y + z * z);
  x /= n;
  y /= n;
  z /= n;
  var xx = x * x;
  var yy = y * y;
  var zz = z * z;
  var c = Math.cos(angle);
  var s = Math.sin(angle);
  var oneMinusCosine = 1 - c;

  var r00 = xx + (1 - xx) * c;
  var r01 = x * y * oneMinusCosine + z * s;
  var r02 = x * z * oneMinusCosine - y * s;
  var r10 = x * y * oneMinusCosine - z * s;
  var r11 = yy + (1 - yy) * c;
  var r12 = y * z * oneMinusCosine + x * s;
  var r20 = x * z * oneMinusCosine + y * s;
  var r21 = y * z * oneMinusCosine - x * s;
  var r22 = zz + (1 - zz) * c;

  var m00 = m[0];
  var m01 = m[1];
  var m02 = m[2];
  var m03 = m[3];
  var m10 = m[4];
  var m11 = m[5];
  var m12 = m[6];
  var m13 = m[7];
  var m20 = m[8];
  var m21 = m[9];
  var m22 = m[10];
  var m23 = m[11];
  var m30 = m[12];
  var m31 = m[13];
  var m32 = m[14];
  var m33 = m[15];

  m[ 0] = r00 * m00 + r01 * m10 + r02 * m20;
  m[ 1] = r00 * m01 + r01 * m11 + r02 * m21;
  m[ 2] = r00 * m02 + r01 * m12 + r02 * m22;
  m[ 3] = r00 * m03 + r01 * m13 + r02 * m23;
  m[ 4] = r10 * m00 + r11 * m10 + r12 * m20;
  m[ 5] = r10 * m01 + r11 * m11 + r12 * m21;
  m[ 6] = r10 * m02 + r11 * m12 + r12 * m22;
  m[ 7] = r10 * m03 + r11 * m13 + r12 * m23;
  m[ 8] = r20 * m00 + r21 * m10 + r22 * m20;
  m[ 9] = r20 * m01 + r21 * m11 + r22 * m21;
  m[10] = r20 * m02 + r21 * m12 + r22 * m22;
  m[11] = r20 * m03 + r21 * m13 + r22 * m23;

  return m;
};

/**
 * Creates a 4-by-4 matrix which scales in each dimension by an amount given by
 * the corresponding entry in the given vector; assumes the vector has three
 * entries.
 * @param {!tdl.fast.Vector3} v A vector of
 *     three entries specifying the factor by which to scale in each dimension.
 * @return {!tdl.fast.Matrix4} The scaling matrix.
 */
tdl.fast.matrix4.scaling = function(dst, v) {
  dst[ 0] = v[0];
  dst[ 1] = 0;
  dst[ 2] = 0;
  dst[ 3] = 0;
  dst[ 4] = 0;
  dst[ 5] = v[1];
  dst[ 6] = 0;
  dst[ 7] = 0;
  dst[ 8] = 0;
  dst[ 9] = 0;
  dst[10] = v[2];
  dst[11] = 0;
  dst[12] = 0;
  dst[13] = 0;
  dst[14] = 0;
  dst[15] = 1;
  return dst;
};

/**
 * Modifies the given 4-by-4 matrix, scaling in each dimension by an amount
 * given by the corresponding entry in the given vector; assumes the vector has
 * three entries.
 * @param {!tdl.fast.Matrix4} m The matrix to be modified.
 * @param {!tdl.fast.Vector3} v A vector of three entries specifying the
 *     factor by which to scale in each dimension.
 * @return {!tdl.fast.Matrix4} m once modified.
 */
tdl.fast.matrix4.scale = function(m, v) {
  var v0 = v[0];
  var v1 = v[1];
  var v2 = v[2];

  m[0] = v0 * m[0*4+0];
  m[1] = v0 * m[0*4+1];
  m[2] = v0 * m[0*4+2];
  m[3] = v0 * m[0*4+3];
  m[4] = v1 * m[1*4+0];
  m[5] = v1 * m[1*4+1];
  m[6] = v1 * m[1*4+2];
  m[7] = v1 * m[1*4+3];
  m[8] = v2 * m[2*4+0];
  m[9] = v2 * m[2*4+1];
  m[10] = v2 * m[2*4+2];
  m[11] = v2 * m[2*4+3];

  return m;
};

/**
 * Sets each function in the namespace tdl.fast to the row major
 * version in tdl.fast.rowMajor (provided such a function exists in
 * tdl.fast.rowMajor).  Call this function to establish the row major
 * convention.
 */
tdl.fast.installRowMajorFunctions = function() {
  for (var f in tdl.fast.rowMajor) {
    tdl.fast[f] = tdl.fast.rowMajor[f];
  }
};

/**
 * Sets each function in the namespace tdl.fast to the column major
 * version in tdl.fast.columnMajor (provided such a function exists in
 * tdl.fast.columnMajor).  Call this function to establish the column
 * major convention.
 */
tdl.fast.installColumnMajorFunctions = function() {
  for (var f in tdl.fast.columnMajor) {
    tdl.fast[f] = tdl.fast.columnMajor[f];
  }
};

// By default, install the row-major functions.
tdl.fast.installRowMajorFunctions();
/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview This file contains objects to measure frames
 *               per second.
 */

//tdl.provide('tdl.fps');

/**
 * A module for fps.
 * @namespace
 */
tdl.fps = tdl.fps || {};

/**
 * Number of frames to average over for computing FPS.
 * @type {number}
 */
tdl.fps.NUM_FRAMES_TO_AVERAGE = 16;

/**
 * Measures frames per second.
 * @constructor
 */
tdl.fps.FPSTimer = function() {
  // total time spent for last N frames.
  this.totalTime_ = tdl.fps.NUM_FRAMES_TO_AVERAGE;

  // elapsed time for last N frames.
  this.timeTable_ = [];

  // where to record next elapsed time.
  this.timeTableCursor_ = 0;

  // Initialize the FPS elapsed time history table.
  for (var tt = 0; tt < tdl.fps.NUM_FRAMES_TO_AVERAGE; ++tt) {
    this.timeTable_[tt] = 1.0;
  }
};

/**
 * Updates the fps measurement. You must call this in your
 * render loop.
 *
 * @param {number} elapsedTime The elasped time in seconds
 *     since the last frame.
 */
tdl.fps.FPSTimer.prototype.update = function(elapsedTime) {
  // Keep the total time and total active time for the last N frames.
  this.totalTime_ += elapsedTime - this.timeTable_[this.timeTableCursor_];

  // Save off the elapsed time for this frame so we can subtract it later.
  this.timeTable_[this.timeTableCursor_] = elapsedTime;

  // Wrap the place to store the next time sample.
  ++this.timeTableCursor_;
  if (this.timeTableCursor_ == tdl.fps.NUM_FRAMES_TO_AVERAGE) {
    this.timeTableCursor_ = 0;
  }

  this.instantaneousFPS = Math.floor(1.0 / elapsedTime + 0.5);
  this.averageFPS = Math.floor(
      (1.0 / (this.totalTime_ / tdl.fps.NUM_FRAMES_TO_AVERAGE)) + 0.5);
};



/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview This file contains objects to manage
 *               framebuffers.
 */

//tdl.provide('tdl.framebuffers');

//tdl.require('tdl.textures');

/**
 * A module for textures.
 * @namespace
 */
tdl.framebuffers = tdl.framebuffers || {};

tdl.framebuffers.createFramebuffer = function(width, height, opt_depth) {
  return new tdl.framebuffers.Framebuffer(width, height, opt_depth);
};

tdl.framebuffers.createCubeFramebuffer = function(size, opt_depth) {
  return new tdl.framebuffers.CubeFramebuffer(size, opt_depth);
};

tdl.framebuffers.BackBuffer = function(canvas) {
  this.depth = true;
  this.buffer = null;
};

tdl.framebuffers.BackBuffer.prototype.bind = function() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.width, this.height);
};

if (Object.prototype.__defineSetter__) {
tdl.framebuffers.BackBuffer.prototype.__defineGetter__(
    'width',
    function () {
      return gl.drawingBufferWidth || gl.canvas.width;
    }
);

tdl.framebuffers.BackBuffer.prototype.__defineGetter__(
    'height',
    function () {
      return gl.drawingBufferHeight || gl.canvas.height;
    }
);
}

// Use this where you need to pass in a framebuffer, but you really
// mean the backbuffer, so that binding it works as expected.
tdl.framebuffers.getBackBuffer = function(canvas) {
  return new tdl.framebuffers.BackBuffer(canvas)
};

tdl.framebuffers.Framebuffer = function(width, height, opt_depth) {
  this.width = width;
  this.height = height;
  this.depth = opt_depth;
  this.recoverFromLostContext();
};

tdl.framebuffers.Framebuffer.prototype.bind = function() {
  gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
  gl.viewport(0, 0, this.width, this.height);
};

tdl.framebuffers.Framebuffer.unbind = function() {
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(
      0, 0,
      gl.drawingBufferWidth || gl.canvas.width,
      gl.drawingBufferHeight || gl.canvas.height);
};

tdl.framebuffers.Framebuffer.prototype.unbind = function() {
  tdl.framebuffers.Framebuffer.unbind();
};

tdl.framebuffers.Framebuffer.prototype.recoverFromLostContext = function() {
  var tex = new tdl.textures.SolidTexture([0,0,0,0]);
  this.initializeTexture(tex);

  var fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      tex.texture,
      0);

  if (this.depth) {
    if (gl.tdl.depthTexture) {
      var dt = new tdl.textures.DepthTexture(this.width, this.height);
      gl.framebufferTexture2D(
          gl.FRAMEBUFFER,
          gl.DEPTH_ATTACHMENT,
          gl.TEXTURE_2D,
          dt.texture,
          0);
      this.depthTexture = dt;
    } else {
      var db = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, db);
      gl.renderbufferStorage(
          gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.width, this.height);
      gl.framebufferRenderbuffer(
          gl.FRAMEBUFFER,
          gl.DEPTH_ATTACHMENT,
          gl.RENDERBUFFER,
          db);
      gl.bindRenderbuffer(gl.RENDERBUFFER, null);
      this.depthRenderbuffer = db;
    }
  }

  var status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (status != gl.FRAMEBUFFER_COMPLETE && !gl.isContextLost()) {
    throw("gl.checkFramebufferStatus() returned " +
          tdl.webgl.glEnumToString(status));
  }
  this.framebuffer = fb;
  this.texture = tex;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
};

tdl.framebuffers.Framebuffer.prototype.initializeTexture = function(tex) {
  gl.bindTexture(gl.TEXTURE_2D, tex.texture);
  tex.setParameter(gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  tex.setParameter(gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  tex.setParameter(gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  tex.setParameter(gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D,
                0,                 // level
                gl.RGBA,           // internalFormat
                this.width,        // width
                this.height,       // height
                0,                 // border
                gl.RGBA,           // format
                gl.UNSIGNED_BYTE,  // type
                null);             // data
};

tdl.framebuffers.CubeFramebuffer = function(size, opt_depth) {
  this.size = size;
  this.depth = opt_depth;
  this.recoverFromLostContext();
};

tdl.framebuffers.CubeFramebuffer.prototype.bind = function(face) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers[face]);
  gl.viewport(0, 0, this.size, this.size);
};

tdl.framebuffers.CubeFramebuffer.unbind = function() {
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(
      0, 0,
      gl.drawingBufferWidth || gl.canvas.width,
      gl.drawingBufferHeight || gl.canvas.height);
};

tdl.framebuffers.CubeFramebuffer.prototype.unbind = function() {
  tdl.framebuffers.CubeFramebuffer.unbind();
};

tdl.framebuffers.CubeFramebuffer.prototype.recoverFromLostContext = function() {
  var tex = new tdl.textures.CubeMap(this.size);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, tex.texture);
  tex.setParameter(gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  tex.setParameter(gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  tex.setParameter(gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  tex.setParameter(gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  for (var ff = 0; ff < 6; ++ff) {
    gl.texImage2D(tdl.textures.CubeMap.faceTargets[ff],
                  0,                 // level
                  gl.RGBA,           // internalFormat
                  this.size,         // width
                  this.size,         // height
                  0,                 // border
                  gl.RGBA,           // format
                  gl.UNSIGNED_BYTE,  // type
                  null);             // data
  }
  if (this.depth) {
    var db = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, db);
    gl.renderbufferStorage(
        gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.size, this.size);
  }
  this.framebuffers = [];
  for (var ff = 0; ff < 6; ++ff) {
    var fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        tdl.textures.CubeMap.faceTargets[ff],
        tex.texture,
        0);
    if (this.depth) {
      gl.framebufferRenderbuffer(
          gl.FRAMEBUFFER,
          gl.DEPTH_ATTACHMENT,
          gl.RENDERBUFFER,
          db);
    }
    var status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status != gl.FRAMEBUFFER_COMPLETE) {
      throw("gl.checkFramebufferStatus() returned " + WebGLDebugUtils.glEnumToString(status));
    }
    this.framebuffers.push(fb);
  }
  gl.bindRenderbuffer(gl.RENDERBUFFER, null);
  this.texture = tex;
};

tdl.framebuffers.Float32Framebuffer = function(width, height, opt_depth) {
  if (!gl.getExtension("OES_texture_float")) {
    throw("Requires OES_texture_float extension");
  }
  tdl.framebuffers.Framebuffer.call(this, width, height, opt_depth);
};

tdl.base.inherit(tdl.framebuffers.Float32Framebuffer, tdl.framebuffers.Framebuffer);

tdl.framebuffers.Float32Framebuffer.prototype.initializeTexture = function(tex) {
  gl.bindTexture(gl.TEXTURE_2D, tex.texture);
  tex.setParameter(gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  tex.setParameter(gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  tex.setParameter(gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  tex.setParameter(gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D,
                0,                 // level
                gl.RGBA,           // internalFormat
                this.width,        // width
                this.height,       // height
                0,                 // border
                gl.RGBA,           // format
                gl.FLOAT,          // type
                null);             // data
};
/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview This file contains misc functions to deal with
 *               fullscreen.
 */

//tdl.provide('tdl.fullscreen');

/**
 * A module for misc.
 * @namespace
 */
tdl.fullscreen = tdl.fullscreen || {};

tdl.fullscreen.requestFullScreen = function(element) {
  if (element.webkitRequestFullScreen) {
    element.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
  } else if (element.mozRequestFullScreen) {
    element.mozRequestFullScreen();
  }
};

tdl.fullscreen.cancelFullScreen = function(element) {
  if (document.webkitCancelFullScreen) {
    document.webkitCancelFullScreen();
  } else if (document.mozCancelFullScreen) {
    document.mozCancelFullScreen();
  }
};

tdl.fullscreen.onFullScreenChange = function(element, callback) {
  element.addEventListener('fullscreenchange', function(event) {
      callback(document.fullscreenEnabled);
    });
  element.addEventListener('webkitfullscreenchange', function(event) {
      var fullscreenEnabled = document.webkitFullscreenEnabled;
      if (fullscreenEnabled === undefined) {
        fullscreenEnabled = document.webkitIsFullScreen;
      }
      callback(fullscreenEnabled);
    });
  element.addEventListener('mozfullscreenchange', function(event) {
      var fullscreenEnabled = document.mozFullscreenEnabled;
      if (fullscreenEnabled === undefined) {
        fullscreenEnabled = document.mozFullScreen;
      }
      callback(fullscreenEnabled);
    });
};


/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview This file contains various functions and class for io.
 */

//tdl.provide('tdl.io');

/**
 * A Module with various io functions and classes.
 * @namespace
 */
tdl.io = tdl.io || {};

/**
 * Creates a LoadInfo object.
 * @param {XMLHttpRequest} opt_request
 *     The request to watch.
 * @return {!tdl.io.LoadInfo} The new LoadInfo.
 * @see tdl.io.LoadInfo
 */
tdl.io.createLoadInfo = function(opt_request) {
  return new tdl.io.LoadInfo(opt_request);
};

/**
 * A class to help with progress reporting for most loading utilities.
 *
 * Example:
 * <pre>
 * var g_loadInfo = null;
 * g_id = window.setInterval(statusUpdate, 500);
 * g_loadInfo = tdl.scene.loadScene('http://google.com/somescene.js',
 *                                  callback);
 *
 * function callback(exception) {
 *   g_loadInfo = null;
 *   window.clearInterval(g_id);
 *   if (!exception) {
 *     // do something with scene just loaded
 *   }
 * }
 *
 * function statusUpdate() {
 *   if (g_loadInfo) {
 *     var progress = g_loadInfo.getKnownProgressInfoSoFar();
 *     document.getElementById('loadstatus').innerHTML = progress.percent;
 *   }
 * }
 * </pre>
 *
 * @constructor
 * @param {XMLHttpRequest} opt_request
 *     The request to watch.
 * @see tdl.loader.Loader
 */
tdl.io.LoadInfo = function(opt_request) {
  this.request_ = opt_request;
  this.streamLength_ = 0;  // because the request may have been freed.
  this.children_ = [];
};

/**
 * Adds another LoadInfo as a child of this LoadInfo so they can be
 * managed as a group.
 * @param {!tdl.io.LoadInfo} loadInfo The child LoadInfo.
 */
tdl.io.LoadInfo.prototype.addChild = function(loadInfo) {
  this.children_.push(loadInfo);
};

/**
 * Marks this LoadInfo as finished.
 */
tdl.io.LoadInfo.prototype.finish = function() {
  if (this.request_) {
    if (this.hasStatus_) {
      this.streamLength_ = this.request_.streamLength;
    }
    this.request_ = null;
  }
};

/**
 * Gets the total bytes that will be streamed known so far.
 * If you are only streaming 1 file then this will be the info for that file but
 * if you have queued up many files using an tdl.loader.Loader only a couple of
 * files are streamed at a time meaning that the size is not known for files
 * that have yet started to download.
 *
 * If you are downloading many files for your application and you want to
 * provide a progress status you have about 4 options
 *
 * 1) Use LoadInfo.getTotalBytesDownloaded() /
 * LoadInfo.getTotalKnownBytesToStreamSoFar() and just be aware the bar will
 * grown and then shrink as new files start to download and their lengths
 * become known.
 *
 * 2) Use LoadInfo.getTotalRequestsDownloaded() /
 * LoadInfo.getTotalKnownRequestsToStreamSoFar() and be aware the granularity
 * is not all that great since it only reports fully downloaded files. If you
 * are downloading a bunch of small files this might be ok.
 *
 * 3) Put all your files in one archive. Then there will be only one file and
 * method 1 will work well.
 *
 * 4) Figure out the total size in bytes of the files you will download and put
 * that number in your application, then use LoadInfo.getTotalBytesDownloaded()
 * / MY_APPS_TOTAL_BYTES_TO_DOWNLOAD.
 *
 * @return {number} The total number of currently known bytes to be streamed.
 */
tdl.io.LoadInfo.prototype.getTotalKnownBytesToStreamSoFar = function() {
  //if (!this.streamLength_ && this.request_ && this.hasStatus_) {
  //  //
  //  //this.streamLength_ = this.request_.streamLength;
  //}
  var total = this.streamLength_;
  for (var cc = 0; cc < this.children_.length; ++cc) {
    total += this.children_[cc].getTotalKnownBytesToStreamSoFar();
  }
  return total;
};

/**
 * Gets the total bytes downloaded so far.
 * @return {number} The total number of currently known bytes to be streamed.
 */
tdl.io.LoadInfo.prototype.getTotalBytesDownloaded = function() {
  var total = (this.request_ && this.hasStatus_) ?
              this.request_.bytesReceived : this.streamLength_;
  for (var cc = 0; cc < this.children_.length; ++cc) {
    total += this.children_[cc].getTotalBytesDownloaded();
  }
  return total;
};

/**
 * Gets the total streams that will be download known so far.
 * We can't know all the streams since you could use an tdl.loader.Loader
 * object, request some streams, then call this function, then request some
 * more.
 *
 * See LoadInfo.getTotalKnownBytesToStreamSoFar for details.
 * @return {number} The total number of requests currently known to be streamed.
 * @see tdl.io.LoadInfo.getTotalKnownBytesToStreamSoFar
 */
tdl.io.LoadInfo.prototype.getTotalKnownRequestsToStreamSoFar = function() {
  var total = 1;
  for (var cc = 0; cc < this.children_.length; ++cc) {
    total += this.children_[cc].getTotalKnownRequestToStreamSoFar();
  }
  return total;
};

/**
 * Gets the total requests downloaded so far.
 * @return {number} The total requests downloaded so far.
 */
tdl.io.LoadInfo.prototype.getTotalRequestsDownloaded = function() {
  var total = this.request_ ? 0 : 1;
  for (var cc = 0; cc < this.children_.length; ++cc) {
    total += this.children_[cc].getTotalRequestsDownloaded();
  }
  return total;
};

/**
 * Gets progress info.
 * This is commonly formatted version of the information available from a
 * LoadInfo.
 *
 * See LoadInfo.getTotalKnownBytesToStreamSoFar for details.
 * @return {{percent: number, downloaded: string, totalBytes: string,
 *     base: number, suffix: string}} progress info.
 * @see tdl.io.LoadInfo.getTotalKnownBytesToStreamSoFar
 */
tdl.io.LoadInfo.prototype.getKnownProgressInfoSoFar = function() {
  var percent = 0;
  var bytesToDownload = this.getTotalKnownBytesToStreamSoFar();
  var bytesDownloaded = this.getTotalBytesDownloaded();
  if (bytesToDownload > 0) {
    percent = Math.floor(bytesDownloaded / bytesToDownload * 100);
  }

  var base = (bytesToDownload < 1024 * 1024) ? 1024 : (1024 * 1024);

  return {
    percent: percent,
    downloaded: (bytesDownloaded / base).toFixed(2),
    totalBytes: (bytesToDownload / base).toFixed(2),
    base: base,
    suffix: (base == 1024 ? 'kb' : 'mb')}

};

/**
 * Loads text from an external file. This function is synchronous.
 * @param {string} url The url of the external file.
 * @return {string} the loaded text if the request is synchronous.
 */
tdl.io.loadTextFileSynchronous = function(url) {
  var error = 'loadTextFileSynchronous failed to load url "' + url + '"';
  var request;
  if (window.XMLHttpRequest) {
    request = new XMLHttpRequest();
    if (request.overrideMimeType) {
      request.overrideMimeType('text/plain');
    }
  } else if (window.ActiveXObject) {
    request = new ActiveXObject('MSXML2.XMLHTTP.3.0');
  } else {
    throw 'XMLHttpRequest is disabled';
  }
  request.open('GET', url, false);
  request.send(null);
  if (request.readyState != 4) {
    throw error;
  }
  return request.responseText;
};

/**
 * Loads text from an external file. This function is asynchronous.
 * @param {string} url The url of the external file.
 * @param {function(string, *): void} callback A callback passed the loaded
 *     string and an exception which will be null on success.
 * @return {!tdl.io.LoadInfo} A LoadInfo to track progress.
 */
tdl.io.loadTextFile = function(url, callback) {
  var error = 'loadTextFile failed to load url "' + url + '"';
  var request;
  if (window.XMLHttpRequest) {
    request = new XMLHttpRequest();
    if (request.overrideMimeType) {
      request.overrideMimeType('text/plain; charset=utf-8');
    }
  } else if (window.ActiveXObject) {
    request = new ActiveXObject('MSXML2.XMLHTTP.3.0');
  } else {
    throw 'XMLHttpRequest is disabled';
  }
  var loadInfo = tdl.io.createLoadInfo(request, false);
  request.open('GET', url, true);
  var finish = function() {
    if (request.readyState == 4) {
      var text = '';
      // HTTP reports success with a 200 status. The file protocol reports
      // success with zero. HTTP does not use zero as a status code (they
      // start at 100).
      // https://developer.mozilla.org/En/Using_XMLHttpRequest
      var success = request.status == 200 || request.status == 0;
      if (success) {
        text = request.responseText;
      }
      loadInfo.finish();
      callback(text, success ? null : 'could not load: ' + url);
    }
  };
  request.onreadystatechange = finish;
  request.send(null);
  return loadInfo;
};

/**
 * Loads a file from an external file. This function is
 * asynchronous.
 * @param {string} url The url of the external file.
 * @param {function(string, *): void} callback A callback passed the loaded
 *     ArrayBuffer and an exception which will be null on
 *     success.
 * @return {!tdl.io.LoadInfo} A LoadInfo to track progress.
 */
tdl.io.loadArrayBuffer = function(url, callback) {
  var error = 'loadArrayBuffer failed to load url "' + url + '"';
  var request;
  if (window.XMLHttpRequest) {
    request = new XMLHttpRequest();
  } else {
    throw 'XMLHttpRequest is disabled';
  }
  var loadInfo = tdl.io.createLoadInfo(request, false);
  request.open('GET', url, true);
  var finish = function() {
    if (request.readyState == 4) {
      var text = '';
      // HTTP reports success with a 200 status. The file protocol reports
      // success with zero. HTTP does not use zero as a status code (they
      // start at 100).
      // https://developer.mozilla.org/En/Using_XMLHttpRequest
      var success = request.status == 200 || request.status == 0;
      if (success) {
        arrayBuffer = request.response;
      }
      loadInfo.finish();
      callback(arrayBuffer, success ? null : 'could not load: ' + url);
    }
  };
  request.onreadystatechange = finish;
  if (request.responseType === undefined) {
    throw 'no support for binary files';
  }
  request.responseType = "arraybuffer";
  request.send(null);
  return loadInfo;
};

/**
 * Loads JSON from an external file. This function is asynchronous.
 * @param {string} url The url of the external file.
 * @param {function(jsonObject, *): void} callback A callback passed the loaded
 *     json and an exception which will be null on success.
 * @return {!tdl.io.LoadInfo} A LoadInfo to track progress.
 */
tdl.io.loadJSON = function(url, callback) {
  var error = 'loadJSON failed to load url "' + url + '"';
  var request;
  if (window.XMLHttpRequest) {
    request = new XMLHttpRequest();
    if (request.overrideMimeType) {
      request.overrideMimeType('text/plain');
    }
  } else if (window.ActiveXObject) {
    request = new ActiveXObject('MSXML2.XMLHTTP.3.0');
  } else {
    throw 'XMLHttpRequest is disabled';
  }
  var loadInfo = tdl.io.createLoadInfo(request, false);
  request.open('GET', url, true);
  var finish = function() {
    if (request.readyState == 4) {
      var json = undefined;
      // HTTP reports success with a 200 status. The file protocol reports
      // success with zero. HTTP does not use zero as a status code (they
      // start at 100).
      // https://developer.mozilla.org/En/Using_XMLHttpRequest
      var success = request.status == 200 || request.status == 0;
      if (success) {
        try {
          json = JSON.parse(request.responseText);
        } catch (e) {
          success = false;
        }
      }
      loadInfo.finish();
      callback(json, success ? null : 'could not load: ' + url);
    }
  };
  try {
    request.onreadystatechange = finish;
    request.send(null);
  } catch (e) {
    callback(null, 'could not load: ' + url);
  }
  return loadInfo;
};

/**
 * Sends an object. This function is asynchronous.
 * @param {string} url The url of the external file.
 * @param {function(jsonObject, *): void} callback A callback passed the loaded
 *     json and an exception which will be null on success.
 * @return {!tdl.io.LoadInfo} A LoadInfo to track progress.
 */
tdl.io.sendJSON = function(url, jsonObject, callback) {
  var error = 'sendJSON failed to load url "' + url + '"';
  var request;
  if (window.XMLHttpRequest) {
    request = new XMLHttpRequest();
    if (request.overrideMimeType) {
      request.overrideMimeType('text/plain');
    }
  } else if (window.ActiveXObject) {
    request = new ActiveXObject('MSXML2.XMLHTTP.3.0');
  } else {
    throw 'XMLHttpRequest is disabled';
  }
  var loadInfo = tdl.io.createLoadInfo(request, false);
  request.open('POST', url, true);
  var js = JSON.stringify(jsonObject);
  var finish = function() {
    if (request.readyState == 4) {
      var json = undefined;
      // HTTP reports success with a 200 status. The file protocol reports
      // success with zero. HTTP does not use zero as a status code (they
      // start at 100).
      // https://developer.mozilla.org/En/Using_XMLHttpRequest
      var success = request.status == 200 || request.status == 0;
      if (success) {
        try {
          json = JSON.parse(request.responseText);
        } catch (e) {
          success = false;
        }
      }
      loadInfo.finish();
      callback(json, success ? null : 'could not load: ' + url);
    }
  };
  try {
    request.onreadystatechange = finish;
    request.setRequestHeader("Content-type", "application/json");
    request.send(js);
  } catch (e) {
    callback(null, 'could not load: ' + url);
  }
  return loadInfo;
};


/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview This file contains a loader class for helping to load
 *     muliple assets in an asynchronous manner.
 */

//tdl.provide('tdl.loader');

//tdl.require('tdl.io');

/**
 * A Module with a loader class for helping to load muliple assets in an
 * asynchronous manner.
 * @namespace
 */
tdl.loader = tdl.loader || {};

/**
 * A simple Loader class to call some callback when everything has loaded.
 * @constructor
 * @param {!function(): void} onFinished Function to call when final item has
 *        loaded.
 */
tdl.loader.Loader = function(onFinished)  {
  this.count_ = 1;
  this.onFinished_ = onFinished;

  /**
   * The LoadInfo for this loader you can use to track progress.
   * @type {!tdl.io.LoadInfo}
   */
  this.loadInfo = tdl.io.createLoadInfo();
};

/**
 * Creates a Loader for helping to load a bunch of items asychronously.
 *
 * The way you use this is as follows.
 *
 * <pre>
 * var loader = tdl.loader.createLoader(myFinishedCallback);
 * loader.loadTextFile(text1Url, callbackForText);
 * loader.loadTextFile(text2Url, callbackForText);
 * loader.loadTextFile(text3Url, callbackForText);
 * loader.finish();
 * </pre>
 *
 * The loader guarantees that myFinishedCallback will be called after
 * all the items have been loaded.
 *
* @param {!function(): void} onFinished Function to call when final item has
*        loaded.
* @return {!tdl.loader.Loader} A Loader Object.
 */
tdl.loader.createLoader = function(onFinished) {
  return new tdl.loader.Loader(onFinished);
};

/**
 * Loads a text file.
 * @param {string} url URL of scene to load.
 * @param {!function(string, *): void} onTextLoaded Function to call when
 *     the file is loaded. It will be passed the contents of the file as a
 *     string and an exception which is null on success.
 */
tdl.loader.Loader.prototype.loadTextFile = function(url, onTextLoaded) {
  var that = this;  // so the function below can see "this".
  ++this.count_;
  var loadInfo = tdl.io.loadTextFile(url, function(string, exception) {
    onTextLoaded(string, exception);
    that.countDown_();
  });
  this.loadInfo.addChild(loadInfo);
};

/**
 * Creates a loader that is tracked by this loader so that when the new loader
 * is finished it will be reported to this loader.
 * @param {!function(): void} onFinished Function to be called when everything
 *      loaded with this loader has finished.
 * @return {!tdl.loader.Loader} The new Loader.
 */
tdl.loader.Loader.prototype.createLoader = function(onFinished) {
  var that = this;
  ++this.count_;
  var loader = tdl.loader.createLoader(function() {
      onFinished();
      that.countDown_();
  });
  this.loadInfo.addChild(loader.loadInfo);
  return loader;
};

/**
 * Counts down the internal count and if it gets to zero calls the callback.
 * @private
 */
tdl.loader.Loader.prototype.countDown_ = function() {
  --this.count_;
  if (this.count_ === 0) {
    this.onFinished_();
  }
};

/**
 * Finishes the loading process.
 * Actually this just calls countDown_ to account for the count starting at 1.
 */
tdl.loader.Loader.prototype.finish = function() {
  this.countDown_();
};


/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview This file contains objects to deal with logging.
 */

//tdl.provide('tdl.log');

//tdl.require('tdl.string');

/**
 * A module for log.
 * @namespace
 */
tdl.log = tdl.log || {};


/**
 * Wrapped logging function.
 * @param {*} msg The message to log.
 */
tdl.log = function() {
  var str = tdl.string.argsToString(arguments);
  if (window.console && window.console.log) {
    window.console.log(str);
  } else if (window.dump) {
    window.dump(str + "\n");
  }
};

/**
 * Wrapped logging function.
 * @param {*} msg The message to log.
 */
tdl.error = function() {
  var str = tdl.string.argsToString(arguments);
  if (window.console) {
    if (window.console.error) {
      window.console.error(str);
    } else if (window.console.log) {
      window.console.log(str);
    } else if (window.dump) {
      window.dump(str + "\n");
    }
  }
};

/**
 * Dumps an object to the console.
 *
 * @param {!Object} obj Object to dump.
 * @param {string} opt_prefix string to prefix each value with.
 */
tdl.dumpObj = function(obj, opt_prefix) {
  tdl.log(tdl.string.objToString(obj, opt_prefix));
};


/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview This file contains matrix/vector math functions.
 * It adds them to the "math" module on the tdl object.
 *
 * tdl.math supports a row-major and a column-major mode.  In both
 * modes, vectors are stored as arrays of numbers, and matrices are stored as
 * arrays of arrays of numbers.
 *
 * In row-major mode:
 *
 * - Rows of a matrix are sub-arrays.
 * - Individual entries of a matrix M get accessed in M[row][column] fashion.
 * - Tuples of coordinates are interpreted as row-vectors.
 * - A vector v gets transformed by a matrix M by multiplying in the order v*M.
 *
 * In column-major mode:
 *
 * - Columns of a matrix are sub-arrays.
 * - Individual entries of a matrix M get accessed in M[column][row] fashion.
 * - Tuples of coordinates are interpreted as column-vectors.
 * - A matrix M transforms a vector v by multiplying in the order M*v.
 *
 * When a function in tdl.math requires separate row-major and
 * column-major versions, a function with the same name gets added to each of
 * the namespaces tdl.math.rowMajor and tdl.math.columnMajor. The
 * function installRowMajorFunctions() or the function
 * installColumnMajorFunctions() should get called during initialization to
 * establish the mode.  installRowMajorFunctions() works by iterating through
 * the tdl.math.rowMajor namespace and for each function foo, setting
 * tdl.math.foo equal to tdl.math.rowMajor.foo.
 * installRowMajorFunctions() works the same way, iterating over the columnMajor
 * namespace.  At the end of this file, we call installRowMajorFunctions().
 *
 * Switching modes changes two things.  It changes how a matrix is encoded as an
 * array, and it changes how the entries of a matrix get interpreted.  Because
 * those two things change together, the matrix representing a given
 * transformation of space is the same JavaScript object in either mode.
 * One consequence of this is that very few functions require separate row-major
 * and column-major versions.  Typically, a function requires separate versions
 * only if it makes matrix multiplication order explicit, like
 * mulMatrixMatrix(), mulMatrixVector(), or mulVectorMatrix().  Functions which
 * create a new matrix, like scaling(), rotationZYX(), and translation() return
 * the same JavaScript object in either mode, and functions which implicitly
 * multiply like scale(), rotateZYX() and translate() modify the matrix in the
 * same way in either mode.
 *
 * The convention choice made for math functions in this library is independent
 * of the convention choice for how matrices get loaded into shaders.  That
 * convention is determined on a per-shader basis.
 *
 * Other utilities in tdl should avoid making calls to functions that make
 * multiplication order explicit.  Instead they should appeal to functions like:
 *
 * tdl.math.matrix4.transformPoint
 * tdl.math.matrix4.transformDirection
 * tdl.math.matrix4.transformNormal
 * tdl.math.matrix4.transformVector4
 * tdl.math.matrix4.composition
 * tdl.math.matrix4.compose
 *
 * These functions multiply matrices implicitly and internally choose the
 * multiplication order to get the right result.  That way, utilities which use
 * tdl.math work in either major mode.  Note that this does not necessarily
 * mean all sample code will work even if a line is added which switches major
 * modes, but it does mean that calls to tdl still do what they are supposed
 * to.
 *
 */

//tdl.provide('tdl.math');

/**
 * A module for math for tdl.math.
 * @namespace
 */
tdl.math = tdl.math || {};

/**
 * A random seed for the pseudoRandom function.
 * @private
 * @type {number}
 */
tdl.math.randomSeed_ = 0;

/**
 * A constant for the pseudoRandom function
 * @private
 * @type {number}
 */
tdl.math.RANDOM_RANGE_ = Math.pow(2, 32);

/**
 * Functions which deal with 4-by-4 transformation matrices are kept in their
 * own namespsace.
 * @namespace
 */
tdl.math.matrix4 = tdl.math.matrix4 || {};

/**
 * Functions that are specifically row major are kept in their own namespace.
 * @namespace
 */
tdl.math.rowMajor = tdl.math.rowMajor || {};

/**
 * Functions that are specifically column major are kept in their own namespace.
 * @namespace
 */
tdl.math.columnMajor = tdl.math.columnMajor || {};

/**
 * An Array of 2 floats
 * @type {!Array.<number>}
 */
tdl.math.Vector2 = goog.typedef;

/**
 * An Array of 3 floats
 * @type {!Array.<number>}
 */
tdl.math.Vector3 = goog.typedef;

/**
 * An Array of 4 floats
 * @type {!Array.<number>}
 */
tdl.math.Vector4 = goog.typedef;

/**
 * An Array of floats.
 * @type {!Array.<number>}
 */
tdl.math.Vector = goog.typedef;

/**
 * A 1x1 Matrix of floats
 * @type {!Array.<!Array.<number>>}
 */
tdl.math.Matrix1 = goog.typedef;

/**
 * A 2x2 Matrix of floats
 * @type {!Array.<!Array.<number>>}
 */
tdl.math.Matrix2 = goog.typedef;

/**
 * A 3x3 Matrix of floats
 * @type {!Array.<!Array.<number>>}
 */
tdl.math.Matrix3 = goog.typedef;

/**
 * A 4x4 Matrix of floats
 * @type {!Array.<!Array.<number>>}
 */
tdl.math.Matrix4 = goog.typedef;

/**
 * A arbitrary size Matrix of floats
 * @type {!Array.<!Array.<number>>}
 */
tdl.math.Matrix = goog.typedef;

/**
 * Returns a deterministic pseudorandom number between 0 and 1
 * @return {number} a random number between 0 and 1
 */
tdl.math.pseudoRandom = function() {
  var math = tdl.math;
  return (math.randomSeed_ =
          (134775813 * math.randomSeed_ + 1) %
          math.RANDOM_RANGE_) / math.RANDOM_RANGE_;
};

/**
 * Resets the pseudoRandom function sequence.
 */
tdl.math.resetPseudoRandom = function() {
  tdl.math.randomSeed_ = 0;
};

/**
 * Return a random integer between 0 and n-1
 * @param {number} n
 */
tdl.math.randomInt = function(n) {
  return Math.floor(Math.random() * n);
}

/**
 * Converts degrees to radians.
 * @param {number} degrees A value in degrees.
 * @return {number} the value in radians.
 */
tdl.math.degToRad = function(degrees) {
  return degrees * Math.PI / 180;
};

/**
 * Converts radians to degrees.
 * @param {number} radians A value in radians.
 * @return {number} the value in degrees.
 */
tdl.math.radToDeg = function(radians) {
  return radians * 180 / Math.PI;
};

/**
 * Performs linear interpolation on two scalars.
 * Given scalars a and b and interpolation coefficient t, returns
 * (1 - t) * a + t * b.
 * @param {number} a Operand scalar.
 * @param {number} b Operand scalar.
 * @param {number} t Interpolation coefficient.
 * @return {number} The weighted sum of a and b.
 */
tdl.math.lerpScalar = function(a, b, t) {
  return (1 - t) * a + t * b;
};

/**
 * Adds two vectors; assumes a and b have the same dimension.
 * @param {!tdl.math.Vector} a Operand vector.
 * @param {!tdl.math.Vector} b Operand vector.
 * @return {!tdl.math.Vector} The sum of a and b.
 */
tdl.math.addVector = function(a, b) {
  var r = [];
  var aLength = a.length;
  for (var i = 0; i < aLength; ++i)
    r[i] = a[i] + b[i];
  return r;
};

/**
 * Subtracts two vectors.
 * @param {!tdl.math.Vector} a Operand vector.
 * @param {!tdl.math.Vector} b Operand vector.
 * @return {!tdl.math.Vector} The difference of a and b.
 */
tdl.math.subVector = function(a, b) {
  var r = [];
  var aLength = a.length;
  for (var i = 0; i < aLength; ++i)
    r[i] = a[i] - b[i];
  return r;
};

/**
 * Performs linear interpolation on two vectors.
 * Given vectors a and b and interpolation coefficient t, returns
 * (1 - t) * a + t * b.
 * @param {!tdl.math.Vector} a Operand vector.
 * @param {!tdl.math.Vector} b Operand vector.
 * @param {number} t Interpolation coefficient.
 * @return {!tdl.math.Vector} The weighted sum of a and b.
 */
tdl.math.lerpVector = function(a, b, t) {
  var r = [];
  var aLength = a.length;
  for (var i = 0; i < aLength; ++i)
    r[i] = (1 - t) * a[i] + t * b[i];
  return r;
};

/**
 * Clamps a value between 0 and range using a modulo.
 * @param {number} v Value to clamp mod.
 * @param {number} range Range to clamp to.
 * @param {number} opt_rangeStart start of range. Default = 0.
 * @return {number} Clamp modded value.
 */
tdl.math.modClamp = function(v, range, opt_rangeStart) {
  var start = opt_rangeStart || 0;
  if (range < 0.00001) {
    return start;
  }
  v -= start;
  if (v < 0) {
    v -= Math.floor(v / range) * range;
  } else {
    v = v % range;
  }
  return v + start;
};

/**
 * Lerps in a circle.
 * Does a lerp between a and b but inside range so for example if
 * range is 100, a is 95 and b is 5 lerping will go in the positive direction.
 * @param {number} a Start value.
 * @param {number} b Target value.
 * @param {number} t Amount to lerp (0 to 1).
 * @param {number} range Range of circle.
 * @return {number} lerped result.
 */
tdl.math.lerpCircular = function(a, b, t, range) {
  a = tdl.math.modClamp(a, range);
  b = tdl.math.modClamp(b, range);
  var delta = b - a;
  if (Math.abs(delta) > range * 0.5) {
    if (delta > 0) {
      b -= range;
    } else {
      b += range;
    }
  }
  return tdl.math.modClamp(tdl.math.lerpScalar(a, b, t), range);
};

/**
 * Lerps radians.
 * @param {number} a Start value.
 * @param {number} b Target value.
 * @param {number} t Amount to lerp (0 to 1).
 * @return {number} lerped result.
 */
tdl.math.lerpRadian = function(a, b, t) {
  return tdl.math.lerpCircular(a, b, t, Math.PI * 2);
};

/**
 * Divides a vector by a scalar.
 * @param {!tdl.math.Vector} v The vector.
 * @param {number} k The scalar.
 * @return {!tdl.math.Vector} v The vector v divided by k.
 */
tdl.math.divVectorScalar = function(v, k) {
  var r = [];
  var vLength = v.length;
  for (var i = 0; i < vLength; ++i)
    r[i] = v[i] / k;
  return r;
};

/**
 * Computes the dot product of two vectors; assumes that a and b have
 * the same dimension.
 * @param {!tdl.math.Vector} a Operand vector.
 * @param {!tdl.math.Vector} b Operand vector.
 * @return {number} The dot product of a and b.
 */
tdl.math.dot = function(a, b) {
  var r = 0.0;
  var aLength = a.length;
  for (var i = 0; i < aLength; ++i)
    r += a[i] * b[i];
  return r;
};

/**
 * Computes the cross product of two vectors; assumes both vectors have
 * three entries.
 * @param {!tdl.math.Vector} a Operand vector.
 * @param {!tdl.math.Vector} b Operand vector.
 * @return {!tdl.math.Vector} The vector a cross b.
 */
tdl.math.cross = function(a, b) {
  return [a[1] * b[2] - a[2] * b[1],
          a[2] * b[0] - a[0] * b[2],
          a[0] * b[1] - a[1] * b[0]];
};

/**
 * Computes the Euclidean length of a vector, i.e. the square root of the
 * sum of the squares of the entries.
 * @param {!tdl.math.Vector} a The vector.
 * @return {number} The length of a.
 */
tdl.math.length = function(a) {
  var r = 0.0;
  var aLength = a.length;
  for (var i = 0; i < aLength; ++i)
    r += a[i] * a[i];
  return Math.sqrt(r);
};

/**
 * Computes the square of the Euclidean length of a vector, i.e. the sum
 * of the squares of the entries.
 * @param {!tdl.math.Vector} a The vector.
 * @return {number} The square of the length of a.
 */
tdl.math.lengthSquared = function(a) {
  var r = 0.0;
  var aLength = a.length;
  for (var i = 0; i < aLength; ++i)
    r += a[i] * a[i];
  return r;
};

/**
 * Computes the Euclidean distance between two vectors.
 * @param {!tdl.math.Vector} a A vector.
 * @param {!tdl.math.Vector} b A vector.
 * @return {number} The distance between a and b.
 */
tdl.math.distance = function(a, b) {
  var r = 0.0;
  var aLength = a.length;
  for (var i = 0; i < aLength; ++i) {
    var t = a[i] - b[i];
    r += t * t;
  }
  return Math.sqrt(r);
};

/**
 * Computes the square of the Euclidean distance between two vectors.
 * @param {!tdl.math.Vector} a A vector.
 * @param {!tdl.math.Vector} b A vector.
 * @return {number} The distance between a and b.
 */
tdl.math.distanceSquared = function(a, b) {
  var r = 0.0;
  var aLength = a.length;
  for (var i = 0; i < aLength; ++i) {
    var t = a[i] - b[i];
    r += t * t;
  }
  return r;
};

/**
 * Divides a vector by its Euclidean length and returns the quotient.
 * @param {!tdl.math.Vector} a The vector.
 * @return {!tdl.math.Vector} The normalized vector.
 */
tdl.math.normalize = function(a) {
  var r = [];
  var n = 0.0;
  var aLength = a.length;
  for (var i = 0; i < aLength; ++i)
    n += a[i] * a[i];
  n = Math.sqrt(n);
  if (n > 0.00001) {
    for (var i = 0; i < aLength; ++i)
      r[i] = a[i] / n;
  } else {
    r = [0,0,0];
  }
  return r;
};

/**
 * Adds two matrices; assumes a and b are the same size.
 * @param {!tdl.math.Matrix} a Operand matrix.
 * @param {!tdl.math.Matrix} b Operand matrix.
 * @return {!tdl.math.Matrix} The sum of a and b.
 */
tdl.math.addMatrix = function(a, b) {
  var r = [];
  var aLength = a.length;
  var a0Length = a[0].length;
  for (var i = 0; i < aLength; ++i) {
    var row = [];
    var ai = a[i];
    var bi = b[i];
    for (var j = 0; j < a0Length; ++j)
      row[j] = ai[j] + bi[j];
    r[i] = row;
  }
  return r;
};

/**
 * Subtracts two matrices; assumes a and b are the same size.
 * @param {!tdl.math.Matrix} a Operand matrix.
 * @param {!tdl.math.Matrix} b Operand matrix.
 * @return {!tdl.math.Matrix} The sum of a and b.
 */
tdl.math.subMatrix = function(a, b) {
  var r = [];
  var aLength = a.length;
  var a0Length = a[0].length;
  for (var i = 0; i < aLength; ++i) {
    var row = [];
    var ai = a[i];
    var bi = b[i];
    for (var j = 0; j < a0Length; ++j)
      row[j] = ai[j] - bi[j];
    r[i] = row;
  }
  return r;
};

/**
 * Performs linear interpolation on two matrices.
 * Given matrices a and b and interpolation coefficient t, returns
 * (1 - t) * a + t * b.
 * @param {!tdl.math.Matrix} a Operand matrix.
 * @param {!tdl.math.Matrix} b Operand matrix.
 * @param {number} t Interpolation coefficient.
 * @return {!tdl.math.Matrix} The weighted of a and b.
 */
tdl.math.lerpMatrix = function(a, b, t) {
  var r = [];
  var aLength = a.length;
  for (var i = 0; i < aLength; ++i) {
    r[i] = (1 - t) * a[i] + t * b[i];
  }
  return r;
};

/**
 * Divides a matrix by a scalar.
 * @param {!tdl.math.Matrix} m The matrix.
 * @param {number} k The scalar.
 * @return {!tdl.math.Matrix} The matrix m divided by k.
 */
tdl.math.divMatrixScalar = function(m, k) {
  var r = [];
  var mLength = m.length;
  for (var i = 0; i < mLength; ++i) {
    r[i] = m[i] / k;
  }
  return r;
};

/**
 * Negates a scalar.
 * @param {number} a The scalar.
 * @return {number} -a.
 */
tdl.math.negativeScalar = function(a) {
 return -a;
};

/**
 * Negates a vector.
 * @param {!tdl.math.Vector} v The vector.
 * @return {!tdl.math.Vector} -v.
 */
tdl.math.negativeVector = function(v) {
 var r = [];
 var vLength = v.length;
 for (var i = 0; i < vLength; ++i) {
   r[i] = -v[i];
 }
 return r;
};

/**
 * Negates a matrix.
 * @param {!tdl.math.Matrix} m The matrix.
 * @return {!tdl.math.Matrix} -m.
 */
tdl.math.negativeMatrix = function(m) {
 var r = [];
 var mLength = m.length;
 for (var i = 0; i < mLength; ++i) {
   r[i] = -m[i];
 }
 return r;
};

/**
 * Copies a scalar.
 * @param {number} a The scalar.
 * @return {number} a.
 */
tdl.math.copyScalar = function(a) {
  return a;
};

/**
 * Copies a vector.
 * @param {!tdl.math.Vector} v The vector.
 * @return {!tdl.math.Vector} A copy of v.
 */
tdl.math.copyVector = function(v) {
  var r = [];
  for (var i = 0; i < v.length; i++)
    r[i] = v[i];
  return r;
};

/**
 * Copies a matrix.
 * @param {!tdl.math.Matrix} m The matrix.
 * @return {!tdl.math.Matrix} A copy of m.
 */
tdl.math.copyMatrix = function(m) {
  var r = [];
  var mLength = m.length;
  for (var i = 0; i < mLength; ++i) {
    r[i] = m[i];
  }
  return r;
};

/**
 * Multiplies two scalars.
 * @param {number} a Operand scalar.
 * @param {number} b Operand scalar.
 * @return {number} The product of a and b.
 */
tdl.math.mulScalarScalar = function(a, b) {
  return a * b;
};

/**
 * Multiplies a scalar by a vector.
 * @param {number} k The scalar.
 * @param {!tdl.math.Vector} v The vector.
 * @return {!tdl.math.Vector} The product of k and v.
 */
tdl.math.mulScalarVector = function(k, v) {
  var r = [];
  var vLength = v.length;
  for (var i = 0; i < vLength; ++i) {
    r[i] = k * v[i];
  }
  return r;
};

/**
 * Multiplies a vector by a scalar.
 * @param {!tdl.math.Vector} v The vector.
 * @param {number} k The scalar.
 * @return {!tdl.math.Vector} The product of k and v.
 */
tdl.math.mulVectorScalar = function(v, k) {
  return tdl.math.mulScalarVector(k, v);
};

/**
 * Multiplies a scalar by a matrix.
 * @param {number} k The scalar.
 * @param {!tdl.math.Matrix} m The matrix.
 * @return {!tdl.math.Matrix} The product of m and k.
 */
tdl.math.mulScalarMatrix = function(k, m) {
  var r = [];
  var mLength = m.length;
  for (var i = 0; i < mLength; ++i) {
    r[i] = k * m[i];
  }
  return r;
};

/**
 * Multiplies a matrix by a scalar.
 * @param {!tdl.math.Matrix} m The matrix.
 * @param {number} k The scalar.
 * @return {!tdl.math.Matrix} The product of m and k.
 */
tdl.math.mulMatrixScalar = function(m, k) {
  return tdl.math.mulScalarMatrix(k, m);
};

/**
 * Multiplies a vector by another vector (component-wise); assumes a and
 * b have the same length.
 * @param {!tdl.math.Vector} a Operand vector.
 * @param {!tdl.math.Vector} b Operand vector.
 * @return {!tdl.math.Vector} The vector of products of entries of a and
 *     b.
 */
tdl.math.mulVectorVector = function(a, b) {
  var r = [];
  var aLength = a.length;
  for (var i = 0; i < aLength; ++i)
    r[i] = a[i] * b[i];
  return r;
};

/**
 * Divides a vector by another vector (component-wise); assumes a and
 * b have the same length.
 * @param {!tdl.math.Vector} a Operand vector.
 * @param {!tdl.math.Vector} b Operand vector.
 * @return {!tdl.math.Vector} The vector of quotients of entries of a and
 *     b.
 */
tdl.math.divVectorVector = function(a, b) {
  var r = [];
  var aLength = a.length;
  for (var i = 0; i < aLength; ++i)
    r[i] = a[i] / b[i];
  return r;
};

/**
 * Multiplies a vector by a matrix; treats the vector as a row vector; assumes
 * matrix entries are accessed in [row][column] fashion.
 * @param {!tdl.math.Vector} v The vector.
 * @param {!tdl.math.Matrix} m The matrix.
 * @return {!tdl.math.Vector} The product of v and m as a row vector.
 */
tdl.math.rowMajor.mulVectorMatrix4 = function(v, m) {
  var r = [];
  for (var i = 0; i < 4; ++i) {
    r[i] = 0.0;
    for (var j = 0; j < 4; ++j)
      r[i] += v[j] * m[j * 4 + i];
  }
  return r;
};

/**
 * Multiplies a vector by a matrix; treats the vector as a row vector; assumes
 * matrix entries are accessed in [column][row] fashion.
 * @param {!tdl.math.Vector} v The vector.
 * @param {!tdl.math.Matrix} m The matrix.
 * @return {!tdl.math.Vector} The product of v and m as a row vector.
 */
tdl.math.columnMajor.mulVectorMatrix = function(v, m) {
  var r = [];
  for (var i = 0; i < 4; ++i) {
    r[i] = 0.0;
    for (var j = 0; j < 4; ++j)
      r[i] += v[j] * r[i * 4 +  j];
  }
  return r;
};

/**
 * Multiplies a vector by a matrix; treats the vector as a row vector.
 * @param {!tdl.math.Matrix} m The matrix.
 * @param {!tdl.math.Vector} v The vector.
 * @return {!tdl.math.Vector} The product of m and v as a row vector.
 */
tdl.math.mulVectorMatrix = null;

/**
 * Multiplies a matrix by a vector; treats the vector as a column vector.
 * assumes matrix entries are accessed in [row][column] fashion.
 * @param {!tdl.math.Matrix} m The matrix.
 * @param {!tdl.math.Vector} v The vector.
 * @return {!tdl.math.Vector} The product of m and v as a column vector.
 */
tdl.math.rowMajor.mulMatrixVector = function(m, v) {
  var r = [];
  for (var i = 0; i < 4; ++i) {
    r[i] = 0.0;
    for (var j = 0; j < 4; ++j)
      r[i] += m[i * 4 + j] * v[j];
  }
  return r;
};

/**
 * Multiplies a matrix by a vector; treats the vector as a column vector;
 * assumes matrix entries are accessed in [column][row] fashion.
 * @param {!tdl.math.Matrix} m The matrix.
 * @param {!tdl.math.Vector} v The vector.
 * @return {!tdl.math.Vector} The product of m and v as a column vector.
 */
tdl.math.columnMajor.mulMatrixVector = function(m, v) {
  var r = [];
  for (var i = 0; i < 4; ++i) {
    r[i] = 0.0;
    for (var j = 0; j < 4; ++j)
      r[i] += v[j] * m[j * 4 + i];
  }
  return r;
};

/**
 * Multiplies a matrix by a vector; treats the vector as a column vector.
 * @param {!tdl.math.Matrix} m The matrix.
 * @param {!tdl.math.Vector} v The vector.
 * @return {!tdl.math.Vector} The product of m and v as a column vector.
 */
tdl.math.mulMatrixVector = null;

/**
 * Multiplies two 2-by-2 matrices; assumes that the given matrices are 2-by-2;
 * assumes matrix entries are accessed in [row][column] fashion.
 * @param {!tdl.math.Matrix2} a The matrix on the left.
 * @param {!tdl.math.Matrix2} b The matrix on the right.
 * @return {!tdl.math.Matrix2} The matrix product of a and b.
 */
tdl.math.rowMajor.mulMatrixMatrix2 = function(a, b) {
  var a00 = a[0*2+0];
  var a01 = a[0*2+1];
  var a10 = a[1*2+0];
  var a11 = a[1*2+1];
  var b00 = b[0*2+0];
  var b01 = b[0*2+1];
  var b10 = b[1*2+0];
  var b11 = b[1*2+1];
  return [a00 * b00 + a01 * b10, a00 * b01 + a01 * b11,
          a10 * b00 + a11 * b10, a10 * b01 + a11 * b11];
};

/**
 * Multiplies two 2-by-2 matrices; assumes that the given matrices are 2-by-2;
 * assumes matrix entries are accessed in [column][row] fashion.
 * @param {!tdl.math.Matrix2} a The matrix on the left.
 * @param {!tdl.math.Matrix2} b The matrix on the right.
 * @return {!tdl.math.Matrix2} The matrix product of a and b.
 */
tdl.math.columnMajor.mulMatrixMatrix2 = function(a, b) {
  var a00 = a[0*2+0];
  var a01 = a[0*2+1];
  var a10 = a[1*2+0];
  var a11 = a[1*2+1];
  var b00 = b[0*2+0];
  var b01 = b[0*2+1];
  var b10 = b[1*2+0];
  var b11 = b[1*2+1];
  return [a00 * b00 + a10 * b01, a01 * b00 + a11 * b01,
          a00 * b10 + a10 * b11, a01 * b10 + a11 * b11];
};

/**
 * Multiplies two 2-by-2 matrices.
 * @param {!tdl.math.Matrix2} a The matrix on the left.
 * @param {!tdl.math.Matrix2} b The matrix on the right.
 * @return {!tdl.math.Matrix2} The matrix product of a and b.
 */
tdl.math.mulMatrixMatrix2 = null;


/**
 * Multiplies two 3-by-3 matrices; assumes that the given matrices are 3-by-3;
 * assumes matrix entries are accessed in [row][column] fashion.
 * @param {!tdl.math.Matrix3} a The matrix on the left.
 * @param {!tdl.math.Matrix3} b The matrix on the right.
 * @return {!tdl.math.Matrix3} The matrix product of a and b.
 */
tdl.math.rowMajor.mulMatrixMatrix3 = function(a, b) {
  var a00 = a[0*3+0];
  var a01 = a[0*3+1];
  var a02 = a[0*3+2];
  var a10 = a[1*3+0];
  var a11 = a[1*3+1];
  var a12 = a[1*3+2];
  var a20 = a[2*3+0];
  var a21 = a[2*3+1];
  var a22 = a[2*3+2];
  var b00 = b[0*3+0];
  var b01 = b[0*3+1];
  var b02 = b[0*3+2];
  var b10 = b[1*3+0];
  var b11 = b[1*3+1];
  var b12 = b[1*3+2];
  var b20 = b[2*3+0];
  var b21 = b[2*3+1];
  var b22 = b[2*3+2];
  return [a00 * b00 + a01 * b10 + a02 * b20,
          a00 * b01 + a01 * b11 + a02 * b21,
          a00 * b02 + a01 * b12 + a02 * b22,
          a10 * b00 + a11 * b10 + a12 * b20,
          a10 * b01 + a11 * b11 + a12 * b21,
          a10 * b02 + a11 * b12 + a12 * b22,
          a20 * b00 + a21 * b10 + a22 * b20,
          a20 * b01 + a21 * b11 + a22 * b21,
          a20 * b02 + a21 * b12 + a22 * b22];
};

/**
 * Multiplies two 3-by-3 matrices; assumes that the given matrices are 3-by-3;
 * assumes matrix entries are accessed in [column][row] fashion.
 * @param {!tdl.math.Matrix3} a The matrix on the left.
 * @param {!tdl.math.Matrix3} b The matrix on the right.
 * @return {!tdl.math.Matrix3} The matrix product of a and b.
 */
tdl.math.columnMajor.mulMatrixMatrix3 = function(a, b) {
  var a00 = a[0*3+0];
  var a01 = a[0*3+1];
  var a02 = a[0*3+2];
  var a10 = a[1*3+0];
  var a11 = a[1*3+1];
  var a12 = a[1*3+2];
  var a20 = a[2*3+0];
  var a21 = a[2*3+1];
  var a22 = a[2*3+2];
  var b00 = b[0*3+0];
  var b01 = b[0*3+1];
  var b02 = b[0*3+2];
  var b10 = b[1*3+0];
  var b11 = b[1*3+1];
  var b12 = b[1*3+2];
  var b20 = b[2*3+0];
  var b21 = b[2*3+1];
  var b22 = b[2*3+2];
  return [a00 * b00 + a10 * b01 + a20 * b02,
          a01 * b00 + a11 * b01 + a21 * b02,
          a02 * b00 + a12 * b01 + a22 * b02,
          a00 * b10 + a10 * b11 + a20 * b12,
          a01 * b10 + a11 * b11 + a21 * b12,
          a02 * b10 + a12 * b11 + a22 * b12,
          a00 * b20 + a10 * b21 + a20 * b22,
          a01 * b20 + a11 * b21 + a21 * b22,
          a02 * b20 + a12 * b21 + a22 * b22];
};

/**
 * Multiplies two 3-by-3 matrices; assumes that the given matrices are 3-by-3.
 * @param {!tdl.math.Matrix3} a The matrix on the left.
 * @param {!tdl.math.Matrix3} b The matrix on the right.
 * @return {!tdl.math.Matrix3} The matrix product of a and b.
 */
tdl.math.mulMatrixMatrix3 = null;

/**
 * Multiplies two 4-by-4 matrices; assumes that the given matrices are 4-by-4;
 * assumes matrix entries are accessed in [row][column] fashion.
 * @param {!tdl.math.Matrix4} a The matrix on the left.
 * @param {!tdl.math.Matrix4} b The matrix on the right.
 * @return {!tdl.math.Matrix4} The matrix product of a and b.
 */
tdl.math.rowMajor.mulMatrixMatrix4 = function(a, b) {
  var a00 = a[0*4+0];
  var a01 = a[0*4+1];
  var a02 = a[0*4+2];
  var a03 = a[0*4+3];
  var a10 = a[1*4+0];
  var a11 = a[1*4+1];
  var a12 = a[1*4+2];
  var a13 = a[1*4+3];
  var a20 = a[2*4+0];
  var a21 = a[2*4+1];
  var a22 = a[2*4+2];
  var a23 = a[2*4+3];
  var a30 = a[3*4+0];
  var a31 = a[3*4+1];
  var a32 = a[3*4+2];
  var a33 = a[3*4+3];
  var b00 = b[0*4+0];
  var b01 = b[0*4+1];
  var b02 = b[0*4+2];
  var b03 = b[0*4+3];
  var b10 = b[1*4+0];
  var b11 = b[1*4+1];
  var b12 = b[1*4+2];
  var b13 = b[1*4+3];
  var b20 = b[2*4+0];
  var b21 = b[2*4+1];
  var b22 = b[2*4+2];
  var b23 = b[2*4+3];
  var b30 = b[3*4+0];
  var b31 = b[3*4+1];
  var b32 = b[3*4+2];
  var b33 = b[3*4+3];
  return [a00 * b00 + a01 * b10 + a02 * b20 + a03 * b30,
          a00 * b01 + a01 * b11 + a02 * b21 + a03 * b31,
          a00 * b02 + a01 * b12 + a02 * b22 + a03 * b32,
          a00 * b03 + a01 * b13 + a02 * b23 + a03 * b33,
          a10 * b00 + a11 * b10 + a12 * b20 + a13 * b30,
          a10 * b01 + a11 * b11 + a12 * b21 + a13 * b31,
          a10 * b02 + a11 * b12 + a12 * b22 + a13 * b32,
          a10 * b03 + a11 * b13 + a12 * b23 + a13 * b33,
          a20 * b00 + a21 * b10 + a22 * b20 + a23 * b30,
          a20 * b01 + a21 * b11 + a22 * b21 + a23 * b31,
          a20 * b02 + a21 * b12 + a22 * b22 + a23 * b32,
          a20 * b03 + a21 * b13 + a22 * b23 + a23 * b33,
          a30 * b00 + a31 * b10 + a32 * b20 + a33 * b30,
          a30 * b01 + a31 * b11 + a32 * b21 + a33 * b31,
          a30 * b02 + a31 * b12 + a32 * b22 + a33 * b32,
          a30 * b03 + a31 * b13 + a32 * b23 + a33 * b33];
};

/**
 * Multiplies two 4-by-4 matrices; assumes that the given matrices are 4-by-4;
 * assumes matrix entries are accessed in [column][row] fashion.
 * @param {!tdl.math.Matrix4} a The matrix on the left.
 * @param {!tdl.math.Matrix4} b The matrix on the right.
 * @return {!tdl.math.Matrix4} The matrix product of a and b.
 */
tdl.math.columnMajor.mulMatrixMatrix4 = function(a, b) {
  var a00 = a[0*4+0];
  var a01 = a[0*4+1];
  var a02 = a[0*4+2];
  var a03 = a[0*4+3];
  var a10 = a[1*4+0];
  var a11 = a[1*4+1];
  var a12 = a[1*4+2];
  var a13 = a[1*4+3];
  var a20 = a[2*4+0];
  var a21 = a[2*4+1];
  var a22 = a[2*4+2];
  var a23 = a[2*4+3];
  var a30 = a[3*4+0];
  var a31 = a[3*4+1];
  var a32 = a[3*4+2];
  var a33 = a[3*4+3];
  var b00 = b[0*4+0];
  var b01 = b[0*4+1];
  var b02 = b[0*4+2];
  var b03 = b[0*4+3];
  var b10 = b[1*4+0];
  var b11 = b[1*4+1];
  var b12 = b[1*4+2];
  var b13 = b[1*4+3];
  var b20 = b[2*4+0];
  var b21 = b[2*4+1];
  var b22 = b[2*4+2];
  var b23 = b[2*4+3];
  var b30 = b[3*4+0];
  var b31 = b[3*4+1];
  var b32 = b[3*4+2];
  var b33 = b[3*4+3];
  return [a00 * b00 + a10 * b01 + a20 * b02 + a30 * b03,
          a01 * b00 + a11 * b01 + a21 * b02 + a31 * b03,
          a02 * b00 + a12 * b01 + a22 * b02 + a32 * b03,
          a03 * b00 + a13 * b01 + a23 * b02 + a33 * b03,
          a00 * b10 + a10 * b11 + a20 * b12 + a30 * b13,
          a01 * b10 + a11 * b11 + a21 * b12 + a31 * b13,
          a02 * b10 + a12 * b11 + a22 * b12 + a32 * b13,
          a03 * b10 + a13 * b11 + a23 * b12 + a33 * b13,
          a00 * b20 + a10 * b21 + a20 * b22 + a30 * b23,
          a01 * b20 + a11 * b21 + a21 * b22 + a31 * b23,
          a02 * b20 + a12 * b21 + a22 * b22 + a32 * b23,
          a03 * b20 + a13 * b21 + a23 * b22 + a33 * b23,
          a00 * b30 + a10 * b31 + a20 * b32 + a30 * b33,
          a01 * b30 + a11 * b31 + a21 * b32 + a31 * b33,
          a02 * b30 + a12 * b31 + a22 * b32 + a32 * b33,
          a03 * b30 + a13 * b31 + a23 * b32 + a33 * b33];
};

/**
 * Multiplies two 4-by-4 matrices; assumes that the given matrices are 4-by-4.
 * @param {!tdl.math.Matrix4} a The matrix on the left.
 * @param {!tdl.math.Matrix4} b The matrix on the right.
 * @return {!tdl.math.Matrix4} The matrix product of a and b.
 */
tdl.math.mulMatrixMatrix4 = null;

/**
 * Multiplies two matrices; assumes that the sizes of the matrices are
 * appropriately compatible; assumes matrix entries are accessed in
 * [row][column] fashion.
 * @param {!tdl.math.Matrix} a The matrix on the left.
 * @param {!tdl.math.Matrix} b The matrix on the right.
 * @return {!tdl.math.Matrix} The matrix product of a and b.
 */
tdl.math.rowMajor.mulMatrixMatrix = function(a, b) {
  var r = [];
  for (var i = 0; i < 4; ++i) {
    for (var j = 0; j < 4; ++j) {
      r[i*4+j] = 0.0;
      for (var k = 0; k < 4; ++k)
        r[i*4+j] += a[i*4+k] * b[k*4+j]; // kth row, jth column.
    }
  }
  return r;
};

/**
 * Multiplies two matrices; assumes that the sizes of the matrices are
 * appropriately compatible; assumes matrix entries are accessed in
 * [row][column] fashion.
 * @param {!tdl.math.Matrix} a The matrix on the left.
 * @param {!tdl.math.Matrix} b The matrix on the right.
 * @return {!tdl.math.Matrix} The matrix product of a and b.
 */
tdl.math.columnMajor.mulMatrixMatrix = function(a, b) {
  var r = [];
  for (var i = 0; i < 4; ++i) {
    for (var j = 0; j < 4; ++j) {
      r[i*4+j] = 0.0;
      for (var k = 0; k < 4; ++k)
        r[i*4+j] += b[i*4+k] * a[k*4+j]; // kth column, jth row.
    }
  }
  return r;
};

/**
 * Multiplies two matrices; assumes that the sizes of the matrices are
 * appropriately compatible.
 * @param {!tdl.math.Matrix} a The matrix on the left.
 * @param {!tdl.math.Matrix} b The matrix on the right.
 * @return {!tdl.math.Matrix} The matrix product of a and b.
 */
tdl.math.mulMatrixMatrix = null;

/**
 * Gets the jth column of the given matrix m; assumes matrix entries are
 * accessed in [row][column] fashion.
 * @param {!tdl.math.Matrix} m The matrix.
 * @param {number} j The index of the desired column.
 * @return {!tdl.math.Vector} The jth column of m as a vector.
 */
tdl.math.rowMajor.column = function(m, j) {
  var r = [];
  for (var i = 0; i < 4; ++i) {
    r[i] = m[i*4+j];
  }
  return r;
};

/**
 * Gets the jth column of the given matrix m; assumes matrix entries are
 * accessed in [column][row] fashion.
 * @param {!tdl.math.Matrix} m The matrix.
 * @param {number} j The index of the desired column.
 * @return {!tdl.math.Vector} The jth column of m as a vector.
 */
tdl.math.columnMajor.column = function(m, j) {
  var r = [];
  for (var i = 0; i < 4; ++i) {
    r[i] = m[j*4+i];
  }
  return r;
};

/**
 * Gets the jth column of the given matrix m.
 * @param {!tdl.math.Matrix} m The matrix.
 * @param {number} j The index of the desired column.
 * @return {!tdl.math.Vector} The jth column of m as a vector.
 */
tdl.math.column = null;

/**
 * Gets the ith row of the given matrix m; assumes matrix entries are
 * accessed in [row][column] fashion.
 * @param {!tdl.math.Matrix} m The matrix.
 * @param {number} i The index of the desired row.
 * @return {!tdl.math.Vector} The ith row of m.
 */
tdl.math.rowMajor.row = function(m, i) {
  var r = [];
  for (var j = 0; j < 4; ++j) {
    r[i] = m[i*4+j];
  }
  return r;
};

/**
 * Gets the ith row of the given matrix m; assumes matrix entries are
 * accessed in [column][row] fashion.
 * @param {!tdl.math.Matrix} m The matrix.
 * @param {number} i The index of the desired row.
 * @param {number} opt_size Unknown (to dkogan)
 * @return {!tdl.math.Vector} The ith row of m.
 */
tdl.math.columnMajor.row = function(m, i, opt_size) {
  opt_size = opt_size || 4;
  var r = [];
  for (var j = 0; j < opt_size; ++j) {
    r[j] = m[j*opt_size+i];
  }
  return r;
};

/**
 * Gets the ith row of the given matrix m.
 * @param {!tdl.math.Matrix} m The matrix.
 * @param {number} i The index of the desired row.
 * @return {!tdl.math.Vector} The ith row of m.
 */
tdl.math.row = null;

/**
 * Takes the transpose of a matrix.
 * @param {!tdl.math.Matrix} m The matrix.
 * @return {!tdl.math.Matrix} The transpose of m.
 */
tdl.math.transpose = function(m) {
  var r = [];
  var m00 = m[0 * 4 + 0];
  var m01 = m[0 * 4 + 1];
  var m02 = m[0 * 4 + 2];
  var m03 = m[0 * 4 + 3];
  var m10 = m[1 * 4 + 0];
  var m11 = m[1 * 4 + 1];
  var m12 = m[1 * 4 + 2];
  var m13 = m[1 * 4 + 3];
  var m20 = m[2 * 4 + 0];
  var m21 = m[2 * 4 + 1];
  var m22 = m[2 * 4 + 2];
  var m23 = m[2 * 4 + 3];
  var m30 = m[3 * 4 + 0];
  var m31 = m[3 * 4 + 1];
  var m32 = m[3 * 4 + 2];
  var m33 = m[3 * 4 + 3];

  r[ 0] = m00;
  r[ 1] = m10;
  r[ 2] = m20;
  r[ 3] = m30;
  r[ 4] = m01;
  r[ 5] = m11;
  r[ 6] = m21;
  r[ 7] = m31;
  r[ 8] = m02;
  r[ 9] = m12;
  r[10] = m22;
  r[11] = m32;
  r[12] = m03;
  r[13] = m13;
  r[14] = m23;
  r[15] = m33;
  return r;
};

/**
 * Computes the trace (sum of the diagonal entries) of a square matrix;
 * assumes m is square.
 * @param {!tdl.math.Matrix} m The matrix.
 * @return {number} The trace of m.
 */
tdl.math.trace = function(m) {
  var r = 0.0;
  for (var i = 0; i < 4; ++i)
    r += m[i*4+i];
  return r;
};

/**
 * Computes the determinant of a 1-by-1 matrix.
 * @param {!tdl.math.Matrix1} m The matrix.
 * @return {number} The determinant of m.
 */
tdl.math.det1 = function(m) {
  return m[0];
};

/**
 * Computes the determinant of a 2-by-2 matrix.
 * @param {!tdl.math.Matrix2} m The matrix.
 * @return {number} The determinant of m.
 */
tdl.math.det2 = function(m) {
  return m[0*2+0] * m[1*2+1] - m[0*2+1] * m[1*2+0];
};

/**
 * Computes the determinant of a 3-by-3 matrix.
 * @param {!tdl.math.Matrix3} m The matrix.
 * @return {number} The determinant of m.
 */
tdl.math.det3 = function(m) {
  return m[2*3+2] * (m[0*3+0] * m[1*3+1] - m[0*3+1] * m[1*3+0]) -
         m[2*3+1] * (m[0*3+0] * m[1*3+2] - m[0*3+2] * m[1*3+0]) +
         m[2*3+0] * (m[0*3+1] * m[1*3+2] - m[0*3+2] * m[1*3+1]);
};

/**
 * Computes the determinant of a 4-by-4 matrix.
 * @param {!tdl.math.Matrix4} m The matrix.
 * @return {number} The determinant of m.
 */
tdl.math.det4 = function(m) {
  var t01 = m[0*4+0] * m[1*4+1] - m[0*4+1] * m[1*4+0];
  var t02 = m[0*4+0] * m[1*4+2] - m[0*4+2] * m[1*4+0];
  var t03 = m[0*4+0] * m[1*4+3] - m[0*4+3] * m[1*4+0];
  var t12 = m[0*4+1] * m[1*4+2] - m[0*4+2] * m[1*4+1];
  var t13 = m[0*4+1] * m[1*4+3] - m[0*4+3] * m[1*4+1];
  var t23 = m[0*4+2] * m[1*4+3] - m[0*4+3] * m[1*4+2];
  return m[3*4+3] * (m[2*4+2] * t01 - m[2*4+1] * t02 + m[2*4+0] * t12) -
         m[3*4+2] * (m[2*4+3] * t01 - m[2*4+1] * t03 + m[2*4+0] * t13) +
         m[3*4+1] * (m[2*4+3] * t02 - m[2*4+2] * t03 + m[2*4+0] * t23) -
         m[3*4+0] * (m[2*4+3] * t12 - m[2*4+2] * t13 + m[2*4+1] * t23);
};

/**
 * Computes the inverse of a 1-by-1 matrix.
 * @param {!tdl.math.Matrix1} m The matrix.
 * @return {!tdl.math.Matrix1} The inverse of m.
 */
tdl.math.inverse1 = function(m) {
  return [[1.0 / m[0]]];
};

/**
 * Computes the inverse of a 2-by-2 matrix.
 * @param {!tdl.math.Matrix2} m The matrix.
 * @return {!tdl.math.Matrix2} The inverse of m.
 */
tdl.math.inverse2 = function(m) {
  var d = 1.0 / (m[0*2+0] * m[1*2+1] - m[0*2+1] * m[1*2+0]);
  return [d * m[1*2+1], -d * m[0*2+1], -d * m[1*2+0], d * m[0*2+0]];
};

/**
 * Computes the inverse of a 3-by-3 matrix.
 * @param {!tdl.math.Matrix3} m The matrix.
 * @return {!tdl.math.Matrix3} The inverse of m.
 */
tdl.math.inverse3 = function(m) {
  var t00 = m[1*3+1] * m[2*3+2] - m[1*3+2] * m[2*3+1];
  var t10 = m[0*3+1] * m[2*3+2] - m[0*3+2] * m[2*3+1];
  var t20 = m[0*3+1] * m[1*3+2] - m[0*3+2] * m[1*3+1];
  var d = 1.0 / (m[0*3+0] * t00 - m[1*3+0] * t10 + m[2*3+0] * t20);
  return [ d * t00, -d * t10, d * t20,
          -d * (m[1*3+0] * m[2*3+2] - m[1*3+2] * m[2*3+0]),
           d * (m[0*3+0] * m[2*3+2] - m[0*3+2] * m[2*3+0]),
          -d * (m[0*3+0] * m[1*3+2] - m[0*3+2] * m[1*3+0]),
           d * (m[1*3+0] * m[2*3+1] - m[1*3+1] * m[2*3+0]),
          -d * (m[0*3+0] * m[2*3+1] - m[0*3+1] * m[2*3+0]),
           d * (m[0*3+0] * m[1*3+1] - m[0*3+1] * m[1*3+0])];
};

/**
 * Computes the inverse of a 4-by-4 matrix.
 * @param {!tdl.math.Matrix4} m The matrix.
 * @return {!tdl.math.Matrix4} The inverse of m.
 */
tdl.math.inverse4 = function(m) {
  var tmp_0 = m[2*4+2] * m[3*4+3];
  var tmp_1 = m[3*4+2] * m[2*4+3];
  var tmp_2 = m[1*4+2] * m[3*4+3];
  var tmp_3 = m[3*4+2] * m[1*4+3];
  var tmp_4 = m[1*4+2] * m[2*4+3];
  var tmp_5 = m[2*4+2] * m[1*4+3];
  var tmp_6 = m[0*4+2] * m[3*4+3];
  var tmp_7 = m[3*4+2] * m[0*4+3];
  var tmp_8 = m[0*4+2] * m[2*4+3];
  var tmp_9 = m[2*4+2] * m[0*4+3];
  var tmp_10 = m[0*4+2] * m[1*4+3];
  var tmp_11 = m[1*4+2] * m[0*4+3];
  var tmp_12 = m[2*4+0] * m[3*4+1];
  var tmp_13 = m[3*4+0] * m[2*4+1];
  var tmp_14 = m[1*4+0] * m[3*4+1];
  var tmp_15 = m[3*4+0] * m[1*4+1];
  var tmp_16 = m[1*4+0] * m[2*4+1];
  var tmp_17 = m[2*4+0] * m[1*4+1];
  var tmp_18 = m[0*4+0] * m[3*4+1];
  var tmp_19 = m[3*4+0] * m[0*4+1];
  var tmp_20 = m[0*4+0] * m[2*4+1];
  var tmp_21 = m[2*4+0] * m[0*4+1];
  var tmp_22 = m[0*4+0] * m[1*4+1];
  var tmp_23 = m[1*4+0] * m[0*4+1];

  var t0 = (tmp_0 * m[1*4+1] + tmp_3 * m[2*4+1] + tmp_4 * m[3*4+1]) -
      (tmp_1 * m[1*4+1] + tmp_2 * m[2*4+1] + tmp_5 * m[3*4+1]);
  var t1 = (tmp_1 * m[0*4+1] + tmp_6 * m[2*4+1] + tmp_9 * m[3*4+1]) -
      (tmp_0 * m[0*4+1] + tmp_7 * m[2*4+1] + tmp_8 * m[3*4+1]);
  var t2 = (tmp_2 * m[0*4+1] + tmp_7 * m[1*4+1] + tmp_10 * m[3*4+1]) -
      (tmp_3 * m[0*4+1] + tmp_6 * m[1*4+1] + tmp_11 * m[3*4+1]);
  var t3 = (tmp_5 * m[0*4+1] + tmp_8 * m[1*4+1] + tmp_11 * m[2*4+1]) -
      (tmp_4 * m[0*4+1] + tmp_9 * m[1*4+1] + tmp_10 * m[2*4+1]);

  var d = 1.0 / (m[0*4+0] * t0 + m[1*4+0] * t1 + m[2*4+0] * t2 + m[3*4+0] * t3);

  return [d * t0, d * t1, d * t2, d * t3,
       d * ((tmp_1 * m[1*4+0] + tmp_2 * m[2*4+0] + tmp_5 * m[3*4+0]) -
          (tmp_0 * m[1*4+0] + tmp_3 * m[2*4+0] + tmp_4 * m[3*4+0])),
       d * ((tmp_0 * m[0*4+0] + tmp_7 * m[2*4+0] + tmp_8 * m[3*4+0]) -
          (tmp_1 * m[0*4+0] + tmp_6 * m[2*4+0] + tmp_9 * m[3*4+0])),
       d * ((tmp_3 * m[0*4+0] + tmp_6 * m[1*4+0] + tmp_11 * m[3*4+0]) -
          (tmp_2 * m[0*4+0] + tmp_7 * m[1*4+0] + tmp_10 * m[3*4+0])),
       d * ((tmp_4 * m[0*4+0] + tmp_9 * m[1*4+0] + tmp_10 * m[2*4+0]) -
          (tmp_5 * m[0*4+0] + tmp_8 * m[1*4+0] + tmp_11 * m[2*4+0])),
       d * ((tmp_12 * m[1*4+3] + tmp_15 * m[2*4+3] + tmp_16 * m[3*4+3]) -
          (tmp_13 * m[1*4+3] + tmp_14 * m[2*4+3] + tmp_17 * m[3*4+3])),
       d * ((tmp_13 * m[0*4+3] + tmp_18 * m[2*4+3] + tmp_21 * m[3*4+3]) -
          (tmp_12 * m[0*4+3] + tmp_19 * m[2*4+3] + tmp_20 * m[3*4+3])),
       d * ((tmp_14 * m[0*4+3] + tmp_19 * m[1*4+3] + tmp_22 * m[3*4+3]) -
          (tmp_15 * m[0*4+3] + tmp_18 * m[1*4+3] + tmp_23 * m[3*4+3])),
       d * ((tmp_17 * m[0*4+3] + tmp_20 * m[1*4+3] + tmp_23 * m[2*4+3]) -
          (tmp_16 * m[0*4+3] + tmp_21 * m[1*4+3] + tmp_22 * m[2*4+3])),
       d * ((tmp_14 * m[2*4+2] + tmp_17 * m[3*4+2] + tmp_13 * m[1*4+2]) -
          (tmp_16 * m[3*4+2] + tmp_12 * m[1*4+2] + tmp_15 * m[2*4+2])),
       d * ((tmp_20 * m[3*4+2] + tmp_12 * m[0*4+2] + tmp_19 * m[2*4+2]) -
          (tmp_18 * m[2*4+2] + tmp_21 * m[3*4+2] + tmp_13 * m[0*4+2])),
       d * ((tmp_18 * m[1*4+2] + tmp_23 * m[3*4+2] + tmp_15 * m[0*4+2]) -
          (tmp_22 * m[3*4+2] + tmp_14 * m[0*4+2] + tmp_19 * m[1*4+2])),
       d * ((tmp_22 * m[2*4+2] + tmp_16 * m[0*4+2] + tmp_21 * m[1*4+2]) -
          (tmp_20 * m[1*4+2] + tmp_23 * m[2*4+2] + tmp_17 * m[0*4+2]))];
};

/**
 * Computes the determinant of the cofactor matrix obtained by removal
 * of a specified row and column.  This is a helper function for the general
 * determinant and matrix inversion functions.
 * @param {!tdl.math.Matrix} a The original matrix.
 * @param {number} x The row to be removed.
 * @param {number} y The column to be removed.
 * @return {number} The determinant of the matrix obtained by removing
 *     row x and column y from a.
 */
tdl.math.codet = function(a, x, y) {
  var size = 4;
  var b = [];
  var ai = 0;
  for (var bi = 0; bi < size - 1; ++bi) {
    if (ai == x)
      ai++;
    var aj = 0;
    for (var bj = 0; bj < size - 1; ++bj) {
      if (aj == y)
        aj++;
      b[bi*4+bj] = a[ai*4+aj];
      aj++;
    }
    ai++;
  }
  return tdl.math.det(b);
};

/**
 * Computes the determinant of an arbitrary square matrix.
 * @param {!tdl.math.Matrix} m The matrix.
 * @return {number} the determinant of m.
 */
tdl.math.det = function(m) {
  var d = 4;
  if (d <= 4) {
    return tdl.math['det' + d](m);
  }
  var r = 0.0;
  var sign = 1;
  var row = m[0];
  var mLength = m.length;
  for (var y = 0; y < mLength; y++) {
    r += sign * row[y] * tdl.math.codet(m, 0, y);
    sign *= -1;
  }
  return r;
};

/**
 * Computes the inverse of an arbitrary square matrix.
 * @param {!tdl.math.Matrix} m The matrix.
 * @return {!tdl.math.Matrix} The inverse of m.
 */
tdl.math.inverse = function(m) {
  var d = 4;
  if (d <= 4) {
    return tdl.math['inverse' + d](m);
  }
  var r = [];
  var size = m.length;
  for (var j = 0; j < size; ++j) {
    r[j] = [];
    for (var i = 0; i < size; ++i)
      r[j][i] = ((i + j) % 2 ? -1 : 1) * tdl.math.codet(m, i, j);
  }
  return tdl.math.divMatrixScalar(r, tdl.math.det(m));
};

/**
 * Performs Graham-Schmidt orthogonalization on the vectors which make up the
 * given matrix and returns the result in the rows of a new matrix.  When
 * multiplying many orthogonal matrices together, errors can accumulate causing
 * the product to fail to be orthogonal.  This function can be used to correct
 * that.
 * @param {!tdl.math.Matrix} m The matrix.
 * @return {!tdl.math.Matrix} A matrix whose rows are obtained from the
 *     rows of m by the Graham-Schmidt process.
 */
tdl.math.orthonormalize = function(m) {
//  var r = [];
//  for (var i = 0; i < 4; ++i) {
//    var v = m[i];
//    for (var j = 0; j < i; ++j) {
//      v = tdl.math.subVector(v, tdl.math.mulScalarVector(
//          tdl.math.dot(r[j], m[i]), r[j]));
//    }
//    r[i] = tdl.math.normalize(v);
//  }
//  return r;
};

/**
 * Computes the inverse of a 4-by-4 matrix.
 * Note: It is faster to call this than tdl.math.inverse.
 * @param {!tdl.math.Matrix4} m The matrix.
 * @return {!tdl.math.Matrix4} The inverse of m.
 */
tdl.math.matrix4.inverse = function(m) {
  return tdl.math.inverse4(m);
};

/**
 * Multiplies two 4-by-4 matrices; assumes that the given matrices are 4-by-4.
 * Note: It is faster to call this than tdl.math.mul.
 * @param {!tdl.math.Matrix4} a The matrix on the left.
 * @param {!tdl.math.Matrix4} b The matrix on the right.
 * @return {!tdl.math.Matrix4} The matrix product of a and b.
 */
tdl.math.matrix4.mul = function(a, b) {
  return tdl.math.mulMatrixMatrix4(a, b);
};

/**
 * Computes the determinant of a 4-by-4 matrix.
 * Note: It is faster to call this than tdl.math.det.
 * @param {!tdl.math.Matrix4} m The matrix.
 * @return {number} The determinant of m.
 */
tdl.math.matrix4.det = function(m) {
  return tdl.math.det4(m);
};

/**
 * Copies a Matrix4.
 * Note: It is faster to call this than tdl.math.copy.
 * @param {!tdl.math.Matrix4} m The matrix.
 * @return {!tdl.math.Matrix4} A copy of m.
 */
tdl.math.matrix4.copy = function(m) {
  return tdl.math.copyMatrix(m);
};

tdl.math.matrix4.transpose = tdl.math.transpose;

/**
 * Sets the upper 3-by-3 block of matrix a to the upper 3-by-3 block of matrix
 * b; assumes that a and b are big enough to contain an upper 3-by-3 block.
 * @param {!tdl.math.Matrix4} a A matrix.
 * @param {!tdl.math.Matrix3} b A 3-by-3 matrix.
 * @return {!tdl.math.Matrix4} a once modified.
 */
tdl.math.matrix4.setUpper3x3 = function(a, b) {
  a[0*4+0] = b[0*3+0];
  a[0*4+1] = b[0*3+1];
  a[0*4+2] = b[0*3+2];
  a[1*4+0] = b[1*3+0];
  a[1*4+1] = b[1*3+1];
  a[1*4+2] = b[1*3+2];
  a[2*4+0] = b[2*3+0];
  a[2*4+1] = b[2*3+1];
  a[2*4+2] = b[2*3+2];

  return a;
};

/**
 * Returns a 3-by-3 matrix mimicking the upper 3-by-3 block of m; assumes m
 * is big enough to contain an upper 3-by-3 block.
 * @param {!tdl.math.Matrix4} m The matrix.
 * @return {!tdl.math.Matrix3} The upper 3-by-3 block of m.
 */
tdl.math.matrix4.getUpper3x3 = function(m) {
  return [
    m[0*4+0],
    m[0*4+1],
    m[0*4+2],
    m[1*4+0],
    m[1*4+1],
    m[1*4+2],
    m[2*4+0],
    m[2*4+1],
    m[2*4+2]
  ];
};

/**
 * Sets the translation component of a 4-by-4 matrix to the given
 * vector.
 * @param {!tdl.math.Matrix4} a The matrix.
 * @param {(!tdl.math.Vector3|!tdl.math.Vector4)} v The vector.
 * @return {!tdl.math.Matrix4} a once modified.
 */
tdl.math.matrix4.setTranslation = function(a, v) {
  a[12] = v[0];
  a[13] = v[1];
  a[14] = v[2];
  a[15] = 1;
  return a;
};

/**
 * Returns the translation component of a 4-by-4 matrix as a vector with 3
 * entries.
 * @param {!tdl.math.Matrix4} m The matrix.
 * @return {!tdl.math.Vector3} The translation component of m.
 */
tdl.math.matrix4.getTranslation = function(m) {
  return [m[12], m[13], m[14], m[15]];
};

/**
 * Takes a 4-by-4 matrix and a vector with 3 entries,
 * interprets the vector as a point, transforms that point by the matrix, and
 * returns the result as a vector with 3 entries.
 * @param {!tdl.math.Matrix4} m The matrix.
 * @param {!tdl.math.Vector3} v The point.
 * @return {!tdl.math.Vector3} The transformed point.
 */
tdl.math.matrix4.transformPoint = function(m, v) {
  var v0 = v[0];
  var v1 = v[1];
  var v2 = v[2];
  var d = v0 * m[0*4+3] + v1 * m[1*4+3] + v2 * m[2*4+3] + m[3*4+3];
  return [(v0 * m[0*4+0] + v1 * m[1*4+0] + v2 * m[2*4+0] + m[3*4+0]) / d,
          (v0 * m[0*4+1] + v1 * m[1*4+1] + v2 * m[2*4+1] + m[3*4+1]) / d,
          (v0 * m[0*4+2] + v1 * m[1*4+2] + v2 * m[2*4+2] + m[3*4+2]) / d];
};

/**
 * Takes a 4-by-4 matrix and a vector with 4 entries, transforms that vector by
 * the matrix, and returns the result as a vector with 4 entries.
 * @param {!tdl.math.Matrix4} m The matrix.
 * @param {!tdl.math.Vector4} v The point in homogenous coordinates.
 * @return {!tdl.math.Vector4} The transformed point in homogenous
 *     coordinates.
 */
tdl.math.matrix4.transformVector4 = function(m, v) {
  var v0 = v[0];
  var v1 = v[1];
  var v2 = v[2];
  var v3 = v[3];

  return [v0 * m[0*4+0] + v1 * m[1*4+0] + v2 * m[2*4+0] + v3 * m[3*4+0],
          v0 * m[0*4+1] + v1 * m[1*4+1] + v2 * m[2*4+1] + v3 * m[3*4+1],
          v0 * m[0*4+2] + v1 * m[1*4+2] + v2 * m[2*4+2] + v3 * m[3*4+2],
          v0 * m[0*4+3] + v1 * m[1*4+3] + v2 * m[2*4+3] + v3 * m[3*4+3]];
};

/**
 * Takes a 4-by-4 matrix and a vector with 3 entries, interprets the vector as a
 * direction, transforms that direction by the matrix, and returns the result;
 * assumes the transformation of 3-dimensional space represented by the matrix
 * is parallel-preserving, i.e. any combination of rotation, scaling and
 * translation, but not a perspective distortion. Returns a vector with 3
 * entries.
 * @param {!tdl.math.Matrix4} m The matrix.
 * @param {!tdl.math.Vector3} v The direction.
 * @return {!tdl.math.Vector3} The transformed direction.
 */
tdl.math.matrix4.transformDirection = function(m, v) {
  var v0 = v[0];
  var v1 = v[1];
  var v2 = v[2];

  return [v0 * m[0*4+0] + v1 * m[1*4+0] + v2 * m[2*4+0],
          v0 * m[0*4+1] + v1 * m[1*4+1] + v2 * m[2*4+1],
          v0 * m[0*4+2] + v1 * m[1*4+2] + v2 * m[2*4+2]];
};

/**
 * Takes a 4-by-4 matrix m and a vector v with 3 entries, interprets the vector
 * as a normal to a surface, and computes a vector which is normal upon
 * transforming that surface by the matrix. The effect of this function is the
 * same as transforming v (as a direction) by the inverse-transpose of m.  This
 * function assumes the transformation of 3-dimensional space represented by the
 * matrix is parallel-preserving, i.e. any combination of rotation, scaling and
 * translation, but not a perspective distortion.  Returns a vector with 3
 * entries.
 * @param {!tdl.math.Matrix4} m The matrix.
 * @param {!tdl.math.Vector3} v The normal.
 * @return {!tdl.math.Vector3} The transformed normal.
 */
tdl.math.matrix4.transformNormal = function(m, v) {
  var mi = tdl.math.inverse4(m);
  var v0 = v[0];
  var v1 = v[1];
  var v2 = v[2];

  return [v0 * mi[0*4+0] + v1 * mi[0*4+1] + v2 * mi[0*4+2],
          v0 * mi[1*4+0] + v1 * mi[1*4+1] + v2 * mi[1*4+2],
          v0 * mi[2*4+0] + v1 * mi[2*4+1] + v2 * mi[2*4+2]];
};

/**
 * Creates a 4-by-4 identity matrix.
 * @return {!tdl.math.Matrix4} The 4-by-4 identity.
 */
tdl.math.matrix4.identity = function() {
  return [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ];
};

/**
 * Sets the given 4-by-4 matrix to the identity matrix.
 * @param {!tdl.math.Matrix4} m The matrix to set to identity.
 * @return {!tdl.math.Matrix4} m once modified.
 */
tdl.math.matrix4.setIdentity = function(m) {
  for (var i = 0; i < 4; i++) {
    for (var j = 0; j < 4; j++) {
      if (i == j) {
        m[i*4+j] = 1;
      } else {
        m[i*4+j] = 0;
      }
    }
  }
  return m;
};

/**
 * Computes a 4-by-4 perspective transformation matrix given the angular height
 * of the frustum, the aspect ratio, and the near and far clipping planes.  The
 * arguments define a frustum extending in the negative z direction.  The given
 * angle is the vertical angle of the frustum, and the horizontal angle is
 * determined to produce the given aspect ratio.  The arguments near and far are
 * the distances to the near and far clipping planes.  Note that near and far
 * are not z coordinates, but rather they are distances along the negative
 * z-axis.  The matrix generated sends the viewing frustum to the unit box.
 * We assume a unit box extending from -1 to 1 in the x and y dimensions and
 * from 0 to 1 in the z dimension.
 * @param {number} angle The camera angle from top to bottom (in radians).
 * @param {number} aspect The aspect ratio width / height.
 * @param {number} zNear The depth (negative z coordinate)
 *     of the near clipping plane.
 * @param {number} zFar The depth (negative z coordinate)
 *     of the far clipping plane.
 * @return {!tdl.math.Matrix4} The perspective matrix.
 */
tdl.math.matrix4.perspective = function(angle, aspect, zNear, zFar) {
  var f = Math.tan(Math.PI * 0.5 - 0.5 * angle);
  var rangeInv = 1.0 / (zNear - zFar);

  return [
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (zNear + zFar) * rangeInv, -1,
    0, 0, zNear * zFar * rangeInv * 2, 0
  ];
};

/**
 * Computes a 4-by-4 orthographic projection matrix given the coordinates of the
 * planes defining the axis-aligned, box-shaped viewing volume.  The matrix
 * generated sends that box to the unit box.  Note that although left and right
 * are x coordinates and bottom and top are y coordinates, near and far
 * are not z coordinates, but rather they are distances along the negative
 * z-axis.  We assume a unit box extending from -1 to 1 in the x and y
 * dimensions and from 0 to 1 in the z dimension.
 * @param {number} left The x coordinate of the left plane of the box.
 * @param {number} right The x coordinate of the right plane of the box.
 * @param {number} bottom The y coordinate of the bottom plane of the box.
 * @param {number} top The y coordinate of the right plane of the box.
 * @param {number} near The negative z coordinate of the near plane of the box.
 * @param {number} far The negative z coordinate of the far plane of the box.
 * @return {!tdl.math.Matrix4} The orthographic projection matrix.
 */
tdl.math.matrix4.orthographic =
    function(left, right, bottom, top, near, far) {
  return [
    2 / (right - left), 0, 0, 0,
    0, 2 / (top - bottom), 0, 0,
    0, 0, 1 / (near - far), 0,
    (left + right) / (left - right),
    (bottom + top) / (bottom - top),
    near / (near - far), 1
  ];
};

/**
 * Computes a 4-by-4 perspective transformation matrix given the left, right,
 * top, bottom, near and far clipping planes. The arguments define a frustum
 * extending in the negative z direction. The arguments near and far are the
 * distances to the near and far clipping planes. Note that near and far are not
 * z coordinates, but rather they are distances along the negative z-axis. The
 * matrix generated sends the viewing frustum to the unit box. We assume a unit
 * box extending from -1 to 1 in the x and y dimensions and from 0 to 1 in the z
 * dimension.
 * @param {number} left The x coordinate of the left plane of the box.
 * @param {number} right The x coordinate of the right plane of the box.
 * @param {number} bottom The y coordinate of the bottom plane of the box.
 * @param {number} top The y coordinate of the right plane of the box.
 * @param {number} near The negative z coordinate of the near plane of the box.
 * @param {number} far The negative z coordinate of the far plane of the box.
 * @return {!tdl.math.Matrix4} The perspective projection matrix.
 */
tdl.math.matrix4.frustum = function(left, right, bottom, top, near, far) {
  var dx = (right - left);
  var dy = (top - bottom);
  var dz = (near - far);
  return [
    2 * near / dx, 0, 0, 0,
    0, 2 * near / dy, 0, 0,
    (left + right) / dx, (top + bottom) / dy, far / dz, -1,
    0, 0, near * far / dz, 0];
};

/**
 * Computes a 4-by-4 look-at transformation.  The transformation generated is
 * an orthogonal rotation matrix with translation component.  The translation
 * component sends the eye to the origin.  The rotation component sends the
 * vector pointing from the eye to the target to a vector pointing in the
 * negative z direction, and also sends the up vector into the upper half of
 * the yz plane.
 * @param {(!tdl.math.Vector3|!tdl.math.Vector4)} eye The position
 *     of the eye.
 * @param {(!tdl.math.Vector3|!tdl.math.Vector4)} target The
 *     position meant to be viewed.
 * @param {(!tdl.math.Vector3|!tdl.math.Vector4)} up A vector
 *     pointing up.
 * @return {!tdl.math.Matrix4} The look-at matrix.
 */
tdl.math.matrix4.lookAt = function(eye, target, up) {
  return tdl.math.inverse(tdl.math.matrix4.cameraLookAt(
      eye, target, up));
};

/**
 * Computes a 4-by-4 camera look-at transformation. This is the
 * inverse of lookAt The transformation generated is an
 * orthogonal rotation matrix with translation component.
 * @param {(!tdl.math.Vector3|!tdl.math.Vector4)} eye The position
 *     of the eye.
 * @param {(!tdl.math.Vector3|!tdl.math.Vector4)} target The
 *     position meant to be viewed.
 * @param {(!tdl.math.Vector3|!tdl.math.Vector4)} up A vector
 *     pointing up.
 * @return {!tdl.math.Matrix4} The camera look-at matrix.
 */
tdl.math.matrix4.cameraLookAt = function(eye, target, up) {
  var vz = tdl.math.normalize(
      tdl.math.subVector(eye, target));
  var vx = tdl.math.normalize(
      tdl.math.cross(up, vz));
  var vy = tdl.math.cross(vz, vx);

  return tdl.math.inverse([
     vx[0], vx[1], vx[2], 0,
     vy[0], vy[1], vy[2], 0,
     vz[0], vz[1], vz[2], 0,
     -tdl.math.dot(vx, eye),
     -tdl.math.dot(vy, eye),
     -tdl.math.dot(vz, eye), 1]);
};

/**
 * Takes two 4-by-4 matrices, a and b, and computes the product in the order
 * that pre-composes b with a.  In other words, the matrix returned will
 * transform by b first and then a.  Note this is subtly different from just
 * multiplying the matrices together.  For given a and b, this function returns
 * the same object in both row-major and column-major mode.
 * @param {!tdl.math.Matrix4} a A 4-by-4 matrix.
 * @param {!tdl.math.Matrix4} b A 4-by-4 matrix.
 * @return {!tdl.math.Matrix4} the composition of a and b, b first then a.
 */
tdl.math.matrix4.composition = function(a, b) {
  var a00 = a[0*4+0];
  var a01 = a[0*4+1];
  var a02 = a[0*4+2];
  var a03 = a[0*4+3];
  var a10 = a[1*4+0];
  var a11 = a[1*4+1];
  var a12 = a[1*4+2];
  var a13 = a[1*4+3];
  var a20 = a[2*4+0];
  var a21 = a[2*4+1];
  var a22 = a[2*4+2];
  var a23 = a[2*4+3];
  var a30 = a[3*4+0];
  var a31 = a[3*4+1];
  var a32 = a[3*4+2];
  var a33 = a[3*4+3];
  var b00 = b[0*4+0];
  var b01 = b[0*4+1];
  var b02 = b[0*4+2];
  var b03 = b[0*4+3];
  var b10 = b[1*4+0];
  var b11 = b[1*4+1];
  var b12 = b[1*4+2];
  var b13 = b[1*4+3];
  var b20 = b[2*4+0];
  var b21 = b[2*4+1];
  var b22 = b[2*4+2];
  var b23 = b[2*4+3];
  var b30 = b[3*4+0];
  var b31 = b[3*4+1];
  var b32 = b[3*4+2];
  var b33 = b[3*4+3];
  return [a00 * b00 + a10 * b01 + a20 * b02 + a30 * b03,
          a01 * b00 + a11 * b01 + a21 * b02 + a31 * b03,
          a02 * b00 + a12 * b01 + a22 * b02 + a32 * b03,
          a03 * b00 + a13 * b01 + a23 * b02 + a33 * b03,
          a00 * b10 + a10 * b11 + a20 * b12 + a30 * b13,
          a01 * b10 + a11 * b11 + a21 * b12 + a31 * b13,
          a02 * b10 + a12 * b11 + a22 * b12 + a32 * b13,
          a03 * b10 + a13 * b11 + a23 * b12 + a33 * b13,
          a00 * b20 + a10 * b21 + a20 * b22 + a30 * b23,
          a01 * b20 + a11 * b21 + a21 * b22 + a31 * b23,
          a02 * b20 + a12 * b21 + a22 * b22 + a32 * b23,
          a03 * b20 + a13 * b21 + a23 * b22 + a33 * b23,
          a00 * b30 + a10 * b31 + a20 * b32 + a30 * b33,
          a01 * b30 + a11 * b31 + a21 * b32 + a31 * b33,
          a02 * b30 + a12 * b31 + a22 * b32 + a32 * b33,
          a03 * b30 + a13 * b31 + a23 * b32 + a33 * b33];
};

/**
 * Takes two 4-by-4 matrices, a and b, and modifies a to be the product in the
 * order that pre-composes b with a.  The matrix a, upon modification will
 * transform by b first and then a.  Note this is subtly different from just
 * multiplying the matrices together.  For given a and b, a, upon modification,
 * will be the same object in both row-major and column-major mode.
 * @param {!tdl.math.Matrix4} a A 4-by-4 matrix.
 * @param {!tdl.math.Matrix4} b A 4-by-4 matrix.
 * @return {!tdl.math.Matrix4} a once modified.
 */
tdl.math.matrix4.compose = function(a, b) {
  var a00 = a[0*4+0];
  var a01 = a[0*4+1];
  var a02 = a[0*4+2];
  var a03 = a[0*4+3];
  var a10 = a[1*4+0];
  var a11 = a[1*4+1];
  var a12 = a[1*4+2];
  var a13 = a[1*4+3];
  var a20 = a[2*4+0];
  var a21 = a[2*4+1];
  var a22 = a[2*4+2];
  var a23 = a[2*4+3];
  var a30 = a[3*4+0];
  var a31 = a[3*4+1];
  var a32 = a[3*4+2];
  var a33 = a[3*4+3];
  var b00 = b[0*4+0];
  var b01 = b[0*4+1];
  var b02 = b[0*4+2];
  var b03 = b[0*4+3];
  var b10 = b[1*4+0];
  var b11 = b[1*4+1];
  var b12 = b[1*4+2];
  var b13 = b[1*4+3];
  var b20 = b[2*4+0];
  var b21 = b[2*4+1];
  var b22 = b[2*4+2];
  var b23 = b[2*4+3];
  var b30 = b[3*4+0];
  var b31 = b[3*4+1];
  var b32 = b[3*4+2];
  var b33 = b[3*4+3];
  a[ 0] = a00 * b00 + a10 * b01 + a20 * b02 + a30 * b03;
  a[ 1] = a01 * b00 + a11 * b01 + a21 * b02 + a31 * b03;
  a[ 2] = a02 * b00 + a12 * b01 + a22 * b02 + a32 * b03;
  a[ 3] = a03 * b00 + a13 * b01 + a23 * b02 + a33 * b03;
  a[ 4] = a00 * b10 + a10 * b11 + a20 * b12 + a30 * b13;
  a[ 5] = a01 * b10 + a11 * b11 + a21 * b12 + a31 * b13;
  a[ 6] = a02 * b10 + a12 * b11 + a22 * b12 + a32 * b13;
  a[ 7] = a03 * b10 + a13 * b11 + a23 * b12 + a33 * b13;
  a[ 8] = a00 * b20 + a10 * b21 + a20 * b22 + a30 * b23;
  a[ 9] = a01 * b20 + a11 * b21 + a21 * b22 + a31 * b23;
  a[10] = a02 * b20 + a12 * b21 + a22 * b22 + a32 * b23;
  a[11] = a03 * b20 + a13 * b21 + a23 * b22 + a33 * b23;
  a[12] = a00 * b30 + a10 * b31 + a20 * b32 + a30 * b33;
  a[13] = a01 * b30 + a11 * b31 + a21 * b32 + a31 * b33;
  a[14] = a02 * b30 + a12 * b31 + a22 * b32 + a32 * b33;
  a[15] = a03 * b30 + a13 * b31 + a23 * b32 + a33 * b33;
  return a;
};

/**
 * Creates a 4-by-4 matrix which translates by the given vector v.
 * @param {(!tdl.math.Vector3|!tdl.math.Vector4)} v The vector by
 *     which to translate.
 * @return {!tdl.math.Matrix4} The translation matrix.
 */
tdl.math.matrix4.translation = function(v) {
  return [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    v[0], v[1], v[2], 1
  ];
};

/**
 * Modifies the given 4-by-4 matrix by translation by the given vector v.
 * @param {!tdl.math.Matrix4} m The matrix.
 * @param {(!tdl.math.Vector3|!tdl.math.Vector4)} v The vector by
 *     which to translate.
 * @return {!tdl.math.Matrix4} m once modified.
 */
tdl.math.matrix4.translate = function(m, v) {
  var m00 = m[0*4+0];
  var m01 = m[0*4+1];
  var m02 = m[0*4+2];
  var m03 = m[0*4+3];
  var m10 = m[1*4+0];
  var m11 = m[1*4+1];
  var m12 = m[1*4+2];
  var m13 = m[1*4+3];
  var m20 = m[2*4+0];
  var m21 = m[2*4+1];
  var m22 = m[2*4+2];
  var m23 = m[2*4+3];
  var m30 = m[3*4+0];
  var m31 = m[3*4+1];
  var m32 = m[3*4+2];
  var m33 = m[3*4+3];
  var v0 = v[0];
  var v1 = v[1];
  var v2 = v[2];

  m[12] = m00 * v0 + m10 * v1 + m20 * v2 + m30;
  m[13] = m01 * v0 + m11 * v1 + m21 * v2 + m31;
  m[14] = m02 * v0 + m12 * v1 + m22 * v2 + m32;
  m[15] = m03 * v0 + m13 * v1 + m23 * v2 + m33;

  return m;
};

/**
 * Creates a 4-by-4 matrix which scales in each dimension by an amount given by
 * the corresponding entry in the given vector; assumes the vector has three
 * entries.
 * @param {!tdl.math.Vector3} v A vector of
 *     three entries specifying the factor by which to scale in each dimension.
 * @return {!tdl.math.Matrix4} The scaling matrix.
 */
tdl.math.matrix4.scaling = function(v) {
  return [
    v[0], 0, 0, 0,
    0, v[1], 0, 0,
    0, 0, v[2], 0,
    0, 0, 0, 1
  ];
};

/**
 * Modifies the given 4-by-4 matrix, scaling in each dimension by an amount
 * given by the corresponding entry in the given vector; assumes the vector has
 * three entries.
 * @param {!tdl.math.Matrix4} m The matrix to be modified.
 * @param {!tdl.math.Vector3} v A vector of three entries specifying the
 *     factor by which to scale in each dimension.
 * @return {!tdl.math.Matrix4} m once modified.
 */
tdl.math.matrix4.scale = function(m, v) {
  var v0 = v[0];
  var v1 = v[1];
  var v2 = v[2];

  m[0] = v0 * m[0*4+0];
  m[1] = v0 * m[0*4+1];
  m[2] = v0 * m[0*4+2];
  m[3] = v0 * m[0*4+3];
  m[4] = v1 * m[1*4+0];
  m[5] = v1 * m[1*4+1];
  m[6] = v1 * m[1*4+2];
  m[7] = v1 * m[1*4+3];
  m[8] = v2 * m[2*4+0];
  m[9] = v2 * m[2*4+1];
  m[10] = v2 * m[2*4+2];
  m[11] = v2 * m[2*4+3];

  return m;
};

/**
 * Creates a 4-by-4 matrix which rotates around the x-axis by the given angle.
 * @param {number} angle The angle by which to rotate (in radians).
 * @return {!tdl.math.Matrix4} The rotation matrix.
 */
tdl.math.matrix4.rotationX = function(angle) {
  var c = Math.cos(angle);
  var s = Math.sin(angle);

  return [
    1, 0, 0, 0,
    0, c, s, 0,
    0, -s, c, 0,
    0, 0, 0, 1
  ];
};

/**
 * Modifies the given 4-by-4 matrix by a rotation around the x-axis by the given
 * angle.
 * @param {!tdl.math.Matrix4} m The matrix.
 * @param {number} angle The angle by which to rotate (in radians).
 * @return {!tdl.math.Matrix4} m once modified.
 */
tdl.math.matrix4.rotateX = function(m, angle) {
  var m10 = m[1*4+0];
  var m11 = m[1*4+1];
  var m12 = m[1*4+2];
  var m13 = m[1*4+3];
  var m20 = m[2*4+0];
  var m21 = m[2*4+1];
  var m22 = m[2*4+2];
  var m23 = m[2*4+3];
  var c = Math.cos(angle);
  var s = Math.sin(angle);

  m[4]  = c * m10 + s * m20;
  m[5]  = c * m11 + s * m21;
  m[6]  = c * m12 + s * m22;
  m[7]  = c * m13 + s * m23;
  m[8]  = c * m20 - s * m10;
  m[9]  = c * m21 - s * m11;
  m[10] = c * m22 - s * m12;
  m[11] = c * m23 - s * m13;

  return m;
};

/**
 * Creates a 4-by-4 matrix which rotates around the y-axis by the given angle.
 * @param {number} angle The angle by which to rotate (in radians).
 * @return {!tdl.math.Matrix4} The rotation matrix.
 */
tdl.math.matrix4.rotationY = function(angle) {
  var c = Math.cos(angle);
  var s = Math.sin(angle);

  return [
    c, 0, -s, 0,
    0, 1, 0, 0,
    s, 0, c, 0,
    0, 0, 0, 1
  ];
};

/**
 * Modifies the given 4-by-4 matrix by a rotation around the y-axis by the given
 * angle.
 * @param {!tdl.math.Matrix4} m The matrix.
 * @param {number} angle The angle by which to rotate (in radians).
 * @return {!tdl.math.Matrix4} m once modified.
 */
tdl.math.matrix4.rotateY = function(m, angle) {
  var m00 = m[0*4+0];
  var m01 = m[0*4+1];
  var m02 = m[0*4+2];
  var m03 = m[0*4+3];
  var m20 = m[2*4+0];
  var m21 = m[2*4+1];
  var m22 = m[2*4+2];
  var m23 = m[2*4+3];
  var c = Math.cos(angle);
  var s = Math.sin(angle);

  m[ 0] = c * m00 - s * m20;
  m[ 1] = c * m01 - s * m21;
  m[ 2] = c * m02 - s * m22;
  m[ 3] = c * m03 - s * m23;
  m[ 8] = c * m20 + s * m00;
  m[ 9] = c * m21 + s * m01;
  m[10] = c * m22 + s * m02;
  m[11] = c * m23 + s * m03;

  return m;
};

/**
 * Creates a 4-by-4 matrix which rotates around the z-axis by the given angle.
 * @param {number} angle The angle by which to rotate (in radians).
 * @return {!tdl.math.Matrix4} The rotation matrix.
 */
tdl.math.matrix4.rotationZ = function(angle) {
  var c = Math.cos(angle);
  var s = Math.sin(angle);

  return [
    c, s, 0, 0,
    -s, c, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ];
};

/**
 * Modifies the given 4-by-4 matrix by a rotation around the z-axis by the given
 * angle.
 * @param {!tdl.math.Matrix4} m The matrix.
 * @param {number} angle The angle by which to rotate (in radians).
 * @return {!tdl.math.Matrix4} m once modified.
 */
tdl.math.matrix4.rotateZ = function(m, angle) {
  var m00 = m[0*4+0];
  var m01 = m[0*4+1];
  var m02 = m[0*4+2];
  var m03 = m[0*4+3];
  var m10 = m[1*4+0];
  var m11 = m[1*4+1];
  var m12 = m[1*4+2];
  var m13 = m[1*4+3];
  var c = Math.cos(angle);
  var s = Math.sin(angle);

  m[ 0] = c * m00 + s * m10;
  m[ 1] = c * m01 + s * m11;
  m[ 2] = c * m02 + s * m12;
  m[ 3] = c * m03 + s * m13;
  m[ 4] = c * m10 - s * m00;
  m[ 5] = c * m11 - s * m01;
  m[ 6] = c * m12 - s * m02;
  m[ 7] = c * m13 - s * m03;

  return m;
};

/**
 * Creates a 4-by-4 rotation matrix.  Interprets the entries of the given
 * vector as angles by which to rotate around the x, y and z axes, returns a
 * a matrix which rotates around the x-axis first, then the y-axis, then the
 * z-axis.
 * @param {!tdl.math.Vector3} v A vector of angles (in radians).
 * @return {!tdl.math.Matrix4} The rotation matrix.
 */
tdl.math.matrix4.rotationZYX = function(v) {
  var sinx = Math.sin(v[0]);
  var cosx = Math.cos(v[0]);
  var siny = Math.sin(v[1]);
  var cosy = Math.cos(v[1]);
  var sinz = Math.sin(v[2]);
  var cosz = Math.cos(v[2]);

  var coszsiny = cosz * siny;
  var sinzsiny = sinz * siny;

  return [
    cosz * cosy, sinz * cosy, -siny, 0,
    coszsiny * sinx - sinz * cosx,
    sinzsiny * sinx + cosz * cosx,
    cosy * sinx,
    0,
    coszsiny * cosx + sinz * sinx,
    sinzsiny * cosx - cosz * sinx,
    cosy * cosx,
    0,
    0, 0, 0, 1
  ];
};

/**
 * Modifies a 4-by-4 matrix by a rotation.  Interprets the coordinates of the
 * given vector as angles by which to rotate around the x, y and z axes, rotates
 * around the x-axis first, then the y-axis, then the z-axis.
 * @param {!tdl.math.Matrix4} m The matrix.
 * @param {!tdl.math.Vector3} v A vector of angles (in radians).
 * @return {!tdl.math.Matrix4} m once modified.
 */
tdl.math.matrix4.rotateZYX = function(m, v) {
  var sinX = Math.sin(v[0]);
  var cosX = Math.cos(v[0]);
  var sinY = Math.sin(v[1]);
  var cosY = Math.cos(v[1]);
  var sinZ = Math.sin(v[2]);
  var cosZ = Math.cos(v[2]);

  var cosZSinY = cosZ * sinY;
  var sinZSinY = sinZ * sinY;

  var r00 = cosZ * cosY;
  var r01 = sinZ * cosY;
  var r02 = -sinY;
  var r10 = cosZSinY * sinX - sinZ * cosX;
  var r11 = sinZSinY * sinX + cosZ * cosX;
  var r12 = cosY * sinX;
  var r20 = cosZSinY * cosX + sinZ * sinX;
  var r21 = sinZSinY * cosX - cosZ * sinX;
  var r22 = cosY * cosX;

  var m00 = m[0*4+0];
  var m01 = m[0*4+1];
  var m02 = m[0*4+2];
  var m03 = m[0*4+3];
  var m10 = m[1*4+0];
  var m11 = m[1*4+1];
  var m12 = m[1*4+2];
  var m13 = m[1*4+3];
  var m20 = m[2*4+0];
  var m21 = m[2*4+1];
  var m22 = m[2*4+2];
  var m23 = m[2*4+3];
  var m30 = m[3*4+0];
  var m31 = m[3*4+1];
  var m32 = m[3*4+2];
  var m33 = m[3*4+3];

  m[ 0] = r00 * m00 + r01 * m10 + r02 * m20;
  m[ 1] = r00 * m01 + r01 * m11 + r02 * m21;
  m[ 2] = r00 * m02 + r01 * m12 + r02 * m22;
  m[ 3] = r00 * m03 + r01 * m13 + r02 * m23;
  m[ 4] = r10 * m00 + r11 * m10 + r12 * m20;
  m[ 5] = r10 * m01 + r11 * m11 + r12 * m21;
  m[ 6] = r10 * m02 + r11 * m12 + r12 * m22;
  m[ 7] = r10 * m03 + r11 * m13 + r12 * m23;
  m[ 8] = r20 * m00 + r21 * m10 + r22 * m20;
  m[ 9] = r20 * m01 + r21 * m11 + r22 * m21;
  m[10] = r20 * m02 + r21 * m12 + r22 * m22;
  m[11] = r20 * m03 + r21 * m13 + r22 * m23;

  return m;
};

/**
 * Creates a 4-by-4 matrix which rotates around the given axis by the given
 * angle.
 * @param {(!tdl.math.Vector3|!tdl.math.Vector4)} axis The axis
 *     about which to rotate.
 * @param {number} angle The angle by which to rotate (in radians).
 * @return {!tdl.math.Matrix4} A matrix which rotates angle radians
 *     around the axis.
 */
tdl.math.matrix4.axisRotation = function(axis, angle) {
  var x = axis[0];
  var y = axis[1];
  var z = axis[2];
  var n = Math.sqrt(x * x + y * y + z * z);
  x /= n;
  y /= n;
  z /= n;
  var xx = x * x;
  var yy = y * y;
  var zz = z * z;
  var c = Math.cos(angle);
  var s = Math.sin(angle);
  var oneMinusCosine = 1 - c;

  return [
    xx + (1 - xx) * c,
    x * y * oneMinusCosine + z * s,
    x * z * oneMinusCosine - y * s,
    0,
    x * y * oneMinusCosine - z * s,
    yy + (1 - yy) * c,
    y * z * oneMinusCosine + x * s,
    0,
    x * z * oneMinusCosine + y * s,
    y * z * oneMinusCosine - x * s,
    zz + (1 - zz) * c,
    0,
    0, 0, 0, 1
  ];
};

/**
 * Modifies the given 4-by-4 matrix by rotation around the given axis by the
 * given angle.
 * @param {!tdl.math.Matrix4} m The matrix.
 * @param {(!tdl.math.Vector3|!tdl.math.Vector4)} axis The axis
 *     about which to rotate.
 * @param {number} angle The angle by which to rotate (in radians).
 * @return {!tdl.math.Matrix4} m once modified.
 */
tdl.math.matrix4.axisRotate = function(m, axis, angle) {
  var x = axis[0];
  var y = axis[1];
  var z = axis[2];
  var n = Math.sqrt(x * x + y * y + z * z);
  x /= n;
  y /= n;
  z /= n;
  var xx = x * x;
  var yy = y * y;
  var zz = z * z;
  var c = Math.cos(angle);
  var s = Math.sin(angle);
  var oneMinusCosine = 1 - c;

  var r00 = xx + (1 - xx) * c;
  var r01 = x * y * oneMinusCosine + z * s;
  var r02 = x * z * oneMinusCosine - y * s;
  var r10 = x * y * oneMinusCosine - z * s;
  var r11 = yy + (1 - yy) * c;
  var r12 = y * z * oneMinusCosine + x * s;
  var r20 = x * z * oneMinusCosine + y * s;
  var r21 = y * z * oneMinusCosine - x * s;
  var r22 = zz + (1 - zz) * c;

  var m00 = m[0*4+0];
  var m01 = m[0*4+1];
  var m02 = m[0*4+2];
  var m03 = m[0*4+3];
  var m10 = m[1*4+0];
  var m11 = m[1*4+1];
  var m12 = m[1*4+2];
  var m13 = m[1*4+3];
  var m20 = m[2*4+0];
  var m21 = m[2*4+1];
  var m22 = m[2*4+2];
  var m23 = m[2*4+3];
  var m30 = m[3*4+0];
  var m31 = m[3*4+1];
  var m32 = m[3*4+2];
  var m33 = m[3*4+3];

  m[ 0] = r00 * m00 + r01 * m10 + r02 * m20;
  m[ 1] = r00 * m01 + r01 * m11 + r02 * m21;
  m[ 2] = r00 * m02 + r01 * m12 + r02 * m22;
  m[ 3] = r00 * m03 + r01 * m13 + r02 * m23;
  m[ 4] = r10 * m00 + r11 * m10 + r12 * m20;
  m[ 5] = r10 * m01 + r11 * m11 + r12 * m21;
  m[ 6] = r10 * m02 + r11 * m12 + r12 * m22;
  m[ 7] = r10 * m03 + r11 * m13 + r12 * m23;
  m[ 8] = r20 * m00 + r21 * m10 + r22 * m20;
  m[ 9] = r20 * m01 + r21 * m11 + r22 * m21;
  m[10] = r20 * m02 + r21 * m12 + r22 * m22;
  m[11] = r20 * m03 + r21 * m13 + r22 * m23;

  return m;
};

/**
 * Sets each function in the namespace tdl.math to the row major
 * version in tdl.math.rowMajor (provided such a function exists in
 * tdl.math.rowMajor).  Call this function to establish the row major
 * convention.
 */
tdl.math.installRowMajorFunctions = function() {
  for (var f in tdl.math.rowMajor) {
    tdl.math[f] = tdl.math.rowMajor[f];
  }
};

/**
 * Sets each function in the namespace tdl.math to the column major
 * version in tdl.math.columnMajor (provided such a function exists in
 * tdl.math.columnMajor).  Call this function to establish the column
 * major convention.
 */
tdl.math.installColumnMajorFunctions = function() {
  for (var f in tdl.math.columnMajor) {
    tdl.math[f] = tdl.math.columnMajor[f];
  }
};

/**
 * Sets each function in the namespace tdl.math to the error checking
 * version in tdl.math.errorCheck (provided such a function exists in
 * tdl.math.errorCheck).
 */
tdl.math.installErrorCheckFunctions = function() {
  for (var f in tdl.math.errorCheck) {
    tdl.math[f] = tdl.math.errorCheck[f];
  }
};

/**
 * Sets each function in the namespace tdl.math to the error checking free
 * version in tdl.math.errorCheckFree (provided such a function exists in
 * tdl.math.errorCheckFree).
 */
tdl.math.installErrorCheckFreeFunctions = function() {
  for (var f in tdl.math.errorCheckFree) {
    tdl.math[f] = tdl.math.errorCheckFree[f];
  }
}

// By default, install the row-major functions.
tdl.math.installRowMajorFunctions();

// By default, install prechecking.
tdl.math.installErrorCheckFunctions();
/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview This file contains misc functions that don't fit elsewhere.
 */

//tdl.provide('tdl.misc');

//tdl.require('tdl.log');

/**
 * A module for misc.
 * @namespace
 */
tdl.misc = tdl.misc || {};

tdl.misc.applyUrlSettings = function(obj, opt_argumentName) {
  var argumentName = opt_argumentName || 'settings';
  try {
    var s = window.location.href;
    var q = s.indexOf("?");
    var e = s.indexOf("#");
    if (e < 0) {
      e = s.length;
    }
    var query = s.substring(q + 1, e);
    //tdl.log("query:", query);
    var pairs = query.split("&");
    //tdl.log("pairs:", pairs.length);
    for (var ii = 0; ii < pairs.length; ++ii) {
      var keyValue = pairs[ii].split("=");
      var key = keyValue[0];
      var value = decodeURIComponent(keyValue[1]);
      //tdl.log(ii, ":", key, "=", value);
      switch (key) {
      case argumentName:
        //tdl.log(value);
        var settings = eval("(" + value + ")");
        //tdl.log("settings:", settings);
        tdl.misc.copyProperties(settings, obj);
        break;
      }
    }
  } catch (e) {
    tdl.error(e);
    tdl.error("settings:", settings);
    return;
  }
};

/**
 * Copies properties from obj to dst recursively.
 * @private
 * @param {!Object} obj Object with new settings.
 * @param {!Object} dst Object to receive new settings.
 */
tdl.misc.copyProperties = function(obj, dst) {
  for (var name in obj) {
    var value = obj[name];
    if (value instanceof Array) {
      //tdl.log("apply->: ", name, "[]");
      var newDst = dst[name];
      if (!newDst) {
        newDst = [];
        dst[name] = newDst;
      }
      tdl.misc.copyProperties(value, newDst);
    } else if (typeof value == 'object') {
      //tdl.log("apply->: ", name);
      var newDst = dst[name];
      if (!newDst) {
        newDst = {};
        dst[name] = newDst;
      }
      tdl.misc.copyProperties(value, newDst);
    } else {
      //tdl.log("apply: ", name, "=", value);
      dst[name] = value;
    }
  }
};


/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview This file contains objects to manage models.
 */

//tdl.provide('tdl.models');

//tdl.require('tdl.buffers');

/**
 * A module for models.
 * @namespace
 */
tdl.models = tdl.models || {};

/**
 * Manages a program, buffers and textures for easier drawing.
 * @constructor
 * @param {!tdl.programs.Program} program The program to render
 *     this model with
 * @param {!Object.<string, AttribBuffer>} arrays The
 *     AttribBuffers to bind to draw this model.
 * @param {!Object.<string, Texture>} textures The textures to
 *     bind to draw this model.
 * @param {number} opt_mode Mode to call drawElements with. Default =
 *        gl.TRIANGLES
 */
tdl.models.Model = function(program, arrays, textures, opt_mode) {
  this.buffers = { };
  this.setBuffers(arrays);

  var textureUnits = { }
  var unit = 0;
  for (var texture in program.textures) {
    textureUnits[texture] = unit++;
  }

  this.mode = (opt_mode === undefined) ? gl.TRIANGLES : opt_mode;
  this.textures = textures;
  this.textureUnits = textureUnits;
  this.setProgram(program);
}

tdl.models.Model.prototype.setProgram = function(program) {
  this.program = program;
}

tdl.models.Model.prototype.setBuffer = function(name, array, opt_newBuffer) {
  var target = (name == 'indices') ? gl.ELEMENT_ARRAY_BUFFER : gl.ARRAY_BUFFER;
  var b = this.buffers[name];
  if (!b || opt_newBuffer) {
    b = new tdl.buffers.Buffer(array, target);
  } else {
    b.set(array);
  }
  this.buffers[name] = b;
};

tdl.models.Model.prototype.setBuffers = function(arrays, opt_newBuffers) {
  var that = this;
  for (var name in arrays) {
    this.setBuffer(name, arrays[name], opt_newBuffers);
  }
  if (this.buffers.indices) {
    this.baseBuffer = this.buffers.indices;
    this.drawFunc = function(totalComponents, startOffset) {
      gl.drawElements(that.mode, totalComponents, gl.UNSIGNED_SHORT, startOffset);
    }
  } else {
    for (var key in this.buffers) {
      this.baseBuffer = this.buffers[key];
      break;
    }
    this.drawFunc = function(totalComponents, startOffset) {
      gl.drawArrays(that.mode, startOffset, totalComponents);
    }
  }
};

tdl.models.Model.prototype.applyUniforms_ = function(opt_uniforms) {
  if (opt_uniforms) {
    var program = this.program;
    for (var uniform in opt_uniforms) {
      program.setUniform(uniform, opt_uniforms[uniform]);
    }
  }
};

/**
 * Sets up the shared parts of drawing this model. Uses the
 * program, binds the buffers, sets the textures.
 *
 * @param {!Object.<string, *>} opt_uniforms An object of names to
 *     values to set on this models uniforms.
 * @param {!Object.<string, *>} opt_textures An object of names to
 *     textures to set on this models uniforms.
 */
tdl.models.Model.prototype.drawPrep = function() {
  var program = this.program;
  var buffers = this.buffers;
  var textures = this.textures;

  program.use();
  for (var buffer in buffers) {
    var b = buffers[buffer];
    if (buffer == 'indices') {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b.buffer());
    } else {
      var attrib = program.attrib[buffer];
      if (attrib) {
        attrib(b);
      }
    }
  }

  this.applyUniforms_(textures);
  for (var ii = 0; ii < arguments.length; ++ii) {
    this.applyUniforms_(arguments[ii]);
  }
};

/**
 * Draws this model.
 *
 * After calling tdl.models.Model.drawPrep you can call this
 * function multiple times to draw this model.
 *
 * @param {!Object.<string, *>} opt_uniforms An object of names to
 *     values to set on this models uniforms.
 * @param {!Object.<string, *>} opt_textures An object of names to
 *     textures to set on this models uniforms.
 */
tdl.models.Model.prototype.draw = function() {
  var buffers = this.buffers;
  var totalComponents = buffers.indices.totalComponents();
  var startOffset = 0;
  for (var ii = 0; ii < arguments.length; ++ii) {
    var arg = arguments[ii];
    if (typeof arg == 'number') {
      switch (ii) {
      case 0:
        totalComponents = arg;
        break;
      case 1:
        startOffset = arg;
        break;
      default:
        throw 'unvalid argument';
      }
    } else {
      this.applyUniforms_(arg);
    }
  }

  this.drawFunc(totalComponents, startOffset);
};
/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview This file contains various functions and classes for rendering
 * gpu based particles.
 */

//tdl.provide('tdl.particles');

//tdl.require('tdl.math');

//tdl.require('tdl.shader');

/**
 * A Module with various io functions and classes.
 * @namespace
 */
tdl.particles = tdl.particles || {};

/**
 * Enum for pre-made particle states.
 * @enum
 */
tdl.particles.ParticleStateIds = {
  BLEND: 0,
  ADD: 1,
  BLEND_PREMULTIPLY: 2,
  BLEND_NO_ALPHA: 3,
  SUBTRACT: 4,
  INVERSE: 5};

/**
 * Vertex and fragment program strings for 2D and 3D particles.
 * @private
 * @type {!Array.<string>}
 */
tdl.particles.SHADER_STRINGS = [
  // 3D (oriented) vertex shader
  'uniform mat4 worldViewProjection;\n' +
  'uniform mat4 world;\n' +
  'uniform vec3 worldVelocity;\n' +
  'uniform vec3 worldAcceleration;\n' +
  'uniform float timeRange;\n' +
  'uniform float time;\n' +
  'uniform float timeOffset;\n' +
  'uniform float frameDuration;\n' +
  'uniform float numFrames;\n' +
  '\n' +
  '// Incoming vertex attributes\n' +
  'attribute vec4 uvLifeTimeFrameStart; // uv, lifeTime, frameStart\n' +
  'attribute vec4 positionStartTime;    // position.xyz, startTime\n' +
  'attribute vec4 velocityStartSize;    // velocity.xyz, startSize\n' +
  'attribute vec4 accelerationEndSize;  // acceleration.xyz, endSize\n' +
  'attribute vec4 spinStartSpinSpeed;   // spinStart.x, spinSpeed.y\n' +
  'attribute vec4 orientation;          // orientation quaternion\n' +
  'attribute vec4 colorMult;            // multiplies color and ramp textures\n' +
  '\n' +
  '// Outgoing variables to fragment shader\n' +
  'varying vec2 outputTexcoord;\n' +
  'varying float outputPercentLife;\n' +
  'varying vec4 outputColorMult;\n' +
  '\n' +
  'void main() {\n' +
  '  vec2 uv = uvLifeTimeFrameStart.xy;\n' +
  '  float lifeTime = uvLifeTimeFrameStart.z;\n' +
  '  float frameStart = uvLifeTimeFrameStart.w;\n' +
  '  vec3 position = positionStartTime.xyz;\n' +
  '  float startTime = positionStartTime.w;\n' +
  '  vec3 velocity = (world * vec4(velocityStartSize.xyz,\n' +
  '                                0.)).xyz + worldVelocity;\n' +
  '  float startSize = velocityStartSize.w;\n' +
  '  vec3 acceleration = (world * vec4(accelerationEndSize.xyz,\n' +
  '                                    0)).xyz + worldAcceleration;\n' +
  '  float endSize = accelerationEndSize.w;\n' +
  '  float spinStart = spinStartSpinSpeed.x;\n' +
  '  float spinSpeed = spinStartSpinSpeed.y;\n' +
  '\n' +
  '  float localTime = mod((time - timeOffset - startTime), timeRange);\n' +
  '  float percentLife = localTime / lifeTime;\n' +
  '\n' +
  '  float frame = mod(floor(localTime / frameDuration + frameStart),\n' +
  '                    numFrames);\n' +
  '  float uOffset = frame / numFrames;\n' +
  '  float u = uOffset + (uv.x + 0.5) * (1. / numFrames);\n' +
  '\n' +
  '  outputTexcoord = vec2(u, uv.y + 0.5);\n' +
  '  outputColorMult = colorMult;\n' +
  '\n' +
  '  float size = mix(startSize, endSize, percentLife);\n' +
  '  size = (percentLife < 0. || percentLife > 1.) ? 0. : size;\n' +
  '  float s = sin(spinStart + spinSpeed * localTime);\n' +
  '  float c = cos(spinStart + spinSpeed * localTime);\n' +
  '\n' +
  '  vec4 rotatedPoint = vec4((uv.x * c + uv.y * s) * size, 0., \n' +
  '                           (uv.x * s - uv.y * c) * size, 1.);\n' +
  '  vec3 center = velocity * localTime +\n' +
  '                acceleration * localTime * localTime + \n' +
  '                position;\n' +
  '\n' +
  '  vec4 q2 = orientation + orientation;\n' +
  '  vec4 qx = orientation.xxxw * q2.xyzx;\n' +
  '  vec4 qy = orientation.xyyw * q2.xyzy;\n' +
  '  vec4 qz = orientation.xxzw * q2.xxzz;\n' +
  '\n' +
  '  mat4 localMatrix = mat4(\n' +
  '      (1.0 - qy.y) - qz.z, \n' +
  '      qx.y + qz.w, \n' +
  '      qx.z - qy.w,\n' +
  '      0,\n' +
  '\n' +
  '      qx.y - qz.w, \n' +
  '      (1.0 - qx.x) - qz.z, \n' +
  '      qy.z + qx.w,\n' +
  '      0,\n' +
  '\n' +
  '      qx.z + qy.w, \n' +
  '      qy.z - qx.w, \n' +
  '      (1.0 - qx.x) - qy.y,\n' +
  '      0,\n' +
  '\n' +
  '      center.x, center.y, center.z, 1);\n' +
  '  rotatedPoint = localMatrix * rotatedPoint;\n' +
  '  outputPercentLife = percentLife;\n' +
  '  gl_Position = worldViewProjection * rotatedPoint;\n' +
  '}\n',

  // 2D (billboarded) vertex shader
  'uniform mat4 viewProjection;\n' +
  'uniform mat4 world;\n' +
  'uniform mat4 viewInverse;\n' +
  'uniform vec3 worldVelocity;\n' +
  'uniform vec3 worldAcceleration;\n' +
  'uniform float timeRange;\n' +
  'uniform float time;\n' +
  'uniform float timeOffset;\n' +
  'uniform float frameDuration;\n' +
  'uniform float numFrames;\n' +
  '\n' +
  '// Incoming vertex attributes\n' +
  'attribute vec4 uvLifeTimeFrameStart; // uv, lifeTime, frameStart\n' +
  'attribute vec4 positionStartTime;    // position.xyz, startTime\n' +
  'attribute vec4 velocityStartSize;    // velocity.xyz, startSize\n' +
  'attribute vec4 accelerationEndSize;  // acceleration.xyz, endSize\n' +
  'attribute vec4 spinStartSpinSpeed;   // spinStart.x, spinSpeed.y\n' +
  'attribute vec4 colorMult;            // multiplies color and ramp textures\n' +
  '\n' +
  '// Outgoing variables to fragment shader\n' +
  'varying vec2 outputTexcoord;\n' +
  'varying float outputPercentLife;\n' +
  'varying vec4 outputColorMult;\n' +
  '\n' +
  'void main() {\n' +
  '  vec2 uv = uvLifeTimeFrameStart.xy;\n' +
  '  float lifeTime = uvLifeTimeFrameStart.z;\n' +
  '  float frameStart = uvLifeTimeFrameStart.w;\n' +
  '  vec3 position = positionStartTime.xyz;\n' +
//  '  vec3 position = (world * vec4(positionStartTime.xyz, 1.0)).xyz;\n' +
  '  float startTime = positionStartTime.w;\n' +
  '  vec3 velocity = (world * vec4(velocityStartSize.xyz,\n' +
  '                                0.)).xyz + worldVelocity;\n' +
  '  float startSize = velocityStartSize.w;\n' +
  '  vec3 acceleration = (world * vec4(accelerationEndSize.xyz,\n' +
  '                                    0)).xyz + worldAcceleration;\n' +
  '  float endSize = accelerationEndSize.w;\n' +
  '  float spinStart = spinStartSpinSpeed.x;\n' +
  '  float spinSpeed = spinStartSpinSpeed.y;\n' +
  '\n' +
  '  float localTime = mod((time - timeOffset - startTime), timeRange);\n' +
  '  float percentLife = localTime / lifeTime;\n' +
  '\n' +
  '  float frame = mod(floor(localTime / frameDuration + frameStart),\n' +
  '                    numFrames);\n' +
  '  float uOffset = frame / numFrames;\n' +
  '  float u = uOffset + (uv.x + 0.5) * (1. / numFrames);\n' +
  '\n' +
  '  outputTexcoord = vec2(u, uv.y + 0.5);\n' +
  '  outputColorMult = colorMult;\n' +
  '\n' +
  '  vec3 basisX = viewInverse[0].xyz;\n' +
  '  vec3 basisZ = viewInverse[1].xyz;\n' +
  '\n' +
  '  float size = mix(startSize, endSize, percentLife);\n' +
  '  size = (percentLife < 0. || percentLife > 1.) ? 0. : size;\n' +
  '  float s = sin(spinStart + spinSpeed * localTime);\n' +
  '  float c = cos(spinStart + spinSpeed * localTime);\n' +
  '\n' +
  '  vec2 rotatedPoint = vec2(uv.x * c + uv.y * s, \n' +
  '                           -uv.x * s + uv.y * c);\n' +
  '  vec3 localPosition = vec3(basisX * rotatedPoint.x +\n' +
  '                            basisZ * rotatedPoint.y) * size +\n' +
  '                       velocity * localTime +\n' +
  '                       acceleration * localTime * localTime + \n' +
  '                       position;\n' +
  '\n' +
  '  outputPercentLife = percentLife;\n' +
  '  gl_Position = viewProjection * vec4(localPosition + world[3].xyz, 1.);\n' +
  '}\n',

  // Fragment shader used by both 2D and 3D vertex shaders
  '#ifdef GL_ES\n' +
  'precision highp float;\n' +
  '#endif\n' +
  'uniform sampler2D rampSampler;\n' +
  'uniform sampler2D colorSampler;\n' +
  '\n' +
  '// Incoming variables from vertex shader\n' +
  'varying vec2 outputTexcoord;\n' +
  'varying float outputPercentLife;\n' +
  'varying vec4 outputColorMult;\n' +
  '\n' +
  'void main() {\n' +
  '  vec4 colorMult = texture2D(rampSampler, \n' +
  '                             vec2(outputPercentLife, 0.5)) *\n' +
  '                   outputColorMult;\n' +
  '  gl_FragColor = texture2D(colorSampler, outputTexcoord) * colorMult;\n' +
  // For debugging: requires setup of some uniforms and vertex
  // attributes to be commented out to avoid GL errors
  //  '  gl_FragColor = vec4(1., 0., 0., 1.);\n' +
  '}\n'
];

/**
 * Corner values.
 * @private
 * @type {!Array.<!Array.<number>>}
 */
tdl.particles.CORNERS_ = [
  [-0.5, -0.5],
  [+0.5, -0.5],
  [+0.5, +0.5],
  [-0.5, +0.5]];

/**
 * Creates a particle system.
 * You only need one of these to run multiple emitters of different types
 * of particles.
 * @constructor
 * @param {!WebGLRenderingContext} gl The WebGLRenderingContext
 *     into which the particles will be rendered.
 * @param {!function(): number} opt_clock A function that returns the
 *     number of seconds elapsed. The "time base" does not matter; it is
 *     corrected for internally in the particle system. If not supplied,
 *     wall clock time defined by the JavaScript Date API will be used.
 * @param {!function(): number} opt_randomFunction A function that returns
 *     a random number between 0.0 and 1.0. This allows you to pass in a
 *     pseudo random function if you need particles that are reproducible.
 */
tdl.particles.ParticleSystem = function(gl,
                                          opt_clock,
                                          opt_randomFunction) {
  this.gl = gl;

  // Entities which can be drawn -- emitters or OneShots
  this.drawables_ = [];

  var shaders = [];
  shaders.push(new tdl.shader.Shader(gl,
                                       tdl.particles.SHADER_STRINGS[0],
                                       tdl.particles.SHADER_STRINGS[2]));
  shaders.push(new tdl.shader.Shader(gl,
                                       tdl.particles.SHADER_STRINGS[1],
                                       tdl.particles.SHADER_STRINGS[2]));

  var blendFuncs = {};
  blendFuncs[tdl.particles.ParticleStateIds.BLEND] = {
    src:  gl.SRC_ALPHA,
    dest: gl.ONE_MINUS_SRC_ALPHA
  };
  blendFuncs[tdl.particles.ParticleStateIds.ADD] = {
    src:  gl.SRC_ALPHA,
    dest: gl.ONE
  };
  blendFuncs[tdl.particles.ParticleStateIds.BLEND_PREMULTIPLY] = {
    src:  gl.ONE,
    dest: gl.ONE_MINUS_SRC_ALPHA
  };
  blendFuncs[tdl.particles.ParticleStateIds.BLEND_NO_ALPHA] = {
    src:  gl.SRC_COLOR,
    dest: gl.ONE_MINUS_SRC_COLOR
  };
  blendFuncs[tdl.particles.ParticleStateIds.SUBTRACT] = {
    src:  gl.SRC_ALPHA,
    dest: gl.ONE_MINUS_SRC_ALPHA,
    eq:   gl.FUNC_REVERSE_SUBTRACT
  };
  blendFuncs[tdl.particles.ParticleStateIds.INVERSE] = {
    src:  gl.ONE_MINUS_DST_COLOR,
    dest: gl.ONE_MINUS_SRC_COLOR
  };
  this.blendFuncs_ = blendFuncs;

  var pixelBase = [0, 0.20, 0.70, 1, 0.70, 0.20, 0, 0];
  var pixels = [];
  for (var yy = 0; yy < 8; ++yy) {
    for (var xx = 0; xx < 8; ++xx) {
      var pixel = pixelBase[xx] * pixelBase[yy];
      pixels.push(pixel, pixel, pixel, pixel);
    }
  }
  var colorTexture = this.createTextureFromFloats(8, 8, pixels);
  // Note difference in texture size from O3D sample to avoid NPOT
  // texture creation
  var rampTexture = this.createTextureFromFloats(2, 1, [1, 1, 1, 1,
                                                        1, 1, 1, 0]);

  this.now_ = new Date();
  this.timeBase_ = new Date();
  if (opt_clock) {
    this.timeSource_ = opt_clock;
  } else {
    this.timeSource_ = tdl.particles.createDefaultClock_(this);
  }

  this.randomFunction_ = opt_randomFunction || function() {
        return Math.random();
      };

  // This FloatArray is used to store a single particle's data
  // in the VBO. As of this writing there wasn't a way to store less
  // than a full WebGLArray's data in a bufferSubData call.
  this.singleParticleArray_ = new Float32Array(4 * tdl.particles.LAST_IDX);

  /**
   * The shaders for particles.
   * @type {!Array.<!Shader>}
   */
  this.shaders = shaders;

  /**
   * The default color texture for particles.
   * @type {!o3d.Texture2D}
   */
  this.defaultColorTexture = colorTexture;

  /**
   * The default ramp texture for particles.
   * @type {!o3d.Texture2D}
   */
  this.defaultRampTexture = rampTexture;
};

tdl.particles.createDefaultClock_ = function(particleSystem) {
  return function() {
    var now = particleSystem.now_;
    var base = particleSystem.timeBase_;
    return (now.getTime() - base.getTime()) / 1000.0;
  }
}

/**
 * Creates an OpenGL texture from an array of floating point values.
 * @private
 */
tdl.particles.ParticleSystem.prototype.createTextureFromFloats = function(width, height, pixels, opt_texture) {
  var gl = this.gl;
  var texture = null;
  if (opt_texture != null) {
    texture = opt_texture;
  } else {
    texture = gl.createTexture();
  }
  // = opt_texture || gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  // FIXME: this is not 100% correct; will end up extending the ends
  // of the range too far out toward the edge. Really need to pull in
  // the texture coordinates used to sample this texture by half a
  // texel.
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  var data = new Uint8Array(pixels.length);
  for (var i = 0; i < pixels.length; i++) {
    var t = pixels[i] * 255.;
    data[i] = t;
  }
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
  return texture;
}

/**
 * A ParticleSpec specifies how to emit particles.
 *
 * NOTE: For all particle functions you can specific a ParticleSpec as a
 * Javascript object, only specifying the fields that you care about.
 *
 * <pre>
 * emitter.setParameters({
 *   numParticles: 40,
 *   lifeTime: 2,
 *   timeRange: 2,
 *   startSize: 50,
 *   endSize: 90,
 *   positionRange: [10, 10, 10],
 *   velocity:[0, 0, 60], velocityRange: [15, 15, 15],
 *   acceleration: [0, 0, -20],
 *   spinSpeedRange: 4}
 * );
 * </pre>
 *
 * Many of these parameters are in pairs. For paired paramters each particle
 * specfic value is set like this
 *
 * particle.field = value + Math.random() - 0.5 * valueRange * 2;
 *
 * or in English
 *
 * particle.field = value plus or minus valueRange.
 *
 * So for example, if you wanted a value from 10 to 20 you'd pass 15 for value
 * and 5 for valueRange because
 *
 * 15 + or - 5  = (10 to 20)
 *
 * @constructor
 */
tdl.particles.ParticleSpec = function() {
  /**
   * The number of particles to emit.
   * @type {number}
   */
  this.numParticles = 1;

  /**
   * The number of frames in the particle texture.
   * @type {number}
   */
  this.numFrames = 1;

  /**
   * The frame duration at which to animate the particle texture in seconds per
   * frame.
   * @type {number}
   */
  this.frameDuration = 1;

  /**
   * The initial frame to display for a particular particle.
   * @type {number}
   */
  this.frameStart = 0;

  /**
   * The frame start range.
   * @type {number}
   */
  this.frameStartRange = 0;

  /**
   * The life time of the entire particle system.
   * To make a particle system be continuous set this to match the lifeTime.
   * @type {number}
   */
  this.timeRange = 99999999;

  /**
   * The startTime of a particle.
   * @type {?number}
   */
  this.startTime = null;
  // TODO: Describe what happens if this is not set. I still have some
  //     work to do there.

  /**
   * The lifeTime of a particle.
   * @type {number}
   */
  this.lifeTime = 1;

  /**
   * The lifeTime range.
   * @type {number}
   */
  this.lifeTimeRange = 0;

  /**
   * The starting size of a particle.
   * @type {number}
   */
  this.startSize = 1;

  /**
   * The starting size range.
   * @type {number}
   */
  this.startSizeRange = 0;

  /**
   * The ending size of a particle.
   * @type {number}
   */
  this.endSize = 1;

  /**
   * The ending size range.
   * @type {number}
   */
  this.endSizeRange = 0;

  /**
   * The starting position of a particle in local space.
   * @type {!tdl.math.Vector3}
   */
  this.position = [0, 0, 0];

  /**
   * The starting position range.
   * @type {!tdl.math.Vector3}
   */
  this.positionRange = [0, 0, 0];

  /**
   * The velocity of a paritcle in local space.
   * @type {!tdl.math.Vector3}
   */
  this.velocity = [0, 0, 0];

  /**
   * The velocity range.
   * @type {!tdl.math.Vector3}
   */
  this.velocityRange = [0, 0, 0];

  /**
   * The acceleration of a particle in local space.
   * @type {!tdl.math.Vector3}
   */
  this.acceleration = [0, 0, 0];

  /**
   * The accleration range.
   * @type {!tdl.math.Vector3}
   */
  this.accelerationRange = [0, 0, 0];

  /**
   * The starting spin value for a particle in radians.
   * @type {number}
   */
  this.spinStart = 0;

  /**
   * The spin start range.
   * @type {number}
   */
  this.spinStartRange = 0;

  /**
   * The spin speed of a particle in radians.
   * @type {number}
   */
  this.spinSpeed = 0;

  /**
   * The spin speed range.
   * @type {number}
   */
  this.spinSpeedRange = 0;

  /**
   * The color multiplier of a particle.
   * @type {!tdl.math.Vector4}
   */
  this.colorMult = [1, 1, 1, 1];

  /**
   * The color multiplier range.
   * @type {!tdl.math.Vector4}
   */
  this.colorMultRange = [0, 0, 0, 0];

  /**
   * The velocity of all paritcles in world space.
   * @type {!tdl.math.Vector3}
   */
  this.worldVelocity = [0, 0, 0];

  /**
   * The acceleration of all paritcles in world space.
   * @type {!tdl.math.Vector3}
   */
  this.worldAcceleration = [0, 0, 0];

  /**
   * Whether these particles are oriented in 2d or 3d. true = 2d, false = 3d.
   * @type {boolean}
   */
  this.billboard = true;

  /**
   * The orientation of a particle. This is only used if billboard is false.
   * @type {!tdl.quaternions.Quaternion}
   */
  this.orientation = [0, 0, 0, 1];
};

/**
 * Creates a particle emitter.
 * @param {!o3d.Texture} opt_texture The texture to use for the particles.
 *     If you don't supply a texture a default is provided.
 * @param {!function(): number} opt_clock

 A ParamFloat to be the clock for
 *     the emitter.
 * @return {!tdl.particles.ParticleEmitter} The new emitter.
 */
tdl.particles.ParticleSystem.prototype.createParticleEmitter =
    function(opt_texture, opt_clock) {
  var emitter = new tdl.particles.ParticleEmitter(this, opt_texture, opt_clock);
  this.drawables_.push(emitter);
  return emitter;
};

/**
 * Creates a Trail particle emitter.
 * You can use this for jet exhaust, etc...
 * @param {!o3d.Transform} parent Transform to put emitter on.
 * @param {number} maxParticles Maximum number of particles to appear at once.
 * @param {!tdl.particles.ParticleSpec} parameters The parameters used to
 *     generate particles.
 * @param {!o3d.Texture} opt_texture The texture to use for the particles.
 *     If you don't supply a texture a default is provided.
 * @param {!function(number, !tdl.particles.ParticleSpec): void}
 *     opt_perParticleParamSetter A function that is called for each particle to
 *     allow it's parameters to be adjusted per particle. The number is the
 *     index of the particle being created, in other words, if numParticles is
 *     20 this value will be 0 to 19. The ParticleSpec is a spec for this
 *     particular particle. You can set any per particle value before returning.
 * @param {!function(): number} opt_clock A function to be the clock for
 *     the emitter.
 * @return {!tdl.particles.Trail} A Trail object.
 */
tdl.particles.ParticleSystem.prototype.createTrail = function(
    maxParticles,
    parameters,
    opt_texture,
    opt_perParticleParamSetter,
    opt_clock) {
  var trail = new tdl.particles.Trail(
      this,
      maxParticles,
      parameters,
      opt_texture,
      opt_perParticleParamSetter,
      opt_clock);
  this.drawables_.push(trail);
  return trail;
};

/**
 * Draws all of the particle emitters managed by this ParticleSystem.
 * This modifies the depth mask, depth test, blend function and its
 * enabling, array buffer binding, element array buffer binding, the
 * textures bound to texture units 0 and 1, and which is the active
 * texture unit.
 * @param {!Matrix4x4} viewProjection The viewProjection matrix.
 * @param {!Matrix4x4} world The world matrix.
 * @param {!Matrix4x4} viewInverse The viewInverse matrix.
 */
tdl.particles.ParticleSystem.prototype.draw = function(viewProjection, world, viewInverse) {
  // Update notion of current time
  this.now_ = new Date();
  // Set up global state
  var gl = this.gl;
  gl.depthMask(false);
  gl.enable(gl.DEPTH_TEST);
  // Set up certain uniforms once per shader per draw.
  var shader = this.shaders[1];
  shader.bind();
  gl.uniformMatrix4fv(shader.viewProjectionLoc,
                      false,
                      viewProjection);
  gl.uniformMatrix4fv(shader.viewInverseLoc,
                      false,
                      viewInverse);
  // Draw all emitters
  // FIXME: this is missing O3D's z-sorting logic from the
  // zOrderedDrawList
  for (var ii = 0; ii < this.drawables_.length; ++ii) {
    this.drawables_[ii].draw(world, viewProjection, 0);
  }
};

// Base element indices for the interleaved floating point data.
// Each of the four corners of the particle has four floats for each
// of these pieces of information.
tdl.particles.UV_LIFE_TIME_FRAME_START_IDX = 0;
tdl.particles.POSITION_START_TIME_IDX = 4;
tdl.particles.VELOCITY_START_SIZE_IDX = 8;
tdl.particles.ACCELERATION_END_SIZE_IDX = 12;
tdl.particles.SPIN_START_SPIN_SPEED_IDX = 16;
tdl.particles.ORIENTATION_IDX = 20;
tdl.particles.COLOR_MULT_IDX = 24;
tdl.particles.LAST_IDX = 28;

/**
 * A ParticleEmitter
 * @private
 * @constructor
 * @param {!tdl.particles.ParticleSystem} particleSystem The particle system
 *     to manage this emitter.
 * @param {!o3d.Texture} opt_texture The texture to use for the particles.
 *     If you don't supply a texture a default is provided.
 * @param {!function(): number} opt_clock (optional) A function that
 *     returns the number of seconds elapsed.
 A function, returning
 *     seconds elapsed, to be the time source for the emitter.
 */
tdl.particles.ParticleEmitter = function(particleSystem,
                                           opt_texture,
                                           opt_clock) {
  opt_clock = opt_clock || particleSystem.timeSource_;

  this.gl = particleSystem.gl;

  this.createdParticles_ = false;

  this.tmpWorld_ = new Float32Array(16);

  // This Float32Array is used to store a single particle's data
  // in the VBO. As of this writing there wasn't a way to store less
  // than a full WebGLArray's data in a bufferSubData call.
  this.singleParticleArray_ = new Float32Array(4 * tdl.particles.LAST_IDX);

  // The VBO holding the particles' data, (re-)allocated in
  // allocateParticles_().
  this.particleBuffer_ = gl.createBuffer();

  // The buffer object holding the particles' indices, (re-)allocated
  // in allocateParticles_().
  this.indexBuffer_ = gl.createBuffer();

  // The number of particles that are stored in the particle buffer.
  this.numParticles_ = 0;

  this.rampTexture_ = particleSystem.defaultRampTexture;
  this.colorTexture_ = opt_texture || particleSystem.defaultColorTexture;

  /**
   * The particle system managing this emitter.
   * @type {!tdl.particles.ParticleSystem}
   */
  this.particleSystem = particleSystem;

  /**
   * A function that is the source for the time for this emitter.
   * @private
   * @type {!function(): number}
   */
  this.timeSource_ = opt_clock;

  /**
   * The translation for this ParticleEmitter. (FIXME: generalize.)
   * @private
   * @type {!tdl.math.Vector3}
   */
  this.translation_ = [0, 0, 0];

  // Set up the blend functions for drawing the particles.
  this.setState(tdl.particles.ParticleStateIds.BLEND);
};

/**
 * Sets the world translation for this ParticleEmitter.
 * @param {!tdl.math.Vector3} translation The translation for this emitter.
 */
tdl.particles.ParticleEmitter.prototype.setTranslation = function(x, y, z) {
  this.translation_[0] = x;
  this.translation_[1] = y;
  this.translation_[2] = z;
};

/**
 * Sets the blend state for the particles.
 * You can use this to set the emitter to draw with BLEND, ADD, SUBTRACT, etc.
 * @param {ParticleStateIds} stateId The state you want.
 */
tdl.particles.ParticleEmitter.prototype.setState = function(stateId) {
  this.blendFunc_ = this.particleSystem.blendFuncs_[stateId];
};

/**
 * Sets the colorRamp for the particles.
 * The colorRamp is used as a multiplier for the texture. When a particle
 * starts it is multiplied by the first color, as it ages to progressed
 * through the colors in the ramp.
 *
 * <pre>
 * particleEmitter.setColorRamp([
 *   1, 0, 0, 1,    // red
 *   0, 1, 0, 1,    // green
 *   1, 0, 1, 0]);  // purple but with zero alpha
 * </pre>
 *
 * The code above sets the particle to start red, change to green then
 * fade out while changing to purple.
 *
 * @param {!Array.<number>} colorRamp An array of color values in
 *     the form RGBA.
 */
tdl.particles.ParticleEmitter.prototype.setColorRamp = function(colorRamp) {
  var width = colorRamp.length / 4;
  if (width % 1 != 0) {
    throw 'colorRamp must have multiple of 4 entries';
  }

  var gl = this.gl;

  if (this.rampTexture_ == this.particleSystem.defaultRampTexture) {
    this.rampTexture_ = null;
  }

  this.rampTexture_ = this.particleSystem.createTextureFromFloats(width, 1, colorRamp, this.rampTexture_);
};

/**
 * Validates and adds missing particle parameters.
 * @param {!tdl.particles.ParticleSpec} parameters The parameters to validate.
 */
tdl.particles.ParticleEmitter.prototype.validateParameters = function(
    parameters) {
  var defaults = new tdl.particles.ParticleSpec();
  for (var key in parameters) {
    if (typeof defaults[key] === 'undefined') {
      throw 'unknown particle parameter "' + key + '"';
    }
  }
  for (var key in defaults) {
    if (typeof parameters[key] === 'undefined') {
      parameters[key] = defaults[key];
    }
  }
};

/**
 * Creates particles.
 * @private
 * @param {number} firstParticleIndex Index of first particle to create.
 * @param {number} numParticles The number of particles to create.
 * @param {!tdl.particles.ParticleSpec} parameters The parameters for the
 *     emitters.
 * @param {!function(number, !tdl.particles.ParticleSpec): void}
 *     opt_perParticleParamSetter A function that is called for each particle to
 *     allow it's parameters to be adjusted per particle. The number is the
 *     index of the particle being created, in other words, if numParticles is
 *     20 this value will be 0 to 19. The ParticleSpec is a spec for this
 *     particular particle. You can set any per particle value before returning.
 */
tdl.particles.ParticleEmitter.prototype.createParticles_ = function(
    firstParticleIndex,
    numParticles,
    parameters,
    opt_perParticleParamSetter) {
  var singleParticleArray = this.particleSystem.singleParticleArray_;
  var gl = this.gl;

  // Set the globals.
  this.billboard_ = parameters.billboard;
  this.timeRange_ = parameters.timeRange;
  this.numFrames_ = parameters.numFrames;
  this.frameDuration_ = parameters.frameDuration;
  this.worldVelocity_ = [ parameters.worldVelocity[0],
                          parameters.worldVelocity[1],
                          parameters.worldVelocity[2] ];
  this.worldAcceleration_ = [ parameters.worldAcceleration[0],
                              parameters.worldAcceleration[1],
                              parameters.worldAcceleration[2] ];

  var random = this.particleSystem.randomFunction_;

  var plusMinus = function(range) {
    return (random() - 0.5) * range * 2;
  };

  // TODO: change to not allocate.
  var plusMinusVector = function(range) {
    var v = [];
    for (var ii = 0; ii < range.length; ++ii) {
      v.push(plusMinus(range[ii]));
    }
    return v;
  };

  gl.bindBuffer(gl.ARRAY_BUFFER, this.particleBuffer_);

  for (var ii = 0; ii < numParticles; ++ii) {
    if (opt_perParticleParamSetter) {
      opt_perParticleParamSetter(ii, parameters);
    }
    var pLifeTime = parameters.lifeTime;
    var pStartTime = (parameters.startTime === null) ?
        (ii * parameters.lifeTime / numParticles) : parameters.startTime;
    var pFrameStart =
        parameters.frameStart + plusMinus(parameters.frameStartRange);
    var pPosition = tdl.math.addVector(
        parameters.position, plusMinusVector(parameters.positionRange));
    var pVelocity = tdl.math.addVector(
        parameters.velocity, plusMinusVector(parameters.velocityRange));
    var pAcceleration = tdl.math.addVector(
        parameters.acceleration,
        plusMinusVector(parameters.accelerationRange));
    var pColorMult = tdl.math.addVector(
        parameters.colorMult, plusMinusVector(parameters.colorMultRange));
    var pSpinStart =
        parameters.spinStart + plusMinus(parameters.spinStartRange);
    var pSpinSpeed =
        parameters.spinSpeed + plusMinus(parameters.spinSpeedRange);
    var pStartSize =
        parameters.startSize + plusMinus(parameters.startSizeRange);
    var pEndSize = parameters.endSize + plusMinus(parameters.endSizeRange);
    var pOrientation = parameters.orientation;

    // make each corner of the particle.
    for (var jj = 0; jj < 4; ++jj) {
      var offset0 = tdl.particles.LAST_IDX * jj;
      var offset1 = offset0 + 1;
      var offset2 = offset0 + 2;
      var offset3 = offset0 + 3;

      singleParticleArray[tdl.particles.UV_LIFE_TIME_FRAME_START_IDX + offset0] = tdl.particles.CORNERS_[jj][0];
      singleParticleArray[tdl.particles.UV_LIFE_TIME_FRAME_START_IDX + offset1] = tdl.particles.CORNERS_[jj][1];
      singleParticleArray[tdl.particles.UV_LIFE_TIME_FRAME_START_IDX + offset2] = pLifeTime;
      singleParticleArray[tdl.particles.UV_LIFE_TIME_FRAME_START_IDX + offset3] = pFrameStart;

      singleParticleArray[tdl.particles.POSITION_START_TIME_IDX + offset0] = pPosition[0];
      singleParticleArray[tdl.particles.POSITION_START_TIME_IDX + offset1] = pPosition[1];
      singleParticleArray[tdl.particles.POSITION_START_TIME_IDX + offset2] = pPosition[2];
      singleParticleArray[tdl.particles.POSITION_START_TIME_IDX + offset3] = pStartTime;

      singleParticleArray[tdl.particles.VELOCITY_START_SIZE_IDX + offset0] = pVelocity[0];
      singleParticleArray[tdl.particles.VELOCITY_START_SIZE_IDX + offset1] = pVelocity[1];
      singleParticleArray[tdl.particles.VELOCITY_START_SIZE_IDX + offset2] = pVelocity[2];
      singleParticleArray[tdl.particles.VELOCITY_START_SIZE_IDX + offset3] = pStartSize;

      singleParticleArray[tdl.particles.ACCELERATION_END_SIZE_IDX + offset0] = pAcceleration[0];
      singleParticleArray[tdl.particles.ACCELERATION_END_SIZE_IDX + offset1] = pAcceleration[1];
      singleParticleArray[tdl.particles.ACCELERATION_END_SIZE_IDX + offset2] = pAcceleration[2];
      singleParticleArray[tdl.particles.ACCELERATION_END_SIZE_IDX + offset3] = pEndSize;

      singleParticleArray[tdl.particles.SPIN_START_SPIN_SPEED_IDX + offset0] = pSpinStart;
      singleParticleArray[tdl.particles.SPIN_START_SPIN_SPEED_IDX + offset1] = pSpinSpeed;
      singleParticleArray[tdl.particles.SPIN_START_SPIN_SPEED_IDX + offset2] = 0;
      singleParticleArray[tdl.particles.SPIN_START_SPIN_SPEED_IDX + offset3] = 0;

      singleParticleArray[tdl.particles.ORIENTATION_IDX + offset0] = pOrientation[0];
      singleParticleArray[tdl.particles.ORIENTATION_IDX + offset1] = pOrientation[1];
      singleParticleArray[tdl.particles.ORIENTATION_IDX + offset2] = pOrientation[2];
      singleParticleArray[tdl.particles.ORIENTATION_IDX + offset3] = pOrientation[3];

      singleParticleArray[tdl.particles.COLOR_MULT_IDX + offset0] = pColorMult[0];
      singleParticleArray[tdl.particles.COLOR_MULT_IDX + offset1] = pColorMult[1];
      singleParticleArray[tdl.particles.COLOR_MULT_IDX + offset2] = pColorMult[2];
      singleParticleArray[tdl.particles.COLOR_MULT_IDX + offset3] = pColorMult[3];
    }

    // Upload this particle's information into the VBO.
    // FIXME: probably want to make fewer bufferSubData calls
    gl.bufferSubData(gl.ARRAY_BUFFER,
                       singleParticleArray.byteLength * (ii + firstParticleIndex),
                       singleParticleArray);
  }

  this.createdParticles_ = true;
};

/**
 * Allocates particles.
 * @private
 * @param {number} numParticles Number of particles to allocate.
 */
tdl.particles.ParticleEmitter.prototype.allocateParticles_ = function(
    numParticles) {
  if (this.numParticles_ != numParticles) {
    var gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.particleBuffer_);
    gl.bufferData(gl.ARRAY_BUFFER,
                  numParticles * this.particleSystem.singleParticleArray_.byteLength,
                  gl.DYNAMIC_DRAW);
    var numIndices = 6 * numParticles;
    if (numIndices > 65536) {
      throw "can't have more than 10922 particles per emitter";
    }
    var indices = new Uint16Array(numIndices);
    var idx = 0;
    for (var ii = 0; ii < numParticles; ++ii) {
      // Make 2 triangles for the quad.
      var startIndex = ii * 4;
      indices[idx++] = startIndex + 0;
      indices[idx++] = startIndex + 1;
      indices[idx++] = startIndex + 2;
      indices[idx++] = startIndex + 0;
      indices[idx++] = startIndex + 2;
      indices[idx++] = startIndex + 3;
    }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,
                    this.indexBuffer_);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
                    indices,
                    gl.STATIC_DRAW);
    this.numParticles_ = numParticles;
  }
};

/**
 * Sets the parameters of the particle emitter.
 *
 * Each of these parameters are in pairs. The used to create a table
 * of particle parameters. For each particle a specfic value is
 * set like this
 *
 * particle.field = value + Math.random() - 0.5 * valueRange * 2;
 *
 * or in English
 *
 * particle.field = value plus or minus valueRange.
 *
 * So for example, if you wanted a value from 10 to 20 you'd pass 15 for value
 * and 5 for valueRange because
 *
 * 15 + or - 5  = (10 to 20)
 *
 * @param {!tdl.particles.ParticleSpec} parameters The parameters for the
 *     emitters.
 * @param {!function(number, !tdl.particles.ParticleSpec): void}
 *     opt_perParticleParamSetter A function that is called for each particle to
 *     allow it's parameters to be adjusted per particle. The number is the
 *     index of the particle being created, in other words, if numParticles is
 *     20 this value will be 0 to 19. The ParticleSpec is a spec for this
 *     particular particle. You can set any per particle value before returning.
 */
tdl.particles.ParticleEmitter.prototype.setParameters = function(
    parameters,
    opt_perParticleParamSetter) {
  this.validateParameters(parameters);

  var numParticles = parameters.numParticles;

  this.allocateParticles_(numParticles);
  this.createParticles_(
      0,
      numParticles,
      parameters,
      opt_perParticleParamSetter);
};

tdl.particles.ParticleEmitter.prototype.draw = function(world, viewProjection, timeOffset) {
  if (!this.createdParticles_) {
    return;
  }

  var gl = this.gl;

  // Set up blend function
  gl.enable(gl.BLEND);
  var blendFunc = this.blendFunc_;
  gl.blendFunc(blendFunc.src, blendFunc.dest);
  if (blendFunc.eq) {
    gl.blendEquation(blendFunc.eq);
  } else {
    gl.blendEquation(gl.FUNC_ADD);
  }

  var shader = this.particleSystem.shaders[this.billboard_ ? 1 : 0];
  shader.bind();

  var tmpWorld = this.tmpWorld_;
  tdl.fast.matrix4.copy(tmpWorld, world);

  tdl.fast.matrix4.translate(tmpWorld, this.translation_);
  gl.uniformMatrix4fv(shader.worldLoc,
                      false,
                      tmpWorld);
  if (!this.billboard_) {
    var worldViewProjection = new Float32Array(16);
    tdl.fast.matrix4.mul.mulMatrixMatrix4(worldViewProjection, tmpWorld, viewProjection);
    gl.uniformMatrix4fv(shader.worldViewProjectionLoc,
                        false,
                        worldViewProjection);
  }

  gl.uniform3f(shader.worldVelocityLoc,
               this.worldVelocity_[0],
               this.worldVelocity_[1],
               this.worldVelocity_[2]);
  gl.uniform3f(shader.worldAccelerationLoc,
               this.worldAcceleration_[0],
               this.worldAcceleration_[1],
               this.worldAcceleration_[2]);
  gl.uniform1f(shader.timeRangeLoc, this.timeRange_);
  gl.uniform1f(shader.numFramesLoc, this.numFrames_);
  gl.uniform1f(shader.frameDurationLoc, this.frameDuration_);

  // Compute and set time
  var curTime = this.timeSource_();
  gl.uniform1f(shader.timeLoc, curTime);
  // This is non-zero only for OneShots
  gl.uniform1f(shader.timeOffsetLoc, timeOffset);

  // Set up textures
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, this.rampTexture_);
  gl.uniform1i(shader.rampSamplerLoc, 0);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, this.colorTexture_);
  gl.uniform1i(shader.colorSamplerLoc, 1);
  gl.activeTexture(gl.TEXTURE0);

  // Set up vertex attributes
  var sizeofFloat = 4;
  var stride = sizeofFloat * tdl.particles.LAST_IDX;
  gl.bindBuffer(gl.ARRAY_BUFFER, this.particleBuffer_);
  gl.vertexAttribPointer(shader.uvLifeTimeFrameStartLoc, 4, gl.FLOAT, false, stride,
                         sizeofFloat * tdl.particles.UV_LIFE_TIME_FRAME_START_IDX);
  gl.enableVertexAttribArray(shader.uvLifeTimeFrameStartLoc);
  gl.vertexAttribPointer(shader.positionStartTimeLoc, 4, gl.FLOAT, false, stride,
                         sizeofFloat * tdl.particles.POSITION_START_TIME_IDX);
  gl.enableVertexAttribArray(shader.positionStartTimeLoc);
  gl.vertexAttribPointer(shader.velocityStartSizeLoc, 4, gl.FLOAT, false, stride,
                         sizeofFloat * tdl.particles.VELOCITY_START_SIZE_IDX);
  gl.enableVertexAttribArray(shader.velocityStartSizeLoc);
  gl.vertexAttribPointer(shader.accelerationEndSizeLoc, 4, gl.FLOAT, false, stride,
                         sizeofFloat * tdl.particles.ACCELERATION_END_SIZE_IDX);
  gl.enableVertexAttribArray(shader.accelerationEndSizeLoc);
  gl.vertexAttribPointer(shader.spinStartSpinSpeedLoc, 4, gl.FLOAT, false, stride,
                         sizeofFloat * tdl.particles.SPIN_START_SPIN_SPEED_IDX);
  gl.enableVertexAttribArray(shader.spinStartSpinSpeedLoc);
  // Only for non-billboarded, i.e., 3D, particles
  if (shader.orientationLoc != undefined) {
    gl.vertexAttribPointer(shader.orientationLoc, 4, gl.FLOAT, false, stride,
                           sizeofFloat * tdl.particles.ORIENTATION_IDX);
    gl.enableVertexAttribArray(shader.orientationLoc);
  }
  // NOTE: comment out the next two calls if using debug shader which
  // only outputs red.
  gl.vertexAttribPointer(shader.colorMultLoc, 4, gl.FLOAT, false, stride,
                         sizeofFloat * tdl.particles.COLOR_MULT_IDX);
  gl.enableVertexAttribArray(shader.colorMultLoc);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer_);
  gl.drawElements(gl.TRIANGLES, this.numParticles_ * 6,
                  gl.UNSIGNED_SHORT, 0);

  gl.disableVertexAttribArray(shader.uvLifeTimeFrameStartLoc);
  gl.disableVertexAttribArray(shader.positionStartTimeLoc);
  gl.disableVertexAttribArray(shader.velocityStartSizeLoc);
  gl.disableVertexAttribArray(shader.accelerationEndSizeLoc);
  gl.disableVertexAttribArray(shader.spinStartSpinSpeedLoc);
  // FIXME: only for billboarded, i.e., 3D, particles?
  if (shader.orientationLoc != undefined) {
    gl.disableVertexAttribArray(shader.orientationLoc);
  }
  gl.disableVertexAttribArray(shader.colorMultLoc);
};

/**
 * Creates a OneShot particle emitter instance.
 * You can use this for dust puffs, explosions, fireworks, etc...
 * @return {!tdl.particles.OneShot} A OneShot object.
 */
tdl.particles.ParticleEmitter.prototype.createOneShot = function() {
  return new tdl.particles.OneShot(this);
};

/**
 * An object to manage a particle emitter instance as a one
 * shot. Examples of one shot effects are things like an explosion,
 * some fireworks. Note that once a OneShot has been created for a
 * given emitter, that emitter can only be treated as containing one
 * or more OneShots.
 * @private
 * @constructor
 * @param {!tdl.particles.ParticleEmitter} emitter The emitter to use for the
 *     one shot.
 * @param {!o3d.Transform} opt_parent The parent for this one shot.
 */
tdl.particles.OneShot = function(emitter) {
  this.emitter_ = emitter;

  /**
   * Translation for OneShot.
   * @type {!tdl.math.Vector3}
   */
  this.world_ = tdl.fast.matrix4.translation(new Float32Array(16), [0, 0, 0]);
  this.tempWorld_ = tdl.fast.matrix4.translation(new Float32Array(16), [0, 0, 0]);
  this.timeOffset_ = 0;
  this.visible_ = false;

  // Remove the parent emitter from the particle system's drawable
  // list (if it's still there) and add ourselves instead.
  var particleSystem = emitter.particleSystem;
  var idx = particleSystem.drawables_.indexOf(emitter);
  if (idx >= 0) {
    particleSystem.drawables_.splice(idx, 1);
  }
  particleSystem.drawables_.push(this);
};

/**
 * Triggers the oneshot.
 *
 * Note: You must have set the parent either at creation, with setParent, or by
 * passing in a parent here.
 *
 * @param {!tdl.math.Vector3} opt_position The position of the one shot
 *     relative to its parent.
 */
tdl.particles.OneShot.prototype.trigger = function(opt_world) {
  if (opt_world) {
    this.world_.set(opt_world)
  }
  this.visible_ = true;
  this.timeOffset_ = this.emitter_.timeSource_();
};

/**
 * Draws the oneshot.
 *
 * @private
 */
tdl.particles.OneShot.prototype.draw = function(world, viewProjection, timeOffset) {
  if (this.visible_) {
    tdl.fast.matrix4.mul(this.tempWorld_, this.world_, world);
    this.emitter_.draw(this.tempWorld_, viewProjection, this.timeOffset_);
  }
};

/**
 * A type of emitter to use for particle effects that leave trails like exhaust.
 * @constructor
 * @extends {tdl.particles.ParticleEmitter}
 * @param {!tdl.particles.ParticleSystem} particleSystem The particle system
 *     to manage this emitter.
 * @param {!o3d.Transform} parent Transform to put emitter on.
 * @param {number} maxParticles Maximum number of particles to appear at once.
 * @param {!tdl.particles.ParticleSpec} parameters The parameters used to
 *     generate particles.
 * @param {!o3d.Texture} opt_texture The texture to use for the particles.
 *     If you don't supply a texture a default is provided.
 * @param {!function(number, !tdl.particles.ParticleSpec): void}
 *     opt_perParticleParamSetter A function that is called for each particle to
 *     allow it's parameters to be adjusted per particle. The number is the
 *     index of the particle being created, in other words, if numParticles is
 *     20 this value will be 0 to 19. The ParticleSpec is a spec for this
 *     particular particle. You can set any per particle value before returning.
 * @param {!function(): number} opt_clock A function to be the clock for
 *     the emitter.
 */
tdl.particles.Trail = function(
    particleSystem,
    maxParticles,
    parameters,
    opt_texture,
    opt_perParticleParamSetter,
    opt_clock) {
  tdl.particles.ParticleEmitter.call(
      this, particleSystem, opt_texture, opt_clock);

  this.allocateParticles_(maxParticles);
  this.validateParameters(parameters);

  this.parameters = parameters;
  this.perParticleParamSetter = opt_perParticleParamSetter;
  this.birthIndex_ = 0;
  this.maxParticles_ = maxParticles;
};

tdl.base.inherit(tdl.particles.Trail, tdl.particles.ParticleEmitter);

/**
 * Births particles from this Trail.
 * @param {!tdl.math.Vector3} position Position to birth particles at.
 */
tdl.particles.Trail.prototype.birthParticles = function(position) {
  var numParticles = this.parameters.numParticles;
  this.parameters.startTime = this.timeSource_();
  this.parameters.position = position;
  while (this.birthIndex_ + numParticles >= this.maxParticles_) {
    var numParticlesToEnd = this.maxParticles_ - this.birthIndex_;
    this.createParticles_(this.birthIndex_,
                          numParticlesToEnd,
                          this.parameters,
                          this.perParticleParamSetter);
    numParticles -= numParticlesToEnd;
    this.birthIndex_ = 0;
  }
  this.createParticles_(this.birthIndex_,
                        numParticles,
                        this.parameters,
                        this.perParticleParamSetter);
  this.birthIndex_ += numParticles;
};

tdl.particles.OneShotManager = function(emitter, numOneshots) {
  this.numOneshots = numOneshots;
  this.oneshotIndex = 0;
  this.oneshots = [];
  for (var ii = 0; ii < numOneshots; ++ii) {
     this.oneshots.push(emitter.createOneShot());
  }
};

tdl.particles.OneShotManager.prototype.startOneShot = function(worldMatrix) {
  this.oneshots[this.oneshotIndex].trigger(worldMatrix);
  this.oneshotIndex = (this.oneshotIndex + 1) % this.numOneshots;
};

tdl.particles.createOneShotManager = function(emitter, numOneshots) {
  return new tdl.particles.OneShotManager(emitter, numOneshots);
};

/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview This file contains objects to make primitives.
 */

//tdl.provide('tdl.primitives');

//tdl.require('tdl.math');
//tdl.require('tdl.log');

/**
 * A module for primitives.
 * @namespace
 */
tdl.primitives = tdl.primitives || {};

/**
 * AttribBuffer manages a TypedArray as an array of vectors.
 *
 * @param {number} numComponents Number of components per
 *     vector.
 * @param {number|!Array.<number>} numElements Number of vectors or the data.
 * @param {string} opt_type The type of the TypedArray to
 *     create. Default = 'Float32Array'.
 * @param {!Array.<number>} opt_data The data for the array.
 */
tdl.primitives.AttribBuffer = function(
    numComponents, numElements, opt_type) {
  opt_type = opt_type || 'Float32Array';
  var type = window[opt_type];
  if (numElements.length) {
    this.buffer = new type(numElements);
    numElements = this.buffer.length / numComponents;
    this.cursor = numElements;
  } else {
    this.buffer = new type(numComponents * numElements);
    this.cursor = 0;
  }
  this.numComponents = numComponents;
  this.numElements = numElements;
  this.type = opt_type;
};

tdl.primitives.AttribBuffer.prototype.stride = function() {
  return 0;
};

tdl.primitives.AttribBuffer.prototype.offset = function() {
  return 0;
};

tdl.primitives.AttribBuffer.prototype.getElement = function(index) {
  var offset = index * this.numComponents;
  var value = [];
  for (var ii = 0; ii < this.numComponents; ++ii) {
    value.push(this.buffer[offset + ii]);
  }
  return value;
};

tdl.primitives.AttribBuffer.prototype.setElement = function(index, value) {
  var offset = index * this.numComponents;
  for (var ii = 0; ii < this.numComponents; ++ii) {
    this.buffer[offset + ii] = value[ii];
  }
};

tdl.primitives.AttribBuffer.prototype.fillRange = function(index, count, value) {
  var offset = index * this.numComponents;
  for (var jj = 0; jj < count; ++jj) {
    for (var ii = 0; ii < this.numComponents; ++ii) {
      this.buffer[offset++] = value[ii];
    }
  }
};

tdl.primitives.AttribBuffer.prototype.clone = function() {
  var copy = new tdl.primitives.AttribBuffer(
      this.numComponents, this.numElements, this.type);
  copy.pushArray(this);
  return copy;
}

tdl.primitives.AttribBuffer.prototype.push = function(value) {
  this.setElement(this.cursor++, value);
};

tdl.primitives.AttribBuffer.prototype.pushArray = function(array) {
//  this.buffer.set(array, this.cursor * this.numComponents);
//  this.cursor += array.numElements;
  for (var ii = 0; ii < array.numElements; ++ii) {
    this.push(array.getElement(ii));
  }
};

tdl.primitives.AttribBuffer.prototype.pushArrayWithOffset =
   function(array, offset) {
  for (var ii = 0; ii < array.numElements; ++ii) {
    var elem = array.getElement(ii);
    for (var jj = 0; jj < offset.length; ++jj) {
      elem[jj] += offset[jj];
    }
    this.push(elem);
  }
};

/**
 * Computes the extents
 * @param {!AttribBuffer} positions The positions
 * @return {!{min: !tdl.math.Vector3, max:!tdl.math.Vector3}}
 *     The min and max extents.
 */
tdl.primitives.AttribBuffer.prototype.computeExtents = function() {
  var numElements = this.numElements;
  var numComponents = this.numComponents;
  var minExtent = this.getElement(0);
  var maxExtent = this.getElement(0);
  for (var ii = 1; ii < numElements; ++ii) {
    var element = this.getElement(ii);
    for (var jj = 0; jj < numComponents; ++jj) {
      minExtent[jj] = Math.min(minExtent[jj], element[jj]);
      maxExtent[jj] = Math.max(maxExtent[jj], element[jj]);
    }
  }
  return {min: minExtent, max: maxExtent};
};

/**
 * Reorients positions by the given matrix. In other words, it
 * multiplies each vertex by the given matrix.
 * @param {!tdl.primitives.AttribBuffer} array AttribBuffer to
 *     reorient.
 * @param {!tdl.math.Matrix4} matrix Matrix by which to
 *     multiply.
 */
tdl.primitives.mulComponents = function(array, multiplier) {
  var numElements = array.numElements;
  var numComponents = array.numComponents;
  for (var ii = 0; ii < numElements; ++ii) {
    var element = array.getElement(ii);
    for (var jj = 0; jj < numComponents; ++jj) {
      element[jj] *= multiplier[jj];
    }
    array.setElement(ii, element);
  }
};

/**
 * Reorients positions by the given matrix. In other words, it
 * multiplies each vertex by the given matrix.
 * @param {!tdl.primitives.AttribBuffer} array AttribBuffer to
 *     reorient.
 * @param {!tdl.math.Matrix4} matrix Matrix by which to
 *     multiply.
 */
tdl.primitives.reorientPositions = function(array, matrix) {
  var math = tdl.math;
  var numElements = array.numElements;
  for (var ii = 0; ii < numElements; ++ii) {
    array.setElement(ii,
        math.matrix4.transformPoint(matrix,
            array.getElement(ii)));
  }
};

/**
 * Reorients normals by the inverse-transpose of the given
 * matrix..
 * @param {!tdl.primitives.AttribBuffer} array AttribBuffer to
 *     reorient.
 * @param {!tdl.math.Matrix4} matrix Matrix by which to
 *     multiply.
 */
tdl.primitives.reorientNormals = function(array, matrix) {
  var math = tdl.math;
  var numElements = array.numElements;
  for (var ii = 0; ii < numElements; ++ii) {
    array.setElement(ii,
        math.matrix4.transformNormal(matrix,
            array.getElement(ii)));
  }
};

/**
 * Reorients directions by the given matrix..
 * @param {!tdl.primitives.AttribBuffer} array AttribBuffer to
 *     reorient.
 * @param {!tdl.math.Matrix4} matrix Matrix by which to
 *     multiply.
 */
tdl.primitives.reorientDirections = function(array, matrix) {
  var math = tdl.math;

  var numElements = array.numElements;
  for (var ii = 0; ii < numElements; ++ii) {
    array.setElement(ii,
        math.matrix4.transformDirection(matrix,
            array.getElement(ii)));
  }
};

/**
 * Reorients arrays by the given matrix. Assumes arrays have
 * names that start with 'position', 'normal', 'tangent',
 * 'binormal'
 *
 * @param {!Object.<string, !tdl.primitive.AttribBuffer>} arrays
 *        The arrays to remap.
 * @param {!tdl.math.Matrix4} matrix The matrix to remap by
 */
tdl.primitives.reorient = function(arrays, matrix) {
  for (var array in arrays) {
    if (array.match(/^position/)) {
      tdl.primitives.reorientPositions(arrays[array], matrix);
    } else if (array.match(/^normal/)) {
      tdl.primitives.reorientNormals(arrays[array], matrix);
    } else if (array.match(/^tangent/) || array.match(/^binormal/)) {
      tdl.primitives.reorientDirections(arrays[array], matrix);
    }
  }
};

/**
 * Creates tangents and normals.
 *
 * @param {!AttibArray} positionArray Positions
 * @param {!AttibArray} normalArray Normals
 * @param {!AttibArray} normalMapUVArray UVs for the normal map.
 * @param {!AttibArray} triangles The indicies of the trianlges.
 * @returns {!{tangent: {!AttribArray},
 *     binormal: {!AttribArray}}
 */
tdl.primitives.createTangentsAndBinormals = function(
    positionArray, normalArray, normalMapUVArray, triangles) {
  var math = tdl.math;
  // Maps from position, normal key to tangent and binormal matrix.
  var tangentFrames = {};

  // Rounds a vector to integer components.
  function roundVector(v) {
    return [Math.round(v[0]), Math.round(v[1]), Math.round(v[2])];
  }

  // Generates a key for the tangentFrames map from a position and normal
  // vector. Rounds position and normal to allow some tolerance.
  function tangentFrameKey(position, normal) {
    return roundVector(math.mulVectorScalar(position, 100)) + ',' +
        roundVector(math.mulVectorScalar(normal, 100));
  }

  // Accumulates into the tangent and binormal matrix at the approximate
  // position and normal.
  function addTangentFrame(position, normal, tangent, binormal) {
    var key = tangentFrameKey(position, normal);
    var frame = tangentFrames[key];
    if (!frame) {
      frame = [[0, 0, 0], [0, 0, 0]];
    }
    frame[0] = math.addVector(frame[0], tangent);
    frame[1] = math.addVector(frame[1], binormal);
    tangentFrames[key] = frame;
  }

  // Get the tangent and binormal matrix at the approximate position and
  // normal.
  function getTangentFrame(position, normal) {
    var key = tangentFrameKey(position, normal);
    return tangentFrames[key];
  }

  var numTriangles = triangles.numElements;
  for (var triangleIndex = 0; triangleIndex < numTriangles; ++triangleIndex) {
    // Get the vertex indices, uvs and positions for the triangle.
    var vertexIndices = triangles.getElement(triangleIndex);
    var uvs = [];
    var positions = [];
    var normals = [];
    for (var i = 0; i < 3; ++i) {
      var vertexIndex = vertexIndices[i];
      uvs[i] = normalMapUVArray.getElement(vertexIndex);
      positions[i] = positionArray.getElement(vertexIndex);
      normals[i] = normalArray.getElement(vertexIndex);
    }

    // Calculate the tangent and binormal for the triangle using method
    // described in Maya documentation appendix A: tangent and binormal
    // vectors.
    var tangent = [0, 0, 0];
    var binormal = [0, 0, 0];
    for (var axis = 0; axis < 3; ++axis) {
      var edge1 = [positions[1][axis] - positions[0][axis],
                   uvs[1][0] - uvs[0][0], uvs[1][1] - uvs[0][1]];
      var edge2 = [positions[2][axis] - positions[0][axis],
                   uvs[2][0] - uvs[0][0], uvs[2][1] - uvs[0][1]];
      var edgeCross = math.normalize(math.cross(edge1, edge2));
      if (edgeCross[0] == 0) {
        edgeCross[0] = 1;
      }
      tangent[axis] = -edgeCross[1] / edgeCross[0];
      binormal[axis] = -edgeCross[2] / edgeCross[0];
    }

    // Normalize the tangent and binornmal.
    var tangentLength = math.length(tangent);
    if (tangentLength > 0.00001) {
      tangent = math.mulVectorScalar(tangent, 1 / tangentLength);
    }
    var binormalLength = math.length(binormal);
    if (binormalLength > 0.00001) {
      binormal = math.mulVectorScalar(binormal, 1 / binormalLength);
    }

    // Accumulate the tangent and binormal into the tangent frame map.
    for (var i = 0; i < 3; ++i) {
      addTangentFrame(positions[i], normals[i], tangent, binormal);
    }
  }

  // Add the tangent and binormal streams.
  var numVertices = positionArray.numElements;
  var tangents = new tdl.primitives.AttribBuffer(3, numVertices);
  var binormals = new tdl.primitives.AttribBuffer(3, numVertices);

  // Extract the tangent and binormal for each vertex.
  for (var vertexIndex = 0; vertexIndex < numVertices; ++vertexIndex) {
    var position = positionArray.getElement(vertexIndex);
    var normal = normalArray.getElement(vertexIndex);
    var frame = getTangentFrame(position, normal);

    // Orthonormalize the tangent with respect to the normal.
    var tangent = frame[0];
    tangent = math.subVector(
        tangent, math.mulVectorScalar(normal, math.dot(normal, tangent)));
    var tangentLength = math.length(tangent);
    if (tangentLength > 0.00001) {
      tangent = math.mulVectorScalar(tangent, 1 / tangentLength);
    }

    // Orthonormalize the binormal with respect to the normal and the tangent.
    var binormal = frame[1];
    binormal = math.subVector(
        binormal, math.mulVectorScalar(tangent, math.dot(tangent, binormal)));
    binormal = math.subVector(
        binormal, math.mulVectorScalar(normal, math.dot(normal, binormal)));
    var binormalLength = math.length(binormal);
    if (binormalLength > 0.00001) {
      binormal = math.mulVectorScalar(binormal, 1 / binormalLength);
    }

    tangents.push(tangent);
    binormals.push(binormal);
  }

  return {
    tangent: tangents,
    binormal: binormals};
};

/**
 * Adds tangents and binormals.
 *
 * @param {!Object.<string,!AttibArray>} arrays Arrays containing position,
 *        normal and texCoord.
 */
tdl.primitives.addTangentsAndBinormals = function(arrays) {
  var bn = tdl.primitives.createTangentsAndBinormals(
      arrays.position,
      arrays.normal,
      arrays.texCoord,
      arrays.indices);
  arrays.tangent = bn.tangent;
  arrays.binormal = bn.binormal;
  return arrays;
};

tdl.primitives.clone = function(arrays) {
  var newArrays = { };
  for (var array in arrays) {
    newArrays[array] = arrays[array].clone();
  }
  return newArrays;
};

/**
 * Concats 2 or more sets of arrays. Assumes each set of arrays has arrays that
 * match the other sets.
 * @param {!Array<!Object.<string, !AttribBuffer>>} arrays Arrays to concat
 * @return {!Object.<string, !AttribBuffer>} concatenated result.
 */
tdl.primitives.concat = function(arrayOfArrays) {
  var names = {};
  var baseName;
  // get names of all arrays.
  for (var ii = 0; ii < arrayOfArrays.length; ++ii) {
    var arrays = arrayOfArrays[ii];
    for (var name in arrays) {
      if (!names[name]) {
        names[name] = [];
      }
      if (!baseName && name != 'indices') {
        baseName = name;
      }
      var array = arrays[name];
      names[name].push(array.numElements);
    }
  }

  var base = names[baseName];

  var newArrays = {};
  for (var name in names) {
    var numElements = 0;
    var numComponents;
    var type;
    for (var ii = 0; ii < arrayOfArrays.length; ++ii) {
      var arrays = arrayOfArrays[ii];
      var array = arrays[name];
      numElements += array.numElements;
      numComponents = array.numComponents;
      type = array.type;
    }
    var newArray = new tdl.primitives.AttribBuffer(
        numComponents, numElements, type);
    var baseIndex = 0;
    for (var ii = 0; ii < arrayOfArrays.length; ++ii) {
      var arrays = arrayOfArrays[ii];
      var array = arrays[name];
      if (name == 'indices') {
        newArray.pushArrayWithOffset(
            array, [baseIndex, baseIndex, baseIndex]);
        baseIndex += base[ii];
      } else {
        newArray.pushArray(array);
      }
    }
    newArrays[name] = newArray;
  }
  return newArrays;
};

/**
 * Same as tdl.primitives.concat except this one returns an array
 * of arrays if the models have indices. This is because WebGL can only handle
 * 16bit indices (ie, < 65536) So, as it is concatenating, if the data would
 * make indices > 65535 it starts a new set of arrays.
 *
 * @param {!Array<!Object.<string, !AttribBuffer>>} arrays Arrays to concat
 * @return {!{arrays:{!Array<{!Object.<string, !AttribBuffer>>,
 *     instances:{!Array<{firstVertex:number, numVertices:number, arrayIndex:
 *     number}>}} object result.
 */
//
tdl.primitives.concatLarge = function(arrayOfArrays) {
  // Step 2: convert instances to expanded geometry
  var instances = [];
  var expandedArrays = [];
  var expandedArray;
  var totalElements = 0;
  for (var ii = 0; ii < arrayOfArrays.length; ++ii) {
    // WebGL can only handle 65536 indexed vertices so check if this
    // geometry can fit the current model
    var array = arrayOfArrays[ii];
    if (!expandedArray || totalElements + array.position.numElements > 65536) {
      // Start a new array.
      totalElements = 0;
      expandedArray = [array];
      expandedArrays.push(expandedArray);
    } else {
      // Add our new stuff on to the old one.
      expandedArray.push(array);
    }
    instances.push({
        firstVertex: totalElements,
        numVertices: array.position.numElements,
        arrayIndex: expandedArrays.length - 1
    });
    totalElements += array.position.numElements;
  }

  for (var ii = 0; ii < expandedArrays.length; ++ii) {
    //tdl.log("concat:", ii, " of ", expandedArrays.length);
    expandedArrays[ii] = tdl.primitives.concat(expandedArrays[ii]);
  }
  return {
      arrays: expandedArrays,
      instances: instances
  };
};

/**
 * Applies planar UV mapping in the XZ plane.
 * @param {!AttribBuffer} positions The positions
 * @param {!AttribBuffer} texCoords The texCoords
 */
tdl.primitives.applyPlanarUVMapping = function(positions, texCoords) {
  // compute the extents
  var extents = positions.computeExtents();
  var ranges = tdl.math.subVector(extents.max, extents.min);

  var numElements = positions.numElements;
  for (var ii = 0; ii < numElements; ++ii) {
    var position = positions.getElement(ii);
    var u = (position[0] - extents.min[0]) / ranges[0];
    var v = (position[2] - extents.min[2]) / ranges[2];
    texCoords.setElement(ii, [u, v]);
  }
};

/**
 * Takes a bunch of instances of geometry and converts them
 * to 1 or more geometries that represent all the instances.
 *
 * In other words, if make a cube
 *
 *    var cube = tdl.primitives.createCube(1);
 *
 * And you put 4 of those in an array
 *
 *    var instances = [cube, cube, cube, cube]
 *
 * Then if you call this function it will return a mesh that contains
 * all 4 cubes.  it
 *
 * @author gman (4/19/2011)
 *
 * @param instances
 */
tdl.primitives.expandInstancesToGeometry = function(instances) {

};

/**
 * Creates sphere vertices.
 * The created sphere has position, normal and uv streams.
 *
 * @param {number} radius radius of the sphere.
 * @param {number} subdivisionsAxis number of steps around the sphere.
 * @param {number} subdivisionsHeight number of vertically on the sphere.
 * @param {number} opt_startLatitudeInRadians where to start the
 *     top of the sphere. Default = 0.
 * @param {number} opt_endLatitudeInRadians Where to end the
 *     bottom of the sphere. Default = Math.PI.
 * @param {number} opt_startLongitudeInRadians where to start
 *     wrapping the sphere. Default = 0.
 * @param {number} opt_endLongitudeInRadians where to end
 *     wrapping the sphere. Default = 2 * Math.PI.
 * @return {!Object.<string, !tdl.primitives.AttribBuffer>} The
 *         created plane vertices.
 */
tdl.primitives.createSphere = function(
    radius,
    subdivisionsAxis,
    subdivisionsHeight,
    opt_startLatitudeInRadians,
    opt_endLatitudeInRadians,
    opt_startLongitudeInRadians,
    opt_endLongitudeInRadians) {
  if (subdivisionsAxis <= 0 || subdivisionsHeight <= 0) {
    throw Error('subdivisionAxis and subdivisionHeight must be > 0');
  }
  var math = tdl.math;

  opt_startLatitudeInRadians = opt_startLatitudeInRadians || 0;
  opt_endLatitudeInRadians = opt_endLatitudeInRadians || Math.PI;
  opt_startLongitudeInRadians = opt_startLongitudeInRadians || 0;
  opt_endLongitudeInRadians = opt_endLongitudeInRadians || (Math.PI * 2);

  var latRange = opt_endLatitudeInRadians - opt_startLatitudeInRadians;
  var longRange = opt_endLongitudeInRadians - opt_startLongitudeInRadians;

  // We are going to generate our sphere by iterating through its
  // spherical coordinates and generating 2 triangles for each quad on a
  // ring of the sphere.
  var numVertices = (subdivisionsAxis + 1) * (subdivisionsHeight + 1);
  var positions = new tdl.primitives.AttribBuffer(3, numVertices);
  var normals = new tdl.primitives.AttribBuffer(3, numVertices);
  var texCoords = new tdl.primitives.AttribBuffer(2, numVertices);

  // Generate the individual vertices in our vertex buffer.
  for (var y = 0; y <= subdivisionsHeight; y++) {
    for (var x = 0; x <= subdivisionsAxis; x++) {
      // Generate a vertex based on its spherical coordinates
      var u = x / subdivisionsAxis;
      var v = y / subdivisionsHeight;
      var theta = longRange * u;
      var phi = latRange * v;
      var sinTheta = Math.sin(theta);
      var cosTheta = Math.cos(theta);
      var sinPhi = Math.sin(phi);
      var cosPhi = Math.cos(phi);
      var ux = cosTheta * sinPhi;
      var uy = cosPhi;
      var uz = sinTheta * sinPhi;
      positions.push([radius * ux, radius * uy, radius * uz]);
      normals.push([ux, uy, uz]);
      texCoords.push([1 - u, v]);
    }
  }

  var numVertsAround = subdivisionsAxis + 1;
  var indices = new tdl.primitives.AttribBuffer(
      3, subdivisionsAxis * subdivisionsHeight * 2, 'Uint16Array');
  for (var x = 0; x < subdivisionsAxis; x++) {
    for (var y = 0; y < subdivisionsHeight; y++) {
      // Make triangle 1 of quad.
      indices.push([
          (y + 0) * numVertsAround + x,
          (y + 0) * numVertsAround + x + 1,
          (y + 1) * numVertsAround + x]);

      // Make triangle 2 of quad.
      indices.push([
          (y + 1) * numVertsAround + x,
          (y + 0) * numVertsAround + x + 1,
          (y + 1) * numVertsAround + x + 1]);
    }
  }

  return {
    position: positions,
    normal: normals,
    texCoord: texCoords,
    indices: indices};
};

/**
 * Creates cresent vertices. The created sphere has position, normal and uv
 * streams.
 *
 * @param {number} verticalRadius The vertical radius of the cresent.
 * @param {number} outerRadius The outer radius of the cresent.
 * @param {number} innerRadius The inner radius of the cresent.
 * @param {number} thickness The thickness of the cresent.
 * @param {number} subdivisionsDown number of steps around the sphere.
 * @param {number} subdivisionsThick number of vertically on the sphere.
 * @param {number} opt_startOffset Where to start arc Default 0.
 * @param {number} opt_endOffset Where to end arg Default 1.
 * @return {!Object.<string, !tdl.primitives.AttribBuffer>} The
 *         created plane vertices.
 */
tdl.primitives.createCresent = function(
    verticalRadius,
    outerRadius,
    innerRadius,
    thickness,
    subdivisionsDown,
    opt_startOffset,
    opt_endOffset) {
  if (subdivisionsDown <= 0) {
    throw Error('subdivisionDown must be > 0');
  }
  var math = tdl.math;

  opt_startOffset = opt_startOffset || 0;
  opt_endOffset = opt_endOffset || 1;

  var subdivisionsThick = 2;

  var offsetRange = opt_endOffset - opt_startOffset;
  var numVertices = (subdivisionsDown + 1) * 2 * (2 + subdivisionsThick);
  var positions = new tdl.primitives.AttribBuffer(3, numVertices);
  var normals = new tdl.primitives.AttribBuffer(3, numVertices);
  var texCoords = new tdl.primitives.AttribBuffer(2, numVertices);

  function createArc(arcRadius, x, normalMult, normalAdd, uMult, uAdd) {
    for (var z = 0; z <= subdivisionsDown; z++) {
      var uBack = x / (subdivisionsThick - 1);
      var v = z / subdivisionsDown;
      var xBack = (uBack - 0.5) * 2;
      var angle = (opt_startOffset + (v * offsetRange)) * Math.PI;
      var s = Math.sin(angle);
      var c = Math.cos(angle);
      var radius = math.lerpScalar(verticalRadius, arcRadius, s);
      var px = xBack * thickness;
      var py = c * verticalRadius;
      var pz = s * radius;
      positions.push([px, py, pz]);
      // TODO(gman): fix! This is not correct.
      var n = math.addVector(
          math.mulVectorVector([0, s, c], normalMult), normalAdd);
      normals.push(n);
      texCoords.push([uBack * uMult + uAdd, v]);
    }
  }

  // Generate the individual vertices in our vertex buffer.
  for (var x = 0; x < subdivisionsThick; x++) {
    var uBack = (x / (subdivisionsThick - 1) - 0.5) * 2;
    createArc(outerRadius, x, [1, 1, 1], [0,     0, 0], 1, 0);
    createArc(outerRadius, x, [0, 0, 0], [uBack, 0, 0], 0, 0);
    createArc(innerRadius, x, [1, 1, 1], [0,     0, 0], 1, 0);
    createArc(innerRadius, x, [0, 0, 0], [uBack, 0, 0], 0, 1);
  }

  // Do outer surface.
  var indices = new tdl.primitives.AttribBuffer(
      3, (subdivisionsDown * 2) * (2 + subdivisionsThick), 'Uint16Array');

  function createSurface(leftArcOffset, rightArcOffset) {
    for (var z = 0; z < subdivisionsDown; ++z) {
      // Make triangle 1 of quad.
      indices.push([
          leftArcOffset + z + 0,
          leftArcOffset + z + 1,
          rightArcOffset + z + 0]);

      // Make triangle 2 of quad.
      indices.push([
          leftArcOffset + z + 1,
          rightArcOffset + z + 1,
          rightArcOffset + z + 0]);
    }
  }

  var numVerticesDown = subdivisionsDown + 1;
  // front
  createSurface(numVerticesDown * 0, numVerticesDown * 4);
  // right
  createSurface(numVerticesDown * 5, numVerticesDown * 7);
  // back
  createSurface(numVerticesDown * 6, numVerticesDown * 2);
  // left
  createSurface(numVerticesDown * 3, numVerticesDown * 1);

  return {
    position: positions,
    normal: normals,
    texCoord: texCoords,
    indices: indices};
};

/**
 * Creates XZ plane vertices.
 * The created plane has position, normal and uv streams.
 *
 * @param {number} width Width of the plane.
 * @param {number} depth Depth of the plane.
 * @param {number} subdivisionsWidth Number of steps across the plane.
 * @param {number} subdivisionsDepth Number of steps down the plane.
 * @param {!o3djs.math.Matrix4} opt_matrix A matrix by which to multiply
 *     all the vertices.
 * @return {!Object.<string, !tdl.primitives.AttribBuffer>} The
 *         created plane vertices.
 */
tdl.primitives.createPlane = function(
    width,
    depth,
    subdivisionsWidth,
    subdivisionsDepth) {
  if (subdivisionsWidth <= 0 || subdivisionsDepth <= 0) {
    throw Error('subdivisionWidth and subdivisionDepth must be > 0');
  }
  var math = tdl.math;

  var numVertices = (subdivisionsWidth + 1) * (subdivisionsDepth + 1);
  var positions = new tdl.primitives.AttribBuffer(3, numVertices);
  var normals = new tdl.primitives.AttribBuffer(3, numVertices);
  var texCoords = new tdl.primitives.AttribBuffer(2, numVertices);

  for (var z = 0; z <= subdivisionsDepth; z++) {
    for (var x = 0; x <= subdivisionsWidth; x++) {
      var u = x / subdivisionsWidth;
      var v = z / subdivisionsDepth;
      positions.push([
          width * u - width * 0.5,
          0,
          depth * v - depth * 0.5]);
      normals.push([0, 1, 0]);
      texCoords.push([u, v]);
    }
  }

  var numVertsAcross = subdivisionsWidth + 1;
  var indices = new tdl.primitives.AttribBuffer(
      3, subdivisionsWidth * subdivisionsDepth * 2, 'Uint16Array');

  for (var z = 0; z < subdivisionsDepth; z++) {
    for (var x = 0; x < subdivisionsWidth; x++) {
      // Make triangle 1 of quad.
      indices.push([
          (z + 0) * numVertsAcross + x,
          (z + 1) * numVertsAcross + x,
          (z + 0) * numVertsAcross + x + 1]);

      // Make triangle 2 of quad.
      indices.push([
          (z + 1) * numVertsAcross + x,
          (z + 1) * numVertsAcross + x + 1,
          (z + 0) * numVertsAcross + x + 1]);
    }
  }

  return {
    position: positions,
    normal: normals,
    texCoord: texCoords,
    indices: indices};
};


/**
 * Array of the indices of corners of each face of a cube.
 * @private
 * @type {!Array.<!Array.<number>>}
 */
tdl.primitives.CUBE_FACE_INDICES_ = [
  [3, 7, 5, 1], // right
  [6, 2, 0, 4], // left
  [6, 7, 3, 2], // ??
  [0, 1, 5, 4], // ??
  [7, 6, 4, 5], // front
  [2, 3, 1, 0]  // back
];

/**
 * Creates the vertices and indices for a cube. The
 * cube will be created around the origin. (-size / 2, size / 2)
 *
 * @param {number} size Width, height and depth of the cube.
 * @return {!Object.<string, !tdl.primitives.AttribBuffer>} The
 *         created plane vertices.
 */
tdl.primitives.createCube = function(size) {
  var k = size / 2;

  var cornerVertices = [
    [-k, -k, -k],
    [+k, -k, -k],
    [-k, +k, -k],
    [+k, +k, -k],
    [-k, -k, +k],
    [+k, -k, +k],
    [-k, +k, +k],
    [+k, +k, +k]
  ];

  var faceNormals = [
    [+1, +0, +0],
    [-1, +0, +0],
    [+0, +1, +0],
    [+0, -1, +0],
    [+0, +0, +1],
    [+0, +0, -1]
  ];

  var uvCoords = [
    [1, 0],
    [0, 0],
    [0, 1],
    [1, 1]
  ];

  var numVertices = 6 * 4;
  var positions = new tdl.primitives.AttribBuffer(3, numVertices);
  var normals = new tdl.primitives.AttribBuffer(3, numVertices);
  var texCoords = new tdl.primitives.AttribBuffer(2, numVertices);
  var indices = new tdl.primitives.AttribBuffer(3, 6 * 2, 'Uint16Array');

  for (var f = 0; f < 6; ++f) {
    var faceIndices = tdl.primitives.CUBE_FACE_INDICES_[f];
    for (var v = 0; v < 4; ++v) {
      var position = cornerVertices[faceIndices[v]];
      var normal = faceNormals[f];
      var uv = uvCoords[v];

      // Each face needs all four vertices because the normals and texture
      // coordinates are not all the same.
      positions.push(position);
      normals.push(normal);
      texCoords.push(uv);

    }
    // Two triangles make a square face.
    var offset = 4 * f;
    indices.push([offset + 0, offset + 1, offset + 2]);
    indices.push([offset + 0, offset + 2, offset + 3]);
  }

  return {
    position: positions,
    normal: normals,
    texCoord: texCoords,
    indices: indices};
};


/**
 * Creates the vertices and indices for a flared cube (extrude the edges).
 * The U texture coordinate will be a gradient 0-1 from inside out. Use
 * the vertex shader to distort using U as an angle for fun effects.
 *
 * @param {number} size Width, height and depth of the cube.
 * @return {!Object.<string, !tdl.primitives.AttribBuffer>} The
 *         created plane vertices.
 */
tdl.primitives.createFlaredCube = function(innerSize, outerSize, layerCount) {
  var numVertices = 2 * (layerCount + 1);
  var positions = new tdl.primitives.AttribBuffer(3, numVertices);
  var normals = new tdl.primitives.AttribBuffer(3, numVertices);
  var texCoords = new tdl.primitives.AttribBuffer(2, numVertices);
  var indices = new tdl.primitives.AttribBuffer(
      3, layerCount * 2, 'Uint16Array');

  // make a trapazoid plane.
  for (var z = 0; z <= layerCount; z++) {
    for (var x = 0; x <= 1; x++) {
      var u = x;
      var v = z / layerCount;
      var width = tdl.math.lerpScalar(innerSize, outerSize, v);
      positions.push([
          width * u - width * 0.5,
          0,
          tdl.math.lerpScalar(innerSize, outerSize, v) * 0.7
      ]);
      normals.push([0, 1, 0]);
      texCoords.push([v, u]);
    }
  }

  var numVertsAcross = 2;
  for (var z = 0; z < layerCount; z++) {
    // Make triangle 1 of quad.
    indices.push([
        (z + 0) * numVertsAcross,
        (z + 1) * numVertsAcross,
        (z + 0) * numVertsAcross + 1]);

    // Make triangle 2 of quad.
    indices.push([
        (z + 1) * numVertsAcross,
        (z + 1) * numVertsAcross + 1,
        (z + 0) * numVertsAcross + 1]);
  }

  var arrays = {
    position: positions,
    normal: normals,
    texCoord: texCoords,
    indices: indices
  };

  // rotate it 45 degrees
  tdl.primitives.reorient(arrays, tdl.math.matrix4.rotationX(Math.PI / 4));

  // make 3 copies of plane each rotated 90
  var planes = [arrays];
  for (var ii = 0; ii < 3; ++ii) {
    var clone = tdl.primitives.clone(arrays);
    tdl.primitives.reorient(clone, tdl.math.matrix4.rotationZ(Math.PI * (ii + 1) / 2));
    planes.push(clone);
  }
  // concat 4 planes to make a cone
  var arrays = tdl.primitives.concat(planes);

  // make 3 copies of cone each rotated 90
  var cones = [arrays];
  for (var ii = 0; ii < 3; ++ii) {
    var clone = tdl.primitives.clone(arrays);
    tdl.primitives.reorient(clone, tdl.math.matrix4.rotationY(Math.PI * (ii + 1) / 2));
    cones.push(clone);
  }
  // concat 4 cones to make flared cube
  var arrays = tdl.primitives.concat(cones);
  return arrays;
};



/**
 * Creates vertices for a truncated cone, which is like a cylinder
 * except that it has different top and bottom radii. A truncated cone
 * can also be used to create cylinders and regular cones. The
 * truncated cone will be created centered about the origin, with the
 * y axis as its vertical axis. The created cone has position, normal
 * and uv streams.
 *
 * @param {number} bottomRadius Bottom radius of truncated cone.
 * @param {number} topRadius Top radius of truncated cone.
 * @param {number} height Height of truncated cone.
 * @param {number} radialSubdivisions The number of subdivisions around the
 *     truncated cone.
 * @param {number} verticalSubdivisions The number of subdivisions down the
 *     truncated cone.
 * @param {boolean} opt_topCap Create top cap. Default = true.
 * @param {boolean} opt_bottomCap Create bottom cap. Default =
 *        true.
 * @return {!Object.<string, !tdl.primitives.AttribBuffer>} The
 *         created plane vertices.
 */
tdl.primitives.createTruncatedCone = function(
    bottomRadius,
    topRadius,
    height,
    radialSubdivisions,
    verticalSubdivisions,
    opt_topCap,
    opt_bottomCap) {
  if (radialSubdivisions < 3) {
    throw Error('radialSubdivisions must be 3 or greater');
  }

  if (verticalSubdivisions < 1) {
    throw Error('verticalSubdivisions must be 1 or greater');
  }

  var topCap = (opt_topCap === undefined) ? true : opt_topCap;
  var bottomCap = (opt_bottomCap === undefined) ? true : opt_bottomCap;

  var extra = (topCap ? 2 : 0) + (bottomCap ? 2 : 0);

  var numVertices = (radialSubdivisions + 1) * (verticalSubdivisions + 1 + extra);
  var positions = new tdl.primitives.AttribBuffer(3, numVertices);
  var normals = new tdl.primitives.AttribBuffer(3, numVertices);
  var texCoords = new tdl.primitives.AttribBuffer(2, numVertices);
  var indices = new tdl.primitives.AttribBuffer(
      3, radialSubdivisions * (verticalSubdivisions + extra) * 2, 'Uint16Array');

  var vertsAroundEdge = radialSubdivisions + 1;

  // The slant of the cone is constant across its surface
  var slant = Math.atan2(bottomRadius - topRadius, height);
  var cosSlant = Math.cos(slant);
  var sinSlant = Math.sin(slant);

  var start = topCap ? -2 : 0;
  var end = verticalSubdivisions + (bottomCap ? 2 : 0);

  for (var yy = start; yy <= end; ++yy) {
    var v = yy / verticalSubdivisions
    var y = height * v;
    var ringRadius;
    if (yy < 0) {
      y = 0;
      v = 1;
      ringRadius = bottomRadius;
    } else if (yy > verticalSubdivisions) {
      y = height;
      v = 1;
      ringRadius = topRadius;
    } else {
      ringRadius = bottomRadius +
        (topRadius - bottomRadius) * (yy / verticalSubdivisions);
    }
    if (yy == -2 || yy == verticalSubdivisions + 2) {
      ringRadius = 0;
      v = 0;
    }
    y -= height / 2;
    for (var ii = 0; ii < vertsAroundEdge; ++ii) {
      var sin = Math.sin(ii * Math.PI * 2 / radialSubdivisions);
      var cos = Math.cos(ii * Math.PI * 2 / radialSubdivisions);
      positions.push([sin * ringRadius, y, cos * ringRadius]);
      normals.push([
          (yy < 0 || yy > verticalSubdivisions) ? 0 : (sin * cosSlant),
          (yy < 0) ? -1 : (yy > verticalSubdivisions ? 1 : sinSlant),
          (yy < 0 || yy > verticalSubdivisions) ? 0 : (cos * cosSlant)]);
      texCoords.push([(ii / radialSubdivisions), 1 - v]);
    }
  }

  for (var yy = 0; yy < verticalSubdivisions + extra; ++yy) {
    for (var ii = 0; ii < radialSubdivisions; ++ii) {
      indices.push([vertsAroundEdge * (yy + 0) + 0 + ii,
                   vertsAroundEdge * (yy + 0) + 1 + ii,
                   vertsAroundEdge * (yy + 1) + 1 + ii]);
      indices.push([vertsAroundEdge * (yy + 0) + 0 + ii,
                   vertsAroundEdge * (yy + 1) + 1 + ii,
                   vertsAroundEdge * (yy + 1) + 0 + ii]);
    }
  }

  return {
    position: positions,
    normal: normals,
    texCoord: texCoords,
    indices: indices};
};

/**
 * Creates cylinder vertices. The cylinder will be created around the origin
 * along the y-axis. The created cylinder has position, normal and uv streams.
 *
 * @param {number} radius Radius of cylinder.
 * @param {number} height Height of cylinder.
 * @param {number} radialSubdivisions The number of subdivisions around the
 *     cylinder.
 * @param {number} verticalSubdivisions The number of subdivisions down the
 *     cylinder.
 * @param {boolean} opt_topCap Create top cap. Default = true.
 * @param {boolean} opt_bottomCap Create bottom cap. Default =
 *        true.
 * @return {!Object.<string, !tdl.primitives.AttribBuffer>} The
 *         created plane vertices.
 */
tdl.primitives.createCylinder = function(
    radius,
    height,
    radialSubdivisions,
    verticalSubdivisions,
    opt_topCap,
    opt_bottomCap) {
  return tdl.primitives.createTruncatedCone(
      radius,
      radius,
      height,
      radialSubdivisions,
      verticalSubdivisions,
      opt_topCap,
      opt_bottomCap);
};

/**
 * Creates vertices for a torus, The created cone has position, normal
 * and texCoord streams.
 *
 * @param {number} radius radius of center of torus circle.
 * @param {number} thickness radius of torus ring.
 * @param {number} radialSubdivisions The number of subdivisions around the
 *     torus.
 * @param {number} bodySubdivisions The number of subdivisions around the
 *     body torus.
 * @param {boolean} opt_startAngle start angle in radians. Default = 0.
 * @param {boolean} opt_endAngle end angle in radians. Default = Math.PI * 2.
 * @return {!Object.<string, !tdl.primitives.AttribBuffer>} The
 *         created torus vertices.
 */
tdl.primitives.createTorus = function(
    radius,
    thickness,
    radialSubdivisions,
    bodySubdivisions,
    opt_startAngle,
    opt_endAngle) {
  if (radialSubdivisions < 3) {
    throw Error('radialSubdivisions must be 3 or greater');
  }

  if (bodySubdivisions < 3) {
    throw Error('verticalSubdivisions must be 3 or greater');
  }

  var startAngle = opt_startAngle || 0;
  var endAngle = opt_endAngle || Math.PI * 2;
  var range = endAngle - startAngle;

  // TODO(gman): cap the ends if not a full circle.

  var numVertices = (radialSubdivisions) * (bodySubdivisions);
  var positions = new tdl.primitives.AttribBuffer(3, numVertices);
  var normals = new tdl.primitives.AttribBuffer(3, numVertices);
  var texCoords = new tdl.primitives.AttribBuffer(2, numVertices);
  var indices = new tdl.primitives.AttribBuffer(
      3, (radialSubdivisions) * (bodySubdivisions) * 2, 'Uint16Array');

  for (var slice = 0; slice < bodySubdivisions; ++slice) {
    var v = slice / bodySubdivisions;
    var sliceAngle = v * Math.PI * 2;
    var sliceSin = Math.sin(sliceAngle);
    var ringRadius = radius + sliceSin * thickness;
    var ny = Math.cos(sliceAngle);
    var y = ny * thickness;
    for (var ring = 0; ring < radialSubdivisions; ++ring) {
      var u = ring / radialSubdivisions;
      var ringAngle = startAngle + u * range;
      var xSin = Math.sin(ringAngle);
      var zCos = Math.cos(ringAngle);
      var x = xSin * ringRadius;
      var z = zCos * ringRadius;
      var nx = xSin * sliceSin;
      var nz = zCos * sliceSin;
      positions.push([x, y, z]);
      normals.push([nx, ny, nz]);
      texCoords.push([u, 1 - v]);
    }
  }

  for (var slice = 0; slice < bodySubdivisions; ++slice) {
    for (var ring = 0; ring < radialSubdivisions; ++ring) {
      var nextRingIndex = (1 + ring) % radialSubdivisions;
      var nextSliceIndex = (1 + slice) % bodySubdivisions;
      indices.push([radialSubdivisions * slice          + ring,
                    radialSubdivisions * nextSliceIndex + ring,
                    radialSubdivisions * slice          + nextRingIndex]);
      indices.push([radialSubdivisions * nextSliceIndex + ring,
                    radialSubdivisions * nextSliceIndex + nextRingIndex,
                    radialSubdivisions * slice          + nextRingIndex]);
    }
  }

  return {
    position: positions,
    normal: normals,
    texCoord: texCoords,
    indices: indices};
};


/**
 * Creates a disc. The disc will be in the xz plane, centered at
 * the origin. When creating, at least 3 divisions, or pie
 * pieces, need to be specified, otherwise the triangles making
 * up the disc will be degenerate. You can also specify the
 * number of radial pieces (opt_stacks). A value of 1 for
 * opt_stacks will give you a simple disc of pie pieces.  If you
 * want to create an annulus you can set opt_innerRadius to a
 * value > 0. Finally, stackPower allows you to have the widths
 * increase or decrease as you move away from the center. This
 * is particularly useful when using the disc as a ground plane
 * with a fixed camera such that you don't need the resolution
 * of small triangles near the perimeter. For example, a value
 * of 2 will produce stacks whose ouside radius increases with
 * the square of the stack index. A value of 1 will give uniform
 * stacks.
 *
 * @param {number} radius Radius of the ground plane.
 * @param {number} divisions Number of triangles in the ground plane
 *                 (at least 3).
 * @param {number} opt_stacks Number of radial divisions (default=1).
 * @param {number} opt_innerRadius. Default 0.
 * @param {number} opt_stackPower Power to raise stack size to for decreasing
 *                 width.
 * @return {!Object.<string, !tdl.primitives.AttribBuffer>} The
 *         created vertices.
 */
tdl.primitives.createDisc = function(
    radius,
    divisions,
    opt_stacks,
    opt_innerRadius,
    opt_stackPower) {
  if (divisions < 3) {
    throw Error('divisions must be at least 3');
  }

  var stacks = opt_stacks ? opt_stacks : 1;
  var stackPower = opt_stackPower ? opt_stackPower : 1;
  var innerRadius = opt_innerRadius ? opt_innerRadius : 0;

  // Note: We don't share the center vertex because that would
  // mess up texture coordinates.
  var numVertices = (divisions) * (stacks + 1);

  var positions = new tdl.primitives.AttribBuffer(3, numVertices);
  var normals = new tdl.primitives.AttribBuffer(3, numVertices);
  var texCoords = new tdl.primitives.AttribBuffer(2, numVertices);
  var indices = new tdl.primitives.AttribBuffer(
      3, stacks * divisions * 2, 'Uint16Array');

  var firstIndex = 0;
  var radiusSpan = radius - innerRadius;

  // Build the disk one stack at a time.
  for (var stack = 0; stack <= stacks; ++stack) {
    var stackRadius = innerRadius + radiusSpan * Math.pow(stack / stacks, stackPower);

    for (var i = 0; i < divisions; ++i) {
      var theta = 2.0 * Math.PI * i / divisions;
      var x = stackRadius * Math.cos(theta);
      var z = stackRadius * Math.sin(theta);

      positions.push([x, 0, z]);
      normals.push([0, 1, 0]);
      texCoords.push([1 - (i / divisions), stack / stacks]);
      if (stack > 0) {
        // a, b, c and d are the indices of the vertices of a quad.  unless
        // the current stack is the one closest to the center, in which case
        // the vertices a and b connect to the center vertex.
        var a = firstIndex + (i + 1) % divisions;
        var b = firstIndex + i;
        var c = firstIndex + i - divisions;
        var d = firstIndex + (i + 1) % divisions - divisions;

        // Make a quad of the vertices a, b, c, d.
        indices.push([a, b, c]);
        indices.push([a, c, d]);
      }
    }

    firstIndex += divisions;
  }

  return {
    position: positions,
    normal: normals,
    texCoord: texCoords,
    indices: indices};
};

/**
 * Interleaves vertex information into one large buffer
 * @param {Array of <string, tdl.primitives.AttribBuffer>}
 * @param {Object.<string, tdl.primitives.AttribBuffer>}
 */
tdl.primitives.interleaveVertexData = function(vertexDataArray) {
  var stride = 0;
  for (var s = 0; s < vertexDataArray.length; s++) {
    stride += vertexDataArray[s].numComponents;
  }
  // This assumes the first element is always positions.
  var numVertices = vertexDataArray[0].numElements;
  var vertexData = new Float32Array(stride * numVertices);
  var count = 0;
  for (var v = 0; v< numVertices; v++) {
    for (var i = 0; i < vertexDataArray.length; i++) {
      var element  = vertexDataArray[i].getElement(v);
      for (var d = 0; d < vertexDataArray[i].numComponents; d++) {
        vertexData[count++] = element[d];
      }
    }
  }
  return vertexData;
};
/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview This file contains objects to deal with WebGL
 *               programs.
 */

//tdl.provide('tdl.programs');

//tdl.require('tdl.log');
//tdl.require('tdl.string');
//tdl.require('tdl.webgl');

/**
 * A module for programs.
 * @namespace
 */
tdl.programs = tdl.programs || {};

/**
 * Loads a program from script tags.
 * @param {string} vertexShaderId The id of the script tag that contains the
 *     vertex shader source.
 * @param {string} fragmentShaderId The id of the script tag that contains the
 *     fragment shader source.
 * @return {tdl.programs.Program} The created program.
 */
tdl.programs.loadProgramFromScriptTags = function(
    vertexShaderId, fragmentShaderId) {
  var vertElem = document.getElementById(vertexShaderId);
  var fragElem = document.getElementById(fragmentShaderId);
  if (!vertElem) {
    throw("Can't find vertex program tag: " + vertexShaderId);
  }
  if (!fragElem) {
    throw("Can't find fragment program tag: " + fragmentShaderId);
  }
  return tdl.programs.loadProgram(
      document.getElementById(vertexShaderId).text,
      document.getElementById(fragmentShaderId).text);
};

tdl.programs.makeProgramId = function(vertexShader, fragmentShader) {
  return vertexShader + fragmentShader;
};

/**
 * Loads a program.
 * @param {string} vertexShader The vertex shader source.
 * @param {string} fragmentShader The fragment shader source.
 * @param {!function(error)) opt_asyncCallback. Called with
 *        undefined if success or string if failure.
 * @return {tdl.programs.Program} The created program.
 */
tdl.programs.loadProgram = function(vertexShader, fragmentShader, opt_asyncCallback) {
  var id = tdl.programs.makeProgramId(vertexShader, fragmentShader);
  tdl.programs.init_();
  var program = gl.tdl.programs.programDB[id];
  if (program) {
    if (opt_asyncCallback) {
      setTimeout(function() { opt_asyncCallback(); }, 1);
    }
    return program;
  }
  try {
    program = new tdl.programs.Program(vertexShader, fragmentShader, opt_asyncCallback);
  } catch (e) {
    tdl.error(e);
    return null;
  }
  if (!opt_asyncCallback) {
    gl.tdl.programs.programDB[id] = program;
  }
  return program;
};

/**
 * A object to manage a WebGLProgram.
 * @constructor
 * @param {string} vertexShader The vertex shader source.
 * @param {string} fragmentShader The fragment shader source.
 * @param {!function(error)) opt_asyncCallback. Called with
 *        undefined if success or string if failure.
 */
tdl.programs.Program = function(vertexShader, fragmentShader, opt_asyncCallback) {
  var that = this;
  this.programId = tdl.programs.makeProgramId(vertexShader, fragmentShader);
  this.asyncCallback = opt_asyncCallback;

  var shaderId;
  var program;
  var vs;
  var fs;

  /**
   * Loads a shader.
   * @param {!WebGLContext} gl The WebGLContext to use.
   * @param {string} shaderSource The shader source.
   * @param {number} shaderType The type of shader.
   * @return {!WebGLShader} The created shader.
   */
  var loadShader = function(gl, shaderSource, shaderType) {
    shaderId = shaderSource + shaderType;
    tdl.programs.init_();
    var shader = gl.tdl.programs.shaderDB[shaderId];
    if (shader) {
      return shader;
    }

    // Create the shader object
    var shader = gl.createShader(shaderType);

    // Load the shader source
    gl.shaderSource(shader, shaderSource);

    // Compile the shader
    gl.compileShader(shader);

    // Check the compile status
    if (!that.asyncCallback) {
      checkShader(shader);
    }
    return shader;
  }

  var checkShader = function(shader) {
    var compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (!compiled && !gl.isContextLost()) {
      // Something went wrong during compilation; get the error
      tdl.programs.lastError = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw("*** Error compiling shader :" + tdl.programs.lastError);
    }
    gl.tdl.programs.shaderDB[shaderId] = shader;
  };

  /**
   * Loads shaders from script tags, creates a program, attaches the shaders and
   * links.
   * @param {!WebGLContext} gl The WebGLContext to use.
   * @param {string} vertexShader The vertex shader.
   * @param {string} fragmentShader The fragment shader.
   * @return {!WebGLProgram} The created program.
   */
  var loadProgram = function(gl, vertexShader, fragmentShader) {
    var e;
    try {
      vs = loadShader(gl, vertexShader, gl.VERTEX_SHADER);
      fs = loadShader(gl, fragmentShader, gl.FRAGMENT_SHADER);
      program = gl.createProgram();
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      linkProgram(gl, program);
    } catch (e) {
      deleteAll(e);
    }
    return program;
  };

  var deleteAll = function(e) {
    if (vs) { gl.deleteShader(vs) }
    if (fs) { gl.deleteShader(fs) }
    if (program) { gl.deleteProgram(program) }
    throw e;
  };

  /**
   * Links a WebGL program, throws if there are errors.
   * @param {!WebGLContext} gl The WebGLContext to use.
   * @param {!WebGLProgram} program The WebGLProgram to link.
   */
  var linkProgram = function(gl, program) {
    // Link the program
    gl.linkProgram(program);

    // Check the link status
    if (!that.asyncCallback) {
      checkProgram(program);
    }
  };

  var checkProgram = function(program) {
    var linked = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!linked && !gl.isContextLost()) {
      // something went wrong with the link
      tdl.programs.lastError = gl.getProgramInfoLog (program);
      throw("*** Error in program linking:" + tdl.programs.lastError);
    }
  };

  // Compile shaders
  var program = loadProgram(gl, vertexShader, fragmentShader);
  if (!program && !gl.isContextLost()) {
    throw ("could not compile program");
  }

  // TODO(gman): remove the need for this.
  function flatten(array){
    var flat = [];
    for (var i = 0, l = array.length; i < l; i++) {
      var type = Object.prototype.toString.call(array[i]).split(' ').pop().split(']').shift().toLowerCase();
      if (type) { flat = flat.concat(/^(array|collection|arguments|object)$/.test(type) ? flatten(array[i]) : array[i]); }
    }
    return flat;
  }

  function createSetters(program) {
    // Look up attribs.
    var attribs = {
    };
    // Also make a plain table of the locs.
    var attribLocs = {
    };

    function createAttribSetter(info, index) {
      if (info.size != 1) {
        throw("arrays of attribs not handled");
      }
      return function(b) {
          gl.bindBuffer(gl.ARRAY_BUFFER, b.buffer());
          gl.enableVertexAttribArray(index);
          gl.vertexAttribPointer(
              index, b.numComponents(), b.type(), b.normalize(), b.stride(), b.offset());
        };
    }

    var numAttribs = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
    for (var ii = 0; ii < numAttribs; ++ii) {
      var info = gl.getActiveAttrib(program, ii);
    if (!info) {
      break;
    }
      var name = info.name;
      if (tdl.string.endsWith(name, "[0]")) {
        name = name.substr(0, name.length - 3);
      }
      var index = gl.getAttribLocation(program, info.name);
      attribs[name] = createAttribSetter(info, index);
      attribLocs[name] = index
    }

    // Look up uniforms
    var numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    var uniforms = {
    };
    var textureUnit = 0;

    function createUniformSetter(info) {
      var loc = gl.getUniformLocation(program, info.name);
      var type = info.type;
      if (info.size > 1 && tdl.string.endsWith(info.name, "[0]")) {
        // It's an array.
        if (type == gl.FLOAT)
          return function() {
            var old;
            return function(v) {
              if (v !== old) {
                old = v;
                gl.uniform1fv(loc, v);
              }
            };
          }();
        if (type == gl.FLOAT_VEC2)
          return function() {
            // I hope they don't use -1,-1 as their first draw
            var old = new Float32Array([-1, -1]);
            return function(v) {
              if (v[0] != old[0] || v[1] != old[1]) {
                gl.uniform2fv(loc, v);
              }
            };
          }();
        if (type == gl.FLOAT_VEC3)
          return function() {
            // I hope they don't use -1,-1,-1 as their first draw
            var old = new Float32Array([-1, -1, -1]);
            return function(v) {
              if (v[0] != old[0] || v[1] != old[1] || v[2] != old[2]) {
                gl.uniform3fv(loc, v);
              }
            };
          }();
        if (type == gl.FLOAT_VEC4)
          return function(v) { gl.uniform4fv(loc, v); };
        if (type == gl.INT)
          return function(v) { gl.uniform1iv(loc, v); };
        if (type == gl.INT_VEC2)
          return function(v) { gl.uniform2iv(loc, v); };
        if (type == gl.INT_VEC3)
          return function(v) { gl.uniform3iv(loc, v); };
        if (type == gl.INT_VEC4)
          return function(v) { gl.uniform4iv(loc, v); };
        if (type == gl.BOOL)
          return function(v) { gl.uniform1iv(loc, v); };
        if (type == gl.BOOL_VEC2)
          return function(v) { gl.uniform2iv(loc, v); };
        if (type == gl.BOOL_VEC3)
          return function(v) { gl.uniform3iv(loc, v); };
        if (type == gl.BOOL_VEC4)
          return function(v) { gl.uniform4iv(loc, v); };
        if (type == gl.FLOAT_MAT2)
          return function(v) { gl.uniformMatrix2fv(loc, false, v); };
        if (type == gl.FLOAT_MAT3)
          return function(v) { gl.uniformMatrix3fv(loc, false, v); };
        if (type == gl.FLOAT_MAT4)
          return function(v) { gl.uniformMatrix4fv(loc, false, v); };
        if (type == gl.SAMPLER_2D || type == gl.SAMPLER_CUBE) {
          var units = [];
          for (var ii = 0; ii < info.size; ++ii) {
            units.push(textureUnit++);
          }
          return function(units) {
            return function(v) {
              gl.uniform1iv(loc, units);
              v.bindToUnit(units);
            };
          }(units);
        }
        throw ("unknown type: 0x" + type.toString(16));
      } else {
        if (type == gl.FLOAT)
          return function(v) { gl.uniform1f(loc, v); };
        if (type == gl.FLOAT_VEC2)
          return function(v) { gl.uniform2fv(loc, v); };
        if (type == gl.FLOAT_VEC3)
          return function(v) { gl.uniform3fv(loc, v); };
        if (type == gl.FLOAT_VEC4)
          return function(v) { gl.uniform4fv(loc, v); };
        if (type == gl.INT)
          return function(v) { gl.uniform1i(loc, v); };
        if (type == gl.INT_VEC2)
          return function(v) { gl.uniform2iv(loc, v); };
        if (type == gl.INT_VEC3)
          return function(v) { gl.uniform3iv(loc, v); };
        if (type == gl.INT_VEC4)
          return function(v) { gl.uniform4iv(loc, v); };
        if (type == gl.BOOL)
          return function(v) { gl.uniform1i(loc, v); };
        if (type == gl.BOOL_VEC2)
          return function(v) { gl.uniform2iv(loc, v); };
        if (type == gl.BOOL_VEC3)
          return function(v) { gl.uniform3iv(loc, v); };
        if (type == gl.BOOL_VEC4)
          return function(v) { gl.uniform4iv(loc, v); };
        if (type == gl.FLOAT_MAT2)
          return function(v) { gl.uniformMatrix2fv(loc, false, v); };
        if (type == gl.FLOAT_MAT3)
          return function(v) { gl.uniformMatrix3fv(loc, false, v); };
        if (type == gl.FLOAT_MAT4)
          return function(v) { gl.uniformMatrix4fv(loc, false, v); };
        if (type == gl.SAMPLER_2D || type == gl.SAMPLER_CUBE) {
          return function(unit) {
            return function(v) {
              gl.uniform1i(loc, unit);
              v.bindToUnit(unit);
            };
          }(textureUnit++);
        }
        throw ("unknown type: 0x" + type.toString(16));
      }
    }

    var textures = {};

    for (var ii = 0; ii < numUniforms; ++ii) {
      var info = gl.getActiveUniform(program, ii);
    if (!info) {
      break;
    }
      name = info.name;
      if (tdl.string.endsWith(name, "[0]")) {
        name = name.substr(0, name.length - 3);
      }
      var setter = createUniformSetter(info);
      uniforms[name] = setter;
      if (info.type == gl.SAMPLER_2D || info.type == gl.SAMPLER_CUBE) {
        textures[name] = setter;
      }
    }

    that.textures = textures;
    that.attrib = attribs;
    that.attribLoc = attribLocs;
    that.uniform = uniforms;
  }
  createSetters(program);

  this.loadNewShaders = function(vertexShaderSource, fragmentShaderSource) {
    var program = loadProgram(gl, vertexShaderSource, fragmentShaderSource);
    if (!program && !gl.isContextLost()) {
      throw ("could not compile program");
    }
    that.program = program;
    createSetters();
  };

  this.program = program;
  this.good = this.asyncCallback ? false : true;

  var checkLater = function() {
    var e;
    try {
      checkShader(vs);
      checkShader(fs);
      checkProgram(program);
    } catch (e) {
      that.asyncCallback(e.toString());
      return;
    }
    gl.tdl.programs.programDB[that.programId] = this;
    that.asyncCallback();
  };
  if (this.asyncCallback) {
    setTimeout(checkLater, 1000);
  }
};

tdl.programs.handleContextLost_ = function() {
  if (gl.tdl && gl.tdl.programs && gl.tdl.programs.shaderDB) {
    delete gl.tdl.programs.shaderDB;
    delete gl.tdl.programs.programDB;
  }
};

tdl.programs.init_ = function() {
  if (!gl.tdl.programs) {
    gl.tdl.programs = { };
    tdl.webgl.registerContextLostHandler(gl.canvas, tdl.programs.handleContextLost_, true);
  }
  if (!gl.tdl.programs.shaderDB) {
    gl.tdl.programs.shaderDB = { };
    gl.tdl.programs.programDB = { };
  }
};

tdl.programs.Program.prototype.use = function() {
  gl.useProgram(this.program);
};

//function dumpValue(msg, name, value) {
//  var str;
//  if (value.length) {
//      str = value[0].toString();
//     for (var ii = 1; ii < value.length; ++ii) {
//       str += "," + value[ii];
//     }
//  } else {
//    str = value.toString();
//  }
//  tdl.log(msg + name + ": " + str);
//}

tdl.programs.Program.prototype.setUniform = function(uniform, value) {
  var func = this.uniform[uniform];
  if (func) {
    //dumpValue("SET UNI:", uniform, value);
    func(value);
  }
};


/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @fileoverview This file contains various functions for quaternion arithmetic
 * and converting between rotation matrices and quaternions.  It adds them to
 * the "quaternions" module on the tdl object.  Javascript arrays with
 * four entries are used to represent quaternions, and functions are provided
 * for doing operations on those.
 *
 * Operations are done assuming quaternions are of the form:
 * q[0] + q[1]i + q[2]j + q[3]k and using the hamiltonian rules for
 * multiplication as described on Brougham Bridge:
 * i^2 = j^2 = k^2 = ijk = -1.
 *
 */

//tdl.provide('tdl.quaternions');

/**
 * A Module for quaternion math.
 * @namespace
 */
tdl.quaternions = tdl.quaternions || {};

/**
 * A Quaternion.
 * @type {!Array.<number>}
 */
tdl.quaternions.Quaternion = goog.typedef;

/**
 * Quickly determines if the object a is a scalar or a quaternion;
 * assumes that the argument is either a number (scalar), or an array of
 * numbers.
 * @param {(number|!tdl.quaternions.Quaternion)} a A number or array the type
 *     of which is in question.
 * @return {string} Either the string 'Scalar' or 'Quaternion'.
 */
tdl.quaternions.mathType = function(a) {
  if (typeof(a) === 'number')
    return 'Scalar';
  return 'Quaternion';
};

/**
 * Creates an identity quaternion.
 * @return {!tdl.quaternions.Quaternion} The identity quaternion.
 */
tdl.quaternions.identity = function() {
  return [ 0, 0, 0, 1 ];
};

/**
 * Copies a quaternion.
 * @param {!tdl.quaternions.Quaternion} q The quaternion.
 * @return {!tdl.quaternions.Quaternion} A new quaternion identical to q.
 */
tdl.quaternions.copy = function(q) {
  return q.slice();
};

/**
 * Negates a quaternion.
 * @param {!tdl.quaternions.Quaternion} q The quaternion.
 * @return {!tdl.quaternions.Quaternion} -q.
 */
tdl.quaternions.negative = function(q) {
  return [-q[0], -q[1], -q[2], -q[3]];
};

/**
 * Adds two Quaternions.
 * @param {!tdl.quaternions.Quaternion} a Operand Quaternion.
 * @param {!tdl.quaternions.Quaternion} b Operand Quaternion.
 * @return {!tdl.quaternions.Quaternion} The sum of a and b.
 */
tdl.quaternions.addQuaternionQuaternion = function(a, b) {
  return [a[0] + b[0],
          a[1] + b[1],
          a[2] + b[2],
          a[3] + b[3]];
};

/**
 * Adds a quaternion to a scalar.
 * @param {!tdl.quaternions.Quaternion} a Operand Quaternion.
 * @param {number} b Operand Scalar.
 * @return {!tdl.quaternions.Quaternion} The sum of a and b.
 */
tdl.quaternions.addQuaternionScalar = function(a, b) {
  return a.slice(0, 3).concat(a[3] + b);
};

/**
 * Adds a scalar to a quaternion.
 * @param {number} a Operand scalar.
 * @param {!tdl.quaternions.Quaternion} b Operand quaternion.
 * @return {!tdl.quaternions.Quaternion} The sum of a and b.
 */
tdl.quaternions.addScalarQuaternion = function(a, b) {
  return b.slice(0, 3).concat(a + b[3]);
};

/**
 * Subtracts two quaternions.
 * @param {!tdl.quaternions.Quaternion} a Operand quaternion.
 * @param {!tdl.quaternions.Quaternion} b Operand quaternion.
 * @return {!tdl.quaternions.Quaternion} The difference a - b.
 */
tdl.quaternions.subQuaternionQuaternion = function(a, b) {
  return [a[0] - b[0],
          a[1] - b[1],
          a[2] - b[2],
          a[3] - b[3]];
};

/**
 * Subtracts a scalar from a quaternion.
 * @param {!tdl.quaternions.Quaternion} a Operand quaternion.
 * @param {number} b Operand scalar.
 * @return {!tdl.quaternions.Quaternion} The difference a - b.
 */
tdl.quaternions.subQuaternionScalar = function(a, b) {
  return a.slice(0, 3).concat(a[3] - b);
};

/**
 * Subtracts a quaternion from a scalar.
 * @param {number} a Operand scalar.
 * @param {!tdl.quaternions.Quaternion} b Operand quaternion.
 * @return {!tdl.quaternions.Quaternion} The difference a - b.
 */
tdl.quaternions.subScalarQuaternion = function(a, b) {
  return [-b[0], -b[1], -b[2], a - b[3]];
};

/**
 * Multiplies a scalar by a quaternion.
 * @param {number} k The scalar.
 * @param {!tdl.quaternions.Quaternion} q The quaternion.
 * @return {!tdl.quaternions.Quaternion} The product of k and q.
 */
tdl.quaternions.mulScalarQuaternion = function(k, q) {
  return [k * q[0], k * q[1], k * q[2], k * q[3]];
};

/**
 * Multiplies a quaternion by a scalar.
 * @param {!tdl.quaternions.Quaternion} q The Quaternion.
 * @param {number} k The scalar.
 * @return {!tdl.quaternions.Quaternion} The product of k and v.
 */
tdl.quaternions.mulQuaternionScalar = function(q, k) {
  return [k * q[0], k * q[1], k * q[2], k * q[3]];
};

/**
 * Multiplies two quaternions.
 * @param {!tdl.quaternions.Quaternion} a Operand quaternion.
 * @param {!tdl.quaternions.Quaternion} b Operand quaternion.
 * @return {!tdl.quaternions.Quaternion} The quaternion product a * b.
 */
tdl.quaternions.mulQuaternionQuaternion = function(a, b) {
  var aX = a[0];
  var aY = a[1];
  var aZ = a[2];
  var aW = a[3];
  var bX = b[0];
  var bY = b[1];
  var bZ = b[2];
  var bW = b[3];

  return [
      aW * bX + aX * bW + aY * bZ - aZ * bY,
      aW * bY + aY * bW + aZ * bX - aX * bZ,
      aW * bZ + aZ * bW + aX * bY - aY * bX,
      aW * bW - aX * bX - aY * bY - aZ * bZ];
};

/**
 * Divides two quaternions; assumes the convention that a/b = a*(1/b).
 * @param {!tdl.quaternions.Quaternion} a Operand quaternion.
 * @param {!tdl.quaternions.Quaternion} b Operand quaternion.
 * @return {!tdl.quaternions.Quaternion} The quaternion quotient a / b.
 */
tdl.quaternions.divQuaternionQuaternion = function(a, b) {
  var aX = a[0];
  var aY = a[1];
  var aZ = a[2];
  var aW = a[3];
  var bX = b[0];
  var bY = b[1];
  var bZ = b[2];
  var bW = b[3];

  var d = 1 / (bW * bW + bX * bX + bY * bY + bZ * bZ);
  return [
      (aX * bW - aW * bX - aY * bZ + aZ * bY) * d,
      (aX * bZ - aW * bY + aY * bW - aZ * bX) * d,
      (aY * bX + aZ * bW - aW * bZ - aX * bY) * d,
      (aW * bW + aX * bX + aY * bY + aZ * bZ) * d];
};

/**
 * Divides a Quaternion by a scalar.
 * @param {!tdl.quaternions.Quaternion} q The quaternion.
 * @param {number} k The scalar.
 * @return {!tdl.quaternions.Quaternion} q The quaternion q divided by k.
 */
tdl.quaternions.divQuaternionScalar = function(q, k) {
  return [q[0] / k, q[1] / k, q[2] / k, q[3] / k];
};

/**
 * Divides a scalar by a quaternion.
 * @param {number} a Operand scalar.
 * @param {!tdl.quaternions.Quaternion} b Operand quaternion.
 * @return {!tdl.quaternions.Quaternion} The quaternion product.
 */
tdl.quaternions.divScalarQuaternion = function(a, b) {
  var b0 = b[0];
  var b1 = b[1];
  var b2 = b[2];
  var b3 = b[3];

  var d = 1 / (b0 * b0 + b1 * b1 + b2 * b2 + b3 * b3);
  return [-a * b0 * d, -a * b1 * d, -a * b2 * d, a * b3 * d];
};

/**
 * Computes the multiplicative inverse of a quaternion.
 * @param {!tdl.quaternions.Quaternion} q The quaternion.
 * @return {!tdl.quaternions.Quaternion} The multiplicative inverse of q.
 */
tdl.quaternions.inverse = function(q) {
  var q0 = q[0];
  var q1 = q[1];
  var q2 = q[2];
  var q3 = q[3];

  var d = 1 / (q0 * q0 + q1 * q1 + q2 * q2 + q3 * q3);
  return [-q0 * d, -q1 * d, -q2 * d, q3 * d];
};

/**
 * Multiplies two objects which are either scalars or quaternions.
 * @param {(!tdl.quaternions.Quaternion|number)} a Operand.
 * @param {(!tdl.quaternions.Quaternion|number)} b Operand.
 * @return {(!tdl.quaternions.Quaternion|number)} The product of a and b.
 */
tdl.quaternions.mul = function(a, b) {
  return tdl.quaternions['mul' + tdl.quaternions.mathType(a) +
      tdl.quaternions.mathType(b)](a, b);
};

/**
 * Divides two objects which are either scalars or quaternions.
 * @param {(!tdl.quaternions.Quaternion|number)} a Operand.
 * @param {(!tdl.quaternions.Quaternion|number)} b Operand.
 * @return {(!tdl.quaternions.Quaternion|number)} The quotient of a and b.
 */
tdl.quaternions.div = function(a, b) {
  return tdl.quaternions['div' + tdl.quaternions.mathType(a) +
      tdl.quaternions.mathType(b)](a, b);
};

/**
 * Adds two objects which are either scalars or quaternions.
 * @param {(!tdl.quaternions.Quaternion|number)} a Operand.
 * @param {(!tdl.quaternions.Quaternion|number)} b Operand.
 * @return {(!tdl.quaternions.Quaternion|number)} The sum of a and b.
 */
tdl.quaternions.add = function(a, b) {
  return tdl.quaternions['add' + tdl.quaternions.mathType(a) +
      tdl.quaternions.mathType(b)](a, b);
};

/**
 * Subtracts two objects which are either scalars or quaternions.
 * @param {(!tdl.quaternions.Quaternion|number)} a Operand.
 * @param {(!tdl.quaternions.Quaternion|number)} b Operand.
 * @return {(!tdl.quaternions.Quaternion|number)} The difference of a and b.
 */
tdl.quaternions.sub = function(a, b) {
  return tdl.quaternions['sub' + tdl.quaternions.mathType(a) +
      tdl.quaternions.mathType(b)](a, b);
};

/**
 * Computes the length of a Quaternion, i.e. the square root of the
 * sum of the squares of the coefficients.
 * @param {!tdl.quaternions.Quaternion} a The Quaternion.
 * @return {number} The length of a.
 */
tdl.quaternions.length = function(a) {
  return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2] + a[3] * a[3]);
};

/**
 * Computes the square of the length of a quaternion, i.e. the sum of the
 * squares of the coefficients.
 * @param {!tdl.quaternions.Quaternion} a The quaternion.
 * @return {number} The square of the length of a.
 */
tdl.quaternions.lengthSquared = function(a) {
  return a[0] * a[0] + a[1] * a[1] + a[2] * a[2] + a[3] * a[3];
};

/**
 * Divides a Quaternion by its length and returns the quotient.
 * @param {!tdl.quaternions.Quaternion} a The Quaternion.
 * @return {!tdl.quaternions.Quaternion} A unit length quaternion pointing in
 *     the same direction as a.
 */
tdl.quaternions.normalize = function(a) {
  var d = 1 / Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2] + a[3] * a[3]);
  return [a[0] * d, a[1] * d, a[2] * d, a[3] * d];
};

/**
 * Computes the conjugate of the given quaternion.
 * @param {!tdl.quaternions.Quaternion} q The quaternion.
 * @return {!tdl.quaternions.Quaternion} The conjugate of q.
 */
tdl.quaternions.conjugate = function(q) {
  return [-q[0], -q[1], -q[2], q[3]];
};


/**
 * Creates a quaternion which rotates around the x-axis by the given angle.
 * @param {number} angle The angle by which to rotate (in radians).
 * @return {!tdl.quaternions.Quaternion} The quaternion.
 */
tdl.quaternions.rotationX = function(angle) {
  return [Math.sin(angle / 2), 0, 0, Math.cos(angle / 2)];
};

/**
 * Creates a quaternion which rotates around the y-axis by the given angle.
 * @param {number} angle The angle by which to rotate (in radians).
 * @return {!tdl.quaternions.Quaternion} The quaternion.
 */
tdl.quaternions.rotationY = function(angle) {
  return [0, Math.sin(angle / 2), 0, Math.cos(angle / 2)];
};

/**
 * Creates a quaternion which rotates around the z-axis by the given angle.
 * @param {number} angle The angle by which to rotate (in radians).
 * @return {!tdl.quaternions.Quaternion} The quaternion.
 */
tdl.quaternions.rotationZ = function(angle) {
  return [0, 0, Math.sin(angle / 2), Math.cos(angle / 2)];
};

/**
 * Creates a quaternion which rotates around the given axis by the given
 * angle.
 * @param {!tdl.math.Vector3} axis The axis about which to rotate.
 * @param {number} angle The angle by which to rotate (in radians).
 * @return {!tdl.quaternions.Quaternion} A quaternion which rotates angle
 *     radians around the axis.
 */
tdl.quaternions.axisRotation = function(axis, angle) {
  var d = 1 / Math.sqrt(axis[0] * axis[0] +
                        axis[1] * axis[1] +
                        axis[2] * axis[2]);
  var sin = Math.sin(angle / 2);
  var cos = Math.cos(angle / 2);
  return [sin * axis[0] * d, sin * axis[1] * d, sin * axis[2] * d, cos];
};

/**
 * Computes a 4-by-4 rotation matrix (with trivial translation component)
 * given a quaternion.  We assume the convention that to rotate a vector v by
 * a quaternion r means to express that vector as a quaternion q by letting
 * q = [v[0], v[1], v[2], 0] and then obtain the rotated vector by evaluating
 * the expression (r * q) / r.
 * @param {!tdl.quaternions.Quaternion} q The quaternion.
 * @return {!tdl.math.Matrix4} A 4-by-4 rotation matrix.
 */
tdl.quaternions.quaternionToRotation = function(q) {
  var qX = q[0];
  var qY = q[1];
  var qZ = q[2];
  var qW = q[3];

  var qWqW = qW * qW;
  var qWqX = qW * qX;
  var qWqY = qW * qY;
  var qWqZ = qW * qZ;
  var qXqW = qX * qW;
  var qXqX = qX * qX;
  var qXqY = qX * qY;
  var qXqZ = qX * qZ;
  var qYqW = qY * qW;
  var qYqX = qY * qX;
  var qYqY = qY * qY;
  var qYqZ = qY * qZ;
  var qZqW = qZ * qW;
  var qZqX = qZ * qX;
  var qZqY = qZ * qY;
  var qZqZ = qZ * qZ;

  var d = qWqW + qXqX + qYqY + qZqZ;

  return [
    [(qWqW + qXqX - qYqY - qZqZ) / d,
     2 * (qWqZ + qXqY) / d,
     2 * (qXqZ - qWqY) / d, 0],
    [2 * (qXqY - qWqZ) / d,
     (qWqW - qXqX + qYqY - qZqZ) / d,
     2 * (qWqX + qYqZ) / d, 0],
    [2 * (qWqY + qXqZ) / d,
     2 * (qYqZ - qWqX) / d,
     (qWqW - qXqX - qYqY + qZqZ) / d, 0],
    [0, 0, 0, 1]];
};

/**
 * Computes a quaternion whose rotation is equivalent to the given matrix.
 * @param {(!tdl.math.Matrix4|!tdl.math.Matrix3)} m A 3-by-3 or 4-by-4
 *     rotation matrix.
 * @return {!tdl.quaternions.Quaternion} A quaternion q such that
 *     quaternions.quaternionToRotation(q) is m.
 */
tdl.quaternions.rotationToQuaternion = function(m) {
  var u;
  var v;
  var w;

  // Choose u, v, and w such that u is the index of the biggest diagonal entry
  // of m, and u v w is an even permutation of 0 1 and 2.
  if (m[0][0] > m[1][1] && m[0][0] > m[2][2]) {
    u = 0;
    v = 1;
    w = 2;
  } else if (m[1][1] > m[0][0] && m[1][1] > m[2][2]) {
    u = 1;
    v = 2;
    w = 0;
  } else {
    u = 2;
    v = 0;
    w = 1;
  }

  var r = Math.sqrt(1 + m[u][u] - m[v][v] - m[w][w]);
  var q = [];
  q[u] = 0.5 * r;
  q[v] = 0.5 * (m[v][u] + m[u][v]) / r;
  q[w] = 0.5 * (m[u][w] + m[w][u]) / r;
  q[3] = 0.5 * (m[v][w] - m[w][v]) / r;

  return q;
};

/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview This file contains various functions for taking a screenshot
 */

//tdl.provide('tdl.screenshot');

//tdl.require('tdl.io');
//tdl.require('tdl.log');
tdl.screenshot = {};

/**
 * takes a screenshot of a canvas. Sends it to the server to be saved.
 */
tdl.screenshot.takeScreenshot = function(canvas) {
  tdl.io.sendJSON(
      this.url,
      {cmd: 'screenshot', dataURL: canvas.toDataURL()},
      function() {});
};



/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview This file contains a class which assists with the
 * loading of GLSL shaders.
 */

//tdl.provide('tdl.shader');

/**
 * A module for shaders.
 * @namespace
 */
tdl.shader = tdl.shader || {};

/**

 * Loads a shader from vertex and fragment programs specified in
 * "script" nodes in the HTML page. This provides a convenient
 * mechanism for writing GLSL snippets without the burden of
 * additional syntax like per-line quotation marks.
 * @param {!WebGLRenderingContext} gl The WebGLRenderingContext
 *     into which the shader will be loaded.
 * @param {!string} vertexScriptName The name of the HTML Script node
 *     containing the vertex program.
 * @param {!string} fragmentScriptName The name of the HTML Script node
 *     containing the fragment program.
 */
tdl.shader.loadFromScriptNodes = function(gl,
                                            vertexScriptName,
                                            fragmentScriptName) {
  var vertexScript = document.getElementById(vertexScriptName);
  var fragmentScript = document.getElementById(fragmentScriptName);
  if (!vertexScript || !fragmentScript)
    return null;
  return new tdl.shader.Shader(gl,
                                 vertexScript.text,
                                 fragmentScript.text);
}

/**
 * Helper which convers GLSL names to JavaScript names.
 * @private
 */
tdl.shader.glslNameToJs_ = function(name) {
  return name.replace(/_(.)/g, function(_, p1) { return p1.toUpperCase(); });
}

/**
 * Creates a new Shader object, loading and linking the given vertex
 * and fragment shaders into a program.
 * @param {!WebGLRenderingContext} gl The WebGLRenderingContext
 *     into which the shader will be loaded.
 * @param {!string} vertex The vertex shader.
 * @param {!string} fragment The fragment shader.
 */
tdl.shader.Shader = function(gl, vertex, fragment) {
  this.program = gl.createProgram();
  this.gl = gl;

  var vs = this.loadShader(this.gl.VERTEX_SHADER, vertex);
  if (!vs) {
    tdl.log("couldn't load shader")
  }
  this.gl.attachShader(this.program, vs);
  this.gl.deleteShader(vs);

  var fs = this.loadShader(this.gl.FRAGMENT_SHADER, fragment);
  if (!fs) {
    tdl.log("couldn't load shader")
  }
  this.gl.attachShader(this.program, fs);
  this.gl.deleteShader(fs);

  this.gl.linkProgram(this.program);
  this.gl.useProgram(this.program);

  // Check the link status
  var linked = this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS);
  if (!linked && !this.gl.isContextLost()) {
    var infoLog = this.gl.getProgramInfoLog(this.program);
    tdl.error("Error linking program:\n" + infoLog);
    this.gl.deleteProgram(this.program);
    this.program = null;
    return;
  }

  // find uniforms and attributes
  var re = /(uniform|attribute)\s+\S+\s+(\S+)\s*;/g;
  var match = null;
  while ((match = re.exec(vertex + '\n' + fragment)) != null) {
    var glslName = match[2];
    var jsName = tdl.shader.glslNameToJs_(glslName);
    var loc = -1;
    if (match[1] == "uniform") {
      this[jsName + "Loc"] = this.getUniform(glslName);
    } else if (match[1] == "attribute") {
      this[jsName + "Loc"] = this.getAttribute(glslName);
    }
    if (loc >= 0) {
      this[jsName + "Loc"] = loc;
    }
  }
}

/**
 * Binds the shader's program.
 */
tdl.shader.Shader.prototype.bind = function() {
  this.gl.useProgram(this.program);
}

/**
 * Helper for loading a shader.
 * @private
 */
tdl.shader.Shader.prototype.loadShader = function(type, shaderSrc) {
  var shader = this.gl.createShader(type);
  if (shader == null) {
    return null;
  }

  // Load the shader source
  this.gl.shaderSource(shader, shaderSrc);
  // Compile the shader
  this.gl.compileShader(shader);
  // Check the compile status
  if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
    var infoLog = this.gl.getShaderInfoLog(shader);
    tdl.error("Error compiling shader:\n" + infoLog);
    this.gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/**
 * Helper for looking up an attribute's location.
 * @private
 */
tdl.shader.Shader.prototype.getAttribute = function(name) {
  return this.gl.getAttribLocation(this.program, name);
};

/**
 * Helper for looking up an attribute's location.
 * @private
 */
tdl.shader.Shader.prototype.getUniform = function(name) {
  return this.gl.getUniformLocation(this.program, name);
}
/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview This file contains objects strings.
 */

//tdl.provide('tdl.string');

/**
 * A module for string.
 * @namespace
 */
tdl.string = tdl.string || {};

/**
 * Whether a haystack ends with a needle.
 * @param {string} haystack String to search
 * @param {string} needle String to search for.
 * @param {boolean} True if haystack ends with needle.
 */
tdl.string.endsWith = function(haystack, needle) {
  return haystack.substr(haystack.length - needle.length) === needle;
};

/**
 * Whether a haystack starts with a needle.
 * @param {string} haystack String to search
 * @param {string} needle String to search for.
 * @param {boolean} True if haystack starts with needle.
 */
tdl.string.startsWith = function(haystack, needle) {
  return haystack.substr(0, needle.length) === needle;
};

/**
 * Converts a non-homogenious array into a string.
 * @param {!Array.<*>} args Args to turn into a string
 */
tdl.string.argsToString = function(args) {
  var lastArgWasNumber = false;
  var numArgs = args.length;
  var strs = [];
  for (var ii = 0; ii < numArgs; ++ii) {
    var arg = args[ii];
    if (arg === undefined) {
      strs.push('undefined');
    } else if (typeof arg == 'number') {
      if (lastArgWasNumber) {
        strs.push(", ");
      }
      if (arg == Math.floor(arg)) {
        strs.push(arg.toFixed(0));
      } else {
      strs.push(arg.toFixed(3));
      }
      lastArgWasNumber = true;
    } else if (window.Float32Array && arg instanceof Float32Array) {
      // TODO(gman): Make this handle other types of arrays.
      strs.push(tdl.string.argsToString(arg));
    } else {
      strs.push(arg.toString());
      lastArgWasNumber = false;
    }
  }
  return strs.join("");
};

/**
 * Converts an object into a string. Similar to JSON.stringify but just used
 * for debugging.
 */
tdl.string.objToString = function(obj, opt_prefix) {
  var strs = [];

  function objToString(obj, opt_prefix) {
    opt_prefix = opt_prefix || "";
    if (typeof obj == 'object') {
      if (obj.length !== undefined) {
        for (var ii = 0; ii < obj.length; ++ii) {
          objToString(obj[ii], opt_prefix + "[" + ii + "]");
        }
      } else {
        for (var name in obj) {
          objToString(obj[name], opt_prefix + "." + name);
        }
      }
    } else {
      strs.push(tdl.string.argsToString([opt_prefix, ": ", obj]));
    }
  }

  objToString(obj);

  return strs.join("\n");
};


/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview This file contains objects to sync app settings across
 * browsers.
 */

//tdl.provide('tdl.sync');

//tdl.require('tdl.log');
//tdl.require('tdl.io');
//tdl.require('tdl.misc');

/**
 * A module for sync.
 * @namespace
 */
tdl.sync = tdl.sync || {};

/**
 * Manages synchronizing settings across browsers. Requires a server
 * running to support it. Note that even if you don't want to sync
 * across browsers you can still use the SyncManager.
 *
 * @constructor
 * @param {!Object} settings The object that contains the settings you
 *     want kept in sync.
 */
tdl.sync.SyncManager = function(settings, opt_callback) {
  this.settings = settings;
  this.putCount = 0;
  this.getCount = 0;
  this.callback = opt_callback || function() {};

  // This probably should not be here.
  tdl.misc.applyUrlSettings(settings);
}

/**
 * Initialize the sync manager to start syncing settings with a server.
 * @param {string} server domain name of server.
 * @param {number} port port of server.
 * @param {boolean} slave true if this page is a slave. Slaves only receive
 *     settings from the server. Non slaves send settings the server.
 */
tdl.sync.SyncManager.prototype.init = function(url, slave) {
  var that = this;
  this.sync = true;
  this.slave = slave;
  this.socket = new WebSocket(url);
  this.opened = false;
  this.queued = [];
  this.socket.onopen = function(event) {
    tdl.log("SOCKET OPENED!");
    that.opened = true;
    for (var ii = 0; ii < that.queued.length; ++ii) {
      var settings = that.queued[ii];
      ++that.putCount;
      tdl.log("--PUT:[", that.putCount, "]-------------");
      tdl.log(settings);
      that.socket.send(settings);
    }
    that.queued = [];
  };
  this.socket.onerror = function(event) {
    tdl.log("SOCKET ERROR!");
  };
  this.socket.onclose = function(event) {
    tdl.log("SOCKET CLOSED!");
  };
  this.socket.onmessage = function(event) {
    ++that.getCount;
    tdl.log("--GET:[", g_getCount, ":", event.type, "]-------------");
    var obj = JSON.parse(event.data);
    tdl.dumpObj(obj);
    tdl.misc.copyProperties(obj, that.settings);
    that.callback(obj);
  };
};

/**
 * Sets the settings.
 *
 * If we are synchronizing settings the settings are sent to the server.
 * Otherwise they are applied directy.
 *
 * @param {!Object} settings Object with new settings.
 */
tdl.sync.SyncManager.prototype.setSettings = function(settings) {
  if (this.sync) {
    if (!this.slave) {
      if (this.socket) {
        if (!this.opened) {
          this.queued.push(JSON.stringify(settings));
        } else {
          ++this.putCount;
          tdl.log("--PUT:[", this.putCount, "]-------------");
          tdl.dumpObj(settings);
          this.socket.send(JSON.stringify(settings));
        }
      }
    }
  } else {
    tdl.misc.copyProperties(settings, this.settings);
    this.callback(settings);
  }
};


/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview This file contains objects to manage textures.
 */

//tdl.provide('tdl.textures');

//tdl.require('tdl.webgl');

/**
 * A module for textures.
 * @namespace
 */
tdl.textures = tdl.textures || {};

/**
 * Loads a texture
 * @param {{!tdl.math.Vector4|string|!Array.<string>|!img|!canvas}} Passing a
 *        color makes a solid 1pixel 2d texture, passing a URL
 *        makes a 2d texture with that url, passing an array of
 *        urls makes a cubemap, passing an img or canvas makes a 2d texture with
 *        that image.
 * @param {boolean} opt_flipY Flip the texture in Y?
 * @param {function} opt_callback Function to execute when texture is loaded.
 */
tdl.textures.loadTexture = function(arg, opt_flipY, opt_callback) {
  if (opt_callback) {
    alert('callback!');
  }
  var id;
  if (typeof arg == 'string') {
    td = arg;
  } else if (arg.length == 4 && typeof arg[0] == 'number') {
    id = arg.toString();
  } else if ((arg.length == 1 || arg.length == 6) &&
             typeof arg[0] == 'string') {
    id = arg.toString();
  } else if (arg.tagName == 'CANVAS') {
    id = undefined;
  } else if (arg.tagName == 'IMG') {
    id = arg.src;
  } else if (arg.width) {
    id = undefined;
  } else {
    throw "bad args";
  }

  var texture;
  tdl.textures.init_(gl);
  if (id !== undefined) {
    texture = gl.tdl.textures.db[id];
  }
  if (texture) {
    return texture;
  }
  if (typeof arg == 'string') {
    texture = new tdl.textures.Texture2D(arg, opt_flipY, opt_callback);
  } else if (arg.length == 4 && typeof arg[0] == 'number') {
    texture = new tdl.textures.SolidTexture(arg);
  } else if ((arg.length == 1 || arg.length == 6) &&
             typeof arg[0] == 'string') {
    texture = new tdl.textures.CubeMap(arg);
  } else if (arg.tagName == 'CANVAS' || arg.tagName == 'IMG') {
    texture = new tdl.textures.Texture2D(arg, opt_flipY);
  } else if (arg.width) {
    texture = new tdl.textures.ColorTexture2D(arg);
  } else {
    throw "bad args";
  }
  gl.tdl.textures.db[arg.toString()] = texture;
  return texture;
};

tdl.textures.addLoadingImage_ = function(img) {
  tdl.textures.init_(gl);
  gl.tdl.textures.loadingImages.push(img);
};

tdl.textures.removeLoadingImage_ = function(img) {
  gl.tdl.textures.loadingImages.splice(gl.tdl.textures.loadingImages.indexOf(img), 1);
};

tdl.textures.init_ = function(gl) {
  if (!gl.tdl.textures) {
    gl.tdl.textures = { };
    gl.tdl.textures.loadingImages = [];
    tdl.webgl.registerContextLostHandler(
        gl.canvas, tdl.textures.handleContextLost_, true);
  }
  if (!gl.tdl.textures.maxTextureSize) {
    gl.tdl.textures.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    gl.tdl.textures.maxCubeMapSize = gl.getParameter(
        gl.MAX_CUBE_MAP_TEXTURE_SIZE);
  }
  if (!gl.tdl.textures.db) {
    gl.tdl.textures.db = { };
  }
};

tdl.textures.handleContextLost_ = function() {
  if (gl.tdl && gl.tdl.textures) {
    delete gl.tdl.textures.db;
    var imgs = gl.tdl.textures.loadingImages;
    for (var ii = 0; ii < imgs.length; ++ii) {
      imgs[ii].onload = undefined;
    }
    gl.tdl.textures.loadingImages = [];
  }
};

tdl.textures.Texture = function(target) {
  this.target = target;
  this.texture = gl.createTexture();
  this.params = { };
};

tdl.textures.Texture.prototype.setParameter = function(pname, value) {
  this.params[pname] = value;
  gl.bindTexture(this.target, this.texture);
  gl.texParameteri(this.target, pname, value);
};

tdl.textures.Texture.prototype.recoverFromLostContext = function() {
  this.texture = gl.createTexture();
  gl.bindTexture(this.target, this.texture);
  for (var pname in this.params) {
    gl.texParameteri(this.target, pname, this.params[pname]);
  }
};

/**
 * A solid color texture.
 * @constructor
 * @param {!tdl.math.vector4} color.
 */
tdl.textures.SolidTexture = function(color) {
  tdl.textures.Texture.call(this, gl.TEXTURE_2D);
  this.color = color.slice(0, 4);
  this.uploadTexture();
};

tdl.base.inherit(tdl.textures.SolidTexture, tdl.textures.Texture);

tdl.textures.SolidTexture.prototype.uploadTexture = function() {
  gl.bindTexture(gl.TEXTURE_2D, this.texture);
  var pixel = new Uint8Array(this.color);
  gl.texImage2D(
    gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
};

tdl.textures.SolidTexture.prototype.recoverFromLostContext = function() {
  tdl.textures.Texture.recoverFromLostContext.call(this);
  this.uploadTexture();
};

tdl.textures.SolidTexture.prototype.bindToUnit = function(unit) {
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, this.texture);
};

/**
 * A depth texture.
 * @constructor
 * @param {number} width
 * @param {number} height
 */
tdl.textures.DepthTexture = function(width, height) {
  if (!gl.tdl.depthTexture) {
    throw("depth textures not supported");
  }
  tdl.textures.Texture.call(this, gl.TEXTURE_2D);
  this.width = width;
  this.height = height;
  this.uploadTexture();
};

tdl.base.inherit(tdl.textures.DepthTexture, tdl.textures.Texture);

tdl.textures.DepthTexture.prototype.uploadTexture = function() {
  gl.bindTexture(gl.TEXTURE_2D, this.texture);
  gl.texImage2D(
    gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, this.width, this.height, 0,
    gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
  this.setParameter(gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  this.setParameter(gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  this.setParameter(gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  this.setParameter(gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
};

tdl.textures.DepthTexture.prototype.recoverFromLostContext = function() {
  tdl.textures.Texture.recoverFromLostContext.call(this);
  this.uploadTexture();
};

tdl.textures.DepthTexture.prototype.bindToUnit = function(unit) {
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, this.texture);
};

/**
 * A color from an array of values texture.
 * @constructor
 * @param {!{width: number, height: number: pixels:
 *        !Array.<number>} data.
 */
tdl.textures.ColorTexture = function(data, opt_format, opt_type) {
  tdl.textures.Texture.call(this, gl.TEXTURE_2D);
  this.format = opt_format || gl.RGBA;
  this.type   = opt_type || gl.UNSIGNED_BYTE;
  if (data.pixels instanceof Array) {
    data.pixels = new Uint8Array(data.pixels);
  }
  this.data   = data;
  this.uploadTexture();
};

tdl.base.inherit(tdl.textures.ColorTexture, tdl.textures.Texture);

tdl.textures.ColorTexture.prototype.uploadTexture = function() {
  gl.bindTexture(gl.TEXTURE_2D, this.texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.texImage2D(
    gl.TEXTURE_2D, 0, this.format, this.data.width, this.data.height,
    0, this.format, this.type, this.data.pixels);
};

tdl.textures.ColorTexture.prototype.recoverFromLostContext = function() {
  tdl.textures.Texture.recoverFromLostContext.call(this);
  this.uploadTexture();
};

tdl.textures.ColorTexture.prototype.bindToUnit = function(unit) {
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, this.texture);
};

/**
 * @constructor
 * @param {{string|!Element}} url URL of image to load into texture.
 * @param {function} opt_callback Function to execute when texture is loaded.
 */
tdl.textures.Texture2D = function(url, opt_flipY, opt_callback) {
  if (opt_callback) {
    alert('callback');
  }
  tdl.textures.Texture.call(this, gl.TEXTURE_2D);
  this.flipY = opt_flipY || false;
  var that = this;
  var img;
  // Handle dataURLs?
  if (typeof url !== 'string') {
    img = url;
    this.loaded = true;
    if (opt_callback) {
      opt_callback();
    }
  } else {
    img = document.createElement('img');
    tdl.textures.addLoadingImage_(img);
    img.onload = function() {
      tdl.textures.removeLoadingImage_(img);
      //tdl.log("loaded image: ", url);
      that.updateTexture();
      if (opt_callback) {
        opt_callback();
      }
    };
    img.onerror = function() {
      tdl.log("could not load image: ", url);
    };
  }
  this.img = img;
  this.uploadTexture();

  if (!this.loaded) {
    img.src = url;
  }
};

tdl.base.inherit(tdl.textures.Texture2D, tdl.textures.Texture);

tdl.textures.isPowerOf2 = function(value) {
  return (value & (value - 1)) == 0;
};

tdl.textures.Texture2D.prototype.uploadTexture = function() {
  gl.bindTexture(gl.TEXTURE_2D, this.texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  if (this.loaded) {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, this.flipY);
    this.setTexture(this.img);
  } else {
    var pixel = new Uint8Array([255, 255, 255, 255]);
    gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
  }
};

tdl.textures.Texture2D.prototype.setTexture = function(element) {
  // TODO(gman): use texSubImage2D if the size is the same.
  gl.bindTexture(gl.TEXTURE_2D, this.texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, element);
  if (tdl.textures.isPowerOf2(element.width) &&
      tdl.textures.isPowerOf2(element.height)) {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.generateMipmap(gl.TEXTURE_2D);
  } else {
    this.setParameter(gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    this.setParameter(gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.setParameter(gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  }
};

tdl.textures.Texture2D.prototype.updateTexture = function() {
  this.loaded = true;
  this.uploadTexture();
};

tdl.textures.Texture2D.prototype.recoverFromLostContext = function() {
  tdl.textures.Texture.recoverFromLostContext.call(this);
  this.uploadTexture();
};

tdl.textures.Texture2D.prototype.bindToUnit = function(unit) {
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, this.texture);
};

/**
 * Create a texture to be managed externally.
 * @constructor
 * @param {string} type GL enum for texture type.
 */
tdl.textures.ExternalTexture = function(type) {
  tdl.textures.Texture.call(this, type);
  this.type = type;
};

tdl.base.inherit(tdl.textures.ExternalTexture, tdl.textures.Texture);

tdl.textures.ExternalTexture.prototype.recoverFromLostContext = function() {
};

tdl.textures.ExternalTexture.prototype.bindToUnit = function(unit) {
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(this.type, this.texture);
}

/**
 * Create a 2D texture to be managed externally.
 * @constructor
 */
tdl.textures.ExternalTexture2D = function() {
  tdl.textures.ExternalTexture.call(this, gl.TEXTURE_2D);
};

tdl.base.inherit(tdl.textures.ExternalTexture2D, tdl.textures.ExternalTexture);

/**
 * Create and load a CubeMap.
 * @constructor
 * @param {!Array.<string>} urls The urls of the 6 faces, which
 *     must be in the order positive_x, negative_x positive_y,
 *     negative_y, positive_z, negative_z OR an array with a single url
 *     where the images are arranged as a cross in this order.
 *
 *     +--+--+--+--+
 *     |  |PY|  |  |
 *     +--+--+--+--+
 *     |NX|PZ|PX|NZ|
 *     +--+--+--+--+
 *     |  |NY|  |  |
 *     +--+--+--+--+
 */
tdl.textures.CubeMap = function(urls) {
  tdl.textures.init_(gl);
  tdl.textures.Texture.call(this, gl.TEXTURE_CUBE_MAP);
  // TODO(gman): make this global.
  if (!tdl.textures.CubeMap.faceTargets) {
    tdl.textures.CubeMap.faceTargets = [
      gl.TEXTURE_CUBE_MAP_POSITIVE_X,
      gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
      gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
      gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
      gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
      gl.TEXTURE_CUBE_MAP_NEGATIVE_Z];
    tdl.textures.CubeMap.offsets = [
      [2, 1],
      [0, 1],
      [1, 0],
      [1, 2],
      [1, 1],
      [3, 1]];
  }
  var faceTargets = tdl.textures.CubeMap.faceTargets;
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.texture);
  this.setParameter(gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  this.setParameter(gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  this.setParameter(gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  this.faces = [];
  if (!urls.length) {
    this.numUrls = 0;
    this.size = urls;
  } else {
    this.numUrls = urls.length;
    var that = this;
    for (var ff = 0; ff < urls.length; ++ff) {
      var face = { };
      this.faces[ff] = face;
      var img = document.createElement('img');
      tdl.textures.addLoadingImage_(img);
      face.img = img;
      img.onload = function(faceIndex) {
        return function() {
          tdl.textures.removeLoadingImage_(img);
          tdl.log("loaded image: ", urls[faceIndex]);
          that.updateTexture(faceIndex);
        }
      } (ff);
      img.onerror = function(url) {
        return function() {
          tdl.log("could not load image: ", url);
        }
      }(urls[ff]);
      img.src = urls[ff];
    }
  }
  this.uploadTextures();
};

tdl.base.inherit(tdl.textures.CubeMap, tdl.textures.Texture);

/**
 * Check if all faces are loaded.
 * @return {boolean} true if all faces are loaded.
 */
tdl.textures.CubeMap.prototype.loaded = function() {
  for (var ff = 0; ff < this.faces.length; ++ff) {
    if (!this.faces[ff].loaded) {
      return false;
    }
  }
  return true;
};

tdl.textures.clampToMaxSize = function(element, maxSize) {
  if (element.width <= maxSize && element.height <= maxSize) {
    return element;
  }
  var maxDimension = Math.max(element.width, element.height);
  var newWidth = Math.floor(element.width * maxSize / maxDimension);
  var newHeight = Math.floor(element.height * maxSize / maxDimension);

  var canvas = document.createElement('canvas');
  canvas.width = newWidth;
  canvas.height = newHeight;
  var ctx = canvas.getContext("2d");
  ctx.drawImage(
      element,
      0, 0, element.width, element.height,
      0, 0, newWidth, newHeight);
  return canvas;
};

/**
 * Uploads the images to the texture.
 */
tdl.textures.CubeMap.prototype.uploadTextures = function() {
  var allFacesLoaded = this.loaded();
  var faceTargets = tdl.textures.CubeMap.faceTargets;
  for (var faceIndex = 0; faceIndex < 6; ++faceIndex) {
    var uploaded = false;
    var target = faceTargets[faceIndex];
    if (this.faces.length) {
      var face = this.faces[Math.min(this.faces.length - 1, faceIndex)];
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.texture);
      if (allFacesLoaded) {
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        if (this.faces.length == 6) {
          gl.texImage2D(
              target, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE,
              tdl.textures.clampToMaxSize(
                  face.img, gl.tdl.textures.maxCubeMapSize));
        } else {
          var canvas = document.createElement('canvas');
          var width = face.img.width / 4;
          var height = face.img.height / 3;
          canvas.width = width;
          canvas.height = height;
          var ctx = canvas.getContext("2d");
          var sx = tdl.textures.CubeMap.offsets[faceIndex][0] * width;
          var sy = tdl.textures.CubeMap.offsets[faceIndex][1] * height;
          ctx.drawImage(face.img, sx, sy, width, height, 0, 0, width, height);
          gl.texImage2D(
              target, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE,
              tdl.textures.clampToMaxSize(
                  canvas, gl.tdl.textures.maxCubeMapSize));
        }
        uploaded = true;
      }
    }
    if (!uploaded) {
      var pixel = new Uint8Array([100,100,255,255]);
      gl.texImage2D(target, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    }
  }
  var genMips = false;
  if (this.faces.length) {
    var faceImg = this.faces[0].img;
    if (this.faces.length == 6) {
      genMips = tdl.textures.isPowerOf2(faceImg.width) &&
                tdl.textures.isPowerOf2(faceImg.height);
    } else {
      genMips = tdl.textures.isPowerOf2(faceImg.width / 4) &&
                tdl.textures.isPowerOf2(faceImg.height / 3);
    }
  }
  if (genMips) {
    gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
    this.setParameter(gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  } else {
    this.setParameter(gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  }
};

/**
 * Recover from lost context.
 */
tdl.textures.CubeMap.prototype.recoverFromLostContext = function() {
  tdl.textures.Texture.recoverFromLostContext.call(this);
  this.uploadTextures();
};

/**
 * Update a just downloaded loaded texture.
 * @param {number} faceIndex index of face.
 */
tdl.textures.CubeMap.prototype.updateTexture = function(faceIndex) {
  // mark the face as loaded
  var face = this.faces[faceIndex];
  face.loaded = true;
  // If all 6 faces are loaded then upload to GPU.
  var loaded = this.loaded();
  if (loaded) {
    this.uploadTextures();
  }
};

/**
 * Binds the CubeMap to a texture unit
 * @param {number} unit The texture unit.
 */
tdl.textures.CubeMap.prototype.bindToUnit = function(unit) {
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.texture);
};



/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview This file contains objects to deal with basic webgl stuff.
 */
//tdl.provide('tdl.webgl');

//tdl.require('tdl.log');
//tdl.require('tdl.misc');

/**
 * A module for log.
 * @namespace
 */
tdl.webgl = tdl.webgl || {};

/**
 * The current GL context
 * @type {WebGLRenderingContext}
 */
gl = null;

tdl.webgl.makeCurrent = function(context) {
  gl = context;
}

/**
 * Creates the HTLM for a failure message
 * @param {string} canvasContainerId id of container of th
 *        canvas.
 * @return {string} The html.
 */
tdl.webgl.makeFailHTML = function(msg) {
  return '' +
    '<table style="background-color: #8CE; width: 100%; height: 100%;"><tr>' +
    '<td align="center">' +
    '<div style="display: table-cell; vertical-align: middle;">' +
    '<div style="">' + msg + '</div>' +
    '</div>' +
    '</td></tr></table>';
};

/**
 * Mesasge for getting a webgl browser
 * @type {string}
 */
tdl.webgl.GET_A_WEBGL_BROWSER = '' +
  'This page requires a browser that supports WebGL.<br/>' +
  '<a href="http://get.webgl.org">Click here to upgrade your browser.</a>';

/**
 * Mesasge for need better hardware
 * @type {string}
 */
tdl.webgl.OTHER_PROBLEM = '' +
  "It does not appear your computer supports WebGL.<br/>" +
  '<a href="http://get.webgl.org/troubleshooting/">Click here for more information.</a>';

/**
 * Creates a webgl context.
 * @param {Element} canvas. The canvas element to create a
 *     context from.
 * @param {WebGLContextCreationAttirbutes} opt_attribs Any
 *     creation attributes you want to pass in.
 * @param {function:(msg)} opt_onError An function to call
 *     if there is an error during creation.
 * @return {!WebGLRenderingContext} The created context.
 */
tdl.webgl.setupWebGL = function(canvas, opt_attribs, opt_onError) {
  function handleCreationError(msg) {
    var container = canvas.parentNode;
    if (container) {
      var str = window.WebGLRenderingContext ?
           tdl.webgl.OTHER_PROBLEM :
           tdl.webgl.GET_A_WEBGL_BROWSER;
      if (msg) {
        str += "<br/><br/>Status: " + msg;
      }
      container.innerHTML = tdl.webgl.makeFailHTML(str);
    }
  };

  opt_onError = opt_onError || handleCreationError;

  if (canvas.addEventListener) {
    canvas.addEventListener("webglcontextcreationerror", function(event) {
          opt_onError(event.statusMessage);
        }, false);
  }
  var context = tdl.webgl.create3DContext(canvas, opt_attribs);
  if (context) {
    if (canvas.addEventListener) {
      canvas.addEventListener("webglcontextlost", function(event) {
        //tdl.log("call tdl.webgl.handleContextLost");
        event.preventDefault();
        tdl.webgl.handleContextLost(canvas);
      }, false);
      canvas.addEventListener("webglcontextrestored", function(event) {
        //tdl.log("call tdl.webgl.handleContextRestored");
        tdl.webgl.handleContextRestored(canvas);
      }, false);
    }
  } else {
    if (!window.WebGLRenderingContext) {
      opt_onError("");
    }
  }
  return context;
};

/**
 * Creates a webgl context.
 * @param {!Canvas} canvas The canvas tag to get context
 *     from. If one is not passed in one will be created.
 * @return {!WebGLRenderingContext} The created context.
 */
tdl.webgl.create3DContext = function(canvas, opt_attribs) {
  if (opt_attribs === undefined) {
    opt_attribs = {alpha:false};
    tdl.misc.applyUrlSettings(opt_attribs, 'webgl');
  }
  var names = ["webgl", "experimental-webgl"];
  var context = null;
  for (var ii = 0; ii < names.length; ++ii) {
    try {
      context = canvas.getContext(names[ii], opt_attribs);
    } catch(e) {}
    if (context) {
      break;
    }
  }
  if (context) {
    if (!tdl.webgl.glEnums) {
      tdl.webgl.init(context);
    }
    tdl.webgl.makeCurrent(context);
    tdl.webgl.setupCanvas_(canvas);
    context.tdl = {};
    context.tdl.depthTexture = tdl.webgl.getExtensionWithKnownPrefixes("WEBGL_depth_texture");

    // Disallow selection by default. This keeps the cursor from changing to an
    // I-beam when the user clicks and drags.  It's easier on the eyes.
    function returnFalse() {
      return false;
    }

    canvas.onselectstart = returnFalse;
    canvas.onmousedown = returnFalse;
  }
  return context;
};

tdl.webgl.setupCanvas_ = function(canvas) {
  if (!canvas.tdl) {
    canvas.tdl = {};
  }
};

/**
 * Browser prefixes for extensions.
 * @type {!Array.<string>}
 */
tdl.webgl.browserPrefixes_ = [
  "",
  "MOZ_",
  "OP_",
  "WEBKIT_"
];

/**
 * Given an extension name like WEBGL_compressed_texture_s3tc
 * returns the supported version extension, like
 * WEBKIT_WEBGL_compressed_teture_s3tc
 * @param {string} name Name of extension to look for
 * @return {WebGLExtension} The extension or undefined if not
 *     found.
 */
tdl.webgl.getExtensionWithKnownPrefixes = function(name) {
  for (var ii = 0; ii < tdl.webgl.browserPrefixes_.length; ++ii) {
    var prefixedName = tdl.webgl.browserPrefixes_[ii] + name;
    var ext = gl.getExtension(prefixedName);
    if (ext) {
      return ext;
    }
  }
};

tdl.webgl.runHandlers_ = function(handlers) {
  //tdl.log("run handlers: " + handlers.length);
  var handlersCopy = handlers.slice();
  for (var ii = 0; ii < handlersCopy.length; ++ii) {
    //tdl.log("run: " + ii);
    handlersCopy[ii]();
  }
};

tdl.webgl.registerContextLostHandler = function(
    canvas, handler, opt_sysHandler) { 
  tdl.webgl.setupCanvas_(canvas);
  if (!canvas.tdl.contextLostHandlers) {
    canvas.tdl.contextLostHandlers = [[],[]];
  }
  var a = canvas.tdl.contextLostHandlers[opt_sysHandler ? 0 : 1];
  a.push(handler);
};

tdl.webgl.registerContextRestoredHandler = function(
    canvas, handler, opt_sysHandler) {
  tdl.webgl.setupCanvas_(canvas);
  if (!canvas.tdl.contextRestoredHandlers) {
    canvas.tdl.contextRestoredHandlers = [[],[]];
  }
  var a = canvas.tdl.contextRestoredHandlers[opt_sysHandler ? 0 : 1];
  a.push(handler);
};

tdl.webgl.handleContextLost = function(canvas) {
  // first run tdl's handlers then the user's
  //tdl.log("tdl.webgl.handleContextLost");
  if (canvas.tdl.contextLostHandlers) {
    tdl.webgl.runHandlers_(canvas.tdl.contextLostHandlers[0]);
    tdl.webgl.runHandlers_(canvas.tdl.contextLostHandlers[1]);
  }
};

tdl.webgl.handleContextRestored = function(canvas) {
  // first run tdl's handlers then the user's
  //tdl.log("tdl.webgl.handleContextRestored");
  if (canvas.tdl.contextRestoredHandlers) {
    tdl.webgl.runHandlers_(canvas.tdl.contextRestoredHandlers[0]);
    tdl.webgl.runHandlers_(canvas.tdl.contextRestoredHandlers[1]);
  }
};

/**
 * Which arguements are enums.
 * @type {!Object.<number, string>}
 */
tdl.webgl.glValidEnumContexts = {

  // Generic setters and getters

  'enable': { 0:true },
  'disable': { 0:true },
  'getParameter': { 0:true },

  // Rendering

  'drawArrays': { 0:true },
  'drawElements': { 0:true, 2:true },

  // Shaders

  'createShader': { 0:true },
  'getShaderParameter': { 1:true },
  'getProgramParameter': { 1:true },

  // Vertex attributes

  'getVertexAttrib': { 1:true },
  'vertexAttribPointer': { 2:true },

  // Textures

  'bindTexture': { 0:true },
  'activeTexture': { 0:true },
  'getTexParameter': { 0:true, 1:true },
  'texParameterf': { 0:true, 1:true },
  'texParameteri': { 0:true, 1:true, 2:true },
  'texImage2D': { 0:true, 2:true, 6:true, 7:true },
  'texSubImage2D': { 0:true, 6:true, 7:true },
  'copyTexImage2D': { 0:true, 2:true },
  'copyTexSubImage2D': { 0:true },
  'generateMipmap': { 0:true },

  // Buffer objects

  'bindBuffer': { 0:true },
  'bufferData': { 0:true, 2:true },
  'bufferSubData': { 0:true },
  'getBufferParameter': { 0:true, 1:true },

  // Renderbuffers and framebuffers

  'pixelStorei': { 0:true, 1:true },
  'readPixels': { 4:true, 5:true },
  'bindRenderbuffer': { 0:true },
  'bindFramebuffer': { 0:true },
  'checkFramebufferStatus': { 0:true },
  'framebufferRenderbuffer': { 0:true, 1:true, 2:true },
  'framebufferTexture2D': { 0:true, 1:true, 2:true },
  'getFramebufferAttachmentParameter': { 0:true, 1:true, 2:true },
  'getRenderbufferParameter': { 0:true, 1:true },
  'renderbufferStorage': { 0:true, 1:true },

  // Frame buffer operations (clear, blend, depth test, stencil)

  'clear': { 0:true },
  'depthFunc': { 0:true },
  'blendFunc': { 0:true, 1:true },
  'blendFuncSeparate': { 0:true, 1:true, 2:true, 3:true },
  'blendEquation': { 0:true },
  'blendEquationSeparate': { 0:true, 1:true },
  'stencilFunc': { 0:true },
  'stencilFuncSeparate': { 0:true, 1:true },
  'stencilMaskSeparate': { 0:true },
  'stencilOp': { 0:true, 1:true, 2:true },
  'stencilOpSeparate': { 0:true, 1:true, 2:true, 3:true },

  // Culling

  'cullFace': { 0:true },
  'frontFace': { 0:true }
};

/**
 * Map of numbers to names.
 * @type {Object}
 */
tdl.webgl.glEnums = null;

/**
 * Initializes this module. Safe to call more than once.
 * @param {!WebGLRenderingContext} ctx A WebGL context. If
 *    you have more than one context it doesn't matter which one
 *    you pass in, it is only used to pull out constants.
 */
tdl.webgl.init = function(ctx) {
  if (tdl.webgl.glEnums == null) {
    tdl.webgl.glEnums = { };
    for (var propertyName in ctx) {
      if (typeof ctx[propertyName] == 'number') {
        tdl.webgl.glEnums[ctx[propertyName]] = propertyName;
      }
    }
  }
};

/**
 * Checks the utils have been initialized.
 */
tdl.webgl.checkInit = function() {
  if (tdl.webgl.glEnums == null) {
    throw 'tdl.webgl.init(ctx) not called';
  }
};

/**
 * Returns true or false if value matches any WebGL enum
 * @param {*} value Value to check if it might be an enum.
 * @return {boolean} True if value matches one of the WebGL defined enums
 */
tdl.webgl.mightBeEnum = function(value) {
  tdl.webgl.checkInit();
  return (tdl.webgl.glEnums[value] !== undefined);
}

/**
 * Gets an string version of an WebGL enum.
 *
 * Example:
 *   var str = WebGLDebugUtil.glEnumToString(ctx.getError());
 *
 * @param {number} value Value to return an enum for
 * @return {string} The string version of the enum.
 */
tdl.webgl.glEnumToString = function(value) {
  tdl.webgl.checkInit();
  if (value === undefined) {
    return "undefined";
  }
  var name = tdl.webgl.glEnums[value];
  return (name !== undefined) ? name :
      ("*UNKNOWN WebGL ENUM (0x" + value.toString(16) + ")");
};

/**
 * Returns the string version of a WebGL argument.
 * Attempts to convert enum arguments to strings.
 * @param {string} functionName the name of the WebGL function.
 * @param {number} argumentIndx the index of the argument.
 * @param {*} value The value of the argument.
 * @return {string} The value as a string.
 */
tdl.webgl.glFunctionArgToString = function(functionName, argumentIndex, value) {
  var funcInfo = tdl.webgl.glValidEnumContexts[functionName];
  if (funcInfo !== undefined) {
    if (funcInfo[argumentIndex]) {
      return tdl.webgl.glEnumToString(value);
    }
  }
  if (value === null) {
    return "null";
  } else if (value === undefined) {
    return "undefined";
  } else {
    return value.toString();
  }
};

/**
 * Converts the arguments of a WebGL function to a string.
 * Attempts to convert enum arguments to strings.
 *
 * @param {string} functionName the name of the WebGL function.
 * @param {number} args The arguments.
 * @return {string} The arguments as a string.
 */
tdl.webgl.glFunctionArgsToString = function(functionName, args) {
  // apparently we can't do args.join(",");
  var argStr = "";
  for (var ii = 0; ii < args.length; ++ii) {
    argStr += ((ii == 0) ? '' : ', ') +
        tdl.webgl.glFunctionArgToString(functionName, ii, args[ii]);
  }
  return argStr;
};

/**
 * Given a WebGL context returns a wrapped context that calls
 * gl.getError after every command and calls a function if the
 * result is not gl.NO_ERROR.
 *
 * @param {!WebGLRenderingContext} ctx The webgl context to
 *        wrap.
 * @param {!function(err, funcName, args): void} opt_onErrorFunc
 *        The function to call when gl.getError returns an
 *        error. If not specified the default function calls
 *        console.log with a message.
 * @param {!function(funcName, args): void} opt_onFunc The
 *        function to call when each webgl function is called.
 *        You can use this to log all calls for example.
 */
tdl.webgl.makeDebugContext = function(ctx, opt_onErrorFunc, opt_onFunc) {
  tdl.webgl.init(ctx);
  opt_onErrorFunc = opt_onErrorFunc || function(err, functionName, args) {
        tdl.error(
          "WebGL error "+ tdl.webgl.glEnumToString(err) + " in " +
          functionName + "(" + tdl.webgl.glFunctionArgsToString(
              functionName, args) + ")");
      };

  // Holds booleans for each GL error so after we get the error ourselves
  // we can still return it to the client app.
  var glErrorShadow = { };

  // Makes a function that calls a WebGL function and then calls getError.
  function makeErrorWrapper(ctx, functionName) {
    return function() {
      if (opt_onFunc) {
        opt_onFunc(functionName, arguments);
      }
      try {
        var result = ctx[functionName].apply(ctx, arguments);
      } catch (e) {
        opt_onErrorFunc(ctx.NO_ERROR, functionName, arguments);
        throw(e);
      }
      var err = ctx.getError();
      if (err != 0) {
        glErrorShadow[err] = true;
        opt_onErrorFunc(err, functionName, arguments);
      }
      return result;
    };
  }

  function makePropertyWrapper(wrapper, original, propertyName) {
    wrapper.__defineGetter__(propertyName, function() {
      return original[propertyName];
    });
    // TODO(gmane): this needs to handle properties that take more than
    // one value?
    wrapper.__defineSetter__(propertyName, function(value) {
      original[propertyName] = value;
    });
  }

  // Make a an object that has a copy of every property of the WebGL context
  // but wraps all functions.
  var wrapper = {};
  for (var propertyName in ctx) {
    if (typeof ctx[propertyName] == 'function') {
       wrapper[propertyName] = makeErrorWrapper(ctx, propertyName);
     } else {
       makePropertyWrapper(wrapper, ctx, propertyName);
     }
  }

  // Override the getError function with one that returns our saved results.
  wrapper.getError = function() {
    for (var err in glErrorShadow) {
      if (glErrorShadow[err]) {
        glErrorShadow[err] = false;
        return err;
      }
    }
    return ctx.NO_ERROR;
  };

  return wrapper;
};

/**
 * Provides requestAnimationFrame in a cross browser way.
 * @param {function(RequestAnimationEvent): void} callback. Callback that will
 *        be called when a frame is ready.
 * @param {!Element} element Element to request an animation frame for.
 * @return {number} request id.
 */
tdl.webgl.requestAnimationFrame = function(callback, element) {
  if (!tdl.webgl.requestAnimationFrameImpl_) {
    tdl.webgl.requestAnimationFrameImpl_ = function() {
      var functionNames = [
        "requestAnimationFrame",
        "webkitRequestAnimationFrame",
        "mozRequestAnimationFrame",
        "oRequestAnimationFrame",
        "msRequestAnimationFrame"
      ];
      for (var jj = 0; jj < functionNames.length; ++jj) {
        var functionName = functionNames[jj];
        if (window[functionName]) {
          tdl.log("using ", functionName);
          return function(name) {
            return function(callback, element) {
              return window[name].call(window, callback, element);
            };
          }(functionName);
        }
      }
      tdl.log("using window.setTimeout");
      return function(callback, element) {
           return window.setTimeout(callback, 1000 / 70);
        };
    }();
  }

  return tdl.webgl.requestAnimationFrameImpl_(callback, element);
};


/**
 * Provides cancelRequestAnimationFrame in a cross browser way.
 * @param {number} requestId.
 */
tdl.webgl.cancelRequestAnimationFrame = function(requestId) {
  if (!tdl.webgl.cancelRequestAnimationFrameImpl_) {
    tdl.webgl.cancelRequestAnimationFrameImpl_ = function() {
      var functionNames = [
        "cancelRequestAnimationFrame",
        "webkitCancelRequestAnimationFrame",
        "mozCancelRequestAnimationFrame",
        "oCancelRequestAnimationFrame",
        "msCancelRequestAnimationFrame"
      ];
      for (var jj = 0; jj < functionNames.length; ++jj) {
        var functionName = functionNames[jj];
        if (window[functionName]) {
          return function(name) {
            return function(requestId) {
              window[name].call(window, requestId);
            };
          }(functionName);
        }
      }
      return function(requestId) {
           window.clearTimeout(requestId);
        };
    }();
  }

  tdl.webgl.cancelRequestAnimationFrameImpl_(requestId);
};

return tdl;

});