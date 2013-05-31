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

function make_cardlist_by_set(candidates)
{
	shuffle_array(candidates);

	var by_set = {};
	var setnames = [];
	for (var i = 0; i < candidates.length; i++) {
		var c = candidates[i];
		if (!by_set[c.set_id]) {
			by_set[c.set_id] = [];
			setnames.push(c.set_id);
		}
		by_set[c.set_id].push(c);
	}

	var num_cards = candidates.length;
	var cards = [];
	var j = 0;
	while (cards.length < num_cards)
	{
		var s = setnames[j % setnames.length];
		if (by_set[s].length > 0) {
			var c = by_set[s].shift();
			cards.push(c);
		}

		j++;
		if (j > num_cards * setnames.length) {
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
	if (algo == 'by_set') {
		return make_cardlist_by_set(candidates);
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
	var num_prosperity = 0;
	var num_darkages = 0;
	var needs_potion = false;
	var needs_ruins = false;
	var needs_bane = false;
	for (var i = 0; i < 10; i++) {
		var c = cardlist[i];
		if (c.set_id == 'prosperity') {
			num_prosperity++;
		}
		if (c.set_id == 'darkages') {
			num_darkages++;
		}
		if (c.cost.substr(-1) == 'P') {
			needs_potion = true;
		}
		if (c.type.match(/Looter/)) {
			needs_ruins = true;
		}
		if (c.name == 'Young Witch') {
			needs_bane = true;
		}
		kingdom_cards.push(c.name);
	}

	if (needs_bane) {
		// look for a qualifying "bane" card from unpicked cards
		for (var i = 10; i < cardlist.length; i++) {
			if (cardlist[i].cost == '2' || cardlist[i].cost == '3') {
				kingdom_cards.push(cardlist[i].name);
				cardset.bane_pile = cardlist[i].name;
				break;
			}
		}
		if (!cardset.bane_pile) {
			throw "Unable to find a suitable Bane card for use with Young Witch";
		}
	}

	var support_cards = [];
	if (Math.random() < num_prosperity/10) {
		support_cards.push("Platinum");
		support_cards.push("Colony");
	}
	if (Math.random() < num_darkages/10) {
		support_cards.push("Shelter");
	}
	if (needs_potion) {
		support_cards.push("Potion");
	}
	if (needs_ruins) {
		support_cards.push("Ruins");
	}

	cardset.kingdom = kingdom_cards;
	cardset.support = support_cards;
	return cardset;
}

function arrange_cards(cards_array)
{
	cards_array.sort(function(a,b) {
		var x = a.set_id.localeCompare(b.set_id);
		if (x != 0) { return x; }
		return a.name.localeCompare(b.name);
	});
	return cards_array;
}

