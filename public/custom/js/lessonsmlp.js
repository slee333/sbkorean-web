///////////////////////////////
// 	       Initialize        //
///////////////////////////////

//D3.js unable to load data locally saved. So use node js to import json object.
//Any better/faster way to do this? Need to think..
//Load Lesson data and create submenus

var QueryString = function () {
  // This function is anonymous, is executed immediately and 
  // the return value is assigned to QueryString!
  var query_string = {};
  var query = window.location.search.substring(1);
  var vars = query.split("&");
  for (var i=0;i<vars.length;i++) {
    var pair = vars[i].split("=");
        // If first entry with this name
    if (typeof query_string[pair[0]] === "undefined") {
      query_string[pair[0]] = decodeURIComponent(pair[1]);
        // If second entry with this name
    } else if (typeof query_string[pair[0]] === "string") {
      var arr = [ query_string[pair[0]],decodeURIComponent(pair[1]) ];
      query_string[pair[0]] = arr;
        // If third or later entry with this name
    } else {
      query_string[pair[0]].push(decodeURIComponent(pair[1]));
    }
  } 
  return query_string;
}();

var load_jsonData = function(filename, callback) {
	$.ajax({
	url: "/api/lessonData",
	type: "get",
	data: { "filename" : filename },
	success: function(data){
		callback(data)
	}}
)}

function signOut() {
            var auth2 = gapi.auth2.getAuthInstance();
            auth2.signOut().then(function () {
              console.log('User signed out.');
              window.location = "/" ; 
            });
        }
// Initiate Google Client (  )
var initClient = function() {

    gapi.load('auth2', function(){

        auth2 = gapi.auth2.init({
            client_id: '460158204141-aclb43a70l448iehp8s2u1u2c25f8dt7.apps.googleusercontent.com'
        }).then( function( auth ){
        	
        	// Erase this after making sign out button
        	auth2 = auth
        	GoogleUser = auth.currentUser.get();
        	if (GoogleUser.isSignedIn() == true){
			    var id_token = GoogleUser.getAuthResponse().id_token;

			    // Ajax call to verify userid and GID of the current user
			    $.ajax({
			    	type:"get",
			    	url:"/api/client_match",
			    	data: { SBUserId: QueryString["userId"], "idtoken":id_token },
			    	success: function( data ){
			    		
			    		console.log(data.msg);
			    		/*
			    		load_jsonData( "Korean_lessons.json", function(data){
							showAbout();
							console.log("Data Loaded");
							build_sublists('lesson-list', data);
						});*/

			    	}, error: function( err ){
			    		
			    		window.location = err.responseJSON.redirect;
			    		console.log(err.responseJSON.msg);
			    	}
			    })

			} else {
				console.log('User not logged-in.');
				window.location = "/"
			}
        }, function( err ){
        	console.log("ERROR: failed to initialize authentication")
        	console.log(err)
        });


    });

}();

// Track mouse position in pixels (for tooltip)
var cursorX, cursorY
document.onmousemove = function(e){
    cursorX = e.pageX;
    cursorY = e.pageY;
}

// Replacing all elements in string
String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.split(search).join(replacement);
};

// Setup global variable audioContext
window.AudioContext = window.AudioContext||window.webkitAudioContext;
var audioContext = new AudioContext();

// Initiate the page
load_jsonData( "Korean_lessons.json", function(data){
							showAbout();
							console.log("Data Loaded");
							build_sublists('lesson-list', data);
						});



//////////////////// Layout /////////////////////////////*****

var screen_height = $('.scroller-inner').height();
var header_height =  $('.main-header').outerHeight();
var body_height = screen_height - $('.main-header').outerHeight();
var margin = 20;
$('.clearfix').height((body_height - margin*2))


var build_sublists = function( divid, data ){

	var chapters = data.chapterNames;
	var lessons = data.sentenceNames;
	var chapterNames = Object.keys(chapters);

	var lists = d3.select("#" + divid ).selectAll("li")
		.data( chapterNames ).enter()
		.append('li')
		.attr('class', "icon icon-arrow-left")

	lists.append('a')
		.attr('class', "icon icon-wallet")
		.attr('href', "#")
		.html( function(d,i) { return "C" + (i+1) + ": " + chapterNames[i] })

	var divs = lists.append('div')
		.attr('class', 'mp-level')
		.attr('id', function (d,i) {return 'chap' + (i+1)})

	// Adding chapter names
	divs.append('h2')
		.html(function(d,i) { return chapterNames[i] })

	// Adding sublessons

	for (var ch= 0; ch< lists[0].length; ch++ ) {
		
		var chapterObj = chapters[ chapterNames[ch] ];

		d3.select('#chap'+(ch+1)).append('ul').selectAll('li')
			.data( Object.keys( chapterObj ) ).enter()
			.append('li').append('a')
			.attr('href', '#')
			.html( function(d,i) { 
				var title = 'L' + d.split(' ')[1] + ': ' + chapterObj[d]
				return title
			})
			.on('click', function(d, i ){
				removeLessons()
				showLessonMenu( lessons[d].split('//'), d )
			})

	}
	
	new mlPushMenu( document.getElementById( 'mp-menu' ), document.getElementById( 'trigger' ) );

}

var showLessonMenu = function( sentences, lessonNum ) {

	removeLessons()

	var content = d3.select('.clearfix')

	// Add lesson title
	content.append('h1')
		.attr('class', 'lesson-header')
		.text(lessonNum.replace("lesson","Lesson"))

	var gbtn = content.append('div')
		.attr('class', "gender-btns")
	
	// Male Button
	gbtn.append('button')
		.attr('class', "button gender-button button-circle button-highlight button-large button-selected")
		.attr('gender', "m")
		.html('남')
		.on('click', function( d, i ) {
			// Disselect all
			d3.selectAll('.gender-button').classed('button-selected', false)
			// Seelect this button
			d3.select(this).classed('button-selected', true)
		})

	// Female Button
	gbtn.append('button')
		.attr('class', "button gender-button button-circle button-highlight button-large")
		.attr('gender', "f")
		.html('여')
		.on('click', function( d, i ) {
			// Disselect all
			d3.selectAll('.gender-button').classed('button-selected', false)
			// Seelect this button
			d3.select(this).classed('button-selected', true)
		})

	var sbtn = content.append('div')
		.attr('class', "set-btns")

	var svg = content.append('svg')
				.style('height', '80%')
				.style('width', '100%')
				.attr('class', 'lesson-svg')

	// Group sentences to five elements each
	
	var group = [];
	for (var g = 0; g < Math.round( sentences.length / 5 ) ; g++  ) {
		group.push( sentences.slice( 5*g, 5*g+5 ) )

		}

	sbtn.selectAll('button').data(group).enter()
		.append('button')
		.attr('class', "button set-button button-circle button-highlight button-large")
		.attr('setNum', function(d,i) { return (i+1) })
		.html(function(d,i) { return 'Set ' + (i + 1) })
		.on('click', function( d, i ) {
			// Disselect all
			d3.selectAll('.set-button').classed('button-selected', false)
			// Seelect this button
			d3.select(this).classed('button-selected', true)

			// Remove all lessons
			//**************************
			d3.select('svg').selectAll('g').remove()
			// Add lessons 
			showLessons( svg, group[i] , lessonNum)
		})

	// Initialize lessons
	d3.select('.set-button').classed('button-selected', true)
	showLessons(svg, group[0], lessonNum)

	// Append button to quiz
	var quizButton = content.append("div")
						.attr("class","button-quiz")
						.style("position","absolute")
						.style("width", "3%")
						.style("height", (body_height) + "px")
						.style("left", "97%")
						.style("top", header_height + "px" )
						.style("background-color","gray")
						.style("opacity", "0.2")
						.style('display',"flex")
						.style("justify-content","center")
						.style("align-items","center")
						.on('mouseover', function() {
							d3.select(this).transition().duration(500).style('opacity','0.8')
						})
						.on('mouseout', function() {
							d3.select(this).transition().duration(500).style('opacity','0.2')
						})
						.on('click', function() {
							content.transition().duration(500).style("opacity", 0 )
							showQuiz(lessonNum)
							content.transition().duration(500).style("opacity", 1 )
						} )


	quizButton.append("span")
				.attr("class", "glyphicon glyphicon-chevron-right")
				.style("font-size", 40 + "px")

	// Close menu.
	d3.select('#mp-pusher').classed("mp-pushed", false)
	d3.select('#mp-pusher').style("transform", 'translate3d(0,0,0)')

	// Add sentence buttons
	function showLessons(svg, sentences, lessonNum) {

		var margin = { side: 100, top: 30 }

		rect_width = Number( svg.style('width').replace("px","") ) - margin.side*2;
		rect_height = Math.round( Number( svg.style('height').replace("px","") )/5 - margin.top*(6/5) );

		var textBox = svg.selectAll('g')
			.data(sentences).enter()
			.append('g')
			.attr('class', 'lesson-btns')
			.attr('transform', function(d,i) { return 'translate(' + margin.side + ","+ ( (i+1)*margin.top  + i*rect_height) + ")" })

		textBox.append('rect')
			.attr('width', rect_width)
			.attr('height', rect_height)
			.style('fill', '#fcd549')
			.style('stroke', 'black')
			.style('stroke-width', '0.5px')
			.on('mouseover', function() {
				d3.select(this).style('fill','#edc01e')
			})
			.on('mouseout', function() {
				d3.select(this).style('fill','#fcd549')
			})
			.on('click', function(d, i) {
				loadSoundFile( sentences[i], d3.select(".gender-button.button-selected").attr('gender') , lessonNum )
			})

		textBox.append('text')
			.attr('x', rect_width/2 )
			.attr('y', rect_height/2 + 5 )
			.attr('font-size', "20px")
			.attr('text-anchor',"middle")
			.text(function(d,i) { return sentences[i] })
			.on('click', function(d, i) {
				loadSoundFile( sentences[i], d3.select(".gender-button.button-selected").attr('gender') , lessonNum ) 
			})
			.on('mouseover', function(d, i) {
				d3.select( d3.selectAll('rect')[0][i] ).style('fill','#edc01e')
			})
			.on('mouseout', function(d, i) {
				d3.select( d3.selectAll('rect')[0][i] ).style('fill','#fcd549')
			})

	}

}

var showQuiz = function( lessonNum ) {

	//var lessonNum = Number( d3.select(".lesson-header").text().split(" ")[1] )
	var lessonSentences = [].concat.apply( [] , d3.selectAll('.set-button').data() );
	removeLessons();

	var main_div = d3.select('.clearfix');
	main_div.append("h1").text(lessonNum.replace("lesson","Lesson") + ": Quiz");

	// Append button back to lessons
	var lessonButton = main_div.append("div")
						.attr("class","button-quiz")
						.style("position","absolute")
						.style("width", "3%")
						.style("height", (body_height) + "px")
						.style("left", 0 )
						.style("top", header_height + "px" )
						.style("background-color","gray")
						.style("opacity", "0.2")
						.style('display',"flex")
						.style("justify-content","center")
						.style("align-items","center")
						.on('mouseover', function() {
							d3.select(this).transition().style('opacity','0.8')
						})
						.on('mouseout', function() {
							d3.select(this).transition().style('opacity','0.2')
						})
						.on('click', function() {
							main_div.transition().style("opacity", 0 )
							showLessonMenu( lessonSentences, lessonNum )
							main_div.transition().style("opacity", 1 )
						} );

	lessonButton.append("span")
				.attr("class", "glyphicon glyphicon-chevron-left")
				.style("font-size", 40 + "px");

	var input_div = main_div.append("div")
						.style("width", "100%")
						.style("height", "80%")
						.style("text-align", "center");

	// Add another div element for padding. This is because we cannot set "padding" based on height or width of the parent element. So annoying.
	input_div.append("div").style("height", "15%").attr('class',"div-padding");

	// Setup. Start the random number.
	var seed = Math.floor(Math.random() * lessonSentences.length );
	var gender = ["m","f"][Math.floor(Math.random()*2)];

	var playButton = input_div.append("span")
						.attr("class", "playButton glyphicon glyphicon-play-circle")
						.style("font-size", 100+"px")
						.style("color", "#ffc526")
						.on("click", function() {
							loadSoundFile( lessonSentences[seed], gender, lessonNum )
						})

	var answerInputGroup = input_div.append("div").style("text-align", "center")
						.attr("class","div-answer input-group")
						.style("margin-top", "25px")
						.style("padding-right","20%")
						.style("padding-left","20%");

	var answerInput = answerInputGroup.append("input")
							.attr("type","text")
							.attr("placeholder", "정답을 입력 해 주세요")
							.attr("class","form-control")
							.attr("id","answer")
							.style("font-size","20px");

	answerInputGroup.append("span").attr('class', "input-group-btn")
				.append("button")
				.attr("class", "btn btn-default")
				.attr("type", "button")
				.attr("id","button-answer")
				.text("제출")
				.on("click", function () { 
					quizScore( lessonSentences[seed], $("#answer").val() )

					// Re-assign randoms
					seed = Math.floor(Math.random() * lessonSentences.length );
					gender = ["m","f"][Math.floor(Math.random()*2)];
					
				})

	var quizScore = function ( originalString, answerString ) {
		var original_ = originalString.replaceAll("!","").replaceAll(",","").replaceAll("?","").replaceAll(".","").replaceAll(" ","");
		var answer_ = answerString.replaceAll("!","").replaceAll(",","").replaceAll("?","").replaceAll(".","").replaceAll(" ","");

		// Clear the input field
		$("#answer").val("");

		// Where the scoring algorithm kicks in
		if (original_ == answer_) {
			var right = Number(d3.select(".score-right").attr("data")) + 1;
			d3.select(".score-right").text( "Right answers: " + right )
				.attr("data", right)
		} else {
			var wrong = Number(d3.select(".score-wrong").attr("data")) + 1;
			d3.select(".score-wrong").text( "Wrong answers: " + wrong )
				.attr("data", wrong)
		}

		// Ideally update write and wrong to the server?

		var now = new Date().getTime() / 1000; // Current timestamp in seconds
		var today = now - (now % (60*60*24)); // Timestamp for current day in UTC

		// Save current score, current time to the dB
		recordScore( lessonNum.replace("lesson ", "lesson"), today, 
			d3.select(".score-right").attr("data") ,  d3.select(".score-wrong").attr("data"))
	}

	var recordScore = function ( lessonNumber, timestamp, right, wrong) {
		/*
		lessonNumber  : Lesson number in form of 'Lesson #'
		timestamp     : epoch timestamp of today (in UTC)
		right   	  : Number of right answers
		wrong 		  : Number of wrong answers
		*/

		$.ajax({
			url: "/api/recordScore",
			type: "post",
			data: { "userId" : QueryString['userId'], "lessonNum": lessonNumber, "timestamp": timestamp, "right": right, "wrong": wrong},
			success: function(data){
				console.log( " Score updated " )
			},
			error: function(err) {
				console.error(err)
			}
		})
	}

	// Get Current score for today
	var getScore = function ( lessonNum, timestamp ) {

		/*
		lessonNum  	  : Lesson number in form of 'Lesson #'
		timestamp     : epoch timestamp of today (in UTC)
		*/
		
		$.ajax({
			url: "/api/score",
			type: "get",
			data: { "userId": QueryString['userId'] , "lessonNum": lessonNum, "timestamp": timestamp },  // lessonNum: in form of "lessonX" - X: Integer. Potentially add timestamp?
			success: function(data){
				console.log(data)
								
				d3.select(".score-right").text( "Right answers: " + data.right )
					.attr("data", data.right)
				d3.select(".score-wrong").text( "Wrong answers: " + data.wrong )
					.attr("data", data.wrong)
			},
			error: function(err) {
				console.log(err)
			}
		})
	}

	input_div.append("div").style("text-align", "center")
				.append("p")
				.attr("class", "score score-right")

	input_div.append("div").style("text-align", "center")
				.append("p")
				.attr("class", "score score-wrong")

	
	var now = new Date().getTime() / 1000; // Current timestamp in seconds
	var today = now - (now % (60*60*24));
	getScore( lessonNum.replace("lesson ", "lesson"), today )

}

var showAbout = function( ) {
	load_jsonData("Korean_pages.json", function(data){
		var content = data.about;
		removeLessons()

		var main_div = d3.select(".clearfix");
		main_div.append("h1")
			.html("<b>스피치 바나나에 관하여</b>")

		var division = main_div.append('div')
							.style('width', "100%")
							.style('height', "4px")
							.style('background-color', "#ffc526")

		main_div.selectAll('p')
			.data( Object.keys(content) ).enter()
			.append('p')
			.style("font-size", 18+"px")
			.style("margin-top","1%")
			.html( function(d, i){ return content[d] } )		// used .html instead of .text to use line break tag (<br>) included in the text
			.attr('class', function(d,i){
				if (d == 'help'){
					return "about-help main-paragraph"
				} else {
					return "main-paragraph"
				};
		});
	})
};

var showInstruction = function( ) {
	load_jsonData( "Korean_pages.json", function(data){
		var content= data.instruction;
		removeLessons()

		var main_div = d3.select(".clearfix");
		main_div.append("h1")
			.html("<b>사용방법</b>");

		var division = main_div.append('div')
							.style('width', "100%")
							.style('height', "4px")
							.style('background-color', "#ffc526");

		main_div.selectAll('p')
			.data( Object.keys(content) ).enter()
			.append('p')
			.style("font-size", 18+"px")
			.style("margin-top","1%")
			.html( function(d, i){ return content[d] } )		// used .html instead of .text to use line break tag (<br>) included in the text
			.attr('class', "main-paragraph");
	})
};



var showProgress = function( data ) {

	var getAllScore = function ( lessonNums, timeRange, keys, callback ) {

		/*
		lessonNums    : Lesson numbers, list of strings in form 'Lesson#'
		*/
		
		$.ajax({
			url: "/api/allScore",
			type: "get",
			data: { "userId": QueryString['userId'] , "timeRange": timeRange, "keys": keys, "lessonNums": lessonNums },  // lessonNum: in form of "lessonX" - X: Integer. Potentially add timestamp?
			success: function(data){
				console.log("Scores successfully loaded")
				
				//$("#datastore").data( "allScore", data )
				callback( data )

			},
			error: function(err) {
				console.log(err)
			}
		})
	}

	var plotScores = function( data ) {
		console.log( data )
	}

	removeLessons()

	// Create div for data storage
	//var datastore = d3.select(".clearfix").append("div").attr("id","datastore")

	var main_div = d3.select(".clearfix");
		main_div.append("h1")
			.html("<b>진행상황</b>");

	var division = main_div.append('div')
						.style('width', "100%")
						.style('height', "4px")
						.style('background-color', "#ffc526");

	////// Row: Time //////
	var timePanel = main_div.append("div")
							.attr("id","timePanel")
							.attr("class","row controlPanel")
	
	// Add Daterange picker	
	var timeRangeCol = timePanel.append("div")
							.attr("class", "col-md-4")
	
	timeRangeCol.append("h4")
		.html("열람 시간: ")
		.style("width","20%")
		.style("margin-right","3%")
		.style("display","inline-block")
		.style("margin-bottom","20px")

	var timeRange = timeRangeCol.append("input")
						.attr("type","text")
						.attr("id","progress_timerange")
						.attr("class","form-control")
						.attr("value", "01/01/2017 - 12/31/2017")
						.style("display","inline-block")
						.style("width","75%")
						.style("font-size","large")

	timeRangeCol.append("i")
		.attr("class", "glyphicon glyphicon-calendar fa fa-calendar")
		.style("position","absolute")
		.style("top","auto")
		.style("bottom","22px")
		.style("right","32px")

	// Add Predefiend daterange picker	
	/*var PDTR_col = timePanel.append("div")
						.attr("class", "col-md-3");
	PDTR_col.append("h4")
		.html("기간: ")
		.style("display","inline-block")
		.style("width","20%")

	var PDTR_dat = [{"timestamp": moment().subtract(3, 'days' ).unix(), "text": "3일" },
					{"timestamp": moment().subtract(1, 'week' ).unix(), "text": "일주"}, 
					{"timestamp": moment().subtract(1, 'months').unix(), "text": "한달"}, 
					{"timestamp": moment().subtract(1, 'year' ).unix(), "text":"1년" }
				]

	var radioBtns = PDTR_col.append("div")
		.attr("id","radio-btn-pdtr")
		.style("width","80%")
		.selectAll("input")
			.data(PDTR_dat).enter()
			.append("input")
			.attr("type","radio")
			.attr("class", "radio-btns-pdtr")
			.attr("value", function(d,i){return d.text})
			.attr("timestamp", function(d,i){ return d.timestamp });

	$("#radio-btn-pdtr").multiPicker({
		selector: "radio",
		cssOptions:{
			size: "large",
			element: {
				"font-size": "12px",
				"color": "#3a3a3a",
			},
			selected: {
				"border-color": "#ffc526",
				"font-size": "12px",
				"font-weight": "bold"
			},
			picker: {
				"border-color": "transparent"
			}
		}
	})*/

	var chapterCol = timePanel.append("div")
							.attr("class", "col-md-8")
	
	var chapterHeader = chapterCol.append("div").attr("class","col-md-3")

	chapterHeader.append("h4")
		.html("표시할 챕터 선택: ")
		.style("display","inline-block")

	chapters = data.chapterNames;
	chapterNames = Object.keys(chapters);

	//
	var chapterMenus = chapterCol.append("div").attr("class","col-md-9")

	var chapterSelectMenu = chapterMenus.append("select")
								.attr("id","chapter-multiple-selected")
								.attr("multiple","multiple")

	/*$('#chapter-multiple-selected').multiselect({
		buttonClass: 'btn btn-default btn-navplot',
		onChange: function(option,checked){
			var value = $(option).val();

			if (checked == true) {
			
			}
			else {

			}},
		buttonText: function(options, select) {
    
            }
	}); */

	optgroup = [];
	for ( var i = 0 ; i < chapterNames.length; i++ ) {
		var options = [];
		var lessons = Object.keys(chapters[chapterNames[i]]);
		for (var j = 0; j < lessons.length; j++ ) {
			options.push( { "label": lessons[j].replace("lesson","제 ") + "과: " + chapters[chapterNames[i]][lessons[j]] , 
							"value": lessons[j].replace("lesson ","lesson") } )
		}
		optgroup.push( {"label": chapterNames[i], "children": options} )
	}
	$('#chapter-multiple-selected').multiselect({
		buttonClass: 'btn btn-default btn-navplot',
        enableClickableOptGroups: true,
        enableCollapsibleOptGroups: true,
        includeSelectAllOption: true,
        onChange: function(option, checked){

        	var currTimes = $("#progress_timerange").val().split(" - ");
        	var startTime = new Date(currTimes[0].split("/")[0] ,currTimes[0].split("/")[1]-1 ,currTimes[0].split("/")[2]).getTime()/1000
        	var endTime = new Date(currTimes[1].split("/")[0] ,currTimes[1].split("/")[1]-1 ,currTimes[1].split("/")[2]).getTime()/1000

        	getAllScore( $('#chapter-multiple-selected').val(), [startTime, endTime], "lessons", function(data){
	    		var data_mod = $.map( data, function( value, index) { return [{"lesson": index.replace("lesson","과 "), "score": value}] } );
	    		stackedBarChart( svg_lpp, margin_lpp, layer_lpp, data_mod )
    		})

        	getAllScore( $('#chapter-multiple-selected').val(), [startTime, endTime], "date", function(data){
	    		//var data_mod = $.map( data, function( value, index) { return [{"lesson": index.replace("lesson","과 "), "score": value}] } );
	    		//stackedBarChart( svg_lpp, margin_lpp, layer_lpp, data_mod )

	    		console.log("wawawa", data)
    		})
        }
	});
    $('#chapter-multiple-selected').multiselect('dataprovider', optgroup);

	$("#progress_timerange").daterangepicker({
		startDate: moment().subtract(29, 'days'),
        endDate: moment(),
        ranges: {
           '오늘': [moment(), moment()],
           '어제': [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
           '지난 7일': [moment().subtract(6, 'days'), moment()],
           '지난 30일': [moment().subtract(29, 'days'), moment()],
           '이번 달': [moment().startOf('month'), moment().endOf('month')],
           '지난 달': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')]
        },
        locale: {
              applyLabel: '결정',
              cancelLabel: '취소',
              fromLabel: '시작 날짜',
              toLabel: '종료 날짜',
              customRangeLabel: '직접 정하기',
              daysOfWeek: ['일', '월', '화', '수', '목', '금','토'],
              monthNames: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
              firstDay: 1,
              format: 'YYYY/MM/DD'
          }
    }, function( start, end ){ 

    	var startTime = new Date( start.year() , start.month() , start.date()	).getTime() / 1000;
    	var endTime = new Date( end.year() , end.month() , end.date()	).getTime() / 1000;

    	getAllScore( $('#chapter-multiple-selected').val(), [startTime, endTime], "lessons", function(data){
    		var data_mod = $.map( data, function( value, index) { return [{"lesson": index.replace("lesson","과 "), "score": value}] } );
    		stackedBarChart( svg_lpp, margin_lpp, layer_lpp, data_mod )
    	})
    });

	/// Add another Row for plots/bar graphs///
	var plotPanel = main_div.append("div")
							.attr("id","plotPanel")
							.attr("class","row plotPanel")
							.style("height", "80%")

	// Add column for right/wrong percentages of each lesson
	var col_lessonPercent = plotPanel.append("div")
								.attr("class", "col-md-6")
								.style("height", "50%")
	col_lessonPercent.append("h4")
		.text("과별 정답률")

	//https://bl.ocks.org/mbostock/3886394
	var svg_lpp = col_lessonPercent.append("div")
					.style("height","100%")
					.attr("class","container-lpp")
					.append("svg")
					.attr("class", "svg-lpp well")
					.style("height", "90%"),
		margin_lpp = {top: 40, right: 60, bottom: 20, left: 20},
		layer_lpp = ["right", "wrong"];

}

var stackedBarChart = function( svg, margin, layer, data ) {

	//https://bl.ocks.org/mbostock/1134768

	// Remove all other graphics on the svg
	svg.selectAll("g").remove()

	if (data.length == 0) {
		return
	}

	// Define tooltip menu
    var tooltip = d3.select( svg.node().parentNode ).append("div")
					.attr("class", "tooltip tooltip-lpp")
	        		.style("opacity", 0);

	var width = Number(  svg.style("width").replace("px","")  ) - margin.left - margin.right;
	var height = Number( svg.style("height").replace("px","")  ) - margin.top - margin.bottom;
	var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	var x = d3.scale.ordinal()
	    .rangeRoundBands([0, width]);

	var y = d3.scale.linear()
	    .rangeRound([height, 0]);

	var z = d3.scale.category10();
	var z = ["#f1b50e", "#bfbaa2"]

	var xAxis = d3.svg.axis()
	    .scale(x)
	    .orient("bottom")
	    //.tickFormat(d3.time.format("%b"));

	var yAxis = d3.svg.axis()
	    .scale(y)
	    .orient("right");

	var layers = d3.layout.stack()(layer.map(function(c) {
    	return data.map(function(d) {
    		return {x: d.lesson, y: d.score[c]};
    	});
    }));

	x.domain(layers[0].map(function(d) { return d.x; }));
	y.domain([0, d3.max(layers[layers.length - 1], function(d) { return d.y0 + d.y; })]).nice();

	var layer = svg.selectAll(".layer")
    	.data(layers)
    .enter().append("g")
		.attr("class", "layer")
    	.style("fill", function(d, i) { return z[i]; });

    layer.selectAll("rect")
    	.data(function(d) { return d; })
    .enter().append("rect")
    	.attr("x", function(d) { return x(d.x); })
    	.attr("y", function(d) { return y(d.y + d.y0); })
    	.attr("height", function(d) { return y(d.y0) - y(d.y + d.y0); })
    	.attr("width", x.rangeBand() - 1)
    	.on('mouseover', function(d, i) {
            tooltip.transition()
                .duration(200)
                .style('opacity', 0.9 );
            d3.select(this).transition()
            	.duration(200)
            	.style('opacity', 0.7 );

            tooltip.html( "<b>" + d.x + ":</b>" + "<br/><b>정답: </b>" + layers[0][i].y + "<br/><b>오답: </b>" + 
            	layers[1][i].y + "<br/><b>정답률: </b>" + Math.round((layers[0][i].y / (layers[1][i].y+layers[1][i].y0))*100) +"%" )
                .style("left", ( cursorX - Number(tooltip.style("width").replace("px",""))/2 ) + "px")
                .style("top", ( cursorY - 4*Number(tooltip.style("height").replace("px","")) ) + "px");
        })
	  	.on('mouseout', function(d, i) {
            tooltip.transition()
                .duration(500)
                .style('opacity', 0);
            d3.select(this).transition()
            	.duration(200)
            	.style('opacity', 1 );
        });

	svg.append("g")
    	.attr("class", "axis axis--x")
    	.attr("transform", "translate(0," + height + ")")
    	.call(xAxis);

	svg.append("g")
    	.attr("class", "axis axis--y")
    	.attr("transform", "translate(" + width + ",0)")
    	.call(yAxis);

}

var removeLessons = function() {
	
	var node = d3.select('.clearfix').node()

	while (node.hasChildNodes()) {
    	node.removeChild(node.lastChild);
	}
}

var loadSoundFile = function( sentenceString, gender, lessonNum ) {

	sentenceString = sentenceString.replace(',','')
	sentenceString = sentenceString.replace('!','')
	sentenceString = sentenceString.replace('?','')
	sentenceString = sentenceString.replace('.','')

	var filename = sentenceString + "_" + gender +".wav";
	var lessonname = lessonNum.replace(' ', '') // d3.select('.lesson-header').text().toLowerCase().replace(' ','');


	// From: http://www.willvillanueva.com/the-web-audio-api-from-nodeexpress-to-your-browser/

	function loadSound( context ) {
		var request = new XMLHttpRequest();
		request.open("GET", "/api/soundData?lesson=" + lessonname + "&fileName=" + filename, true); 
		request.responseType = "arraybuffer";

		request.onload = function() {
		    var Data = request.response;
		    process(Data, context);
		};

		request.send();
	 }

	function process(Data, context) {
	  	source = context.createBufferSource(); // Create Sound Source
	  	context.decodeAudioData(Data, function(buffer){
	   		source.buffer = buffer;
	   		source.connect(context.destination); 
	   		source.start(context.currentTime);

	})}

	loadSound(audioContext) // Using global variable audioContext defined at initialization

}

// When menu buttons are clicked:
$('#about-page').on('click', function(){ 
	showAbout()

	// Close Menu
	d3.select('#mp-pusher').classed("mp-pushed", false)
	d3.select('#mp-pusher').style("transform", 'translate3d(0,0,0)')
});

$('#instruction-page').on('click', function(){ 
	showInstruction()

	// Close Menu
	d3.select('#mp-pusher').classed("mp-pushed", false)
	d3.select('#mp-pusher').style("transform", 'translate3d(0,0,0)')
});

$('#progress-page').on('click', function(){ 

	load_jsonData( "Korean_lessons.json", function(data){
		showProgress(data)
 	});

	// Close Menu
	d3.select('#mp-pusher').classed("mp-pushed", false)
	d3.select('#mp-pusher').style("transform", 'translate3d(0,0,0)')
});