import sys
import os
import traceback
from math import radians, degrees, sin, cos, pi
from urllib.parse import urlparse
from typing import List, Tuple

import numpy as np
from PyQt5 import QtCore, QtGui, QtWidgets
from PyQt5.QtWebEngineWidgets import QWebEngineView
from PyQt5.QtWebChannel import QWebChannel
from PyQt5.QtCore import pyqtSignal as Signal, pyqtSlot as Slot

import auttitude as at

from openslope.ui.openslope_ui import Ui_MainWindow
from openslope.bridge import Bridge
from openslope.op_plot import StereoPanel, SurfacePanel
from openslope.op_math import unRotX, rotation_about_x, rotation_about_z

from openslope.data_models import OPTreeWidget, Mesh

from openslope.tools import DigitizerToolbar, PlaneDigitizer, TraceDigitizer


class Main(QtWidgets.QMainWindow, Ui_MainWindow):
    def __init__(self) -> None:
        super(Main, self).__init__()
        self.setupUi(self)

        self.webview = QWebEngineView()
        self.webview.page().profile().clearHttpCache()
        self.webview.load(
            # QtCore.QUrl(
            #     "https://craig.is/killing/mice"
            # )
            # QtCore.QUrl(
            #     "http://localhost:8000/viewer/webgl_loader_ply_qt.html"
            # )
            QtCore.QUrl.fromLocalFile(
                os.path.abspath("viewer/webgl_loader_ply_qt.html")
            )
        )
        # self.webview.show()

        lay = QtWidgets.QVBoxLayout(self.centralwidget)
        lay.addWidget(self.webview)

        # self.stereoPlot = StereoPanel(self.stereoWidget)

        self.channel = QWebChannel()
        self.bridge = Bridge(self)
        self.channel.registerObject("bridge", self.bridge)
        self.webview.page().setWebChannel(self.channel)

        self.layersDock = QtWidgets.QDockWidget("Layers", self)
        self.addDockWidget(QtCore.Qt.LeftDockWidgetArea, self.layersDock)
        self.layersTree = OPTreeWidget(self)
        self.layersDock.setWidget(self.layersTree)

        self.plane_toolbar = PlaneDigitizer("planes", self)
        self.addToolBar(self.plane_toolbar)
        self.trace_toolbar = TraceDigitizer("traces", self)
        self.addToolBar(self.trace_toolbar)

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
            lambda: self.import_model_dialog("Import Mesh", None)
        )
        self.actionImport_Mesh_East_North_Up.triggered.connect(
            lambda: self.import_model_dialog(
                "Import Mesh (East, North, Up)", {"xRotation": -pi / 2}
            )
        )
        self.actionImport_Mesh_West_Down_South.triggered.connect(
            lambda: self.import_model_dialog(
                "Import Mesh (West, Down, South)", {"zRotation": pi}
            )
        )
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

        self.Ri = np.eye(3)

        # self.os = openstereo_Main()
        # self.os.closeEvent = lambda e: None
        # self.os.add_plots()
        # self.os.show()

    def import_model_dialog(
        self, dialog_title: str = "Import mesh", parameters: dict = None
    ) -> None:
        url, extension = QtWidgets.QFileDialog.getOpenFileUrl(
            self, dialog_title
        )

        url_path = url.path()
        if not url_path:
            return
        if parameters is None:
            parameters = {}
            self.Ri = np.eye(3)
        if "xRotation" in parameters:
            self.Ri = rotation_about_x(-parameters["xRotation"])
        elif "zRotation" in parameters:
            self.Ri = rotation_about_z(-parameters["zRotation"])

        self.statusBar().showMessage(
            "Loading model {}...".format(os.path.split(url_path)[1])
        )
        self.bridge.load_model.emit(url, parameters)

    def import_model(self, fname: str, parameters: dict = None) -> None:
        if parameters is None:
            parameters = {}
            self.Ri = np.eye(3)
        if "xRotation" in parameters:
            self.Ri = rotation_about_x(-parameters["xRotation"])
        elif "zRotation" in parameters:
            self.Ri = rotation_about_z(-parameters["zRotation"])
        self.bridge.load_model.emit(
            QtCore.QUrl.fromLocalFile(os.path.abspath(fname)), parameters
        )

    def deferred_import(self) -> None:
        for fname, parameters in self.import_queue:
            self.statusBar().showMessage("Loading model {}...".format(fname))
            self.import_model(fname, parameters)
