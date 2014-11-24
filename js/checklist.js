	/****************
	Client side JavaScript for the LabSafe Web App.
	Written by 
	Barry Rhodes DHQP, CDC
	Oct. 16, 2014
	
	
	
	
	
	
	*****************/
	/******* Change Log ***************
	Oct, 16, 2014 Version 0.1 created
	
	
	******* End Change Log ***********/
	
	//two objects that are sent to the server via http post
	function checkbox(label,value) {
		this.label=label;  //checkbox label
		this.value=value; 	// value is the timestamp when it was checked
	}
	
	function form(subject, message, location, supervisorEmail, specimenCount, specimenID, date, checkBoxArray) {
		this.subject = subject; 				//email subject line
		this.message = message; 				//message body
		this.location = location; 				//Lab location 
		this.supervisorEmail = supervisorEmail; // supervisor email
		this.specimenCount = specimenCount;  	// Number of speicmens to process
		this.specimenID = specimenID; 			//a list of specmen IDS
		this.date = date;						//today's date
		this.checkBoxArray = checkBoxArray;		//array of all the checkboxes to be checked and their times (see checkBox object above)
	}



/********************* On Load ************************/
$( document ).delegate("#form1", "pageinit", function() {
	setDateToToday();
	if(localStorage.getItem("supervisorEmail") )$("#superEmail").val(localStorage.getItem("supervisorEmail"));
	initMic();
	

});

function initMic() {


	if (annyang) {
	  // Let's define a command.
	  var commands = {
		'start': function{ $('#alertSuperStart').prop('checked', true).checkboxradio('refresh');} ,
		'add lysis buffer' : function{ $('#checkbox-1a').prop('checked', true).checkboxradio('refresh');},
		'add specimen' : function{ $('#checkbox-2a').prop('checked', true).checkboxradio('refresh');},
		'mix well' : function{ $('#checkbox-3a').prop('checked', true).checkboxradio('refresh');},
		'incubate' : function{ $('#checkbox-4a').prop('checked', true).checkboxradio('refresh');},
		'send' : function{ $('#checkbox-5a').prop('checked', true).checkboxradio('refresh');}
		 }
	 
	  

	  // Add our commands to annyang
	  annyang.addCommands(commands);

	  // Start listening.
	  annyang.start();
	}
	else alert("Can't access microphone. ");

}




/********************* Event Handlers *****************/


//User has chose a form from the drop down list and clicked the Go to Form button
$(document).on("click", "#goToForm", function(event) {
	var selected = $("#selectForm").val();
	if(!selected) alert("Please choose a form.");
	else {
		var formID = "#" + selected;
		formID = "#form1";  //we only have one form so default to this one!!!!!!1
		$.mobile.changePage(formID);	
	}
});

//when a checkbox is selected a timestamp is updated
//when a checkbox is unselected the timestamp is deleted
//also for two checkboxes, an alert is sent to the users supervisor
$(document).on("change", ".checkboxes", function(event) {
	var id = $(this).attr("id");
	var isChecked = $(this).prop('checked');

	if(id == "alertSuperStart" && isChecked ) {
	//click off check box to see what the user wants first
	$('#' + id).prop('checked', false).checkboxradio('refresh');
	if(!validateDataOnStart() ) return;
			
		areYouSure("Are you sure?", "Clicking Send will alert your supervisor that this process is starting.", "Send", function() {
			// user has confirmed, do stuff
			setTimeStamp(id, isChecked);
			$('#' + id).prop('checked', true).checkboxradio('refresh');
			var subject = "Generating Lysates... starting";
			var permsg = $("#textarea").val();  //get the personal msg
			var data = retreiveFormData(subject, permsg, false);
			postDataToServer(data);  //data is the JSON object of all the data to be sent to the supervisor
			
			
		});
	}
	else if(id == "alertSuperStop" && isChecked ) {
	//click off check box to see what the user wants first
	$('#' + id).prop('checked', false).checkboxradio('refresh');
	if(!validateDataOnFinish()) return;
			areYouSure("Are you sure?", "Clicking Send will alert your supervisor that this process has completed.", "Send", function() {
			// user has confirmed, do stuff
			setTimeStamp(id, isChecked);
			$('#' + id).prop('checked', true).checkboxradio('refresh');
			var subject = "Generating Lysates... done";
			var permsg = $("#textarea").val();  //get the personal msg

			//var msg = scrapeData();
			var data = retreiveFormData(subject, permsg, true);
			//alert(JSON.stringify(data));
			
			postDataToServer(data);
			

		});
	}
	else setTimeStamp(id, isChecked);
	
});

//uncheck all boxes on Reset clicked
$(document).on("click", "#resetPage", function(event) {
	//$('.checkboxes').prop('checked', false).checkboxradio('refresh');
	$('#checkbox-1a').prop('checked', true).checkboxradio('refresh');
});

//End    Event Handlers


// Confirm Dialog Box functionality
function areYouSure(text1, text2, button, callback) {
  $("#sure .sure-1").text(text1);
  $("#sure .sure-2").text(text2);
  $("#textarea").val("");
  $("#sure .sure-do").text(button).on("click.sure", function() {
    callback();
   $(this).off("click.sure");
  });
  
  $( "#sure" ).popup( "open" );
}

	


function getCurTime() {
	var d = new Date();
	return d.toLocaleTimeString();
}

function setTimeStamp(id, checked, jq) {
	var str = "Time Stamp";
	if(checked) str = "Checked at " + getCurTime(); //else erase the timestamp
	var p_id = "#" + id + "-time";  //this is the id of the <p> element next to the checked box
	
	if(!$) alert("$ is undefined");
	else $(p_id).text(str);
	
}


function setDateToToday() {
	var today = new Date();
	var d = "";
	var m = "";
	if(parseInt(today.getDate()) < 9) d = "0" + today.getDate();
	else d = today.getDate();
	if(parseInt((today.getMonth() +1)) < 9) m = "0" + (today.getMonth() +1);
	else m = (today.getMonth() +1);
	var y = today.getFullYear();
	//this is the date format that seems to work.  Funny that the user input is different
	var dateStr = y + "-" + m + "-" + d;
	$(".today").text(dateStr);
}



//*******************Utility Functions *******************************

//gathers data from the screen and saves it in a JSON object
function retreiveFormData(subject, msg, getCheckboxFlag) {

	var d = []; //new array
	var i = 0;	
	if(getCheckboxFlag) {
		$( ".data" ).each(function( index ) {
			var id = "#" + $(this).attr("for");
			var p_id = id + "-time";
			d[i++] = {"label" : $(this).text(), "value" : $(p_id).text()} ;
		});
	}
	
	var formData = new form(subject, 
					msg,
					$("#selectLoc :selected").text(),
					$("#superEmail").val(),
					$("#specCount").val(),
					$("#specID").val(),
					$(".today").text(),
					d);
	return formData;
}

//takes the JSON object and posts it to a server
function postDataToServer(d) {
		try {
			var myObj = {};
			myObj.data = d;			
			var post = "/mobile/checklist/send";
			$.post(post, myObj, function(data) {
			});
		}
		catch(err) {
			alert('Error in sending data. Error is ' + err.message);
			return false;
		}
		return true;

}
	
//makes sure all the data is entered correctly

function validateDataOnStart() {
	var CRLF = "\n\r";
	var alertStr = "";
	if($("#selectLoc").val() == "...") {
		alertStr  = ("Please select a Location...");
	}
	if($("#specCount").val() == "") {
		alertStr += (CRLF + "Please enter a valid number of specimens inactivated...");
	}
	if($("#specID").val() == "") {
		alertStr += (CRLF + "Please enter a list of specimen IDs of specimens inactivated...");
	}

	if($("#superEmail").val() == "") {
		alertStr += (CRLF + "Please enter your supervisor's email address...");
	}
	
	if(alertStr) {
		alert(alertStr);
		return false;
	}
	else return true;

}

function validateDataOnFinish() {
	var CRLF = "\n\r";
	var alertStr = "";
	var strLen = 30;
	if(!$("#alertSuperStart").prop('checked')) {
		alertStr = $( "label[for='alertSuperStart']" ).text().slice(0, strLen) + "... is not checked";
	}
	if(!$("#checkbox-1a").prop('checked')) {
		alertStr += (CRLF + $( "label[for='checkbox-1a']" ).text().slice(0, strLen) + "... is not checked");
	}
	if(!$("#checkbox-2a").prop('checked')) {
		alertStr += (CRLF + $( "label[for='checkbox-2a']" ).text().slice(0, strLen) + "... is not checked");
	}
	if(!$("#checkbox-3a").prop('checked')) {
		alertStr += (CRLF + $( "label[for='checkbox-3a']" ).text().slice(0, strLen) + "... is not checked");
	}
	if(!$("#checkbox-4a").prop('checked')) {
		alertStr += (CRLF + $( "label[for='checkbox-4a']" ).text().slice(0, strLen) + "... is not checked");
	}
	if(alertStr) {
		alert(alertStr);
		return false;
	}
	else return true;
}



