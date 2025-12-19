import express from 'express';
import helmet from 'helmet';
import cors from "cors"
import dotenv from 'dotenv';
import logger from './lib/logger';

dotenv.config()

const app = express();

app.use(cors())
app.use(helmet())

app.use(express.json())
app.use(express.urlencoded({extended:true}))


const port = process.env.PORT || 7000

app.listen(()=> logger.info(`Server running on http:localhost:${port}`))


