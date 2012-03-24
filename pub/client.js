//
//  socket.io connection
//
<%- socketioContent %>
var socket = io.connect('http://<%- host %>/client');
socket.on('execute_js', function(data) {
    try {
        var result = eval(data.command);
        socket.emit('execute_js_result', {result: JSON.stringify(result)});
    } catch(e) {
        socket.emit('execute_js_result', {result: e.toString(), type: 'error'});
    }
});


var consoleOrig = console;

//
//  Rewrite original console object. 
//  I do it many times to make it work with PhoneGap.
//
var defineAttempts = 0;
defineConsole();
var defineInterval = setInterval(function() {
   defineConsole();
   if (defineAttempts++ > 40) {
       clearInterval(defineInterval);
   }
}, 100);

function defineConsole() {
    // define our own console
    console = {
        _output: function(data) {
            socket.emit('write', {data: JSON.stringify(data)});
        },
        log: function(data) {
            console._output(data);
        },
        /*
        debug: function() {
            console._output();
        },
        info: function() {
            console._output();
        },
        warn: function() {
            console._output();
        },
        error: function() {
            console._output();
        },
        */
        time: function(name) {
            console._timersStart[name] = (new Date).getTime();
        },
        timeEnd: function(name) {
            console.info(name +': '+ ((new Date).getTime() - console._timersStart[name]) +'ms');
            delete console._timersStart[name];
        },
        group: function(name) {
            console._output('\n-------- '+ name +' --------');
        },
        groupEnd: function(name) {
            console._output('\n\n\n');
        }
    }; 
}