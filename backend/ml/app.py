from fastapi import FastAPI,Body
from predictor import MLModel
app = FastAPI()
model = MLModel(model_dir="./")
@app.get("/")
def health():
    return {"status": "ML Service Running"}
@app.post("/predict")
def predict(payload: dict=Body(...)):
    return model.predict(payload)