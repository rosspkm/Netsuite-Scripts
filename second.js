/*Change LOG
	10/10/16 - Added detection for certain UPS shipping methods and express = T for PTS orders. Auto-approve will be skipped.
	3/2/17 - Added If Billto!=shipto and payment method != paypal auto approve
	3/3/17 - Added if created from is estimate, then auto approve SO 
	5/19/17 - Added paymenteventresult != 'HOLD'
	7/27/17 - Added to arrAutoApprovedPayTypes
			Changed UI auto approval from <$350 to <$1000 
	7/28/17 - Added check invalid SHIP TO
	8/1/17 - Removed check for Paypal as their is one implemented on 7/28/17 
	3/15/18 - Added If 2 or 3 Xs, then do not auto approve
			Added var execContext
	3/19/18 - Added nlapiSubmitField("salesorder", soId, ["custbody17"], ["Manually Approve Biofreeze Promotion"]);
	3/27/18 - Changed to nlapiSubmitField("salesorder", soId, ["custbody17","custbody_skip_auto_approve"], ["Manually Approve Biofreeze Promotion","T"]);
	4/4/18 - Moved Call-In Order approval to after PAYMENT HOLD check 
	4/25/18 - Moved PayPal approval to before CC approval
		changed checkEmail from ORDER CLOSED DUE TO INCORRECT CREDIT CARD INFORMATION to INCORRECT CREDIT CARD INFORMATION
	5/10/18 - nlapiSubmitField("salesorder", soId, ["custbody32"], ["paymenteventresult="+paymenteventresult]);
	6/20/18 - if(paymenteventresult == 'HOLD')
	1/3/19 - Do not approve Game Ready Control Unit id=184110
	2/1/19 - Added new biofreeze promotion items
	3/1/19 - Added FREE 2ND DAY SHIPPING custitem405 condition
	3/13/19 - FREE 2ND DAY SHIPPING shippingcost = 0.00
	3/14/19 - FREE 2ND DAY SHIPPING message field
	4/26/19 - REMOVED Approve CC orders under $50 if CSC=Y
			CHANGED Approve Canada orders under $50 with 3 Ys
			REMOVED Approve all PTS Orders under $1000 and billTo=shipTo and paymentevent!=HOLD
	4/30/19 - change $1000 to Approve CC orders under $150 if 3 Ys and billTo=shipTo
	6/4/19 - Do not approve if SHIP TO line2 not empty
	7/9/19 - skip if item SKIP AUTO APPROVAL = T
	9/25/19 - Do not approve if customer is SPECIAL SHIPPING = T 
	2/15/21 - Added auto approve for all Elastogels and Etsy orders
	2/19/21 - Added auto approval for all Newegg Orders
*/
function afterSubmit_processSOApproval(type)
{
	try 
	{
		if (type == 'delete' || type == 'approve') return;
		
		var soId = nlapiGetRecordId();
		var currSORec = nlapiLoadRecord('salesorder', nlapiGetRecordId());
		
		var execContext = nlapiGetContext().getExecutionContext();
		nlapiLogExecution("debug", "type: " + type + "; soId: " + soId, "-----------START "+execContext+"-----------");
		
		var customer = currSORec.getFieldText("entity");
		var customerID = currSORec.getFieldValue('entity');
		var custRec = nlapiLoadRecord('customer', customerID);
		
		var currForm = currSORec.getFieldValue('customform');
		if(currForm != 102)
		{
			//nlapiLogExecution("debug",  "type: " + type + "; soId: " + soId + "; currForm: " + currForm + ";"
			//					, "IGNORE:form is not Sales Order Receipt");
			return;
		}
		
		var currStatus = currSORec.getFieldValue('orderstatus');
		if (currStatus != null && currStatus != "A")
		{
			//nlapiLogExecution("debug", "type: " + type + "; soId: " + soId + "; currStatus: " + currStatus + ";"
			//					, "IGNORE:status is not pending approval.");
			return;
		}
		
		var skipAutoApprove1 = currSORec.getFieldValue("custbody_skip_auto_approve");
		if (skipAutoApprove1 == "T")
		{
			nlapiLogExecution("debug", "type: " + type + "; soId: " + soId + "; currStatus: " + currStatus + ";"
								, "IGNORE:skip queue record creation (custbody_skip_auto_approve = T).");
			return;
		}
		
		//Get Values
		var orderTotal = currSORec.getFieldValue('total');
		var paymentMethod = currSORec.getFieldText('paymentmethod');
		var shipmethod = currSORec.getFieldValue("shipmethod");
		var shippingcost = currSORec.getFieldValue("shippingcost");
		var storefront = currSORec.getFieldValue("custbodystorefront") || '';
		var soStatus = 'A';
		var queueSO = false;
		var free2Day = false;
		
		var arrBiofreeze = [18265,33829,33828,18263,18261,14426,33831,33830,14424,14422,271912,271911,271909,271910,271908,271858,
		284728,284727,284726,284729,284730,,33828,18263,33829,18265,18261,284732,284733,284736,284735,284734];	
		
		//go through each line items
		var count = nlapiGetLineItemCount("item");
		for(i = 1; i <= count; i++)
		{
			var itemName = nlapiGetNewRecord().getLineItemText("item","item",i); //Item Name
			var itemID = nlapiGetNewRecord().getLineItemValue("item","item",i); //Item ID
			var itemType = nlapiGetNewRecord().getLineItemValue("item","itemtype",i);
			var rate = currSORec.getLineItemValue("item", "rate", i);
			nlapiLogExecution("debug", "rate = " + rate);
			//calcWorth(itemType, itemID, rate);

			//nlapiLogExecution("debug",customer,"itemID: "+itemID);
			
			//Ignore if Order has Biofreeze Promotion item
			for(d in arrBiofreeze)
			{
				if(itemID == arrBiofreeze[d])
				{
					nlapiLogExecution("debug","soId: "+nlapiGetNewRecord()+"; customer "+customer,"IGNORE: Contains Biofreeze Promotion item: "+itemID);
					nlapiSubmitField("salesorder", soId, ["custbody17","custbody_skip_auto_approve"], ["Manually Approve Biofreeze Promotion","T"]);
					return;
				}
			}
			//Ignore if Order has Open Box kit item and not ebay
			if(storefront != "eBay" || (storefront != "eBay-flamedical"))
			{
				if(itemType=="Kit")
				{	
					var kit = nlapiLoadRecord("kititem",itemID);
					var kitItemID = kit.getLineItemValue("member","item",1);
					var kitLineItem = nlapiLoadRecord("inventoryitem",kitItemID);
					var kitbox = kitLineItem.getFieldValue("custitem_openbox");
					if(kitbox == "T")
					{
						nlapiLogExecution("debug",customer,"IGNORE: Contains Open Box item"+"; soId "+soId);
						nlapiSubmitField("salesorder", soId, ["custbody17"], ["Contains Open Box item"]);
						return;
					}
				}	
				/*if(itemType=="InvtPart")
				{	
					//nlapiLogExecution("debug","Line Item: ",itemName);
					var lineItem = nlapiLoadRecord("inventoryitem",itemID);
					var box = lineItem.getFieldValue("custitem_openbox");
					//nlapiLogExecution("debug","soId: " + soId,"Open Box Item "+box);
					if(box == "T")
					{
						//nlapiLogExecution("debug",customer,"IGNORE: Contains Open Box item"+"; soId "+soId);
						//nlapiSubmitField("salesorder", soId, ["custbody17"], ["Contains Open Box item"]);
						//return;
					}
				} */
			}
			//do not approve Game Ready Control Unit id=184110
			if(itemID == 184110)
			{
				nlapiLogExecution("debug","soId: "+nlapiGetNewRecord()+"; customer "+customer,"IGNORE: Game Ready Unit Requires Prescription itemID="+itemID);
				nlapiSubmitField("salesorder", soId, ["custbody17","custbody_skip_auto_approve"], ["Game Ready Unit Requires Prescription","T"]);
				return;
			}
			//Check if PTS order has FREE 2ND DAY SHIPPING custitem405
			if(isEmpty(storefront))
			{
				if(itemType=="InvtPart")
				{					
					var lineItem = nlapiLoadRecord("inventoryitem",itemID);
					//dLog('Free 2Day Check','itemID='+itemID+' | free2Day='+lineItem.getFieldValue('custitem405'));
					if(lineItem.getFieldValue('custitem405') == 'T')
					{
						dLog('Free 2Day Check','Change Shipping to Free 2 Day soId='+soId);
						free2Day = true;
					}
				}
			}
			//skip if item SKIP AUTO APPROVAL = T
			var skipItem = nlapiLookupField(loadItem(itemID), itemID, 'custitem_skipautoapproval') || 'F';
			if(skipItem == 'T')
			{
				nlapiLogExecution("debug","soId: "+nlapiGetNewRecord()+"; customer "+customer,"IGNORE: item SKIP AUTO APPROVAL = T itemID="+itemID);
				nlapiSubmitField("salesorder", soId, ["custbody17","custbody_skip_auto_approve","custbody_scriptnotes"], ["item SKIP AUTO APPROVAL = T","T","skip if item SKIP AUTO APPROVAL = T"]);
				return;
			}

		}
//if(customerID == 154983)
//{
		//Change Ship Via to 101486 FedEx 2Day® if PTS order has FREE 2ND DAY SHIPPING custitem405
		if(free2Day)
		{
			currSORec.setFieldValue("shipmethod", 101486); //FedEx 2Day®
			currSORec.setFieldValue("shippingcost", 0.00);
			currSORec.setFieldValue("custbody20", "Free FedEx 2Day Shipping Promotion"); //Special Message
			currSORec.setFieldValue("custbody_scriptnotes", "Free FedEx 2Day Shipping Promotion");
			orderChanged = true;
		}
		//Ignore if PTS order has FREE 2ND DAY SHIPPING custitem405 with multiple item
		if(free2Day && count > 1)
		{
			//Contains FREE 2ND DAY SHIPPING with multiple items -> Need Manual Approval
			nlapiLogExecution("debug","soId: "+nlapiGetNewRecord()+"; customer "+customer,"IGNORE: FREE 2ND DAY SHIPPING with multiple item itemID="+itemID);
			nlapiSubmitField("salesorder", soId, ["custbody17","custbody_skip_auto_approve","custbody_scriptnotes"], ["Entire Order Not Approved for Free 2Day","T","FREE 2ND DAY SHIPPING with multiple item"]);
			return;
		}
//}
		//Ignore if Order has no payment and not Sales Order Invoice Replacement
		var salesOrderIssue = currSORec.getFieldValue('custbody17') || ''; //Quick Notes

		if (isEmpty(paymentMethod) && (salesOrderIssue.indexOf('Replacement Order') < 0) && (salesOrderIssue.indexOf('Lost Replacement Package') < 0))
		{
			var orderNumber = currSORec.getFieldValue('tranid');
			var customerID = currSORec.getFieldValue('entity');
			currSORec.setFieldValue("custbody_skip_auto_approve", "T");
			currSORec.setFieldValue("memo", "No Payment");	
			orderChanged = true;
		}
		
		//If non-PTS customer paid extra for UPS Ground
		if(!addressBlock){
			if(!isEmpty(storefront)){
				if(shipmethod == 272 && shippingcost > 0 /*&& (storefront == "eBay" || storefront == "eBay-flamedical")*/)
				{
					currSORec.setFieldValue("memo", "MUST SHIP UPS GROUND");
					nlapiLogExecution("debug","type: " + type + "; soId: " + soId, "ebay order, shipmethod == 272 && shippingcost > 0");
					orderChanged = true;
				}
			}
		}
		
		//Ignore if invalid SHIP TO (if both shipaddr1 and shipaddr2 do not have a number)
		var shipaddr1 = currSORec.getFieldValue('shipaddr1') || '';
		var shipaddr2 = currSORec.getFieldValue('shipaddr2') || '';
		//dLog('check for invalid SHIP TO','shipaddr1='+shipaddr1+' | shipaddr2='+shipaddr2);
		var shipToCheck = containsNumber(shipaddr1) || containsNumber(shipaddr2);
		//dLog('check for invalid SHIP TO','shipToCheck shipaddr1 and shipaddr2 OK? '+shipToCheck);
		
		//if shipaddr1 and shipaddr2 both FALSE then no number = invalid address
		if(!shipToCheck) 
		{
			nlapiSubmitField("salesorder", soId, ["custbody17","custbody_skip_auto_approve"], ["Invalid SHIP TO","T"]);
			queueSO = false;
			return;
		}
		
		//Do not approve if SHIP TO line2 not empty
		if(!isEmpty(shipaddr2)) 
		{
			nlapiSubmitField("salesorder", soId, ["custbody17","custbody_skip_auto_approve"], ["SHIP TO line2 not empty","T"]);
			queueSO = false;
			return;
		}
		
		//Do not approve if customer is SPECIAL SHIPPING = T 
		var specialShipping = custRec.getFieldValue('custentity_specialshipping');
		if(specialShipping == 'T')
		{
			nlapiSubmitField("salesorder", soId, ["custbody17","custbody_skip_auto_approve"], ["Customer Special Shipping","T"]);
			queueSO = false;
			return;
		}
		
		//Checks SO, SO Items, and Customer to verify Free 2nd Day Air is not used by a Professional Level Customer
		var shipping = nlapiGetFieldValue('shipmethod'); //Ship Via
		var priceLevel = custRec.getFieldValue('pricelevel');//price level of customer
		var freeSecondDay = false;//itemLoad();
		var sendDMEPacket = false, hasDMEPacket = false;
		var shipState = currSORec.getFieldValue('shipstate') || '';
		
		var itemCount = nlapiGetLineItemCount('item');
		for(var i = 1; i <= itemCount; i++)
		{
			var itemType = nlapiGetLineItemValue('item','itemtype',i);
			if (itemType == 'InvtPart') {
				var itemID = nlapiGetLineItemValue('item','item',i); //Item Name
				var item = nlapiLoadRecord('inventoryitem',itemID);
				var itemShipping = item.getFieldValue('custitem405');
				var itemDME = item.getFieldValue('custitem_dmeitem');
				
				if(itemShipping == 'T') {
					freeSecondDay = true;
				}
				if(itemDME == 'T') {
					sendDMEPacket = true;
				}
				if(itemID == 249282)
				{
					hasDMEPacket = true;
				}
			}
		}
		
		//Ignore if Professional using Free 2nd Day Express 
		if(shipping == '101486' && freeSecondDay == true && priceLevel == 7) {
			nlapiSubmitField('salesorder', soId, 'memo', 'Professional using Free 2nd Day Express.');//set memo field
			return; //Do Not Approve
		}
		
		//Email DME Packet as PDF attachment to customer
		//dLog('DME check','PTS order='+isEmpty(storefront)+' | shipState='+shipState+' | sendDMEPacket='+sendDMEPacket+' | hasDMEPacket='+hasDMEPacket);
		if(isEmpty(storefront) && shipState == 'GA' && sendDMEPacket && !hasDMEPacket)
		{
			dLog('DME Packet','-----------START-----------');
			//add PPACKET DME Patient Packet noninventory item
			if(sendDMEPacket)
			{
				currSORec.selectNewLineItem('item');
				currSORec.setCurrentLineItemValue('item','item', 249282);
				currSORec.setCurrentLineItemValue('item', 'quantity', 0);
				currSORec.commitLineItem('item');
				
				var custbody_scriptnotes = currSORec.getFieldValue('custbody_scriptnotes');
				if(!isEmpty(custbody_scriptnotes)) { currSORec.setFieldValue('custbody_scriptnotes',custbody_scriptnotes+"; DME Packet Added for GA Order");}
				else { currSORec.setFieldValue('custbody_scriptnotes',"DME Packet Added for GA Order"); }
				soChanged = true;
				dLog('DME Packet','added');
			}			
			
			//email PTS Patient Packet - Retain for Record and PTS Patient Packet - Deliverable Check List
			var customerEmail = currSORec.getFieldValue("email");
			if(!isEmpty(customerEmail))
			{
				if(checkEmail(soId,'PACKET')){ return; } //Check if email already sent -> send email
				else
				{
					var records = new Object();
					records['transaction'] = soId;
					records['entity'] = customerID;
					var newAttachment1 = nlapiLoadFile(4866957); //PTS Patient Packet - Retain for Record.pdf
					var newAttachment2 = nlapiLoadFile(4866958); //PTS Patient Packet - Deliverable Check List.pdf
					var attachment = [newAttachment1,newAttachment2];
					
					var sbj = 'Pro Therapy Supplies Sales Order #'+currSORec.getFieldValue('tranid')+' DME Patient Packet';
					var msg = "Thank you for choosing Pro Therapy Supplies to be your durable medical equipment (DME) provider.  We trust you are satisfied with your product."
						+"\n\nEnclosed in this packet you will find the following documents: (*must sign and return)"
						+"Deliverable Check list\nPatient Feedback Survey\nCompany Info & Hours of Operation\nRights and Responsibilities\nComplaint Procedure\nEmergency Preparedness\nPrivacy (HIPAA) Notification\nWarranty Information\nEducational and Instructional Materials (supplied by manufacturer with item when available)"
						+"\n\nFor Medicare Customers\nCurrent Supplier Standards\nAssignment of Benefits"
						+"\n\nAll Patients must return SIGNED 'DELIVERABLE CHECK LIST'"
						+"\n\nIt is very important for our records that this proof of delivery is executed.  The form(s) may be faxed back to 1-866-755-2705 or emailed to dme@protherapysupplies.com"
						+"\n\nWe strive to provide the best quality products and excellent customer service, so please do not hesitate to call with any questions regarding your purchase."
						+"\n\nThanks for your cooperation!\nPro Therapy Supplies DME Service"
						+"\n\nwww.ProTherapySupplies.com\np. 800-883-0368 / 770-441-9808\nf. 866-755-2705 / 678-680-5818";
					dLog('DME Packet','sbj='+sbj);
					nlapiSendEmail(25164763, customerEmail, sbj, msg, null, null, records, attachment, true, false, 'dme@protherapysupplies.com');
					dLog('DME Packet','emailed');
				}
			}
			dLog('DME Packet','-----------DONE-----------');
		}
		
		var shipToAddress = currSORec.getFieldValue("shipaddress");
		var arrAddress = shipToAddress.split(" ");
		var addressBlock = false;
		var addressUSA = false;
		var addressCANADA = false;
		var orderChanged = false; 
		var arrUSA = ['PR', 'AK', 'AL', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'];
		
		//Flag if AK/HI/PR
		for (a in arrAddress)
		{
			if ((arrAddress[a] == "AK") || (arrAddress[a] == "HI") || (arrAddress[a] == "PR"))
			{
				currSORec.setFieldValue("custbody17", "Shipping to AK/HI/PR");
				nlapiLogExecution("debug", "type: " + type + "; soId: " + soId + "; address: " + shipToAddress + ";"
									, "NOTICE: Shipping to AK/HI/PR");
				addressBlock = true;
				orderChanged = true; 
				break;
			}
		}
		
		//Check if USA Order
		for (b in arrAddress)
		{
			for (c in arrUSA){
				if (arrAddress[b] == arrUSA[c])
				{	
					addressUSA = true;
					break;
				}
			}
		}
		
		//Check if Canada Order
		for (c in arrAddress)
		{
			if (arrAddress[c] == "Canada")
			{
				addressCANADA = true;
				break;
			}
		}		
		
		//Flag if International Order
		if(!addressUSA){
			currSORec.setFieldValue("custbody17", "Intl Order");
			orderChanged = true; 
			nlapiLogExecution("debug", "NOTICE: Intl Order", "type: " + type + "; soId: " + soId + "; address: " + shipToAddress);
		}	
		
		//Approve all ebay and ebay2 orders
		if(storefront == "eBay" || storefront == "eBay-flamedical"){
			currSORec.setFieldValue("orderstatus", "B");
			nlapiSubmitRecord(currSORec, true, true);
			nlapiSubmitField("salesorder", soId, ["custbody_approval_status"], [""]);
			queueSO = false;
			return;
		}

		//Approve all Etsy orders
		if(storefront == "Etsy"){
			currSORec.setFieldValue("orderstatus", "B");
			nlapiSubmitRecord(currSORec, true, true);
			nlapiSubmitField("salesorder", soId, ["custbody_approval_status"], [""]);
			queueSO = false;
			return;
		}

		//Approve all Elastogels orders
		if(storefront == "Elastogels"){
			currSORec.setFieldValue("orderstatus", "B");
			nlapiSubmitRecord(currSORec, true, true);
			nlapiSubmitField("salesorder", soId, ["custbody_approval_status"], [""]);
			queueSO = false;
			return;
		}

        //Approve all Bonanza orders
		if(storefront == "Bonanza"){
			currSORec.setFieldValue("orderstatus", "B");
			nlapiSubmitRecord(currSORec, true, true);
			nlapiSubmitField("salesorder", soId, ["custbody_approval_status"], [""]);
			queueSO = false;
			return;
		}
		
		//Approve all NewEgg orders
		if(storefront == "Newegg"){
			currSORec.setFieldValue("orderstatus", "B");
			nlapiSubmitRecord(currSORec, true, true);
			nlapiSubmitField("salesorder", soId, ["custbody_approval_status"], [""]);
			queueSO = false;
			return;
		}

		//Approve all Saunders orders
		if(storefront == "Saunders"){
			currSORec.setFieldValue("orderstatus", "B");
			nlapiSubmitRecord(currSORec, true, true);
			nlapiSubmitField("salesorder", soId, ["custbody_approval_status"], [""]);
			queueSO = false;
			return;
		}
				
		//Do Not Approve International Order, Allow Canada Order below 100
		if ((!addressUSA && !addressCANADA) || (addressCANADA && (parseFloat(orderTotal) >= 100))) {
			//Mark order as skip so quick notes is not re-written after initial Intl Order alert
			currSORec.setFieldValue("custbody_skip_auto_approve", "T");
			nlapiLogExecution("debug", "type: " + type + "; soId: " + soId
											, "NOTICE: Do Not Approve International Order or Canada Order above 100"  + "; address: " + shipToAddress);
		}
		
		//Calculate total weight of Order
		if(addressBlock){
			var itemsCount = currSORec.getLineItemCount("item"); //number of line items
			var totalWeight = 0;
			var under16oz = false;
			for (var i = 1; i <= itemsCount; i++)
			{
				//var itemName = currSORec.getLineItemText("item","item",i); //Item Name
				var itemID = currSORec.getLineItemValue("item","item",i); //Item ID
				var itemType = currSORec.getLineItemValue("item","itemtype",i);

				if(itemType=="Kit")
				{
					var weight = parseFloat(lineitem("kititem",itemID));
					if(weight == 0){weight = 1;} //set weight to over 1 lb so auto script does not skip
					//nlapiLogExecution("debug",customer,i+": "+typeof weight+" "+weight);
					totalWeight = totalWeight+weight;
				}
				if(itemType=="InvtPart")
				{
					var qty = currSORec.getLineItemValue("item","quantity",i);
					var weight = parseFloat(lineitem("inventoryitem",itemID)) * qty;
					if(weight == 0){weight = 1;} //set weight to over 1 lb so auto script does not skip
					//nlapiLogExecution("debug",customer,i+": "+typeof weight+" "+weight);
					totalWeight = totalWeight+weight;
				}
				
			} //nlapiLogExecution("debug",itemsCount,"total: "+totalWeight.toFixed(2));
			if(totalWeight < 1)
			{
				//nlapiLogExecution("debug",customer,"total weight under 1 lb: "+totalWeight);
				under16oz = true;
			}
		}
		
		//Approve if HI/AK/PR under 16oz 
		var underHIAK = addressBlock && under16oz;
		if(underHIAK){
			currSORec.setFieldValue("orderstatus", "B");
			nlapiSubmitRecord(currSORec, true, true);
	
			nlapiSubmitField("salesorder", soId, ["custbody_approval_status"], ["HI/AK/PR under 16oz"]);
			queueSO = false;
			return;
		}
		//nlapiLogExecution("debug", "underHIAK", underHIAK);
		
		var discount = currSORec.getFieldValue("discounttotal");
		var surcharge = false;
		if(discount > 0)
		{
			nlapiLogExecution('debug','fieldChanged','discount more than 0 - do not send task');
			surcharge = true;
		}
		
		//Ignore if HI/AK/PR over 16oz or Intl with $0 shipping 
		var overHIAK = addressBlock && (!under16oz);
		//nlapiLogExecution("debug", "overHIAK", overHIAK);
		var chargesINTL = !addressUSA && currSORec.getFieldValue("altshippingcost") == 0;
		//nlapiLogExecution("debug", "chargesINTL", chargesINTL);
		//if(((addressBlock && (!under16oz)) || (!addressUSA && currSORec.getFieldValue("altshippingcost") == 0))) {
		if(overHIAK || chargesINTL){
			/*
			//close order to get shipping quote for HI/AK and international addresses
			var items = currSORec.getLineItemCount('item');
			for(var i = 1; i <= items; i++)
			{	
				var itemType = currSORec.getLineItemValue('item','itemtype',i);
				if(itemType == "InvtPart")
				{
					currSORec.selectLineItem('item',i);
					currSORec.setCurrentLineItemValue('item','isclosed','T');
					currSORec.commitLineItem('item');
				}
			}				
			nlapiLogExecution("debug", soId, "CLOSED for additional shipping charges");
			*/orderChanged = true;
			if(!surcharge)
			{ 	/*
				//send task to 9 (Adams, Timonthy M)
				newTask = nlapiCreateRecord('task');
				newTask.setFieldValue('owner', 9);
				newTask.setFieldValue('title', 'Please contact customer in regards to shipping quote');
				newTask.setFieldValue('assigned', 9);
				newTask.setFieldValue('company', customerID);
				newTask.setFieldValue('transaction', soId);
				nlapiSubmitRecord(newTask, true);*/
			}
			currSORec.setFieldValue(["custbody_skip_auto_approve","custbody_approval_status"], ["T","May Need Extra Shipping Charges"]);
			
			nlapiLogExecution("debug", soId, "IGNORE: Order is Pending Approval for extra shipping charges");
		}
		
		//Block Professional Orders using Promo Codes
		var pricelevel = custRec.getFieldValue('pricelevel');
		if(pricelevel == 7){ //7 = Professional Price Level
			//nlapiLogExecution("debug", customer, 'pricelevel: ' + pricelevel);
			if(!isEmpty(currSORec.getFieldValue('couponcode')) && !isEmpty(currSORec.getFieldValue('promocode'))){
				nlapiLogExecution("debug", "soId: " + soId +"; "+ customer, 'IGNORE: Professional order using promotions');
				currSORec.setFieldValue("custbody_approval_status", "IGNORE: Professional order using promotions");
				currSORec.setFieldValue("custbody17", "Professional order using promotions");
				currSORec.setFieldValue("custbody_skip_auto_approve", "T");
				orderChanged = true;
			}
		}
		
		//Quick Notes for ARX orders 
		var orderTotalArx = parseInt(currSORec.getFieldValue('total'));
		//dLog('orderTotal= ', 'Order Total= ' + orderTotal);
		var storeFront = currSORec.getFieldValue('custbodystorefront');
		//dLog('storefront: ', 'storeFront= '+storeFront);
		if(storeFront == 'Arx' || storeFront == 'ARX') 
		{
			if(orderTotalArx > 100)
			{ 
				//dLog('Arx Order: ', 'Arx Order: ' + soId + ' Arx Order with total of '+ orderTotalArx +'exceeds $100. Could not auto approve at this time.');
				currSoRec.setFieldValue('custbody72', 'SO Auto Approval: Total exceeds $100. Could not run auto approval on this SO.');
				orderChanged = true;
			} else if(orderTotalArx <= 100) 
			{
				//dLog('Arx Order: ', 'Arx Order: ' + soId + ' Arx Order with total of ' + orderTotalArx + '. Auto approved.');
				currSoRec.setFieldValue('custbody72', 'SO Auto Approval: Total is less than $100. Auto approval ran on this SO.');
				orderChanged = true;
			}
		}
		
		//Ignore PTS orders with Express or UPS Shipping
		var expressOrders = currSORec.getFieldValue('custbody_expressorder');
		var shipVia = currSORec.getFieldValue('custbody_expressorder');
		var shipMethods = [101486, 273, 101488,278,24362,101487,275,183396,254200,254199];
		//Ship Methods: 101486 - UPS 2nd Day Air, 273 - UPS 2nd Day Air®, 101488 - UPS 3 Day Select, 278 - UPS 3 Day Select®
		//24362 - UPS Ground Shipping,  183396 - UPS® Ground, 101487 - UPS Next Day Air, 275
		if(isEmpty(storefront))
		{
			if(expressOrders == 'T' || (shipMethods.indexOf(shipVia) > 0))
			{
				nlapiSubmitField("salesorder", soId, ["custbody_skip_auto_approve",'custbody50'], ["T",'Express or UPS shipping']);
				return;
			}
		}
		
		/*var googlefinancialstate = currSORec.getFieldText('gcofinancialstate');
		if(!isEmpty(googlefinancialstate))
		{
			if(googlefinancialstate == 'PAYMENT_DECLINED')
			{
				currSORec.setFieldValue('custbody17', 'Google Payment Declined');
				orderChanged = true; 
				
				//send task to self for testing purposes
				newTask = nlapiCreateRecord('task');
				newTask.setFieldValue('owner', 264861);
				newTask.setFieldValue('title', 'Check Google Payment Declined Script');
				newTask.setFieldValue('assigned', 264861);
				newTask.setFieldValue('company', customerID);
				newTask.setFieldValue('transaction', soId);
				nlapiSubmitRecord(newTask, true);
			}
		}*/
		
		if(orderChanged){
			var id = nlapiSubmitRecord(currSORec, true);
			return;
		}
		
		//Do not auto-approve if SO is already tagged as skip
		var skipAutoApprove = currSORec.getFieldValue("custbody_skip_auto_approve");
		if (skipAutoApprove == "T")
		{
			nlapiLogExecution("debug", "type: " + type + "; soId: " + soId + "; currStatus: " + currStatus + ";"
								, "IGNORE:skip queue record creation (custbody_skip_auto_approve = T).");
			return;
		}
		
		//Do not auto-approve if SO was Pending Fulfillment and rolled back to Pending Approval
		if (type == "edit")
		{
			var oldSOREC = nlapiGetOldRecord();
			var oldStatus = oldSOREC.getFieldValue("orderstatus");

			if (oldStatus == "B" && currStatus == "A")
			{
				nlapiLogExecution("debug", "type: " + type + "; soId: " + soId + "; oldStatus: " + oldStatus + "; currStatus: " + currStatus + ";"
									, "IGNORE:SO was already approved (Pending Fulfillment) and rolled back to Pending Approval. Tagging SO custbody_skip_auto_approve = T and delete SO in queue.");
				//remove SO approval status
				nlapiSubmitField("salesorder", soId, ["custbody_skip_auto_approve", "custbody_approval_status"], ["T", ""]);
				deleteQueue(soId);
				return;
			}
		}
		
		var arrCreditCards = ['Master Card', 'Visa', 'Discover', 'American Express'];
		var arrAutoApprovedPayTypes = ['PayPal', 'Medibod Paypal', 'Buy.com Payment', 'Sears Payment', 'Newegg Payment', 'Jet Payment', 'Walmart Payment', 'SHOP.COM Payment', 'Shopify Payment - ProHealth', 'Wish.com Payment', /*'GoogleCheckout', 'Authorize.net V/M', 'Authorize.net Discover'*/];
		 
		var isCCType = false;
		var isOtherType = false;
	
		var cleanPaymentMethod = paymentMethod.toLowerCase();
		cleanPaymentMethod = cleanPaymentMethod.replace(/ /gi,"");
		
		//Check payment type is valid Credit Card
		for (x in arrCreditCards) 
		{
			//clean string
			var cleanCreditCards = arrCreditCards[x].toLowerCase();
			cleanCreditCards = cleanCreditCards.replace(/ /gi,"");
			
			if (cleanCreditCards.indexOf(cleanPaymentMethod) > -1)
			{
				isCCType = true;
				break;
			}
		}
		
		//Check payment type is valid non-Credit Card
		for (x in arrAutoApprovedPayTypes) 
		{
			//clean string
			var cleanPayTypes = arrAutoApprovedPayTypes[x].toLowerCase();
			cleanPayTypes = cleanPayTypes.replace(/ /gi,"");
			
			if (cleanPayTypes.indexOf(cleanPaymentMethod) > -1)
			{
				isOtherType = true;
				break;
			}
		}
		
		var logMsg = "customerID = " + customerID + "; " +
					"paymentMethod = " + paymentMethod + "; " +
					"isCCType = " + isCCType + "; " +
					"orderTotal = " + orderTotal + "; " +
					"isOtherType = " + isOtherType;
		
		var isCSCMatch = "";
		var billTo = currSORec.getFieldValue("billaddress");
		billTo = billTo.replace( /\s\s+/g, ' ' );
		var shipTo = currSORec.getFieldValue("shipaddress");
		shipTo = shipTo.replace( /\s\s+/g, ' ' );
		var isAVSSTMatch = "";
		var isAVSZipMatch = "";
		
		//Auto approve all SO taken by phone with sales rep (if address match and under $150)
		/*var soCallIn = currSORec.getFieldText('salesrep');
		
		if (!isEmpty(soCallIn)) {
			if ((parseFloat(orderTotal) < 150) && (billTo == shipTo))
			{
				currSORec.setFieldValue("orderstatus", "B");
				nlapiSubmitRecord(currSORec, true, true);
		
				nlapiSubmitField("salesorder", soId, ["custbody_approval_status"], ["Call-In Order"]);
				queueSO = false;
				return;	
			}
		}*/
		
		//Approve Canada orders under $50 with 3 Ys
		if(addressCANADA && parseFloat(orderTotal) < 50)
		{
			 if(isCCType)
			 {
				isCSCMatch = currSORec.getFieldValue('ccsecuritycodematch');
				isAVSSTMatch = currSORec.getFieldValue('ccavsstreetmatch');
				isAVSZipMatch = currSORec.getFieldValue('ccavszipmatch');
				if (isAVSSTMatch == 'Y' && isAVSZipMatch == 'Y' && isCSCMatch == 'Y') queueSO = true;
				nlapiLogExecution("debug", "type: " + type + "; soId: " + soId + "; orderTotal: " + orderTotal + ";"
								, "CANADA order approved");
			}
		}
		
		//Approve all PayPal Orders (moved from line 623)
		if(paymentMethod == "PayPal")
		{
			currSORec.setFieldValue("orderstatus", "B");
			nlapiSubmitRecord(currSORec, true, true);
			nlapiSubmitField("salesorder", soId, ["custbody_approval_status"], ["PayPal = Auto Approve"]);
			queueSO = false;
			return;
		}
		
		//Basic CC criteria to approve
		if(isCCType) 
		{
			isCSCMatch = currSORec.getFieldValue('ccsecuritycodematch')
			isAVSSTMatch = currSORec.getFieldValue('ccavsstreetmatch');
			isAVSZipMatch = currSORec.getFieldValue('ccavszipmatch');
			
			//if (parseFloat(orderTotal) < 50) //Approve CC orders under $50 if CSC=Y
			//{
			//	if (isCSCMatch == 'Y' /*&& (billTo == shipTo)*/) queueSO = true;
			//}
			if (parseFloat(orderTotal) < 150) //Approve CC orders under $150 if 3 Ys and billTo=shipTo
			{
				if (isAVSSTMatch == 'Y' && isAVSZipMatch == 'Y' && isCSCMatch == 'Y' && (billTo == shipTo)) queueSO = true;
			}
		}
		else if(isOtherType) //Approve any nonCC payment type orders
		{
			queueSO = true;
		}
		else
		{
			if(paymentMethod.match(/amazon/gi) != null) queueSO = true;
		}
		
		logMsg += " queueSO="+queueSO+
					" isCSCMatch = " + isCSCMatch + "; " +
					"billTo = " + billTo + "; " +
					"shipTo = " + shipTo + "; " +
					"isAVSSTMatch = " + isAVSSTMatch + "; " +
					"isAVSZipMatch = " + isAVSZipMatch;
					
		nlapiLogExecution("debug", "type: " + type + "; soId: " + soId + ";", logMsg);
		
		
		//Ignore if CC is 3 Ns and sends customer email Incorrect Credit Card Information
		if (isAVSSTMatch == 'N' && isAVSZipMatch == 'N' && isCSCMatch =='N')
		{
			dLog('NON MATCH - ALL N');
			//if (!isEmpty(currSORec.getFieldValue('source')))
			//{
			var customerEmail = currSORec.getFieldValue("email");
			var sbj = 'Order Closed Due to Incorrect Credit Card Information - Pro Therapy Supplies';
			var msg = "We at Pro Therapy Supplies are emailing you to inform you that your order, "+currSORec.getFieldValue('tranid')+" has been temporarily closed due to mismatch credit card information."
					+" If you feel we have mistakenly flagged your order please contact us at your earliest convenience."
					+"\n\nIf you have any further questions, please reply to this email or call us at 1-800-883-0368."
					+"\n\nThank you for choosing Pro Therapy Supplies, we appreciate your business."
					+"\n\nKind Regards,"
					+"\nPro Therapy Supplies"
					+"\n800-883-0368"
					+"\n\nNotice: This electronic message and attachment(s), if any, contains information from Pro Therapy Supplies that may be privileged and confidential. The information is intended to be for the use of the addressee only. If you are not the addressee, note that any disclosure, copying, distribution or use of the contents of this message is prohibited. If you received this message in error, please notify the sender immediately.";
			if(!checkEmail(soId,'INCORRECT CREDIT CARD INFORMATION'))
			{
			nlapiSendEmail(15525639, customerEmail, sbj, msg, null,null, null, null, true);
			}
			nlapiSubmitField("salesorder", soId, ["custbody_skip_auto_approve", "custbody51", "custbody50"], ["T", 75, "All Incorrect Credit Card Information"]);
			return;
			//}
		}
		
		//Ignore if CC is 2 or 3 Xs
		var ccX = 0;
		if(isAVSSTMatch == 'X') { ccX += 1; }
		if(isAVSZipMatch == 'X') { ccX += 1; }
		if(isCSCMatch == 'X') { ccX += 1; }
		if(ccX >= 2)
		{
			dLog('NO INFO - 2 or 3 X');
			nlapiSubmitField("salesorder", soId, ["custbody_skip_auto_approve", "custbody51", "custbody50"], ["T", 75, "Some Credit Card Information is Incorrect"]);
			return;
		}
		
		
		//Approve all SO created from Estimate 
		var createdFrom = currSORec.getFieldText('createdfrom') || '';
		if (!isEmpty(createdFrom) && createdFrom.indexOf('Estimate') > -1)
		{
			dLog('Auto Approve Estimate');
			nlapiSubmitField("salesorder", soId, ["custbody_approval_status","orderstatus"], ["Created From = Estimate","B"]);
			queueSO = false;
			return;
		}
				
		//if(customerID == 6679428)
		//{
			var paymenteventresult = currSORec.getFieldValue('paymenteventresult');
			//dLog('paymenteventresult','paymenteventresult='+paymenteventresult);
			//nlapiSubmitField("salesorder", soId, ["custbody32"], ["paymenteventresult="+paymenteventresult]);
			if(paymenteventresult == 'HOLD')
			{
				currSORec.setFieldValue("custbody32", "paymenteventresult="+paymenteventresult);
				nlapiSubmitRecord(currSORec, true, true);
				queueSO = false;
			}
		//}
		
		//Approve all PTS Orders under $1000 and billTo=shipTo and paymentevent!=HOLD
		/*if (storefront == "" || storefront == "Magento-protherapysupplies")
		{
			if (((parseFloat(orderTotal) < 1000) && (billTo == shipTo) && paymenteventresult != 'HOLD' ))
			{
				currSORec.setFieldValue("orderstatus", "B");
				nlapiSubmitRecord(currSORec, true, true);
				nlapiSubmitField("salesorder", soId, ["custbody_approval_status"], ["Under $1000 with Billing = Shipping"]);
				queueSO = false;
				return;
			}
		}*/
		
		//Approve all Orders through UI under $1000 and billTo=shipTo - PLACE AFTER PAYMENT HOLD
		if(isEmpty(currSORec.getFieldValue('source')))
		{
			if ((parseFloat(orderTotal) < 1000) && (billTo == shipTo))
			{
				currSORec.setFieldValue("orderstatus", "B");
				nlapiSubmitRecord(currSORec, true, true);
		
				nlapiSubmitField("salesorder", soId, ["custbody_approval_status"], ["Call-In Order"]);
				queueSO = false;
				return;
			}
		}
		
		//Approve all Orders through UI from any marketplace
		if(isEmpty(currSORec.getFieldValue('source')))
		{
			if ((storefront != "") && (storefront.search("Magento") == -1))
			{
				currSORec.setFieldValue("orderstatus", "B");
				nlapiSubmitRecord(currSORec, true, true);
				nlapiSubmitField("salesorder", soId, ["custbody_approval_status"], ["Marketplace Order"]);
				queueSO = false;
				return;
			}
		}
	
		
		//Fraud Detect
		if(!queueSO){
			var fraudMsg = "";
			var fraudLvl = 0;
			
			if(billTo != shipTo){ fraudMsg += "Billing/Shipping not match\n"; fraudLvl += 25;}
			
			if(isEmpty(isAVSSTMatch)) { fraudMsg += "AVS Street blank\n"; fraudLvl += 10;}
			if(isAVSSTMatch == 'N'){ fraudMsg += "AVS Street match = N\n"; fraudLvl += 10;}
			if(isAVSSTMatch == 'X'){ fraudMsg += "AVS Street match = X\n"; fraudLvl += 10;}
			
			if(isEmpty(isAVSZipMatch)) { fraudMsg += "AVS Zip blank\n"; fraudLvl += 10;}
			if(isAVSZipMatch == 'N'){ fraudMsg += "AVS Zip match = N\n"; fraudLvl += 10;}
			if(isAVSZipMatch == 'X'){ fraudMsg += "AVS Zip match = X\n"; fraudLvl += 10;}
			
			if(isEmpty(isCSCMatch)) { fraudMsg += "CSC blank\n"; fraudLvl += 30;}
			if(isCSCMatch == 'N'){ fraudMsg += "CSC match = N\n"; fraudLvl += 30;}
			if(isCSCMatch == 'X'){ fraudMsg += "CSC match = X\n"; fraudLvl += 30;}
			
			if(parseFloat(orderTotal) >= 100) { fraudMsg += "Order more than $100\n"; fraudLvl += 10;}
			if(!addressUSA) { fraudMsg += "International Order\n"; fraudLvl += 15;}
			
			nlapiSubmitField("salesorder", soId, ["custbody_skip_auto_approve", "custbody50", "custbody51"], ["T", fraudMsg, fraudLvl]);
			nlapiLogExecution("debug", "Fraud Detection; soId: " + soId
									, "IGNORE:"+"Fraud Level %: "+fraudLvl+"; Potential Fraud: "+fraudMsg);
			return;
		}
		
		
		if(queueSO)
		{
			nlapiLogExecution("debug", "queued", "soId: " + soId);
			queueApproval(soId, currSORec.getFieldValue("entity"), shipTo)
		}
		else
		{
			nlapiLogExecution("debug", "type: " + type + "; soId: " + soId + ";"
								, "IGNORE:did all the test and queue record not created.");
		}
	}
	catch (err) 
	{
		var stErrMsg = '';
		if (err.getDetails != undefined) 
		{
			stErrMsg = 'Script Error: ' + err.getCode() + '<br>' + err.getDetails() + '<br>' + err.getStackTrace();
		}
		else 
		{
			stErrMsg = 'Script Error: ' + err.toString();
		}
		
		nlapiLogExecution("debug","Script Error", stErrMsg);
	}
}

function checkForBackorder(soRec)
{
	var hasBackorder = false;
	
	var lineItemCount = soRec.getLineItemCount("item");	
	for(i = 1; i <= lineItemCount; i++)
	{
		var boQty =  soRec.getLineItemValue("item", "quantitybackordered", i);
		
		if (!isEmpty(boQty))
		{
			if (parseFloat(boQty) > 0)
			{
				hasBackorder = true;
				break;
			}
		}
	}

	return hasBackorder;
}

function deleteQueue(soId)
{
	var filters = 	[	new nlobjSearchFilter("custrecord_sopaq_sales_order", null, "anyof", soId)
					,	new nlobjSearchFilter("isinactive", null, "is", "F")
					];
					
	var searchResult = nlapiSearchRecord("customrecord_so_pendingapproval_queue", null, filters, null);
	
	if (searchResult != null && searchResult.length > 0)
	{
		for (var i = 0; i < searchResult.length; i++)
		{
			var queueId = searchResult[i].getId();
			nlapiSubmitField("customrecord_so_pendingapproval_queue", queueId, 
								["isinactive", "custrecord_sopaq_remarks"]
							,	["T", "Skip this. SO reverted to Pending Fulfillment by user."]
							)
							
			nlapiLogExecution("debug", "deleteQueue", "queueId " + queueId + " marked as deleted.");
		}
	}
}

function queueApproval(soId, customerId, shipTo)
{

	var filters = 	[	new nlobjSearchFilter("custrecord_sopaq_sales_order", null, "anyof", soId)
					,	new nlobjSearchFilter("isinactive", null, "is", "F")
					];
					
	var searchResult = nlapiSearchRecord("customrecord_so_pendingapproval_queue", null, filters, null);
	
	if (searchResult != null && searchResult.length > 0)
	{
		nlapiLogExecution("debug", "queueApproval", "SO " + soId + " already in the queue");
	}
	else
	{
		var tranDate = getGMTServerDate();
		
		var yyyy = tranDate.getFullYear();
		var MM = tranDate.getMonth() + 1;
		var dd = tranDate.getDate();
		var HH = tranDate.getHours();
		var mm = tranDate.getMinutes();
		var utc = Math.round(new Date().getTime()/1000.0);
		
		var batchNo = 1;
		
		if (mm >= 0 && mm <= 29)
			batchNo = 2;
			
		// check if customer is already in the queue
		var sequenceNo = customerId + "_" + yyyy + MM + dd + "_" + HH + "0" + batchNo; // should be customerid_yyyymmdd_HH0batch
		
		var hasDuplicate = getDuplicateQueue(sequenceNo, shipTo);
		
		var queueRec = nlapiCreateRecord("customrecord_so_pendingapproval_queue");
			
		queueRec.setFieldValue("name", sequenceNo);
		queueRec.setFieldValue("custrecord_sopaq_sales_order", soId);
		queueRec.setFieldValue("custrecord_sopaq_creation_batch", batchNo);
		queueRec.setFieldValue("custrecord_sopaq_date_created_utc", utc);
		
		var queueId = nlapiSubmitRecord(queueRec, true);
		
		var soApprovalStatus = "In Queue";
		
		if (hasDuplicate)
			soApprovalStatus = "Duplicate";
		
		// tag SO approval status as IN QUEUE
		nlapiSubmitField("salesorder", soId, "custbody_approval_status", soApprovalStatus);
		
		nlapiLogExecution("debug", "queueApproval", "soId: " + soId + "; batchNo: " + batchNo + "; queueId: " + queueId + "; utc: " + utc + ";")
	}
}

function getDuplicateQueue(sequenceNo, shipTo)
{
	try
	{
		var hasDuplicate = false;
		
		var filters = 	[	new nlobjSearchFilter("name", null, "is", sequenceNo)
						,	new nlobjSearchFilter("custrecord_sopaq_processed", null, "is", "F")
						,	new nlobjSearchFilter("mainline", "custrecord_sopaq_sales_order", "is", "T")
						];
		
		var columns = 	[
							new nlobjSearchColumn("custrecord_sopaq_sales_order")
						,	new nlobjSearchColumn("shipaddress", "custrecord_sopaq_sales_order")
						];
						
		var searchResult = nlapiSearchRecord("customrecord_so_pendingapproval_queue", null, filters, columns);
		
		if (searchResult != null && searchResult.length > 0)
		{
			for (var i = 0; i < searchResult.length; i++)
			{
				var soId = searchResult[i].getValue("custrecord_sopaq_sales_order");
				var soShipTo = searchResult[i].getValue("shipaddress", "custrecord_sopaq_sales_order");
				
				if (shipTo == soShipTo)
				{
					nlapiSubmitField("salesorder", soId, "custbody_approval_status", "Duplicate");
					hasDuplicate = true;
				}
			}		
		}
		
		return hasDuplicate;
	}
	catch (ex)
	{
		var message = (ex instanceof nlobjError) ? ex.getStackTrace() + ": " + ex.getCode() + " " + ex.getDetails() : ex.toString();
		nlapiLogExecution("error", "getDuplicateQueue", message);
		throw ex;
	}
}

function lineitem(type,id)
{
	if(type == "kititem")
	{
		var kit = nlapiLoadRecord("kititem",id);
		var kitItemID = kit.getLineItemValue("member","item",1);
		var kitqty = kit.getLineItemValue("member","quantity",1);
		var kitLineItem = nlapiLoadRecord("inventoryitem",kitItemID);
		var kitweight = kitLineItem.getFieldValue("weight")*kitqty;
		var kitunits = kitLineItem.getFieldText("weightunit");
		if(kitunits == 'oz'){kitweight = kitweight/16; }
		if(isEmpty(kitweight)){nlapiLogExecution("debug",id,'Item has no weight'); return 0;}
		//nlapiLogExecution("debug",id,"kitweight: "+kitweight+" "+kitunits);
		return kitweight;
	}
	if(type == "inventoryitem")
	{		
		var lineItem = nlapiLoadRecord(type,id);
		var weight = lineItem.getFieldValue("weight");
		var units = lineItem.getFieldText("weightunit");
		if(units == 'oz'){weight = weight/16;}
		if(isEmpty(weight)){nlapiLogExecution("debug",id,'Item has no weight'); return 0;}
		//nlapiLogExecution("debug",id,"weight: "+weight+" "+units);
		return weight;
	}
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

function getGMTServerDate()
{
	var nowDate = new Date();
	
	var ts = nowDate.getTime();
	var offsetSec = nowDate.getTimezoneOffset() * 60000;
	var gmtTs = ts + offsetSec;
		
	return(new Date(gmtTs));
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

function checkEmail(tranID,keyword)
{
	var filters = new Array();
	filters[0] = new nlobjSearchFilter('mainline', null, 'is', 'T');
	filters[1] = new nlobjSearchFilter('internalid', null, 'is', tranID);
	var columns = new Array();
	columns[0] = new nlobjSearchColumn('subject', 'messages');
	var searchresults = nlapiSearchRecord('salesorder', null, filters, columns);
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

function containsNumber(str) {
	var matches = str.match(/\d+/g);
	if (matches != null) { //has number
		return true;
	} else{ //all text
		return false;
	}
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

function calcWorth(type, id, rate)
{
	if(type == "kititem")
	{
		var kit = nlapiLoadRecord("kititem",id);
		var kitItemID = kit.getLineItemValue("member","item",1);
		var kitqty = kit.getLineItemValue("member","quantity",1);
		var item = nlapiLoadRecord("inventoryitem",kitItemID);
	}
	if(type == "inventoryitem")
	{		
		var item = nlapiLoadRecord(type,id);
	}

	var cost = item.getLineItemValue('lastpurchaseprice');
	var shiptopts = item.getFieldValue('custitem_vendorshipping');
	var shipping = item.getFieldValue('shippingcos');
	var threshold = ((cost+shipping+shiptopts)*1.03)*1.27;

	// cost of item + shipping cost + shipping to us cost + 3% for standard credit card costs and adds 27% profit
	if (rate <= threshold) 
	// if the price sold is sell it for is less than the threshold dont auto approve and task (create person to task)
	// to change price, and suggest new price to change to
	{
		currSORec.setFieldValue("custbody_skip_auto_approve", "T");

		var title = "Item value is too low";
		var message = ""
		// newTask = nlapiCreateRecord('task');
		// newTask.setFieldValue('title', title);
		// newTask.setFieldValue('message', message);
		// newTask.setFieldValue('assigned', assignedID);
		// newTask.setFieldValue('company', customerID);
		// newTask.setFieldValue('transaction', soId);
		// nlapiSubmitRecord(newTask, true);
	}

	return;
}

function dLog(logTitle, logDetails) 
{
	nlapiLogExecution('DEBUG', logTitle, logDetails);
}
