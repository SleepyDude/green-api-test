const amqp = require("amqplib");

module.exports.connectQueue = connectQueue;
module.exports.sendData = sendData;

var channel, connection;  //global variables

async function connectQueue() {   
    try {
        connection = await amqp.connect("amqp://localhost:5672");
        channel    = await connection.createChannel()
        
        await channel.assertQueue("to-m2-queue");
        await channel.assertQueue("from-m2-queue");

        channel.consume("to-m2-queue",async (data) => {
            const buf = Buffer.from(data.content);
            const dataJSON = JSON.parse(buf.toString());

            console.log(dataJSON);
            const clientId = dataJSON['clientId'];
            const clientData = dataJSON['clientData'];

            console.log(`get data with clientId: ${clientId} and clientData: ${JSON.stringify(clientData)}`);
            dataJSON.clientData.data = dataJSON.clientData.data.toUpperCase();
            
            await sendData(dataJSON);
            // const payloadJson = JSON.parse(payload);
            // const capitalize = payloadJson.data.toUpperCase();
            channel.ack(data);
        })
        
    } catch (error) {
        console.log(error)
    }
}

async function sendData (data) {
    console.log(`sending ${JSON.stringify(data)}`);
    // send data to queue
    await channel.sendToQueue("from-m2-queue", Buffer.from(JSON.stringify(data)));
        
    // close the channel and connection
    // await channel.close();
    // await connection.close(); 
}
