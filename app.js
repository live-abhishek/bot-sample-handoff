// This loads the environment variables from the .env file
require('dotenv-extended').load();

var logger = require('./log4js').logger;
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');

// Web app
var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(express.static(path.join(__dirname, 'public')));

// Register your web app routes here
app.get('/', function (req, res, next) {
    res.render('index', { title: 'Hashblu Dev Bot' });
});

// Register Bot
var bot = require('./bot');
app.post('/api/messages', bot.listen());

// Catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// Error handlers

// Development error handler, will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// Production error handler, no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

// Start listening
var port = process.env.port || process.env.PORT || 3978;
app.listen(port, function () {
    logger.debug('Web Server listening on port %s', port);
});

var stdin = process.openStdin();

// stdin.addListener("data", function(d) {
//     // note:  d is an object, and when converted to a string it will
//     // end with a linefeed.  so we (rather crudely) account for that  
//     // with toString() and then trim() 

//     console.log("you entered: [" + d.toString().trim() + "]");
// });