const http = require("http");
const { connectQueue, sendData, disconnectQueue } = require("./connectQueue");

const port = process.env.PORT || 5000;

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
        console.log(`get ${body} from user`);
        // Отправляем данные в очередь.
        const response = await sendData(body);
        res.writeHead(200);
        res.end(JSON.stringify(response));
    }
};

let server;

async function runServer() {
    server = http.createServer(requestListener);

    await connectQueue();

    server.once('close', async () => {
        await disconnectQueue();
    });

    server.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`);
    });
}

runServer();

// Graceful shutdown
process.on('SIGINT',async () => {

    console.log('\nClosing server');
  
    server.close(async () => {
      await disconnectQueue();
      console.log('Server closed');
      process.exit();
    })
  
    // Force close server after 5secs
    setTimeout((e) => {
      console.log('Forcing server close !!!', e)
      process.exit(1)
    }, 5000)
});
