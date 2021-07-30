/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
 define(['N/record','N/search','N/email','N/render'], function(record,search,email,render) {



    function userEventBeforeSubmit(context) {
    
        // item fulfillment record
        var curr_rec = context.newRecord;

        // list of storefronts to make this run for
        var storefront_list = ['walmart'];

        // if storefront of sales order/item fulfillment is in the list then run
        if(storefront_list.includes(curr_rec.getValue('custbodystorefront'))) {

            var item_fulfillment_date = curr_rec.getValue('trandate');

            // get sales order
            var sales_order = record.load({
                type: record.Type.SALES_ORDER,
                id: curr_rec.getValue('createdfrom'),
                isDynamic: false
            });

            log.debug({title: "sales order", details: sales_order})
            
            // Set sublist id
            var sublistName = 'links';

            // Get the sublist line total
            var numLines = sales_order.getLineCount({
            sublistId: sublistName
            });

            log.debug({title: "numLines", details: numLines})

            for(i = 0; i < numLines; i++){

                var previousValue = sales_order.getSublistValue({
                sublistId: sublistName,
                fieldId: 'id',
                line: i
                });
                log.debug({title: "previous value", details: previousValue})
            }
            
            // load the sales receipt from the sales order
            if(record.Type == "CASH_SALE") {
                var sales_receipt = record.load({
                    type: record.Type.CASH_SALE,
                    id: previousValue,
                    isDynamic: true,
                });

                log.debug({title: "sales receipt", details: sales_receipt})
            }
            else{
                log.debug({title: "this is not a cash sale"})
            }

            // set the value of the sales receipt date 
            // var date = new Date(item_fulfillment_date)
            // sales_receipt.setValue('trandate', date);
        }

    }


    return {
        beforeSubmit: userEventBeforeSubmit
    }

 });