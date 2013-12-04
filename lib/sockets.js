
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
                action = function(data, callback) {
                    var i = 0;
                    callback = callback || function() {};
                    (function next(err, accept) {
                        if(err || accept === false) {
                            err = err && (err.message || err);
                            return callback(err, accept);
                        }
                        var action = actions[i++];
                        if(action !== undefined) {
                            action(data, next);
                        } else {
                            callback(null, accept);
                        }
                    })();
                };
            }
            if(action !== null) {
                methods.push(action);
                appio[methods.shift()].apply(appio, methods);
            }
        })(routes[routename]);
    }
};

