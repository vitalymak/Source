/*
* Source - Front-end documentation engine
* @copyright 2013 Sourcejs.com
* @license MIT license: http://github.com/sourcejs/source/wiki/MIT-License
* */

/* Module dependencies */
var express = require('express')
    , colors = require('colors')
    , fs = require('fs')
    , ejs = require('ejs')
    , deepExtend = require('deep-extend')
    , commander = require('commander')
    , headerFooter = require('./core/headerFooter');

/* Globals */
global.app = express();
global.opts = require('./core/options/');

global.app.set('views', __dirname + '/core/views');
global.app.set('specs path', __dirname + '/' + global.opts.common.pathToSpecs);

global.MODE = process.env.NODE_ENV || 'development';
/* /Globals */


/* Args */
commander
  .option('-p, --port [number]', 'Server port (default: '+global.opts.common.port+')', global.opts.common.port)
  .parse(process.argv);
/* Args */


/* Optimization */
global.app.use(express.compress());
/* /Optimization */

/* Cookies */
global.app.use(express.cookieParser());

app.use(function (req, res, next) {
    res.cookie('source-mode', global.MODE, { maxAge: 3600000, httpOnly: false });

    // keep executing the router middleware
    next();
});
/* /Cookies */

/* LESS processing */
if (global.MODE === 'development') {
    var less = require('less-middleware');

    var lessOpts = {
        src: global.app.get('specs path')
    };

    deepExtend(lessOpts, global.opts.less);

    global.app.use(less(lessOpts));
}
/* /LESS processing */


/*  Clarify module */
var clarify = require('./core/clarify');
global.app.use(clarify);
global.app.use(express.static(__dirname + '/core/clarify')); // static for module css
/*  /Clarify module */

/*  File tree module */
fileTree = require('./core/file-tree');
global.app.use(function(req, res, next){
    if(req.url === "/") {
        fileTree.scan();
    }
    next();
});
/*  /File tree module */

global.app.use(function (req, res, next) {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});

/* API module */
var api = require('./core/api');
global.app.use(api);
/* /API module */

/* Error handling */
global.app.use(logErrors);
global.app.use(clientErrorHandler);
global.app.use(errorHandler);
/* /Error handling */


/* Includes */
try {
    /* Routes */
    global.routes = require('./core/routes');

    /* User plugins */
    global.plugins = require("./user/plugins");

    /* User additional functionality */
    global.extApp = require("./user/app.js");
} catch(e) {
    console.log(e);
    process.exit(e.code);
}
/* /Includes */

/* Serve static content */
global.app.use(express.static(global.app.get('specs path')));

global.app.use(function(req, res, next){

	var path = req.url.replace('/index.html', '');

	if (req.accepts('html')) {

        var headerFooterHTML = headerFooter.getHeaderAndFooter();
		res.status(404).render(__dirname + '/core/views/404.ejs', {
			section: path,
            header: headerFooterHTML.header,
            footer: headerFooterHTML.footer
		});

		return;
	}

});

if (!module.parent) {
    var port = global.opts.common.port;
    if (commander.port) {
      port = parseInt(commander.port);
    }

    global.app.listen(port);

    var portString = global.opts.common.port.toString();

    var d = new Date(),
        dateArr = [d.getHours(), d.getMinutes(), d.getSeconds()],
        dateArr = dateArr.map(function (el) { return (el > 9)? el : '0'+ el; }),
        dateString = dateArr.join(':').red;

    console.log(dateString + ' [SOURCE] lauched on '.blue + portString.red + ' port in '.blue + MODE.blue + ' mode...'.blue);
}

function logErrors(err, req, res, next) {
    console.error(("Error: " + err.stack).red);
    next(err);
}

function clientErrorHandler(err, req, res, next) {
    if (req.xhr) {
        res.send(500, { error: 'Something blew up!' });
    } else {
        next(err);
    }
}

function errorHandler(err, req, res, next) {
    res.status(500);
    res.render('error', { error: err });
}
