import express from 'express';
import { getEvents, triggerEvent } from '../controllers/eventController';

const router = express.Router();

// 뉴스 이벤트 조회
router.get('/', getEvents);

// 뉴스 이벤트 트리거 (관리자용)
router.post('/trigger', triggerEvent);

export default router;