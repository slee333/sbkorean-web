var korean_lessonsData = $.ajax({
	url: "/api/lessonData",
	type: "get",
	success: function(){
		console.log( " Data Loaded " );
		var data_json = korean_lessonsData.responseJSON;
		build_sublists('lesson-list', data_json)		

	}
})

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
				console.log( lessons[d].split('//') )
				console.log( lessons[d].split('//').length )
				removeLessons()
				showLessons( lessons[d].split('//') )
			})

	}
	
	new mlPushMenu( document.getElementById( 'mp-menu' ), document.getElementById( 'trigger' ) );

}

var showLessons = function( sentences ) {

	var content = d3.select('.clearfix')

	// Add male/female button

	var gbtn = content.append('div')
		.attr('class', "gender-btns")
	
	// Male Button
	gbtn.append('button')
		.attr('class', "button gender-button button-circle button-highlight button-large button-selected")
		.html('M')
		.on('click', function( d, i ) {
			// Disselect all
			d3.selectAll('.gender-button').classed('button-selected', false)
			// Seelect this button
			d3.select(this).classed('button-selected', true)
		})

	// Female Button
	gbtn.append('button')
		.attr('class', "button gender-button button-circle button-highlight button-large")
		.html('F')
		.on('click', function( d, i ) {
			// Disselect all
			d3.selectAll('.gender-button').classed('button-selected', false)
			// Seelect this button
			d3.select(this).classed('button-selected', true)
		})

	var sbtn = content.append('div')
		.attr('class', "set-btns")

	var svg = content.append('svg')
				.style('height', '100%')
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

		textBox.append('text')
			.attr('x', rect_width/2 )
			.attr('y', rect_height/2 + 5 )
			.attr('font-size', "20px")
			.attr('text-anchor',"middle")
			.text(function(d,i) { return sentences[i] })

	}



}

var removeLessons = function() {
	
	var node = d3.select('.clearfix').node()

	while (node.hasChildNodes()) {
    	node.removeChild(node.lastChild);
	}
}