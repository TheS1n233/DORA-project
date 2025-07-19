import cv2
import numpy as np
from app.fall_detection import detect_fall


def test_detect_fall_blank():
    blank = np.zeros((480, 640, 3), dtype=np.uint8)
    assert detect_fall(blank) is False


def test_detect_fall_sample():
    # Use arbitrary sample frames; The current first read blank returns False as a placeholder
    img = cv2.imread("server/home-safety-svc/tests/resources/sample_stand.jpg")
    assert detect_fall(img) is False
