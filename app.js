require('dotenv').config();
const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
const bcrypt = require('bcrypt');
const saltRounds = 12;

const app = express();

app.use(express.static("public"));
app.use(express.urlencoded({
    extended: true
}));

app.set('view engine', 'ejs');

const connstring = 'mongodb://127.0.0.1:27017/userDB'

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
    password: String
});


const User = new mongoose.model("User", userSchema);

app.listen(3000, function() {
    console.log("Server started on port 3000");
});

app.get("/", function(req, res){
    res.render("home");
});

app.get("/login", function(req, res){
    res.render("login");
});

app.get("/register", function(req, res){
    res.render("register");
});

app.post("/register", function(req, res){
    bcrypt.hash(req.body.password, saltRounds, function(err, hash){

        const newUser = new User({
            email: req.body.username,
            password: hash
        });
        
        console.log(newUser);

        newUser.save(function(err){
            if (!err) {
                res.render("secrets");
            } else {
                console.log(err);            
            }
        });
    });
    
});

app.post("/login", function(req, res) {
    const username = req.body.username;
    const password = req.body.password;

    User.findOne({email: username}, function(err, foundUser) {
        if(!err) {
            if(foundUser) {
                bcrypt.compare(password, foundUser.password, function(err, result){
                    if(result === true) {
                        res.render("secrets");
                    }
                });
            }
        } else {
            console.log(err);
        }
    })
})