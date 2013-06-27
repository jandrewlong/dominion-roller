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

function make_cardlist_alchem(candidates)
{
	// Ok, the way this works is this:
	//  First, we calculate the probability of randomly drawing
	//  exactly zero, three, four, or five alchemy cards from
	//  all the available cards.
	//  Then, using those probabilities as a probability distribution,
	//  we randomly pick how many alchemy cards we will have.
	//  Then we construct a random deck with that constraint.
	//
	// This technique is nearly the same as rerolling until we
	//  find a random draw that has exactly 0, 3, 4, or 5 alchemy
	//  cards, but avoids the excessive rerolling.

	// count how many alchemy cards there are
	var alchemy_cards = [];
	var other_cards = [];
	for (var i = 0; i < candidates.length; i++) {
		var c = candidates[i];
		if (c.box_id == 'alchemy') {
			alchemy_cards.push(c);
		}
		else {
			other_cards.push(c);
		}
	}

	var p = alchemy_cards.length / candidates.length;
	var probabilities = [];
	var sum = 0;
	for (var i = 0; i <= 10; i++) {
		// the probability of drawing (with replacement)
		// _exactly_ i alchemy cards
		probabilities[i] = (i == 0 || i == 3 || i == 4 || i == 5) ?
			Math.pow(p, i) * Math.pow(1.0-p, 10-i) :
			0;
		sum += probabilities[i];
	}

	if (sum == 0) {
		// user is messing with us; there is no possible way
		// to get between 3-5 alchemy cards...
		// so just fall back on the default algorithm
		return make_cardlist_default(candidates);
	}

	// decide how many alchemy cards we will use
	var Z = Math.random() * sum;
	var i = 0;
	while (i < probabilities.length && Z >= probabilities[i]) {
		Z -= probabilities[i];
		i++;
	}

	var desired_alchemy_card_count = Math.min(5,i);

	shuffle_array(alchemy_cards);
	shuffle_array(other_cards);

	var cards = [];
	for (var i = 0; i < desired_alchemy_card_count; i++) {
		cards.push(alchemy_cards[i]);
	}
	for (var i = 0; i < other_cards.length; i++) {
		cards.push(other_cards[i]);
	}

	return cards;
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
	else if (algo == 'alchem') {
		return make_cardlist_alchem(candidates);
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

	function can_be_bane_pile(c) {
		return c.id != 'Young Witch' && (c.cost == '2' || c.cost == '3');
	}

	if (needs_bane) {
		// look for a qualifying "bane" card from unpicked cards
		for (var i = 10; i < cardlist.length; i++) {
			var c = cardlist[i];
			if (can_be_bane_pile(c)) {
				kingdom_cards.push(c.id);
				kingdom_card_info[c.id] = c;
				cardset.bane_pile = c.id;
				break;
			}
		}
		if (!cardset.bane_pile) {
			// fall back... just add the next card, and then
			// pick a bane pile from the already selected
			// kingdom cards
			var c = cardlist[10];
			if (c) {
				kingdom_cards.push(c.id);
				kingdom_card_info[c.id] = c;
			}
			for (var i = 0; i < 10; i++) {
				var c = cardlist[i];
				if (can_be_bane_pile(c)) {
					cardset.bane_pile = c.id;
					break;
				}
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
	var support_cards = {};

	if (cardset.use_platinum) {
		support_cards["Platinum"] = true;
	}
	if (cardset.use_colony) {
		support_cards["Colony"] = true;
	}
	if (cardset.use_shelters) {
		support_cards["Shelters"] = true;
	}

	for (var i = 0; i < cardset.kingdom.length; i++) {
		var cardname = cardset.kingdom[i];
		var c = get_card_info(cardname);

		if (c.cost.substr(-1) == 'P') {
			support_cards["Potion"] = true;
		}

		if (c.type.match(/Looter/)) {
			support_cards["Ruins"] = true;
		}

		if (c.requires) {
			for (var j = 0; j < c.requires.length; j++) {
				support_cards[c.requires[j]]=true;
			}
		}
	}

	var as_list = [];
	for (var cardname in support_cards) {
		as_list.push(cardname);
	}

	return as_list;
}

function arrange_cards(cards_array)
{
	if (document.getElementById("sort_by_box_cbx").checked) {
		cards_array.sort(function(a,b) {
			var x = a.box_id.localeCompare(b.box_id);
			if (x != 0) { return x; }
			return a.name.localeCompare(b.name);
		});
	}
	else {
		cards_array.sort(function(a,b) {
			return a.name.localeCompare(b.name);
		});
	}
	return cards_array;
}
