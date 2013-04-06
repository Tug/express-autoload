
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
            
            debug('Loading project libraries...');
            require('./libs.js').autoload(app, config.paths.libs);
            
            this();
        },

        function createModel(err) {
            if(err) throw err;
            
            debug('Creating models...');
            
            var group = this.group();
            for(var dbName in config.database) {
                require('./models/'+dbName).autoload(app, model, config.database[dbName], group());
            }
        },

        function createApplication(err) {
            if(err) throw err;
            
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
            if(err) throw err;
            
            debug('Loading models...');
            app.models      = autoload(app, model, config.paths.models);

            this();
        },
        
        function configureApplication(err) {
            if(err) throw err;
            
            debug('Configuring application...');
            
            config.session.store = app.sessionStore;

            var configure = (config.paths.conf) ? require(config.paths.conf) : {};
            
            app.express.configure(function() {
                app.express.use(app.utils.cookieParser);
                app.express.use(express.session(config.session));
                for(var path in (config.paths.statics || {})) {
                    app.express.use(path, express.static(config.paths.statics[path]));
                }
                app.express.use(express.favicon(config.paths.favicon, { maxAge: 2592000000 }));
                app.express.engine((config.views.type || 'html'), app.utils.viewEngine);
                app.express.set('views', config.paths.views);
                app.express.set('view engine', config.views.type || 'html');
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
            
            this();
        },

        function readRoutes(err) {
            if(err) throw err;
            
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

        function loadControllers(err, routes) {
            if(err) throw err;
            
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
            if(err) throw err;
            
            debug('Loading crons...');
            app.crons = autoload(app, model, config.paths.crons);
            
            this();
        },

        function end(err) {
            callback(err);
        }
    
    );

};

