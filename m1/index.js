const http = require("http");
const { connectQueue, sendData } = require("./connectQueue");

const port = process.env.PORT || 5000;

connectQueue();

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
        await sendData(body);
    }
    res.writeHead(200);
    res.end("My first server!");
};

const server = http.createServer(requestListener);

server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});