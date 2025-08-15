'use strict';
require('dotenv').config();
const express     = require('express');
const bodyParser  = require('body-parser');
const cors        = require('cors');
const helmet      = require('helmet');
const { MongoClient, ObjectId } = require('mongodb');

const apiRoutes         = require('./routes/api.js');
const fccTestingRoutes  = require('./routes/fcctesting.js');
const runner            = require('./test-runner');

const app = express();

// Security headers per FCC requirements
app.use(helmet.frameguard({ action: 'sameorigin' })); // Only allow site in iframes on same origin
app.use(helmet.dnsPrefetchControl({ allow: false })); // Disallow DNS prefetching
app.use(helmet.referrerPolicy({ policy: 'same-origin' })); // Only send referrer for same-origin
// Hide X-Powered-By already handled by helmet default but explicit for clarity
app.disable('x-powered-by');

app.use('/public', express.static(process.cwd() + '/public'));

app.use(cors({origin: '*'})); //For FCC testing purposes only

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//Sample front-end
app.route('/b/:board/')
  .get(function (req, res) {
    res.sendFile(process.cwd() + '/views/board.html');
  });
app.route('/b/:board/:threadid')
  .get(function (req, res) {
    res.sendFile(process.cwd() + '/views/thread.html');
  });

//Index page (static HTML)
app.route('/')
  .get(function (req, res) {
    res.sendFile(process.cwd() + '/views/index.html');
  });

//For FCC testing purposes
fccTestingRoutes(app);

// Database connection then route mounting
const dbUri = process.env.DB;
if(!dbUri){
  console.warn('Warning: No DB connection string provided in .env as DB');
}

let dbClient;
let db;

async function init(){
  if(dbUri){
    dbClient = await MongoClient.connect(dbUri, { useNewUrlParser: true, useUnifiedTopology: true });
    db = dbClient.db();
    console.log('Connected to database');
  }
  apiRoutes(app, db, ObjectId); // pass db to routes
  // Export app for testing after routes are mounted
  module.exports = app;

  //404 Not Found Middleware
  app.use(function(req, res, next) {
    res.status(404)
      .type('text')
      .send('Not Found');
  });

  //Start our server and tests!
  const listener = app.listen(3000, function () {
    console.log('Your app is listening on port 3000');
    if(process.env.NODE_ENV==='test') {
      console.log('Running Tests...');
      setTimeout(function () {
        try {
          runner.run();
        } catch(e) {
          console.log('Tests are not valid:');
          console.error(e);
        }
      }, 1500);
    }
  });
}
init().catch(err=>{ console.error('DB init error', err); });
