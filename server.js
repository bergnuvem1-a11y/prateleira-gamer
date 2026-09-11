// Servidor local para Prateleira Gamer
// Execute: node server.js
// Acesse:  http://localhost:3000

const http = require('http');
const https = require('https');
const fs   = require('fs');
const path = require('path');
const url = require('url');

const BASE = __dirname;
const PORT = 3000;

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css':  'text/css; charset=utf-8',
    '.js':   'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.ico':  'image/x-icon',
    '.svg':  'image/svg+xml',
};

// Função para fazer proxy para APIs externas
function proxyRequest(targetUrl, res) {
    https.get(targetUrl, (proxyRes) => {
        let data = '';
        
        proxyRes.on('data', (chunk) => {
            data += chunk;
        });
        
        proxyRes.on('end', () => {
            res.writeHead(200, {
                'Content-Type': 'application/json; charset=utf-8',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(data);
        });
    }).on('error', (err) => {
        console.error('Erro no proxy:', err);
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Erro ao buscar dados' }));
    });
}

http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const urlPath = parsedUrl.pathname;
    
    // Proxy para SteamSpy API
    if (urlPath === '/api/steamspy') {
        const appId = parsedUrl.query.appid;
        if (!appId) {
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'AppID é obrigatório' }));
            return;
        }
        const steamSpyUrl = `https://steamspy.com/api.php?request=appdetails&appid=${appId}`;
        proxyRequest(steamSpyUrl, res);
        return;
    }
    
    // Proxy para Steam API — conquistas do jogador
    if (urlPath === '/api/steam/achievements') {
        const appId  = parsedUrl.query.appid;
        const steamId = parsedUrl.query.steamid;
        const apiKey  = parsedUrl.query.key;
        if (!appId || !steamId || !apiKey) {
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'appid, steamid e key são obrigatórios' }));
            return;
        }
        const steamUrl = `https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/?appid=${appId}&steamid=${steamId}&key=${apiKey}&l=pt`;
        proxyRequest(steamUrl, res);
        return;
    }
    
    // Proxy para Steam API — schema de conquistas (total disponível)
    if (urlPath === '/api/steam/schema') {
        const appId  = parsedUrl.query.appid;
        const apiKey  = parsedUrl.query.key;
        if (!appId || !apiKey) {
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'appid e key são obrigatórios' }));
            return;
        }
        const steamUrl = `https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?appid=${appId}&key=${apiKey}&l=pt`;
        proxyRequest(steamUrl, res);
        return;
    }
    
    // Proxy para Steam API — tempo jogado
    if (urlPath === '/api/steam/playtime') {
        const steamId = parsedUrl.query.steamid;
        const apiKey  = parsedUrl.query.key;
        if (!steamId || !apiKey) {
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'steamid e key são obrigatórios' }));
            return;
        }
        const steamUrl = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?steamid=${steamId}&key=${apiKey}&include_played_free_games=1&include_appinfo=1`;
        proxyRequest(steamUrl, res);
        return;
    }
    
    // Servir arquivos estáticos
    const filePath = path.join(BASE, urlPath === '/' ? 'index.html' : urlPath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME[ext] || 'text/plain; charset=utf-8';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(err.code === 'ENOENT' ? 404 : 500);
            res.end(err.code === 'ENOENT' ? 'Arquivo não encontrado' : 'Erro interno');
            return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });

}).listen(PORT, () => {
    console.log(`\n  Prateleira Gamer rodando em http://localhost:${PORT}\n`);
});
