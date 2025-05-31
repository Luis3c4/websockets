import express from "express";
import logger from "morgan";
import { dirname } from "path";
import { fileURLToPath } from "url";

import { Server } from "socket.io";
import { createServer } from "node:http";

import dotenv from "dotenv";
import { createClient } from "@libsql/client";
 
// dirname: obtiene el directorio padre de una ruta de archivo.

// fileURLToPath: convierte una URL de archivo en una ruta de archivo del sistema.
// import.meta.url: proporciona la URL del módulo actual, que es útil para obtener la ruta del directorio actual en un módulo ES.
dotenv.config();
const __dirname = dirname(fileURLToPath(import.meta.url));
const port = process.env.PORT ?? 3000;
const app = express();
const server = createServer(app);
const io = new Server(server, {
  connectionStateRecovery: {},
});
const db = createClient({
  url: process.env.DB_URL ?? "file:./db.sqlite",
  authToken: process.env.DB_TOKEN,
});
await db.execute(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`);
//escucha eventos de conexión de socket.io
// y emite un mensaje cuando un nuevo cliente se conecta
io.on("connection", async(socket) => {
  console.log("New client connected");
  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
  // Escucha el evento "chat message" y guarda el mensaje en la base de datos
  socket.on("chat message", async(msg) => {
    let result;
    try {
        result = await db.execute({
            sql: "INSERT INTO messages (content) VALUES (:msg)",
            args: { msg },
        });
    } catch (error) {
        console.error("Error saving message:", error);
        return;
    }
    // Emite el mensaje a todos los clientes conectados
    io.emit("chat message", msg, result.lastInsertRowid.toString());
  });
  // Recupera los mensajes de la base de datos y los envía al cliente
  if (!socket.recovered) {
    try{
      const result = await db.execute({
        sql: "SELECT id, content FROM messages where id > ?",
        args: [socket.handshake.auth.serverOffset ?? 0]
      });
      result.rows.forEach(row=>{
        socket.emit("chat message", row.content, row.id.toString());
      });
    }catch (error) {
      console.error("Error fetching messages:", error);
      return;
    }
  }
  socket.on("file upload", async(fileData) => {
    // Aquí podrías manejar la carga de archivos, por ejemplo, guardándolos en el servidor o en un servicio de almacenamiento
    console.log("File uploaded:", fileData);
    // Emite un evento para notificar a los demás clientes sobre la carga del archivo
    io.emit("file received", fileData);
  });


});

app.use(logger("dev"));
app.get("/", (req, res) => {
  res.sendFile("index.html", { root: __dirname + "/../client" });
});
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
