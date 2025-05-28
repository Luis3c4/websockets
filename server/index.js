import express from 'express';
import logger from "morgan";
import { dirname } from 'path';
import { fileURLToPath } from 'url';

import { Server } from 'socket.io';
import { createServer } from 'node:http';


// dirname: obtiene el directorio padre de una ruta de archivo.

// fileURLToPath: convierte una URL de archivo en una ruta de archivo del sistema.
// import.meta.url: proporciona la URL del módulo actual, que es útil para obtener la ruta del directorio actual en un módulo ES.
const __dirname = dirname(fileURLToPath(import.meta.url));
const port = process.env.PORT ?? 3000;
const app = express();
const server = createServer(app);
const io = new Server(server)
//escucha eventos de conexión de socket.io
// y emite un mensaje cuando un nuevo cliente se conecta
io.on("connection",(socket)=>{
    console.log("New client connected");
    socket.on("disconnect",()=>{
        console.log("Client disconnected");
    })
})
app.use(logger("dev"))
app.get("/", (req, res) => {
    res.sendFile("index.html", { root: __dirname + "/../client" });
})
server.listen(port,()=>{
    console.log(`Server is running on port ${port}`);
})