/*
	4/23/18 if(type == 'delete') { return; }
	5/21/18 Added Chronos to Auto Markship on PO
	3/20/19 - change task title to 'script unable to fulfill PO poID='+nlapiGetRecordId()+' - please manually mark ship'
	4/30/19 - revision to If PO Mark Shipped = Yes, then fulfills PO
	7/29/19 - if PO SENT = Email PO then send custom email
	9/5/19 - do not update custitem_bodate if poStatus Pending Bill or Fully Billed
*/
function beforeSubmit_anyPO(type)
{
	try 
	{
		var customform = nlapiGetFieldValue('customform');
		if(customform == 109) //Dropship PO Form
		{
			var poID = nlapiGetRecordId();
			dLog('beforeSubmit_anyPO','-------------'+'poID='+poID+'; type='+type+'-------------');
			
			//var customerID = nlapiGetFieldValue('shipto');
			
			//Bauerfeind and shipping to Canada, change email address to s.tang@protherapysupplies.com
			if(nlapiGetFieldValue('entity') == 27 && nlapiGetFieldValue('shipaddress').search('Canada') != -1)
			{
				dLog('Bauerfeind test','Shipping to Canada => change email '+nlapiGetFieldValue('email'));
				nlapiSetFieldValue('email','s.tang@protherapysupplies.com');
			}
		}
		
		//Sends Email for Regular PO 
		var createdFrom = nlapiGetFieldValue('createdfrom') || '';
		if (type == 'create')
		{
			if (isEmpty(createdFrom))
			{
				if(nlapiGetFieldValue('custbody45') == 1)
				{
				nlapiSetFieldValue('tobeemailed','T');
				}
			}
		}     
	}
	catch (e) 
	{
		var stErrMsg = '';
		if (e.getDetails != undefined) 
		{
			stErrMsg = 'Script Error: ' + e.getCode() + '<br>' + e.getDetails() + '<br>' + e.getStackTrace();
		}
		else 
		{
			stErrMsg = 'Script Error: ' + e.toString();
		}
		
		dLog('beforeSubmit_anyPO Error poID='+nlapiGetRecordId(), stErrMsg);
	}
}

function afterSubmit_anyPO(type)
{
	try 
		{
		//If shipTo on PO is exactly United States, then send task to delete PO
		var poId = nlapiGetRecordId();
		dLog('afterSubmit_anyPO','-------------'+'poId='+poId+'; type='+type+'-------------');
		if(type == 'delete') { return; }
		
		var poLoad = nlapiLoadRecord('purchaseorder', poId);
		var shipTo = nlapiGetFieldValue('shipaddress');
		if(!isEmpty(shipTo))
		{
			dLog('poId='+poId,'shipTo='+shipTo);
			
			if(shipTo == 'United States')
			{
				var title = 'shipTo on PO is exactly United States - Please delete '+nlapiGetFieldValue('tranid');
				var customerID = nlapiGetFieldValue('entity');
				var assignedID = 264861; // Assigned to 264861 = Elizabeth Owen
				var tasktype = 11; //Misc
				sendTask(nlapiGetRecordId(),customerID,"",assignedID,title,assignedID,11);
				dLog(nlapiGetFieldText('tranid'),'shipTo on PO is exactly United States Task Sent');
			}
		}
		
		//If VOID PO is "email vendor asking to cancel", then memo = "Req PO Cancellation (Date)"
		var today = new Date();
		var dd = today.getDate();
		var mm = today.getMonth()+1;
		var todayDate = mm + '/' + dd;
		var newMemo = "Req PO Cancellation " + todayDate;
		var oldMemo = nlapiGetFieldValue('memo');
		var voidPO = nlapiGetFieldValue('custbody59');

		
		
		if (isEmpty(oldMemo) && voidPO == 2) {
			nlapiSubmitField('purchaseorder', poId, 'memo', newMemo);
			dLog('TEST VOID PO CANCEL DATE', 'newMemo= ' + newMemo);
			
		} else if (!isEmpty(oldMemo) && voidPO == 2 ) {
			if (!(oldMemo.indexOf('Req PO Cancellation') > -1 ) ) {
				nlapiSubmitField('purchaseorder', poId, 'memo', oldMemo + "; " + newMemo);
				dLog('TEST VOID PO CANCEL DATE', 'oldMemo= ' + oldMemo + 'newMemo= ' + newMemo);
			}		
		}	

		//If Item B/O Date updated on PO, updates Item Record to new B/O Date
		var poID = nlapiGetRecordId();
		var poRec = nlapiLoadRecord('purchaseorder', poID); 
		dLog('poID', 'poID= '+poID);
		var poStatus = nlapiGetFieldValue('status');
		if(poStatus != "Fully Billed" && poStatus != "Pending Bill")
		{
			var itemCount = nlapiGetLineItemCount('item');
			dLog('itemCount', 'itemCount= '+itemCount);
			
			for(var i = 1; i <= itemCount; i++)
			{
				var itemName = poRec.getLineItemText('item','item',i); //Item Name
				//dLog('itemName', 'itemName= '+itemName);
				var itemID = poRec.getLineItemValue('item','item',i); //Item ID
				//dLog('itemID', 'itemID= '+itemID);
				var poItemExpirationDate = nlapiGetLineItemValue('item','custcol_expirationdate', i);
				var poBackOrderDate = nlapiGetLineItemValue('item','custcol74', i); 
				//dLog('poItemExpirationDate', 'poItemExpirationDate= '+poItemExpirationDate);
				var itemType = nlapiGetLineItemValue('item','itemtype',i);
				if(itemType == 'InvtPart')
				{
					//If Item Expiration Date updated on PO, updates Item Record to new Expiration Date
	/*				if(!isEmpty(poItemExpirationDate))
					{
						//load each item record from PO
						var filters = new Array();
						filters[0] = new nlobjSearchFilter('internalid', null, 'is', itemID);
						var columns = new Array();
						columns[0] = new nlobjSearchColumn('custitem_expirationdate');
						var searchresults = nlapiSearchRecord('item', null, filters, columns);
						var itemExpirationDate = searchresults[0].getValue('custitem_expirationdate'); //Current Item Expiration Date
						if(itemExpirationDate == poItemExpirationDate)
						{
	//						var item = nlapiLoadRecord('inventoryitem',itemID);
	//						var updatedItemExpirationDate = item.setFieldValue('custitem_expirationdate', poItemExpirationDate); 
	//						nlapiSubmitRecord(item);
							//Updated to PO Expiration Date
							nlapiSubmitField('inventoryitem',itemID,'custitem_expirationdate',poItemExpirationDate);
							dLog('item updated', 'Item ID: '+itemID + ' |Old Expiration Date: '+itemExpirationDate+' |Updated Expiration Date: '+poItemExpirationDate);
						}
					} else
					{
						//dLog('PO Item Expiration Date', 'Expiration Date Field empty for this item. ItemID: '+itemID);
					}
	*/				
					//Add backorder date from PO Line Item to correlated item backorder date
					if(!isEmpty(poBackOrderDate))
					{
						nlapiSubmitField('inventoryitem',itemID,'custitem_bodate',poBackOrderDate);
					}
					
				}
			}
		}
		
		if(type == 'xedit') 
		{
			//Block international/PO box/emptyAddress from being set with inline editing so CSR can check shipping
			var poId = nlapiGetRecordId();
			dLog('afterSubmit_anyPO','-------------'+'poId='+poId+'; type='+type+'-------------');
			
			var poLoad = nlapiLoadRecord('purchaseorder', poId);
			if(!isEmpty(poLoad.getFieldValue('custbody45')))
			{
				dLog('poId='+poId,'PO Sent: '+nlapiGetFieldValue('custbody45'));
				var shipTo = poLoad.getFieldValue('shipaddress');
				//dLog('Shipping Address: ',shipTo);
				var arrAddress = shipTo.split(" ");
				var addressUSA = false;
				var arrUSA = ['PR', 'AK', 'AL', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'];
				//Check if AK/HI/PR
				for (a in arrAddress)
				{
					//dLog('Address[a]: ',arrAddress[a]);
					if ((arrAddress[a] == "AK") || (arrAddress[a] == "HI") || (arrAddress[a] == "PR"))
					{
						nlapiSubmitField('purchaseorder', poId, 'custbody45', '');
						dLog('Set PO Sent Empty','poId='+poId+'AK/HI/PR detected');
					}
				}
				//Check if USA
				for (b in arrAddress)
				{
					for (c in arrUSA)
					{
						if (arrAddress[b] == arrUSA[c])
						{
							//dLog('USA Address Match',arrAddress[b] + ' ' +arrUSA[c]);
							addressUSA = true;
							break;
						}
					}
				}
				//Check if International order
				if (!addressUSA)
				{
					nlapiSubmitField('purchaseorder', poId, 'custbody45', '');
					dLog('Set PO Sent Empty','poId='+poId+'International detected');
				}
				//Check for PO Box
				if(shipTo.search(/P.O. Box/i) != -1)
				{
					nlapiSubmitField('purchaseorder', poId, 'custbody45', '');
					dLog('Set PO Sent Empty','poId='+poId+'PO Box detected');
				}
				else if(shipTo.search(/PO Box/i) != -1)
				{
					nlapiSubmitField('purchaseorder', poId, 'custbody45', '');
					dLog('Set PO Sent Empty','poId='+poId+'PO Box detected');
				
				}
				if(isEmpty(shipTo))
				{
					nlapiSubmitField('purchaseorder', poId, 'custbody45', '');
					dLog('Set PO Sent Empty','poId='+poId+'Empty Address detected');
				
				}
			}
		}
		
		if(type == 'edit' || type == 'create' || type == 'dropship') 
		{			
			//IF a Dropship PO exist, mark the checkbox as true 
			var soId = nlapiGetFieldValue('createdfrom') || '' ;
			if (!isEmpty(soId))
			{
				var soRec = nlapiLoadRecord('salesorder', soId);
				var checkPOExist = soRec.getFieldValue('custbody_poexist') || 'F'; //Dropship PO Exist
				if (checkPOExist == 'F')
				{
				dLog('Associated SO has dropship PO exist set to true');
				nlapiSubmitField('salesorder', soId, 'custbody_poexist', 'T');
				}
			}
		}
		
		//if PO SENT = Email PO then send custom email
		if(nlapiGetFieldValue('status') != 'Closed')
		{		
			var poID = poId;
			var poNumber = poRec.getFieldValue('tranid');
			
			if(nlapiGetFieldValue('custbody45') == 1) //Email PO
			{
				dLog('poID='+poID,'poNumber='+poNumber);
				//Check if email already sent -> send email
				if(checkPOEmail(poID,'PURCHASE ORDER')){ return; } 
				else
				{
					
					var vendorID = poRec.getFieldValue('entity');
					var vendorRec = nlapiLoadRecord('vendor', vendorID);
					var vendorName = vendorRec.getFieldValue('companyname');
					var vendorEmail = vendorRec.getFieldValue('email');
					
					var subject = 'Pro Therapy Supplies: Purchase Order #'+poNumber;
					var bodySignature = "\n\nThank you,"
					+"\nPro Therapy Supplies"
					+"\n770-441-9808"
					+"\n\nNotice: This electronic message and attachment(s), if any, contains information from www.protherapysupplies.com that may be privileged and confidential. The information is intended to be for the use of the addressee only. If you are not the addressee, note that any disclosure, copying, distribution or use of the contents of this message is prohibited. If you received this message in error, please notify the sender immediately.";
					var body = "Hello " + vendorName 
					+", \n\nPlease confirm receipt of our "+poNumber+" using the following link: https://671309.extforms.netsuite.com/app/site/hosting/scriptlet.nl?script=464&deploy=1&compid=671309&h=394c99f154810de13232&poid="+poID+"&tranid="+poNumber
					+"\n\nThe new form will help us efficiently streamline the process so we can also inform customers in a timely manner."
					+"If this order is shipping via Freight, please contact us via email at d.warnke@protherapysupplies.com and f.tang@protherapysupplies.com with the cost, weight, dimension, and class for approval to ship."
					+bodySignature;
					
					var records = new Object();
					records['transaction'] = poID;
					records['entity'] = vendorID;
					var attachment = nlapiPrintRecord('TRANSACTION',poID,'PDF',null);
					//nlapiSendEmail(20789534 ,vendorEmail, subject, body, null,null, records, null, true); //pts.tracking 
					var ptstracking = "tracking@protherapysupplies.com"
					nlapiSendEmail(ptstracking ,vendorEmail, subject, body, null,null, records, attachment, true); //pts.tracking    
				}
			}
		}
		
		
		
		//updates Related Record field on Item Receipts, Bills, and PO
		var tranName = poRec.getFieldValue('tranid');
		poRec.setFieldValue('custbody_relatedrecord',tranName);
		dLog('afterSubmit_anyPO','poId='+poId+'; tranName='+tranName);
		nlapiSubmitRecord(poRec);
		
	}
	catch (e) 
	{
		var stErrMsg = '';
		if (e.getDetails != undefined) 
		{
			stErrMsg = 'Script Error: ' + e.getCode() + '<br>' + e.getDetails() + '<br>' + e.getStackTrace();
		}
		else 
		{
			stErrMsg = 'Script Error: ' + e.toString();
		}
		
		var taskError = stErrMsg.search("LINKED_ITEMS_DONT_MATCH");
		var SSSInvalidSublist = stErrMsg.search("SSS_INVALID_SUBLIST_OPERATION");
		var vendorConversion = nlapiLoadRecord('vendor', 12303517); //Vendor: Script Setup
		var assignedID = vendorConversion.getFieldValue('custentity_backorderuserid');
		var pOrder = nlapiLoadRecord('purchaseorder', nlapiGetRecordId());
		if(taskError != -1 || SSSInvalidSublist != -1)
		{
			//Check if task already sent -> send task
			if(checkTask(nlapiGetRecordId(),assignedID,11))
			{
				dLog('checkTask poID='+nlapiGetRecordId(),'Task Already Sent'); 
			}else
			{	//send task to manually ship PO
				sendTask(nlapiGetRecordId(),pOrder.getFieldValue('entity'),stErrMsg,assignedID,'script unable to fulfill PO poID='+nlapiGetRecordId()+' - please manually mark ship',assignedID,11);
				dLog('Script Error poID='+nlapiGetRecordId(), 'Task Sent');
			}
          
          			//Check if task already sent -> send task
			if(checkTask(nlapiGetRecordId(),26007751,11))
			{
				dLog('checkTask poID='+nlapiGetRecordId(),'Task Already Sent'); 
			}else
			{	//send task to manually ship PO
				sendTask(nlapiGetRecordId(),pOrder.getFieldValue('entity'),stErrMsg,26007751,'script unable to fulfill PO poID='+nlapiGetRecordId()+' - please manually mark ship',26007751,11);
				dLog('Script Error poID='+nlapiGetRecordId(), 'Task Sent');
			}
		}
		
		dLog('afterSubmit_anyPO Error poID='+nlapiGetRecordId(), stErrMsg);
	}
	
}

function sendTask(tranID,customerID,message,userID,title,assignedID,tasktype)
{
	if(userID < 1) 
	{
		dLog('sendTask userID='+userID+'; soID='+tranID,'Task Sent to Elizabeth Owen instead');
		message = message + "\n\nFormer userID="+userID;
		userID = 264861;
	}
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

function checkPOEmail(tranID,keyword)
{
	var filters = new Array();
	filters[0] = new nlobjSearchFilter('mainline', null, 'is', 'T');
	filters[1] = new nlobjSearchFilter('internalid', null, 'is', tranID);
	var columns = new Array();
	columns[0] = new nlobjSearchColumn('subject', 'messages');
	var searchresults = nlapiSearchRecord('purchaseorder', null, filters, columns);
	for ( var i = 0; searchresults != null && i < searchresults.length; i++ )
	{
		var searchresult = searchresults[i];
		var subject = searchresult.getValue('subject', 'messages');
		if(subject.toUpperCase().search(keyword) != -1)
		{
			dLog('subjectEmail',keyword+' email already sent.');
			return true;
		}
dLog('retrieveMessage',i+': '+subject);
	}
	return false;
}


function isEmpty(fldValue)
{
	if (fldValue == '') return true;
	if (fldValue == 'null') return true;
	if (fldValue == null) return true;
	if (fldValue == 'undefined') return true;
	if (fldValue == undefined) return true;
	if (fldValue.length < 1) return true;
	
	return false;
}

function dLog(logTitle, logDetails)
{
	nlapiLogExecution('DEBUG', logTitle, logDetails);
}