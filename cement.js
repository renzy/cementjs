(function($){
	var debounce = function(func, threshold, exec){
		var timeout;
		return function debounced(){
			var obj = this, args = arguments;
			function delayed(){
				if(!exec) func.apply(obj,args);
				timeout = null; 
			};
			if(timeout) clearTimeout(timeout);
			else if(exec) func.apply(obj, args);
			timeout = setTimeout(delayed, threshold || 100); 
		};
	};

	$.fn.cement = function(options){
		var $this = $(this),
		defaults = {
			debug: false,
			columns: 4,
			columnMinWidth: 0,
			brickSelector: '> *',
			horizontalGutter: 5,
			verticalGutter: 5,
			transitionDuration: '0.2s',
			breakpoints: []
		};

		for(property in options){
			if(defaults.hasOwnProperty(property) !== options.hasOwnProperty(property)) {
				console.log('CementJS doesn\'t support the ' + property + ' property.');
				delete options[property];
			}
		}

		var _ = $.extend(defaults, options),
			PARAM_WIDTH = 'w',
			PARAM_HEIGHT = 'h';

		_.columnsMax = _.columns;

		if(_.breakpoints.length && _.breakpoints.length>0){
			_.breakpoints.sort(function(a,b){
				return parseFloat(a.max_window_width) - parseFloat(b.max_window_width);
			});
		}

		_.transitionMS = parseFloat(_.transitionDuration.replace(/[^0-9\.]+/g,''));
		if(/s$/gi.test(_.transitionDuration)) _.transitionMS *= 1000;
		
		function refresh(event){
			if(_.debug){
				console.group('cement :: refresh()');
				console.log('containers: '+event.data.containers.length);
				console.log('action: '+event.data.action);
				console.groupEnd();
			}

			var wiwi = $(window).width();

			$(event.data.containers).each(function() {
				var container = $(this);

				// Set default values
				if(container.css('position') === 'static')
					container.css('position', 'relative');
				container.css('box-sizing', 'border-box');
				var paddingTop = parseInt(container.css('paddingTop').replace(/[^0-9-]/g, '')),
					paddingLeft = parseInt(container.css('paddingLeft').replace(/[^0-9-]/g, '')),
					paddingBottom = parseInt(container.css('paddingBottom').replace(/[^0-9-]/g, ''));

				// Adapt the number of columns if the container is too tight
				_.columns = _.columnsMax + 1;
				var unit = 0;
				do {
					_.columns--;
					unit = (container.width() - _.horizontalGutter * (_.columns - 1)) / _.columns
				} while(unit < _.columnMinWidth && _.columns != 1);

				// Set variables
				var unit = (container.width() - _.horizontalGutter * (_.columns - 1)) / _.columns,
					items = container.find(_.brickSelector),
					matrix = new Array(_.columns + 1).join('0');


				var tile = false;
				if(_.breakpoints.length>0){
					for(var x=0; x<_.breakpoints.length; x++){
						var i = _.breakpoints[x];
						if(wiwi<i.max_window_width){
							tile = i.tile;
							break;
						}
					}
				}

				// Iterate over items
				var c = 0;
				items.each(function() {
					c++;
					var item = $(this);

					// Set default values
					if(typeof item.data(PARAM_WIDTH) === 'undefined')
						item.data(PARAM_WIDTH, 1);
					if(typeof item.data(PARAM_HEIGHT) === 'undefined')
						item.data(PARAM_HEIGHT, 1);
					

					// Fix boundaries
					if(typeof item.data(PARAM_WIDTH) + '-max' !== 'undefined') {
						item.data(PARAM_WIDTH, item.data(PARAM_WIDTH + '-max'));
					}
					if(item.data(PARAM_WIDTH) > _.columns) {
						item.data(PARAM_WIDTH + '-max', item.data(PARAM_WIDTH));
						item.data(PARAM_WIDTH, _.columns);
					}

					if(typeof item.data(PARAM_WIDTH+'-og') === 'undefined')
						item.data(PARAM_WIDTH+'-og', item.data(PARAM_WIDTH));
					if(typeof item.data(PARAM_HEIGHT+'-og') === 'undefined')
						item.data(PARAM_HEIGHT+'-og', item.data(PARAM_HEIGHT));


					item.data(PARAM_WIDTH,item.data(PARAM_WIDTH+'-og'));
					item.data(PARAM_HEIGHT,item.data(PARAM_HEIGHT+'-og'));

					if(tile){
						var i = {
							w: item.data(PARAM_WIDTH),
							h: item.data(PARAM_HEIGHT)
						};
						if(i.w<tile.width.min) item.data(PARAM_WIDTH,tile.width.min);
						else if(i.w>tile.width.max) item.data(PARAM_WIDTH,tile.width.max);

						if(i.h<tile.height.min) item.data(PARAM_HEIGHT,tile.height.min);
						else if(i.h>tile.height.max) item.data(PARAM_HEIGHT,tile.height.max);
					}


					// Define position
					var index = -1,
						min = 0,
						brick = Array.apply(
								null,
								new Array(item.data(PARAM_HEIGHT))
							).map(function() {
								return new Array(item.data(PARAM_WIDTH) + 1).join('1')
							}).join(
								new Array(_.columns - item.data(PARAM_WIDTH) + 1).join('0')
							),
						search = brick.replace(/0/g, '.').replace(/1/g, '0');
					do {
						// Search for an available place
						var match = matrix.substr(min).match(search);
						if(!match) {
							// Not enough place ? Add a row
							matrix += new Array(item.data(PARAM_WIDTH) + 1).join('0');
						} else {
							var index = match.index + min;
							// Enough place ? Check if we're not at the end of a line
							var line = matrix.substr(Math.floor(index / _.columns) * _.columns, _.columns) + '1';
							if(line.indexOf(new Array(item.data(PARAM_WIDTH) + 1).join('0')) == -1) {
								// End of a line ? Search further
								matrix += new Array(4 - matrix.length % 4 + 1).join('0');
								min = (Math.floor(index / _.columns) + 1) * _.columns;
								index = -1;
							}
						}
					} while(index == -1);

					// Update matrix
					var n = search.length,
						prefix = matrix.substr(0, index),
						segment = matrix.substr(index, n),
						suffix = matrix.substr(index + n);
					matrix = prefix;
					for(var i = 0; i < n; i++) {
						matrix += parseInt(segment.charAt(i)) || parseInt(brick.charAt(i));
					}
					matrix += suffix;

					// Positioning element
					var x = Math.floor(index / _.columns),
						y = index % _.columns;
					item.css({
						'opacity': 1,
						'position': 'absolute',
						'transition-property': 'top, left, bottopm, right',
						'transition-duration': _.transitionDuration,
						'top': (x * (unit + _.horizontalGutter) + paddingTop) + 'px',
						'left': (y * (unit + _.verticalGutter) + paddingLeft) + 'px',
						'width': (item.data(PARAM_WIDTH) * unit + _.horizontalGutter * (item.data(PARAM_WIDTH) - 1)) + 'px',
						'height': (item.data(PARAM_HEIGHT) * unit + _.verticalGutter * (item.data(PARAM_HEIGHT) - 1)) + 'px',
					});
				});

				// Update container height (avoid 0px height because of absolute potitioning)
				setTimeout(function(){
					var rows = Math.ceil(matrix.length / _.columns);
					container.css('height', rows * unit + _.verticalGutter * (rows - 1) + paddingTop + paddingBottom);
				},10);

				container.off('DOMNodeRemoved DOMNodeInserted').one('DOMNodeRemoved DOMNodeInserted', function(e){
					setTimeout(function(){
						refresh({ data:{ containers:container, action:e.type } });
					},_.transitionMS);
				});
			});
		}

		//turn off window resize listener & reconfig
		$(window).off('resize').on('resize',
			debounce(function(e){
				refresh({ data: { containers:$this, action:'resize' } });
			},50,false)
		);

		//kick it off
		refresh({ data: { containers:$this, action:'init' } });
		return $this;
	};
})(jQuery);


/*
{
	debug: /[\&\?]debug/gi.test(window.location.search),
	columns: 12,
	horizontalGutter: 0,
	verticalGutter: 0,
	breakpoints: [
		{ 
			max_window_width: 800, 
			tile: { 
				width: { max:12, min:1 }, 
				height: { max:12, min:2 } 
			} 
		},
		{ 
			max_window_width: 630, 
			tile: { 
				width: { max:12, min:4 }, 
				height: { max:12, min:3 } 
			} 
		},
		{ 
			max_window_width: 440, 
			tile: { 
				width: { max:12, min:12 }, 
				height: { max:12, min:3 } 
			} 
		}
	]
}
*/