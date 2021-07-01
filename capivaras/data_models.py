from pathlib import Path
from typing import List, Type

import numpy as np
from PyQt5 import QtWidgets, QtCore, QtGui
from PyQt5.QtCore import bom, pyqtSignal as Signal, pyqtSlot as Slot  # type: ignore

from capivaras.ui.ui_interface import Settings
from capivaras.ui.mesh_properties_ui import Ui_Dialog as mesh_Ui_Dialog


class OPTreeWidget(QtWidgets.QTreeWidget):
    itemsMoved = Signal(list, bool)

    def __init__(self, parent: QtCore.QObject) -> None:
        super().__init__(parent)
        # self.setContextMenuPolicy(QtCore.Qt.CustomContextMenu)
        self.setDragDropMode(QtWidgets.QAbstractItemView.InternalMove)
        self.setHeaderHidden(True)

    def dropEvent(self, event: QtGui.QDropEvent) -> None:
        # https://vicrucann.github.io/tutorials/qtreewidget-child-drag-notify/
        items = self.selectedItems()
        item_parents = [item.parent() for item in items]
        super().dropEvent(event)
        self.itemsMoved.emit(
            items,
            any(
                item.parent != parent
                for item, parent in zip(self.selectedItems(), item_parents)
            ),
        )


class MeshListModel(QtCore.QAbstractListModel):
    def __init__(self, layersTree):
        self.layersTree = layersTree
    def rowCount(parent=QtCore.QModelIndex):
        return self.layersTree.topLevelItemCount()
    def data(self, index, role=QtCore.Qt.DisplayRole):
        if role == QtCore.Qt.DisplayRole:
            self.layersTree.topLevelItem(index.row()).text(0)


class GroupItem(QtWidgets.QTreeWidgetItem):
    def __init__(self, name: str, parent: QtCore.QObject, item_id: int):
        super().__init__(parent)
        self.id = item_id

        self.setText(0, name)
        self.setCheckState(0, QtCore.Qt.Checked)
        self.setFlags(
            QtCore.Qt.ItemIsUserCheckable
            | QtCore.Qt.ItemIsEnabled
            | QtCore.Qt.ItemIsSelectable
            | QtCore.Qt.ItemIsDragEnabled
            | QtCore.Qt.ItemIsDropEnabled
        )
        self.setExpanded(True)


class Item(QtWidgets.QTreeWidgetItem):
    dialog: QtWidgets.QDialog
    dialog_ui: object
    def __init__(self, name: str, parent: QtCore.QObject, item_id: int, item_data: dict, item_binary_data: str=""):
        super().__init__(parent)
        self.id = item_id
        self.data = item_data
        self.binary_data = item_binary_data

        self.setText(0, name)
        self.setCheckState(0, QtCore.Qt.Checked)
        self.setFlags(
            QtCore.Qt.ItemIsUserCheckable
            | QtCore.Qt.ItemIsEnabled
            | QtCore.Qt.ItemIsSelectable
            | QtCore.Qt.ItemIsDragEnabled
        )
        self.setExpanded(True)

        self.vertices: np.ndarray = None
        self.indices: np.ndarray = None


class Plane(Item):
    pass


class Trace(Item):
    pass

class Point(Item):
    pass

class Section(Item):
    pass


class ItemSet(QtWidgets.QTreeWidgetItem):
    item_class = Item

    def __init__(
        self,
        name: str,
        parent: QtCore.QObject,
        set_id: int,
        color: QtGui.QColor,
        edit_state: bool
    ):
        super().__init__(parent)
        self.set_id = set_id

        self.setText(0, name)
        self.setCheckState(0, QtCore.Qt.Checked)
        self.setFlags(
            QtCore.Qt.ItemIsUserCheckable
            | QtCore.Qt.ItemIsEnabled
            | QtCore.Qt.ItemIsSelectable
            | QtCore.Qt.ItemIsDropEnabled
        )
        self.setExpanded(True)

        # self.color = color
        self.edit_state = edit_state
        self.display_planes = True  # TODO: move this to where more appropriable
        self.set_color(color)

    def set_color(self, color: QtGui.QColor) -> None:
        self.color = color
        self.update_icon()

    def update_icon(self):
        edit = QtGui.QPixmap(":/capi_icons/edit_state.svg")
        pixmap = QtGui.QPixmap(64, 64)
        pixmap.fill(self.color)
        painter = QtGui.QPainter(pixmap)
        # painter.setCompositionMode(QtGui.QPainter.CompositionMode_DestinationOver)
        if self.edit_state:
            painter.drawPixmap(pixmap.rect(), edit)
        painter.end()
        self.setIcon(0, QtGui.QIcon(pixmap))

    def add_item(self, name: str, item_id: int, item_data: dict) -> Item:
        return self.item_class(name, self, item_id, item_data)


class PlaneSet(ItemSet):
    item_class = Plane


class TraceSet(ItemSet):
    item_class = Trace

class PointSet(ItemSet):
    item_class = Point

class SectionSet(ItemSet):
    item_class = Section

class SetGroup(QtWidgets.QTreeWidgetItem):
    def __init__(
        self, name: str, parent: QtCore.QObject, set_class: Type[ItemSet]
    ) -> None:
        super().__init__(parent)
        self.set_class = set_class

        self.setText(0, name)
        self.setCheckState(0, QtCore.Qt.Checked)
        self.setFlags(
            QtCore.Qt.ItemIsUserCheckable
            | QtCore.Qt.ItemIsEnabled
            | QtCore.Qt.ItemIsSelectable
            | QtCore.Qt.ItemIsDropEnabled
        )
        self.setExpanded(True)

    # TODO: get color as a string or int, not as a QColor, I think
    def add_set(self, name: str, set_id: int, color: QtGui.QColor, edit_state: bool = False) -> ItemSet:
        return self.set_class(name, self, set_id, color, edit_state)

    def new_id(self):
        return next((i for i in range(1, 2 ** 23) if i not in self.set_ids), None)

    @property
    def items(self):
        return [self.child(index) for index in range(self.childCount())]

    @property
    def set_ids(self):
        return set(item.set_id for item in self.items)

    def serialize(self):
        return [
            (item.text(0), item.set_id, item.edit_state, item.color.name())
            for item in self.items
        ]

    def deserialize(self, items):
        for name, id, edit_state, color_name in items:
            self.add_set(name, id, QtGui.QColor(color_name), edit_state)

    def get_item_by_id(self, id):
        for item in self.items:
            if item.set_id == id:
                return item
        return None

    def get_check_state(self):
        return {
            "visible": bool(self.checkState(0)),
            "items": [[item.set_id, bool(item.checkState(0))] for item in self.items],
        }

    def set_check_state(self, check_state):
        self.setCheckState(
                0,
                QtCore.Qt.Checked
                if check_state["visible"]
                else QtCore.Qt.Unchecked,
            )
        check_items = dict(check_state["items"])
        for item in self.items:
            item.setCheckState(
                    0,
                    QtCore.Qt.Checked
                    if check_items[item.set_id]
                    else QtCore.Qt.Unchecked,
                )


class Mesh(Item, Settings):
    properties_ui = mesh_Ui_Dialog
    def __init__(
        self, name: str, parent: QtCore.QObject, item_id: int, item_data: dict, data_path: Path
    ) -> None:
        super().__init__(name, parent, item_id, item_data)

        self.data_path = data_path
        self.plane_sets = SetGroup("planes", self, PlaneSet)
        self.trace_sets = SetGroup("traces", self, TraceSet)
        self.point_sets = SetGroup("points", self, PointSet)
        self.section_sets = SetGroup("sections", self, SectionSet)

        self.material_settings = {
            "flatShading": True,
            "color": 0xffffff,
            "metalness": 0.0,
            "roughness": 1.0,
            "vertexColors": True,
            "flatShading": True,
            "wireframe": False
        }

    def add_plane_sets_by_color(self, colors: List) -> List:
        new_sets = []
        for color in colors:
            set_id = self.plane_sets.new_id()
            new_set = self.plane_sets.add_set(
                f"plane set {set_id}",
                set_id,
                QtGui.QColor.fromRgb(
                    int(color, 16)
                ),
            )
            new_sets.append({
                "mesh_id": self.id,
                "set_id": new_set.set_id,
                "set_class": new_set.__class__.__name__.lower(),
                "properties": {"set_color": new_set.color},
            })
        return new_sets

    def get_check_state(self):
        return {
            "visible": bool(self.checkState(0)),
            "id": self.id,
            "plane_sets": self.plane_sets.get_check_state(),
            "trace_sets": self.trace_sets.get_check_state(),
            "point_sets": self.point_sets.get_check_state(),
            "section_sets": self.section_sets.get_check_state(),
        }

    def get_sets(self):
        return {
            "plane_sets": self.plane_sets.serialize(),
            "trace_sets": self.trace_sets.serialize(),
            "point_sets": self.point_sets.serialize(),
            "section_sets": self.section_sets.serialize(),
        }

    def deserialize_sets(self, sets):
        for set, set_items in sets.items():
            getattr(self, set).deserialize(set_items)

    def _get_item_settings(self) -> dict:
        all_settings = super().item_settings
        all_settings["sets"] = self.get_sets()
        return all_settings

    def _set_item_settings(self, data: dict) -> None:
        sets = data.pop("sets", {})
        self.deserialize_sets(sets)
        super()._set_item_settings(data)

    item_settings = property(_get_item_settings, _set_item_settings)

    def set_check_state(self, check_state):
        self.setCheckState(
                0,
                QtCore.Qt.Checked
                if check_state["visible"]
                else QtCore.Qt.Unchecked,
            )
        for item_class in ("plane_sets", "trace_sets", "point_sets", "section_sets"):
            getattr(self, item_class).set_check_state(check_state[item_class])

    def set_statistics(self, data):
        self.data["statistics"] = f"""\
Vertices: {data["vertices"]}
Faces: {data["faces"]}
Edges: {data["edges"]}
Average Orientation: {data["orientation"][0]:06.2f}/{data["orientation"][1]:05.2f}
Center: {data["center"]}
"""
