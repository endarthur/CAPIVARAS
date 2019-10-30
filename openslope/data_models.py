from typing import Type

import numpy as np
from PyQt5 import QtWidgets, QtCore, QtGui
from PyQt5.QtCore import pyqtSignal as Signal, pyqtSlot as Slot  # type: ignore


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
        )
        self.setExpanded(True)

        self.vertices: np.ndarray = None
        self.indices: np.ndarray = None


class Plane(Item):
    pass


class Trace(Item):
    pass


class ItemSet(QtWidgets.QTreeWidgetItem):
    item_class = Item

    def __init__(
        self,
        name: str,
        parent: QtCore.QObject,
        item_id: int,
        color: QtGui.QColor,
    ):
        super().__init__(parent)
        self.id = item_id

        self.setText(0, name)
        self.setCheckState(0, QtCore.Qt.Checked)
        self.setFlags(
            QtCore.Qt.ItemIsUserCheckable
            | QtCore.Qt.ItemIsEnabled
            | QtCore.Qt.ItemIsSelectable
            | QtCore.Qt.ItemIsDropEnabled
        )
        self.setExpanded(True)

        self.color = color

    def set_color(self, color: QtGui.QColor) -> None:
        self.color = color
        # update icon
        pixmap = QtGui.QPixmap(32, 32)
        pixmap.fill(self.color)
        self.setIcon(0, QtGui.QIcon(pixmap))

    def add_item(self, name: str, item_id: int) -> Item:
        return self.item_class(name, self, item_id)


class PlaneSet(ItemSet):
    item_class = Plane


class TraceSet(ItemSet):
    item_class = Trace


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

    def add_set(self, name: str, set_id: int, color: QtGui.QColor) -> ItemSet:
        return self.set_class(name, self, set_id, color)


class Mesh(Item):
    def __init__(
        self, name: str, parent: QtCore.QObject, item_id: int
    ) -> None:
        super().__init__(name, parent, item_id)

        self.plane_sets = SetGroup("planes", self, PlaneSet)
        self.trace_sets = SetGroup("planes", self, TraceSet)
