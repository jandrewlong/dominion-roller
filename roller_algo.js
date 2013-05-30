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

// from given list of candidate kingdom cards, pick 10
function make_cardlist_default(candidates)
{
	shuffle_array(candidates);
	candidates.splice(10);
	return candidates;
}

// from given list of candidate kingdom cards, pick 10
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

	var cards = [];
	var j = 0;
	while (cards.length < 10 && j < 10 * setnames.length) {
		var s = setnames[j % setnames.length];
		if (by_set[s].length > 0) {
			var c = by_set[s].shift();
			cards.push(c);
		}
		j++;
	}

	if (cards.length < 10) {
		throw "Insufficient kingdom card count";
	}

	return cards;
}

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

	var kingdom_cards = [];
	var num_prosperity = 0;
	var num_darkages = 0;
	var needs_potion = false;
	var needs_ruins = false;
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
		kingdom_cards.push(c.name);
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
	return {
		kingdom: kingdom_cards,
		support: support_cards
		};
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

