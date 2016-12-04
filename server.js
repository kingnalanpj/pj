var express = require('express');
var session = require('cookie-session');
var fileUpload = require('express-fileupload');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var assert = require('assert');
var app = express();
var ObjectId = require('mongodb').ObjectID;
var mongourl = 'mongodb://alanking:alanking@ds119728.mlab.com:19728/comps381fpj';
var restaurantSchema = require('./models/restaurant');
var userSchema = require('./models/user');



app.use(session({
    name: 'session',
    keys: ['key1'],
    maxAge: 5 * 60 * 1000
}));

app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(fileUpload());
app.use(bodyParser.json());
app.set('view engine','ejs');

app.get("/", function (req, res){
    if(req.session.userName == null && req.body.userName == null){
        res.sendFile(__dirname + '/views/login.html');
    }
});

app.get("/login", function(req, res){
    res.sendFile(__dirname + '/views/login.html');
});

app.post("/login", function(req, res){
    var userObject = {
        "userName" : req.body.userName,
        "userPW" : req.body.userPW
    };

    verifyUser(userObject, function (docs) {
        console.log("hi");
        req.session.userName = docs.userName;
        res.redirect('/read');
    });
});

app.get("/read",checkLogin,function(req,res){
    var criteria = {};
    findReastaurant(criteria,function (docs) {
       res.render("restaurants",{
           "userName" : req.session.userName,
           "restaurants" : docs,
           "criteria" : JSON.stringify(criteria)
       });
    });
});

app.get("/read/name/:value",function (req,res) {
    var criteria = {
        "name" : req.params.value
    };
    findReastaurant(criteria,function (docs) {
        res.render("restaurants",{
            "userName" : req.session.userName,
            "restaurants" : docs,
            "criteria" : JSON.stringify(criteria)
        });
    });
});

app.get("/read/borough/:value",function (req,res) {
    var criteria = {
        "borough" : req.params.value
    };
    findReastaurant(criteria,function (docs) {
        res.render("restaurants",{
            "userName" : req.session.userName,
            "restaurants" : docs,
            "criteria" : JSON.stringify(criteria)
        });
    });
});

app.get("/read/cuisine/:value",function (req,res) {
    var criteria = {
        "cuisine" : req.params.value
    };
    findReastaurant(criteria,function (docs) {
        res.render("restaurants",{
            "userName" : req.session.userName,
            "restaurants" : docs,
            "criteria" : JSON.stringify(criteria)
        });
    });
});

app.post("/search",function (req,res) {
    var goTo = "/read"+"/"+req.body.option +"/"+req.body.search;
    res.redirect(goTo);
});

app.get("/new", function (req,res) {
    res.sendFile( __dirname + '/views/new.html')
});

app.post("/create", function(req, res){
    var rObj = {};
    rObj.address = {};
    rObj.address.building = req.body.building;
    rObj.address.street = req.body.street;
    rObj.address.zipcode = req.body.zipcode;
    rObj.address.coord = [];
    rObj.address.coord.push(req.body.lon);
    rObj.address.coord.push(req.body.lat);
    rObj.borough = req.body.borough;
    rObj.cuisine = req.body.cuisine;
    rObj.name = req.body.name;
    rObj.createBy = req.session.user_name;
    rObj.photo = new Buffer(req.files.sampleFile.data).toString('base64');
    rObj.minetype = req.files.sampleFile.mimetype;

    mongoose.connect(mongourl);
    var db = mongoose.Connection;
    db.on('error', console.error.bind(console,'connection error'));
    db.once('open',function(callback){
        var restaurant = mongoose.model('restaurants',restaurantSchema);
        var r = new restaurant(rObj);
        r.save(function(err, docs) {
            if (err) return console.error(err);
            db.close();
            res.redirect("/display?_id="+docs._id.toString());
        });
    })

});

app.get("/display",function (req,res) {
    if (req.query._id == null)
        return res.redirect("/read");
    getRestaurantDetail(req.query._id,function (docs) {
        res.render("display",{
            "userName" : req.session.userName,
            "restaurant" : docs
        });
    })
});

function checkLogin(req, res, next){
    if(req.session.userName != null)
        return next();
    res.redirect('/');
}

function findReastaurant(criteria, back){
    mongoose.connect(mongourl);
    var db = mongoose.Connection;
    db.on('error', console.error.bind(console,'connection error'));
    db.once('open',function (callback) {
        var restaurant = mongoose.model('restaurants',restaurantSchema);
        restaurant.find(criteria,function (err, docs) {
            if (err) return console.error(err);
            db.close();
            back(docs);
        })
    });
}

function getRestaurantDetail(id,back){
    mongoose.connect(mongourl);
    var db = mongoose.Connection;
    db.on('error', console.error.bind(console,'connection error'));
    db.once('open',function(callback){
        var restaurant = mongoose.model('restaurants',restaurantSchema);
        restaurant.findOne({
            _id: id
        },function(err, docs) {
            if (err) return console.error(err);
            db.close();
            back(docs);
        });
    })
}

function verifyUser(userObj, back){
    mongoose.connect(mongourl);
    var db = mongoose.Connection;
    db.on('error', console.error.bind(console, 'connection error'));
    db.once('open', function(callback){
        var user = mongoose.model('users', userSchema);
        user.findOne(userObj, function(err, docs){
            if(err){
                console.error(err);
                return res.redirect('/login');
            }
            db.close();
            back(docs);
        });
    });
}

app.listen(process.env.PORT || 8099);