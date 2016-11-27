// start.js

// requires
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

var jsonfile = require( 'jsonfile' ); // to get local json data. Can use custom database instead, but for simplicity..

function getDataFile( filename, callback ) {

    var dataFilePath = path.resolve("./data/" + filename );

    //jsonfile.readFile( dataFilePath, function( err, credentials ) {
    //    console.log(credentials)
    //})

    jsonfile.readFile( dataFilePath, function( err, jsondata ) {
        
        // When data file has problems
        if (err) {      
            console.log(err)
            return;
        }

        callback(jsondata)

    })
}


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

app.get( '/api/lessonData', function ( req, res) {
    getDataFile( 'Korean_lessons.json', function( jsondata ) {
        res.status(201).json(jsondata)
    })
})

app.listen( argv.port, function() {
    console.log('App running in localhost:' + argv.port);
})