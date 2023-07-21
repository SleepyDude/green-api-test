const amqp = require("amqplib");

module.exports.connectQueue = connectQueue;
module.exports.sendData = sendData;

var channel, connection;  //global variables

async function connectQueue() {   
    try {
        connection = await amqp.connect("amqp://localhost:5672");
        channel    = await connection.createChannel()
        
        await channel.assertQueue("test-queue")
        
    } catch (error) {
        console.log(error)
    }
}

async function sendData (data) {
    console.log(`sending ${JSON.stringify(data)}`);
    // send data to queue
    await channel.sendToQueue("test-queue", Buffer.from(JSON.stringify(data)));
        
    // close the channel and connection
    await channel.close();
    await connection.close(); 
}
