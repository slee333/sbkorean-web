///////////////////////////////
// 	       Initialize        //
///////////////////////////////

//D3.js unable to load data locally saved. So use node js to import json object.
//Any better/faster way to do this? Need to think..
//Load Lesson data and create submenus

var load_jsonData = function(filename, callback) {
	$.ajax({
	url: "/api/lessonData",
	type: "get",
	data: { "filename" : filename },
	success: function(data){
		callback(data)
	}}
)}

// Initiate Google Client (  )
var initClient = function() {
	var email = readCookie("sb_email");
	var secret = readCookie("sb_secret");

	if ( email != null){
		if (secret != null ) {
			$.ajax({
				type:"get",
				url:"/api/client_match",
				data: { "SBUserId": QueryString["userId"], "email": email, "emailCRC": crc32(email), "secret": secret },
				success: function( data ){
					
					console.log(data.msg);
					var lang = QueryString['lang'] || 'eng'; // default value: English
					load_jsonData( "/lang/"+ lang +"/lessons.json", function(data){
						showAbout();
						console.log("Data Loaded");
						build_sublists('lesson-list', data);
					});

				}, error: function( err ){
					
					window.location = err.responseJSON.redirect;
					console.log(err.responseJSON.msg);
				}
			})
		} else {
			window.location = "/"
			console.log( "Not enough information to verify user. Please retry" )
		}
	} else {
		window.location = "/"
		console.log( "Not enough information to verify user. Please retry" )
	}
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
var audioBgContext = new AudioContext(); // audioContext for background noise

var bgGainNode = audioBgContext.createGain();
localStorage.setItem("noiselvl","0")
bgGainNode.gain.value = Number(localStorage.noiselvl);
bgGainNode.connect(audioBgContext.destination);

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
		.html( function(d,i) { return "제 " + (i+1) + "장: " + chapterNames[i] })

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
			.attr('class','icon icon-pen')
			.attr('href', '#')
			.html( function(d,i) { 
				var title = '레슨 ' + d.split(' ')[1] + ': ' + chapterObj[d]
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
		.text(  lessonNum.replace("lesson","레슨")  )

	// Add row

	var btn_panel = content.append("div")
		.attr("class","row")
		.attr("id","button-panel")

	var gbtn = btn_panel.append('div')
		.attr('class', "gender-btns col-md-3")
	
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


	var noiseDiv = btn_panel.append("div")
		.attr("class","col-md-4 well")
		.style("margin", "0")
		.style("background-color","white")
		.style("border","none")
		.style("-webkit-box-shadow","none")
		.style("box-shadow","none")
	// Where white noise tab comes in

	noiseDiv.append("div")
		.attr("class","col-md-3")
		.html("잡음 수치: ") // Noise Level:

	noise_slider = noiseDiv.append("input")
		.attr("id", "noise-bar")
		.attr("type","text")
		.attr("data-slider-id","noiseBar");

	noiseDiv.append("span")
		.attr("id","noise-bar-label")
		.style("padding-left","30px")
		.html("현 수치: ") // Current value
		.append("span")
			.attr("id","noise-bar-val")

	$("#noise-bar-val").text("0")
	$("#noise-bar").slider({
		id: "noise-slider",
		tooltip: "always",
		min: 0,
		max: 100,
		value: Number(localStorage.noiselvl)*100
	});

	bgGainNode.gain.value = Number(localStorage.noiselvl)

	$("#noise-bar").on("change", function(slideEvt){

		$("#noise-bar-val").text(slideEvt.value.newValue)	
		bgGainNode.gain.value = Number(slideEvt.value.newValue) / 100; 
		localStorage.setItem("noiselvl", Number(slideEvt.value.newValue) / 100 )
	})

	// Set buttons
	var sbtn = btn_panel.append('div')
		.attr('class', "set-btns col-md-5")
		.style("text-align", "center")

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
		.html(function(d,i) { return '세트' + (i + 1) }) // Set Number
		.style("font-size","12pt")
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
						.style("opacity", "0.7")
						.style('display',"flex")
						.style("justify-content","center")
						.style("align-items","center")
						.on('mouseover', function() {
							d3.select(this).transition().duration(500).style('opacity','0.95')
						})
						.on('mouseout', function() {
							d3.select(this).transition().duration(500).style('opacity','0.7')
						})
						.on('click', function() {
							content.transition().duration(500).style("opacity", 0 )
							showQuiz(lessonNum)
							content.transition().duration(500).style("opacity", 1 )
						} )

	quizButton.append("p")
		.html("<b>퀴즈</b>")
		.style("font-size", 20 + "px")
		.style("position", "absolute")
		.style( "top", "43%" )
		.style("color", "#e50000")

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
				loadLessonFile( sentences[i], d3.select(".gender-button.button-selected").attr('gender') , lessonNum )
			})

		textBox.append('text')
			.attr('x', rect_width/2 )
			.attr('y', rect_height/2 + 5 )
			.attr('font-size', "20px")
			.attr('text-anchor',"middle")
			.text(function(d,i) { return sentences[i] })
			.on('click', function(d, i) {
				loadLessonFile( sentences[i], d3.select(".gender-button.button-selected").attr('gender') , lessonNum ) 
			})
			.on('mouseover', function(d, i) {
				d3.select( d3.selectAll('rect')[0][i] ).style('fill','#edc01e')
			})
			.on('mouseout', function(d, i) {
				d3.select( d3.selectAll('rect')[0][i] ).style('fill','#fcd549')
			})

	}

}

var getScore = function ( lessonNum, timestamp, callback) {

	/*
	lessonNum  	  : Lesson number in form of 'Lesson #'
	timestamp     : epoch timestamp of today (in UTC)
	*/
	
	$.ajax({
		url: "/api/score",
		type: "get",
		data: { "userId": QueryString['userId'] , "lessonNum": lessonNum, "timestamp": timestamp },  // lessonNum: in form of "lessonX" - X: Integer. Potentially add timestamp?
		success: function(data){ callback(data) },
		error: function(err) {
			console.log(err)
			window.location = err.responseJSON.redirect;
		}
	})
}

var recordScore = function ( lessonNumber, timestamp, right_sentences, wrong_sentences, right_words, wrong_words, replay) {
	/*
	lessonNumber  : Lesson number in form of 'Lesson #'
	timestamp     : epoch timestamp of today (in UTC)
	right   	  : Number of right answers
	wrong 		  : Number of wrong answers
	*/

	$.ajax({
		url: "/api/recordScore",
		type: "post",
		data: { "userId" : QueryString['userId'], "lessonNum": lessonNumber, "timestamp": timestamp, 
		"right_sentences": right_sentences, "wrong_sentences": wrong_sentences, "right_words": right_words,
		"wrong_words": wrong_words, "replay": replay},

		success: function(data){
			console.log( " Score updated " )
		},
		error: function(err) {
			console.error(err)
			window.location = err.responseJSON.redirect;
		}
	})
}

var showProfile = function () {
	/*

	Function to show profile page.
	Content of profile page: needs discussion with Tilak. Include PW, etc?

	*/

	removeLessons();

	var email = readCookie("sb_email");
	var secret = readCookie("sb_secret");

	$.ajax({
		type:"get",
		url:"/api/client_match",
		data: { "SBUserId": QueryString["userId"], "email": email, "emailCRC": crc32(email), "secret": secret },
		success: function( data ){
			
			var main_div = d3.select(".clearfix");
				main_div.append("h1")
					.html("<b>회원 정보</b>"); // Profile Page

			var division = main_div.append('div')
								.style('width', "100%")
								.style('height', "4px")
								.style('background-color', "#ffc526")

			var profileMenu = main_div.append("div")
								.attr("class","profile-content")
								.style("margin-top","20px")

			var profileEmail = profileMenu.append("div")
								.attr("id","profile-info-email")
								.attr("class", "profile-menu col-md-12")

			profileEmail.append("div").attr("class","col-md-3").html("이메일"); //email
			profileEmail.append("div").attr("class","col-md-9").html( readCookie("sb_email") )

			// show services user's using.
			// allow password change

			var profileService = profileMenu.append("div")
									.attr("id","profile-info-service")
									.attr("class", "profile-menu col-md-12");

			profileService.append("div").attr("class","col-md-3").html("사용중인 서비스"); // service in use
			profileService.append("div").attr("class","col-md-9").html( data.accountServices )

			// Append the part that showsp service information

			if (data.accountServices == "Standard"){
				var profilePassword= profileMenu.append("div")
										.attr("id","profile-info-password")
										.attr("class", "profile-menu col-md-12");

				profilePassword.append("div").attr("class","col-md-3").html("비밀번호"); // Change password
				profilePassword.append("div").attr("class","col-md-9")
									.append( "button" )
										.attr("class", "btn btn-secondary")
										.attr("id","pwChangeBtn")
										.text("비밀번호 변경")

				var changePassword = profileMenu.append("div")
									.attr("id", "profile-change-password")
									.attr("class", "reset-password col-md-12 well");


				var cpwRow = changePassword.append("div").attr("class", "profile-menu row");

				cpwRow.append("div").attr("class","col-md-2").html("현 비밀번호"); // Current Password
				cpwRow.append("div").attr("class","col-md-2")
									.append( "input" )
										.attr("class", "form-control")
										.attr("id","currPW")
										.attr("type","password");

				cpwRow.append("div").attr("class","col-md-2").html("비밀번호 재입력"); // Current Password (repeat)
				cpwRow.append("div").attr("class","col-md-2")
									.append( "input" )
										.attr("class", "form-control")
										.attr("id","currPW_r")
										.attr("type","password");

				cpwRow.append("div").attr("class","col-md-2").html("새 비밀번호"); // Change password
				cpwRow.append("div").attr("class","col-md-2")
									.append( "input" )
										.attr("class", "form-control")
										.attr("id","newPW")
										.attr("type","password");

				changePassword.append("div").attr("class","row")
						.append("div").attr("class","col-md-12")
						.append("button").attr("class", "btn btn-primary center-block")
									.attr("id","btn-change-pw")
									.text("비밀번호 변경하기")
									.style("width", "80%")


				d3.select("#pwChangeBtn")
					.on("click", function() {
						$(".reset-password").toggle();

					})

				d3.select("#btn-change-pw").on("click", function(){
					var currPW = $("#currPW").val();
					var currPW_r = $("#currPW_r").val();
					var newPW = $("#newPW").val();

					if ( email != null){
						if (secret != null ) {

							$.ajax({
								type:"get",
								url:"/api/client_match",
								data: { "SBUserId": QueryString["userId"], "email": email, "emailCRC": crc32(email), "secret": secret },
								success: function( data ){
									
									// Client successfully matches

								}, error: function( err ){
									window.location = err.responseJSON.redirect;
									console.log(err);
								},
								complete: function(){
									$.ajax({
										type: "post",
										url: "/login/reset",
										data: { "currPW": currPW, "currPW_r": currPW_r, "newPW": newPW, "emailCRC": crc32(email)  },
										success: function(data2) {
											window.location = "/lessons?userId=" + QueryString["userId"];
											alert("password resetted")
										},
										error: function(err2) {
											// Handle errors here
												
											console.log(err2)
											alert(err2.responseJSON.msg)
										}
									});
								}
							});

						} else {
							window.location = "/"
							console.log( "Not enough information to verify user. Please retry" )
						}
					} else {
						window.location = "/"
						console.log( "Not enough information to verify user. Please retry" )
					}



				})
			}

		}, error: function( err ){
			window.location = err.responseJSON.redirect;
			console.log(err);
		}
	});


}

var showQuiz = function( lessonNum ) {

	//var lessonNum = Number( d3.select(".lesson-header").text().split(" ")[1] )
	var lessonSentences = [].concat.apply( [] , d3.selectAll('.set-button').data() );
	removeLessons();

	var main_div = d3.select('.clearfix');
	main_div.append("h1").text(  lessonNum.replace("lesson","레슨") + " : 퀴즈"  );

	var toolbar = main_div.append("div")
		.attr("class","row")

	var placeholder_left = toolbar.append("div")
		.attr("class","col-md-3")

	var noiseDiv = toolbar.append("div")
		.attr("class","col-md-4 well")
		.style("margin", "0")
		.style("background-color","white")
		.style("border","none")
		.style("-webkit-box-shadow","none")
		.style("box-shadow","none")
	// Where white noise tab comes in

	noiseDiv.append("div")
		.attr("class","col-md-3")
		.html("잡음 수치: ") // Noise Level:

	noise_slider = noiseDiv.append("input")
		.attr("id", "noise-bar")
		.attr("type","text")
		.attr("data-slider-id","noiseBar");

	noiseDiv.append("span")
		.attr("id","noise-bar-label")
		.style("padding-left","30px")
		.html("현 수치: ") // Current value
		.append("span")
			.attr("id","noise-bar-val")

	$("#noise-bar-val").text("0")
	$("#noise-bar").slider({
		id: "noise-slider",
		tooltip: "always",
		min: 0,
		max: 100,
		value: Number(localStorage.noiselvl)*100
	});

	bgGainNode.gain.value = Number(localStorage.noiselvl)
	
	$("#noise-bar").on("change", function(slideEvt){

		$("#noise-bar-val").text(slideEvt.value.newValue)	
		bgGainNode.gain.value = Number(slideEvt.value.newValue) / 100; 
		localStorage.setItem("noiselvl", Number(slideEvt.value.newValue) / 100 )
	})

	// Append button back to lessons
	var lessonButton = main_div.append("div")
						.attr("class","button-quiz")
						.style("position","absolute")
						.style("width", "3%")
						.style("height", (body_height) + "px")
						.style("left", 0 )
						.style("top", header_height + "px" )
						.style("background-color","gray")
						.style("opacity", "0.7")
						.style('display',"flex")
						.style("justify-content","center")
						.style("align-items","center")
						.on('mouseover', function() {
							d3.select(this).transition().style('opacity','0.95')
						})
						.on('mouseout', function() {
							d3.select(this).transition().style('opacity','0.7')
						})
						.on('click', function() {
							main_div.transition().style("opacity", 0 )
							showLessonMenu( lessonSentences, lessonNum )
							main_div.transition().style("opacity", 1 )
						} );

	lessonButton.append("p")
		.html("<b>레슨</b>")
		.style("font-size", 20 + "px")
		.style("position", "absolute")
		.style( "top", "43%" )
		.style("color", "#e50000")

	lessonButton.append("span")
				.attr("class", "glyphicon glyphicon-chevron-left")
				.style("font-size", 40 + "px");

	var input_div = main_div.append("div")
						.style("width", "100%")
						.style("height", "80%")
						.style("text-align", "center");

	// Add another div element for padding. This is because we cannot set "padding" based on height or width of the parent element. So annoying.
	input_div.append("div").style("height", "5%").attr('class',"div-padding");

	// Setup. Start the random number.
	var seed = Math.floor(Math.random() * lessonSentences.length );
	var gender = ["m","f"][Math.floor(Math.random()*2)];

	var playButton = input_div.append("span")
						.attr("class", "playButton glyphicon glyphicon-play-circle")
						.style("font-size", 100+"px")
						.style("color", "#ffc526")
						.on("click", function() {
							loadLessonFile( lessonSentences[seed], gender, lessonNum );

							if ($(".repeat-button").length){
								console.log("repeat clicked")
								var repeat_counts=  Number(d3.select(".replay-counts").attr("data")) + 1 ;
								d3.select(".replay-counts").text( "재시도 횟수: " + repeat_counts )
									.attr("data", repeat_counts)
								recordScore( lessonNum.replace("lesson ", "lesson"), today, 
									d3.select(".score-right_sentences").attr("data") ,  d3.select(".score-wrong_sentences").attr("data"), 
									d3.select(".score-right_words").attr("data"), d3.select(".score-wrong_words").attr("data"), 
									d3.select(".replay-counts").attr("data") )
							}
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
					if ($(this).attr("class") == "btn btn-default") {
						// Appear right answer
						$(".answer-original").text("정답   : " + lessonSentences[seed])
						$(".answer-user").text("나의 답: " + $("#answer").val() )

						quizScore( lessonSentences[seed], $("#answer").val() )
						
						$("input").prop("disabled", true)
						$(this).text("계속")
						$(this).addClass( "btn-proceed" )
						playButton.transition().duration(200).attr("class", "playButton glyphicon glyphicon-repeat repeat-button")
						
						//
					} else {
						// Re-assign randoms
						seed = Math.floor(Math.random() * lessonSentences.length );
						gender = ["m","f"][Math.floor(Math.random()*2)];

						// Remove class, change button text, change icon, remove answers.
						$(".answer-original").text("")
						$(".answer-user").text("")
						$("input").prop("disabled", false)
						$(this).text("제출")
						$(this).attr("class", "btn btn-default" )
						playButton.transition().duration(200).attr("class", "playButton glyphicon glyphicon-play-circle")
					}
				})

	/*
	Score quizes.
	*/
	var quizScore = function ( originalString, answerString ) {

		// Score word for words
		var original_words = originalString.replaceAll("!","").replaceAll(",","").replaceAll("?","").replaceAll(".","").split(" ");
		var answer_words = answerString.replaceAll("!","").replaceAll(",","").replaceAll("?","").replaceAll(".","").split(" ");

		if (original_words.length > answer_words.length){
			for (var words = 0; words < (original_words.length - answer_words.length); words ++ ) {
				answer_words.push("")
			}
		}

		var right_words = 0;
		var wrong_words = 0;
		
		for (var i = 0; i < original_words.length ; i++ ){
			if (original_words[i] == answer_words[i]) {
				right_words += 1;
			} else {
				wrong_words += 1;
			}
		}
		
		var right_words = Number(d3.select(".score-right_words").attr("data")) + right_words;
		var wrong_words = Number(d3.select(".score-wrong_words").attr("data")) + wrong_words;
		d3.select(".score-right_words").text( "맞은 단어: " + right_words )
				.attr("data", right_words)
		d3.select(".score-wrong_words").text( "틀린 단어: " + wrong_words )
				.attr("data", wrong_words)

		// Score sentence to sentence
		var original_ = originalString.replaceAll("!","").replaceAll(",","").replaceAll("?","").replaceAll(".","").replaceAll(" ","");
		var answer_ = answerString.replaceAll("!","").replaceAll(",","").replaceAll("?","").replaceAll(".","").replaceAll(" ","");

		// Modify: words that got right, etc.

		// Clear the input field
		$("#answer").val("");

		// Where the scoring algorithm kicks in
		if (original_ == answer_) {
			var right_sentences = Number(d3.select(".score-right_sentences").attr("data")) + 1;
			d3.select(".score-right_sentences").text( "맞은 문장: " + right_sentences )
				.attr("data", right_sentences)
		} else {
			var wrong_sentences = Number(d3.select(".score-wrong_sentences").attr("data")) + 1;
			d3.select(".score-wrong_sentences").text( "틀린 문장: " + wrong_sentences )
				.attr("data", wrong_sentences)
		}

		// Ideally update write and wrong to the server?

		var now = new Date().getTime() / 1000; // Current timestamp in seconds
		var today = now - (now % (60*60*24)); // Timestamp for current day in UTC

		// Save current score, current time to the dB
		recordScore( lessonNum.replace("lesson ", "lesson"), today, 
			d3.select(".score-right_sentences").attr("data") ,  d3.select(".score-wrong_sentences").attr("data"), 
			d3.select(".score-right_words").attr("data"), d3.select(".score-wrong_words").attr("data"), 
			d3.select(".replay-counts").attr("data") )
	}

	// Get Current score for today

	input_div.append("div").style("text-align", "center")
				.append("p")
				.attr("class", "answer-original")

	input_div.append("div").style("text-align", "center")
				.append("p")
				.attr("class", "answer-user")

	input_div.append("div").style("text-align", "center")
				.append("p")
				.attr("class", "score score-right_sentences")

	input_div.append("div").style("text-align", "center")
				.append("p")
				.attr("class", "score score-wrong_sentences")

	input_div.append("div").style("text-align", "center")
				.append("p")
				.attr("class", "score score-right_words")

	input_div.append("div").style("text-align", "center")
				.append("p")
				.attr("class", "score score-wrong_words")

	input_div.append("div").style("text-align", "center")
				.append("p")
				.attr("class", "score replay-counts")

	var now = new Date().getTime() / 1000; // Current timestamp in seconds
	var today = now - (now % (60*60*24));
	getScore( lessonNum.replace("lesson ", "lesson"), today, function(data) { 
		console.log(data)
						
		d3.select(".score-right_sentences").text( "맞은 문장: " + data.right_sentences )
			.attr("data", data.right_sentences)
		d3.select(".score-wrong_sentences").text( "틀린 문장: " + data.wrong_sentences )
			.attr("data", data.wrong_sentences)
		d3.select(".score-right_words").text( "맞은 단어: " + data.right_words )
			.attr("data", data.right_words)
		d3.select(".score-wrong_words").text( "틀린 단어: " + data.wrong_words )
			.attr("data", data.wrong_words)
		d3.select(".replay-counts").text( "재시도 횟수: " + data.replay )
			.attr("data", data.replay)
	})
}

var showAbout = function( ) {
	var lang = QueryString['lang'] || 'eng';
	load_jsonData( "/lang/"+ lang +"/pages.json", function(data){
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
	var lang = QueryString['lang'] || 'eng';
	load_jsonData( "/lang/" + lang + "/pages.json", function(data){
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
			window.location = err.responseJSON.redirect;
		}
	})
}

var showProgress = function( data ) {

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

	optgroup = [];
	for ( var i = 0 ; i < chapterNames.length; i++ ) {
		var options = [];
		var lessons = Object.keys(chapters[chapterNames[i]]);
		for (var j = 0; j < lessons.length; j++ ) {
			options.push( { "label": lessons[j].replace("lesson","레슨") + ": " + chapters[chapterNames[i]][lessons[j]] , 
							"value": lessons[j].replace("lesson ","lesson") } )
		}
		optgroup.push( {"label": chapterNames[i], "children": options} )
	}
	$('#chapter-multiple-selected').multiselect({
		buttonClass: 'btn btn-default btn-navplot',
        enableClickableOptGroups: true,
        enableCollapsibleOptGroups: true,
        nSelectedText: '개 레슨 선택됨',  // default: 'selected'
        nonSelectedText: "선택된 레슨 없음",  // default: 'none selected'
        filterPlaceholder: "검색할 단어 입력",
        enableFiltering: true,
        onChange: function(option, checked){

        	var currTimes = $("#progress_timerange").val().split(" - ");
        	var startTime = new Date(currTimes[0].split("/")[0] ,currTimes[0].split("/")[1]-1 ,currTimes[0].split("/")[2]).getTime()/1000
        	var endTime = new Date(currTimes[1].split("/")[0] ,currTimes[1].split("/")[1]-1 ,currTimes[1].split("/")[2]).getTime()/1000

        	getAllScore( $('#chapter-multiple-selected').val(), [startTime, endTime], "lessons", function(data){
	    		var data_mod = $.map( data, function( value, index) { return [{"lesson": index.replace("lesson","레슨 "), "score": value}] } );
	    		stackedBarChart( svg_lpp, margin_lpp, layer_lpp, data_mod )
    		})

        	/*getAllScore( $('#chapter-multiple-selected').val(), [startTime, endTime], "date", function(data){
	    		var data_mod = $.map( data, function( value, index) { return [{"lesson": index.replace("lesson","과 "), "score": value}] } );
	    		stackedBarChart( svg_lpp, margin_lpp, layer_lpp, data_mod )

	    		console.log("wawawa", data)
    		})*/
        }
	} );
    $('#chapter-multiple-selected').multiselect('dataprovider', optgroup);

    $(document).ready(function(){
        var data = 'lesson1,lesson2,lesson3,lesson4,lesson5';
        var valArr = data.split(",");
        var i = 0, size = valArr.length;
        for (i; i < size; i++) {
            $('#chapter-multiple-selected').multiselect('select', valArr[i]);
            $('#chapter-multiple-selected').trigger('onChange')
	    }
	    var currTimes = $("#progress_timerange").val().split(" - ");
        	var startTime = new Date(currTimes[0].split("/")[0] ,currTimes[0].split("/")[1]-1 ,currTimes[0].split("/")[2]).getTime()/1000
        	var endTime = new Date(currTimes[1].split("/")[0] ,currTimes[1].split("/")[1]-1 ,currTimes[1].split("/")[2]).getTime()/1000

        	getAllScore( $('#chapter-multiple-selected').val(), [startTime, endTime], "lessons", function(data){
	    		var data_mod = $.map( data, function( value, index) { return [{"lesson": index.replace("lesson","레슨 "), "score": value}] } );
	    		stackedBarChart( svg_lpp, margin_lpp, layer_lpp, data_mod )
    		})
	});

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
    		//console.log(data)
    		var data_mod = $.map( data, function( value, index) { return [{"lesson": index.replace("lesson","레슨"), "score": value}] } );
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
		.text("레슨별 정답률")

	//https://bl.ocks.org/mbostock/3886394
	var svg_lpp = col_lessonPercent.append("div")
					.style("height","100%")
					.attr("class","container-lpp")
					.append("svg")
					.attr("class", "svg-lpp well")
					.style("height", "90%"),
		margin_lpp = {top: 40, right: 60, bottom: 20, left: 20},
		layer_lpp = ["right_sentences", "wrong_sentences"];


	// Add column to display table and percentages
	var col_table = plotPanel.append('div')
						.attr("class", "col-md-6")
						.style("height", "50%")
						.style("overflow-y","auto")

	var score_table = col_table.append( "table" )
						.attr("class", "table table-hover table-bordered")
						.attr("id" , "score-table")
						.style("margin-top","25px")

	scoreTable( score_table )	

}

var scoreTable = function ( table ) {

	var table_header = table.append("tr");

	table_header.append("th").text("강의 번호")
	table_header.append("th").text("정답률 (문장)")
	table_header.append("th").text("정답률 (단어)")
	table_header.append("th").text("반복 회수")

	var lesson_list = ["lesson1", "lesson2", "lesson3", "lesson4", "lesson5", "lesson6", "lesson7", "lesson8", "lesson9", "lesson10", "lesson11", "lesson12", "lesson13", "lesson14", "lesson15", "lesson16", "lesson17", "lesson18", "lesson19", "lesson20", "lesson21", "lesson22", "lesson23", "lesson24", "lesson25", "lesson26", "lesson27", "lesson28", "lesson29", "lesson30", "lesson31", "lesson32", "lesson33", "lesson34", "lesson35", "lesson36", "lesson37", "lesson38"]

	getAllScore( lesson_list , [ 0, Math.round(new Date().getTime()/1000.0) ] , "lessons", function(data){
		//console.log(data)

		var data_mod = $.map( data , function (value, index) {return [{"lesson": index.replace("lesson","레슨"), 
			"p_sentences": (value.right_sentences + "/" + (value.right_sentences+value.wrong_sentences)) ,
			"p_words": (value.right_words + "/" + (value.right_words + value.wrong_words)) , 
			"replay": value.replay 	}]
		})
		
		//console.log(data_mod)
		
		data_mod.unshift({})

		table.selectAll( "tr" )
			.data( data_mod ).enter()
			.append("tr")
				.selectAll( "td" )
				.data( function(d){ return $.map( d, function( v, i) { return [{  "value": v }]  } ) } ).enter()
				.append("td").text( function(d){return d.value} )


	})
}

var stackedBarChart = function( svg, margin, layer, data ) {

	//https://bl.ocks.org/mbostock/1134768

	// Remove all other graphics on the svg
	//svg.selectAll("g").transition().duration(200).style("opacity", 0 ).remove()
	svg.selectAll("g").remove()
	d3.select(".tooltip-lpp").remove()

	if (data.length == 0) {
		return
	}

	// Define tooltip menu
    var tooltip = d3.select( svg.node().parentNode ).append("div")
					.attr("class", "tooltip-barChart tooltip-lpp")
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
	//console.log(layers)
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

    svg.style("opacity", 0)
    	.transition()
    	.duration(500)
    	.style("opacity", 1)

}

var removeLessons = function() {
	
	var node = d3.select('.clearfix').node()

	while (node.hasChildNodes()) {
		//$( node.lastChild ).fadeOut(300, function() { $(this).remove(); })
    	node.removeChild(node.lastChild);
	}

	// Reset background gain node to 0
	bgGainNode.gain.value = 0;

}

// From: http://www.willvillanueva.com/the-web-audio-api-from-nodeexpress-to-your-browser/

function loadSound( context, lessonname, filename, parms ) {

	if (parms) {
		var gain = parms.gain;
		var loop = parms.loop;
	}

	var request = new XMLHttpRequest();
	request.open("GET", "/api/soundData?lesson=" + lessonname + "&fileName=" + filename, true); 
	request.responseType = "arraybuffer";

	request.onload = function() {
	    var Data = request.response;
	    if (gain) {
	    	process( Data, context, parms)
	    } else {
	    	process(Data, context);	
	    }
	    
	};

	request.send();
 }

function process(Data, context, parms) {

	if (parms) {
		var gain = parms.gain;
		var loop = parms.loop;
	}

  	source = context.createBufferSource(); // Create Sound Source

	context.decodeAudioData(Data, function(buffer){
   		source.buffer = buffer;

   		if (gain) {
   			source.connect(gain); 
   		} else {
   			source.connect(context.destination); 
   		}

   		source.start(context.currentTime);
   		if (loop) {
   			source.loop = true;
   		}
	})
}

var loadLessonFile = function( sentenceString, gender, lessonNum ) {

	sentenceString = sentenceString.replaceAll(',','');
	sentenceString = sentenceString.replaceAll('!','');
	sentenceString = sentenceString.replaceAll('?','');
	sentenceString = sentenceString.replaceAll('.','');
	sentenceString = sentenceString.replaceAll('~','');
	sentenceString = sentenceString.replaceAll('‘','');
	sentenceString = sentenceString.replaceAll('’','');
	sentenceString = sentenceString.replaceAll("'",'');

	var filename = sentenceString + "_" + gender +".wav";
	var lessonname = lessonNum.replace(' ', '') // d3.select('.lesson-header').text().toLowerCase().replace(' ','');

	loadSound(audioContext, lessonname, filename ) // Using global variable audioContext defined at initialization

}

var loadBackgroundNoise = function(){

	var parms = {
		gain: bgGainNode,
		loop: true
	}

	// Can do this every 10 seconds, or...
	loadSound(audioBgContext, "misc", "whitenoisegaussian.wav", parms)
}(); // Load background noise file from beginning

// When menu buttons are clicked:

$("#profile-page").on("click", function(){
	showProfile();

	// Close Menu
	d3.select('#mp-pusher').classed("mp-pushed", false)
	d3.select('#mp-pusher').style("transform", 'translate3d(0,0,0)')
})

$('#about-page').on('click', function(){ 
	showAbout();

	// Close Menu
	d3.select('#mp-pusher').classed("mp-pushed", false)
	d3.select('#mp-pusher').style("transform", 'translate3d(0,0,0)')
});

$('#instruction-page').on('click', function(){ 
	showInstruction();

	// Close Menu
	d3.select('#mp-pusher').classed("mp-pushed", false)
	d3.select('#mp-pusher').style("transform", 'translate3d(0,0,0)')
});

$('#progress-page').on('click', function(){ 
	var lang = QueryString['lang'] || 'eng';
	load_jsonData( "/lang/" + lang + "/lessons.json", function(data){
		showProgress(data);
 	});

	// Close Menu
	d3.select('#mp-pusher').classed("mp-pushed", false)
	d3.select('#mp-pusher').style("transform", 'translate3d(0,0,0)')
});