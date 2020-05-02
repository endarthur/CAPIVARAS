from math import cos, sin

import numpy as np

unRotX = np.array([[1.0, 0.0, 0.0], [0.0, 0.0, -1.0], [0.0, 1.0, 0.0]])


def rotation_about_x(theta: float) -> np.ndarray:
    c = cos(theta)
    s = sin(theta)
    return np.array([[1.0, 0.0, 0.0], [0.0, c, s], [0.0, -s, c]])


def rotation_about_z(theta: float) -> np.ndarray:
    c = cos(theta)
    s = sin(theta)
    return np.array([[c, s, 0.0], [-s, c, 0.0], [0.0, 0, 1.0]])
