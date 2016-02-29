$(function() {
	$('#generate_btn').click(on_generate_clicked);
	$('#roll_another_btn').click(on_roll_another_clicked);
	$('#export_btn').click(on_export_clicked);
	$('#export_popup_dismiss_btn').click(on_export_popup_dismiss_clicked);
	$('#go_home_btn').click(on_go_home_clicked);
	$('#sort_by_box_cbx').click(sort_by_box_clicked);
	$('#use_custom_weights_cbx').click(on_custom_weights_clicked);
	check_screen_size();
	window.onresize = check_screen_size;
});

function check_screen_size()
{
	if (window.innerWidth <= window.innerHeight) {
		$('body').removeClass('landscape');
		$('body').addClass('portrait');
	}
	else {
		$('body').removeClass('portrait');
		$('body').addClass('landscape');
	}

	if (window.innerWidth <= 320) {
		$('body').addClass('smallScreen');
	}
	else {
		$('body').removeClass('smallScreen');
	}
}

var PACKAGE = 'dominion-roller';
var BASE_URL = location.href;
if (BASE_URL.indexOf('?') != -1) {
	BASE_URL = BASE_URL.substring(0, BASE_URL.indexOf('?'));
}

var all_cards = null;
var server_info = null;
var client_state = {};

function save_server_info()
{
	localStorage.setItem(PACKAGE + '.cached_server_info', JSON.stringify(server_info));
}

function on_global_data_ready()
{
	make_set_roller_buttons();

	window.addEventListener('popstate', on_state_init);
	on_state_init();

	refresh_server_info();
}

// called when there are problems connecting to the server
function go_offline()
{
	if (server_info == null) {
		show_error_page("Sorry, the system is down.");
		return;
	}

	if (!server_info.offline) {
		server_info.offline = true;
		$('body').addClass('offline');
	}
}

// called when we know a connection to the server is available
function go_online()
{
	if (server_info.offline) {
		delete server_info.offline;
		$('body').removeClass('offline');
	}
}

function init_global_data()
{
	var tmp = localStorage.getItem(PACKAGE+".cached_server_info");
	if (tmp) {
		server_info = JSON.parse(tmp);
	}

	var maybe_global_data_ready = function() {
		if (all_cards && server_info) {
			on_global_data_ready();
		}
	};

	var onSuccess1 = function(data) {
		all_cards = data.cards;

		var tmp_str = localStorage.getItem(PACKAGE+'.sortmode');
		if (!tmp_str) {
			tmp_str = 'bybox';
		}
		if (tmp_str == 'alpha') {
			document.getElementById("sort_by_box_cbx").checked = false;
		}
		else {
			document.getElementById("sort_by_box_cbx").checked = true;
		}
		
		var selected_boxes = {};
		tmp_str = localStorage.getItem(PACKAGE+'.selected-boxes');
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
			all_cards[i].type_id = type_id;
		}

		maybe_global_data_ready();
	};

	var onError = function(jqx, status, errMsg) {
		show_error_page("Error retrieving card data. "
			+"The status was '"+status+"'; error thrown was '"
				+errMsg+"'");
		};

//	$.ajax({
//	url: 'allcards.txt',      //cached, should work even if offline
//	dataType: 'json',
//	success: onSuccess1,
//	error: onError
//	});
	onSuccess1(allcards_data);

	var onSuccess2 = function(data) {
		server_info = data;
		save_server_info();
		maybe_global_data_ready();
		go_online();
	};

	$.ajax({
	url: 'cardset.php?info',   // not cached, won't work if offline
	dataType: 'json',
	success: onSuccess2,
	error: go_offline
	});
}
$(init_global_data);

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
		save_server_info();
		make_set_roller_buttons();
		go_online();
	};

	var doFetch;
	doFetch = function() {
		$.ajax({
		url: 'cardset.php?info',
		dataType: 'json',
		success: onSuccess2,
		error: go_offline
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
	localStorage.setItem(PACKAGE + '.genmode', my_algo);

	var candidates = make_candidates();

	if (document.card_selection_form.use_custom_weights.checked) {
		var my_weights = parse_weights(document.card_selection_form.custom_weights.value);
		candidates = shuffle_cards_with_weights(candidates, my_weights);
	}
	else {
		candidates = shuffle_array(candidates);
	}

	var cardlist = make_cardlist(my_algo, candidates);
	var cardset = make_cardset(cardlist);

	make_exclusion_list(cardset);
	post_new_cardset(cardset);

	return false;
}

function post_new_cardset(cardset)
{
	if ($('body').hasClass('offline')) {
		var a_name = 'p.1';
		localStorage.setItem(PACKAGE+'.cached_cardset['+a_name+']',
			JSON.stringify(cardset)
			);
		localStorage.setItem(PACKAGE+'.pending_cardsets', a_name);
		navigate_to_cardset(a_name);
		return;
	}

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
}

function make_exclusion_list(cardset)
{
	var exclusion_list = {};
	var tmp = localStorage.getItem(PACKAGE+".auto_exclude");
	if (tmp) {
		var cardnames = tmp.split(/,/);
		for (var i = 0; i < cardnames.length; i++) {
			exclusion_list[cardnames[i]] = true;
		}
	}

	for (var i = 0; i < cardset.kingdom.length; i++) {
		exclusion_list[cardset.kingdom[i]] = true;
	}

	// check for conflicts with support stuff
	var support_list = make_support_list(cardset);
	for (var i = 0; i < support_list.length; i++) {
		// check for any other potential kingdom cards that list
		// this support item
		for (var j = 0; j < all_cards.length; j++) {
			var c = all_cards[j];
			if (c.special) { continue; }
			if (!c.requires) { continue; }

			var found_any = false;
			for (var k = 0; k < c.requires.length; k++) {
				if (c.requires[k] == support_list[i] &&
					k != 'Coin Tokens')
				{
					found_any = true;
				}
			}
			if (found_any) {
				exclusion_list[c.id] = true;
			}
		}
	}

	var cardnames = [];
	for (var cardname in exclusion_list) {
		cardnames.push(cardname);
	}

	localStorage.setItem(PACKAGE+".auto_exclude", cardnames.join(','));
}

function make_candidates()
{
	var auto_exclude = {};
	if (document.card_selection_form.auto_exclude_recent.checked)
	{
		var cardnames = (localStorage.getItem(PACKAGE+".auto_exclude")||"").split(/,/);
		for (var i = 0; i < cardnames.length; i++) {
			auto_exclude[cardnames[i]] = true;
		}
	}
	else {
		// no exclusion requested
		localStorage.removeItem(PACKAGE+".auto_exclude");
	}

	var candidates = [];
	for (var i = 0, l = all_cards.length; i < l; i++) {

		// ignore "special" cards, they'll be added later
		if (all_cards[i].special) { continue; }

		// avoid explicitly excluded cards
		if (auto_exclude[all_cards[i].id]) { continue; }

		// check whether this card's box was selected
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
	return {
		id: cardname,
		name: cardname,
		box_id: 'unknown',
		box: { id: 'unknown', name: 'Unknown' }
		};
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

function select_cardset_btn(setnumber)
{
	$('.set_roller .set_btn.selected').removeClass('selected');
	$('.set_roller .set_btn[data-set-id="'+setnumber+'"]').addClass('selected');
	scroll_set_roller();
}

function show_cardset(cardset)
{
	var $page = switch_to_page('cardset');

	$('#export_popup').hide();

	if ((+server_info.last_set) < (+cardset.shortname)) {
		server_info.last_set = +cardset.shortname;
		save_server_info();
		make_set_roller_buttons();
	}

	select_cardset_btn(cardset.shortname);

	$('.set_number', $page).text(cardset.shortname);

	$('.kingdom_cards_list', $page).empty();
	$('.event_cards_list', $page).empty();
	$('.support_cards_list', $page).empty();

	var cards = arrange_cards(add_card_info(cardset.kingdom));
	for (var i = 0; i < cards.length; i++) {
		var $tmp = make_card_listitem(cards[i]);
		if (cards[i].id == cardset.bane_pile) {
			$('.xtra',$tmp).append(' <span class="bane_flag"> &mdash; Young Witch\'s Bane</span>');
		}
		$('.kingdom_cards_list',$page).append($tmp);
	}

	if (cardset.events) {
		var events = arrange_cards(add_card_info(cardset.events));
		for (var i = 0; i < events.length; i++) {
			$('.event_cards_list',$page).append(make_card_listitem(events[i]));
		}
		$('.event_cards_container',$page).show();
	}
	else {
		$('.event_cards_container',$page).hide();
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

function cache_cardset(cardset)
{
	localStorage.setItem(PACKAGE+'.cached_cardset['+cardset.shortname+']',JSON.stringify(cardset));
	$('.set_roller .set_btn[data-set-id="'+cardset.shortname+'"]').addClass('cached');
}

function show_cardset_by_name(set_shortname)
{
	var tmp = localStorage.getItem(PACKAGE+'.cached_cardset['+set_shortname+']');
	if (tmp) {
		var cardset = JSON.parse(tmp);
		delete cardset.shortname;
		$('#export_data_field').text(JSON.stringify(cardset));
		cardset.shortname = set_shortname;
		show_cardset(cardset);
		return;
	}

	var onSuccess = function(data) {
		go_online();
		$('#export_data_field').text(JSON.stringify(data));
		var cardset = data;
		cardset.shortname = set_shortname;
		cache_cardset(cardset);
		show_cardset(cardset);
	};
	var onError = function(jqx, status, errMsg) {
		select_cardset_btn(set_shortname);
		if (errMsg == 'Not Found') {
			return show_error_page("Card Set "+set_shortname+" Not Found");
		}
		// any other error we'll treat as a network/offline problem
		show_error_page("Cannot access this card set while offline.");
		go_offline();
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
	else if (path_parts[0] == 'display') {
		var card_set_raw = decodeURIComponent(
			path_parts[1].replace(/\+/g, '%20'));

		$('#export_data_field').text(card_set_raw);
		var cardset = JSON.parse(card_set_raw);
		cardset.shortname = 'auto';
		show_cardset(cardset);
	}
	else {
		show_error_page('Invalid URL');
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
	if (setnumber == 'p.1') {
		return String.fromCharCode(945);
	}

	var set_suit = Math.floor(setnumber/10) % 26;
	var set_rank = setnumber % 10;
	return String.fromCharCode(set_suit+65) + String.fromCharCode(set_rank+48);
}

function make_set_roller_btn(setnumber)
{
	var $b = $('<button class="set_btn"></button>');
	$b.text(format_setname(setnumber));
	$b.attr('data-set-id', setnumber);
	$b.click(on_set_roller_clicked);
	if (localStorage.getItem(PACKAGE+'.cached_cardset['+setnumber+']') != null) {
		$b.addClass('cached');
	}
	return $b;
}

function make_set_roller_buttons()
{
	var my_last = client_state.last_set_button;
	if (!my_last) {
		my_last = Math.max(0, server_info.last_set-200);
	}
	for (var i = my_last+1; i <= server_info.last_set; i++){
		var $b = make_set_roller_btn(i);
		$('.set_roller').append($b);
	}
	for (var i = 1; i <= 4; i++) {
		var setname = 'p.'+i;
		var $p = $('.set_roller .set_btn[data-set-id="'+setname+'"]');
		if ($p.length) { continue; }

		if (localStorage.getItem(PACKAGE+'.cached_cardset['+setname+']')) {
			var $b = make_set_roller_btn(setname);
			$('.set_roller').append($b);
		}
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

function sort_by_box_clicked()
{
	var tmp_str;
	if (document.getElementById("sort_by_box_cbx").checked) {
		tmp_str = "bybox";
	}
	else {
		tmp_str = "alpha";
	}
	localStorage.setItem(PACKAGE + '.sortmode', tmp_str);
	on_state_init();
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

function on_export_clicked()
{
	$('#export_popup').show();
	$('#export_data_field').select();
	$('#export_data_field').focus();
}

function on_export_popup_dismiss_clicked()
{
	$('#export_popup').hide();
}

function on_custom_weights_clicked()
{
	var el = document.getElementById('use_custom_weights_cbx');
	if (el.checked) {
		$('#custom_weights_box').show();
	} else {
		$('#custom_weights_box').hide();
	}
}

function parse_weights(str)
{
	var W = {};
	var lines = str.split(/\n/);
	for (var i = 0; i < lines.length; i++) {
		var line = lines[i];
		line = line.replace(/--.*/, "");
		line = line.trim();
		if (line == '') { continue; }

		var m = /^(\S+)\s+(.*)$/.exec(line);
		if (!m) { continue; }

		var card_weight = m[1];
		var card_name = m[2];
		W[card_name] = card_weight;
	}
	return W;
}
