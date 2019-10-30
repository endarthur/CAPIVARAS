import numpy as np
from PyQt5 import QtWidgets, QtCore, QtGui
from PyQt5.QtCore import pyqtSignal as Signal, pyqtSlot as Slot  # type: ignore


class DigitizerToolbar(QtWidgets.QToolBar):
    def __init__(self, title: str, parent: QtWidgets.QWidget) -> None:
        super().__init__(title, parent)

        self.mesh_selector = QtWidgets.QComboBox()
        self.addWidget(self.mesh_selector)

        self.set_selector = QtWidgets.QComboBox()
        self.addWidget(self.set_selector)

        self.new_set_action = self.addAction("New set")


class PlaneDigitizer(DigitizerToolbar):
    def __init__(self, title: str, parent: QtWidgets.QWidget) -> None:
        super().__init__(title, parent)
        self.plane_digitizer_tool = self.addAction("Plane")
        self.plane_digitizer_tool.setCheckable(True)


class TraceDigitizer(DigitizerToolbar):
    def __init__(self, title: str, parent: QtWidgets.QWidget) -> None:
        super().__init__(title, parent)
        self.plane_digitizer_tool = self.addAction("Trace")
        self.plane_digitizer_tool.setCheckable(True)
