# -*- coding: utf-8 -*-

# Form implementation generated from reading ui file 'ui_files\capi_settings.ui'
#
# Created by: PyQt5 UI code generator 5.6
#
# WARNING! All changes made in this file will be lost!

from PyQt5 import QtCore, QtGui, QtWidgets

class Ui_Dialog(object):
    def setupUi(self, Dialog):
        Dialog.setObjectName("Dialog")
        Dialog.resize(338, 573)
        self.verticalLayout = QtWidgets.QVBoxLayout(Dialog)
        self.verticalLayout.setObjectName("verticalLayout")
        self.axes_visible = QtWidgets.QGroupBox(Dialog)
        self.axes_visible.setObjectName("axes_visible")
        self.formLayout = QtWidgets.QFormLayout(self.axes_visible)
        self.formLayout.setObjectName("formLayout")
        self.label = QtWidgets.QLabel(self.axes_visible)
        self.label.setObjectName("label")
        self.formLayout.setWidget(0, QtWidgets.QFormLayout.LabelRole, self.label)
        self.prop_reference_compass = QtWidgets.QComboBox(self.axes_visible)
        self.prop_reference_compass.setObjectName("prop_reference_compass")
        self.prop_reference_compass.addItem("")
        self.prop_reference_compass.addItem("")
        self.prop_reference_compass.addItem("")
        self.formLayout.setWidget(0, QtWidgets.QFormLayout.FieldRole, self.prop_reference_compass)
        self.label_2 = QtWidgets.QLabel(self.axes_visible)
        self.label_2.setObjectName("label_2")
        self.formLayout.setWidget(1, QtWidgets.QFormLayout.LabelRole, self.label_2)
        self.prop_reference_axes = QtWidgets.QComboBox(self.axes_visible)
        self.prop_reference_axes.setObjectName("prop_reference_axes")
        self.prop_reference_axes.addItem("")
        self.prop_reference_axes.addItem("")
        self.prop_reference_axes.addItem("")
        self.formLayout.setWidget(1, QtWidgets.QFormLayout.FieldRole, self.prop_reference_axes)
        self.verticalLayout.addWidget(self.axes_visible)
        spacerItem = QtWidgets.QSpacerItem(20, 436, QtWidgets.QSizePolicy.Minimum, QtWidgets.QSizePolicy.Expanding)
        self.verticalLayout.addItem(spacerItem)
        self.horizontalLayout = QtWidgets.QHBoxLayout()
        self.horizontalLayout.setObjectName("horizontalLayout")
        spacerItem1 = QtWidgets.QSpacerItem(40, 20, QtWidgets.QSizePolicy.Expanding, QtWidgets.QSizePolicy.Minimum)
        self.horizontalLayout.addItem(spacerItem1)
        self.ok_button = QtWidgets.QPushButton(Dialog)
        self.ok_button.setObjectName("ok_button")
        self.horizontalLayout.addWidget(self.ok_button)
        self.cancel_button = QtWidgets.QPushButton(Dialog)
        self.cancel_button.setObjectName("cancel_button")
        self.horizontalLayout.addWidget(self.cancel_button)
        self.apply = QtWidgets.QPushButton(Dialog)
        self.apply.setObjectName("apply")
        self.horizontalLayout.addWidget(self.apply)
        self.verticalLayout.addLayout(self.horizontalLayout)

        self.retranslateUi(Dialog)
        self.ok_button.clicked.connect(Dialog.accept)
        self.cancel_button.clicked.connect(Dialog.reject)
        QtCore.QMetaObject.connectSlotsByName(Dialog)

    def retranslateUi(self, Dialog):
        _translate = QtCore.QCoreApplication.translate
        Dialog.setWindowTitle(_translate("Dialog", "CAPIVARAS settings"))
        self.axes_visible.setTitle(_translate("Dialog", "Reference"))
        self.label.setText(_translate("Dialog", "compass visible"))
        self.prop_reference_compass.setItemText(0, _translate("Dialog", "never"))
        self.prop_reference_compass.setItemText(1, _translate("Dialog", "on movement"))
        self.prop_reference_compass.setItemText(2, _translate("Dialog", "always"))
        self.label_2.setText(_translate("Dialog", "axes visible"))
        self.prop_reference_axes.setItemText(0, _translate("Dialog", "never"))
        self.prop_reference_axes.setItemText(1, _translate("Dialog", "on movement"))
        self.prop_reference_axes.setItemText(2, _translate("Dialog", "always"))
        self.ok_button.setText(_translate("Dialog", "OK"))
        self.cancel_button.setText(_translate("Dialog", "Cancel"))
        self.apply.setText(_translate("Dialog", "Apply"))

