// Load Page Content
function load_content(htmlpage){
	if(htmlpage == 'home') { document.getElementById("pcontent").innerHTML = ''; return false; }
	var xhr = new XMLHttpRequest();
	xhr.open('GET', htmlpage+'.htm');
	if (location.hostname === "localhost" || location.hostname === "127.0.0.1")
		xhr.setRequestHeader('Cache-Control', 'no-cache');
	xhr.onload = function() {
	    if (xhr.status === 200) {
	        document.getElementById("pcontent").innerHTML = xhr.responseText;
	        if(htmlpage == 'profile')
	        	loadCertificates();
	        else if(htmlpage == 'projects')
	        	loadProjects();
	        
	    }
	    else {
	        console.log('Request failed.  Returned status of ' + xhr.status);
	    }
	};
	xhr.send();
}

function genGallery(imgs,location,divid)
{
	blockhtml = '';
	if(imgs.length > 0)
	{
		// for(var img in imgs) blockhtml += '<div class="block-img"><img src="'+location+'/small/'+imgs[img]+'" onmouseover="magnifyImage(this);" onmouseout="hideMagnify();" onclick="viewImage(this)"></div>';
		for(var img in imgs) blockhtml += '<div class="block-img"><a href="'+location+'/'+imgs[img]+'" target="_blank"><img src="'+location+'/'+imgs[img]+'"></a></div>';
		document.getElementById(divid).innerHTML = blockhtml;
	}
}

function magnifyImage(img)
{
	 var bigsrc =  img.src.replace("small/", "");
	 document.getElementById("magnify").style.display = 'block';
	 document.getElementById("magnify").innerHTML = '<img src="'+bigsrc+'"></img>';
}

function hideMagnify()
{
	document.getElementById("magnify").style.display = 'none';
}

function viewImage(img)
{
	var bigsrc =  img.src.replace("small/", "");
	window.open(bigsrc, '_blank');
}

function loadProjects()
{
	var projects = Array('alwani-prefumes.jpg','babili-group.jpg','sms-alert.jpg','dsb-01.jpg','dsb-03.jpg','dsb-04.jpg','dsb-05.jpg','experts-01.jpg','experts-02.jpg','experts-03.jpg','experts-06.jpg','experts-07.jpg','app-inventory.jpg','jeddaheshop_com.jpg','ozone.jpg','pr-01.jpg','pr-04.jpg','pr-05.jpg','s4em-02.jpg','s4em-03.jpg','s4em-04.jpg','s4em-07.jpg','s4em-08.jpg','support_web_admin.jpg','bayan.jpg','eform_zawaj.jpg','sso.jpg','maleyah_reports.jpg','22.jpg','wiki.jpg');
	genGallery(projects,'img/projects','gallery-prj');
}

function loadAchivments()
{
	var projects = Array('jomlah.com.jpg','news_mof.jpg','news_cod.jpg','jeddah_eshops.jpg','civil_defence.jpg');
	genGallery(projects,'img/achivments','gallery-ach');
}

function loadCertificates()
{
	var certificates = Array('adobe.jpg','aptech03.jpg','aptech04.jpg','high_school_honor.jpg','lynda_AndroidAppDevelopmentwithJavaEssentialTraining_CertificateOfCompletion.jpg','lynda_AndroidSDK-LocalDataStorage_CertificateOfCompletion.jpg','lynda_AndroidStudioFirstLook_CertificateOfCompletion.jpg','lynda_BuildingFacebookApplicationswithPHPandMySQL_CertificateOfCompletion.jpg','lynda_BuildingaWebsitewithNodejsandExpressjs_CertificateOfCompletion.jpg','lynda_CreatinganiPadAppwithHTML5andPhoneGapBuild_CertificateOfCompletion.jpg','lynda_DebuggingPHP-AdvancedTechniques_CertificateOfCompletion.jpg','lynda_Flex-Hero-andFlashBuilder-Burrito-BetaPreview_CertificateOfCompletion.jpg','lynda_FoundationsofProgramming-CodeEfficiency_CertificateOfCompletion.jpg','lynda_FoundationsofProgramming-DesignPatterns_CertificateOfCompletion.jpg','lynda_FoundationsofProgramming-Object-OrientedDesign_CertificateOfCompletion.jpg','lynda_FundamentalsofSoftwareVersionControl_CertificateOfCompletion.jpg','lynda_GIMPEssentialTraining_CertificateOfCompletion.jpg','lynda_GitEssentialTraining_CertificateOfCompletion.jpg','lynda_HTML5FirstLook_CertificateOfCompletion.jpg','lynda_JavaEssentialTraining_CertificateOfCompletion.jpg','lynda_JavaScriptandAJAX_CertificateOfCompletion.jpg','lynda_JavaScriptandJSON_CertificateOfCompletion.jpg','lynda_MVCFrameworksforBuildingPHPWebApplications_CertificateOfCompletion.jpg','lynda_NegotiationFundamentals_CertificateOfCompletion.jpg','lynda_NodejsFirstLook_CertificateOfCompletion.jpg','lynda_UpandRunningwithAngularJS(2013)_CertificateOfCompletion.jpg','lynda_UpandRunningwithBootstrap3_CertificateOfCompletion.jpg','lynda_UpandRunningwithGoogleCloudPlatform(2013)_CertificateOfCompletion.jpg','lynda_UpandRunningwithSublimeText2_CertificateOfCompletion.jpg','lynda_UpandRunningwithTitanium_CertificateOfCompletion.jpg','lynda_UsingRegularExpressions_CertificateOfCompletion.jpg','lynda_WordPressEssentialTraining(2012)_CertificateOfCompletion.jpg','lynda_jQueryMobileEssentialTraining_CertificateOfCompletion.jpg','macromedia_dreamweaver_mx_2004_fundamnetals.jpg','macromedia_dreamweaver_mx_web_applications.jpg','macromedia_flash_mx_intermediate_developer.jpg','vtc_coldfusion.jpg','vtc_javascript_fundamentals.jpg','vtc_macromedia_flash_mx_action_script_fundamentals.jpg','vtc_php.jpg','vtc_php_project_solutions.jpg','vtc_search_engins_optimization.jpg','maharat01.jpg','maharat02.jpg','maharat03.jpg','mssp2010.jpg','nlp.jpg','taheel.jpg','toeic.jpg');
		genGallery(certificates,'img/certificates','gallery-crt');
}

function arrangeblocks(divid)
{
	var blocks 	  = document.getElementById(divid);
	var r 		  = 0;
	var direction = "";
	var blen	  = blocks.length;
	for(var i = 0; i < blen; i++)
	{
		if(i > 1)
		{
			r = i-2;
			var calcdiff = blocks[i].offsetTop - blocks[r].offsetTop - blocks[r].offsetHeight;
			if(calcdiff > 50)
			{
				calcdiff -= 14;
				blocks[i].style.marginTop = "-"+calcdiff.toString()+"px";
			}
		}
		if((i+1) == blen && (i%2 == 0)) { blocks[i].style.cssFloat = "left"; blocks[i].style.marginLeft = "27px"; }
	}
}

function isOdd(num) { return num % 2;}

function genProgressBar(pre)
{
	var bar = ' '; 		// data
	var x 	= 16; 		// length
	var b   = 100/x; 	// block value
	var bl 	= b/3;
	var d;
	for(var i=1; i<=x; i++)
	{
		if((i*b) > pre)
		{
			p = i*b; // precentage step
			// load empty blocks
			d = b-(p-pre);
			// empty level 1
			if(d < bl)
				bar += '░';
			// empty level 2
			else if(d >= bl && d <= (bl*2))
				bar += '▒';
			// empty level 3
			else if(d > (bl*2))
				bar += '▓';
		}
		// load full blocks
		else
			bar += '█';
	}
	document.write(bar);
}

function genProgressBarTest()
{
	for(var i=0; i<=100; i++)
	{
		genProgressBar(i);
		document.write(i+'<br>');
	}
}

function caclYears(year)
{
	var currentTime = new Date();
	var cyear = currentTime.getFullYear();
	var yearc = cyear-year;
	document.write("<b>("+yearc+"Y)</b>");
}

function YoutubeLink(vidID,subject)
{
	document.write('<div class="cblock_item"><a href="https://www.youtube.com/watch?v='+vidID+'" target="blank"><img class="vimg" src="https://img.youtube.com/vi/'+vidID+'/mqdefault.jpg" height="150"></a><br>'+subject+'</div>');
}