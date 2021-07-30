function userEventBeforeSubmit(type){

	var lineCount = nlapiGetLineItemCount('item');
	var backordered = [];
	var nonduluth = [];
	var duluth = [];
	var obj_dict = [];
	for (var i = 1; i <= lineCount; i++) {

		var quanRemaining = parseFloat(nlapiGetLineItemValue('item', 'quantityremaining', i));
		var quanOnHand = parseFloat(nlapiGetLineItemValue('item', 'onhand', i));

		var itemId = nlapiGetLineItemValue('item', 'item', i);
		var pocreated = nlapiGetLineItemValue('item', 'createpo', 1);

		var itemName = nlapiLookupField('item', itemId, 'displayname');
		var description = nlapiLookupField('item', itemId, 'purchasedescription');

		var ship = "";

		if (pocreated && !(quanRemaining > quanOnHand)) {
			nonduluth.push("Item: " + itemName + "     Quantity: "+ quanRemaining + "\n");
			if(lineCount < 1) {
				ship = "shipped separately";
			} else {ship = "shipped";}
		}

		else if ((quanRemaining > quanOnHand) && !pocreated) {
			var quanNeed = quanRemaining - quanOnHand;
			var backorderedate = ""
			if(nlapiLookupField('item', itemId, 'custitem_bodate')) {
				backorderedate = "     BackOrder Date: " + nlapiLookupField('item', itemId, 'custitem_bodate');
			}
			else {
				backordered.push("Item: " + itemName + "     Quantity:" + quanNeed + backorderedate + "\n");
			}
			ship = "on back order";
		}

		else {
			duluth.push("Item: " + itemName + "     Quantity: "+ quanRemaining + "\n");
			ship = "shipped";
		}

		obj_dict.push({itemName:itemName,description:description,quanRemaining:quanRemaining,ship:ship})

	}


	if ((duluth.length > 0 && nonduluth.length > 0) || (backordered.length > 0 && nonduluth.length > 0) || (backordered.length > 0 && duluth.length > 0)) {
		var author = 15525639; //Indicate the ID of the email sender here
		var recipient = 33722482; //nlapiGetFieldValue('entity');
		var subject = 'Pro Therapy Supplies Order status update';
		var createdFrom = nlapiGetFieldValue('createdfrom');
		var tranNumber = nlapiLookupField('salesorder', createdFrom, 'tranid');

		
		var body1 = "Dear Customer,"
		+ "\n\nThe Item(s) you have ordered in Sales Order: " + tranNumber + " will arive in separate "
		+ "shipments, below you will find a list of items with their status.\n\n";

		var body2 = ""; //make this an
		// if both dropshipped and from warehouse
		if (duluth.length > 0 && nonduluth.length > 0) {
			body2 = "East Coast WareHouse:\n" + duluth
			+ "WestCoast WareHouse: " + nonduluth;
		}
		// if dropshipped and backordered
		else if (backordered.length > 0 && nonduluth.length > 0) {
			body2 = "West Coast WareHouse:\n" + nonduluth
			+ "\nBackOrdered: " + backordered;
		}
		// if from warehouse and backordered
		else if  (backordered.length > 0 && duluth.length > 0) {
			body2 = "East Coast Warehouse:\n" + duluth
			+ "\nBackOrdered: " + backordered;
		}

		var body3 = "\nPlease find the other email you have recieved for tracking information."
		+"\n\nIf you have any questions please do not hesitate to contact us. " 
		+ "\nThank you for your business - we appreciate it very much."
		+"\n\nSincerely,"
		+"\nPro Therapy Supplies LLC"
		+"\ncustomerservice@protherapysupplies.com"
		+"\nwww.protherapysupplies.com"
		+"\n770-441-9808";

		// const html = "<!DOCTYPE html><html><head><style>table {width: 100%;}table,th,td {border: 1px solid black;border-collapse: collapse;}th,td {padding: 6px;text-align: left;} #t01 tr:nth-child(even) {y background-color: #eee;}#t01 tr:nth-child(odd) {background-color: #fff;}#t01 th {background-color: gray;color: white;}</style></head><body><table id='t01'><tr><th>Item Name</th><th>Description</th><th>QTY</th><th>Shipping status</th></tr>" 
		// + obj_dict.map(function(d) {return ("<tr><td>" + d.item + "</td><td>" 
		// + d.description + "</td><td>" + d.qty +"</td><td>" 
        // + d.status + "</td></tr>");}).join('') + "</table></body></html>";
        // // log.debug({title: "html", details: html})
        // nlapiLogExecution('debug', 'html', html);

		 //inline HTML header to set the design of the table
		var htmlheader = '<style>table, th, td {border: 1px solid black;}'
		htmlheader += 'table {border-collapse: collapse;}'
		htmlheader += 'th {background-color:#613016;}</style>'
		//inline HTML body to create the table
		//header
		var htmlbody = '<table><tr><th>Item Name</th><th>Description</th><th>QTY</th><th>Shipping Status</th></tr>'
		for (var i = 1; i <= lineCount; i++) {
			htmlbody += '<tr><td>'
			htmlbody += obj_dict[i].itemName
			htmlbody += '</td><td>'
			htmlbody += obj_dict[i].description
			htmlbody += '</td><td>'
			htmlbody += obj_dict[i].quanRemaining
			htmlbody += '</td><td>'
			htmlbody += obj_dict[i].ship
			htmlbody += '</td>'
		}
		//end of for loop
		htmlbody += '</tr></table>'

		 //emailBody = '\n\n' + htmlheader + htmlbody;
		nlapiLogExecution('DEBUG', 'arr', obj_dict);
		var body = body1 + body2 + body3;// + emailBody;
		nlapiSendEmail(author, recipient, subject, body);
	}


}