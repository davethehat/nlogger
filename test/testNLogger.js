'use strict';

var NLOGGER = require('lib/nlogger');
var mocket = require('mocket');

var levels = ['trace','debug','info','warn','error','fatal'];

var mockCount = 0;
function createMockLogListener(mockContext) {
  return mockContext.createMock("mockLogListener" + mockCount++);
}

function withConfig(config) {
  var mockContext = new mocket.Mocket();
  var listener = createMockLogListener(mockContext);
  return {
    call : function(fn) {
      try {
        if (config) {
          NLOGGER.configure(config);
        }
        NLOGGER.addListener(listener);
        fn(mockContext, listener);
        mockContext.assertMocks();
      }
      finally {
        NLOGGER.removeListener(listener);
      }
    }
  }
}

function logLevelTestFunction(name, level) {
  return function() {
    var config = level == 'DEFAULT' ? false : {level: {'*' : level}};

    withConfig(config).call(function(mockContext, mockLogListener) {
      level = config ? level : "error";

      var found = false;
      levels.forEach(function(lev) {
        if (found || lev == level) {
          found = true;
          mockLogListener.expects("log").passing(mockContext.ANYTHING, lev.toUpperCase(), name, mockContext.any('string'), lev + " message");
        }
      });
      var logger = NLOGGER.logger(name);
      levels.forEach(function(lev) {
        logger[lev](lev + " message");
      });
    });
  }
}

module.exports = {
  testDefault      : logLevelTestFunction("testDefault",      "DEFAULT"),
  testTraceDefault : logLevelTestFunction("testTraceDefault", "trace"),
  testDebugDefault : logLevelTestFunction("testDebugDefault", "debug"),
  testInfoDefault  : logLevelTestFunction("testInfoDefault",  "info"),
  testWarnDefault  : logLevelTestFunction("testWarnDefault",  "warn"),
  testErrorDefault : logLevelTestFunction("testErrorDefault", "error"),
  testFatalDefault : logLevelTestFunction("testFatalDefault", "fatal"),

  testDifferentLoggersWithDifferentLevelsGetDifferentMessages : function() {
    var config = {
      level : {
        "logger1" : "info",
        "logger2" : "error"
      }
    };
    withConfig(config).call(function(mockContext, mockLogListener) {
      mockLogListener.expects("log").passing(mockContext.ANYTHING, "INFO",  "logger1", mockContext.any('string'), "info message from logger 1");
      mockLogListener.expects("log").passing(mockContext.ANYTHING, "ERROR", "logger1", mockContext.any('string'), "error message from logger 1");
      mockLogListener.expects("log").passing(mockContext.ANYTHING, "ERROR", "logger2", mockContext.any('string'), "error message from logger 2");

      var logger1 = NLOGGER.logger("logger1");
      var logger2 = NLOGGER.logger("logger2");

      logger1.info("info message from logger 1");
      logger2.info("info message from logger 2");
      logger1.error("error message from logger 1");
      logger2.error("error message from logger 2");
    });
  },

  testDynamicallyUpdateLogLevelForModule : function() {
    var config = {
      level : {
        "logger1" : "error"
      }
    };
    withConfig(config).call(function(mockContext, mockLogListener) {
      var logger = NLOGGER.logger("logger1");
      logger.info("info message from logger 1");
      mockContext.assertMocks();

      NLOGGER.setLevel("logger1", "info");
      mockLogListener.expects("log").passing(mockContext.ANYTHING, "INFO",  "logger1", mockContext.any('string'), "info message from logger 1");
      logger.info("info message from logger 1");
    });
  },

  testDifferentListenersWithDifferentLevels : function() {
    withConfig({level : {'*' : 'trace'}}).call(function(mockContext, mockLogListener) {
      NLOGGER.removeListener(mockLogListener);

      var listener1 = createMockLogListener(mockContext);
      var listener2 = createMockLogListener(mockContext);
      listener1.expects("log").passing(mockContext.ANYTHING, "ERROR", "logger1", mockContext.any('string'), "error message");
      listener2.expects("log").passing(mockContext.ANYTHING, "ERROR", "logger1", mockContext.any('string'), "error message");
      listener2.expects("log").passing(mockContext.ANYTHING, "INFO",  "logger1", mockContext.any('string'), "info message");
      NLOGGER.addListener(listener1, 'error');
      NLOGGER.addListener(listener2, 'info');

      var logger = NLOGGER.logger("logger1");

      logger.error("error message");
      logger.info("info message");
    });
  }
}