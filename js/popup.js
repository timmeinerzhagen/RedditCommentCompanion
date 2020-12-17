// Load Chrome extension config
var customWidth = 			loadFromStorage("popUpWidth", 500);
var customHeight = 			loadFromStorage("popUpHeight", 500);
var customPosition = 		loadFromStorage("popUpPosition", null);

// Helper variables
var currentPost;
var links;
var isDarkTheme = false;
var isDayTheme = false;

var subredditStyleLabel;

var hoverOffTime;

setupHoverEvents();

function setupHoverEvents() {
	links = $('a.comments').toArray();

	links.forEach(function(l,i){
		var link = $(l);
		link.unbind();
		link.hoverIntent({ 
				over: function(e) {
						clearTimeout(hoverOffTime);
						if ($('#companion-window').length > 0) 
							removePopUpFromView();
						openCompanion(l.href, link);
						currentPost = $(link.parent().parent().parent().parent());
						if (isDayTheme) {
							currentPost.css('background-color', 'rgb(247,247,248)'); 
						}else{
							currentPost.css('background-color', 'rgb(18, 18, 18)'); 
						}
					}, 
			out: function(){
					timedHover();
				},
			interval: 150,
			sensitivity: 2
		});
	});
}

function checkTheme() {
	if ($('#RESSettingsButton') != null) {
		setupCommentEvents();
		var backgroundColor = $('.content').first().css('background-color');

		isDarkTheme = backgroundColor !== 'rgb(38, 38, 38)';
		if (isDayTheme)
			selectedDay();
		else 
			selectedNight();
	}    
}

function setupCommentEvents(){
	$('div#companion-window').css('visibility', 'visible');
	$('.close-button').css('visibility', 'visible');

	var expandoButtons = $('.expando-button').toArray();
	expandoButtons.forEach(function(e, i){
		$(e).unbind();
		$(e).on('click', function(){
			var commentsATag = $($(e).siblings('ul.flat-list.buttons').children('li.first').children('a'));
			var commentsURL = commentsATag.attr('href');
			if(currentPost != null)
				removePopUpFromView();
			openCompanion(commentsURL, commentsATag); 

			currentPost = $(commentsATag.parent().parent().parent().parent());
			if (isDayTheme) {
				currentPost.css('background-color', 'rgb(247,247,248)'); 
			}else{
				currentPost.css('background-color', 'rgb(18, 18, 18)'); 
				}
		});
	});
}

function removeCollapsableEvents(){
	var expandoButtons = $('.expando-button').toArray();
	expandoButtons.forEach(function(e, i){
		$(e).unbind();
	});
}

function timedHover(){
	hoverOffTime = setTimeout(function(){
		clearTimeout(hoverOffTime);
		if ($('#companion-window:hover').length != 0) {
			$('#companion-window').mouseleave(function(){
				removePopUpFromView();
			});
		}else{
				removePopUpFromView();
		}
	}, 1000);
}

function setupPop (jL){
	$('div#companion-window').css('visibility', 'visible');
	$('.close-button').css('visibility', 'visible');

	checkTheme();
	setupScroll();
	var popUp =  $('<div id="companion-window" class="trapScroll"></div>');
	popUp.css('position', '');
	popUp.css('top', '');
	popUp.css('right', '');

	jL.parent().append(popUp);

	if (isDayTheme) {
		popUp.css('background-color', 'white');
		popUp.css('border', '1px solid black');
	}else{
		popUp.css('background-color', 'rgb(22, 22, 22)');
		popUp.css('border-color', '#e4e4e4');
	}

	var imageURL = chrome.extension.getURL("img/smallLoader.gif");
	var loadingIMG = $('<img id="loader" src="'+imageURL+'">')

	 if ($('#loader').length <= 0) {
			popUp.append(loadingIMG);
	 }
}

function openCompanion (url, jL){
	subredditStyleLabel = $($('.hover.redditname')[1]).parent().children('div')[0];
	setupPop(jL); 
	topComments = [];
	$.ajax({
			url: url +'.json',
			dataType: 'json',
			success: function(data) {
				$('#loader').remove();
				$('.idv-comment').remove();

				var popUp = $('#companion-window');
				
				// Set popup dimensions and position
				popUp.css('position', 'fixed');

				if (customHeight) 
					popUp.css('height', customHeight);
				else
					popUp.css('max-height', $(window).height());
				

				if (customWidth)
					popUp.css('width', customWidth);
				else
					popUp.css('width', $(window).width() / 3);           
				

				if (customPosition) {
					popUp.css('top', customPosition.top);
					popUp.css('left', customPosition.left);
				}else{
					popUp.css('top', '0px');
					popUp.css('right', '0px');
				}
				
				// Add windows functionality
				popUp.resizable({
						helper: "ui-resizable-helper",
						handles: 'w, e, n, s, nw, ne, se, sw',
						stop: function( event, ui ) {
							customWidth = popUp.width();
							chrome.storage.local.set({'popUpWidth': popUp.width()}, function() {});

							customHeight = popUp.height();
							chrome.storage.local.set({'popUpHeight': popUp.height()}, function() {});
						}
				});
				popUp.draggable({
						stop: function( event, ui ) {
							customPosition = popUp.position();
							chrome.storage.local.set({'popUpPosition': popUp.position()}, function() {});
						}
				});

				popUp.css('z-index', '21474836469999 !important');
				$(subredditStyleLabel).remove();

				// Generate Controls
				var exitButton = $('<a class="exit-button" href="#"">X</a>');
				popUp.append(exitButton);
				exitButton.click(function(e){
					$('div#companion-window').css('visibility', 'hidden');
					$('.close-button').css('visibility', 'hidden');
					e.preventDefault();
				});

				var closeButton = $('<a class="close-button" href="#"">X</a>');
				jL.parent().append(closeButton);
				closeButton.click(function(e){
					removePopUpFromView();
					e.preventDefault();
				});

				
				// Generate Comment list
				var postPermalink = data[0].data.children[0].data.permalink;
				var author = data[0].data.children[0].data.author;

				results = data[1].data.children;

				for (var i = 0; i <= results.length && i < 10; i++) {
					var indivComment = results[i].data;

					var commentInfo = {
						author:  indivComment.author,
						html: indivComment.body_html,
						gilded: indivComment.gilded,
						votes: indivComment.ups,
						isOP: (author === indivComment.author),
						permalink: postPermalink + indivComment.id,
						firstReply: firstReply
					}

					var firstReply = null;
					if (indivComment.replies && indivComment.replies.data.children[0].data.body) {
						firstReply = indivComment.replies.data.children[0].data;
						firstReply = {
							author: firstReply.author,
							html : firstReply.body_html,
							gilded: firstReply.gilded,
							votes: firstReply.ups,
							isOP: (firstReply.author === author),
							permalink: postPermalink + firstReply.id
						}
					}
					topComments.push(commentInfo);
				}
				formatComments(topComments);
			},
			error: function(request, status, error) {
					$('#loader').remove();
					var errorURL = chrome.extension.getURL("img/error.png");
					var errorIMG = $('<img class="error" src="'+errorURL+'">')
					var popUp = $('#companion-window');
					popUp.append(errorIMG);
			}
	});
	 
}

function formatComments(commentsArray){
		commentsArray.forEach(function(c, i){
			if (typeof c.html != 'undefined') {
				var points;
				var parentComment = createComment(c, false);
				if (c.firstReply) {
					var childComment = createComment(c.firstReply, true);
					parentComment.append(childComment);
					parentComment.append($('<a class="permalink" href="'+c.permalink+'">View Thread</a>'));
				}

				$('#companion-window').append(parentComment);
			};

		});
		
		$('.comment-text').linkify();

		addEventToURLS($('#companion-window').find('a').toArray());

		if (isDayTheme) {
			selectedDay();
		}else{
			selectedNight();
		}

		 $('body').on('click', function(e){
				$('div#companion-window').css('visibility', 'hidden');
				$('.close-button').css('visibility', 'hidden');
				$('body').unbind();
			});

		 $('div#companion-window').click(function(e){
			 e.stopPropagation();
			});
		 $('div.idv-comment').click(function(e){
			 e.stopPropagation();
			});
		 $('.madeVisible > p').click(function(e){
				e.stopPropagation();
		 });
}

function addEventToURLS(urls){
	if (urls) {
		urls.forEach(function(u, i){
			$(u).on('click', function(e){
			 if($(u).hasClass('collapser') || $(u).hasClass('exit-button') || $(u).attr("id") === "rcc-settings-img-url"){
			 
			 }else{
				 e.stopPropagation();
				e.preventDefault();
				window.open(u.href, '_blank');
			 }
			});
		});
	}
}

function createComment(c, isChild){
	var converter = new Markdown.Converter();

	var commentDiv;

	if (isChild) {
		commentDiv = $('<div class="idv-comment child-comment"></div>');
	}else{
		commentDiv = $('<div class="idv-comment"></div>');
		var minus = $('<a class="collapser" href="#">[ - ]</a>');
		minus.on('click', function(e){
			e.preventDefault();
			e.stopPropagation();
			minus.unbind();

			collapseComment(commentDiv);
		});
		commentDiv.append(minus);
	}

	var points = "  point" + (c.votes === 1 ? "s" : "");
	commentDiv.append($('<a class="author" href="/u/'+c.author+'">' + (c.isOP ? 'id="op"' : '') + c.author +'</a><span class="votes">'+c.votes+points+'</span>'));
	commentDiv.append($('<div class="comment-text">' + htmlDecode(c.html) + '</div>')); 

	return commentDiv;
}

function collapseComment(comment){
	var minus = $(comment.children('a')[0]);

	var permalink = $(comment.children('.permalink'));
	permalink.css('visibility', 'hidden');

	minus.text('[ + ]');

	minus.on('click', function(e){
		e.preventDefault();
		e.stopPropagation();
		minus.unbind();

		expandComment(comment);
	})

	var commentText = comment.children('div').toArray();
	commentText.forEach(function(t, i){
		$(t).css('visibility', 'hidden');
	});

	comment.css('height', '10px');
}

function expandComment(comment){
	var plus = $(comment.children('a')[0]);
	plus.unbind();

	var permalink = $(comment.children('.permalink'));
	permalink.css('visibility', 'visible');
		 
	var commentText = comment.children('div').toArray();

	commentText.forEach(function(t, i){
		$(t).css('visibility', 'visible');
	});

	comment.css('height', 'auto');
	plus.text('[ - ]');

	plus.on('click',function(e){
		e.stopPropagation();
		e.preventDefault();
		plus.unbind();

		collapseComment(comment);
	});
}

// Close Companion when click performed outside of Companion
function removePopUpFromView(){
 	if(currentPost.mouseenter()){
		currentPost.mouseleave(animateClosing());
	}else{
		animateClosing();
	}
}

function animateClosing(){
	/*var popUp = $('#companion-window');
	popUp.remove();
	popUp.css('position', '');
	popUp.css('top', '');
	popUp.css('right', '');
	$('.close-button').remove();*/
}

/* Day and Night Mode */
function selectedDay(){
	$('.child-comment').css('background-color', '');
	$('.idv-comment').css('border-color', '');
	$('#companion-window').css('border-color', '');
	$('div.comment-text > p').css('color', 'black');
	$('div.comment-text > p > a').css('color', '#551a8b !important');
	$('#rcc-radio-container').css('background-color', '');
}

function selectedNight(){
	$('.child-comment').css('background-color', 'rgb(18, 18, 18)');
	$('.idv-comment').css('border-color', 'rgb(51, 51, 51)');
	$('#rcc-radio-container').css('background-color', 'rgb(18, 18, 18)');
	
	$('div.comment-text > p').css('color', 'rgb(204, 204, 204)');
	$('div.comment-text > p > a').css('color', 'rgb(51, 102, 153)');

}

/* Formatting */

checkDocumentHeight(setupURLS);

function checkDocumentHeight(callback){
		var lastHeight = document.body.clientHeight, newHeight, timer;
		(function run(){
				newHeight = document.body.clientHeight;
				if( lastHeight != newHeight )
						callback();
				lastHeight = newHeight;
				timer = setTimeout(run, 200);
		})();
}

function setupURLS(){
		setupHoverEvents();
		setupCommentEvents();
}

/* Scolling */

function setupScroll(){

	var trapScroll;

	(function($){  
		
		trapScroll = function(opt){
			
			var trapElement;
			var scrollableDist;
			var trapClassName = 'trapScroll-enabled';
			var trapSelector = '.trapScroll';
			
			var trapWheel = function(e){
				
				if (!$('body').hasClass(trapClassName)) {
					
					return;
					
				} else {
				var curScrollPos;  
					if (trapElement) {
						curScrollPos = trapElement.scrollTop();
					}
					var wheelEvent = e.originalEvent;
					var dY = wheelEvent.deltaY;

					// only trap events once we've scrolled to the end
					// or beginning
					if ((dY>0 && curScrollPos >= scrollableDist) || (dY<0 && curScrollPos <= 0)) {
						opt.onScrollEnd();
						return false;
					}
				}
			}
			
			$(document)
				.on('wheel', trapWheel)
				.on('mouseleave', trapSelector, function(){
					$('body').removeClass(trapClassName);
				})
				.on('mouseenter', trapSelector, function(){   
				
					trapElement = $(this);
					var containerHeight = trapElement.outerHeight();
					var contentHeight = trapElement[0].scrollHeight; // height of scrollable content
					scrollableDist = contentHeight - containerHeight;
					
					if (contentHeight>containerHeight)
						$('body').addClass(trapClassName); 
				
				});       
		} 
		
	})($);

	var preventedCount = 0;
	var showEventPreventedMsg = function(){  
		$('#mousewheel-prevented').stop().animate({opacity: 1}, 'fast');
	}
	var hideEventPreventedMsg = function(){
		$('#mousewheel-prevented').stop().animate({opacity: 0}, 'fast');
	}
	var addPreventedCount = function(){
		$('#prevented-count').html('prevented <small>x</small>' + preventedCount++);
	}

	trapScroll({ onScrollEnd: addPreventedCount });
	$('.trapScroll')
		.on('mouseenter', showEventPreventedMsg)
		.on('mouseleave', hideEventPreventedMsg);      
	$('[id*="parent"]').scrollTop(100);

}

/* Util */

function loadFromStorage(varName, defaultValue) {
	var result = defaultValue;
	chrome.storage.local.get(varName, function(obj) {
		if (Object.getOwnPropertyNames(obj).length > 0)
		result = obj.popUpWidth;
	});
	return result;
}

// Adjust to accomedate unsage string inputs
function htmlDecode(input) {
	var doc = new DOMParser().parseFromString(input, "text/html");
	return doc.documentElement.textContent;
}
