import express from'express';
const app=express();
app.use(express.json());
app.get('/ping' ,(req,res)=>{ //testing sever
    res.status(200).json({mesaage:"Server running "})
})
export default app;