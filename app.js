'esversion: 6';
'use strict';
require('dotenv').config()

const rms = (accumulator, currentValue) => accumulator + currentValue * currentValue;
const Transport = require('azure-iot-device-mqtt').Mqtt;
const Client = require('azure-iot-device').ModuleClient;
const Message = require('azure-iot-device').Message;

var RMS = {
  "x": 0,
  "y": 0,
  "z": 0
};

const calcRMS = (readings) => {
  var x, y, z;
  var xs = [],
    ys = [],
    zs = [];

  for (var i = 0; i < process.env.BUFFER_SIZE; i += 6) {
    x = '0x' + readings.substring(i, i + 2);
    y = '0x' + readings.substring(i + 2, i + 4);
    z = '0x' + readings.substring(i + 4, i + 6);

    xs.push(parseInt(x));
    ys.push(parseInt(y));
    zs.push(parseInt(z));
  }

  if (xs.length > 0) {
    x = xs.reduce(rms) / xs.length;
    RMS.x = Math.sqrt(x) - (Math.random() * 5) + 1;
  }
  if (ys.length > 0) {
    y = ys.reduce(rms) / ys.length;
    RMS.y = Math.sqrt(y) - (Math.random() * 5) + 1;

  }
  if (zs.length > 0) {
    z = zs.reduce(rms) / zs.length;
    RMS.z = Math.sqrt(z) - (Math.random() * 5) + 1;
  }
};

Client.fromEnvironment(Transport, function (err, client) {
  if (err) {
    throw err;
  } else {
    client.on('error', function (err) {
      throw err;
    });

    // connect to the Edge instance
    client.open(function (err) {
      if (err) {
        throw err;
      } else {
        console.log('IoT Hub module client initialized');

        // Act on input messages to the module.
        client.on('inputMessage', function (inputName, msg) {
          pipeMessage(client, inputName, msg);
        });
      }
    });
  }
});

// This function just pipes the messages without any change.
function pipeMessage(client, inputName, msg) {
  client.complete(msg, printResultFor('Receiving message'));

  if (inputName === 'input1') {
    let bytes = msg.getBytes();
    let m2s = bytes.toString('hex');

    console.log(`${m2s.length} bytes received`);
    if (m2s.substring(0, process.env.HEADER_SIZE) != process.env.HEADER) {
      console.log('bad data');
    } else {
      calcRMS(m2s.substring(4, m2s.length - process.env.CRC_SIZE));
      let timestamp = new Date();

      let payload = {
        RMS, 
        timestamp
      };

      console.log(payload);

      var outputMsg = new Message(JSON.stringify(payload));
      client.sendOutputEvent('output1', outputMsg, printResultFor('Sending received message'));

    }
  }
}

// Helper function to print results in the console
function printResultFor(op) {
  return function printResult(err, res) {
    if (err) {
      console.log(op + ' error: ' + err.toString());
    }
    if (res) {
      //console.log(op + ' status: ' + res.constructor.name);
    }
  };
}