from app.fall_detection import detect_fall_angles


def test_knee_angle_normal():
    normal = [150.0] * 30
    assert detect_fall_angles(normal) is False


def test_knee_angle_fall():
    series = [150.0] * 10 + [80.0] * 15 + [60.0] * 5
    assert detect_fall_angles(series) is True
