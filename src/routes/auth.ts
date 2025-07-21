import express from 'express';
import { loginTeam } from '../controllers/authController';

const router = express.Router();

router.post('/login', loginTeam);

export default router;