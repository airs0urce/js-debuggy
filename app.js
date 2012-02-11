var http = require('http')
    , fs = require('fs')
    , ejs = require('ejs')
    , request = require('request')
    , os = require('os')
    , clc = require('cli-color')
    , app = http.createServer(handler)
    , io = require('socket.io').listen(app)
    , config = require('./inc/config');    

app.listen(config.port, '0.0.0.0', function() {   
    console.log(clc.yellow('---------------------------------------------------------------'));
    console.log(clc.yellow('Include script on page (select right IP)'));
    console.log(clc.yellow('---------------------------------------------------------------'));
    var interfaces = os.networkInterfaces();
    for (var inter in interfaces) {
        var addresses = interfaces[inter];
        for (var i = 0; i < addresses.length; i++) {
            if ('IPv4' == addresses[i].family) {
                var script = 'http://' + clc.yellow(addresses[i].address) + ':' + config.port + '/pub/remote_client.js';
                
                console.log('<script src="' + script + '"></script>');
            }
        }
    }
    console.log(clc.yellow('---------------------------------------------------------------'));
    console.log(clc.yellow('Open console in your browser'));
    console.log(clc.yellow('---------------------------------------------------------------'));
    console.log('http://127.0.0.1:' + config.port);
});

function handler (req, res) {
    var file = req.url;
    if ('/' == file) {
        file = '/pub/browser_console.html';
    }
    file = __dirname + file;
    
    try {
        if (file.match(/browser_console.html$/)) {
            var variables = {
                port: config.port,
                hostname: os.hostname()
            }
            var body = ejs.render(fs.readFileSync(file, 'utf8'), variables);
            response(res, 200, body);
            
        } else if (file.match(/remote_client.js$/)) {
            request('http://127.0.0.1:' + config.port + '/socket.io/socket.io.js', function(err, resp, body) {
                var variables = {
                    socketio: body,
                    remote_console: fs.readFileSync(file, 'utf8'),
                    port: config.port
                };
                var body = ejs.render(fs.readFileSync(file, 'utf8'), variables);
                response(res, 200, body);
            });
        } else {
            // static
            response(res, 200, fs.readFileSync(file));
        } 
    } catch (e) {
        response(res, 404, '[Page not found] ' + e);
    }
}

function response(res, code, body) {
    res.writeHead(code)
    res.end(body);
}

io.set('log level', 0);
io.set('log', false);
io.set('transports', ['websocket', 'flashsocket', 'htmlfile', 'xhr-polling',  'jsonp-polling']);

var browser_console = io.of('/browser_console').on('connection', function (socket) {
    socket.on('execute_js', function (data) {
        remote_client.emit('execute_js', {command: data.command});  
    });
});
    
var remote_client = io.of('/remote_client').on('connection', function (socket) {
    socket.on('execute_js_result', function (data) {
        var type = '';
        if (typeof data.type != 'undefined') {
            type = data.type;
        }
        browser_console.emit('execute_js_result', {result: data.result, type: type});
    });
    socket.on('write', function (data) {
        browser_console.emit('write', {data: data.data});
    });
});

process.on("uncaughtException", function (err) {
    console.error(">>> uncaught exception: " + err);
    if (typeof err.stack != 'undefined') {
        console.error(err.stack);
    } else {
       console.error('[no stack trace]');
    }
});
