import os
from os import path
import sys
import traceback
import json
from math import cos, degrees, pi, radians, sin
from pathlib import Path
from typing import Dict, List, Set, Tuple, Union
from urllib.parse import urlparse
import zipfile
import re
import codecs
from datetime import datetime
import pickle

import auttitude as at
import numpy as np
from PyQt5 import QtCore, QtGui, QtWidgets

_translate = QtCore.QCoreApplication.translate

from PyQt5.QtCore import QObject, pyqtSignal as Signal
from PyQt5.QtCore import pyqtSlot as Slot
from PyQt5.QtWebChannel import QWebChannel
from PyQt5.QtWebEngineWidgets import QWebEngineView

from PyQt5.Qt import PYQT_VERSION_STR

print("PyQt version:", PYQT_VERSION_STR)

from capivaras.bridge import Bridge
from capivaras.data_models import Item, ItemSet, TraceSet, Mesh, OPTreeWidget, PlaneSet, SetGroup
from capivaras.op_math import rotation_about_x, rotation_about_z, unRotX
from capivaras.op_plot import StereoPanel, SurfacePanel
from capivaras.tools import (
    CameraToolbar,
    DigitizerToolbar,
    DrawingToolbar
)
from capivaras.ui.capivaras_ui import Ui_MainWindow
from capivaras.ui.capi_settings_ui import Ui_Dialog as SettingsDialog
from capivaras.ui.ui_interface import (
    Settings,
    populate_properties_dialog,
    parse_properties_dialog,
)

import capivaras

capi_qsettings = QtCore.QSettings("Capivaras", "Capivaras")

split_attitude_re = re.compile("[^NESW\.\+\-0-9]+", flags=re.IGNORECASE)

import pandas as pd


utf8_reader = codecs.getreader("utf-8")

def split_attitude(data):
    return split_attitude_re.split(data)


class CapiSettings(Settings):
    def __init__(self) -> None:
        self.reference_settings = {"compass": 2, "axes": 1, "orientation":0}
        self.general_settings = {
            "camera": "Equal-Area",
            "title": "",
            "description": "",
            "author": "",
            "lastsave": "",
        }


class Main(QtWidgets.QMainWindow, Ui_MainWindow):

    max_recent_projects = 5

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
        # TODO: add on loaded?
        # self.bridge.on_ready.append(self.update_capi_settings)
        self.channel.registerObject("bridge", self.bridge)
        self.webview.page().setWebChannel(self.channel)

        self.layersDock = QtWidgets.QDockWidget("Layers", self)
        self.addDockWidget(QtCore.Qt.LeftDockWidgetArea, self.layersDock)
        self.layersTree = OPTreeWidget(self)

        self.layersDock.setWidget(self.layersTree)
        self.layersTree.itemChanged.connect(self.update_item_visibility)

        # self.layersTree.itemChanged.connect(self.update_digitizer_toolbar)

        self.camera_toolbar = CameraToolbar("camera", self)
        self.addToolBar(self.camera_toolbar)

        self.camera_toolbar.camera_group.triggered.connect(self.change_camera)

        self.drawing_toolbar = DrawingToolbar("drawing", self)
        self.addToolBar(self.drawing_toolbar)

        self.drawing_toolbar.tool_group.triggered.connect(self.change_tool)

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
            lambda: self.import_model_dialog("Import Mesh", None, create_default=True)
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

        self.actionReload.triggered.connect(self.reload_webview)
        self.actionSet_orientation.triggered.connect(self.set_orientation)
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
        self.layersTree.customContextMenuRequested.connect(self.tree_context_menu)

        self.recent_projects = []
        for i in range(self.max_recent_projects):
            self.recent_projects.append(
                QtWidgets.QAction(
                    self, visible=False, triggered=self.open_recent_project
                )
            )

        for i in range(self.max_recent_projects):
            self.menuFile.insertAction(
                self.actionSave, self.recent_projects[i]
            )

        self.recent_projects_separator = self.menuFile.insertSeparator(
            self.actionSave
        )
        self.recent_projects_separator.setVisible(False)

        self.actionNew.triggered.connect(self.new_project)
        self.actionSave.triggered.connect(self.save_project_dialog)
        self.actionSave_as.triggered.connect(self.save_project_as_dialog)
        self.actionOpen.triggered.connect(self.open_project_dialog)

        self.Ri = np.eye(3)

        self.id_counter = 0

        # self.os = openstereo_Main()
        # self.os.closeEvent = lambda e: None
        # self.os.add_plots()
        # self.os.show()

        # region defaults
        self.current_plane_set = None
        self.current_trace_set = None
        self.current_point_set = None
        self.current_section_set = None

        # taken from matplotlib... Do these work for this?
        self.DEFAULT_COLOR_CYCLE = [
            0x1F77B4,
            0xFF7F0E,
            0x2CA02C,
            0xD62728,
            0x9467BD,
            0x8C564B,
            0xE377C2,
            0x7F7F7F,
            0xBCBD22,
            0x17BECF,
        ]

        self.DEFAULT_PLANE_SET = (
            "plane set 1",
            1,
            QtGui.QColor.fromRgb(self.DEFAULT_COLOR_CYCLE[0]),
        )
        self.DEFAULT_TRACE_SET = (
            "trace set 1",
            1,
            QtGui.QColor.fromRgb(self.DEFAULT_COLOR_CYCLE[0]),
        )
        self.DEFAULT_POINT_SET = (
            "point set 1",
            1,
            QtGui.QColor.fromRgb(self.DEFAULT_COLOR_CYCLE[0]),
        )
        self.DEFAULT_SECTION_SET = (
            "section set 1",
            1,
            QtGui.QColor.fromRgb(self.DEFAULT_COLOR_CYCLE[0]),
        )

        self.loading = False

        self.old_project = None
        self.current_project = None
        self.update_recent_projects()

        self.dispatch_callback = {}

        # endregion

    def reload_webview(self):
        self.webview.reload()
        self.bridge.ready_queue.append(self.reload_all)

    def new_project(self):
        self.remove_all()
        self.current_project = None
        self.old_project = None

    def remove_all(self):
        for index in range(self.layersTree.topLevelItemCount() - 1, -1, -1):
            item = self.layersTree.topLevelItem(index)
            self.layersTree.takeTopLevelItem(index)
        self.clear_plot()

    def clear_plot(self):
        self.webview.reload()
        self.statusBar().showMessage(_translate("main", "Ready"))

    def open_project_dialog(self):
        fname, extension = QtWidgets.QFileDialog.getOpenFileName(
            self,
            _translate("main", "Open project"),
            filter="Capivaras Project Files (*.capivaras);;All Files (*.*)",
        )  # noqa: E501
        if not fname:
            return
        def deferred():
            self.open_project(fname)
            self.update_current_project(fname)
            self.statusBar().showMessage(
                _translate("main", "Loaded project from {}").format(fname)
            )
        self.bridge.ready_queue.append(deferred)
        self.new_project()
        # self.set_title()

    def save_project_dialog(self):
        if self.current_project is None:
            fname, extension = QtWidgets.QFileDialog.getSaveFileName(
                self,
                _translate("main", "Save project"),
                filter="Capivaras Project Files (*.capivaras);;All Files (*.*)",
            )  # noqa: E501
            if not fname:
                return
            self.update_current_project(fname)

        def deferred():
            self.save_project(Path(self.current_project))
            self.statusBar().showMessage(
                _translate("main", "Saved project to {}").format(
                    self.current_project
                )
            )

        self.dispatch_callback["serialize_mesh_data"] = deferred

        self.bridge.dispatch_js.emit(
            {
                "action": "serializeMeshData",
            }
        )
        # self.set_title()

    def save_project_as_dialog(self):
        fname, extension = QtWidgets.QFileDialog.getSaveFileName(
            self,
            _translate("main", "Save project"),
            filter="Capivaras Project Files (*.capivaras);;All Files (*.*)",
        )  # noqa: E501
        if not fname:
            return
        self.old_project = self.current_project
        self.update_current_project(fname)

        self.statusBar().showMessage(
            _translate("main", "Preparing data...")
        )

        def deferred():
            self.save_project(Path(fname))
            self.statusBar().showMessage(
                _translate("main", "Saved project to {}").format(
                    self.current_project
                )
            )

        self.dispatch_callback["serialize_mesh_data"] = deferred

        self.bridge.dispatch_js.emit(
            {
                "action": "serializeMeshData",
            }
        )
        # self.set_title()

    def update_current_project(self, fname):
        self.current_project = fname

        projects = capi_qsettings.value("recentProjectList", [])

        try:
            projects.remove(fname)
        except ValueError:
            pass

        projects.insert(0, fname)
        del projects[self.max_recent_projects :]

        capi_qsettings.setValue("recentProjectList", projects)
        self.update_recent_projects()

    # https://github.com/Werkov/PyQt4/blob/master/examples/mainwindows/recentfiles.py
    def update_recent_projects(self):
        projects = capi_qsettings.value("recentProjectList", [])

        num_recent_projects = min(len(projects), self.max_recent_projects)
        for i in range(num_recent_projects):
            text = path.splitext(path.basename(projects[i]))[0]
            self.recent_projects[i].setText(text)
            self.recent_projects[i].setData(projects[i])
            self.recent_projects[i].setVisible(True)

        for j in range(num_recent_projects, self.max_recent_projects):
            self.recent_projects[j].setVisible(False)

        self.recent_projects_separator.setVisible(num_recent_projects > 0)

    def open_recent_project(self):
        action = self.sender()
        if action:
            fname = action.data()

            def deferred():
                self.open_project(fname)
                self.update_current_project(fname)
                self.statusBar().showMessage(
                    _translate("main", "Loaded project from {}").format(fname)
                )
            self.bridge.ready_queue.append(deferred)
            self.new_project()
            # self.set_title()

    def save_project(self, fname: Path) -> None:
        czf = zipfile.ZipFile(fname, mode="w")
        self.capi_settings.general_settings["lastsave"] = str(datetime.now())
        project_data = {
            "global_settings": self.capi_settings.item_settings,
            "version": capivaras.__version__,
            "id_counter": self.id_counter,
            "items": [],
        }
        project_dir = fname.parent
        if self.old_project is not None:
            old_project_dir = Path(self.old_project).parent
        else:
            old_project_dir = None
        item_settings_fnames = set()
        for item in self.items:
            self.save_project_item(
                item,
                project_data,
                czf,
                project_dir,
                old_project_dir,
                item_settings_fnames,
            )
        czf.writestr("project_data.json", json.dumps(project_data, indent=3))
        czf.close()

    def save_project_item(
        self,
        item,
        data,
        czf,
        project_dir,
        old_project_dir,
        item_settings_fnames,
    ):
        item_path = getattr(item, "data_path", None)
        if item_path is not None:
            item_fname = item_path.name
            name = item_path.stem
            ext = item_path.suffix

        item_settings_name = (
            name if item_path is not None else item.text(0)
        )
        item_settings_fname = item_settings_name + ".capyr"
        item_binary_fname = item_settings_name + ".pickle"
        i = 1
        while item_settings_fname in item_settings_fnames:
            item_settings_fname = "{}({}){}".format(
                item_settings_name, i, ".capyr"
            )
            item_binary_fname = "{}({}){}".format(
                item_settings_name, i, ".pickle"
            )
            i += 1
        item_settings_fnames.add(item_settings_fname)

        czf.writestr(
            item_settings_fname, json.dumps(item.item_settings, indent=2)
        )
        with czf.open(item_binary_fname, "w") as f:
            pickle.dump(item.binary_data, f)

        if item_path is not None:
            item_path = item_path.relative_to(
                project_dir
            )
        data["items"].append(
            {
                "name": item.text(0),
                "path": str(item_path),
                "id": getattr(item, "id", None),
                "layer_settings_file": item_settings_fname,
                "layer_data_file": item_binary_fname,
                "checked": bool(item.checkState(0)),
                "checked_items": item.get_check_state(),
                "layer_data":item.data,
            }
        )

    def open_project(self, fname, ask_for_missing=False):
        czf = zipfile.ZipFile(fname, mode="r")
        project_data = json.load(utf8_reader(czf.open("project_data.json")))
        project_dir = path.dirname(fname)
        self.capi_settings.item_settings = project_data["global_settings"]
        self.id_counter = project_data.get("id_counter", 0)

        found_dirs = {}
        self.loading = True

        for data in project_data["items"]:
            self.open_project_item(
                data,
                self.layersTree,
                found_dirs,
                ask_for_missing,
                czf,
                project_dir,
            )

        self.loading = False
        czf.close()

    def open_project_item(
        self,
        data,
        parent,
        found_dirs,
        ask_for_missing,  # TODO: use this
        czf,
        project_dir,
    ):
        item_path = data.get("path", None)
        item_id = data.get("id", None)
        item_subitems = data.get("items", None)

        if item_path is not None:  # item is a DataItem
            item_basename = path.basename(item_path)
            item_fname, ext = path.splitext(item_basename)
            item_settings_name = data.get(
                "layer_settings_file", data["name"] + ".capyr"
            )
            item_binary_fname = data.get(
                "layer_data_file", data["name"] + ".capyr"
            )
            item_file = path.normpath(
                    path.join(project_dir, data["path"])
                )
            if not path.exists(item_file):
                for original_dir, current_dir in list(found_dirs.items()):
                    possible_path = path.normpath(
                        path.join(
                            current_dir,
                            path.relpath(item_file, original_dir),
                        )
                    )
                    if path.exists(possible_path):
                        item_file = possible_path
                        break
                else:
                    fname, extension = QtWidgets.QFileDialog.getOpenFileName(  # noqa: E501
                        self,
                        _translate(
                            "main", "Set data source for {}"
                        ).format(data["name"]),
                    )
                    if not fname:
                        return None
                    found_dirs[path.dirname(item_file)] = path.dirname(
                        fname
                    )
                    item_file = fname

        else:
            item_settings_name = data.get(
                "layer_settings_file", data["name"] + ".capyr"
            )
            item_file = None
        item_settings = json.load(
            utf8_reader(czf.open(item_settings_name))
        )
        item_binary_data = pickle.load(
            czf.open(item_binary_fname)
        )
        if item_file is not None:
            item_data = data["layer_data"]
        else:
            item_data = None

        item = self.import_model(
            fname=item_file,
            item_name=data["name"],
            item_id=item_id,
            item_parent=parent,
            item_data=item_data,
            parameters=item_data["parameters"],
            create_default=False
        )


        item.item_settings = item_settings
        item.binary_data = item_binary_data
        item.set_check_state(data["checked_items"])

        return item

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
        url, extension = QtWidgets.QFileDialog.getOpenFileUrl(self, dialog_title)

        url_path = url.toLocalFile()
        if not url_path:
            return
        url_path = url.toLocalFile()
        self.import_model(
            url_path,
            parameters=parameters,
            item_id=item_id,
            create_default=create_default,
        )


        self.update_edit_state()

    def import_model(
        self,
        fname: str,
        item_name: str = None,
        parameters: dict = None,
        item_id: int = None,
        item_parent: QObject = None,
        item_data: Dict = None,
        create_default: bool = False,
    ) -> Item:
        if item_id is None:
            item_id = self.assign_id()
        if parameters is None:
            parameters = {}
        if item_name is None:
            item_name = Path(fname).name
        if item_parent is None:
            item_parent = self.layersTree
        if item_data is None:
            item_data={"id": item_id, "parameters": parameters, "statistics":"None"}

        parameters["item_id"] = item_id
        self.loading = True
        item = Mesh(
            name=item_name,
            parent=item_parent,
            item_id=item_id,
            item_data=item_data,
            data_path=Path(fname)
        )
        if create_default:
            plane_set = item.plane_sets.add_set(
                *self.DEFAULT_PLANE_SET, edit_state=False
            )
            trace_set = item.trace_sets.add_set(
                *self.DEFAULT_TRACE_SET, edit_state=False
            )
            point_set = item.point_sets.add_set(
                *self.DEFAULT_POINT_SET, edit_state=False
            )
            section_set = item.section_sets.add_set(
                *self.DEFAULT_SECTION_SET, edit_state=False
            )
            # TODO: change this on project support
            if self.current_plane_set is None:
                plane_set.edit_state = True
                plane_set.update_icon()
                self.current_plane_set = plane_set
            if self.current_trace_set is None:
                trace_set.edit_state = True
                trace_set.update_icon()
                self.current_trace_set = trace_set
            if self.current_point_set is None:
                point_set.edit_state = True
                point_set.update_icon()
                self.current_point_set = point_set
            if self.current_section_set is None:
                section_set.edit_state = True
                section_set.update_icon()
                self.current_section_set = section_set

        self.loading = False
        self.bridge.load_model.emit(
            QtCore.QUrl.fromLocalFile(fname), parameters
        )

        self.update_edit_state()
        return item

    def reload_all(self) -> None:
        for item in self.items:
            self.statusBar().showMessage(
                "Loading model {}...".format(item.data_path.name)
            )
            self.bridge.load_model.emit(
                QtCore.QUrl.fromLocalFile(str(item.data_path)),
                item.data["parameters"],
            )

    def set_orientation(self) -> None:
        data, ok = QtWidgets.QInputDialog.getText(
            self, "Set viewer orientation", _translate("main", "Attitude:")
        )

        if ok:
            self.bridge.dispatch_js.emit(
                {
                    "action": "setOrientation",
                    "params": {
                        "orientation": [float(d) for d in split_attitude(data)],
                    }
                }
            )

    def export_data(self, data, fname=None, dialog_title="Save data", format="json", filter=None, params=None):
        if fname is None:
            fname = QtWidgets.QFileDialog.getSaveFileName(self, dialog_title, filter=filter)[0]
        if not fname:
            return
        if format == "json":
            with open(fname, "w") as f:
                json.dump(data, f, indent=2)
        elif format == "xlsx":
            mesh = self.select_mesh_by_id(params["mesh_id"])
            with pd.ExcelWriter(fname) as writer:
                for set_id, df_data in data.items():
                    set_item = mesh.plane_sets.get_item_by_id(int(set_id))
                    if not df_data or set_item is None: continue
                    name = set_item.text(0)
                    df = pd.DataFrame(df_data)
                    if params["header_order"] is not None:
                        df = df[params["header_order"]]
                    df.to_excel(writer, sheet_name=name, index=False, freeze_panes=(1,0))
                    sheet = writer.sheets[name]
                    sheet.autofilter(0, 0, sheet.dim_rowmax, sheet.dim_colmax)
                    for i, (width, h_width) in enumerate(
                        zip(
                            df.applymap(lambda v: len(str(v))).apply(max),
                            df.columns.map(lambda v: len(str(v)))
                        )
                    ):
                        sheet.set_column(i, i, max(width, h_width+2) + 2)

    def deferred_import(self) -> None:
        for fname, parameters in self.import_queue:
            self.statusBar().showMessage("Loading model {}...".format(fname))
            self.import_model(fname, parameters)

    def change_camera(self, event: QtCore.QEvent) -> None:
        self.bridge.update_capi_state.emit({"camera_type": event.data()})

    def change_tool(self, event: QtCore.QEvent) -> None:
        self.bridge.update_capi_state.emit({"selected_tool": event.data()})

    def update_capi_settings(self) -> None:
        self.bridge.update_capi_settings.emit(self.capi_settings.item_settings)

    def update_item_visibility(self) -> None:
        if self.loading:
            return
        visibility_state = [
            item.get_check_state()
            for item in self.items
        ]
        self.bridge.dispatch_js.emit(
            {
                "action": "updateVisibility",
                "params": {
                    "visibility_state": visibility_state,
                }
            }
        )

    def update_edit_state(self) -> None:
        edit_state = {
            "current_mesh": 0,
            "plane_set": self.current_plane_set.set_id
            if self.current_plane_set is not None
            else None,
            "trace_set": self.current_trace_set.set_id
            if self.current_trace_set is not None
            else None,
            "point_set": self.current_point_set.set_id
            if self.current_point_set is not None
            else None,
            "section_set": self.current_section_set.set_id
            if self.current_section_set is not None
            else None,
        }
        self.bridge.update_capi_state.emit({"edit_state": edit_state})

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

    def dispatch_process(self, data):
        action = data["action"]
        if action == "add_plane_sets_by_color":
            new_sets = self.select_mesh_by_id(data["mesh_id"]).add_plane_sets_by_color(
                data["params"]
            )
            for new_set in new_sets:
                self.bridge.update_set_properties.emit(new_set)
        elif action == "change_tool":
            getattr(self.drawing_toolbar, data["params"]).setChecked(True)
        elif action == "update_mesh_sets":
            self.update_mesh_sets(self.select_mesh_by_id(data["params"]))
        elif action == "update_mesh_statistics":
            self.select_mesh_by_id(data["params"]["mesh_id"]).set_statistics(data["params"]["data"])
        elif action == "export_trace_set":
            self.export_data(data["params"]["data"], format="json")
        elif action == "export_plane_set":
            self.export_data(data["params"]["data"], format="xlsx", filter="Spreadsheet (*.xlsx)", params=data["params"])
        elif action == "toggle_slope":
            slope = self.get_mesh(self.get_selected())
            if slope is not None:
                slope.setCheckState(0, QtCore.Qt.Unchecked if slope.checkState(0) else QtCore.Qt.Checked)
        elif action == "serialize_mesh_data":
            for slope_id, slope_data in data["params"]["data"]:
                self.select_mesh_by_id(slope_id).binary_data = slope_data
        elif action == "deserialize_mesh_data":
            self.bridge.dispatch_js.emit(
                {
                    "action": "deserializeMeshData",
                    "params": {
                        "mesh_id": data["params"]["mesh_id"],
                        "data": self.select_mesh_by_id(data["params"]["mesh_id"]).binary_data
                    }
                }
            )
        else:
            print(data)

        if action in self.dispatch_callback:
            self.dispatch_callback[action]()
            del self.dispatch_callback[action]

    def update_item_properties(self) -> None:
        item_properties = {}
        for index in range(self.layersTree.topLevelItemCount()):
            item = self.layersTree.topLevelItem(index)
            item_properties[str(item.id)] = item.item_settings
        self.bridge.update_item_properties.emit(item_properties)

    def update_plane_visibility(self, visible: bool) -> None:
        item = self.get_selected()
        item.display_planes = visible
        self.update_set_properties(item)


    def update_set_properties(self, item: ItemSet) -> None:
        self.bridge.update_set_properties.emit(
            {
                "mesh_id": self.get_mesh(item).id,  # TODO: change this to item_id?
                "set_id": item.set_id,
                "set_class": item.__class__.__name__.lower(),
                "properties": {"set_color": item.color, "planes_visible": item.display_planes},
            }
        )

    def update_mesh_sets(self, mesh: Mesh) -> None:
        for set_type in (
            mesh.plane_sets,
            mesh.trace_sets,
            mesh.point_sets,
            mesh.section_sets
        ):
            for item in set_type.items:
                self.update_set_properties(item)

    def detect_sets(self, *, item: Mesh = None) -> None:
        if item is None:
            item = self.get_selected()
        self.bridge.dispatch_js.emit(
            {
                "mesh_id": item.id,  # TODO: change this to item_id?
                "action": "detectSets",
            }
        )

    def classify_sets(self, *, item: Mesh = None) -> None:
        if item is None:
            item = self.get_selected()
        self.bridge.dispatch_js.emit(
            {
                "mesh_id": item.id,  # TODO: change this to item_id?
                "action": "selectSetFromColor",
                "params": list(item.plane_sets.set_ids)
            }
        )

    def export_trace_set(self, *, item: TraceSet = None) -> None:
        if item is None:
            item = self.get_selected()
        self.bridge.dispatch_js.emit(
            {
                "mesh_id": self.get_mesh(item).id,
                "action": "exportSetTraces",
                "params": {
                    "set_id": item.set_id,
                }
            }
        )

    def export_plane_set(self, *, item: PlaneSet = None) -> None:
        if item is None:
            item = self.get_selected()
        mesh = self.get_mesh(item)
        sets = [sid for sid, check in mesh.plane_sets.get_check_state()["items"] if check]
        self.bridge.dispatch_js.emit(
            {
                "mesh_id": self.get_mesh(item).id,
                "action": "exportSetPlanes",
                "params": {
                    "set_id": sets,
                }
            }
        )

    def update_planes(self, *, item: PlaneSet = None) -> None:
        if item is None:
            item = self.get_selected()
        self.bridge.dispatch_js.emit(
            {
                "mesh_id": self.get_mesh(item).id,
                "action": "updatePlanes",
                # "params": {
                #     "set_id": item.set_id,
                # }
            }
        )

    def update_trace_nodes(self, *, item: PlaneSet = None) -> None:
        if item is None:
            item = self.get_selected()
        self.bridge.dispatch_js.emit(
            {
                "mesh_id": self.get_mesh(item).id,
                "action": "updateNodes",
                # "params": {
                #     "set_id": item.set_id,
                # }
            }
        )

    # region ctx
    def expand_data(self, expand: bool = True) -> None:
        for index in range(self.layersTree.topLevelItemCount()):
            item = self.layersTree.topLevelItem(index)
            self.expand_item(item, expand)

    # region generic item ops
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
            self.layersTree.insertTopLevelItem(min(n_items - 1, index + 1), item)
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
        while isinstance(item, SetGroup):  # add extra filters for this in the future?
            item = item.parent()
        name, ok = QtWidgets.QInputDialog.getText(
            self,
            _translate("main", "Rename Item"),
            _translate("main", "Name:"),
            QtWidgets.QLineEdit.Normal,
            item.text(0),
        )
        if ok:
            self.statusBar().showMessage(
                _translate("main", "Renamed item {} to {}").format(item.text(0), name)
            )
            item.setText(0, name)

    # endregion
    def properties_dataitem(self) -> None:
        item = self.get_mesh(self.get_selected())
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
            populate_properties_dialog(item.dialog_ui, item, update_data_only=True)
        item.dialog.show()

    def setcolor_set(self) -> None:
        item = self.get_selected()
        # http://www.qtcentre.org/threads/16310-Closing-all-of-the-mainWindow-s-child-dialogs
        col = QtWidgets.QColorDialog.getColor()
        if col.isValid():
            item.set_color(col)
            self.update_set_properties(item)

    def add_set(self, *, item=None) -> None:
        if item is None:
            item = self.get_selected()
            while not isinstance(item, SetGroup):
                item = item.parent()
        # If set_id is None: dammm
        set_id = item.new_id()
        new_set = item.add_set(
            f"set {set_id}",
            set_id,
            QtGui.QColor.fromRgb(
                self.DEFAULT_COLOR_CYCLE[set_id % len(self.DEFAULT_COLOR_CYCLE)]
            ),
        )
        self.update_set_properties(new_set)
        # self.DEFAULT_PLANE_SET = ("plane set 1", 1, QtGui.QColor(255, 0, 0))

    def edit_set(self) -> None:
        item = self.get_selected()
        if isinstance(item, PlaneSet):
            if self.current_plane_set is not None:
                self.current_plane_set.edit_state = False
                self.current_plane_set.update_icon()
            self.current_plane_set = item
        else:  # TraceSet
            if self.current_trace_set is not None:
                self.current_trace_set.edit_state = False
                self.current_trace_set.update_icon()
            self.current_trace_set = item

        item.edit_state = True
        item.update_icon()

        self.update_edit_state()

    def tree_context_menu(self, position):
        items = self.get_selected(multiple_selection=True)
        if items is None:
            return
        menu = QtWidgets.QMenu()

        rename_action = menu.addAction(_translate("main", "Rename..."))
        # if len(items) == 1:
        item = items[0]

        menu.addSeparator()
        properties_action = menu.addAction(_translate("main", "Properties"))
        if isinstance(item, ItemSet):
            set_color_action = menu.addAction(_translate("main", "Change set color"))
        menu.addSeparator()
        if isinstance(item, (ItemSet, SetGroup)):
            add_set_action = menu.addAction(_translate("main", "Add set"))
            menu.addSeparator()
        if isinstance(item, ItemSet):
            edit_set_action = menu.addAction(_translate("main", "Edit set"))
            menu.addSeparator()
        if isinstance(item, TraceSet):
            update_trace_nodes_action = menu.addAction(_translate("main", "Update Topology markers"))
            update_trace_nodes_action.triggered.connect(self.update_trace_nodes)
            export_set_action = menu.addAction(_translate("main", "Export set"))
            export_set_action.triggered.connect(self.export_trace_set)
            menu.addSeparator()
        if isinstance(item, PlaneSet):
            update_planes_action = menu.addAction(_translate("main", "Update planes"))
            update_planes_action.triggered.connect(self.update_planes)
            display_plane_toggle = menu.addAction(_translate("main", "Display fit plane"))
            display_plane_toggle.setCheckable(True)
            display_plane_toggle.setChecked(item.display_planes)
            display_plane_toggle.toggled.connect(self.update_plane_visibility)
            menu.addSeparator()
        if isinstance(item, Mesh):
            detect_sets_action = menu.addAction(
                _translate("main", "Detect Plane Set Colors")
            )
            classify_sets_action = menu.addAction(
                _translate("main", "Classify Plane Sets by Color")
            )
            update_planes_action = menu.addAction(_translate("main", "Update planes"))
            update_trace_nodes_action = menu.addAction(_translate("main", "Update Topology markers"))
            export_plane_data_action = menu.addAction(_translate("main", "Export Enabled Plane Sets"))
            export_plane_data_action.triggered.connect(self.export_plane_set)
            update_trace_nodes_action.triggered.connect(self.update_trace_nodes)
            update_planes_action.triggered.connect(self.update_planes)
            menu.addSeparator()

        #     menu.addSeparator()
        # menu.addAction("Export data")
        menu.addSeparator()
        up_action = menu.addAction(_translate("main", "Move item up"))
        down_action = menu.addAction(_translate("main", "Move item down"))
        top_action = menu.addAction(_translate("main", "Move item to top"))
        bottom_action = menu.addAction(_translate("main", "Move item to botton"))
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
            properties_action.triggered.connect(self.properties_dataitem)
            if isinstance(item, Mesh):
                detect_sets_action.triggered.connect(self.detect_sets)
                classify_sets_action.triggered.connect(self.classify_sets)
            if isinstance(item, ItemSet):
                set_color_action.triggered.connect(self.setcolor_set)

            if isinstance(item, (ItemSet, SetGroup)):
                add_set_action.triggered.connect(self.add_set)

            if isinstance(item, ItemSet):
                edit_set_action.triggered.connect(self.edit_set)

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
            while not (isinstance(item, (Item, ItemSet, SetGroup))):
                item = item.parent()
            if item not in items:
                items.append(item)
        if multiple_selection:
            return items
        else:
            return items[0]

    def get_mesh(self, item: Union[Item, ItemSet, Mesh]) -> Mesh:
        while not isinstance(item, Mesh):  # Or group, if added
            item = item.parent()
        return item

    def select_mesh_by_id(self, id: int) -> Mesh:
        for item in self.items:
            if item.id == id:
                return item
        else:
            return None

    # endregion
