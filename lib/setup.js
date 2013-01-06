
var path    = require('path')
  , express = require('express')
  , http    = require('http')
  , debug   = require('debug')('autoload')
  , Step    = require('step');

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
            app.cookieParser  = express.cookieParser(config.session.secret);
            app.sessionStore  = require('./session.js').autoload(model, config.session);
            app.viewEngine    = require('./views.js').autoload(app, config.views);
            
            this();
        },

        function configureApplication(err) {
            if(err) throw err;
            
            debug('Configuring application...');
            
            config.session.store = app.sessionStore;
            
            app.express.configure(function() {
                app.express.use(app.cookieParser);
                app.express.use(express.session(config.session));
                for(var path in (config.paths.statics || {})) {
                    app.express.use(path, express.static(config.paths.statics[path]));
                }
                app.express.use(express.favicon(config.paths.favicon, { maxAge: 2592000000 }));                
                app.express.use(app.express.router);
                app.express.use(express.errorHandler());
                app.express.set('views', config.paths.views);
                app.express.set('view engine', config.views.type || 'html');
                app.express.engine('.'+(config.views.type || 'html'), app.viewEngine);
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
                url   : require('./util.js').urlFromController(routes.urls)
              , io    : require('./util.js').urlFromController(routes.ios)
            };
            
            this(null, routes);
        },

        function loadMVC(err, routes) {
            if(err) throw err;
            
            debug('Loading MVC elements...');
            
            debug('Loading models...');
            app.models      = require('./models.js'     ).autoload(app, model, config.paths.models);
            debug('Loading controllers...');
            app.controllers = require('./controllers.js').autoload(app, model, config.paths.controllers);
            debug('Loading crons...');
            app.crons       = require('./crons.js'      ).autoload(app, model, config.paths.crons);

            if(config.socketio) {
                debug('Loading socket-io...');
                app.io      = require('./sockets.js'    ).autoload(app, model, config);
            }
            
            debug('Mapping controllers...');
            require('./controllers.js').draw(app.express, routes.urls, app.controllers);

            debug('Mapping sockets...');
            require('./sockets.js'    ).draw(app.io, routes.ios, app.controllers);
        
            this();
        },

        function end(err) {
            callback(err);
        }
    
    );

};

