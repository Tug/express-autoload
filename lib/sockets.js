
var debugio = require('debug')('socket.io');
var chainActions = require("./routes").chainActions;

exports.autoload = function(app, model, config) {

    var io = require('socket.io').listen(app.server);
    
    io.configure(function () {
        (config.socketio.enable || []).forEach(function(prop) { io.enable(prop); });
        config.socketio.set = config.socketio.set || {};
        switch(config.socketio.store) {
        case "redis":
            var RedisStore = require('socket.io/lib/stores/redis');
            config.socketio.set.store = new RedisStore({
                redisPub    : model.redis.createClient()
              , redisSub    : model.redis.createClient()
              , redisClient : model.redis.createClient()
            });
            break;
        case "mongo":
            var MongoStore = require('socket.io-mongo');
            // TODO: write own version of MongoStore which reuse mondel.mongo
            var connStr = "mongodb://";
            if(config.database.mongo.options.user && config.database.mongo.options.pass)
                connStr += config.database.mongo.options.user+":"+config.database.mongo.options.pass+"@";
            connStr += config.database.mongo.servers[0];
            config.socketio.set.store = new MongoStore({url: connStr});
            break;
        }
        for (var key in (config.socketio.set || [])) { io.set(key, config.socketio.set[key]); }
        configureSessions(app, io);
    });

    return io;
    
};


exports.draw = function(io, routes, controllers) {
    for(var routename in routes) {
        (function(route) {
            var appio = (route.url === '/') ? io : io.of(route.url);
            var actions = chainActions(route.actions, controllers);
            var methods = route.method.split(".");
            if(methods.length == 0) {
                console.log("No method defined for io route "+route.url);
                return;
            }
            var action = null;
            if(typeof actions === "function") {
                action = actions;
            } else if(Array.isArray(actions)) {
                action = function(socket) {
                    var i = 0;
                    (function next(err) {
                        if(err) {
                            console.log(err);
                            return;
                        }
                        var action = actions[i++];
                        if(action !== undefined) {
                            action(socket, next);
                        }
                    })();
                };
            };
            if(action !== null) {
                methods.push(action);
                appio[methods.shift()].apply(appio, methods);
            }
        })(routes[routename]);
    }
};

/*
 * adapted from http://www.danielbaulig.de/socket-ioexpress/
 */
function configureSessions(app, io) {

    var key = app.config.session.key;
    
    io.set('authorization', function (data, accept) {
        app.utils.cookieParser(data, {}, function (parseErr) {
            if(parseErr) {
                accept("Could not parse cookie from headers. "+(parseErr && parseErr.message), false);
                return;
            }
            data.cookies = data.secureCookies || data.signedCookies || data.cookies;
            data.sessionID = data.cookies[key];
            app.sessionStore.load(data.sessionID, function(storeErr, sess) {
                if(storeErr || !sess) {
                    accept("Session does not exist. "+(storeErr && storeErr.message), false);
                    return;
                }
                data.session = sess;
                accept(null, true);
            });
        });
    });
    
    io.sockets.on('connection', function (socket) {
        var hs = socket.handshake;
        debugio('A socket with sessionID ' + hs.sessionID + ' connected!');
    });

}

