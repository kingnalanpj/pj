var mongoose = require('mongoose');

var userSchema = mongoose.Schema({
    userName: String,
    userPW: String
})

module.exports = userSchema;
