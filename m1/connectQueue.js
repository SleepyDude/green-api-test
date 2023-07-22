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
    console.log(`get data from m2: ${JSON.stringify(dataJSON)}`);
    const id = dataJSON['clientId'];
    const clientData = dataJSON['clientData'];

    const handler = handlers.get(id);
    if (handler) {
        handler(clientData);
    }
    channel.ack(data);
}

async function connectQueue() {
    console.log(`[connectQueue] start`);
    try {
        connection = await amqp.connect("amqp://localhost:5672");
        channel = await connection.createChannel();
        
        await channel.assertQueue("to-m2-queue");
        await channel.assertQueue("from-m2-queue");

        channel.consume("from-m2-queue", handleDataFromM2);

        console.log(`[connectQueue] finish`);
        
    } catch (error) {
        console.log(error)
    }
}

async function disconnectQueue() {
    try {
        await channel.close();
        await connection.close();
        console.log(`[disconnectQueue] finish`);
    } catch (e) {
        console.log('error upon disconnect RMQ Queue gracefully');
        // console.log(`error on closing RMQ queue: ${JSON.stringify(e, undefined, 2)}`);
    }
}

async function sendData(clientData) {
    const clientDataJSON = JSON.parse(clientData);
    const data = {
        clientId: clientId,
        clientData: clientDataJSON,
    }

    const p = new Promise((res, rej) => {

        setTimeout(() => {
            res({error: 'timeout error'});
          }, 3000)

        handlers.set(clientId, (clientData) => {
            console.log('handle client data handler in promise');
            res(clientData);
        } )
    });
    
    clientId++;

    console.log(`sending ${JSON.stringify(data)}`);
    // send data to queue
    await channel.sendToQueue("to-m2-queue", Buffer.from(JSON.stringify(data)));

    const dataFromM2 = await p;
    return dataFromM2;
}
