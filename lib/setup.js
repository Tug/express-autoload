
var path      = require('path')
  , express   = require('express')
  , http      = require('http')
  , debug     = require('debug')('autoload')
  , Step      = require('step')
  , autoload  = require('./autoload');

module.exports.createApplication = function(app, model, config, callback) {
    
    Step(

        function loadLibraries() {
            
            debug('Loading system libraries...');
            app.libs          = app.libs || {};
            app.libs.express  = express;
            app.libs.Step     = Step;
            app.libs.mongodb  = require('mongodb');
            app.libs.mongoose = require('mongoose');
            app.libs.redis    = require('redis');

            app.sharedLibs    = app.sharedLibs || {};

            debug('Loading project libraries...');
            require('./libs.js').autoload(app.libs, config.paths.libs);
            require('./libs.js').autoload(app.sharedLibs, config.paths.sharedLibs);

            this();
        },

        function createModel(err) {
            var next = this;
            if(err) return next(err);
            
            debug('Creating models...');
            
            var group = this.group();
            for(var dbName in config.database) {
                require('./models/'+dbName).autoload(app, model, config.database[dbName], group());
            }
        },

        function createApplication(err) {
            var next = this;
            if(err) return next(err);
            
            debug('Creating application...');
            
            app.config        = config;
            app.express       = express();
            app.server        = http.createServer(app.express);
            app.sessionStore  = require('./session.js').autoload(model, config.session);
            app.utils         = {
                viewEngine    : config.views.engine,
                cookieParser  : express.cookieParser(config.session.secret)
            };

            this();
        },

        function loadModels(err) {
            var next = this;
            if(err) return next(err);
            
            debug('Loading models...');
            app.models      = autoload(app, model, config.paths.models);

            this();
        },

        function readRoutes(err) {
            var next = this;
            if(err) return next(err);
            
            debug('Reading routes...');
            var routeConfig = require(config.paths.routes)(app);
            config.urls = routeConfig.urls;
            config.ios = routeConfig.ios;
            
            var routes = {
                urls  : require('./routes.js').readUrls(config.urls)
              , ios   : require('./routes.js').readUrls(config.ios)
            };
            
            app.routes = {
                url   : require('./util.js').urlFromController(routes.urls),
                io    : require('./util.js').urlFromController(routes.ios)
            }
            
            this(null, routes);
        },
        
        function configureApplication(err, routes) {
            var next = this;
            if(err) return next(err);
            
            debug('Configuring application...');
            
            config.session.store = app.sessionStore;

            var configure = (config.paths.conf) ? require(config.paths.conf) : {};
            
            app.express.configure(function() {
                (config.middlewares || []).forEach(function(midName) {
                    switch(midName) {
                    case "cookieParser":
                        app.express.use(app.utils.cookieParser);
                        break;
                    case "static":
                        for(var path in (config.paths.statics || {})) {
                            app.express.use(path, express.static(config.paths.statics[path]));
                        }
                        break;
                    case "favicon":
                        express.favicon(config.paths.favicon, { maxAge: 2592000000 })
                        break;
                    default:
                        app.express.use(express[midName](config[midName]));
                    }
                });
                if(config.views) {
                    app.express.engine((config.views.type || 'html'), app.utils.viewEngine);
                    app.express.set('views', config.paths.views);
                    app.express.set('view engine', config.views.type || 'html');
                }
                if(configure.all) configure.all(app, model);
            });

            app.express.configure('development', function() {
                app.express.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
                if(configure.development) configure.development(app, model);
            });

            app.express.configure('production', function() {
                app.express.use(express.errorHandler());
                if(configure.production) configure.production(app, model);
            });
            
            this(null, routes);
        },

        function loadControllers(err, routes) {
            var next = this;
            if(err) return next(err);
            
            debug('Loading controllers...');
            app.controllers = autoload(app, model, config.paths.controllers);

            if(config.socketio) {
                debug('Loading socket-io...');
                app.io = require('./sockets.js').autoload(app, model, config);
            }
            
            debug('Mapping controllers...');
            require('./controllers.js').draw(app.express, routes.urls, app.controllers);

            debug('Mapping sockets...');
            require('./sockets.js').draw(app.io, routes.ios, app.controllers);
            
            this();
        },

        function loadCrons(err) {
            var next = this;
            if(err) return next(err);
            
            debug('Loading crons...');
            app.crons = autoload(app, model, config.paths.crons);
            
            this();
        },

        function end(err) {
            callback(err);
        }
    
    );

};

