/*Change Logs
		May 13 2016
		-added script= Looks at Sales Receipts with empty paypal id field and nonempty paypal tran id field and copies it over
		May 19 2016
		-changed script= Changed the May 13th script to look at sales orders
		May 20 2016
		-added script= Looks at sales orders that contains Newegg storefront and hasn't shipped yet and mark it as must ship today
		Aug 15 2016 
		-added script= Looks at groupon salesorder and changes the price level to groupon
		May 23rd 2017 - Updated Groupon Script to skip orders with empty groupon price level value
		Aug 1st 2017 - Added Ebay Orders Set Must Ship Today 
		*/

function main(type)
{
	try
	{
		/*-------------- loads saved search to close each Sales Order --------------
		var closesalesorder = savedsearchitemID('customsearch840');
		//dLog('closesalesorder','closesalesorder results='+closesalesorder);
		
		if(!isEmpty(closesalesorder))
		{
			dLog('closesalesorder','closesalesorder.length: '+closesalesorder.length);
			
			for(var i=0; i<closesalesorder.length; i++)
			{
				var orderID = closesalesorder[i];
				dLog('orderID',orderID);
				
				//Loads orders and runs logic to close each item
				var soRec = nlapiLoadRecord('salesorder', orderID);
				var customer = soRec.getFieldText('entity');
				dLog('customer',customer);
				//load each item and close
				var items = soRec.getLineItemCount('item');
				dLog('closeitems',items + ' items in salesorder');
				for(var j = 1; j <= items; j++)
				{	
					var itemType = soRec.getLineItemValue('item','itemtype',j);
					//dLog('closeitems',itemType);
					if(itemType == "InvtPart")
					{
						soRec.selectLineItem('item',j);
						soRec.setCurrentLineItemValue('item','isclosed','T');
						soRec.commitLineItem('item');
						dLog('closeitems','closed: '+j);
					}
					if(itemType=='Kit')
					{
						soRec.selectLineItem('item',j);
						soRec.setCurrentLineItemValue('item','isclosed','T');
						soRec.commitLineItem('item');
						dLog('closeitems','closed: '+j);
					}
				}
				//submit changes
				var id = nlapiSubmitRecord(soRec, true);
			}
		}
		*/
		
		/*-------------- loads saved search to mark Sales Order Backorder Order = YES--------------*/
		var partialBO = savedsearchitemID('customsearch3038');
		//dLog('backorderOrder','backorderOrder results='+backorderOrder);
		
		if(!isEmpty(partialBO))
		{
			dLog('partialBO','partialBO.length: '+partialBO.length);
			
			for(var i=0; i<partialBO.length; i++)
			{
				var orderID = partialBO[i];				
				dLog('Partial Order','orderID='+orderID);
				//When Order Received in, Also Remove Partial Checkbox if no B/O exist
				//Skips line item with PO
				var soRec = nlapiLoadRecord('salesorder', orderID);
				var itemCount = soRec.getLineItemCount('item');
				var hasBO = false;
				if (itemCount == 1)
				{
					soRec.selectLineItem('item',1);
					var customerQuantityBO = soRec.getLineItemValue('item','quantitybackordered', 1) || '';
					var customerQuantity = soRec.getLineItemValue('item','quantity', 1);
					var customerPO = soRec.getLineItemValue('item','createpo',1) || '';

					//Not PO and Qty B/O > 0
					if(isEmpty(customerPO) && customerQuantityBO > 0)
					{	
					dLog('Still have quantity backordered on a line item...');
					hasBO = true;								
					}			
				}
				else 
				{
					for(var j = 1; j <= itemCount; j++)
					{
					soRec.selectLineItem('item',j);
					var customerQuantityBO = soRec.getLineItemValue('item','quantitybackordered', j) || '';
					var customerQuantity = soRec.getLineItemValue('item','quantity', j);
					var customerPO = soRec.getLineItemValue('item','createpo',j) || '';

						//Not PO and Qty B/O > 0
						if(isEmpty(customerPO) && customerQuantityBO > 0)
						{
							dLog('Still have quantity backordered on a line item...');
							hasBO = true;
						}
					}			
				}
				
				if(hasBO == false)
				{
					nlapiSubmitField('salesorder', orderID, ['custbody_partialbackorder'], ['F']);
					dLog('Updated');
				}
			}
		}
		
		/*-------------- loads saved search to mark Sales Order Backorder Order = YES--------------*/
		var backorderOrder = savedsearchitemID('customsearch1374');
		//dLog('backorderOrder','backorderOrder results='+backorderOrder);
		
		if(!isEmpty(backorderOrder))
		{
			dLog('backorderOrder','backorderOrder.length: '+backorderOrder.length);
			
			for(var i=0; i<backorderOrder.length; i++)
			{
				var orderID = backorderOrder[i];				
				dLog('backorderOrder','updated orderID='+orderID);
				nlapiSubmitField('salesorder', orderID, 'custbody_backorderorder', 'T');
			}
		}
		
		/*-------------- loads saved search to mark Sales Order as 1 Day Old Order--------------*/
		var SO1dayold = savedsearchitemID('customsearch1097');
		//dLog('SO1dayold','SO1dayold results='+SO1dayold);
		
		if(!isEmpty(SO1dayold))
		{
			dLog('SO1dayold','SO1dayold.length: '+SO1dayold.length);
			
			for(var i=0; i<SO1dayold.length; i++)
			{
				var orderID = SO1dayold[i];
				orderID = orderID.substring(orderID.search('id=')+3,orderID.search('">'));
				dLog('SO1dayold','updated orderID='+orderID);
				nlapiSubmitField('salesorder', orderID, 'custbody_1dayoldorder', 'T');
			}
		}
		
		/*-------------- loads saved search to mark Sales Order as 2 Day Old Order--------------*/
		var SO2dayold = savedsearchitemID('customsearch576');
		//dLog('SO2dayold','SO2dayold results='+SO2dayold);
		
		if(!isEmpty(SO2dayold))
		{
			dLog('SO2dayold','SO2dayold.length: '+SO2dayold.length);
			
			for(var i=0; i<SO2dayold.length; i++)
			{
				var orderID = SO2dayold[i];
				dLog('SO2dayold','i='+i);
				orderID = orderID.substring(orderID.search('id=')+3,orderID.search('">'));
				dLog('SO2dayold','updated orderID='+orderID);
				nlapiSubmitField('salesorder', orderID, 'custbody_2dayoldorder', 'T');
			}
		}
		
		/*------------------loads saved search to update Negative Feedback Follow Up field to "No Reply to Offer"----------------------*/
		var negativeFeedback = savedsearchitemID('customsearch1413');

		if(!isEmpty(negativeFeedback))
		{
			dLog('negativeFeedback','negativeFeedback.length: '+negativeFeedback.length);
			
			for(var i=0; i<negativeFeedback.length; i++)
			{
				var orderID = negativeFeedback[i];				
				dLog('negativeFeedback','updated orderID='+orderID);
				nlapiSubmitField('salesorder', orderID, 'custbody64', 4);
			}
		}
		
	/*--------------  loads dynamic search to set un-shipped Newegg orders to MUST SHIP TODAY--------------*/
	dLog('MUST SHIP TODAY','-------------- loads dynamic search to set un-shipped Newegg orders to MUST SHIP TODAY --------------');
	var filters = new Array();
	filters[0] = new nlobjSearchFilter('custbody30', null, 'is', 'F'); //Must ship today is false
	filters[1] = new nlobjSearchFilter('custbodystorefront', null, 'contains', 'Newegg'); //Storefront Newegg
	filters[2] = new nlobjSearchFilter('mainline', null, 'is', 'T'); //Mainline
	filters[3] = new nlobjSearchFilter('trandate', null, 'after', '5/1/2016'); //Date created after May1st
	filters[4] = new nlobjSearchFilter('actualshipdate', null, 'isempty'); //Actual Ship Date

	var columns = new Array();
	columns[0] = new nlobjSearchColumn('internalid');
	//columns[1] = new nlobjSearchColumn('displayname');
	var internalID = nlapiSearchRecord('salesorder', null, filters, columns);
	if (!isEmpty(internalID))
	{
		dLog('Length of search', 'Length: ' + internalID.length);
		for (var i = 0; i < internalID.length; i++)
		{
			var itemID = internalID[i].getValue('internalid');
			dLog('MUST SHIP TODAY', 'Newegg order: ' + itemID); 
			
			nlapiSubmitField('salesorder', itemID, ['custbody30'], ['T']);
		}
	}
		
	/*--------------  loads dynamic search where Sales Order PayPal Trans ID = PayPal ID --------------*/
	dLog('Set PayPal Tran ID to PayPal ID','-------------- loads dynamic search where Sales Order PayPal Trans ID = PayPal ID --------------');
	var filters = new Array();
	filters[0] = new nlobjSearchFilter('mainline', null, 'is', 'T');
	filters[1] = new nlobjSearchFilter('paypaltranid', null, 'isnotempty'); //PayPal Tran ID
	filters[2] = new nlobjSearchFilter('custbody_paypalid', null, 'isempty'); //Paypal ID
	filters[3] = new nlobjSearchFilter('custbodystorefront', null, 'isempty'); //storefront
	filters[4] = new nlobjSearchFilter('trandate', null, 'after', '4/1/2016');

	var columns = new Array();
	columns[0] = new nlobjSearchColumn('internalid');
	columns[1] = new nlobjSearchColumn('paypaltranid');
	//columns[1] = new nlobjSearchColumn('displayname');
	var internalID = nlapiSearchRecord('salesorder', null, filters, columns);
		if (!isEmpty(internalID))
		{
			dLog('Length of search', 'Length: ' + internalID.length);
			for (var i = 0; i < internalID.length; i++)
			{
				var salesOrderID = internalID[i].getValue('internalid');
				var payPalID = internalID[i].getValue('paypaltranid');
				dLog('Set PayPal Tran ID to PayPal ID', 'Internal ID: ' + salesOrderID + ' with Paypal tranid: ' +payPalID);
				nlapiSubmitField('salesorder', salesOrderID, ['custbody_paypalid'], [payPalID]);

			}
		}
		
	/*--------------  loads dynamic search where Sales Order Ebay = Must Ship Today --------------*/
	dLog('Set Ebay = Must Ship ','-------------- loads dynamic search where Sales Order Ebay = Must Ship Today --------------');
	var filters = new Array();
	filters[0] = new nlobjSearchFilter('mainline', null, 'is', 'T');
	filters[1] = new nlobjSearchFilter('status', null, 'anyOf', 'SalesOrd:B'); //Status is Pending Fulfillment 
	filters[2] = new nlobjSearchFilter('custbody30', null, 'is', 'F'); //Must Ship Today is False
	filters[3] = new nlobjSearchFilter('custbodystorefront', null, 'is', 'eBay'); //storefront
	filters[4] = new nlobjSearchFilter('shipmethod', null, 'is', 287465); //Ship Method is USPS Priority Mail 
	var columns = new Array();
	columns[0] = new nlobjSearchColumn('internalid');
	//columns[1] = new nlobjSearchColumn('status');
	//columns[1] = new nlobjSearchColumn('displayname');
	var internalID = nlapiSearchRecord('salesorder', null, filters, columns);
		if (!isEmpty(internalID))
		{
			dLog('Length of search', 'Length: ' + internalID.length);
			for (var i = 0; i < internalID.length; i++)
			{
				var salesOrderID = internalID[i].getValue('internalid');
				//var orderStatus  = internalID[i].getValue('status');
				dLog('Set Ebay = Must Ship', 'Internal ID: ' + salesOrderID);
				nlapiSubmitField('salesorder', salesOrderID, ['custbody30'], ['T']);
			}
		}
		
	/*--------------  loads saved search to track empty onorder items and auto create dropship --------------*/
	dLog('Create Dropship For Empty Onordered Items','--------------  loads saved search to track empty onorder items and auto create dropship --------------');
	var soId = savedsearchitemIDDynamic('customsearch2591', 0); //SO ID
	var customerId = savedsearchitemIDDynamic('customsearch2591', 2); //Customer ID
	var vendorName = savedsearchitemIDDynamic('customsearch2591',7); //Vendor Name
	var vendorPrice = savedsearchitemIDDynamic('customsearch2591',8); //Vendor Price
	var backorderedNum = savedsearchitemIDDynamic('customsearch2591',4); //Num of Backorders
	var itemId = savedsearchitemIDDynamic('customsearch2591',5); //Item Id
	var itemTotalWeight = savedsearchitemIDDynamic('customsearch2591',9); //B/O(s) Item Total Weight
	//Temporarily, we want Miliken Medical below 20 lbs//Currently 10.50$ dropship fee(includes both fee and shipping)//The most Dropshippable
	var preferredVendorID;
	var preferredVendorPrice;
	
	if (!isEmpty(soId))
	{
		for (var i = 0; i < 4; i++)
		{
			//8060120 is miliken medical
			dLog(itemId[i] + ' ' + vendorName[i] + ' '+ itemTotalWeight[i]);
			if (vendorName[i] == 8060120 && itemTotalWeight[i] < 20)
			{
			var vendorRec = nlapiLoadRecord('vendor', vendorName[i]);
			var vendorFee = vendorRec.getFieldValue('custentity6') || '';
			var vendorLeadTime = vendorRec.getFieldValue('custentity20') || '';
			dLog('Create Dropship - Get Vendor Info From ' + itemId[i], 'Preferred Vendor Id: ' + vendorName[i] + ' Preferred Vendor Cost: ' +  vendorPrice[i] + ' Fee: ' + vendorFee + ' Lead Time ' + vendorLeadTime);
			}
		}
	}
		
	/*------------------loads saved search to Checks to see if salesorder storefront = groupon and adjust the price level to groupon----------------------*/
    /*------------------inactivated groupon script 1/29/2020-----------------*/
	var internalId = savedsearchitemID('customsearch2227');

	if(!isEmpty(internalId))
	{
		dLog('Groupon sales order search length','length: '+internalId.length);
		for(var i=0; i<internalId.length; i++)
		{
			var grouponId = internalId[i];				
			dLog('grouponId','updated orderID='+grouponId);
			var soRec = nlapiLoadRecord('salesorder', grouponId);
			var getLineItemCount = soRec.getLineItemCount('item');
			for (var soGroupon = 1; soGroupon <= getLineItemCount; soGroupon++)
			{
				var getItem = soRec.getLineItemValue('item','item',soGroupon);
				
				var item = nlapiLoadRecord(loadItem(getItem), getItem);
					//Get Groupon Price Level Value
					//If Value is Empty, Skip Record
					var priceLevelCount = item.getLineItemCount('price1');
						
						for (var k = 1; k <= priceLevelCount; k++)
						{
						var priceLevelId = item.getLineItemValue('price1', 'pricelevel', k);

							if (priceLevelId == 17) //Groupon Price Id
							{
							var grouponPrice = item.getLineItemMatrixValue('price1', 'price', k, 1) || '';
							}
						}
				dLog('Groupon Item Price Details', 'Item Id: ' + getItem + ' Groupon Price: ' + grouponPrice);
				if (!isEmpty(grouponPrice))
				{
				soRec.setLineItemValue('item', 'price', soGroupon, 17);
				//nlapiSubmitRecord(soRec);		
				}				
			}
		}
	}
	
	/*--------------  loads dynamic search where guest shopper replaced with billing address name --------------*/
	dLog('Set Guest Shopper = Billing Name','--------------  loads dynamic search where guest shopper replaced with billing address name --------------');
	var filters = new Array();
	filters[0] = new nlobjSearchFilter('mainline', null, 'is', 'T');
	filters[1] = new nlobjSearchFilter('trandate', null, 'after', '2/10/2017');
	filters[2] = new nlobjSearchFilter('formulatext', null, 'is', 'Guest Shopper');
	filters[2].setFormula('{customermain.altname}');

	var columns = new Array();
	columns[0] = new nlobjSearchColumn('internalid');
	columns[1] = new nlobjSearchColumn('billaddressee');
	columns[2] = new nlobjSearchColumn('entity');
	//columns[1] = new nlobjSearchColumn('displayname');
	var internalID = nlapiSearchRecord('salesorder', null, filters, columns);
		if (!isEmpty(internalID))
		{
			dLog('Length of search', 'Length: ' + internalID.length);
			for (var i = 0; i < internalID.length; i++)
			{
				var salesOrderID = internalID[i].getValue('internalid');
				var billName = internalID[i].getValue('billaddressee'); //Full Name
				var customerId = internalID[i].getValue('entity');
				var fullName = billName.split(' ');
				var firstName = fullName[0];
				var lastName = fullName[fullName.length - 1];
				
				dLog('Set to Billing Name', 'Internal ID: ' + salesOrderID + 'Billing Addressee: ' + billName);
				
				if (!isEmpty(billName))
				{
				nlapiSubmitField('customer', customerId, ['firstname','lastname'], [firstName,lastName]);
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
		
		//Do not send task for SSS_USAGE_LIMIT_EXCEEDED or You must enter at least one line item Errors
		dLog('Script Error orderID='+orderID, stErrMsg);
		
		var ignoreErr = stErrMsg.search("SSS_USAGE_LIMIT_EXCEEDED");
		if(ignoreErr != -1)
		{
			dLog('ignoreErr orderID='+orderID, 'Error='+ignoreErr+': SSS_USAGE_LIMIT_EXCEEDED');
		}
    }
}

function savedsearchitemID(savedsearchID)
{
	/*---- generic method for salesorder saved search. results values of 1st column (should be internal id) ----*/
	var orderIDarray = [];
	var resultsList = nlapiSearchRecord('salesorder',savedsearchID); //saved search returns internal ids
	
	if(!isEmpty(resultsList))
	{
		//dLog('closesalesorder','resultsList.length: '+resultsList.length);
		for(i=0; i<resultsList.length; i++)
		{	
			//for each row, get value orderID
			var rows = resultsList[i];
			var columns = rows.getAllColumns();
			//dLog('closesalesorder','columns.length: '+columns.length);
			
			var column = columns[0]; //only 1 column in saved search
			var orderID = rows.getValue(column);
			orderIDarray[i] = orderID;	
		}
	}
	return orderIDarray;
}

function savedsearchitemIDDynamic(savedsearchID, columnNumber) //Gets values of chosen column in saved search
{
	/*---- generic method for item saved search. results values of a column ----*/
	var columnValueArray = [];
	var resultsList = nlapiSearchRecord('salesorder',savedsearchID); //saved search returns internal ids
	
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

function loadItem(id)
{
	var recType = nlapiLookupField('item', id, 'recordtype');
	return recType;
	//returns the actual item record field name
	//lotnumberedinventoryitem
	//inventoryitem
	//kititem
	//serializedinventoryitem
	
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