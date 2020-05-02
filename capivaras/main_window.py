import os
import sys
import traceback
from math import cos, degrees, pi, radians, sin
from pathlib import Path
from typing import List, Tuple
from urllib.parse import urlparse

import auttitude as at
import numpy as np
from PyQt5 import QtCore, QtGui, QtWidgets

_translate = QtCore.QCoreApplication.translate

from PyQt5.QtCore import pyqtSignal as Signal
from PyQt5.QtCore import pyqtSlot as Slot
from PyQt5.QtWebChannel import QWebChannel
from PyQt5.QtWebEngineWidgets import QWebEngineView

from PyQt5.Qt import PYQT_VERSION_STR
print("PyQt version:", PYQT_VERSION_STR)

from capivaras.bridge import Bridge
from capivaras.data_models import Item, Mesh, OPTreeWidget
from capivaras.op_math import rotation_about_x, rotation_about_z, unRotX
from capivaras.op_plot import StereoPanel, SurfacePanel
from capivaras.tools import (
    CameraToolbar,
    DigitizerToolbar,
    PlaneDigitizer,
    TraceDigitizer,
)
from capivaras.ui.capivaras_ui import Ui_MainWindow
from capivaras.ui.capi_settings_ui import Ui_Dialog as SettingsDialog
from capivaras.ui.ui_interface import (
    Settings,
    populate_properties_dialog,
    parse_properties_dialog,
)


class CapiSettings(Settings):
    def __init__(self) -> None:
        self.reference_settings = {"compass": 2, "axes": 1}


class Main(QtWidgets.QMainWindow, Ui_MainWindow):
    def __init__(self) -> None:
        super(Main, self).__init__()
        self.setupUi(self)
        self.capi_settings = CapiSettings()

        self.webview = QWebEngineView()
        self.webview.page().profile().clearHttpCache()
        self.webview.load(
            # QtCore.QUrl(
            #     "https://craig.is/killing/mice"
            # )
            # QtCore.QUrl(
            #     "http://localhost:8000/viewer/webgl_loader_ply_qt.html"
            # )
            # QtCore.QUrl.fromLocalFile(
            #     os.path.abspath("viewer/webgl_loader_ply_qt.html")
            # )
            QtCore.QUrl.fromLocalFile(os.path.abspath("viewer/viewer.html"))
        )
        # self.webview.show()

        lay = QtWidgets.QVBoxLayout(self.centralwidget)
        lay.addWidget(self.webview)

        # self.stereoPlot = StereoPanel(self.stereoWidget)

        self.channel = QWebChannel()
        self.bridge = Bridge(self)
        self.bridge.on_ready.append(self.update_capi_settings)
        self.bridge.on_ready.append(self.reload_all)
        # TODO: add on loaded?
        # self.bridge.on_ready.append(self.update_capi_settings)
        self.channel.registerObject("bridge", self.bridge)
        self.webview.page().setWebChannel(self.channel)

        self.layersDock = QtWidgets.QDockWidget("Layers", self)
        self.addDockWidget(QtCore.Qt.LeftDockWidgetArea, self.layersDock)
        self.layersTree = OPTreeWidget(self)
        self.layersDock.setWidget(self.layersTree)

        # TODO: connect these... something like update toolbars?
        self.plane_toolbar = PlaneDigitizer("planes", self, tool_checked=True)
        self.addToolBar(self.plane_toolbar)
        self.trace_toolbar = TraceDigitizer("traces", self)
        self.addToolBar(self.trace_toolbar)

        self.layersTree.itemChanged.connect(self.update_digitizer_toolbar)

        self.camera_toolbar = CameraToolbar("camera", self)
        self.addToolBar(self.camera_toolbar)

        self.camera_toolbar.camera_group.triggered.connect(self.change_camera)

        # region plot widgets
        # self.stereoDock = QtWidgets.QDockWidget("Stereonet", self)
        # self.addDockWidget(QtCore.Qt.LeftDockWidgetArea, self.stereoDock)
        # self.stereoWidget = QtWidgets.QWidget(self)
        # self.stereoDock.setWidget(self.stereoWidget)

        # self.stereoPlot = StereoPanel(self.stereoWidget)

        # self.plotDock = QtWidgets.QDockWidget("Plot", self)
        # self.addDockWidget(QtCore.Qt.LeftDockWidgetArea, self.plotDock)
        # self.plotWidget = QtWidgets.QWidget(self)
        # self.plotDock.setWidget(self.plotWidget)

        # self.surfacePlot = SurfacePanel(self.plotWidget)

        # self.profileDock = QtWidgets.QDockWidget("Profile", self)
        # self.addDockWidget(QtCore.Qt.LeftDockWidgetArea, self.profileDock)
        # self.profileWidget = QtWidgets.QWidget(self)
        # self.profileDock.setWidget(self.profileWidget)

        # self.profilePlot = SurfacePanel(self.profileWidget)
        # endregion

        self.menuPanels.addAction(self.layersDock.toggleViewAction())
        # self.menuPanels.addAction(self.stereoDock.toggleViewAction())
        # self.menuPanels.addAction(self.plotDock.toggleViewAction())
        # self.menuPanels.addAction(self.profileDock.toggleViewAction())

        self.actionImport_Mesh.triggered.connect(
            lambda: self.import_model_dialog(
                "Import Mesh", None, create_default=True
            )
        )
        self.actionImport_Mesh_East_North_Up.triggered.connect(
            lambda: self.import_model_dialog(
                "Import Mesh (East, North, Up)",
                {"xRotation": -pi / 2},
                create_default=True,
            )
        )
        self.actionImport_Mesh_West_Down_South.triggered.connect(
            lambda: self.import_model_dialog(
                "Import Mesh (West, Down, South)",
                {"zRotation": pi},
                create_default=True,
            )
        )

        self.actionProjectSettings.triggered.connect(self.show_settings_dialog)

        self.actionReload.triggered.connect(self.webview.reload)
        self.statusBar().showMessage("Loading viewer...")

        self.webview.loadFinished.connect(
            lambda ok: self.statusBar().showMessage("Ready.")
        )
        self.import_queue: List[Tuple[str, dict]] = []
        self.webview.loadFinished.connect(self.deferred_import)

        self.progress = QtWidgets.QProgressBar(self)
        self.progress.setMaximum(100)
        self.statusBar().addPermanentWidget(self.progress)

        self.layersTree.setContextMenuPolicy(QtCore.Qt.CustomContextMenu)
        self.layersTree.customContextMenuRequested.connect(
            self.tree_context_menu
        )

        self.Ri = np.eye(3)

        self.id_counter = 0

        # self.os = openstereo_Main()
        # self.os.closeEvent = lambda e: None
        # self.os.add_plots()
        # self.os.show()

        # region defaults
        self.DEFAULT_PLANE_SET = ("plane set 1", 0, QtGui.QColor(255, 0, 0))
        self.DEFAULT_TRACE_SET = ("trace set 1", 0, QtGui.QColor(0, 0, 255))
        # endregion

    def assign_id(self) -> int:
        item_id = self.id_counter
        self.id_counter += 1
        return item_id

    def import_model_dialog(
        self,
        dialog_title: str = "Import mesh",
        parameters: dict = None,
        item_id: int = None,
        create_default: bool = False,
    ) -> None:
        url, extension = QtWidgets.QFileDialog.getOpenFileUrl(
            self, dialog_title
        )

        url_path = url.path()
        if not url.path():
            return
        url_path = Path(url.path())
        if item_id is None:
            item_id = self.assign_id()
        if parameters is None:
            parameters = {}
            self.Ri = np.eye(3)
        if "xRotation" in parameters:
            self.Ri = rotation_about_x(-parameters["xRotation"])
        elif "zRotation" in parameters:
            self.Ri = rotation_about_z(-parameters["zRotation"])

        self.statusBar().showMessage(
            "Loading model {}...".format(url_path.name)
        )
        item = Mesh(
            url_path.name,
            self.layersTree,
            item_id,
            {"id": item_id, "path": url.path(), "parameters": parameters},
        )
        if create_default:
            item.plane_sets.add_set(*self.DEFAULT_PLANE_SET)
            item.trace_sets.add_set(*self.DEFAULT_TRACE_SET)
        self.bridge.load_model.emit(url, parameters)

    # TODO: merge these, or at least DRY
    def import_model(
        self,
        fname: str,
        parameters: dict = None,
        item_id: int = None,
        create_default: bool = False,
    ) -> None:
        if item_id is None:
            item_id = self.assign_id()
        if parameters is None:
            parameters = {}
            self.Ri = np.eye(3)
        if "xRotation" in parameters:
            self.Ri = rotation_about_x(-parameters["xRotation"])
        elif "zRotation" in parameters:
            self.Ri = rotation_about_z(-parameters["zRotation"])
        parameters["item_id"] = item_id
        item = Mesh(
            Path(fname).name,
            self.layersTree,
            item_id,
            {"id": item_id, "path": fname, "parameters": parameters},
        )
        if create_default:
            item.plane_sets.add_set(*self.DEFAULT_PLANE_SET)
            item.trace_sets.add_set(*self.DEFAULT_TRACE_SET)
        self.bridge.load_model.emit(
            QtCore.QUrl.fromLocalFile(os.path.abspath(fname)), parameters
        )

    def reload_all(self) -> None:
        for item in self.items:
            self.statusBar().showMessage(
                "Loading model {}...".format(Path(item.data["path"]).name)
            )
            self.bridge.load_model.emit(
                QtCore.QUrl.fromLocalFile(item.data["path"]),
                item.data["parameters"],
            )

    def deferred_import(self) -> None:
        for fname, parameters in self.import_queue:
            self.statusBar().showMessage("Loading model {}...".format(fname))
            self.import_model(fname, parameters)

    def update_digitizer_toolbar(self, changed_item, changed_column) -> None:
        items = self.items
        mesh_names = [item.text(0) for item in items]
        self.plane_toolbar.set_mesh_data(mesh_names, items)
        self.trace_toolbar.set_mesh_data(mesh_names, items)

    def change_camera(self, event: QtCore.QEvent) -> None:
        self.bridge.update_capi_state.emit({"camera_type": event.data()})

    def update_capi_settings(self) -> None:
        self.bridge.update_capi_settings.emit(self.capi_settings.item_settings)

    def show_settings_dialog(self) -> None:
        if not hasattr(self, "settings_dialog"):
            self.settings_dialog = QtWidgets.QDialog(self)
            self.settings_dialog_ui = SettingsDialog()
            self.settings_dialog_ui.setupUi(self.settings_dialog)
            self.settings_dialog.accepted.connect(
                lambda: parse_properties_dialog(
                    self.settings_dialog_ui,
                    self.capi_settings,
                    post_hook=(self.update_capi_settings,),
                )
            )
            self.settings_dialog_ui.apply.clicked.connect(
                lambda: parse_properties_dialog(
                    self.settings_dialog_ui,
                    self.capi_settings,
                    post_hook=(self.update_capi_settings,),
                )
            )
            populate_properties_dialog(
                self.settings_dialog_ui,
                self.capi_settings,
                # actions={"unpack": self.unpack_data_dialog},
            )
        else:
            populate_properties_dialog(
                self.settings_dialog_ui,
                self.capi_settings,
                update_data_only=True,
            )
        self.settings_dialog.show()

    @property
    def items(self) -> List[Mesh]:
        return [
            self.layersTree.topLevelItem(index)
            for index in range(self.layersTree.topLevelItemCount())
        ]

    def update_item_properties(self) -> None:
        item_properties = {}
        for index in range(self.layersTree.topLevelItemCount()):
            item = self.layersTree.topLevelItem(index)
            item_properties[str(item.id)] = item.item_settings
        self.bridge.update_item_properties.emit(item_properties)

    # region ctx
    def expand_data(self, expand: bool = True) -> None:
        for index in range(self.layersTree.topLevelItemCount()):
            item = self.layersTree.topLevelItem(index)
            self.expand_item(item, expand)

    def expand_item(self, item: Item, expand: bool) -> None:
        # if isinstance(item, GroupItem):
        #     item.setExpanded(expand)  # is this better?
        #     for i in range(item.childCount() - 1, -1, -1):
        #         subitem = item.child(i)
        #         self.expand_item(subitem, expand)
        # else:
        item.setExpanded(expand)

    def remove_dataitem(self):
        item = self.get_selected()
        parent = item.parent()
        if parent is None:
            index = self.layersTree.indexOfTopLevelItem(item)
            removed_item = self.layersTree.takeTopLevelItem(index)
        else:  # parent is a GroupItem
            index = parent.indexOfChild(item)
            removed_item = parent.takeChild(index)
        return (removed_item, parent, index, item.isExpanded())
        self.statusBar().showMessage(
            _translate("main", "Removed item {}").format(item.text(0))
        )  # FIXME: never reached?

    def up_dataitem(self) -> None:
        item, parent, index, expanded = self.remove_dataitem()
        if parent is None:
            self.layersTree.insertTopLevelItem(max(0, index - 1), item)
        else:
            parent.insertChild(max(0, index - 1), item)
        # item.setExpanded(expanded)

    def down_dataitem(self):
        item, parent, index, expanded = self.remove_dataitem()
        if parent is None:
            n_items = self.layersTree.topLevelItemCount()
            self.layersTree.insertTopLevelItem(
                min(n_items - 1, index + 1), item
            )
        else:
            n_items = parent.childCount()
            parent.insertChild(min(n_items - 1, index + 1), item)
        # item.setExpanded(expanded)

    def bottom_dataitem(self):
        item, parent, index, expanded = self.remove_dataitem()
        if parent is None:
            n_items = self.layersTree.topLevelItemCount()
            self.layersTree.insertTopLevelItem(n_items, item)
        else:
            n_items = parent.childCount()
            parent.insertChild(n_items - 1, item)

    def top_dataitem(self):
        item, parent, index, expanded = self.remove_dataitem()
        if parent is None:
            self.layersTree.insertTopLevelItem(0, item)
        else:
            parent.insertChild(0, item)

    def rename_dataitem(self):
        item = self.get_selected()
        name, ok = QtWidgets.QInputDialog.getText(
            self,
            _translate("main", "Rename Item"),
            _translate("main", "Name:"),
            QtWidgets.QLineEdit.Normal,
            item.text(0),
        )
        if ok:
            self.statusBar().showMessage(
                _translate("main", "Renamed item {} to {}").format(
                    item.text(0), name
                )
            )
            item.setText(0, name)

    def properties_dataitem(self) -> None:
        item = self.get_selected()
        # http://www.qtcentre.org/threads/16310-Closing-all-of-the-mainWindow-s-child-dialogs
        if not hasattr(item, "dialog"):
            item.dialog = QtWidgets.QDialog(self)
            item.dialog_ui = item.properties_ui()
            item.dialog_ui.setupUi(item.dialog)
            item.dialog.setWindowTitle(item.text(0))
            item.dialog.accepted.connect(
                lambda: parse_properties_dialog(
                    item.dialog_ui,
                    item,
                    post_hook=[self.update_item_properties],
                )
            )
            item.dialog_ui.apply.clicked.connect(
                lambda: parse_properties_dialog(
                    item.dialog_ui,
                    item,
                    post_hook=[self.update_item_properties],
                )
            )

            populate_properties_dialog(item.dialog_ui, item)
        else:
            item.dialog.setWindowTitle(item.text(0))
            populate_properties_dialog(
                item.dialog_ui, item, update_data_only=True
            )
        item.dialog.show()

    def tree_context_menu(self, position):
        items = self.get_selected(multiple_selection=True)
        if items is None:
            return
        menu = QtWidgets.QMenu()

        rename_action = menu.addAction(_translate("main", "Rename..."))
        # if len(items) == 1:
        item = items[0]
        if isinstance(item, Mesh):
            properties_action = menu.addAction(
                _translate("main", "Properties")
            )
            menu.addSeparator()
            # menu.addAction("Export data")
        menu.addSeparator()
        up_action = menu.addAction(_translate("main", "Move item up"))
        down_action = menu.addAction(_translate("main", "Move item down"))
        top_action = menu.addAction(_translate("main", "Move item to top"))
        bottom_action = menu.addAction(
            _translate("main", "Move item to botton")
        )
        # menu.addSeparator()
        # group_action = menu.addAction(_translate("main", "Group selected"))
        menu.addSeparator()
        expand_action = menu.addAction(_translate("main", "Expand all"))
        collapse_action = menu.addAction(_translate("main", "Collapse all"))
        menu.addSeparator()
        delete_action = menu.addAction(_translate("main", "Delete item"))

        rename_action.triggered.connect(self.rename_dataitem)
        if len(items) == 1:
            item = items[0]
            if isinstance(item, Mesh):
                properties_action.triggered.connect(self.properties_dataitem)

            up_action.triggered.connect(self.up_dataitem)
            down_action.triggered.connect(self.down_dataitem)
            top_action.triggered.connect(self.top_dataitem)
            bottom_action.triggered.connect(self.bottom_dataitem)

        expand_action.triggered.connect(lambda: self.expand_data(True))
        collapse_action.triggered.connect(lambda: self.expand_data(False))

        menu.exec_(self.layersTree.viewport().mapToGlobal(position))

    def get_selected(self, multiple_selection: bool = False) -> List[Item]:
        selected_items = self.layersTree.selectedItems()
        if not selected_items:
            return None
        # item = item[0]
        items: List[Item] = []  # TODO: this should be a set in OS, prob
        for item in selected_items:
            while not (
                isinstance(item, Mesh)  # or isinstance(item, GroupItem)
            ):
                item = item.parent()
            if item not in items:
                items.append(item)
        if multiple_selection:
            return items
        else:
            return items[0]

    # endregion
