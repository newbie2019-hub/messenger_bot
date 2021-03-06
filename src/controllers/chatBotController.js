require("dotenv").config();
import request from "request";
let json = ''
let country = [];
let TotalConfirmedCountry = [];

var options = {
    'method': 'GET',
    'url': 'https://api.covid19api.com/summary',
    'headers': {
    }
};

request(options, function (error, response) {
    if (error) throw new Error(error);
    json = JSON.parse(response.body);

    
    for(var i = 0; i < json['Countries'].length; i++ ){
        country.push('#'+json['Countries'][i]['Slug']);
    }
    for(var i = 0; i < json['Countries'].length; i++ ){
        TotalConfirmedCountry.push('☣️ ' + json['Countries'][i]['Country'] + ': ' + json['Countries'][i]['TotalConfirmed']);
    }
    
});

let postWebhook = (req, res) => {
    // Parse the request body from the POST
    let body = req.body;

    // Check the webhook event is from a Page subscription
    if (body.object === 'page') {

        // Iterate over each entry - there may be multiple if batched
        body.entry.forEach(function (entry) {
            // Gets the body of the webhook event
            let webhook_event = entry.messaging[0];
            console.log(webhook_event);


            // Get the sender PSID
            let sender_psid = webhook_event.sender.id;
            console.log('Sender PSID: ' + sender_psid);

            // Check if the event is a message or postback and
            // pass the event to the appropriate handler function
            if (webhook_event.message) {
                handleMessage(sender_psid, webhook_event.message);
            } else if (webhook_event.postback) {
                handlePostback(sender_psid, webhook_event.postback);
            }

        });

        // Return a '200 OK' response to all events
        res.status(200).send('EVENT_RECEIVED');

    } else {
        // Return a '404 Not Found' if event is not from a page subscription
        res.sendStatus(404);
    }
};

let getWebhook = (req, res) => {
    // Your verify token. Should be a random string.
    let VERIFY_TOKEN = process.env.MY_VERIFY_TOKEN;

    // Parse the query params
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    // Checks if a token and mode is in the query string of the request
    if (mode && token) {

        // Checks the mode and token sent is correct
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {

            // Responds with the challenge token from the request
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);

        } else {
            // Responds with '403 Forbidden' if verify tokens do not match
            res.sendStatus(403);
        }
    }
};

// Handles messages events
function handleMessage(sender_psid, received_message) {
    let response;
    // Check if the message contains text
    if (received_message.text == "#Commands") {    
        response = {
          "text": "☣️ Available Commands ☣️ \n \n🗺️Total Confirmed: \n#totalconfirmed \n☣️Total Deaths: \n#totaldeaths \n🌎Total Recovered: \n#totalrecovered \n☣️Country Total Cases: \n#countryname"
        }
    } 
    if (received_message.text == "#totaldeaths") {    
      response = {
        "text": `Covid-19 Deaths: ${json['Global']['TotalDeaths']}`
      }
    }  
    if (received_message.text == "#totalconfirmed") {    
      response = {
        "text": `Covid-19 Confirmed Cases: ${json['Global']['TotalConfirmed']}`
      }
    }  
    if (received_message.text == "#totalrecovered") {    
      response = {
        "text": `Covid-19 Total Recoveries: ${json['Global']['TotalRecovered']}`
      }
    }
    for(var i = 0; i < country.length; i++){
        if (received_message.text == country[i]) {    
            response = {
              "text": `${TotalConfirmedCountry[i]}`
            }
        }
    }  
     
    // Sends the response message
    callSendAPI(sender_psid, response);    
}

// Handles messaging_postbacks events
function handlePostback(sender_psid, received_postback) {

}

// Sends response messages via the Send API
function callSendAPI(sender_psid, response) {
     // Construct the message body
  let request_body = {
    "recipient": {
      "id": sender_psid
    },
    "message": response
  }

  // Send the HTTP request to the Messenger Platform
  request({
    "uri": "https://graph.facebook.com/v6.0/me/messages",
    "qs": { "access_token": process.env.FB_PAGE_TOKEN },
    "method": "POST",
    "json": request_body
  }, (err, res, body) => {
    if (!err) {
      console.log('message sent!')
      console.log(`My message: ${response}`)
    } else {
      console.error("Unable to send message:" + err);
    }
  }); 
}
module.exports = {
    postWebhook: postWebhook,
    getWebhook: getWebhook
};