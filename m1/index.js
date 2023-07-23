const http = require("http");
const { connectQueue, sendData, disconnectQueue } = require("./connectQueue");

const port = 5000;

const getBody = async request => {
    let body = ""

    for await (const chunk of request) {
        body += chunk.toString()
    }

    return body
}

const requestListener = async function (req, res) {
    if (req.method === "POST") {
        const body = await getBody(req);
        // Отправляем данные в очередь.
        const response = await sendData(body);
        if (response.error) {
            res.writeHead(400);
        } else {
            res.writeHead(200);
        }
        res.end(JSON.stringify(response));
    }
};

let server;

async function runServer() {
    server = http.createServer(requestListener);

    await connectQueue();

    server.listen(port, () => {
        console.log(`[LOG M1] Server M1 is running `);
    });
}

runServer();

// Graceful shutdown
// process.on('SIGINT',async () => {

//     console.log('\nClosing server');
  
//     server.close(async () => {
//       await disconnectQueue();
//       console.log('Server closed');
//       process.exit();
//     })
  
//     // Force close server after 5secs
//     setTimeout((e) => {
//       console.log('Forcing server close !!!', e)
//       process.exit(1)
//     }, 5000)
// });
