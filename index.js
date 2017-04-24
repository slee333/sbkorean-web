// start.js

///////////////////////* Requires *///////////////////////////

var path = require('path');
var optimist = require('optimist')
                .usage( 'The simplest possible web server.\nUsage: $0' )
                .options( 'p', {
                    alias: 'port',
                    describe: 'TCP port to host server on',
                    default: 3000
                } )
                .options( 'd', {
                    alias: 'dir',
                    describe: 'Directory to use as web root',
                    default: '.'
                } );

var spawn = require('child_process').spawn;
var express = require('express');
var bodyParser = require('body-parser');
var assert = require('assert')
//var cors = require('cors'); // Cross - domain request... will I ever need this?
var assign = require('object-assign');
var ObjectId = require('mongodb').ObjectID;
var fs = require('fs');
var jsonfile = require( 'jsonfile' ); // to get local json data. Can use custom database instead, but for simplicity..
var MongoClient = require('mongodb').MongoClient;

// google authentication
var GoogleAuth = require("google-auth-library"); 

////////////////* Middleware and functions *///////////////////

function getDataFile( filename, callback ) {

    var dataFilePath = path.resolve("./data/" + filename );

    jsonfile.readFile( dataFilePath, function( err, jsondata ) {
        
        // When data file has problems
        if (err) {      
            console.log(err)
            return;
        }

        callback(jsondata)

    })
}

function getMongoURI( callback ) {
    
    var credentialsPath = path.resolve( './.credentials' );

    jsonfile.readFile( credentialsPath, function( err, credentials ) {
        
        if ( err ) {
            // Problem with .credentials file; use defaults
            callback( null, 'mongodb://localhost:27017/SpeechBanana' );
            return;
        }

        // Check connection properties
        if ( ! credentials.hasOwnProperty( 'host' ) ) {
            credentials.host = 'localhost';
        }
        if ( ! credentials.hasOwnProperty( 'port' ) ) {
            credentials.port = 27017;
        }
        if ( ! credentials.hasOwnProperty( 'db' ) ) {
            credentials.db = 'SpeechBanana';
        }

        // Check authentication properties
        if ( ( ! credentials.hasOwnProperty( 'user' ) ) || ( ! credentials.hasOwnProperty( 'password' ) ) ) {
            // Insufficient authentication details; connect without auth
            callback( null, 'mongodb://' + credentials.host + ':' + credentials.port.toString() + '/' + credentials.db );
            return;
        }

        // Auth specified; use it
        callback( null, 'mongodb://' + credentials.user + ':' + credentials.password + '@' + credentials.host + ':' + credentials.port.toString() + '/' + credentials.db );

    } );
}

function MongoMiddleWare( callback ) {
    return function(req,res){
        var msg = ""

        getMongoURI( function(err, mongoURI) {

            // Handling errors

            if (err) {
                msg = 'ERROR Could not load Mongo URI: ' + err
                console.log(msg)
                res.status(500).send(msg)
                return
            }

            MongoClient.connect( mongoURI , function( err, db ) { 
                if (err) {
                    msg = 'ERROR Could not connect to mongodb client: ' + err
                    console.log(msg)
                    res.status(500).send(msg)
                    return
                }

                callback( req, res, db )

            })
        })
    }
}

function Oauth2MiddleWare(callback){
    return function(req,res){

        var keys = req.query;
        assign(keys, req.body);

        var token = keys.idtoken,
            msg = "";

        getDataFile("credentials.json", function(data){
            var clientID = data.web.client_id
            var auth = new GoogleAuth,
                client = new auth.OAuth2(clientID, '', '');
            client.verifyIdToken(
                token,
                clientID,
                function(e, login) {
                    if(e){
                        msg = "ERROR Could not verify user authentication"
                        res.status(401).send(msg)
                        console.log(msg)
                        res.end()
                        return
                    }
                callback( req, res, keys, login  )
            })
        })
    }
}

////////////////* Request handlers *///////////////////


var app = express();
var argv = optimist.argv;
var dir = path.resolve( argv.dir);
//app.use(cors());

app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({ extended: true , limit : '50mb' }));
app.use( '/',  express.static( path.join( dir, 'public' ) ) );

app.get( '/',  function( req, res ) {
    res.sendFile( path.join( dir, 'public', 'index.html' ) );
});

app.get( '/lessons', function( req, res ) {
    res.sendFile( path.join( dir, 'public', 'lessons_mlp.html' ) ); 
})
app.post( "/what", function(req,res){
    res.redirect("/lessons");
})
    
app.get( '/api/lessonData', function ( req, res) {
    getDataFile( req.query.filename, function( jsondata ) {
        res.status(201).json(jsondata)
    })
})

//http://www.willvillanueva.com/the-web-audio-api-from-nodeexpress-to-your-browser/
app.get( '/api/soundData', function(req,res){

    var filepath = path.join("data","audio",req.query.lesson,req.query.fileName)
    console.log(filepath)
    res.set({"Content-Type": "audio/mpeg"});
    var readStream = fs.createReadStream(filepath);
    readStream.on("error", function() {
        // No sound file - Error Handler
        console.log("Error: Sound file does not exist under directory: "  + filepath )
    })
    readStream.pipe(res);

})

// Record quiz score
app.post( '/api/recordScore', MongoMiddleWare( 
    function(req, res, db){

        var msg = "";

        var update = {};
        var query = "score."+ req.body.lessonNum + "." + req.body.timestamp
        update[query] = { "right_sentences": req.body.right_sentences , "wrong_sentences": req.body.wrong_sentences,
                          "right_words": req.body.right_words , "wrong_words": req.body.wrong_words , "replay": req.body.replay  };

        // Update user score
        db.collection( "userInfo" ).updateOne(
            {"SBUserId": req.body.userId},
            { 
                $set: update
            }, { upsert: true },
            function(err, results) {
                if (err) {
                    msg = "ERROR Could not save test score: " + err
                    console.log(msg)
                    res.status(500).send(msg)
                    return
                }
                else {
                    msg = "SUCCESS Score successfully saved in the database"
                    console.log(msg);
                    //res.status( 201 ).send( msg );
                    res.end()
                    db.close();
                }
            }
        )
    })
)

// Load quiz score
app.get('/api/score', MongoMiddleWare(
    function(req,res,db){

        var msg = "";

        var query = {}
        query["score."+ req.query.lessonNum + "." + req.query.timestamp] = 1
        
        // Get user score
        db.collection( "userInfo" ).find(
            {"SBUserId": req.query.userId}, query,
            function(err, cursor) {
                if (err) {
                    msg = "ERROR Could not get test score: " + err
                    console.log(msg)
                    res.status(500).send(msg)
                    return
                }
                cursor.toArray( function (err, docs) {
                    
                    // When score is empty for today
                    if (  docs.length > 0 && docs[0]["score"]!=undefined && 
                          docs[0]["score"][req.query.lessonNum] != undefined &&
                          docs[0]["score"][req.query.lessonNum][req.query.timestamp] != undefined ) {
                        console.log(result)
                        var result = docs[0]["score"][req.query.lessonNum][req.query.timestamp]
                        
                    } else {
                        var result = {"right_sentences": 0, "wrong_sentences": 0,
                                      "right_words" : 0, "wrong_words": 0, "replay": 0}
                    }
                    msg = "SUCCESS Score successfully loaded from dB"
                    console.log(msg);
                    res.writeHead(200, {"Content-Type": "application/json"});
                    res.end( JSON.stringify(result));
                    db.close();
                    return
                })
            }
        )
    }
))

// Get score within certain range
app.get('/api/allScore', MongoMiddleWare(
    function(req,res,db){

        var msg = "";

        var query = {};
        var lessonNums = req.query.lessonNums; // list of Lesson Nums
        
        for (var i = 0; i < lessonNums.length; i++) {
            query["score."+ lessonNums[i] ] = 1    
        }

        var st = req.query.timeRange[0],
            et = req.query.timeRange[1],
            result = {};

        // Get scores within certain timerange
        db.collection( "userInfo" ).find(
            {"SBUserId": req.query.userId}, query,
            function(err, cursor) {
                if (err) {
                    msg = "ERROR Could not get test score: " + err
                    console.log(msg)
                    res.status(500).send(msg)
                    return
                }
                cursor.toArray( function (err, docs) {
                    
                    /*
                    Current score structure:

                    'score' : { 
                        "lessonX": { "timestamp1": {'right_sentences': 9, 'wrong_sentences': 1, 'right_words':3, 'wrong_words': 2, 'replay':71}, "timestamp2": {"right":21, "wrong": 22} },
                        "lessonY": {'right': 2, 'wrong': 10}
                    }
                    */
                    
                    function timeFilter(value){
                        return value >= st & value <= et 
                    }

                    var scores = docs[0]["score"];
                    
                    if ( req.query.keys == "lessons") {     // Return right/wrong sorted based on lessons
                        for (var l = 0; l < lessonNums.length; l++){

                            result[ lessonNums[l] ] = { "right_sentences":0, "wrong_sentences": 0, "right_words": 0, "wrong_words":0, "replay":0}

                            if (scores[ lessonNums[l] ] != undefined) {
                                var lessonTimes = Object.keys( scores[ lessonNums[l] ] ).filter(timeFilter);
                            
                                for (var t = 0; t < lessonTimes.length ; t++ ){
                                    result[ lessonNums[l] ].right_sentences += Number( scores[ lessonNums[l] ][ lessonTimes[t] ].right_sentences )
                                    result[ lessonNums[l] ].wrong_sentences += Number( scores[ lessonNums[l] ][ lessonTimes[t] ].wrong_sentences )
                                }
                            }
                        }       
                    } else if (req.query.keys == "date") {  // Return right/wrong sorted based on time
                        for (var l = 0 ; l < lessonNums.length; l++) {
                            if (scores[ lessonNums[l] ] != undefined) {
                                var lessonTimes = Object.keys( scores[ lessonNums[l] ] ).filter(timeFilter);

                                for (var t = 0; t < lessonTimes.length ; t++ ){
                                    if (lessonTimes[t] in result){
                                        result[ lessonTimes[t] ].right_sentences += Number( scores[ lessonNums[l] ][ lessonTimes[t] ].right_sentences )
                                        result[ lessonTimes[t] ].wrong_sentences += Number( scores[ lessonNums[l] ][ lessonTimes[t] ].wrong_sentences )
                                    } else {
                                        result[ lessonTimes[t] ] = { "right_sentences": Number( scores[ lessonNums[l] ][ lessonTimes[t] ].right_sentences ) ,
                                                                     "wrong_sentences": Number( scores[ lessonNums[l] ][ lessonTimes[t] ].wrong_sentences )}
                                    }
                                }
                            }
                        }
                    }

                    // When score is empty for today
                    msg = "SUCCESS All scores successfully loaded from dB"
                    console.log(msg);
                    res.writeHead(200, {"Content-Type": "application/json"});
                    res.end( JSON.stringify(result));
                    db.close();
                    return
                })
            }
        )

    }
))

// Authenticate, and create user info document if not already exist.
app.post("/api/auth", Oauth2MiddleWare(
    function( req, res, keys, login){

        var payload = login.getPayload();
        var userid = payload['sub']; // google userId, not SBUserId
        var msg = ""
        //var name = keys.name,
        var email = keys.email;

        // Get Mongo Instances
        MongoMiddleWare(function(req,res,db){

            // Find if user information exists
            // Idea - check how many times they logged in? Like, record log-in time?
            db.collection("userInfo").find({"GUserId":userid}, 
                function(err, cursor){

                    if (err) {
                        msg = "ERROR Could not get user information: " + err; console.log(msg); 
                        res.status(500).send(msg)
                        return
                    }
                    cursor.toArray( function (err, docs ){

                        if (docs.length > 0) {

                            msg = "SUCCESS User successfully logged in";
                            var SBUserId = docs[0]["SBUserId"];
                            // Update login times? Idk. Send webpage
                            res.status(200).send({ msg: msg, redirect: '/lessons?userId=' + encodeURIComponent(SBUserId) }) 
                            res.end()
                            db.close()
                            return
                        }
                        else{
                            // Create new userinfo document
                            
                            db.collection("userInfo").count( function(err,count){
                                
                                var SBUserId = String(count+1);
                                
                                db.collection("userInfo").insert({
                                    "SBUserId": SBUserId,
                                    "GUserId": userid,
                                    //"name": name,
                                    "email": email,
                                    "locale": payload.locale,
                                    "score": {}
                                }, function(err,result){
                                    
                                    if (err) { msg = "ERROR Could not insert MongoDB Document"; console.log(msg); res.status(500).send(msg); }
                                    msg = "SUCCESS New user registered with userId: " + SBUserId;
                                    console.log( msg )
                                    res.status(200).send({msg: msg, redirect: '/lessons?userId=' + encodeURIComponent(SBUserId) });
                                    res.end()
                                    db.close()
                                    return
                                    
                                })
                            })
                        }
                    })
            })
        })(req,res)
    }
))

// Check if user is redirected to the right page.
app.get( "/api/client_match", Oauth2MiddleWare(
    function(req, res, keys, login) {

        var payload = login.getPayload();
        var GUserid = payload['sub']; // google userId, not SBUserId
        var SBUserId = keys.SBUserId;
        var msg = ""

        MongoMiddleWare( function(req,res,db){

            db.collection("userInfo").find({"GUserId":GUserid}, function(err, cursor){
                if (err) {
                        msg = "ERROR Could not get user information: " + err; console.log(msg); 
                        res.status(500).send(msg)
                        return
                }

                cursor.toArray(function(err, docs){

                    if (docs.length > 0 && docs[0]["SBUserId"]==SBUserId){
                        // google Id and SB User Id match --> you may stay
                        msg = "SUCCESS UserId matches with Google Id"
                        res.status(200).send({ msg: msg, redirect: null })
                        res.end()
                        db.close()
                        return
                    } else if ( docs.length > 0 && docs[0]["SBUserId"]!=SBUserId ){
                        // Google Id and SB User Id mismatch --> you redirected to right SBUID
                        var redirectURL = '/lessons?userId=' + encodeURIComponent(docs[0]["SBUserId"]);
                        msg = "ERROR UserId mismatched with Google Id. Redirected to " + redirectURL;
                        res.status(303).send({ msg: msg,
                            redirect: redirectURL
                        });
                        res.end()
                        db.close()
                        return
                    } else{
                        // Google Id nor SB UID in our dB --> Hello Unauthorized user. plz go to the login page.
                        msg = "ERROR Unauthorized user. Redirecting to login page."
                        res.status(403).send({ msg: msg, redirect: '/' });
                        res.end()
                        db.close()
                        return
                    }
                })
            })
        })(req,res)
    }
))


app.listen( argv.port, function() {
    console.log('App running in localhost:' + argv.port);
})