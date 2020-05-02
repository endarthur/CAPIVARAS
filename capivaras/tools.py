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


class PlaneDigitizer(DigitizerToolbar):
    def __init__(self, title: str, parent: QtWidgets.QWidget, tool_checked: bool = False) -> None:
        super().__init__(title, parent)
        self.plane_digitizer_tool = self.addAction("Plane")
        self.plane_digitizer_tool.setCheckable(True)
        self.plane_digitizer_tool.setChecked(tool_checked)

    def set_data(self, item):  # TODO: is this the best way?
        set_data = item.plane_sets.items
        set_items = [v.text(0) for v in set_data]
        return set_items, set_data


class TraceDigitizer(DigitizerToolbar):
    def __init__(self, title: str, parent: QtWidgets.QWidget, tool_checked: bool = False) -> None:
        super().__init__(title, parent)
        self.plane_digitizer_tool = self.addAction("Trace")
        self.plane_digitizer_tool.setCheckable(True)
        self.plane_digitizer_tool.setChecked(tool_checked)

    def set_data(self, item):
        set_data = item.trace_sets.items
        set_items = [v.text(0) for v in set_data]
        return set_items, set_data

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
