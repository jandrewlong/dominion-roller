<?php

$data_prefix = "data";

if ($_SERVER['REQUEST_METHOD'] == 'POST') {

	$raw_post = file_get_contents('php://input');

	$set_number = 1;
	while (file_exists("$data_prefix/$set_number.txt")) {
		$set_number++;
	}

	$fp = fopen("$data_prefix/$set_number.txt", 'w')
		or die("Error");
	fwrite($fp, $raw_post);
	fclose($fp);

	echo json_encode(array(
		url => $_SERVER['REQUEST_URI'].'?set='.urlencode($set_number),
		shortname => $set_number
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
