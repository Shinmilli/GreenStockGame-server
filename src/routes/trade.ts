import express from 'express';
import { executeTrade } from '../controllers/tradeController';

const router = express.Router();

router.post('/', executeTrade);

export default router;