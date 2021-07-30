//https://671309.app.netsuite.com/app/common/scripting/script.nl?id=656

/*
    2/16/21 - Added new email headers and updated email process so it no longer spams emails to the customers
    2/17/21 - Made so only emails on first day after invoice, 30 days, and 60 days after 
    2/19/21 - Added auto create task on 70 day theshhold so staff can have task to contact customer in task (set in vender under invice task user)
*/

/**
 *@NApiVersion 2.x
 *@NScriptType ScheduledScript
 */
define(['N/record','N/search','N/email','N/render'], function(record,search,email,render) {

    function execute(context) {     
        initiateSearch('customsearch3683', sendNewOrderEmail);
        initiateSearch('customsearch3684', pastDueEmail);
    }

    function initiateSearch(search_id, custom_function)
    {
        return search.load({
            id: search_id
        }).run().each(custom_function)
    }


    //Send New Order Invoice Email 
    function sendNewOrderEmail(result)
    {
        var scriptUserLookUp = search.lookupFields({
            type:'vendor',
            id: 12303517,
            columns: ['custentity_net30_email']
        });
    
        var invoiceId = result.id;

        var customerId = result.getValue({
            name: 'entity'
        });


        //log.debug({title: '', details: email});

        var accountingUser = scriptUserLookUp.custentity_net30_email[0].value;

        var transactionFile = render.transaction({
            entityId: invoiceId * 1,
            printMode: 'PDF'
            });

            var emailSubject = 'Pro Therapy Supplies: Invoice';
            var emailBody = 'Dear Customer,'
            +"\n\nPlease see your invoice attached."
            +"\n\nThank you for your business - we appreciate it very much."
            +"\n\nSincerely,"
            +"\nPro Therapy Supplies LLC"
            +"\naccounting@protherapysupplies.com"
            +"\nwww.protherapysupplies.com"
            +"\n770-441-9808";

        if(email)
        {
            email.send({
                author: accountingUser, 
                recipients: customerId,
                subject: emailSubject,
                body: emailBody,
                attachments: [transactionFile],
                relatedRecords: {
                    transactionId: invoiceId,
                }
            });  

            record.submitFields({type: 'invoice', id: invoiceId, values: {'custbody_invoice_email_status_net30' : 1}}) //New Order Email Sent
            log.debug({title: 'Invoice New Order', details: 'NEW ORDER EMAIL SENT FOR: ' + invoiceId});
        }
        else
        {
            record.submitFields({type: 'invoice', id: invoiceId, values: {'custbody_invoice_email_status_net30' : 1,'tobefaxed' : true}}) //FAX if email does not exist
            log.debug({title: 'Invoice New Order', details: 'NEW ORDER FAX SENT FOR: ' + invoiceId});
        }

        return true;
    }

    //Send Late 30 Day, 60 Day, after 70 create task to call customer
    function pastDueEmail(result)
    {
        var scriptUserLookUp = search.lookupFields({
            type:'vendor',
            id: 12303517,
            columns: ['custentity_net30_email']
        });
    
        var invoiceId = result.id;

        var customerId = result.getValue({
            name: 'entity'
        });

        var daysPassed = result.getValue(result.columns[5]);

        var message = result.getValue({
            name: 'message'
        });

        var lateMessage;
        var net30LateStatus = 0;

        log.debug({title: '', details: message});

        var accountingUser = scriptUserLookUp.custentity_net30_email[0].value;

        var transactionFile = render.transaction({
            entityId: invoiceId * 1,
            printMode: 'PDF'
            });

            var emailSubject = 'Pro Therapy Supplies: Invoice (Past Due)'
            var emailBody = 'Dear Customer,'
            +"\n\nPlease see your invoice attached."
            +"\n\nPAST DUE"
            +"\n\nThank you for your business - we appreciate it very much."
            +"\n\nSincerely,"
            +"\nPro Therapy Supplies LLC"
            +"\naccounting@protherapysupplies.com"
            +"\nwww.protherapysupplies.com"
            +"\n770-441-9808";

        if(daysPassed == 30)
        {
            lateMessage = '***30 DAYS PAST DUE***';
            net30LateStatus = 1;
            sendmail();
        }
        else if(daysPassed == 45) 
        {

            lateMessage = '***45 DAYS PAST DUE***';
            net30LateStatus = 2;
            emailSubject = 'Pro Therapy Supplies: Second Reminder (Past Due)'
        }
        else if(daysPassed == 60)
        {
            lateMessage = '***60 DAYS PAST DUE***';
            net30LateStatus = 3;
            emailSubject = 'Pro Therapy Supplies: Final Notice (Past Due)'
        }

        // if 70 days pass, create a task for gina to call customer 
        else if(daysPassed == 70)
        {
            net30LateStatus = 4;

            var invoicetaskuser = search.lookupFields({
                type: search.Type.VENDOR,
                id: 12303517,
                columns: ['custentityinvoicetaskuserid']});
            var invoicetaskuser_value = invoicetaskuser.custentityinvoicetaskuserid[0].value;

            var taskTitle = 'Please contact customer for payment, invoice past due';
            var customRecord = record.create({
                type: record.Type.TASK});

            customRecord.setValue({
                fieldId: 'title', 
                value: taskTitle});

            customRecord.setValue({
                fieldId: 'assigned', 
                value: invoicetaskuser_value});

            customRecord.setValue({
                fieldId: 'custevent9', 
                value: 35});

            customRecord.setValue({
                fieldId: 'company', 
                value: customerId});

            customRecord.setValue({
                fieldId: 'transaction', 
                value: invoiceId});

            customRecord.save({
                enableSourcing: false,
                ignoreMandatoryFields: false});

            return true;
        }

        log.debug('days passed: ' + daysPassed)
        log.debug('net30latestatus passed: ' + net30LateStatus)


        if(net30LateStatus == 0)
        {
            log.debug({title: 'PAST DUE', details: 'NO EMAIL NEEDS TO BE SENT YET.'})
            return true;
        }
        if(email)
        {
            if(net30LateStatus > 0 && net30LateStatus < 4)
            {
                email.send({
                    author: accountingUser, 
                    recipients: customerId,
                    subject: emailSubject,
                    body: emailBody,
                    attachments: [transactionFile],
                    relatedRecords: {
                        transactionId: invoiceId,
                    }
                });  

                record.submitFields({type: 'invoice', id: invoiceId, values: {'custbody_invoice_email_status_net30' : net30LateStatus, 'message': lateMessage}}) //New Order Email Sent
                log.debug({title: 'PAST DUE', details: 'EMAIL SENT FOR: ' + invoiceId});
            }
        }

        else
        {
            record.submitFields({type: 'invoice', id: invoiceId, values: {'custbody_invoice_email_status_net30' : net30LateStatus,'tobefaxed' : true,'message': lateMessage}}) //FAX if email does not exist
            log.debug({title: 'PAST DUE', details: 'FAX SENT FOR: ' + invoiceId});
        }
            
        return true;       
    }

    return {
        execute: execute
    }
});