<?php

$data_prefix = "data";

function find_last_set_id()
{
	global $data_prefix;

	$last = 0;
	$interval = 1000;
	while ($interval) {
		$set_id = $last + $interval;
		if (file_exists("$data_prefix/$set_id.txt")) {
			$last = $set_id;
		}
		else {
			$interval = floor($interval/10);
		}
	}
	return $last;
}

if ($_SERVER['REQUEST_METHOD'] == 'POST') {

	$raw_post = file_get_contents('php://input');

	$lock_fh = fopen("$data_prefix/lockfile", "a")
		or die("Cannot create lockfile");
	flock($lock_fh, LOCK_EX)
		or die("Cannot acquire lock");

	$set_number = find_last_set_id() + 1;
	if (file_exists("$data_prefix/$set_number.txt")) {
		die("Oops set number $set_number already exists.");
	}

	$fp = fopen("$data_prefix/$set_number.txt", 'w')
		or die("Error");
	fwrite($fp, $raw_post);
	fclose($fp);

	flock($lock_fh, LOCK_UN);
	fclose($lock_fh);

	echo json_encode(array(
		url => $_SERVER['REQUEST_URI'].'?set='.urlencode($set_number),
		shortname => $set_number
		));
	exit();
}

if ($_SERVER['QUERY_STRING'] == 'info')
{
	header("Content-Type: text/json");
	$last_set_number = find_last_set_id();
	echo json_encode(array(
		last_set => $last_set_number
		));
	exit();
}

$set_number = 'x';
if (preg_match('/^(\d+)$/', $_REQUEST['set'], $m)) {
	$set_number = $m[1];
}

if (!file_exists("$data_prefix/$set_number.txt")) {
	header("HTTP/1.0 404 Not Found");
	exit();
}

header("Content-Type: text/json");
echo file_get_contents("$data_prefix/$set_number.txt");
