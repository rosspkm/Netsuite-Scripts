function csrReturnAlert()
{
	var isRMACriteriaQtyMet = true;
	
	//User Will be Prompt to Confirm Submission 
	 var checked = confirm('Are you sure you want to submit this record?'); 
	if (checked)
	{
		//First return authorization quantity check before submission 
		var returnList = nlapiGetLineItemCount('custpage_returnconfirmation');
		for (var i = 1; i <= returnList; i++)
		{
			
			var itemId = nlapiGetLineItemValue('custpage_returnconfirmation','item',i);
					
			//Looks at RMA Qty
			var isRMAQtyFilled = nlapiGetLineItemValue('custpage_returnconfirmation','returnqty',i);
			
			//grab dropship id if exist
			var lineDropshipExist = nlapiGetLineItemValue('custpage_returnconfirmation','dropship',i);
			
			//grab dropship ra#
			var lineDropshipRANum = nlapiGetLineItemValue('custpage_returnconfirmation','dropshipranum',i);
			
			var vendorRelated = ['preferredvendor.custentity_restockingfeepercentage', 'preferredvendor.internalid'];
			
			var vendorRelatedFields = nlapiLookupField(loadItem(itemId), itemId, vendorRelated);
			
			var vendorRestockingFee = vendorRelatedFields['preferredvendor.custentity_restockingfeepercentage'];		
			var vendorId = vendorRelatedFields['preferredvendor.internalid'];	
			
			if(!isEmpty(isRMAQtyFilled))
			{
				var returnToDestination = nlapiGetFieldValue('custpage_returntodestination')
				if(isRMAQtyFilled > 0 && !isEmpty(lineDropshipExist) && (isEmpty(returnToDestination) || isEmpty(lineDropshipRANum) || isEmpty(vendorRestockingFee)))
				{
					if(isEmpty(returnToDestination))
					{
						//Check If Order is Going Back to Vendor or Us.
						alert('Please specify if the order is going back to vendor!');
						return false;
					}

					if(returnToDestination == 1) //YES
					{
						if(isEmpty(vendorRestockingFee))
						{
							//If user does have restocking fee#, user will input here or cancel. 
							var returnVendor = prompt("Please contact vendor for Restocking Fee % (PERCENTAGE). What is the percentage?");
							if(isEmpty(returnVendor) || returnVendor.indexOf(returnVendor.toUpperCase()) < 0)
							{
								return false;
							}
							else 
							{
								//If user does have restocking fee, itll go into vendor record and reload page
								nlapiSubmitField('vendor', vendorId, 'custentity_restockingfeepercentage', returnVendor);
								location.reload();
								return false;
							}
						}

						if (isEmpty(lineDropshipRANum))
						{
							//if the RA# is empty, just return false;
							alert('Please enter Vendor RA#!')
							return false;												
						}
					}
				}
				
			}
			else 
			{
				//return false cause no quantity being submmited
				alert("Please fill in quantity! If no quantity returned for an item, put 0");
				return false;
			}
		}
		
		//Mandatory Free Return Label/Tracking Number for storefronts (PTS Google Express)
		
		if(isEmpty(nlapiGetFieldValue('freereturnlabeltrackingnum')) && nlapiGetFieldValue('storefrontorder') == 'PTS Google Express')
		{
			alert("Google Express Order! Please enter the free return label tracking number!")
			return false;
		}

		return true;
	}
	else 
	{
		//User Cancels Submission 
		return false;
	}
}

function csrReturnFieldChanged(type,name)
{
	if(name == 'custpage_returnreasons')
	{
		if(nlapiGetFieldValue('custpage_returnreasons') == 5) //Incorrect Shipment
		{
			if(nlapiGetFieldValue('storefrontorder') == 'PTS Google Express')
			{
			alert("Please choose another option! Incorrect shipment cannot be used with PTS Google Express as we need to verify what really happened.");
			nlapiSetFieldValue('custpage_returnreasons','');
			}
		}
		else if(nlapiGetFieldValue('custpage_returnreasons') == 3) //Defective. 
		{
			var urlParams = new URLSearchParams(window.location.search);
			var soTranNum = urlParams.get('tranid') || '';
			var soId = urlParams.get('soid') || '';
			var entityId = nlapiLookupField('salesorder', soId, 'entity');
			var leadCSId = nlapiLookupField('vendor', 12303517, 'custentity_rma_form_defective_task'); //Vendor: Script Setup

			var defectiveType = prompt("Is this manufacturer defective or customer defective/used/missing parts? \n\n Type MAN for Manufacturer\nType CUS for Customer");
			if(defectiveType)
			{
				if(defectiveType == 'MAN')
				{
					var message = 'DEFECTIVE - Manufacturer Defective, Please Follow Up: SO' + soTranNum;        
					var title = 'DEFECTIVE - Manufacturer Defective, Please Follow Up: SO' + soTranNum;        
					var assignedID = leadCSId;
					var tasktype = 30; //RMA Return       
					sendTask(soId,entityId,message, assignedID,title,assignedID,tasktype); //Attaches to SO Record  
				}
				else if (defectiveType == 'CUS')
				{
					var message = 'DEFECTIVE - Customer Defective/Used/MissingParts, Please Follow Up: SO' + soTranNum;        
					var title = 'DEFECTIVE - Customer Defective/Used/MissingParts, Please Follow Up: SO' + soTranNum;        
					var assignedID = leadCSId;
					var tasktype = 30; //RMA Return     
					sendTask(soId,entityId,message, assignedID,title,assignedID,tasktype); //Attaches to SO Record 
				}
				else 
				{
					nlapiSetFieldValue('custpage_returnreasons', '');
					alert("Please select MAN or CUS!");
				}
			}
			else 
			{
				nlapiSetFieldValue('custpage_returnreasons', '');
				alert("Please select MAN or CUS!");
			}
		}
	}
}

function sendTask(tranID,customerID,message,userID,title,assignedID,tasktype)
{    
	if(userID < 1)     
	{        
		//dLog('sendTask userID='+userID+'; soID='+tranID,'Task Sent to Elizabeth Owen instead');        
		message = message + "\n\nFormer userID="+userID;        
		userID = 26007751;    
	}    
	newTask = nlapiCreateRecord('task');    
	newTask.setFieldValue('owner', userID);    
	newTask.setFieldValue('title', title);    
	newTask.setFieldValue('message', message);    
	newTask.setFieldValue('custevent9', tasktype);    
	newTask.setFieldValue('assigned', assignedID);    
	newTask.setFieldValue('company', customerID);    
	newTask.setFieldValue('transaction', tranID);    
	nlapiSubmitRecord(newTask, true);
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

function todaysDate()
{
	var today = new Date();
	var dd = today.getDate();
	var mm = today.getMonth()+1;
	var yyyy = today.getFullYear();
	var todayDate = mm + '/' + dd;
}