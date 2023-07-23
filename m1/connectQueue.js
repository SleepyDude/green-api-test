const amqp = require("amqplib");

module.exports.connectQueue = connectQueue;
module.exports.disconnectQueue = disconnectQueue;
module.exports.sendData = sendData;

var connection, channel;  //global variables

const handlers = new Map();
let clientId = 0;

async function handleDataFromM2(data) {
    const buf = Buffer.from(data.content);
    const dataJSON = JSON.parse(buf.toString());

    console.log(`[LOG M1] Get data from m2: \n${JSON.stringify(dataJSON)}\n`);

    const id = dataJSON['clientId'];
    const clientData = dataJSON['clientData'];

    const handler = handlers.get(id);
    if (handler) {
        console.log(`[LOG M1] Found handler for clientId: ${id}. \nTransfer data.`);

        handler(clientData.data);
    }
    channel.ack(data);
}

async function connectQueue() {
    console.log(`[LOG M1] [connectQueue] attempt`);
    try {
        connection = await amqp.connect("amqp://rabbitmq:5672");
        channel = await connection.createChannel();
        
        await channel.assertQueue("to-m2-queue");
        await channel.assertQueue("from-m2-queue");

        channel.consume("from-m2-queue", handleDataFromM2);

        console.log(`[LOG M1] [connectQueue] success`);
        
    } catch (error) {
        if (error.errno === -111) {
            console.log('[LOG M1] cant connect to RMQ server, reconnect after 5 sec');
            setTimeout(connectQueue, 5000);
        } else {
            console.log(`[LOG M1] Error upon connecting to RMQ Queue: \n${JSON.stringify(error)}}\n`);
        }
    }
}

async function disconnectQueue() {
    try {
        await channel.close();
        await connection.close();
        console.log(`[LOG M1] [disconnectQueue] finish`);
    } catch (e) {
        console.log('[LOG M1] Error upon disconnect RMQ Queue gracefully');
    }
}

async function sendData(clientData) {
    const localId = clientId++;
    let clientDataJSON
    try {
        clientDataJSON = JSON.parse(clientData);
    } catch {
        console.log(`[LOG M1] Return validation error`);
        return {'error': 'Not valid JSON'};
    }

    if (clientDataJSON.data === undefined || clientDataJSON.task === undefined) {
        console.log(`[LOG M1] Return validation error`);
        return {'error': "'task' and 'data' are mandatory fields"};
    }

    console.log(`[LOG M1] Get data from user: \n${JSON.stringify(clientDataJSON)}\n`);
    
    const data = {
        clientId: localId,
        clientData: clientDataJSON,
    }

    const p = new Promise((res, rej) => {

        const timeoutId = setTimeout(() => {
            console.log(`[LOG M1] Timeout error for clientId: ${localId}`);
            res({error: 'timeout error'});
        }, 5000);

        console.log(`[LOG M1] Set handler for clientId: ${localId}`);

        handlers.set(localId, (clientData) => {
            clearTimeout(timeoutId);
            res(clientData);
        });
    });

    console.log(`[LOG M1] ${handlers.size} active handlers`);

    console.log(`[LOG M1] Send data to M2: \n${JSON.stringify(data)}\n`);
    // send data to queue
    await channel.sendToQueue("to-m2-queue", Buffer.from(JSON.stringify(data)));

    console.log(`[LOG M1] Client: ${localId} waiting for response from M2.`);
    const dataFromM2 = await p;

    console.log(`[LOG M1] Return data for clientId: ${localId}. Data: \n${JSON.stringify(dataFromM2)}\n`);

    console.log(`[LOG M1] Delete handler for clientId: ${localId}`);
    handlers.delete(localId);
    console.log(`[LOG M1] ${handlers.size} active handlers`);

    return dataFromM2;
}
