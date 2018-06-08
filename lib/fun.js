function load_content(htmlpage){
	if(htmlpage == 'home') { document.getElementById("pcontent").innerHTML = ''; return false; }
	var xhr = new XMLHttpRequest();
	xhr.open('GET', htmlpage+'.htm');
	xhr.onload = function() {
	    if (xhr.status === 200) {
	        document.getElementById("pcontent").innerHTML = xhr.responseText;
	    }
	    else {
	        console.log('Request failed.  Returned status of ' + xhr.status);
	    }
	};
	xhr.send();

}