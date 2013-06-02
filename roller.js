$(function() {
	$('#generate_btn').click(on_generate_clicked);
	$('#roll_another_btn').click(on_roll_another_clicked);
	$('#go_home_btn').click(on_go_home_clicked);
});

var PACKAGE = 'dominion-roller';
var BASE_URL = location.href;
if (BASE_URL.indexOf('?') != -1) {
	BASE_URL = BASE_URL.substring(0, BASE_URL.indexOf('?'));
}

var all_cards = null;
var server_info = null;
var client_state = {};

function on_global_data_ready()
{
	make_set_roller_buttons();

	window.addEventListener('popstate', on_state_init);
	on_state_init();

	refresh_server_info();
}

function init_global_data()
{
	var maybe_global_data_ready = function() {
		if (all_cards && server_info) {
			on_global_data_ready();
		}
	};

	var onSuccess1 = function(data) {
		all_cards = data.cards;

		var selected_boxes = {};
		var tmp_str = localStorage.getItem(PACKAGE+'.selected-boxes');
		if (!tmp_str) {
			tmp_str = 'base';
		}
		var tmp_arr = tmp_str.split(/,/);
		for (var i = 0; i < tmp_arr.length; i++) {
			selected_boxes[tmp_arr[i]]=true;
		}

		var proper_box_info = {};
		for (var i = 0, l = data.boxes.length; i < l; i++) {
			var box_info = data.boxes[i];
			proper_box_info[box_info.id] = box_info;
			var $x = $('<div class="box_selection_btn"><span class="box_image_check"></span><div class="box_image_container"><input type="checkbox" class="box_image_btn"><img class="box_image"></div><div class="box_name"></div></div>');
			$('input',$x).attr('name', 'inc_'+box_info.id);
			$('img.box_image',$x).attr('src', 'images/'+box_info.image);
			if (selected_boxes[box_info.id]) {
				$('input',$x).attr('checked','checked');
			}
			$('.box_name',$x).text(box_info.name);
			add_box_image_listeners($x);
			$x.attr('data-box-id', box_info.id);
			$('#box_selection').append($x);
		}
		client_state.boxes = proper_box_info;

		update_box_image_checks();

		var numCards = all_cards.length;
		for (var i = 0; i < numCards; i++) {
			var box_id = all_cards[i].box;
			all_cards[i].box_id = box_id;
			all_cards[i].box = proper_box_info[box_id];
			all_cards[i].name = (all_cards[i].name || all_cards[i].id);
		}

		maybe_global_data_ready();
	};

	$.ajax({
	url: 'allcards.txt',
	dataType: 'json',
	success: onSuccess1
	});

	var onSuccess2 = function(data) {
		server_info = data;
		maybe_global_data_ready();
	};

	$.ajax({
	url: 'cardset.php?info',
	dataType: 'json',
	success: onSuccess2
	});
}
init_global_data();

function add_box_image_listeners($box)
{
	if ('ontouchstart' in window) {
	$box.get(0).addEventListener("touchstart", on_box_mousedown, false);
	$box.get(0).addEventListener("touchend", on_box_mouseup, false);
	}
	else {
	$box.mousedown(on_box_mousedown);
	$box.mouseup(on_box_mouseup);
	}
}

function refresh_server_info()
{
	var onSuccess2 = function(data) {
		server_info.last_set = Math.max(server_info.last_set, data.last_set);
		make_set_roller_buttons();
	};

	var doFetch;
	doFetch = function() {
		$.ajax({
		url: 'cardset.php?info',
		dataType: 'json',
		success: onSuccess2
		});
		setTimeout(doFetch, 6000);
	};

	setTimeout(doFetch, 10000);
}

function navigate_to_cardset(setnumber)
{
	history.pushState(null, null, BASE_URL + '?cardset/' + setnumber);
	on_state_init();
}

function on_generate_clicked(evt)
{
	$(this).attr('disabled','disabled');
	evt.preventDefault();

	var my_algo = document.card_selection_form.genmode.value;

	var candidates = make_candidates();
	var cardlist = make_cardlist(my_algo, candidates);
	var cardset = make_cardset(cardlist);

	var onSuccess = function(data) {
		navigate_to_cardset(data.shortname);
		};
	var onError = function(jqx, status, errMsg) {
		alert(errMsg);
		};

	$.ajax({
	type: "POST",
	url: "cardset.php",
	data: JSON.stringify(cardset),
	contentType: "application/json; charset=utf-8",
	dataType: "json",
	success: onSuccess,
	error: onError,
	});
	return false;
}

function make_candidates()
{
	var candidates = [];
	for (var i = 0, l = all_cards.length; i < l; i++) {

		// ignore "special" cards, they'll be added later
		if (all_cards[i].special) { continue; }

		var a_box = all_cards[i].box_id;
		var cb = document.card_selection_form["inc_"+a_box];
		if (cb && cb.checked) {
			candidates.push(all_cards[i]);
		}
	}
	return candidates;
}

function switch_to_page(pagename)
{
	$('.app_page').hide();
	$('#'+pagename+'_page').show();
	return $('#'+pagename+'_page');
}

function get_card_info(cardname)
{
	for (var i = 0; i < all_cards.length; i++) {
		if (all_cards[i].id == cardname) {
			return all_cards[i];
		}
	}
	return null;
}

function add_card_info(cardnames_array)
{
	var rv = [];
	for (var i = 0; i < cardnames_array.length; i++) {
		var card_info = get_card_info(cardnames_array[i]);
		rv.push(card_info);
	}
	return rv;
}

function make_card_listitem(card_info)
{
	var $x = $('<li><img class="card_icon"><span class="name"></span><span class="xtra"></span></li>');
	var caption = card_info.name || card_info.id;
	if (card_info.box.icon_image) {
		$('img.card_icon', $x).attr('src', 'images/'+card_info.box.icon_image);
		$('img.card_icon', $x).attr('alt', '('+card_info.box.name+')');
		$('img.card_icon', $x).attr('title', card_info.box.name);
	}
	else {
		caption += ' (' + card_info.box.name + ')';
	}
	$('.name', $x).text(caption);
	return $x;
}

function show_error_page(errorMsg)
{
	var $page = switch_to_page("error");
	$('.errorMsg', $page).text(errorMsg);
}

function show_card_selection_page()
{
	var $page = switch_to_page('card_selection');
	$('#generate_btn', $page).removeAttr('disabled');
	$('.set_btn.selected').removeClass('selected');
	scroll_set_roller();
}

function show_cardset(cardset)
{
	var $page = switch_to_page('cardset');

	if ((+server_info.last_set) < (+cardset.shortname)) {
		server_info.last_set = +cardset.shortname;
		make_set_roller_buttons();
	}

	$('.set_roller .set_btn.selected').removeClass('selected');
	$('.set_roller .set_btn[data-set-id='+cardset.shortname+']').addClass('selected');
	scroll_set_roller();

	$('.set_number', $page).text(cardset.shortname);

	$('.kingdom_cards_list', $page).empty();
	$('.support_cards_list', $page).empty();

	var cards = arrange_cards(add_card_info(cardset.kingdom));
	for (var i = 0; i < cards.length; i++) {
		var $tmp = make_card_listitem(cards[i]);
		if (cards[i].id == cardset.bane_pile) {
			$('.xtra',$tmp).append(' <span class="bane_flag"> &mdash; Young Witch\'s Bane</span>');
		}
		$('.kingdom_cards_list',$page).append($tmp);
	}

	var support_list = make_support_list(cardset);
	if (support_list.length)
	{
		cards = arrange_cards(add_card_info(support_list));
		for (var i = 0; i < cards.length; i++) {
			$('.support_cards_list',$page).append(make_card_listitem(cards[i]));
		}
		$('.support_cards_container',$page).show();
	}
	else {
		$('.support_cards_container',$page).hide();
	}
}

function show_cardset_by_name(set_shortname)
{
	var onSuccess = function(data) {
		var cardset = data;
		cardset.shortname = set_shortname;
		show_cardset(cardset);
	};
	var onError = function(jqx, status, errMsg) {
		if (errMsg == 'Not Found') {
			return show_error_page("Card Set "+set_shortname+" Not Found");
		}
		alert(errMsg);
		};

	$.ajax({
	url: 'cardset.php?set='+escape(set_shortname),
	dataType: 'json',
	success: onSuccess,
	error: onError
	});
}

function on_state_init()
{
	var path = location.href;
	if (path.indexOf('?') != -1) {
		path = path.substring(path.indexOf('?')+1);
	}
	else {
		path = '';
	}

	if (path == '') {
		return show_card_selection_page();
	}

	var path_parts = path.split('/');
	if (path_parts[0] == 'cardset') {
		return show_cardset_by_name(path_parts[1]);
	}
}

function on_go_home_clicked(evt)
{
	history.pushState(null, null, BASE_URL);
	on_state_init();
}

function on_roll_another_clicked(evt)
{
	history.pushState(null, null, BASE_URL);
	on_state_init();
}

function format_setname(setnumber)
{
	var set_suit = Math.floor(setnumber/10) % 26;
	var set_rank = setnumber % 10;
	return String.fromCharCode(set_suit+65) + String.fromCharCode(set_rank+48);
}

function make_set_roller_buttons()
{
	var my_last = client_state.last_set_button;
	if (!my_last) {
		my_last = Math.max(0, server_info.last_set-200);
	}
	for (var i = my_last+1; i <= server_info.last_set; i++){
		var setnumber = i;
		var $b = $('<button class="set_btn"></button>');
		$b.text(format_setname(setnumber));
		$b.attr('data-set-id', setnumber);
		$b.click(on_set_roller_clicked);
		$('.set_roller').append($b);
	}
	client_state.last_set_button = server_info.last_set;
}

function on_set_roller_clicked(evt)
{
	var $btn = $(this);
	var setname = $btn.attr('data-set-id');
	navigate_to_cardset(setname);
}

function scroll_set_roller()
{
	if (client_state.did_first_scroll) {
		$('.set_roller').css({
			transition: "left 0.75s"
		});
	} else {
		$('.set_roller').show();
		client_state.did_first_scroll = true;
	}

	var $btn = $('.set_roller .set_btn.selected');
	if (!$btn.length) {
		$btn = $('.set_roller .set_btn:last');
	}
	if (!$btn.length) {
		return;
	}

	var xcoord = $btn.position().left;
	var window_width = $('.set_roller_container').innerWidth();
	var centercoord = Math.round(window_width/2);

	var xoffset = centercoord-(xcoord+48/2);
	var firstcoord = $('.set_roller .set_btn:first').position().left;
	var lastcoord = $('.set_roller .set_btn:last').position().left;
	//alert(firstcoord+' '+lastcoord+' '+window_width);

	$('.set_roller').css({
		left: xoffset+'px'
		});
}

function on_box_mousedown(evt)
{
	evt.preventDefault();
	$(this).addClass('mousehold');

	evt.stopPropagation();
	return;
}

function update_box_image_checks()
{
	var found = [];
	$('.box_selection_btn').each(function(i,el) {
		if ($('input.box_image_btn',$(el)).get(0).checked) {
			$(el).addClass('selected');
			found.push(el.getAttribute('data-box-id'));
		} else {
			$(el).removeClass('selected');
		}
	});

	localStorage.setItem(PACKAGE + '.selected-boxes', found.join(','));
}

function on_box_mouseup(evt)
{
	evt.preventDefault();
	$(this).removeClass('mousehold');

	var cbEl = $('input.box_image_btn',$(this)).get(0);
	cbEl.checked = !cbEl.checked;

	update_box_image_checks();

	evt.stopPropagation();
	return;
}
