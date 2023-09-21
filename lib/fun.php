<?php
// get files and directories
function scanFolder($dir){
	$files = array();
	$fh = scandir('../'.$dir);
	unset($fh[array_search('.', $fh, true)]);
	unset($fh[array_search('..', $fh, true)]);
	if (count($fh) < 1) return;
	foreach($fh as $cfile)
	    	$files[] = $dir.'/'.$cfile;
	return $files;
}

// Route
if(isset($_GET['op']))
{
	// set target
	if($_GET['op'] == 'get_certificates')
		$sfiles = scanFolder('img/certificates');
	elseif($_GET['op'] == 'get_projects')
		$sfiles = scanFolder('img/projects');
	//output data
	$ofiles = yaml_emit($sfiles);
	echo $ofiles;
}

?>