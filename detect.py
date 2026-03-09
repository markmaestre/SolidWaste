import cv2
from ultralytics import YOLO

model = YOLO("runs/detect/waste_model6/weights/best.pt")


def detect_image(image_path):
    results = model(image_path)
    detections = []
    for result in results:
        boxes = result.boxes
        for box in boxes:
            cls = int(box.cls[0])
            conf = float(box.conf[0])
            label = model.names[cls]
            detections.append({
                "label": label,
                "confidence": round(conf, 2)
            })
    return detections
