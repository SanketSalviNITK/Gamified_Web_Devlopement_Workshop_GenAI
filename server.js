const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.glb': 'model/gltf-binary',
    '.gltf': 'model/gltf+json'
};

const server = http.createServer((req, res) => {
    // Sanitize path to prevent directory traversal
    let safeUrl = req.url.split('?')[0];
    let filePath = path.join(__dirname, safeUrl === '/' ? 'index.html' : safeUrl);

    // Prevent reading files outside workspace directory
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403, { 'Content-Type': 'text/html' });
        res.end('<h1>403 Forbidden</h1>', 'utf-8');
        return;
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 Not Found</h1>', 'utf-8');
            } else {
                res.writeHead(500, { 'Content-Type': 'text/html' });
                res.end(`<h1>500 Internal Error</h1><p>${error.code}</p>`, 'utf-8');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`📡 GAMIFIED WORKSHOP MAINBOARD ONLINE`);
    console.log(`👉 Main portal:     http://localhost:${PORT}/index.html`);
    console.log(`👉 Participant Deck: http://localhost:${PORT}/participant.html`);
    console.log(`👉 Admin Projector: http://localhost:${PORT}/admin.html`);
    console.log(`=======================================================`);
});
