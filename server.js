// BASE SETUP
// =============================================================================

// CALL THE PACKAGES -----------------------------------------------------------

var express = require('express'); //call express
var app = express(); //Define our app using express
var bodyParser = require('body-parser'); //get body-parser
var morgan = require('morgan'); //used to see requests
var mongoose = require('mongoose'); //for working with our database
var User = require('./app/models/user');
var port = process.env.PORT || 8080 //set the port for our app
var jwt = require('jsonwebtoken');

// super secret to create tokens
var superSecret = 'dollyguaranadollysaborsurpreendente';

// APP CONFIGURATION -----------------------------------------------------------

// use body-parser so we can grab information from POST requests
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

/* configure our app to handle CORS (Cross-Origin Resource Sharing) requests
(requests from other domains) */
app.use(function(req, res, next){
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type, Authorization');
  next();
});

// log all requests to the console
app.use(morgan('dev'));

// database hosted on mongolab mongodb://username:password@ds042888...
//mongoose.connect('mongodb://admin:admin@ds042888.mongolab.com:42888/db_teste');


mongoose.connect('mongodb://foco:foco@node65626-foco001.jelasticlw.com.br/teste');

// ROUTES FOR OUR API
// =============================================================================

// base route for the home page
app.get('/', function(req, res){
  res.send('Bem vindo à home page!');
});

// get a instance o the express router
var apiRouter = express.Router();

// route for authenticating users (POST localhost:8080/api/authenticate)
apiRouter.post('/authenticate', function(req, res){
  // find the user
  // select the name, username and password
  User.findOne({
    username: req.body.username
  }).select('name username password').exec(function(err, user){
      if (err) throw err;
      // no user with that username was found
      if (!user){
        res.json({
          success: false,
          message: 'Autenticação falhou. O usuário não existe!'
        });
      }else if (user){
        // check if password matches
        var validPassword = user.comparePassword(req.body.password);
        if (!validPassword){
          res.json({
            success: false,
            message: 'Autenticação falhou. Senha errada!'
          });
        }else{
          // user is found and password is right
          // create a token
          var token = jwt.sign({
            name: user.name,
            username: user.username
          }, superSecret, {
            expiresInMinutes: 1440 //24 hours
          });
          // return the information including token as json
          res.json({
            success: true,
            message: 'Aproveite seu token!',
            token: token
          });
        }
      }
    });
});

// middleware to use for all requests
apiRouter.use(function(req, res, next){
  // do logging
  console.log('Alguém chegou em nosso APP');
  // check header or url parameters or POST parameters for token
  var token = req.body.token || req.param('token') || req.headers['x-access-token'];
  //decode token
  if (token) {
    // verifies secret and expiration
    jwt.verify(token, superSecret, function(err, decoded){
      if (err){ return res.status(403).send({
          success: false,
          message: 'Falha ao autenticar token.'
        });
      }else{
        // if everything is good, save to request for use in other routes
        req.decoded = decoded;
        next();
      }
    });
  }else{
    // if there is no token
    // return an HTTP response o 403 (Access Forbidden) and an error message
    return res.status(403).send({
      success: false,
      message: 'Nenhum token foi fornecido.'
    });
  }

});

/* test router to make sure everything is working when accessing at GET
http://localhost:8080/api */
apiRouter.get('/', function(req, res){
  res.json({message: 'Bem vindo à nossa API!'});
});

// more routes for our API will happen here

// REGISTER OUR ROUTES ---------------------------------------------------------

// all of our routes will be prefixed with /api
app.use('/api', apiRouter);

// on routes that end in /users/
apiRouter.route('/users')
  // create a new user (accessed at POST localhost:8080/api/users)
  .post(function(req, res){
    var user = new User();
    // set the users information (comes from the request)
    user.name = req.body.name;
    user.username = req.body.username;
    user.password = req.body.password;
    // save the user and check for errors
    user.save(function(err){
      if (err) {
        // duplicate entry
        if (err.code = 11000) return res.json({success: false, message: 'Um usuário com este username já existe!'});
        else return res.send(err);
      }
      res.json({message: 'Usuário criado!'});
    });
  })
  // get all the users (accessed at GET localhost:8080/api/users)
  .get(function(req, res){
    User.find(function(err, users){
      if (err) res.send(err);
      //return the users
      res.json(users);
    });
  });

// on routes that ends in /users/:user_id
apiRouter.route('/users/:user_id')
  // get the user with that id (accessed at GET localhost:8080/api/users/:user_id)
  .get(function(req, res){
    User.findById(req.params.user_id, function(err, user){
      if (err) res.send(err);
      //return that user
      res.json(user);
    });
  })
  // update user with this id (accessed at PUT localhost:8080/api/users/:user_id)
  .put(function(req, res){
    // use our user model to find the user we want
    User.findById(req.params.user_id, function(err, user){
      if (err) res.send(err);
      // update the user's info only if its new info
      if (req.body.name) user.name = req.body.name;
      if (req.body.username) user.username = req.body.username;
      if (req.body.password) user.password = req.body.password;
      // save the user
      user.save(function(err){
        if (err) res.send(err);
        // return a message
        res.json({message: 'Usuário atualizado!'});
      });
    });
  })
  // delete user with this id (accessed at DELETE localhost:8080/api/users/:user_id)
  .delete(function(req, res){
    User.remove({_id: req.params.user_id}, function(err, user){
      if (err) res.send(err);
      res.json({message: 'Usuário deletado!'});
    });
  });

// API endpoint to get user information
apiRouter.get('/me', function(req, res){
  res.send(req.decoded);
});

// START THE SERVER
// =============================================================================

app.listen(port);
console.log('SERVER RODANDO NA PORTA ' + port);
