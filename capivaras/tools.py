import numpy as np
from PyQt5 import QtWidgets, QtCore, QtGui
from PyQt5.QtCore import pyqtSignal as Signal, pyqtSlot as Slot  # type: ignore


class DigitizerToolbar(QtWidgets.QToolBar):
    def __init__(self, title: str, parent: QtWidgets.QWidget) -> None:
        super().__init__(title, parent)

        self.mesh_selector = QtWidgets.QComboBox()
        self.addWidget(self.mesh_selector)

        self.addSeparator()

        self.set_selector = QtWidgets.QComboBox()
        self.addWidget(self.set_selector)

        self.addSeparator()

        self.new_set_action = self.addAction("New set")

        self.mesh_selector.currentIndexChanged.connect(self.mesh_changed)

    def set_mesh_data(self, items, data):
        current_mesh = self.mesh_selector.currentData()
        self.mesh_selector.clear()
        self.mesh_selector.addItems(items)
        new_index = 0
        for i, v in enumerate(data):
            if v == current_mesh:
                new_index = i
            self.mesh_selector.setItemData(i, v)
        self.mesh_selector.setCurrentIndex(new_index)

    def mesh_changed(self, index):
        item = self.mesh_selector.itemData(index)
        if item is None:
            return
        set_items, set_data = self.set_data(item)
        current_set = self.set_selector.currentData()
        self.set_selector.clear()
        self.set_selector.addItems(set_items)
        new_index = 0
        for i, v in enumerate(set_data):
            if v == current_set:
                new_index = i
            self.set_selector.setItemData(i, v)
        self.set_selector.setCurrentIndex(new_index)

    def set_data(self, item):
        raise NotImplemented

class CameraToolbar(QtWidgets.QToolBar):
    def __init__(self, title: str, parent: QtWidgets.QWidget):
        super().__init__(title, parent)
        self.select_perspective_camera = self.addAction("P")
        self.select_perspective_camera.setCheckable(True)
        self.select_perspective_camera.setData("perspective")
        self.select_orthographic_camera = self.addAction("O")
        self.select_orthographic_camera.setCheckable(True)
        self.select_orthographic_camera.setData("orthographic")

        self.camera_group = QtWidgets.QActionGroup(self)
        self.camera_group.addAction(self.select_perspective_camera)
        self.camera_group.addAction(self.select_orthographic_camera)

        self.select_perspective_camera.setChecked(True)


class DrawingToolbar(QtWidgets.QToolBar):
    def __init__(self, title: str, parent: QtWidgets.QWidget):
        super().__init__(title, parent)
        self.plane = self.addAction("plane")
        self.plane.setCheckable(True)
        self.plane.setData("plane")
        self.trace = self.addAction("trace")
        self.trace.setCheckable(True)
        self.trace.setData("trace")
        self.point = self.addAction("point")
        self.point.setCheckable(True)
        self.point.setData("point")
        self.section = self.addAction("section")
        self.section.setCheckable(True)
        self.section.setData("section")

        self.tool_group = QtWidgets.QActionGroup(self)
        self.tool_group.addAction(self.plane)
        self.tool_group.addAction(self.trace)
        self.tool_group.addAction(self.point)
        self.tool_group.addAction(self.section)

        self.plane.setChecked(True)