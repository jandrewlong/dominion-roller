function shuffle_array(a)
{
	for (var counter = a.length - 1; counter >= 0; counter--)
	{
		var index = Math.floor(Math.random() * counter);
		var tmp = a[counter];
		a[counter] = a[index];
		a[index] = tmp;
	}
	return a;
}

function make_cardlist_default(candidates)
{
	shuffle_array(candidates);
	return candidates;
}

function make_cardlist_pickN(candidates, n)
{
	shuffle_array(candidates);

	var found_count = 0;
	var found = {};
	var cards = [];
	for (var i = 0; i < candidates.length; i++) {
		var c = candidates[i];
		if (!found[c.box_id] && found_count < n) {
			found[c.box_id] = true;
			found_count++;
		}
		if (found[c.box_id]) {
			cards.push(c);
		}
	}

	return make_cardlist_by_box(cards);
}

function make_cardlist_by_box(candidates)
{
	shuffle_array(candidates);

	var by_box = {};
	var boxnames = [];
	for (var i = 0; i < candidates.length; i++) {
		var c = candidates[i];
		if (!by_box[c.box_id]) {
			by_box[c.box_id] = [];
			boxnames.push(c.box_id);
		}
		by_box[c.box_id].push(c);
	}

	var num_cards = candidates.length;
	var cards = [];
	var j = 0;
	while (cards.length < num_cards)
	{
		var s = boxnames[j % boxnames.length];
		if (by_box[s].length > 0) {
			var c = by_box[s].shift();
			cards.push(c);
		}

		j++;
		if (j > num_cards * boxnames.length) {
			throw "Infinite loop detected (i="+cards.length+"/"+num_cards+", j="+j+")";
		}
	}

	return cards;
}

// from given list of candidate kingdom cards, pick 10 to play with using some
// sort of random-ish method. The result should be a re-arranged input array
// such that the first 10 are the cards selected.
//
function make_cardlist(algo, candidates)
{
	if (algo == 'by_box') {
		return make_cardlist_by_box(candidates);
	}
	else if (algo == 'pick_1') {
		return make_cardlist_pickN(candidates, 1);
	}
	else if (algo == 'pick_2') {
		return make_cardlist_pickN(candidates, 2);
	}
	else if (algo == 'pick_3') {
		return make_cardlist_pickN(candidates, 3);
	}
	else if (algo == 'pick_1_3') {
		var n = Math.floor(Math.random()*3)+1;
		return make_cardlist_pickN(candidates, n);
	}
	else {
		return make_cardlist_default(candidates);
	}
}

// from information about 10 kingdom cards, assemble a cardset structure,
// adding the required "support cards" if any
//
function make_cardset(cardlist)
{
	if (cardlist.length < 10) {
		throw "Insufficient kingdom card count";
	}

	var cardset = {};
	var kingdom_cards = [];
	var kingdom_card_info = {};
	var num_prosperity = 0;
	var num_darkages = 0;
	var needs_bane = false;
	for (var i = 0; i < 10; i++) {
		var c = cardlist[i];
		if (c.box_id == 'prosperity') {
			num_prosperity++;
		}
		if (c.box_id == 'darkages') {
			num_darkages++;
		}
		if (c.id == 'Young Witch') {
			needs_bane = true;
		}
		kingdom_cards.push(c.id);
		kingdom_card_info[c.id] = c;
	}

	if (needs_bane) {
		// look for a qualifying "bane" card from unpicked cards
		for (var i = 10; i < cardlist.length; i++) {
			var c = cardlist[i];
			if (c.cost == '2' || c.cost == '3') {
				kingdom_cards.push(c.id);
				kingdom_card_info[c.id] = c;
				cardset.bane_pile = c.id;
				break;
			}
		}
		if (!cardset.bane_pile) {
			throw "Unable to find a suitable Bane card for use with Young Witch";
		}
	}
	cardset.kingdom = kingdom_cards;

	if (num_prosperity) {
		cardset.use_platinum = (Math.random() < num_prosperity/10);
		cardset.use_colony = cardset.use_platinum;
	}
	if (num_darkages) {
		cardset.use_shelters = (Math.random() < num_darkages/10);
	}

	return cardset;
}

function make_support_list(cardset)
{
	var support_cards = [];
	var added = {};

	if (cardset.use_platinum) {
		support_cards.push("Platinum");
		added["Platinum"] = true;
	}
	if (cardset.use_colony) {
		support_cards.push("Colony");
		added["Colony"] = true;
	}
	if (cardset.use_shelters) {
		support_cards.push("Shelters");
		added["Shelters"] = true;
	}

	for (var i = 0; i < cardset.kingdom.length; i++) {
		var cardname = cardset.kingdom[i];
		var c = get_card_info(cardname);

		if (c.cost.substr(-1) == 'P') {
			if (!added["Potion"]) {
				support_cards.push("Potion");
				added["Potion"] = true;
			}
		}

		if (c.type.match(/Looter/)) {
			if (!added["Ruins"]) {
				support_cards.push("Ruins");
				added["Ruins"] = true;
			}
		}

		if (c.requires) {
			for (var j = 0; j < c.requires.length; j++) {
				if (!added[c.requires[j]]) {
					support_cards.push(c.requires[j]);
					added[c.requires[j]]=true;
				}
			}
		}
	}

	return support_cards;
}

function arrange_cards(cards_array)
{
	cards_array.sort(function(a,b) {
		var x = a.box_id.localeCompare(b.box_id);
		if (x != 0) { return x; }
		return a.name.localeCompare(b.name);
	});
	return cards_array;
}
