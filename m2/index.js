const http = require("http");

const port = process.env.PORT || 5000;

const requestListener = function (req, res) {
    res.writeHead(200);
    res.end("My first server!");
};


const server = http.createServer(requestListener);

server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});