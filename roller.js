function on_global_data_ready()
{
	window.addEventListener('popstate', on_state_init);
	on_state_init();
}

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

function init_global_data()
{
	var onSuccess = function(data) {
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

		on_global_data_ready();
	};
	$.ajax({
	url: 'allcards.txt',
	dataType: 'json',
	success: onSuccess
	});
}
init_global_data();

function on_generate_clicked(evt)
{
	$(this).attr('disabled','disabled');
	evt.preventDefault();

	var my_algo = document.card_selection_form.genmode.value;

	var candidates = make_candidates();
	var cardlist = make_cardlist(my_algo, candidates);
	var cardset = make_cardset(cardlist);

	var onSuccess = function(data) {
		history.pushState(null, null, BASE_URL + '?cardset/' + data.shortname);
		on_state_init();
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
	var $x = $('<li></li>');
	$x.text(card_info.name + ' ('+card_info.set.name+')');
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

	$('.set_number', $page).text(cardset.shortname);

	$('.kingdom_cards_list', $page).empty();
	$('.support_cards_list', $page).empty();

	var cards = arrange_cards(add_card_info(cardset.kingdom));
	for (var i = 0; i < cards.length; i++) {
		$('.kingdom_cards_list',$page).append(make_card_listitem(cards[i]));
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
