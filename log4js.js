var log4js = require('log4js');
log4js.configure({
  appenders: { 
      fileappender: { type: 'dateFile', filename: 'hbdevbot.log', pattern: "-yyyy-MM-dd", alwaysIncludePattern: true},
      consoleappender: {type: 'console'}
    },
  categories: { default: { appenders: ['fileappender', 'consoleappender'], level: 'debug' } }
});

var logger = log4js.getLogger('hbdevbot');
module.exports = {
    logger: logger
}