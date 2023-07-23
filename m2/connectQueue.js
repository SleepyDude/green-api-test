const amqp = require("amqplib");

module.exports.connectQueue = connectQueue;
module.exports.sendData = sendData;

var channel, connection;  //global variables

function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

const taskHandlers = {
    'capitalize': async (data) => {
        console.log(`[LOG M2] In "capitalize" handler. Processing for 1 sec.`);
        await delay(1000);
        return data.toUpperCase();
    },
    'answerToLifeUniverseAndEverything': async (data) => {
        console.log(`[LOG M2] In "answerToLifeUniverseAndEverything" handler. Processing for 4 sec.`);
        await delay(4000);
        return 42;
    },
    'longTask': async (data) => {
        console.log(`[LOG M2] In "longTask" handler. Processing for 10 sec.`);
        await delay(10 * 1000);
        return 'newer get to user';
    }
}

async function handleMessage(data) {
    try {
        const buf = Buffer.from(data.content);
        const dataJSON = JSON.parse(buf.toString());
    
        console.log(`[LOG M2] Get message from M1: \n${JSON.stringify(dataJSON)}\n`);

    
        const task = dataJSON.clientData.task;
        if (!task) {
            dataJSON.clientData.data = {error: "no 'task' field in request."};
            await sendData(dataJSON);
            channel.ack(data);
            return;
        }
    
        const handler = taskHandlers[task];
        if (!handler) {
            dataJSON.clientData.data = {error: `'${task}' - such task is not awailable`};
            await sendData(dataJSON);
            channel.ack(data);
            return;
        }
    
        dataJSON.clientData.data = await handler(dataJSON.clientData.data);
        
        await sendData(dataJSON);
    } catch (e) {
        console.log(`[LOG M2] Error upon handleMessage() \n${JSON.stringify(e)}\n\n`);
    }
}

async function connectQueue() {
    try {
        console.log(`[LOG M2] [connectQueue] attempt`);
        connection = await amqp.connect("amqp://rabbitmq:5672");
        channel    = await connection.createChannel()
        
        await channel.assertQueue("to-m2-queue");
        await channel.assertQueue("from-m2-queue");
    
        channel.consume("to-m2-queue", handleMessage);
        console.log(`[LOG M2] [connectQueue] success`);
        
    } catch (error) {
        if (error.errno === -111) {
            console.log('[LOG M2] cant connect to RMQ server, reconnect after 5 sec');
            setTimeout(connectQueue, 5000);
        } else {
            console.log(`[LOG M2] Error upon connecting to RMQ Queue: \n${JSON.stringify(error)}}\n`);
        }
    }
}

async function sendData (data) {
    console.log(`[LOG M2] Sending to M1: \n${JSON.stringify(data)}\n`);
    await channel.sendToQueue("from-m2-queue", Buffer.from(JSON.stringify(data)));
}
