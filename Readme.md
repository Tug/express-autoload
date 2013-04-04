
# Express-autoload

Express autoload is a set of tools to configure an Express.js application.
Create a config file, define the paths for your controllers, models and views and express-autoload will load your files, connect to the database, authenticate...


## Requirements
* Node.js >= v0.6.2

## Installation
* npm install express-autoload

## Configuring
Create a config.js file and edit it to set your configuration properties such as database host, port, username, password, etc.

## Using

    var autoloadApp = require('express-autoload')
      , config = require('./config');
    
    autoloadApp(config, function(err, app) {
        if(err) {
            console.log(err.stack || err);
            return;
        }
        
        app.server.listen(config.port, config.hostname, function() {
            console.log('Server started on port %s in %s mode',
                        app.server.address().port,
                        app.express.settings.env);
        });
    });

