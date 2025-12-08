import joblib
import pandas as pd
from datetime import datetime

class MLModel:
    def __init__(self, model_dir="./"):
        self.rain_model = joblib.load(model_dir + "rainfall_model.pkl")
        self.irr_model = joblib.load(model_dir + "irrigation_model.pkl")
        self.scaler = joblib.load(model_dir + "scaler.pkl")

        self.feature_names = [
            'soil_moisture', 'rainfall_detected', 'temperature',
            'humidity', 'pressure', 'hour', 'month'
        ]

    def prepare(self, data):
        df = pd.DataFrame([data])
        df["moisture_humidity_ratio"] = df["soil_moisture"] / (df["humidity"] + 1)
        df["temp_humidity_interaction"] = df["temperature"] * df["humidity"] / 100

        X = df[self.feature_names + [
            "moisture_humidity_ratio",
            "temp_humidity_interaction"
        ]]

        return self.scaler.transform(X)

    def predict(self, data):
        now = datetime.now()

        data.setdefault("hour", now.hour)
        data.setdefault("month", now.month)

        X = self.prepare(data)

        return {
            "will_rain": bool(self.rain_model.predict(X)[0]),
            "irrigate": bool(self.irr_model.predict(X)[0]),
            "timestamp": now.isoformat()
        }
