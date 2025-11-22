import express from 'express';
import { getIrrigStas,contIrrig,setIrrgMode } from '../controllers/irrigationController.js';
const router=express.Router();
router.get('/status',getIrrigStas)
router.post('/control',contIrrig)
router.post('/mode',setIrrgMode)
export default router;