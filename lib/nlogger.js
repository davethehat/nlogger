'use strict';

/*
	nlogger library (formerly node-logger)
	http://github.com/igo/nlogger

	Copyright (c) 2010 by Igor Urmincek

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in
	all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	THE SOFTWARE.
*/

function getLine() {
	try {
		throw new Error();
	} catch(e) {
		// now magic will happen: get line number from callstack
    var stack = e.stack.split('\n');
		var line = stack[4].split(':')[1];
		return {stack: stack.slice(4), line: line};
	}
}

function getClass(module) {
	if (module) {
		if (module.id) {
			if (module.id == '.') {
				return 'main';
			} else {
				return module.id;
			}
		} else {
			return module;
		}
	} else {
		return '<unknown>';
	}
}

function _format(s, args) {
  var reg = /%(.)/g;
  var index = 0;
  return s.replace(reg,function(str, match, offset, whole) {
    var ret;
    var arg = args[index++];
    if (arg === undefined) {
      arg = "(undefined)";
    }
    switch(match) {
      case 's' :
      case 'd' :
        ret = arg.toString(); break;
      case 'j' : ret = JSON.stringify(arg); break;
      default  : ret = match;
    }
    return ret;
  });
}

function getMessage(msg, params) {
	if (typeof msg == 'string') {
    return _format(msg, params);
	} else {
		return JSON.stringify(msg);
	}
}

var DEFAULT_LEVEL = "error";
var DEFAULT_LEVEL_LABEL = "*";
var config = {
  level : {}
}
config.level[DEFAULT_LEVEL_LABEL] = DEFAULT_LEVEL;

var listeners = {}

exports.configure = function(options) {
  options = options || {};
  config.level = options.level || {};
  config.level[DEFAULT_LEVEL_LABEL] = config.level[DEFAULT_LEVEL_LABEL] || DEFAULT_LEVEL;
}

exports.setLevel = function(module, level) {
 config.level[getClass(module)] = level;
}

exports.addListener = function(listener, level) {
  listeners[listener.name] = {listener: listener, level: level || 'trace'};
}

exports.removeListener = function(listener) {
  delete listeners[listener.name];
}

var methods = {
  'trace': { 'priority': 1 },
  'debug': { 'priority': 2 },
  'info':  { 'priority': 3 },
  'warn':  { 'priority': 4 },
  'error': { 'priority': 5 },
  'fatal': { 'priority': 6 }
};


function Logger(name) {
  this.name = name;
}

Logger.prototype = {
  _log : function(callPriority, level, msg, args) {
    var levelStr = level.toUpperCase();
    var logLevel = config.level[this.name] || config.level[DEFAULT_LEVEL_LABEL] || DEFAULT_LEVEL;
    var priority = methods[logLevel].priority;
    if (callPriority >= priority) {
      var params = Array.prototype.slice.call(args, 1);
      var now = new Date();
      for (var logListener in listeners) {
        var listenerPriority = methods[listeners[logListener].level].priority;
        if (callPriority >= listenerPriority) {
          var stack = getLine();
          listeners[logListener].listener.log(now, levelStr, this.name, stack.line, getMessage(msg, params), callPriority >= 5 ? stack.stack : false );
        }
      }
    }
  }
}

function defineLoggerMethod(level) {
  Logger.prototype[level] = function(msg) {
    var callPriority = methods[level].priority;
    this._log(callPriority, level, msg, arguments);
  };
}

for (var level in methods) {
  defineLoggerMethod(level);
}

exports.logger = function(module, level) {
  var name = getClass(module);
  if (level) {
    config.level[name] = level;
  }
  return new Logger(name);
}

exports.config = config;
