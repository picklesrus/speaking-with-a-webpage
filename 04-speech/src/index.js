const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const speech = require('@google-cloud/speech');


const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({server: server});
const client = new speech.SpeechClient();

// The encoding of the audio file, e.g. 'LINEAR16'
const encoding = 'LINEAR16';

// The sample rate of the audio file in hertz, e.g. 16000
const sampleRateHertz = 44100;

// The BCP-47 language code to use, e.g. 'en-US'
const languageCode = 'en-US';


function initializeStream(ws) {
	console.log('starting up stream');
	var stream = client.streamingRecognize({
		config: {
			encoding: encoding,
			languageCode: languageCode,
			sampleRateHertz: sampleRateHertz
		},
    // Decide whether we want interim results or not.  Initial thought is that
    // it feels more responsive, but sometimes they are just wrong.
    // The confidence score for each result prints out in the chrome console.
    // I haven't looked to see what the cost increase would be.
    interimResults: true, 
}).on('error', function(err) {
     // TODO: notify client of error so it can stop trying.
     console.log('Error from speech api: ' + err);
 }).on('data', function(data) {
 	if (data && data.results[0]) {
 		console.log("I heard:" + data.results[0].alternatives[0].transcript);
 		var jsonResponse = JSON.stringify(data.results[0]);
 		ws.send(jsonResponse);
 	} else {
 		console.log('got data from speech api but no result?');
 	}
 });
 return stream;
}

wss.on('connection', (ws, req) => {
	console.log('Connecting. Time to start a stream.');
	var stream = null;    
		ws.on('message', (message) => {
	    // The client is set up to send some configuration info
	    // (i.e. the sample rate) as the first message.
	    // TODO: Parse that data properly and use it to decide whether to initialize
	    // the stream.
	    if (typeof message == 'string') {
	      // Initial message from client currently looks like this:
	      // {"sampleRate":44100}
	      console.log('initial client message: ' +  message);
	      // TODO: pull the sample rate out of this.
	      // Do we need any other configuration data? Maybe an id if we want to
	      // start up multiple streams?
	      stream = initializeStream(ws);
	      // Client expects a message back before it sends anymore the data.
	      // Remove this expectation? Or at least send back something useful?
	      ws.send('got the configuration message');
	  } else {
	  	stream.write(message);
	  }
    });
	ws.on('close', function close() {
		console.log('Stopping stream.');
		stream.end();
	});
});
//
// Start the server.
//
server.listen(8080, () => console.log('Listening on http://localhost:8080'));