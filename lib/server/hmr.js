import { WebSocketServer } from "ws";

export function createHMRServer() {
    const wss = new WebSocketServer({ port: 5001 });


    const clients = new Set();

    wss.on('connection', (ws) => {
        clients.add(ws);
        console.log('HMR client connected');
        ws.on('close', () => clients.delete(ws));
    });

    function sendHMRUpdate(path) {
        wss.clients.forEach((client) => {
            if (client.readyState === client.OPEN) {
                client.send(JSON.stringify({ type: 'update', path }));
            }
        });
    }

    return { sendHMRUpdate, wss };
}