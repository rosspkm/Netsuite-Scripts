/* Change Log
	-6/24/16 Added Auto Send Tracking Request depending if the Vendor Request is Email and non-empty Lead Time
	-7/26/16 Changed the Auto Track request methods to behave as a function and added regular PO search 
	-2/6/17 Added skip business days check
	-7/3/17 Added script error alert - send email error to script user error id in vendor page 
	-2/9/18 updated script to also include sss invalid operation with PO mark shipped
*/
function poSentUpdate(type,name)
{
	try
	{
		var vendorConversion = nlapiLoadRecord('vendor', 12303517); //Vendor: Script Setup
		var assignedID = vendorConversion.getFieldValue('custentity_backorderuserid');
		var today = new Date();
		var dd = today.getDate();
		var mm = today.getMonth()+1;
		var yyyy = today.getFullYear();
		var todayDate = mm + '/' + dd;
		//loads saved search for Pending Receipt PO to request confirmation
		//Auto Sends Email After 24 hours Passed 
		//Auto Sends Another Email after 48 hours Passed
		//Will skip POs with B/O Column containing B/O Date 
		dLog('Send auto confirmation request','-------------- loads saved search for Pending Receipt PO --------------');
		var poInternalID = savedsearchitemIDDynamic('customsearch2881', 0); //Internal ID
		var poBusinessDays = savedsearchitemIDDynamic('customsearch2881', 3); //Business Days
		if (!isEmpty(poInternalID))
		{
			for (var i = 0; i < poInternalID.length; i++)
			{
			var poID = poInternalID[i];
			var businessDays = poBusinessDays[i];
			dLog('PO Internal ID ' + poID, 'Business Days: ' + businessDays);
			var poRec = nlapiLoadRecord('purchaseorder', poID);
			var poNumber = poRec.getFieldValue('tranid');
			var vendorID = poRec.getFieldValue('entity');
			var vendorRec = nlapiLoadRecord('vendor', vendorID);
			var vendorName = vendorRec.getFieldValue('companyname');
			var vendorEmail = vendorRec.getFieldValue('email');
			var counter = 0;
			var vendorReplied = false;

			//Checks to see if PO contains backordered items
			//If it does, then it will ignore that record as it would have a longer lead time 
			var itemCount = poRec.getLineItemCount('item');
				for (var k = 1; k <=itemCount; k++)
				{
					if (!isEmpty(poRec.getLineItemValue('item','custcol74',k))) //B/O Column
					{
					counter = 1;
					break;
					}
				}
				
				var filters = new Array();
				filters[0] = new nlobjSearchFilter('internalid', null, 'is', poID);
				var columns = new Array();
				columns[0] = new nlobjSearchColumn('subject', 'messages');
				columns[1] = new nlobjSearchColumn('authoremail', 'messages');
				var searchresults = nlapiSearchRecord('purchaseorder', null, filters, columns);
				for ( var q = 0; searchresults != null && q < searchresults.length; q++ )
				{
					var searchresult = searchresults[q];
					var subject = searchresult.getValue('subject', 'messages');
					var authorEmail = searchresult.getValue('authoremail', 'messages');
					if(authorEmail.indexOf('pts.') == -1 && authorEmail.indexOf('protherapysupplies.com') == -1)
					{
						//Tracks Different Author Email, which is not pts related
						//This means the vendor replied, which will halt confirmation emails 
						//This was per Sean to stop the confirmation email from being sent if vendor replies
						vendorReplied = true;
						var newMemo = 'Vendor Replied '+todayDate;
						var memo = poRec.getFieldValue('memo');
						if(isEmpty(memo))
						{
							nlapiSubmitField('purchaseorder', poID, 'memo',newMemo);
						}
						else
						{
							nlapiSubmitField('purchaseorder', poID, 'memo',poRec.getFieldValue('memo')+'; '+newMemo);
						}
						dLog('VENDOR REPLIED');
						break;
					}
				}
			

				if (counter != 1 && vendorReplied == false)
				{				
					//Will only send if business day is equal to 2 or 4 days 
					if(businessDays == 2)
					{
						if(!checkEmail(poID, 'purchaseorder', '(24 HOURS)'))
						{
							var ptsemail = "tracking@protherapysupplies.com"
							var bodySignature = "\n\nThank you,"
							+"\nPro Therapy Supplies"
							+"\n770-441-9808"
							+"\n\nNotice: This electronic message and attachment(s), if any, contains information from www.protherapysupplies.com  that may be privileged and confidential. The information is intended to be for the use of the addressee only. If you are not the addressee, note that any disclosure, copying, distribution or use of the contents of this message is prohibited. If you received this message in error, please notify the sender immediately.";
							var subject = poNumber+' Confirmation Request (24 HOURS)';
							var body = "Hello " + vendorName 
							+", \n\nPlease confirm receipt of our "+poNumber+" using the following link: https://671309.extforms.netsuite.com/app/site/hosting/scriptlet.nl?script=464&deploy=1&compid=671309&h=394c99f154810de13232&poid="+poID+"&tranid="+poNumber
							+"\n\nThe new form will help us efficiently streamline the process so we can also inform customers in a timely manner."
							+bodySignature;


							var records = new Object();
							records['transaction'] = poID;
							records['entity'] = vendorID;
							var attachment = nlapiPrintRecord('TRANSACTION',poID,'PDF',null);
							nlapiSendEmail(ptsemail ,vendorEmail, subject, body, null,null, records, null, true); //pts.tracking 
							var newMemo = 'Confirmation Req '+todayDate;
							var memo = poRec.getFieldValue('memo');
							if(isEmpty(memo))
							{
							poRec.setFieldValue('memo', newMemo);
							}
							else
							{
							poRec.setFieldValue('memo',poRec.getFieldValue('memo')+'; '+newMemo);
							}
							dLog('Email sent');
							nlapiSubmitRecord(poRec,true);
						}
					}
					
					if(businessDays == 4)
					{
						if(!checkEmail(poID, 'purchaseorder', '(3 DAYS)'))
						{
							var ptsemail = "tracking@protherapysupplies.com"
							var bodySignature = "\n\nThank you,"
							+"\nPro Therapy Supplies"
							+"\n770-441-9808"
							+"\n\nNotice: This electronic message and attachment(s), if any, contains information from www.protherapysupplies.com  that may be privileged and confidential. The information is intended to be for the use of the addressee only. If you are not the addressee, note that any disclosure, copying, distribution or use of the contents of this message is prohibited. If you received this message in error, please notify the sender immediately.";
							var subject = poNumber+' Confirmation Request (3 DAYS)';
							var body = "Hello " + vendorName 
							+", \n\nPlease confirm receipt of our "+poNumber+" using the following link: https://671309.extforms.netsuite.com/app/site/hosting/scriptlet.nl?script=464&deploy=1&compid=671309&h=394c99f154810de13232&poid="+poID+"&tranid="+poNumber
							+"\n\nThe new form will help us efficiently streamline the process so we can also inform customers in a timely manner."
							+bodySignature;


							var records = new Object();
							records['transaction'] = poID;
							records['entity'] = vendorID;
							var attachment = nlapiPrintRecord('TRANSACTION',poID,'PDF',null);
							nlapiSendEmail(ptsemail ,vendorEmail, subject, body, null,null, records, null, true); //pts.tracking 
							var newMemo = 'Confirmation Req '+todayDate;
							var memo = poRec.getFieldValue('memo');
							if(isEmpty(memo))
							{
							poRec.setFieldValue('memo', newMemo);
							}
							else
							{
							poRec.setFieldValue('memo',poRec.getFieldValue('memo')+'; '+newMemo);
							}
							dLog('Email sent');
							nlapiSubmitRecord(poRec,true);
						}
					}
				}
			}
		}
		
		//loads saved search for Pending Receipt PO to request tracking after lead time is passed
		//Compares Business Days and Lead Time. If Business Days > Lead Time, an email will be sent.
		//Will skip POs with B/O Column containing B/O Date 
		dLog('Send auto tracking request','-------------- loads saved search for Pending Receipt Tracking PO --------------');
		var poInternalId = savedsearchitemIDDynamic('customsearch2882', 0); //Internal ID
		var poBusinessDay = savedsearchitemIDDynamic('customsearch2882', 3); //Business Days
		var poLeadTime =  savedsearchitemIDDynamic('customsearch2882', 4); //Vendor Lead Time
		if (!isEmpty(poInternalId))
		{
			for (var i = 0; i < poInternalId.length; i++)
			{
			var poID = poInternalId[i];
			var businessDays = poBusinessDay[i];
			var leadTime = poLeadTime[i];
			var hoursPassed;
			dLog('PO Internal ID ' + poID, 'Business Days: ' + businessDays + ' | Lead Time: ' + leadTime);
			var poRec = nlapiLoadRecord('purchaseorder', poID);
			var poNumber = poRec.getFieldValue('tranid');
			var vendorID = poRec.getFieldValue('entity');
			var vendorRec = nlapiLoadRecord('vendor', vendorID);
			var vendorName = vendorRec.getFieldValue('companyname');
			var vendorEmail = vendorRec.getFieldValue('email');
			var counter = 0;

			//Checks to see if PO contains backordered items
			//If it does, then it will ignore that record as it would have a longer lead time 
			var itemCount = poRec.getLineItemCount('item');
				for (var k = 1; k <=itemCount; k++)
				{
					if (!isEmpty(poRec.getLineItemValue('item','custcol74',k))) //B/O Column
					{
					counter = 1;
					break;
					}
				}

				if (counter != 1)
				{				
					if(!checkEmail(poID, 'purchaseorder', '24 HOURS AFTER LEAD TIME'))
					{
						var ptsemail = "tracking@protherapysupplies.com"
						var bodySignature = "\n\nThank you,"
						+"\nPro Therapy Supplies"
						+"\n770-441-9808"
						+"\n\nNotice: This electronic message and attachment(s), if any, contains information from www.protherapysupplies.com  that may be privileged and confidential. The information is intended to be for the use of the addressee only. If you are not the addressee, note that any disclosure, copying, distribution or use of the contents of this message is prohibited. If you received this message in error, please notify the sender immediately.";
						var subject = poNumber+' Tracking Request - 24 hours after Lead Time';
						var body = "Hello " + vendorName 
						+", \n\nPlease let us know the expected date and provide the tracking number as soon as possible for " + poNumber
						+bodySignature;


						var records = new Object();
						records['transaction'] = poID;
						records['entity'] = vendorID;
						nlapiSendEmail(ptsemail ,vendorEmail, subject, body, null,null, records, null, true); //pts.tracking 
						var newMemo = 'Tracking Req '+todayDate;
						var memo = poRec.getFieldValue('memo');
						if(isEmpty(memo))
						{
						poRec.setFieldValue('memo', newMemo);
						}
						else
						{
						poRec.setFieldValue('memo',poRec.getFieldValue('memo')+'; '+newMemo);
						}

						nlapiSubmitRecord(poRec,true);
						dLog('Email sent');
					}
				}
			}			
		}
		
		dLog('Remaining usage','getRemainingUsage====>'+nlapiGetContext().getRemainingUsage());
	} catch (e) 
	{
		var stErrMsg = '';
		var vendorConversion = nlapiLoadRecord('vendor', 12303517); //Vendor: Script Setup
		var errorUserID = vendorConversion.getFieldValue('custentity_erroruserid');
		if (e.getDetails != undefined) 
		{
			stErrMsg = 'Script Error: ' + e.getCode() + '<br>' + e.getDetails() + '<br>' + e.getStackTrace();
			nlapiSendEmail(errorUserID, errorUserID, 'SCRIPT ERROR: scheduledPOSentUpdate', stErrMsg, null, null, null);
		}
		else 
		{ 
			stErrMsg = 'Script Error: ' + e.toString(); 
			nlapiSendEmail(errorUserID, errorUserID, 'SCRIPT ERROR: scheduledPOSentUpdate', stErrMsg, null, null, null);		
		}
		dLog('Error', stErrMsg);
		
		var taskError = stErrMsg.search("LINKED_ITEMS_DONT_MATCH");
		var SSSInvalidSublist = stErrMsg.search("SSS_INVALID_SUBLIST_OPERATION");
		if(taskError != -1 || SSSInvalidSublist != -1)
		{
			//Check if task already sent -> send task
			if(checkTask(purchaseOrderId[i],assignedID,11))
			{
				dLog('checkTask poID='+purchaseOrderId[i],'Task Already Sent'); 
			}else
			{	//send task to manually ship PO
				sendTask(purchaseOrderId[i],pOrder.getFieldValue('entity'),stErrMsg,assignedID,'script unable to fulfill PO, please manually mark ship',assignedID,11);
				dLog('Script Error poID='+purchaseOrderId[i], 'Task Sent');
			}
          
          			//Check if task already sent -> send task
			if(checkTask(purchaseOrderId[i],26007751,11))
			{
				dLog('checkTask poID='+purchaseOrderId[i],'Task Already Sent'); 
			}else
			{	//send task to manually ship PO
				sendTask(purchaseOrderId[i],pOrder.getFieldValue('entity'),stErrMsg,26007751,'script unable to fulfill PO, please manually mark ship',26007751,11);
				dLog('Script Error poID='+purchaseOrderId[i], 'Task Sent');
			}
		}
	}
}


function savedsearchitemIDDynamic(savedsearchID, columnNumber) //Gets values of chosen column in saved search
{
	/*---- generic method for item saved search. results values of a column ----*/
	var columnValueArray = [];
	var resultsList = nlapiSearchRecord('purchaseorder',savedsearchID); //saved search returns internal ids
	
	if(!isEmpty(resultsList))
	{
		dLog('savedsearchitemID',savedsearchID+' resultsList.length: '+resultsList.length);
		for(i=0; i<resultsList.length; i++)
		{	
			//for each row, get value itemID
			var rows = resultsList[i];
			var columns = rows.getAllColumns();
			//dLog('savedsearchitemID','columns.length: '+columns.length);
			
			var column = columns[columnNumber]; 
			var columnVal = rows.getValue(column);
			columnValueArray[i] = columnVal;
			//loads item with itemID
			//var item = nlapiLoadRecord('inventoryitem', itemID);
		}
	}
	return columnValueArray;
}

function savedsearchitemID(savedsearchID)
{
	/*---- generic method for item saved search. results values of 1st column (should be item internalID) ----*/
	var itemIDarray = [];
	var resultsList = nlapiSearchRecord('transaction',savedsearchID); //saved search returns internal ids
	
	if(!isEmpty(resultsList))
	{
		dLog('savedsearchitemID','resultsList.length: '+resultsList.length);
		for(i=0; i<resultsList.length; i++)
		{	
			//for each row, get value itemID
			var rows = resultsList[i];
			var columns = rows.getAllColumns();
			//dLog('savedsearchitemID','columns.length: '+columns.length);
			
			var column = columns[0]; //only 1 column in saved search
			var itemID = rows.getValue(column);
			itemIDarray[i] = itemID;
			//loads item with itemID
			var item = nlapiLoadRecord('purchaseorder', itemID);
		}
	}
	return itemIDarray;
}


function checkEmail(tranID,tranType,keyword)
{
	var filters = new Array();
	filters[0] = new nlobjSearchFilter('mainline', null, 'is', 'T');
	filters[1] = new nlobjSearchFilter('internalid', null, 'is', tranID);
	var columns = new Array();
	columns[0] = new nlobjSearchColumn('subject', 'messages');
	var searchresults = nlapiSearchRecord(tranType, null, filters, columns);
	for ( var i = 0; searchresults != null && i < searchresults.length; i++ )
	{
		var searchresult = searchresults[i];
		var subject = searchresult.getValue('subject', 'messages');
		if(subject.toUpperCase().search(keyword) != -1)
		{
			dLog('subjectEmail',keyword+' email already sent.');
			return true;
		}
		//dLog('retrieveMessage',i+': '+subject);
	}
	return false;
}

function checkTask(tranID,userID,taskType)
{	
	var filters = new Array();
	filters[0] = new nlobjSearchFilter('mainline', null, 'is', 'T');
	filters[1] = new nlobjSearchFilter('internalid', null, 'is', tranID);
	var columns = new Array();
	columns[0] = new nlobjSearchColumn('assigned', 'task');
	columns[1] = new nlobjSearchColumn('custevent9', 'task');
	var searchresults = nlapiSearchRecord('purchaseorder', null, filters, columns);
	for ( var i = 0; searchresults != null && i < searchresults.length; i++ )
	{
		var searchresult = searchresults[i];
		var searchTaskType = searchresult.getValue('custevent9', 'task');
		var searchUserID = searchresult.getValue('assigned', 'task');
		if(searchTaskType == taskType && searchUserID == userID)
		{
			return true;
		}
	}
	return false;
}

function sendTask(tranID,customerID,message,userID,title,assignedID,tasktype)
{
	newTask = nlapiCreateRecord('task');
	newTask.setFieldValue('owner', userID);
	newTask.setFieldValue('title', title);
	newTask.setFieldValue('message', message);
	newTask.setFieldValue('custevent9', tasktype);
	newTask.setFieldValue('assigned', assignedID);
	newTask.setFieldValue('company', customerID);
	newTask.setFieldValue('transaction', tranID);
	nlapiSubmitRecord(newTask, true);
}

function isEmpty(fldValue)
{
    if (fldValue == '') return true;
    if (fldValue == 'null') return true;
    if (fldValue == null) return true;
    if (fldValue == 'undefined') return true;
    if (fldValue == undefined) return true;    
    return false;
}

function dLog(logTitle, logDetails)
{
    nlapiLogExecution('DEBUG', logTitle, logDetails);
}