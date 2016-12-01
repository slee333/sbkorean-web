///////////////////////////////
// 	       Initialize        //
///////////////////////////////

//D3.js unable to load data locally saved. Could import in javascript file.. Need to think about this.
//Import and organize
var korean_lessonsData = $.ajax({
	url: "/api/lessonData",
	type: "get",
	success: function(){
		showAbout()
		console.log( " Data Loaded " );
		var data_json = korean_lessonsData.responseJSON;
		build_sublists('lesson-list', data_json)		

	}
})

// Setup global variable audioContext
window.AudioContext = window.AudioContext||window.webkitAudioContext;
var audioContext = new AudioContext();





// Layout *****
var screen_height = $('.scroller-inner').height();
var body_height = screen_height - $('.main-header').outerHeight();
var margin = 60;
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

	var content = d3.select('.clearfix')

	// Add male/female button
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
			showLessons( svg, group[i] )
		})

	d3.select('.set-button').classed('button-selected', true)
	showLessons(svg, group[0])

	// Close menu.
	d3.select('#mp-pusher').classed("mp-pushed", false)
	d3.select('#mp-pusher').style("transform", 'translate3d(0,0,0)')

	// Add sentence buttons
	function showLessons(svg, sentences) {

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
				console.log(  loadSoundFile( sentences[i] )  )
			})

		textBox.append('text')
			.attr('x', rect_width/2 )
			.attr('y', rect_height/2 + 5 )
			.attr('font-size', "20px")
			.attr('text-anchor',"middle")
			.text(function(d,i) { return sentences[i] })
			.on('click', function(d, i) {
				console.log(  loadSoundFile( sentences[i] )  )
			})
			.on('mouseover', function(d, i) {
				d3.select( d3.selectAll('rect')[0][i] ).style('fill','#edc01e')
			})
			.on('mouseout', function(d, i) {
				d3.select( d3.selectAll('rect')[0][i] ).style('fill','#fcd549')
			})

	}

}

var showAbout = function( ) {

	// Hard-coded Contents. Can separate these in another .js file, I guess.
	var content = {
		p1: "스피치바나나는 미국 존스홉킨스의 Ratnanather 교수팀이 만든 언어치료 및 청각재활 어플리케이션 입니다. 스피치바나나는 전문가와의 면담에 준하는 양질의 언어치료를 보다 쉽고 간편하게 제공하고자 하는 취지아래 개발되어 와우이식 착용자나 중등고도 이상의 난청으로 보청기를 착용하는 분들이 시간과 장소에 구애받지 않고 자율학습을 통해 언어습득 훈련이 되도록 하였습니다.",
		p2: "본 스피치바나나 한국어판 개발은 영미권 사용자들을 위해 개발된 어플리케이션 기본틀에 우리말 특성을 고려한 단계적 학습이 될 수 있도록 우송대학교 언어청각재활학부 장선아 교수팀이 컨텐츠를 개발하고 분당서울대학교병원 이비인후과 구자원, 최병윤, 송재진 교수팀과 협업으로 이루어졌습니다. 또한 스피치바나나의 지문 및 레슨들은 본 어플리케이션의 제작취지에 공감한 MBC방송국 전문 아나운서들의 자발적인 참여로 녹음이 이루어져 이상적인 언어치료 보조도구로 완성되었습니다.",
		p3: "여러분들의 참여와 피드백은 더 나은 어플리케이션을 제공하고자 하는 저희에게 큰 힘이 됩니다. 저희는 현재 사용자 분들의 의견을 설문이나 덧글을 통해 적극적으로 수용하며, 어플리케이션에 관한 질문이나 의견이 있다면  speechbanana.kr@cis.jhu.edu로 연락 주시거나 공식 홈페이지 (http://speechbananakorea.jhu.edu)를 방문하여 주시길 바랍니다.",
		p4: "난청 환자들의 삶의 질을 향상 시키기 위한 프로젝트인 스피치 바나나를 이용 해 주셔서 깊이 감사 드리며, 사용자 분들의 소중한 의견을 반영하여 더욱 나은 서비스를 제공하도록 노력하겠습니다.",
		help: "<b>도움 주신 분들:</b> <br><br>존스홉킨스대학: Tilak Ratnanather, 송조은, 임홍서, 이승욱, 에드릭 <br> 분당서울대학교병원: 구자원, 최병윤, 송재진, 김신혜, 이지혜, 한재준, 김다혜 <br> 우송대학교: 장선아, 정다혜, 전주희 <br>MBC 아나운서실: 김범도, 이재은, 차예린, 허일후, 윤홍일"
	}

	removeLessons()

	var main_div = d3.select(".clearfix");
	main_div.append("h1")
		.text("스피치 바나나에 관하여")

	var division = main_div.append('div')
						.style('width', "100%")
						.style('height', "4px")
						.style('background-color', "#ffc526")

	main_div.selectAll('p')
		.data( Object.keys(content) ).enter()
		.append('p')
		.html( function(d, i){ return content[d] } )		// used .html instead of .text to use line break tag (<br>) included in the text
		.attr('class', function(d,i){
			if (d == 'help'){
				return "about-help main-paragraph"
			} else {
				return "main-paragraph"
			};
		});
};

var showInstruction = function( ) {

	// Hard-coded Contents. Can separate these in another .js file, I guess.
	var content = {
		p1: "각 레슨은 25개의 문장들로 구성되어 있고, 버튼을 누르면 녹음된 문장을 들을 수가 있습니다.",
		p2: "레슨 상단에 위치한 버튼을 조작해 어느 성별의 목소리로 문장을 들을지 고를 수 있습니다.",
		p3: "우측 상단에 위치한 세트 버튼을 누르면 다른 페이지로 이동합니다.",
		p4: "연습이 다 끝난 이후엔 퀴즈를 보셔서 본인의 숙련도를 확인하실 수 있습니다.",
		p5: "무작위로 선택된 문장을 들으신 후 문장을 적어 정답 여부를 확인하여 주세요.",
		p6: "스스로의 진척 상황을 '진행과정'' 메뉴에서 확인하실 수 있습니다."
	}

	removeLessons()

	var main_div = d3.select(".clearfix");
	main_div.append("h1")
		.text("사용방법");

	var division = main_div.append('div')
						.style('width', "100%")
						.style('height', "4px")
						.style('background-color', "#ffc526");

	main_div.selectAll('p')
		.data( Object.keys(content) ).enter()
		.append('p')
		.html( function(d, i){ return content[d] } )		// used .html instead of .text to use line break tag (<br>) included in the text
		.attr('class', "main-paragraph");
};


var removeLessons = function() {
	
	var node = d3.select('.clearfix').node()

	while (node.hasChildNodes()) {
    	node.removeChild(node.lastChild);
	}
}

var loadSoundFile = function( sentenceString ) {
	// Select gender
	var gender = d3.select(".gender-button.button-selected").attr('gender');

	sentenceString = sentenceString.replace(',','')
	sentenceString = sentenceString.replace('!','')
	sentenceString = sentenceString.replace('?','')
	sentenceString = sentenceString.replace('.','')

	var filename = sentenceString + "_" + gender +".wav";
	var lessonname = d3.select('.lesson-header').text().toLowerCase().replace(' ','');


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