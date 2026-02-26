import express from "express";
import cors from "cors"; // Instale com: npm install cors
import routes from "./routes";

const app = express();

app.use(cors()); // Libera o acesso para a extensão
app.use(express.json()); // Permite ler o corpo (body) das requisições POST

app.use(routes);

export default app;