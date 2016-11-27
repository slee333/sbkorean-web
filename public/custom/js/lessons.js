/* off-canvas sidebar toggle */
$('[data-toggle=offcanvas]').click(function() {
    $('.row-offcanvas').toggleClass('active');
    $('.collapse').toggleClass('in').toggleClass('hidden-xs').toggleClass('visible-xs');
});

var build_sublists = function( divid, data ){

	var chapters = data.chapterNames;
	var lessons = data.sentenceNames;
	var chapterNames = Object.keys(chapters);

	var lists = d3.select("#" + divid ).selectAll("li")
		.data( chapterNames ).enter()
		.append('li')
		//.append('a')
		//	.attr("data-target", function(d,i) {"#chapter"+(i+1)} )
		//	.attr("class", function(d,i) {"chapter"+(i+1)} )

	lists.append('a')
		.attr('href', '#')
		.attr("data-target", function(d,i) { return "#chapter"+(i+1)})
		.attr("data-toggle","collapse")
		.style('padding-left', "30px")
		.style('padding-bottom', "5px")
		.style('padding-top', "5px")
		.append('span')
			.attr('class', 'collapse in hidden-xs')
			.html(function(d,i){ return "Chapter " + (i+1) + ": " + chapterNames[i] +' <span class="caret"></span>' })

	var sublists = lists.append('ul')
		.attr('class', 'nav nav-stacked collapse left-submenu')
		.attr('id', function(d,i){ return "chapter" + (i+1) });

	for (var ch = 0; ch < sublists[0].length ; ch++) {

		var chapterObj = chapters[ chapterNames[ch] ];

		d3.select("#chapter"+(ch+1)).selectAll('li')
			.data( Object.keys( chapterObj ) ).enter()
			.append('li').append('a')
			.attr('href', '#')
			.style('padding-left', '50px')
			.style('padding-top', '5px')
			.style('padding-bottom', '5px')
			.html( function(d,i) { 
				var title = 'Lesson ' + d.split(' ')[1] + ': ' + chapterObj[d]
				return title
			})
			.on('click', function(d, i ){

				showLessons( lessons[d], d3.select(this).text() )
			})
	}
	
}

var showLessons_svg = function( sentence_string, title ) {

	//$('#main').css('max-height', $('#sidebar').height() )
	//$('#main').css('overflow-y', "scroll" )

	//var header = $('#main-header');
	var body = $('#main-body');

	//header.text( title )

	var body = d3.select('#main-body');
	body.select('.lesson-svg').remove() // remove all previous lesson buttons
	var svg = body.append('svg')
		.attr('class','lesson-svg')
		.attr('width', $('#main-header').width() )
		.attr('height', ($('#sidebar').height() - $('#main-body').position()['top']) - 5 )

	var sentences = sentence_string.split(', ')

	var svg_margin = { "left": "150px", "right": "150px", "top": "200px", "bottom": "200px" }

	var btns = svg.selectAll('g')
		.data(sentences).enter()
		.append('g')
		.attr('class', 'lesson-btn');
	



	btns.append('i')
		.attr('class', 'glyphicon glyphicon-play');
	btns.text( function(d,i){ return d } );
	


}


var showLessons = function( sentence_string, title ) {

	$('#main').css('max-height', $('#sidebar').height() )
	$('#main').css('overflow-y', "scroll" )

	var header = $('#main-header');
	var body = $('#main-body');

	header.text( title )

	var body = d3.select('#main-body');
	body.selectAll('.lesson-btn').remove() // remove all previous lesson buttons

	var sentences = sentence_string.split(', ')

	var btns = body.selectAll('div')
		.data(sentences).enter()
		.append('div')
		.attr('class', 'lesson-btn');
	
	btns.append('i')
		.attr('class', 'glyphicon glyphicon-play');
	btns.append('span').text( function(d,i){ return ' ' + d } );
	


}

var korean_lessonsData = $.ajax({
	url: "/api/lessonData",
	type: "get",
	success: function(){
		console.log( " Data Loaded " );
		var data_json = korean_lessonsData.responseJSON;
		build_sublists('chapter-list', data_json)		

	}
})

//build_sublists('chapter-list', chapterData)
//d3.select("#chapter-list")