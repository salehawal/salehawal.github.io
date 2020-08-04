// Load Page Content
function load_content(htmlpage){
	if(htmlpage == 'home') { document.getElementById("pcontent").innerHTML = ''; return false; }
	var xhr = new XMLHttpRequest();
	xhr.open('GET', htmlpage+'.htm');
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

function genGallery(imgs,location)
{
	blockhtml = '';
	if(imgs.length > 0)
	{
		for(var img in imgs) blockhtml += '<div class="block-img"><img src="'+location+'/small/'+imgs[img]+'" onmouseover="magnifyImage(this);" onmouseout="hideMagnify();" onclick="viewImage(this)"></div>';
		document.getElementById('gallery').innerHTML = blockhtml;
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
	var projects = Array('alwani-prefumes.png','babili-group.jpg','checkque_print.jpg','data-collection.png','data-entry.png','dsb-01.png','dsb-03.png','dsb-04.png','dsb-05.png','experts-01.png','experts-02.png','experts-03.png','experts-04.png','experts-06.png','experts-07.png','experts-09.png','experts-10.png','fitcles.png','fore-vision.png','highclass.png','app-inventory.png','irehab-co.png','jeddaheshop_arabnews.png','jeddaheshop_com.png','jomlah_com.jpg','ozone.png','pr-01.png','pr-04.png','pr-05.png','report-validation.jpg','reporting.jpg','s4em-01.png','s4em-02.png','s4em-03.png','s4em-04.png','s4em-05.png','s4em-06.png','s4em-07.png','s4em-08.png','sms-alert.png');
	genGallery(projects,'img/projects');
}

function loadCertificates()
{
	var certificates = Array('adobe.png','aptech01.png','aptech02.png','aptech03.png','aptech04.png','civil_defence.jpg','high_school.png','high_school_honor.png','iq_test.png','jeddah_eshops.png','lynda_AndroidAppDevelopmentwithJavaEssentialTraining_CertificateOfCompletion.jpg','lynda_AndroidSDK-LocalDataStorage_CertificateOfCompletion.jpg','lynda_AndroidStudioFirstLook_CertificateOfCompletion.jpg','lynda_BuildingFacebookApplicationswithPHPandMySQL_CertificateOfCompletion.jpg','lynda_BuildingaWebsitewithNodejsandExpressjs_CertificateOfCompletion.jpg','lynda_CreatinganiPadAppwithHTML5andPhoneGapBuild_CertificateOfCompletion.jpg','lynda_DebuggingPHP-AdvancedTechniques_CertificateOfCompletion.jpg','lynda_Flex-Hero-andFlashBuilder-Burrito-BetaPreview_CertificateOfCompletion.jpg','lynda_FoundationsofProgramming-CodeEfficiency_CertificateOfCompletion.jpg','lynda_FoundationsofProgramming-DesignPatterns_CertificateOfCompletion.jpg','lynda_FoundationsofProgramming-Object-OrientedDesign_CertificateOfCompletion.jpg','lynda_FundamentalsofSoftwareVersionControl_CertificateOfCompletion.jpg','lynda_GIMPEssentialTraining_CertificateOfCompletion.jpg','lynda_GitEssentialTraining_CertificateOfCompletion.jpg','lynda_HTML5FirstLook_CertificateOfCompletion.jpg','lynda_JavaEssentialTraining_CertificateOfCompletion.jpg','lynda_JavaScriptandAJAX_CertificateOfCompletion.jpg','lynda_JavaScriptandJSON_CertificateOfCompletion.jpg','lynda_MVCFrameworksforBuildingPHPWebApplications_CertificateOfCompletion.jpg','lynda_NegotiationFundamentals_CertificateOfCompletion.jpg','lynda_NodejsFirstLook_CertificateOfCompletion.jpg','lynda_UpandRunningwithAngularJS(2013)_CertificateOfCompletion.jpg','lynda_UpandRunningwithBootstrap3_CertificateOfCompletion.jpg','lynda_UpandRunningwithGoogleCloudPlatform(2013)_CertificateOfCompletion.jpg','lynda_UpandRunningwithSublimeText2_CertificateOfCompletion.jpg','lynda_UpandRunningwithTitanium_CertificateOfCompletion.jpg','lynda_UsingRegularExpressions_CertificateOfCompletion.jpg','lynda_WordPressEssentialTraining(2012)_CertificateOfCompletion.jpg','lynda_jQueryMobileEssentialTraining_CertificateOfCompletion.jpg','macromedia_dreamweaver_mx_2004_fundamnetals.png','macromedia_dreamweaver_mx_web_applications.png','macromedia_flash_mx_intermediate_developer.png','maharat01.png','maharat02.png','maharat03.png','mssp2010.png','nlp.png','taheel.png','toeic.png','vtc_coldfusion.png','vtc_javascript_fundamentals.png','vtc_macromedia_flash_mx_action_script_fundamentals.png','vtc_php.png','vtc_php_project_solutions.png','vtc_search_engins_optimization.png');
	genGallery(certificates,'img/certificates');
}