$(function() {
	$('#generate_btn').click(on_generate_clicked);
	$('#roll_another_btn').click(on_roll_another_clicked);
	$('#go_home_btn').click(on_go_home_clicked);
});

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

		var proper_set_info = {};
		for (var i = 0, l = data.sets.length; i < l; i++) {
			var set_info = data.sets[i];
			proper_set_info[set_info.id] = set_info;
			var $x = $('<label><input type="checkbox"><span class="set_name"></span></label>');
			$('input',$x).attr('name', 'inc_'+set_info.id);
			if (i == 0) {
				$('input',$x).attr('checked','checked');
			}
			$('.set_name',$x).text(set_info.name);
			$('#set_selection').append($x);
		}

		var numCards = all_cards.length;
		for (var i = 0; i < numCards; i++) {
			var set_id = all_cards[i].set;
			all_cards[i].set_id = set_id;
			all_cards[i].set = proper_set_info[set_id];
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

function navigate_to_cardset(setname)
{
	history.pushState(null, null, BASE_URL + '?cardset/' + setname);
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

		var a_set = all_cards[i].set_id;
		var cb = document.card_selection_form["inc_"+a_set];
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

function get_card_info(card_name)
{
	for (var i = 0; i < all_cards.length; i++) {
		if (all_cards[i].name == card_name) {
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
	var $x = $('<li><span class="name"></span><span class="xtra"></span></li>');
	$('.name', $x).text(card_info.name + ' ('+card_info.set.name+')');
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
}

function show_cardset(cardset)
{
	var $page = switch_to_page('cardset');

	$('.set_roller .set_btn.selected').removeClass('selected');
	$('.set_roller .set_btn[data-set-id='+cardset.shortname+']').addClass('selected');
	scroll_set_roller();

	$('.set_number', $page).text(cardset.shortname);

	$('.kingdom_cards_list', $page).empty();
	$('.support_cards_list', $page).empty();

	var cards = arrange_cards(add_card_info(cardset.kingdom));
	for (var i = 0; i < cards.length; i++) {
		var $tmp = make_card_listitem(cards[i]);
		if (cards[i].name == cardset.bane_pile) {
			$('.xtra',$tmp).append(' <span class="bane_flag"> &mdash; Young Witch\'s Bane</span>');
		}
		$('.kingdom_cards_list',$page).append($tmp);
	}

	if (cardset.support.length) {
		cards = arrange_cards(add_card_info(cardset.support));
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

function make_set_roller_buttons()
{
	for (var i = 1; i <= server_info.last_set; i++){
		var setname = ""+i;
		var $b = $('<button class="set_btn"></button>');
		$b.text(setname);
		$b.attr('data-set-id', setname);
		$b.click(on_set_roller_clicked);
		$('.set_roller').append($b);
	}
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
	if (!$btn.length) return;

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
