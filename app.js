require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require( "passport-google-oauth2" ).Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();

app.use(express.static("public"));
app.use(express.urlencoded({
    extended: true
}));

app.set("view engine", "ejs");

app.use(session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

const connstring = "mongodb://127.0.0.1:27017/userDB"

const connectDatabase = async () => {
    try {
      
      await mongoose.connect(connstring, {useNewUrlParser: true});  
      console.log("connected to database");
    } catch (error) {
      console.log(error);
      process.exit(1);
    }
  };
  
  connectDatabase();

const userSchema = new mongoose.Schema ({
    email: String,
    password: String,
    googleId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      cb(null, { id: user.id, username: user.username, name: user.name });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });

passport.use(new GoogleStrategy({
    clientID:     process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    passReqToCallback   : true
  },
  function(request, accessToken, refreshToken, profile, done) {
     // console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return done(err, user);
    });
  }
));

app.listen(3000, function() {
    console.log("Server started on port 3000");
});

app.get("/", function(req, res){
    res.render("home");
});

app.get("/login", function(req, res){
    res.render("login");
});

app.get("/auth/google",
  passport.authenticate("google", { scope:
      [ "email", "profile" ] }
));

app.get( "/auth/google/secrets",
    passport.authenticate( "google", {
        successRedirect: "/secrets",
        failureRedirect: "/login"
}));

app.get("/register", function(req, res){
    res.render("register");
});

app.get("/secrets", function(req, res){
    User.find({"secret": {$ne: null}}, function(err, foundUsers){
        if (err) {
            console.log(err);
        } else {
            if (foundUsers) {
                res.render("secrets", {usersWithSecrets: foundUsers});
            }
        }
    });
});

app.get("/submit", function(req, res){
    if(req.isAuthenticated) {
        res.render("submit");
    } else {
        res.redirect("/login");
    }
});

app.post("/submit", function(req, res){
  const submittedSecret = req.body.secret;
  console.log(req.user);
  User.findById(req.user.id, function(err, foundUser) {
      if (err) {
          console.log(err);
      } else {
          console.log(foundUser);
          if(foundUser) {
              console.log("User found");
              console.log(submittedSecret);
              foundUser.secret = submittedSecret;
              foundUser.save(function() {
                  res.redirect("/secrets");
              });
          }
      }
  });
});

app.post("/register", function(req, res){
  User.register({username: req.body.username}, req.body.password, function(err, user) {
      if (err) {
          console.log(err);
          res.redirect("/register");
      } else {
          passport.authenticate("local")(req, res, function () {
                res.redirect("/secrets");
          });
      }
  })
});

app.post("/login", function(req, res) {
   const user = new User({
       username: req.body.username,
       password: req.body.password
   });

   req.login(user, function(err){
       if(err) {
           console.log(err);
       } else {
           passport.authenticate("local")(req, res, function(){
               res.redirect("/secrets");
           });
       }
   });
});

app.get("/logout", function(req, res) {
    req.logout();
    res.redirect("/");
});