var express = require('express');
var session = require('cookie-session');
var fileUpload = require('express-fileupload');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var assert = require('assert');
var app = express();
var ObjectId = require('mongodb').ObjectID;
var mongourl = 'mongodb://admin:admin@ds119728.mlab.com:19728/comps381fpj';


mongoose.connect(mongourl);
var restaurantSchema = require('./models/restaurant');
var userSchema = require('./models/user');
var user = mongoose.model('users', userSchema);
var restaurant = mongoose.model('restaurants',restaurantSchema);

app.use(session({
    name: 'session',
    keys: ['key1'],
    maxAge: 5 * 60 * 1000
}));

app.use(express.static(__dirname + '/views'));

app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(fileUpload());
app.use(bodyParser.json());
app.set('view engine','ejs');

app.get("/", function (req, res){
    if(req.session.userName != null)
        return res.redirect('/read');

    res.sendFile(__dirname + '/views/login.html');

});

app.get("/login", function(req, res){
    if(req.session.userName != null)
        return res.redirect('/read');
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
    if(req.query.option != undefined){
        switch (req.query.option){
            case 'name':
                criteria.name = req.query.search;
                break;
            case 'borough':
                criteria.borough = req.query.search;
                break;
            case 'cuisine':
                criteria.cuisine = req.query.search;
                break;
        }
        if (req.query.search == "")
            criteria = {};
    }
    findReastaurant(criteria,function (docs) {
       res.render("restaurants",{
           "userName" : req.session.userName,
           "restaurants" : docs,
           "criteria" : JSON.stringify(criteria)
       });
    });
});

app.get("/read/name/:value",checkLogin,function (req,res) {
    var criteria = {
        "name" : req.params.value
    };
    findReastaurant(criteria,function (docs) {
        res.end(JSON.stringify(docs));
    });
});

app.get("/read/borough/:value",checkLogin,function (req,res) {
    var criteria = {
        "borough" : req.params.value
    };
    findReastaurant(criteria,function (docs) {
        res.end(JSON.stringify(docs));
    });
});

app.get("/read/cuisine/:value",checkLogin,function (req,res) {
    var criteria = {
        "cuisine" : req.params.value
    };
    findReastaurant(criteria,function (docs) {
        res.end(JSON.stringify(docs));
    });
});

app.post("/search",checkLogin,function (req,res) {
    if (req.body.search == null){
        redirect("/read");
        return;
    }
    var goTo = "/read"+"/"+req.body.option +"/"+req.body.search;
    res.redirect(goTo);
});

app.get("/new",checkLogin, function (req,res) {
    res.sendFile( __dirname + '/views/new.html')
});

app.post("/new",checkLogin, function(req, res){

    if(req.body.name == ""){
        res.render("msg",{
            "title" : "Error",
            "msg" : "You must input restaurant name.",
            "back"  : "new"
        });
        return;
    }

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
    rObj.createBy = req.session.userName;
    if(req.files && req.files.photo.data.length > 0) {
        console.log("i have a photo");
        rObj.photo = new Buffer(req.files.photo.data).toString('base64');
        rObj.minetype = req.files.photo.mimetype;
    }else{
        console.log("i have not photo");
        rObj.photo = null;
        rObj.minetype = null;
    }
    //mongoose.connect(mongourl);
    //var db = mongoose.Connection;
    //db.on('error', console.error.bind(console,'connection error'));
    //db.once('open',function(callback){
    //   var restaurant = mongoose.model('restaurants',restaurantSchema);
    var r = new restaurant(rObj);
    r.save(function(err, docs) {
        if (err) return console.error(err);
        //db.close();
        res.redirect("/display?_id="+docs._id.toString());
    });
    //})

});

app.post("/create", function(req, res){
    var body = "";
    console.log(req.body.address);

    var r = new restaurant(req.body);
    r.save(function(err, docs) {
        if(err){
            res.end(JSON.stringify({"status" : "failed"}));
        }else
            res.end(JSON.stringify({"status" : "ok", "_id" : docs._id.toString() }));// console.log('Restaurant created!')
    });
});

app.get("/display",checkLogin,function (req,res) {
    if (req.query._id == null)
        return res.redirect("/read");
    getRestaurantDetail(req.query._id,function (docs) {
        res.render("display",{
            "userName" : req.session.userName,
            "restaurant" : docs
        });
    })
});

app.get("/rate",checkLogin,function (req, res) {
    if ( req.query._id == null){
        res.redirect('/read');
        return;
    }

    res.render("rate",{
        "_id": req.query._id
    });
});

app.post("/rate",checkLogin,function (req, res) {
   restaurant.findById(req.body._id, function (err, restaurant) {
       if (err) return console.error(err);

       var check = false;
       for (var i = 0; i < restaurant.rating.length; i++){
           if(req.session.userName == restaurant.rating[i].rateBy){
               check = true;
               break;
           }
       }

       if(!check){
           restaurant.rating.push(
               {
                   "rate":req.body.score,
                   "rateBy":req.session.userName
               }
           );
           restaurant.save(function(err, docs){
               if (err) return console.error(err);
               res.redirect("/display?_id="+req.body._id);
           })
       }else{
           res.render("msg",{
               "title" : "Error",
               "msg" : "You are already rated for this restaurant.",
               "back" : "display?_id="+req.body._id
           })
       }
   })
});

app.get("/delete", function(req,res){
    getRestaurantDetail({
        "_id" : req.query._id
    },function (docs) {
        if(req.session.userName != docs.createBy){
            res.render("msg",{
                "title" : "Error",
                "msg" : "Only the record creater can delete the restaurant record.",
                "back" : "display?_id="+req.query._id
            });
        }else{
            restaurant.remove({_id : ObjectId(req.query._id)}, function(err){
                if(err) return console.error(err);

                res.render("msg",{
                    "title" : "Info",
                    "msg" : "Delete successful!",
                    "back" : "read"
                })

            });
        }
    });


});

app.get("/edit",checkLogin,function (req,res) {
    getRestaurantDetail({
        "_id" : req.query._id
    },function (docs) {
        if(req.session.userName != docs.createBy){
            res.render("msg",{
                "title" : "Error",
                "msg" : "Only the record creater can edit the restaurant record.",
                "back" : "display?_id="+req.query._id
            });
        }else{
            res.render("edit",{
                "restaurant" : docs
            })
        }


    })
});

app.post("/edit",checkLogin,function (req,res) {
    restaurant.findById(req.body._id, function (err, restaurant) {
        if (err) return console.error(err);

        restaurant.name = req.body.name;
        restaurant.borough = req.body.borough;
        restaurant.cuisine = req.body.cuisine;
        restaurant.address.street = req.body.street;
        restaurant.address.building = req.body.building;
        restaurant.address.zipcode = req.body.zipcode;
        var coord = [req.body.lon, req.body.lat];
        restaurant.address.coord = coord;

        if(req.files && req.files.photo.data.length > 0) {
            restaurant.photo = new Buffer(req.files.photo.data).toString('base64');
            restaurant.minetype = req.files.photo.mimetype;
        }

        restaurant.save(function (err,docs) {
            if (err) return console.error(err);
            res.redirect("/display?_id=" + docs._id.toString());
        })
    });
});

app.get("/map", checkLogin,function(req,res) {

    res.render("gmap",{
        'lat' : req.query.lat,
        'lon' : req.query.lon,
        'name' : req.query.name
    });
    res.end();
});

function checkLogin(req, res, next){
    if(req.session.userName != null)
        return next();
    res.redirect('/');
}

function findReastaurant(criteria, back){
    //mongoose.connect(mongourl);
    //var db = mongoose.Connection;
    //db.on('error', console.error.bind(console,'connection error'));
    //db.once('open',function (callback) {
    //   var restaurant = mongoose.model('restaurants',restaurantSchema);
    restaurant.find(criteria,function (err, docs) {
        if (err) return console.error(err);
        //db.close();
        back(docs);
    });
    //});
}

function getRestaurantDetail(id,back){
    //mongoose.connect(mongourl);
    //var db = mongoose.Connection;
    //db.on('error', console.error.bind(console,'connection error'));
    //db.once('open',function(callback){
     //   var restaurant = mongoose.model('restaurants',restaurantSchema);
    restaurant.findOne({
        _id: id
    },function(err, docs) {
        if (err) return console.error(err);
        //db.close();
        back(docs);
    });
    //})
}

function verifyUser(userObj, back){
    //mongoose.connect(mongourl);
    //var db = mongoose.Connection;
    //db.on('error', console.error.bind(console, 'connection error'));
    //db.once('open', function(callback){
    //    var user = mongoose.model('users', userSchema);
    user.findOne(userObj, function(err, docs){
        if(err){
            console.error(err);
            return res.redirect('/login');
        }
        //db.close();
        back(docs);
    });
    //});
}

app.listen(process.env.PORT || 8099);