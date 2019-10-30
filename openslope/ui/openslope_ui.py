# -*- coding: utf-8 -*-

# Form implementation generated from reading ui file 'ui_files\openslope.ui'
#
# Created by: PyQt5 UI code generator 5.13.1
#
# WARNING! All changes made in this file will be lost!


from PyQt5 import QtCore, QtGui, QtWidgets


class Ui_MainWindow(object):
    def setupUi(self, MainWindow):
        MainWindow.setObjectName("MainWindow")
        MainWindow.resize(800, 600)
        self.centralwidget = QtWidgets.QWidget(MainWindow)
        self.centralwidget.setObjectName("centralwidget")
        MainWindow.setCentralWidget(self.centralwidget)
        self.menubar = QtWidgets.QMenuBar(MainWindow)
        self.menubar.setGeometry(QtCore.QRect(0, 0, 800, 21))
        self.menubar.setObjectName("menubar")
        self.menuFile = QtWidgets.QMenu(self.menubar)
        self.menuFile.setObjectName("menuFile")
        self.menuWindow = QtWidgets.QMenu(self.menubar)
        self.menuWindow.setObjectName("menuWindow")
        self.menuPanels = QtWidgets.QMenu(self.menuWindow)
        self.menuPanels.setObjectName("menuPanels")
        self.menuTools = QtWidgets.QMenu(self.menubar)
        self.menuTools.setObjectName("menuTools")
        MainWindow.setMenuBar(self.menubar)
        self.statusbar = QtWidgets.QStatusBar(MainWindow)
        self.statusbar.setObjectName("statusbar")
        MainWindow.setStatusBar(self.statusbar)
        self.actionImport_Mesh = QtWidgets.QAction(MainWindow)
        self.actionImport_Mesh.setObjectName("actionImport_Mesh")
        self.actionset = QtWidgets.QAction(MainWindow)
        self.actionset.setObjectName("actionset")
        self.actionLayers = QtWidgets.QAction(MainWindow)
        self.actionLayers.setCheckable(True)
        self.actionLayers.setChecked(True)
        self.actionLayers.setObjectName("actionLayers")
        self.actionStereonet = QtWidgets.QAction(MainWindow)
        self.actionStereonet.setCheckable(True)
        self.actionStereonet.setChecked(True)
        self.actionStereonet.setObjectName("actionStereonet")
        self.actionReload = QtWidgets.QAction(MainWindow)
        self.actionReload.setObjectName("actionReload")
        self.actionImport_Mesh_East_North_Up = QtWidgets.QAction(MainWindow)
        self.actionImport_Mesh_East_North_Up.setObjectName("actionImport_Mesh_East_North_Up")
        self.actionImport_Mesh_West_Down_South = QtWidgets.QAction(MainWindow)
        self.actionImport_Mesh_West_Down_South.setObjectName("actionImport_Mesh_West_Down_South")
        self.menuFile.addAction(self.actionImport_Mesh)
        self.menuFile.addAction(self.actionImport_Mesh_East_North_Up)
        self.menuFile.addAction(self.actionImport_Mesh_West_Down_South)
        self.menuWindow.addAction(self.menuPanels.menuAction())
        self.menuTools.addAction(self.actionReload)
        self.menubar.addAction(self.menuFile.menuAction())
        self.menubar.addAction(self.menuWindow.menuAction())
        self.menubar.addAction(self.menuTools.menuAction())

        self.retranslateUi(MainWindow)
        QtCore.QMetaObject.connectSlotsByName(MainWindow)

    def retranslateUi(self, MainWindow):
        _translate = QtCore.QCoreApplication.translate
        MainWindow.setWindowTitle(_translate("MainWindow", "StdSlope"))
        self.menuFile.setTitle(_translate("MainWindow", "File"))
        self.menuWindow.setTitle(_translate("MainWindow", "Window"))
        self.menuPanels.setTitle(_translate("MainWindow", "Panels"))
        self.menuTools.setTitle(_translate("MainWindow", "Tools"))
        self.actionImport_Mesh.setText(_translate("MainWindow", "Import Mesh"))
        self.actionset.setText(_translate("MainWindow", "set"))
        self.actionLayers.setText(_translate("MainWindow", "Layers"))
        self.actionStereonet.setText(_translate("MainWindow", "Stereonet"))
        self.actionReload.setText(_translate("MainWindow", "Reload"))
        self.actionImport_Mesh_East_North_Up.setText(_translate("MainWindow", "Import Mesh (East, North, Up)"))
        self.actionImport_Mesh_West_Down_South.setText(_translate("MainWindow", "Import Mesh (West, Down, South)"))
