/*
	Scorched Earths
	File: game.js
	Author: Chris Mackey
	Version: 0.0
	
	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.

	You should have received a copy of the GNU General Public License
	along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

(function() { //multi browser support for request animation frame
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame']
                                   || window[vendors[x]+'CancelRequestAnimationFrame'];
    }
 
    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); },
              timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
 
    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
}());

game = function () {

	var rev = "rev. 93";
	//global variables

	//math stuff
	var pi = Math.PI;
	var sin = Math.sin, cos = Math.cos, tan = Math.tan, atan2 = Math.atan2;
	var pow = Math.pow, sqrt = Math.sqrt;
	var abs = Math.abs;
	var min = Math.min, max = Math.max;
	var round = Math.round, floor = Math.floor, ceil = Math.ceil;
	var random = Math.random;

	//helper functions (general)
	var hypot = function(a,b) {
		return sqrt(a*a+b*b);
	}
	
	var getDist = function(x1,y1,x2,y2) {
		return hypot(x2-x1,y2-y1); 
	}

	var getAngle = function(x1,y1,x2,y2) {
		return atan2(y1-y2, x1-x2);
	}
	
	var printxy = function(x, y, d) {
		if(typeof d == "undefined") d = 0;
		return "("+x.toFixed(d)+","+y.toFixed(d)+") ";
	}
	
	var exists = function(needle, haystack) {
		for(var straw in haystack) {
			if(haystack[straw] == needle) return true;
		}
		return false;
	}

	var fpsupdate = 500; //update delay, 0 disables
	var fpsd = 0;
	var then = Date.now();
	var lastfps = then;
	var fpsdisplay = function(px, py) {
		if(fpsupdate > 0) {
			//FPS counter
			var now = Date.now();
			
			if (now >= fpsupdate+lastfps) {
				fpsd = 1000/(now-then);
				lastfps = now;
			}
			then = now;
			
			var c = ctx;
			c.save();
				c.font = "normal 14px sans-serif";
				c.textAlign = "left";
				c.fillStyle = "#ff0";
				c.fillText(fpsd.toFixed(0), px, py);
			c.restore();
		}
	}
	
	//game specific
	var getTeam = function(find, tim) {
		if(typeof(tim) == "undefined") {
			for(var i in team) {
				for(var j in team[i]) {
					if(find == team[i][j]) {
						return i;
					}
				}
			}
			return("error");
		}
		else {
			return tim[find];
		}
	}

	var getNumTeams = function(tim) {
		var t, c=0;
		if(typeof(tim) == "undefined") t = team;
		else t = tim;
		var count = new Array();
		for(var i in t) {
			count[ t[i] ] = t[i];
		}
		for(var i in count) {
			if(i) c++;
		}
		return c;
	}
	
	var checkRect = function(b,x,y) {
		//console.log("check: "+b.name, b.x, b.y, b.width, b.height, x, y);
		if(x > b.x && x < b.x+b.width && y > b.y && y < b.y+b.height ) {
			return b.name;
		}
		else return false;
	}
	
	var checkRound = function(b,x,y) {
		//console.log("check: "+b.name, b.x, b.y, b.radius, x, y, "distance: ", getDist(b.x,b.y,x,y) );
		if(b.radius > getDist(b.x,b.y,x,y) ) {
			return b.name;
		}
		else return false;
	}

	var controlText = function(cont) {
		switch(cont)
		{
			case control.disabled: return "Disabled";
			case control.player: return "Player";
			case control.moron:
			case control.shooter:
			case control.poolshark:
			case control.tosser:
			case control.chooser:
			case control.spoiler:
			case control.cyborg:
				return "AI Lvl:"+cont;
			default: return cont+" DNE"; break;
		}
	}

	var weaponText = function(weap) {
		switch(weap)
		{
			case item.cannon: return "Cannon";
			case item.laser: return "Laser";
			default: return weap+" DNE"; break;
		}
	}
	
	var nameInputUpdate = function(i) {
		var iname = $("#ibox").val();
		if(iname && iname != "" && iname != "Enter Planet Name")
			planet[i].name = iname;
		$("#nameInput").remove();
	}
	
	var sfText = function(c, text, x, y) {
		c.strokeText(text,x,y);
		c.fillText(text,x,y);
	}
	
	//canvas stuff
	var ctx;
	var ctx2;
	var ctx3;
	var width = $(window).width();
	var height = $(window).height();
	var aspect = height/width;
	var CANVAS_SIZE = min(width, height);
	var buffer = max(width, height) - CANVAS_SIZE;
	var border = CANVAS_SIZE*0.02;
	width = CANVAS_SIZE;
	height = CANVAS_SIZE;

	//basic game options
	var fps = 60;
	var volume = 0.2; //from 0 to 1
	var vol_music = 0.5;
	var vol_explo = 0.5;

	//game objects
	var gui;
	var sol;
	var planet = new Array();
	var team   = new Array();
	var teamcolor = ["red","green","blue","purple","pink","orange","yellow","magenta","white","black"];
	var threat = new Array();
	
	var background = new Image(); //level background
	var camp_menu = new Image(); //background for campaign menu
	var skin = new Image(); //level ui overlay
	var pimage = new Image(); //planet images + shadows
	var bimage = new Image(); //projectile image

	var planetbutton = new Array();

	//sounds & visual effects
	var vfx_explode = new Image();
	vfx_explode.src = "img/vfx/explosion3.png";

	/* TODO: sfx something like this
	var sfx = {
		explode:  new Audio("sfx/changed/explosion1.wav"),
		hit:      new Audio("sfx/changed/boom.wav"),
		laser:    new Audio("sfx/changed/laser1.wav"),
		claunch:  new Audio("sfx/changed/launch_cannon.wav"),
	};
	
	for (var i in sfx) {
		i.volume = volume;
	}
	/**/
		
	var sfx_explode = new Audio("sfx/changed/explosion1.wav");
	var sfx_hit     = new Audio("sfx/changed/boom.wav");
	var sfx_laser   = new Audio("sfx/changed/laser1.wav");
	var sfx_claunch = new Audio("sfx/changed/launch_cannon.wav");
	sfx_explode.volume = volume;
	sfx_hit.volume = volume;
	sfx_laser.volume = volume;
	sfx_claunch.volume = volume;
	
	//constants
	var PLANETDIST 	= 40; //how far apart planets are spaced
	var FIELDSIZE 	= (CANVAS_SIZE-2*border)/2-PLANETDIST; //leave some space for border & last planet
	var TIME_LIMIT 	= 10*fps;	//max time allowed for player turn
	var AI_DELAY 	= 1*fps; 
	var START_DELAY	= 1*fps;
	var END_DELAY 	= 1*fps;
	var PLANETNAMES = ["Alpha", "Beta", "Gamma", "Persei", "Centauri", "Epsilon", "Belerephon", "Persephone"];
	//var PLANETNAMES = ["Fred", "Ted", "Mozart", "Galileo", "Jezebel", "Mata Hari", "Persephone", "Norm", "Sonja", "Godiva", "Arnold", "Ralph", "Wolfgang", "Bubba", "Cher", "Sam", "Amin", "Mary", "Hank", "Jacque", "Jaun", "Leroy", "Roseanne", "Guineverre", "Otto", "Bubbles", "Cleopatra", "Medusa", "Elvira", "Doug", "Ronald", "BethSheba", "Mussolini", "Khadafi", "Gilligan", "Rose", "Helen", "Napoleon", "Moria", "Castro", "Ajax", "Zoe", "Tito", "Charo", "Bach", "Madonna", "Saddam", "Atilla", "Barbarella", "Pepe", "Chuck", "Antoinette", "Biff", "Tiffany", "Esther", "Grace", "Angie", "Diane", "Joe", "Newton", "Elizabeth", "Max", "Lou", "Bob", "George", "Frank", "Edward"];
	
	//game variables
	var PMINSIZE	= 6; //has to be some size
	var PSTEPSIZE 	= 0.1;
	var PMAXSIZE	= PLANETDIST; //largest size a planet can be is distance between two planets
	var MAXPLANETS	= round(FIELDSIZE/PLANETDIST); //most planets can only be size of field divided by how far apart planets are
	var NUMPLANETS	= MAXPLANETS; //initial number of planets is set to max
	var gravityon	= true;
	var suncolor 	= "#ff0";
	var turn 		= 0;
	var lastturn 	= 0;
	var teamleft	= 0;
	var timeleft 	= TIME_LIMIT;
	var ai_think 	= AI_DELAY; //minimum delay on time it takes ai to "think"
	var se_delay 	= START_DELAY; //how long to delay when starting/stopping game
	var message 	= "Game Ended";
	var cmsg = new Array();
	var _teams = new Array();
	var _players = new Array();
	var _name = new Array();

	var loaded = {
		background:		false,
		campaign:		false,
		ui:				false,
		sun:			false,
		planets:		false,
		weapons:		false,
		length: 		7, //count of all elements in loaded (including this one)
	};
	
	var gamestate = 0;
	var state = { 
		menu: 		0,
		campaign:	1,
		play: 		2,
		pause: 		3,
		over: 		4,
		upgrade: 	5,
		results: 	6,
		tutorial:	7,
		options:	8,
	};
	var control = {
		disabled:	0,
		player:		8,
		moron: 		1,
		shooter: 	2,
		poolshark: 	3,
		tosser: 	4,
		chooser: 	5,
		spoiler: 	6,
		cyborg: 	7,
		random_ai: 	round(random()*6+1),
		length:		9, //all elements except random and this
	};
	var wallstate = 0;
	var wall = {
		normal:     0,
		bouncy:     1,
		teleport:   2,
		oblivion:	3,
		x:          1, //dictates speed of bouncy projectile
	};
	var item = {
		cannon: 	0,
		laser:	 	1,
	};

	//game functions

	var canvas_resize = function(_canvas) {
		
	}

	var create_context = function(element) {
		element.attr("width", width);
		element.attr("height", height);
		if(aspect > 1) element.css("top", buffer/2); //position in center of screen
		else element.css("left", buffer/2);
		return element[0].getContext("2d");
	}
	
	var create_level = function(bg_image, sunsize/*, cm_image, wp_image, sun_image*/ ) {
		//create level background
		background.src = bg_image;
		background.onload = function() {
			ctx3.drawImage(background, 0, 0, width, height);
			loaded.background = true;
		}
		//create UI
		camp_menu.src = "img/ui/camp_menu.png";
		camp_menu.onload = function() { loaded.campaign = true; }
		skin.src = "img/ui/ui_overlay.png";
		skin.onload = function() { 
			ctx3.drawImage(skin, 0, 0, width, height);
			gui = new ui(skin);
			loaded.ui = true; 
		}
		bimage.src = "img/projectiles/bullet.png";
		bimage.onload = function() { loaded.weapons = true; }

		//create sun object
		var sunimg = new Image();
		sunimg.src = "img/suns/sun2.png";
		sunimg.onload = function() {
			function fixedlength(length, number) {
				while (String(number).length < length)
					number = "0"+number;
				return number;
			}
			var r = round(random()*255);
			var g = round(random()*255);
			var b = round(random()*255);
			//console.log(r,g,b);
			if(r+g+b < 128*3) { //color too dark
				if(r<128) r *= 2;
				if(g<128) g *= 2;
				if(b<128) b *= 2;
			}
			//console.log(r,g,b);
			r = r.toString(16);
			g = g.toString(16);
			b = b.toString(16);
			//console.log(r,g,b);
			r = fixedlength(2, r);
			g = fixedlength(2, g);
			b = fixedlength(2, b);
			//console.log(r,g,b);
		
			suncolor = "#"+r+g+b;
			//suncolor = "#ff8";
			console.log("suncolor: "+suncolor);
			sol = new sun(sunimg, sunsize);
			loaded.sun = true;
		}
		return true;
	}

	var create_planets = function(planet, _teams, _players, _name /*p_image*/) {
		console.log("creating planets...");
		//set number of planets
		if(_players.length > MAXPLANETS) NUMPLANETS = MAXPLANETS; //TODO: bound player/team list
		else NUMPLANETS = _players.length;

		if(_teams.length != _players.length ) { console.log("ERROR: team/players mismatch"); return false; }
		
		pimage.src = "img/planets/a_planetlist.png";
		pimage.onload = function() { loaded.planets = true; }

		for(var i=0; i<NUMPLANETS; i++)
		{
			//create planet object
			var size = round(random()*7+4+sqrt(i)); 	//semi random size
			var period = round(random()*5+13+2*i); 	//semi random period between 5 and 6+2*i (larger = slower)
			var days = round(random()*10+10);		//how fast planet rotates
			var rx = PLANETDIST*(i+1); 				//incremental radius
			var theta = round(random()*2*pi); 		//random initial angular position
			var islice = 50*(i+1);
			planet[i] = new pPlanet(_name[i], islice, size, period, days, rx, rx, theta, i, _players[i]);
			//uniform planet orbit, increasing size from center
			//planet[i] = new pPlanet(_name[i], islice, 4+2*i, 10, 10, rx, rx, 0, i, _players[i]); 
			
			//set up linked list
			if(i == 0) {
				planet[i].next = i+1;
				planet[i].prev = NUMPLANETS-1;
			}
			else if(i<NUMPLANETS-1) {
				planet[i].next = i+1;
				planet[i].prev = i-1;
			}
			else if(i==NUMPLANETS-1) {
				planet[i].next = 0;
				planet[i].prev = i-1;
			}
			planet[i].dead = false;
			planet[i].wpnum = 0; //initial weapon selection
			planet[i].weapon[item.cannon] = new cannon(); //TODO: parametize
			planet[i].weapon[item.laser] = new laser();
			
			//console.log("planet: "+planet[i].id+", next: "+planet[i].next+", prev: "+planet[i].prev);
			//console.log(threat[i]);
		}
		return true;
	}

	var create_teams = function() {
		team = new Array();
		//create teams
		for(var i=0; i<NUMPLANETS; i++)
		{
			var j = _teams[i];
			if(!team[j]) team[j] = new Array();
			team[j].push(i);
			console.log("planet",i,"team",j,team[j]);
		}
		//create threat matrix
		for(var i=0; i<NUMPLANETS; i++) {
			
			threat[i] = new Array(NUMPLANETS);
			var total_threat = 0;
			var iteam = getTeam(i);
			for(var k=0; k<threat[i].length; k++)
			{
				if(iteam == getTeam(k)) { //if on same team, threat is 0
					threat[i][k] = 0;
				}
				else { //not on same team
					var tlevel = 1;
					threat[i][k] = tlevel;
					total_threat += tlevel;
				}
			}
			threat[i][NUMPLANETS] = total_threat;
		}
		console.log(threat);
		return true;
	}

	var init = function() {
		console.log("canvas size: "+CANVAS_SIZE/2);
		
		$("body").append("<canvas id='game_bg' style='position: absolute; border: none;' ></canvas>");
    	ctx3 = create_context( $("#game_bg") );
		
		$("body").append("<canvas id='game_under' style='position: absolute; border: none;' ></canvas>");
    	ctx2 = create_context( $("#game_under") );
		ctx2.translate(width/2, height/2); //move origin to center of canvas
		
		$("body").append("<canvas id='game_main' style='position: absolute; border: none;' ></canvas>");
    	ctx = create_context( $("#game_main") );
		ctx.translate(width/2, height/2); //move origin to center of canvas
		
		getInput(); //initialize event listeners
		create_level("img/space_bg/starfield.png");
		waitStart(state.menu);
	}

	var levelInit = function(sunsize, _images, planet, _teams, _players, _name, _startingstate, newplanets) {
		var level_ok = create_level(_images, sunsize);
		var planets_ok = !newplanets;
		if(newplanets) planets_ok = create_planets( planet, _teams, _players, _name );
		var team_ok = create_teams();
		
		if(level_ok && planets_ok && team_ok)
			waitStart(_startingstate);
	}
	
	var waitStart_t;
	var waitStart = function(_startingstate, r) {
		var s = _startingstate;
		var ready = r;
		if(ready) {
			console.log(planet);
			gamestate = s;
			se_delay = START_DELAY;
			clearTimeout(gameUpdate_t);
			clearTimeout(gameDraw_t);
			clearTimeout(waitStart_t);
			console.log("everything loaded");
			gameUpdate(); //start game
			gameDraw(); //start drawing game
		}
		else //if assets not ready, display loading, wait for objects to load
		{
			var loadcount = 0;
			for(var i in loaded)
			{
				if (i) {
					loadcount++;
				}
			}
			if(loadcount == loaded.length) ready = true;
			
			var c = ctx;
			c.fillStyle = "black";
			c.fillRect(-width/2, -height/2, width, height);
			c.textAlign = "center";
			c.textBaseline = "middle";
			c.strokeStyle = "#eee";
			c.strokeText("Loading... ("+loadcount+"/"+loaded.length+")",0,0);
			
			waitStart_t = setTimeout(function() {waitStart(s, ready)}, 10);
		}
	}
	
	var getInput = function() { //TODO: move get input into queue? or not
	
		var inc = 1;
		var keyarray = { //human readable key codes
			13: "enter",
			16: "shift",
			17: "ctrl",
			18: "alt",
			27: "esc",
			32: "space",
			37: "left",
			38: "up",
			39: "right",
			40: "down",
			80: "p",
			67: "c",
			88: "x",
			90: "z"
		};
		
		//keyboard controls
		$(document).keydown(function(event) {
			var signal = event.which;
			var key = keyarray[signal];
			console.log("signal: "+signal, "key: "+key);
			
			if(event.ctrlKey==1) inc = 3;
			if(event.shiftKey==1) inc = 10;
			if(event.shiftKey==1 && event.ctrlKey==1) inc = 30;

			if (key == "c") gamestate = state.over;
			
			if(gamestate == state.play && planet[turn] && planet[turn].controller == control.player) { //inputs only allowed on your turn during play
				event.preventDefault();
				var p = planet[turn];
				var angle = (180*p.angle)/(2*pi);
				var power = p.power;
				var maxpower = p.maxpower;
				switch(key) 
				{
					case "left": 
						if(angle-inc < -180) angle += 360;
						angle -= inc;
						break;
					case "right": 
						if(angle+inc > 180) angle -= 360;
						angle += inc;
						break;
					case "up":
						if(power+inc > maxpower || power > maxpower) 
							power = maxpower;
						else 
							power += inc;
						break;
					case "down": 
						if(power-inc < 0 || power < 0) 
							power = 0;
						else 
							power -= inc;
						break;
					case "z":
						if(p.firing < 0 && gamestate == state.play)
						{
							p.wpnum = 0;
						}
						break;
					case "x":
						if(p.firing < 0 && gamestate == state.play)
						{
							p.wpnum = 1;
						}
						break;
					case "space":
						if(p.firing < 0 && gamestate == state.play)
						{
							p.weapon[p.wpnum].launch(turn);
						}
						break;
					default: break;
				}
				planet[turn].power = power;
				planet[turn].angle = 2*pi*angle/180;
			}
			else if(gamestate == state.campaign) {
				switch(key)
				{
					case "enter":
						nameInputUpdate(turn);
						break;
				}
			}
			switch(key) //allow input regardless if its your turn or not
			{
				case "p":
					if(gamestate == state.play) {
						gamestate = state.pause;
					}
					else if(gamestate == state.pause) {
						gamestate = state.play;
						gameUpdate();
						gameDraw();
					}
					break;
				case "esc": 
					gamestate = state.menu;
					$("#slider").css("display", "none"); //hide ai difficulty slider
					break;
				default: break;
			}
		});
		
		//mouse controls
		$("canvas").mousedown(function(event) { //start aiming, option buttons/sliders
			var x = event.pageX - $(this).offset().left;
			var y = event.pageY - $(this).offset().top;
			var ix = event.pageX;
			var iy = event.pageY;
			//translate origin to center
			x += -width/2;
			y += -height/2;
			//console.log("mousedown");
			var sliderUpdate = function(o, x, stepx, y, stepy) {
				if(stepx) o.xlevel = round( getDist(o.x,0,x,0)/(o.width*stepx) ) * stepx;
				if(stepy) o.ylevel = round( getDist(o.y,0,y,0)/(o.height*stepy) ) * stepy;
			}
			if(gamestate == state.play) {
				/*update aiming indicator to follow mouse position, not necessary, but looks good*/
				$("canvas").mousemove(function(event) {
					var x = event.pageX - $(this).offset().left;
					var y = event.pageY - $(this).offset().top;
					//translate origin to center
					x += -width/2;
					y += -height/2;
					if(planet[turn].controller == control.player)
					{
						var i = turn;
						planet[i].angle = getAngle(x,y,planet[i].p[0],planet[i].p[1]);
					}
				});
				/**/
			}
			else if(gamestate == state.campaign) {
				x += listelement*liststart; //fix for canvas translation
				for(var i=liststart; i<liststart+listsize; i++) {
					var b = planet[i];
					if(!planetbutton[i]) break;
					if ( checkRound(planetbutton[i].rPlanet,x,y) ) {
						b.img += 50;
						if (b.img > 8*50) b.img = 50;
					}
					else if ( checkRect(planetbutton[i].bName,x,y) ) {
						if( !$("#nameInput").is(":visible") ) {
							turn = i; //recycle variable otherwise not used
							var input = "<div id='nameInput' style='position:absolute;top:"
							+iy+"px;left:"+ix+"px;'><input id='ibox' onMouseUp='return false' ></input></div>";
							$("body").append(input);
							$("#ibox").val("Enter Planet Name").focus(function() {
								$(this).select();
							});
						}
					}
					else if ( checkRect(planetbutton[i].sSize,x,y) ) {
						sliderUpdate(planetbutton[i].sSize, x, PSTEPSIZE);
						planet[i].size = (planetbutton[i].sSize.xlevel)*(PMAXSIZE-PMINSIZE)+PMINSIZE;
					}
					else if ( checkRect(planetbutton[i].sCont,x,y) ) {
						sliderUpdate(planetbutton[i].sCont, x, 1/(control.length));
						planet[i].controller = round( (planetbutton[i].sCont.xlevel)*(control.length-1) );
					}
					else if ( checkRect(planetbutton[i].sTeam,x,y) ) {
						sliderUpdate(planetbutton[i].sTeam, x, 1/_players.length);
						_teams[i] = round(planetbutton[i].sTeam.xlevel*_players.length);
					}
				}
				/*update slider for planet creation*/
				$("canvas").mousemove(function(event) {
					var x = event.pageX - $(this).offset().left;
					var y = event.pageY - $(this).offset().top;
					//translate origin to center
					x += -width/2;
					y += -height/2;
					var inside = false;
					x += listelement*liststart; //fix for canvas translation
					for(var i=liststart; i<liststart+listsize; i++) {
						var b = planet[i];
						if(!planetbutton[i]) break;
						if ( checkRect(planetbutton[i].sSize,x,y) ) {
							sliderUpdate(planetbutton[i].sSize, x, PSTEPSIZE);
							planet[i].size = (planetbutton[i].sSize.xlevel)*(PMAXSIZE-PMINSIZE)+PMINSIZE;
							inside = true;
						}
						else if ( checkRect(planetbutton[i].sCont,x,y) ) {
							sliderUpdate(planetbutton[i].sCont, x, 1/(control.length));
							planet[i].controller = round( (planetbutton[i].sCont.xlevel)*(control.length-1) );
							inside = true;
						}
						else if ( checkRect(planetbutton[i].sTeam,x,y) ) {
							sliderUpdate(planetbutton[i].sTeam, x, 1/_players.length);
							_teams[i] = round(planetbutton[i].sTeam.xlevel*_players.length);
							inside = true;
						}
					}
					if(!inside)
						$("canvas").unbind("mousemove");
				});
				/**/
			}
			else if(gamestate == state.options) {
				if (checkRect(options.vol_master,x,y) ) {
					sliderUpdate(options.vol_master,x,0.1);
					volume = options.vol_master.xlevel;
				}
				else if (checkRect(options.vol_music,x,y) ) {
					sliderUpdate(options.vol_music,x,0.1);
					vol_music = options.vol_music.xlevel;
				}
				else if (checkRect(options.vol_explo,x,y) ) {
					sliderUpdate(options.vol_explo,x,0.1);
					vol_explo = options.vol_explo.xlevel;
				}
				else if (checkRect(options.gamespeed,x,y) ) {
					sliderUpdate(options.gamespeed,x,0.1);
					fps = round( 60*options.gamespeed.xlevel );
				}
			}
		});
		
		$("canvas").mouseup(function(event) { //fire weapon, click buttons, 
			var x = event.pageX - $(this).offset().left;
			var y = event.pageY - $(this).offset().top;
			//translate origin to center
			x += -width/2;
			y += -height/2;
			//console.log("mouseup");
			$("canvas").unbind("mousemove");
			if(gamestate == state.play) {
				console.log("mouseup", planet[turn].name, planet[turn].wpnum);
				if( planet[turn].controller == control.player && planet[turn].firing < 0 ) //planet is not firing and is a player
				{
					var i = turn;
					planet[i].firing = planet[i].wpnum;
					planet[i].angle = atan2(y-planet[i].p[1], x-planet[i].p[0]);
					planet[i].weapon[planet[i].wpnum].launch(i);
				}
			}
			else if(gamestate == state.menu) {
				if( checkRect(bQstart,x,y) ) { //start quick game
					ctx.clearRect(-width/2, -height/2, width, height);
					ctx2.clearRect(-width/2, -height/2, width, height);
					
					_teams = new Array();
					_players = new Array();
					_name = new Array();

					var sunsize = 25;
					_teams.push(0,1,2,3,4,5);
					var p = control.player;
					_players.push(p,p,p,p,p,control.moron);
					var p = PLANETNAMES.slice(0,PLANETNAMES.length);
					for(var i in _players) {
						var rand = floor(random()*p.length);
						var temp = _name.push(p.splice(rand,1));
					}
					
					//game options
					//wallstate = wall.bouncy;
					wall.x = 0.2;
					
					levelInit(sunsize, "img/space_bg/starfield.png", planet, _teams, _players, _name, state.play, true);
					console.log("start game");
				}
				else if ( checkRect(bCamp,x,y) ) { //go to campaign menu
					
					_teams = new Array();
					_players = new Array();
					_name = new Array();

					var sunsize = 25;
					_teams.push(1,1,2,2,3,3);
					_players.push(control.player,1,1,1,1,1);
					var p = PLANETNAMES.slice(0,PLANETNAMES.length);
					for(var i in _players) {
						var rand = floor(random()*p.length);
						var temp = _name.push(p.splice(rand,1));
					}
					levelInit(sunsize, "img/space_bg/starfield.png", planet, _teams, _players, _name, state.campaign, true);

					
					NUMPLANETS = min(_players.length, MAXPLANETS);
					PMAXSIZE = round(7+4+sqrt(NUMPLANETS)); //see create_planets()
					var pboxsize = 36;
					var sbwidth = 30;
					var boxwidth = width*(1-0.2)-2*sbwidth;
					listsize = round( (boxwidth-2*sbwidth)/(2.2*pboxsize) );
					liststart = 0;
					listelement = 2.2*pboxsize;
					
					console.log("maxplanets",MAXPLANETS, "numplanets", NUMPLANETS, "listsize", listsize, "numteams", getNumTeams() );

					var left;
					var top = 0;
					var sunwidth = 75;
					for(var i=0; i<NUMPLANETS; i++) {
						left = -sbwidth-boxwidth+sunwidth+width/2+listelement*i+0.1*pboxsize;
						planetbutton[i] = new citem(left, top, 2*pboxsize, 2*pboxsize, planet[i]);
					}
					top -= pboxsize;
					left = -2*sbwidth-boxwidth-pboxsize+sunwidth+width/2;
					bQleft  = new button("left", 		left, top, sbwidth, 2*pboxsize, "red", 0,0);
					left += boxwidth-sbwidth;
					bQright = new button("right", 		left, top, sbwidth, 2*pboxsize, "red", 0,0);
					
					console.log("go to campaign screen");
				}
				else if ( checkRect(bTut,x,y) ) { //tutorial
					gamestate = state.tutorial;
					console.log("go to tutorial screen");
				}
				else if ( checkRect(bOptions,x,y) ) { //tutorial
					gamestate = state.options;
					console.log("go to options");
				}
			}
			else if(gamestate == state.campaign) {
				//console.log("campaign stuff",_teams, _players, _name, planet);
				if( $("#nameInput").is(":visible") ) {
					nameInputUpdate(turn);
				}
				else if ( checkRect(bQleft,x,y) ) {
					if(liststart > 0) {
						console.log("move planets left");
						liststart -= 1;
					}
				}
				else if ( checkRect(bQright,x,y) ) {
					if(liststart+listsize < NUMPLANETS) {
						console.log("move planets right");
						liststart += 1;
					}
				}
				else if ( checkRect(bStart,x,y) ) {
					ctx.clearRect(-width/2, -height/2, width, height); //clear screen
					ctx2.clearRect(-width/2, -height/2, width, height);
					
					//game options
					wallstate = wall.bouncy;
					var sunsize = 30;
					NUMPLANETS = min(_players.length, MAXPLANETS);
					for(var i in planet) console.log(i, planet[i].name, planet[i].size);
					
					levelInit(sunsize, "img/space_bg/starfield.png", planet, _teams, _players, _name, state.play, false);
				}
			}
		});

		$("canvas").mousewheel(function(event, delta, deltaX, deltaY) { //change power, additional method for sliders
			if(gamestate == state.play && planet[turn] && planet[turn].controller == control.player) {
				var i = turn;
				if(planet[i].power + delta*inc > planet[i].maxpower || planet[i].power > planet[i].maxpower) 
					planet[i].power = planet[i].maxpower;
				else if(planet[i].power + delta*inc < 0 || planet[i].power < 0)
					planet[i].power = 0;
				else
					planet[i].power += delta*inc;
			}
			else if(gamestate == state.campaign) {
				var x = event.pageX - $(this).offset().left;
				var y = event.pageY - $(this).offset().top;
				//translate origin to center
				x += -width/2;
				y += -height/2;
				x += listelement*liststart; //fix for canvas translation
				for(var i=liststart; i<liststart+listsize; i++) {

					var b = planet[i];
					if ( checkRound(planetbutton[i].rPlanet,x,y) ) {
						b.img += delta*50;
						if (b.img > 8*50) b.img = 50;
						if (b.img < 50) b.img = 8*50;
					}
					else if ( checkRect(planetbutton[i].sSize,x,y) ) {
						var a = planetbutton[i].sSize;
						var step = 0.1;
						a.xlevel += delta*step;

						if(a.xlevel > 1) a.xlevel = 1;
						else if(a.xlevel < 0) a.xlevel = 0;
						
						planet[i].size = (a.xlevel)*(PMAXSIZE-PMINSIZE)+PMINSIZE;
					}
					else if ( checkRect(planetbutton[i].sCont,x,y) ) {
						var a = planetbutton[i].sCont;
						var level = getDist(a.x,0,x,0);
						var step = 1/(control.length);
						var ratio = round( level/(a.width*step) ) * step;
						a.xlevel += delta*step;
						
						if(a.xlevel > 1) a.xlevel = 1;
						else if(a.xlevel < 0) a.xlevel = 0;
						
						planet[i].controller = round((a.xlevel)*(control.length-1));
					}
					else if ( checkRect(planetbutton[i].sTeam,x,y) ) {
						var a = planetbutton[i].sTeam;
						var level = getDist(a.x,0,x,0);
						var step = 1/_players.length;
						var ratio = round( level/(a.width*step) ) * step;
						a.xlevel += delta*step;
						
						if(a.xlevel > 1) a.xlevel = 1;
						else if(a.xlevel < 0) a.xlevel = 0;
						
						var t = round(a.xlevel*_players.length);
						_teams[i] = t;
					}
				}
			}
		});
		
	} //end getInput

	var button = function(label, x, y, w, h, color, xshift, yshift) {
		this.name = label;
		this.x = x;
		this.y = y;
		this.width = w;
		this.height = h;
		
		this.draw = function() {
			var c = ctx;
			c.save();
				//c.translate(-width/2, -height/2); //messes with click detection
				c.fillStyle = color;
				c.fillRect(x, y, this.width, this.height);
				
				c.textAlign = "center";
				c.textBaseline = "middle";
				c.fillStyle = "black";
				c.fillText(this.name, x+xshift+this.width/2, y-yshift+this.height/2);
			c.restore();
		}
	}
	var bwidth = 150;
	var bx = bwidth/2;
	var bQstart = new button("Quick Start (Debug)",		-bx,	-50,	bwidth, 50, "red", 0, 0);
	var bCamp = new button("New Level", 				-bx,	0,  	bwidth, 50, "green", 0, 0);
	var bTut = new button("Tutorial", 					-bx,	50, 	bwidth, 50, "purple", 0, 0);
	var bOptions = new button("Options", 				-bx, 	100,	bwidth, 50, "orange", 0, 0);
	
	var bStart = new button("Start Game", 				-100, height/2-50, 200, 50, "pink", 0, 0);
	var bQleft;
	var bQright;
	
	var rbutton = function(label, x, y, r, color, xshift, yshift) {
		this.name = label;
		this.x = x;
		this.y = y;
		this.radius = r;
		this.color = color;
		
		this.draw = function() {
			var c = ctx;
			c.save();
				c.fillStyle = this.color;
				c.arc(this.x, this.y, this.radius, 0, 2*pi);
				c.fill();
				if(xshift && yshift) {
					c.textAlign = "center";
					c.textBaseline = "middle";
					c.fillStyle = "black";
					c.fillText(this.name, this.x+xshift, this.y-yshift);
				}
			c.restore();
		}
	}

	var slider = function(label, x, y, w, h, xlevel, ylevel, backcolor, forecolor, xshift, yshift) {
		this.name = label;
		this.x = x;
		this.y = y;
		this.width = w;
		this.height = h;
		this.xlevel = xlevel;
		this.ylevel = ylevel;
		this.c1 = backcolor;
		this.c2 = forecolor;
		this.tc = "black";
		
		this.draw = function() {
			var c = ctx;
			c.save();
				//c.translate(-width/2, -height/2); //messes with click detection
				c.fillStyle = this.c1;
				c.fillRect(this.x, this.y, this.width, this.height);
				c.fillStyle = this.c2;
				c.fillRect(this.x, this.y, this.xlevel*this.width, this.ylevel*this.height);
				
				c.textAlign = "center";
				c.textBaseline = "middle";
				if(this.tc != "black") {
					c.lineWidth = "2";
					c.strokeStyle = "black";
					c.strokeText(this.name, x+xshift+this.width/2, y-yshift+this.height/2);
				}
				c.fillStyle = this.tc;
				c.fillText(this.name, x+xshift+this.width/2, y-yshift+this.height/2);
			c.restore();
		}
	}
	
	var gameUpdate_t;
	var gameUpdate = function() {
		if(gamestate == state.play) {
			//update planets 
			for(var i in planet) {
				if(planet[i].dead) {
					var iteam = getTeam(i);
					team[iteam].splice(team[iteam].indexOf(planet[i].id),1);
					//TODO: write planet info to save for end of game stats/next level
					delete planet[i];
				}
				else {
					planet[i].orbit_ellipse();
				}
			}

			//update projectiles
			if(planet[turn].firing >= 0) {
				planet[turn].weapon[planet[turn].wpnum].fire();
			}
			
			//brief pause at beginning of game
			if(se_delay > 0) { 
				se_delay--;
			}

			//handle new turn events
			if(lastturn != turn) {
				if(planet[turn].atmo < planet[turn].maxatmo) 
					planet[turn].atmo += planet[turn].atmoregen;
				lastturn = turn;
				timeleft = TIME_LIMIT;
				ai_think = AI_DELAY;
				/*
				for(var i in team) {
					console.log("team: ",getTeam(team[i][0]), teamcolor[getTeam(team[i][0])],"mates",team[i],"teamsize:", team[i].length);
				}
				console.log("potential winner: ",teamleft);
				//console.log("threat",threat);
				/**/
			}

			//handle ai
			if(planet[turn]) {
				ai_think--;
				if(ai_think <= 0) go_ai(); 
			}
			
			//handle turn timeout
			if(timeleft <= 0 && planet[turn].firing < 0) {
				turn = planet[turn].next;
				timeleft = TIME_LIMIT;
			}
			else timeleft--;

			// update teams
			for(var i in team) {
				if(team[i].length > 0) teamleft = getTeam(team[i][0]);
			}
			
			//handle gameover
			if(getNumTeams() == 1) {
				se_delay--;
				if(se_delay < -END_DELAY) {
					gamestate = state.over;
				}
			}
		}
		else if(gamestate == state.pause) {
			clearTimeout(gameUpdate_t);
			return;
		}
		else if(gamestate == state.over) {
			message = "Team "+teamcolor[teamleft]+" wins!";
			team[teamleft] = null;
			clearTimeout(gameUpdate_t);
			return;
		}
		gameUpdate_t = setTimeout(gameUpdate, 1000/fps);
	}
	
	var gameDraw_t;
	var gameDraw = function() {
		gameDraw_t = window.requestAnimationFrame(gameDraw);
	
		if(gamestate == state.play) {
			ctx.clearRect(-width/2, -height/2, width, height); //clear the entire canvas
			if(timeleft > 0) {  //draw timer + turn alert
				var c = ctx;
				c.save();
				c.font = "normal 36px sans-serif";
				
				if(planet[turn].controller == control.player) {
					c.beginPath();
					c.lineWidth = 6;
					c.strokeStyle = teamcolor[getTeam(turn)];
					c.arc(0, 0, CANVAS_SIZE/2-border, -pi*(timeleft/TIME_LIMIT)+pi/2, pi*(timeleft/TIME_LIMIT)+pi/2, false);
					c.stroke();
					
					c.fillStyle = c.strokeStyle;
					c.textAlign = "center";
					if(timeleft > 1000) {
						c.fillText("Player: "+planet[turn].name+"'s Turn", 0, -height/2+100);
					}
				}
				else {
					c.fillText("AI: "+planet[turn].name+"'s Turn", 0, -height/2+100);
				}
				
				c.restore();
			}
			
			gui.draw( planet[turn] );
			sol.draw();
			for(var i in planet)
			{
				if(planet[i])
					planet[i].draw(planet[i]);
			}
			if(planet[turn] && planet[turn].firing >= 0) 
				planet[turn].weapon[planet[turn].wpnum].draw();

			fpsdisplay(width/2-20, -height/2+20);
		}
		else if(gamestate == state.campaign) {
			var c = ctx;
			
			c.drawImage(camp_menu, -width/2, -height/2, width, height);
			
			for(var i=liststart; i<liststart+listsize; i++) {
				c.save();
					c.translate(-listelement*liststart, 0);
					if(planetbutton[i]) planetbutton[i].draw();
				c.restore();
			}
			
			bStart.draw();
			if(liststart+listsize < NUMPLANETS+1) {
				if(liststart > 0) bQleft.draw();
				if(liststart < NUMPLANETS-listsize) bQright.draw();
			}
			fpsdisplay(width/2-20, -height/2+20);
		}
		else if(gamestate == state.menu) {
			var c = ctx;
			
			c.fillStyle = "rgba(0,0,0,1)";
			c.fillRect(-width/2, -height/2, width, height);
			
			c.drawImage(skin, -width/2, -height/2, width, height);
			
			c.textAlign = "center";
			c.textBaseline = "middle";
			c.fillStyle = "#eee";
			c.save();
				c.font = "normal 36px sans-serif";
				c.fillText("SCORCHED EARTHS", 0, -100);
				c.font = "normal 12px sans-serif";
				c.fillText(rev, 0, -74);
			c.restore();
			
			bQstart.draw();
			bCamp.draw();
			bTut.draw();
			bOptions.draw();
		}
		else if(gamestate == state.tutorial) {
			var c = ctx;
			var hit = 16;
			var h = hit;
			
			c.fillStyle = "#111";
			c.fillRect(-width/2, -height/2, width, height);
			c.save();
				c.font = "normal "+hit+"px sans-serif";
				c.textAlign = "center";
				c.textBaseline = "middle";
				c.fillStyle = "#eee";
				hit += 5;
				c.fillText("Scorched Earths (pre-alpha)",0,-hit);
				c.fillText("CTRL 3x increment, SHIFT 10x increment",0,h); h += hit;
				c.fillText("P pause, ESC exit to menu at any time", 0, h); h += hit;
				c.fillText("Z select bullet, X select laser", 0, h); h += hit;
				c.fillText("MOUSE: click to fire, mousewheel adjusts power", 0, h); h += hit;
				c.fillText("KEYBOARD: SPACE to fire, LEFT/RIGHT adjust angle",0,h); h += hit;
				c.fillText("UP/DOWN adjust power", 0, h); h += hit;
			c.restore();
		}
		else if(gamestate == state.pause) {
			/**/
			var c = ctx;
			c.save();
				c.textAlign = "center";
				c.textBaseline = "middle";
				c.fillStyle = "rgba(0,0,0,0.6)";
				c.fillRect(-width/2, -height/2, width, height);
				c.lineWidth = 1;
				c.strokeStyle = "#eee";
				c.strokeText("Paused",0, -height/6);
			c.restore();
			/**/
			window.cancelAnimationFrame(gameDraw_raf);
			clearTimeout(gameDraw_t);
			return;
		}
		else if(gamestate == state.over) {
			var c = ctx;
			var lh = 16;
			var l = lh;
			c.fillStyle = "black";
			c.fillRect(-width/2, -height/2, width, height);
			c.save();
				c.translate(-width/2, -height/2); //back to normal coordinates
				c.lineWidth = 1;
				c.textAlign = "left";
				for (var i in planet) { //planet name, shots fired, shots hit, hit %, damage done, damage taken,
					c.fillStyle = teamcolor[getTeam(i)];
					c.fillText(planet[i].name+": fired "+planet[i].shotsfired+", hit "+planet[i].shotshit+" accuracy "+(planet[i].shotshit/planet[i].shotsfired*100).toFixed(0)+"% ...EOL;", 10, 10+l); l+=lh;
				}
				
				c.textAlign = "center";
				c.textBaseline = "middle";
				c.fillStyle = "white";
				c.font = "normal 24px sans-serif";
				c.fillText("GAME is OVER", width/2, height/2-30);
				c.fillText(message, width/2, height/2+10);
				c.font = "normal 12px sans-serif";
				c.fillText("(press esc to go back to menu)", width/2, height/2+35);
			c.restore();
			fpsdisplay(width/2-20, -height/2+20);
		}
		else if(gamestate == state.options) {
			var c = ctx;
			var lh = 16, l=-4, w=0.5*(-width/2); 
			c.fillStyle = "black";
			c.fillRect(-width/2, -height/2, width, height);
			c.save();
				c.textAlign = "left";
				c.textBaseline = "middle";
				c.fillStyle = "white";
				
				c.font = "normal "+round(1.5*lh)+"px sans-serif";
				c.fillText("Settings:", w, 1.5*l*lh); l++;
				
				c.font = "normal "+(lh-2)+"px sans-serif";
				c.fillText("volume - master", w, l*lh); l++;
				c.fillText("volume - music", w, l*lh); l++;
				c.fillText("volume - explosions", w, l*lh); l++;
				c.fillText("turn time limit", w, l*lh); l++;
				c.fillText("gravity", w, l*lh); l++;
				c.fillText("boundary type", w, l*lh); l++;
				c.fillText("ai delay", w, l*lh); l++;
				c.fillText("size scale (changes planet distance -> more planets which are smaller)", w, l*lh); l++; //TODO: zoom in/out?
				c.fillText("keybindings", w, l*lh); l++;
				c.fillText("weapon limits/choices", w, l*lh); l++;
				c.fillText("realtime mode / turn based mode", w, l*lh); l++;
				c.fillText("display names/indicators/taunts/shadows/etc.", w, l*lh); l++;
				c.fillText("", w, l*lh); l++;
			c.restore();
			options.draw();
			fpsdisplay(width/2-20, -height/2+20);
		}
		
	}
	
	var go_ai = function() {
		//check to make sure planet is an ai and ai hasn't already fired
		if(planet[turn].controller != control.player && planet[turn].firing < 0) 
		{
			var ai_angle, ai_power, ai_weapon;
			var numweapons = planet[turn].weapon.length-1;
			var ai = planet[turn].controller;
			
			var getTarget = function(turn) {
				var targ = random();
				var et = 0;
				for(var i=0; i<NUMPLANETS; i++)
				{
					var tar = threat[turn][i];
					var get = threat[turn][NUMPLANETS];
					//console.log(NUMPLANETS,"random #",targ.toFixed(2), "bracket", et, "threat of planet "+i+":",tar, "out of this much",get);
					et += tar/get;
					if(targ < et)
						return i;
				}
				return -1;
			}

			var shoot_random = function() { //simplest aiming function, any hit is purely based on luck
				ai_angle = random()*2*pi;
				ai_power = random()*planet[turn].maxpower;
			}
			
			var shoot_direct = function(error) { //aim where target is currently positioned
				var r = random()*2*error-error; //TODO: fix randomness
				var tx = planet[target].p[0]+r;
				var ty = planet[target].p[1]+r;
				var sx = planet[turn].p[0];
				var sy = planet[turn].p[1];
				ai_angle = atan2(ty-sy, tx-sx);
			}
			
			var shoot_linear_predict = function() { //very simple ai which leads based on tangential velocity only
				var r = random()*5+20;
				var tx = planet[target].p[0]+r*(planet[target].v[0]-planet[turn].v[0]);
				var ty = planet[target].p[1]+r*(planet[target].v[1]-planet[turn].v[1]);
				var sx = planet[turn].p[0];
				var sy = planet[turn].p[1];
				ai_angle = atan2(ty-sy, tx-sx);
			}
			
			var shoot_predict = function() { // aims where planet will be based on tangential velocity and distance
				var dx = planet[target].p[0]-planet[turn].p[0];
				var dy = planet[target].p[1]-planet[turn].p[1];
				var dist = pow((dx*dx)+(dy*dy), 0.5);
				var r = random()*1+9;
				var tx = planet[target].p[0]+dist/r*(planet[target].v[0]-planet[turn].v[0]);
				var ty = planet[target].p[1]+dist/r*(planet[target].v[1]-planet[turn].v[1]);
				var sx = planet[turn].p[0];
				var sy = planet[turn].p[1];
				ai_angle = atan2(ty-sy, tx-sx);
			}
			//TODO: fix
			// even smarter AI: account for angular velocity and distance
			var shoot_better = function() {
				var dx = planet[target].p[0]-planet[turn].p[0];
				var dy = planet[target].p[1]-planet[turn].p[1];
				var dist = pow((dx*dx)+(dy*dy), 0.5);
				var frames = dist/(0.05*power+planet[turn].v[0]);
			
				var tx = planet[target].p[0]+delta*planet[target].v[0];
				var ty = planet[target].p[1]+delta*planet[target].v[1];
				var sx = planet[turn].p[0]+planet[turn].v[0];
				var sy = planet[turn].p[1]+planet[turn].v[1];
				ai_angle = atan2(ty-sy, tx-sx);
			}
			
			var target = getTarget(turn);
			if(target >= 0)
			{
				ai_angle = -2*pi;
				ai_power = planet[turn].maxpower;
				ai_weapon = round( random()*numweapons ); //choose weapon
				//ai_weapon = 1;
				switch(ai_weapon)
				{
					case 0:
						switch(ai)
						{
							case control.moron:
							case control.shooter:
								shoot_random();
							case control.poolshark:
							case control.tosser:
							case control.chooser:
							case control.spoiler:
							case control.cyborg:
								shoot_predict();
								break;
							default:
								console.log("ai",ai,"does not exist!");
						}
						break;
					case 1:
						switch(ai)
						{
							case control.moron:
								shoot_direct(300);
							case control.shooter:
							case control.poolshark:
							case control.tosser:
							case control.chooser:
							case control.spoiler:
								shoot_direct(1);
							case control.cyborg:
								shoot_direct(0);
								break;
							default:
								console.log("ai",ai,"does not exist!");
						}
						break;
					default:
						console.log("ERROR weapon "+ai_weapon+" does not exist");
						break;
				}
				
				console.log(planet[turn].name+"("+planet[turn].id+") shot at "+planet[target].name+"("+planet[target].id+") with weapon "+ai_weapon);
					
				planet[turn].angle = ai_angle;
				planet[turn].power = ai_power;
				planet[turn].wpnum = ai_weapon;
				planet[turn].weapon[ai_weapon].launch(turn);
				
				var heat = 1; //threat increase of shot
				threat[target][turn] += heat; //get mad at who shot you //TODO: fix planets shooting themselves
				threat[target][NUMPLANETS] += heat;
			}
			else console.log("no planets left to shoot");
		}
	}
	
	var ui = function(src) {
		var line = new Array();
		line[0] = new Array();
		line[1] = new Array();
		line[2] = new Array();
		line[3] = new Array();
		
		this.draw = function(planetx) {
			var c = ctx, lh = 14, l;
			c.save();
			c.fillStyle = "white";
			c.font = "normal "+(lh-2)+"px sans-serif";
			
			//bottom right
			l = 0;
			c.textAlign = "right";
			c.textBaseline = "bottom";
			//c.fillText("testing bottom right section", width/2-border, height/2-border);
			line[0][0] = "power: "+planetx.power.toFixed(1);
			line[0][1] = "angle: "+(180*(planetx.angle+pi/2)/(pi)).toFixed(1);
			for (var i in line[0]) {
				c.fillText(line[0][i], width/2-border, height/2-border-l*lh); l++;
			}

			//bototm left
			l = 0;
			c.textAlign = "left";
			//c.fillText("testing bottom left section", -width/2+border, height/2-border-l*lh);
			line[1][0] = "weapon: "+weaponText(planetx.wpnum);
			for (var i in line[1]) {
				c.fillText(line[1][i], -width/2+border, height/2-border-l*lh); l++;
			}

			//upper left
			l = 0;
			c.textBaseline = "top";
			//c.fillText("testing upper left section", -width/2+border, -height/2+border);
			line[2][0] = planetx.name+" health: "+planetx.health.toFixed(1);
			line[2][1] = "atmosphere: "+planetx.atmo.toFixed(1);
			for (var i in line[2]) {
				c.fillText(line[2][i], -width/2+border, -height/2+border+l*lh); l++;
			}

			//upper right
			l = 0;
			c.textAlign = "right";
			//c.fillText("testing upper right section", width/2-border, -height/2+border+l*lh);
			line[3] = cmsg;
			for (var i in line[3]) {
				c.fillText(line[3][i], width/2-border, -height/2+border+l*lh);
			}
			c.restore();
		}
	}

	var citem = function(left, top, w, h, planetx) {
		var size = round( w*(planetx.size/PMAXSIZE) );
		var barbg = "rgba(200,200,200,0.5)";
		var barfg = "rgba(250,250,250,0.7)";
		
		this.rPlanet = new rbutton("arglebargle", left, 0, size/2, "rgba(20,20,20,0.0)");
		this.bName = new button(planetx.name, left-w/2, listelement/2, w, 20, "rgba(250,250,250,0.8)", 0, 0);
		
		var step = PSTEPSIZE;
		var initial = round(planetx.size/(PMAXSIZE*step))*step;
		this.sSize = new slider("size", left-w/2, listelement/2+25, w, 20, initial, 1, barbg, barfg, 0, 0);

		step = 1/control.length;
		initial = round((planetx.controller)/((control.length-1)*step))*step;
		this.sCont = new slider(controlText(planetx.controller), left-w/2, listelement/2+50, w, 20, initial, 1, barbg, barfg, 0, 0);
		
		step = 1/_players.length;
		console.log("TEAM", getTeam(planetx.id), "#TS", getNumTeams(_teams) );
		initial = round( getTeam(planetx.id)/(_players.length*step) ) * step;
		this.sTeam = new slider("team"+getTeam(planetx.id), left-w/2, listelement/2+75, w, 20, initial, 1, barbg, barfg, 0, 0);
		
		this.planet = planetx;
		
		this.draw = function() {
			var c = ctx;
			var size = round( w*(planetx.size/PMAXSIZE) );
			//draw planet
			c.drawImage(pimage, 0, planetx.img-1, 50, 50, left-size/2, top-size/2, size, size);
			//draw shadow
			c.save(); 
			c.globalCompositeOperation = "source-atop";
			c.globalAlpha = 0.7;
			c.drawImage(pimage, 0, 0, 50, 50, left-size/2, top-size/2, size, size);
			c.restore();
			//draw buttons
			this.rPlanet.radius = size/2;
			this.rPlanet.draw();
			this.sSize.draw();
			this.sCont.name = controlText(planetx.controller);
			this.sCont.draw();
			this.sTeam.name = "team: "+getTeam(planetx.id, _teams);
			this.sTeam.tc = teamcolor[getTeam(planetx.id, _teams)];
			this.sTeam.draw();
			this.bName.name = planetx.name;
			this.bName.draw();
		}
	}

	var option = function() {
		var barbg = "rgba(200,200,200,0.5)";
		var barfg = "rgba(250,250,250,0.7)";
		var x = -width/2;
		var y = -height/2;
		var w = 100;
		var h = 20;
		this.vol_master = new slider("Master Volume", x, y, w, h, volume, 1, barbg, barfg, 0, 0); y += h+5;
		this.vol_music  = new slider("Music Volume",  x, y, w, h, vol_music, 1, barbg, barfg, 0, 0); y += h+5;
		this.vol_explo  = new slider("Effects Volume",x, y, w, h, vol_explo, 1, barbg, barfg, 0, 0); y += h+5;
		this.gamespeed  = new slider("Game Speed",    x, y, w, h, round( fps/60 ), 1, barbg, barfg, 0, 0); y += h+5;

		this.draw = function() {
			this.vol_master.draw();
			this.vol_music.draw();
			this.vol_explo.draw();
			this.gamespeed.draw();
		}
	}
	var options = new option();
	
	var sun = function(src, size, mass) {
		if (typeof size    == "undefined") size  = 30;
		if (typeof mass    == "undefined") mass  = 300;
		var theta=0;
		var period=0.01;
		this.size = size;
		
		this.draw = function() {
			var c = ctx;
			if(period*theta >= 2*pi) theta = 0;
			c.save();
				c.rotate(period*theta);
				c.clearRect(-size-1, -size-1, 2*size+2, 2*size+2);
				c.drawImage(src, -size, -size, 2*size, 2*size);
				c.globalCompositeOperation = "source-atop"; //source in gets rid of everything previous
				c.fillStyle = suncolor;
				c.fillRect(-size, -size, 2*size, 2*size);
			c.restore();
			theta++;
		}
	}
	
	var pPlanet = function( name, islice, size, period, days, rx, ry, _theta, _id, _playertype ) {
			/*
		if (typeof name    == "undefined" || name == "")
			//name = planetnames.splice(round((random()*planetnames.length)),1); //prevent name duplication
			name = "ERROR: gimme a name";
	*/
		var cos = Math.cos;
		var sin = Math.sin;
		
		var name = name;
		this.name = name;
		var id = _id;
		var img = islice;
		var prev, next;
		var angle = -pi/2;		//shot angle
		var power = 150;		//shot power
		var maxpower = 2*power;
		var health = 2*size;
		var maxhealth = health;
		var atmo = 20;
		var atmoregen = 1;
		var maxatmo = atmo;
		var firing = -1;
		var shotsfired = 0;
		var shotshit = 0;
		var weapon = new Array();
		var controller = _playertype;
	
		var p = [0,0];		//position x, y
		var v = [0,0];		//velocity x, y
		var a = [0,0];		//acceleration x, y
		var dpx = 0, dpy = 0;		//delta p
		var dvx = 0, dvy = 0;		//delta v
	
		var theta = _theta; 					//initial angular position
		var delta = 2*pi/(fps*period);		//angular velocity in radians/frame
		
		//planet trails
		var count = 0;
		var trailx = new Array();
		var traily = new Array();
		var length = 7*rx/(PLANETDIST+period); //how long (in dots) is the tail
		
		var orbit_ellipse = function() {
			if(theta >= 2*pi) theta = 0;
			//fps = 1000/frames;
			p[0] = rx*cos(theta);
			p[1] = ry*sin(theta);
			v[0] = p[0]-dpx;
			v[1] = p[1]-dpy;
			dpx = p[0];
			dpy = p[1];
		
			a[0] = v[0]-dvx;
			a[1] = v[1]-dvy;
			dvx = v[0];
			dvy = v[1];
		
			theta += delta;
		
		}
	
		var die = function() {
			console.log(this.name,"is dying",id,getTeam(id));
			for(var j=0; j<NUMPLANETS; j++) //remove dead planet from threat matrix
			{
				threat[j][NUMPLANETS] -= threat[j][id];
				threat[j][id] = 0;
			}
			sfx_explode.currentTime = 0;
			sfx_explode.play();
			planetexplode(0, 0);
			planet[this.prev].next = this.next;
			planet[this.next].prev = this.prev;
		}
		
		var planetexplode_t;
		var planetexplode = function(t, u) { //t,u are source coordinate indicies
			var s = size;
			var x = p[0];
			var y = p[1];
			
			var c = ctx;
			c.drawImage(vfx_explode, t*64, u*64, 64, 64, x-s, y-s, 2*s, 2*s); //TODO: move to draw loop
			//console.log(t, u);
			if(t>3) {
				t = 0;
				u += 1;
			}
			else {
				t += 1;
			}
			if(u<5) planetexplode_t = setTimeout(function() { planetexplode(t,u); }, 1000/fps); 
			else {
				clearTimeout(planetexplode_t);
				return true;
			}
		}
		
		//TODO: fixme
		var fadeplanettrails = function(trailx, traily) {
			//gradually removes planet trails of a destroyed planet
			var i = trailx.length;
			if(i)
			{
				var px = trailx.shift();
				var py = traily.shift();
				ctx2.clearRect(px-2, py-2, 4, 4);
				setTimeout(function() { fadeplanettrails(trailx, traily); }, fps); //do it all again
			}
			else
			{
				delete trailx;
				delete traily;
			}
		}

		var draw = function(planetx) {
			var c = ctx;
			size = planetx.size;
			/* quick draw 
			c.beginPath();
			c.fillStyle = teamcolor[getTeam(planetx.id)];
			c.arc(p[0], p[1], size, 0, 2*pi);
			c.fill();
			/**/
			
			/*draw planet*/
			c.save();
				c.translate(p[0], p[1]);
				//c.globalCompositeOperation = "destination-out";
				//c.clearRect(-size*2-5-v[0], -size*2-5-v[1], 4*size+10, 4*size+10);
				c.rotate(theta*days);
				c.drawImage(pimage, 0, planetx.img, 50, 50, -size, -size, 2*size, 2*size);
			c.restore();
			/**/
			/* draw shadow */
			c.save();
				c.translate(p[0], p[1]);
				c.rotate(theta);
				c.globalCompositeOperation = "source-atop";
				//light from sun
				c.globalAlpha = 0.3;
				c.fillStyle = suncolor;
				c.fillRect(-size, -size, 2*size, 2*size);
				//shadow from sun
				c.globalAlpha = 0.9;
				c.drawImage(pimage, 0, 0, 50, 50, -size, -size, 2*size, 2*size);
			c.restore();
			/**/
			/* draw other stuff */
			if(turn == id) draw_whosturn(planetx);
			//if(planet[id].control == 0) 
				draw_healthbars(planetx.health, planetx.atmo);
			draw_trails();
			draw_label(planetx);
			/**/
		}
		
		var draw_whosturn = function(planetx) {
			var c = ctx;
			var color, opacity=0.5, pos = p[1]-2*size;
			if(planet[turn].controller == control.player) color = "50,200,50";
			else color = "200,50,50";
			
			c.save();
				//c.globalCompositeOperation = "destination-over";
				c.lineWidth = "2";
				c.strokeStyle = "rgba("+color+","+(opacity+0.2)+")";
				c.fillStyle = "rgba("+color+","+opacity+")";
				c.beginPath();
				
				c.moveTo(p[0]+6, pos-9); //right
				c.lineTo(p[0], pos-3);   //bottom
				c.lineTo(p[0]-6, pos-9); //left
				c.lineTo(p[0]-6, pos-12); //left top
				c.lineTo(p[0]+6, pos-12); //right top
				c.lineTo(p[0]+6, pos-9); //right
				
				c.fill();
				c.stroke();
			c.restore();
			//draw_label(planetx.health);
			draw_indicator(planetx); //this somehow prevents whosturn graphics bug
		}
		
		var draw_trails = function() {
			count++;
			if(count > 10*PLANETDIST/rx)
			{
				if(!this.dead) trace(length--); //TODO: fix
				else trace(0);
				count = 0;
			}
		}
	
		var trace = function(l) {
			var c2 = ctx2;
			var len = l;
			var fl = 9;
			var trailcolor = "100,100,100";
			//var trailcolor = "255,0,0";
			trailx.push(p[0]);
			traily.push(p[1]);
			
			c2.beginPath();
			c2.fillStyle = "rgba("+trailcolor+",1)";
			c2.arc(p[0], p[1], 1, 0, 2*pi);
			c2.fill();
			
			for(len = fl; len >= 0; len--)
			{
				c2.clearRect(trailx[len]-1, traily[len]-1, 2, 2);
				c2.beginPath();
				c2.fillStyle = "rgba("+trailcolor+",0."+len+")";
				c2.arc(trailx[len], traily[len], 1, 0, 2*pi);
				c2.fill();
			}
			
			if(l <= 0)
			{
				var px = trailx.shift();
				var py = traily.shift();
				c2.clearRect(px-1, py-1, 2, 2);
				length++;
			}
		}
			
		var draw_label = function(planetx) {
			var label = planetx.name;
			var c = ctx;
			var m = c.measureText(label);
			m.height = 12;
			if(planet[id].control == 0) color = "50,200,50";
			else color = "200,50,50";
			c.save();
				c.lineWidth = 1;
				c.textAlign = "center";
				c.textBaseline = "top";
		
				c.strokeStyle = "black";
				c.font = "bold "+m.height+"px sans-serif";
				c.strokeText(label, p[0], p[1]+size+6);
		
				//c.fillStyle = "rgba("+color+",1)";
				c.fillStyle = teamcolor[getTeam(id)];
				c.font = "bold "+m.height+"px sans-serif";
				c.fillText(label, p[0], p[1]+size+6);
			c.restore();
			
			/* display planet health numerically
			c.textAlign = "left";
			c.fillText(h.toFixed(1), p[0]+m.width/2+5, p[1]+size);
			/**/
		}
		
		var draw_healthbars = function(bar_health, bar_atmo) {
			var c = ctx;
			var healthcolor = "rgba(250,50,50,0.3)";
			var atmocolor   = "rgba(50,250,50,0.3)";
			/* health bars
			c.fillStyle = healthcolor;
			c.fillRect(p[0]-size, p[1]-size-4, 2*size*(bar_health/maxhealth), 3);
			c.strokeStyle = healthcolor;
			c.strokeRect(p[0]-size, p[1]-size-4, 2*size, 3);
			
			c.fillStyle = atmocolor;
			c.fillRect(p[0]-size, p[1]-size-8, 2*size*(bar_atmo/20), 3);
			c.strokeStyle = atmocolor;
			c.strokeRect(p[0]-size, p[1]-size-8, 2*size, 3);
			/**/
			
			/* health rings */
			c.save();
				c.translate(p[0], p[1]);
				c.rotate(pi/2);
				
				c.beginPath();
				c.lineWidth = 2;
				c.strokeStyle = healthcolor;
				c.arc(0, 0, size+1+c.lineWidth, -pi*(bar_health/maxhealth), pi*(bar_health/maxhealth), false);
				c.stroke();
				
				c.beginPath();
				c.strokeStyle = atmocolor;
				c.arc(0, 0, size+1+c.lineWidth*2, -pi*(bar_atmo/maxatmo), pi*(bar_atmo/maxatmo), false);
				c.stroke();
				
			c.restore();
			/**/
			
		}
		
		var draw_indicator = function(planetx) {
			var c = ctx;
			var a = planetx.angle;
			var p = 0.1*planetx.power;
			var px = planetx.p[0]+planetx.size*cos(a);
			var py = planetx.p[1]+planetx.size*sin(a);
			var indicatorcolor = "rgba(250,0,0,0.2)";
			
			if(p > 0)
			{
				c.lineWidth = 4;
				c.beginPath();
				c.moveTo(px, py);
				c.lineTo(px+p*cos(a), py+p*sin(a));
				c.closePath();
				c.strokeStyle = indicatorcolor;
				c.stroke();
			}
		}
		
		return {
			name: name, img: img, id: id, prev: prev, next: next, controller: controller,
			p: p, v: v, a: a, delta: delta,
			angle: angle, power: power, maxpower: maxpower,
			shotsfired: shotsfired, shotshit: shotshit,
			size: size, health: health, maxhealth: maxhealth,
			atmo: atmo, maxatmo: maxatmo, atmoregen: atmoregen,
			trailx: trailx, traily: traily,
			weapon: weapon, firing: firing,
			orbit_ellipse: orbit_ellipse,
			draw: draw, die: die,
		};
	}
	
	var cannon = function() {

		var abs = Math.abs;
		var cos = Math.cos;
		var sin = Math.sin;
		var duration = 13*fps; //time for projectile to explode
		
		var shooter;
		var px, py, vx, vy, ax, ay;
		var aax = new Array();
		var aay = new Array();
		var size = 6;
		var theta = 0;
		var power = 0;
		var timer = 0;
		var blownup = true;

		var launch = function(s) {
			blownup = false;
			shooter = s;
			var b = planet[shooter];
			theta = b.angle;
			power = b.power;
			px = b.p[0]+1.1*b.size*cos(theta);
			py = b.p[1]+1.1*b.size*sin(theta);
			vx = b.v[0]+0.05*power*cos(theta);
			vy = b.v[1]+0.05*power*sin(theta);
			planet[shooter].firing = 0; //fire weaponnumber
			planet[shooter].shotsfired++;
			sfx_claunch.currentTime = 0;
			sfx_claunch.play();
			fire();
			/**/
			console.log(b.name+"("+shooter+") launch("+shooter+") with weapon "+b.wpnum+", projectile "
								+" p: "+printxy(px, py)
								+" v: "+printxy(vx, vy)
								+" theta: "+theta.toFixed(2)+" power: "+power);
			/**/
		}
		
		var fire = function() {
			px += vx;
			py += vy;
			var gethit = check_collision();
			if(timer >= duration || gethit) explode();
			if(abs(px) >= width/2) //check if hit left/right wall
			{
				switch(wallstate)
				{
					case wall.normal: 
						explode();
					case wall.bouncy:
						px -= vx; 
						vx *= -wall.x; 
						theta = -theta+pi; 
						break;
					case wall.teleport:
						px *= -1; 
						break;
				}
			}
			if(abs(py) >= width/2) //check if hit top/bottom wall
			{
				switch(wallstate)
				{
					case wall.normal:
						explode();
					case wall.bouncy:
						py -= vy; 
						vy *= -wall.x; 
						theta *= -1; 
						break;
					case wall.teleport:
						py *= -1; 
						break;
				}
			}
			if(!blownup) timer++;
			/*
			console.log("fire("+shooter+") p"+printxy(px,py)+" v"+printxy(vx,vy)
			+"theta: "+(theta*180/pi).toFixed(1)+" timer: "+timer+" burn: "+TIME_LIMIT);
			/**/
		}

		var check_collision = function() {
			var abs = Math.abs;
			for(var i in planet)
			{
				var b = planet[i];
				var d = getDist(b.p[0],b.p[1],px,py);
				/*
				console.log("check("+shooter+")" 
						+" diffx: "+printxy(px-b.p[0],py-b.p[1])
						+" size: "+b.size
						+" proj:"+shooter+": "+printxy(px,py)
						+" planet:"+i+": "+printxy(b.p[0],b.p[1]);
				/**/
				//check if projectile hit planet
				if(d < b.size) 
					return hit(b);

				if( gravityon ) {
					var dir = getAngle(b.p[0],b.p[1],px,py);
					applyGravity(d, dir, b.size);
					aax[i] = ax;
					aay[i] = ay;
					vx += ax;
					vy += ay;
				}
				
			}
			var d = getDist(px,py,0,0);
			if(d < sol.size) return true;
			/**/
			else if( gravityon ) {
				var dir = getAngle(0,0,px,py);
				applyGravity(d, dir, sol.size/2);
				aax[-1] = ax;
				aay[-1] = ay;
				vx += ax;
				vy += ay;
			}
			/**/
		}
		
		var applyGravity = function(d, dir, m) {
			var c = ctx;
			var w = CANVAS_SIZE/2;
			ax = 0.00051*m*w/d*cos(dir);
			ay = 0.00051*m*w/d*sin(dir);
		}
				
		var hit = function(b) {
			var i = b.id;
			var dx = abs(vx-b.v[0]);
			var dy = abs(vy-b.v[1]);
			var x = dx+dy;
			if(planet[i].atmo > x)
			{
				planet[i].atmo -= x;
				x = 0;
			}
			else 
			{
				x -= planet[i].atmo;
				planet[i].atmo = 0;
			}
			
			if(i != shooter) { //it doesn't count if you hit yourself
				planet[shooter].shotshit++; 
				var heat = 1; //threat increase of shot
				threat[i][shooter] += heat; //get mad at who hit you //TODO: check if this works without self-hit-safety
				threat[i][NUMPLANETS] += heat;
			}
			//else planet[shooter].selfhit++; //in fact, it counts against you!
		
			planet[i].health -= x;
			if(planet[i].health <= 0) {
				planet[i].die();
				planet[i].dead = true;
			}
			else {
				sfx_hit.currentTime = 0;
				sfx_hit.play();
			}
			/*
			console.log("HIT! "+planet[shooter].name+"("+planet[shooter].id+") has hit "+b.name+"("+b.id+") for "+x.toFixed(1)+" damage,"
						+"dxy"+printxy(dx,dy)
						+planet[shooter].name+" hit rate = "+planet[shooter].shotshit+"/"+planet[shooter].shotsfired+", "
						+b.name+" has "+b.health.toFixed(1)+" out of "+b.maxhealth+" health");
			/**/
			return true;
		}
		
		var explode = function() {
			blownup = true;
			var i = shooter;
			//console.log("explode("+i+") p:"+printxy(px,py)+"v:"+printxy(vx,vy)+" size: "+size);
			planet[i].firing = -1;
			timer = 0;
			turn = planet[i].next;
			//console.log("turns - current: "+planet[i].id+", next: "+planet[i].next+", prev: "+planet[i].prev);
		}

		var draw = function() {
			if(blownup) return;
			var c = ctx;
			//c.fillStyle = "red";
			//c.fillRect(px-size, py-size, 2*size, 2*size);
			
			/* draw projectile
			c.save();
				c.translate(px, py);
				c.rotate(theta);
				c.drawImage(bimage, -size, -size, 2*size, 2*size);
			c.restore();
			/**/
			//show gravity effects
			var ga = 1000;
			var gv = 5;
			c.save();
				for(var i in planet) {
					c.strokeStyle = teamcolor[getTeam(i)];
					c.beginPath();
					c.moveTo(px, py);
					c.lineTo(px+ga*aax[i], py+ga*aay[i]);
					c.closePath();
					c.stroke();
				}
				c.lineWidth = 2;
				c.strokeStyle = "white";
				c.beginPath();
				c.moveTo(px, py);
				c.lineTo(px+gv*vx, py+gv*vy);
				c.closePath();
				c.stroke();
				
				c.strokeStyle = suncolor;
				c.beginPath();
				c.moveTo(px, py);
				c.lineTo(px+ga*aax[-1], py+ga*aay[-1]);
				c.closePath();
				c.stroke();
			c.restore();
			
		}

		return {
			px: px, py: py,
			vx: vx, vy: vy,
			ax: ax, ay: ay,
			launch: launch, fire: fire,
			draw: draw
		};
	}
	
	var laser = function() {
		var duration = fps*0.1; //laser duration
		
		var shooter;
		var px, py;
		var qx, qy;
		var theta, power, lr;
		var timer = 0;
		
		var isbetween = function(a,b,c) {
			if(c >= a) {
				if(c <= b) return true;
				else return false;
			}
			else if(c < a) {
				if(c >= b) return true;
				else return false;
			}
			else console.log("error");
		}
		
		var launch = function(s) {
			shooter = s;
			var b = planet[shooter];
			theta = b.angle;
			power = b.power;
			px = b.p[0]+b.size*cos(theta);
			py = b.p[1]+b.size*sin(theta);
			lr = (CANVAS_SIZE/1)*(power/200); //how far laser shoots
			qx = px+lr*cos(theta);
			qy = py+lr*sin(theta);
			planet[shooter].firing = 1; //fire weaponnumber
			planet[shooter].shotsfired++;
			sfx_laser.currentTime = 0;
			sfx_laser.play();
			fire();
			check_collision();
			/**/
			console.log(b.name+"("+shooter+") launch("+shooter+") with weapon "+b.wpnum+", laser "
								+" p: "+printxy(px, py)
								+" theta: "+theta.toFixed(2)+" power: "+power);
			/**/
		}
		
		var fire = function() {
			//check if hit anything etc.
			var gethit = false;//var gethit = check_collision();
			if(timer >= duration || gethit) explode();
			timer++;
		}
		
		var check_collision = function() {
			var a = qy - py;
			var b = qx - px;
			for(var i in planet)
			{
				var tp = planet[i];
				var dist = abs( (tp.p[0] - px)*a - (tp.p[1] - py)*b ) / hypot(a,b);
				//console.log(tp.name, printxy(px,py), printxy(qx,qy), printxy(tp.p[0],tp.p[1]), dist, tp.size);
				//check if laser hit planet
				if( dist < tp.size && isbetween(px,qx,tp.p[0]) && isbetween(py,qy,tp.p[1]) ) {
					//TODO: stop at closest thing hit
					//TODO: duplicate pass through properties for "death ray"
					//draw();
					//gamestate = state.pause;
					//console.log("hit");
					//return hit(tp);
					hit(tp);
				}
				//else console.log("missed");
				
			}
			//check if projectile hit sun (close enough approximation)
			//if(/*ugh*/ < sol.size/1.5) return true;
		}
		
		var hit = function(b) {
			var i = b.id;
			//var dx = abs(vx-b.v[0]);
			//var dy = abs(vy-b.v[1]);
			//var x = dx+dy;
			var x = 10;
			if(planet[i].atmo > x)
			{
				planet[i].atmo -= x;
				x = 0;
			}
			else 
			{
				x -= planet[i].atmo;
				planet[i].atmo = 0;
			}
			
			if(i != shooter) { //it doesn't count if you hit yourself
				planet[shooter].shotshit++; 
				var heat = 1; //threat increase of shot
				threat[i][shooter] += heat; //get mad at who hit you
				threat[i][NUMPLANETS] += heat;
			}
			//else planet[shooter].selfhit++; //in fact, it counts against you!
		
			planet[i].health -= x;
			if(planet[i].health <= 0) {
				planet[i].die();
				planet[i].dead = true;
			}
			else {
				sfx_hit.currentTime = 0;
				sfx_hit.play();
			}
			/*
			console.log("HIT! "+planet[shooter].name+"("+planet[shooter].id+") has hit "+b.name+"("+b.id+") for "+x.toFixed(1)+" damage,"
						+planet[shooter].name+" hit rate = "+planet[shooter].shotshit+"/"+planet[shooter].shotsfired+", "
						+b.name+" has "+b.health.toFixed(1)+" out of "+b.maxhealth+" health");
			/**/
			return true;
		}
		
		var explode = function() {
			var i = shooter;
			var c = ctx;
			//console.log("explode("+i+") p:"+printxy(px,py));
			planet[i].firing = -1;
			timer = 0;
			turn = planet[i].next;
			//console.log("turns - current: "+planet[i].id+", next: "+planet[i].next+", prev: "+planet[i].prev);
		}
		
		var draw = function() {
			var c = ctx;
			//console.log("fire: ",px,py,qx,qy);
			c.save();
				c.lineWidth = 2;
				c.strokeStyle = "red";
				c.beginPath();
				c.moveTo(px, py);
				c.lineTo(qx, qy);
				c.closePath();
				c.stroke();
			c.restore();
		}
		
		return {
			launch: launch, fire: fire, 
			draw: draw
		};
	}

	//TODO: more weapons!!
	//neutrino particle cannon - laser that passes through and does damage
	//electromagnetic shield - high damage absorption for one round (limited in number)
	//IPBM missiles - projectiles that automatically follow targeted planet (limited in number)
	//High intensity laser - damage depends on amount of time laser stays on target, smaller range than laser, (limited in number)
	//solar flare, hit the sun and do damage to all planets
	
	return {
		init: init,
		width: width, height: height,
		gameUpdate_t: gameUpdate_t, gameDraw_t: gameDraw_t,
	};
}();

$(document).ready(function(){
	game.init();
});
