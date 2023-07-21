const http = require("http");
const { connectQueue } = require("./connectQueue");

const port = 5002;

connectQueue();

const server = http.createServer();

server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});