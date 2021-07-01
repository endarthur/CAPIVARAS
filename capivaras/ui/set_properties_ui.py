# -*- coding: utf-8 -*-

# Form implementation generated from reading ui file 'ui_files\set_properties.ui'
#
# Created by: PyQt5 UI code generator 5.15.4
#
# WARNING: Any manual changes made to this file will be lost when pyuic5 is
# run again.  Do not edit this file unless you know what you are doing.


from PyQt5 import QtCore, QtGui, QtWidgets


class Ui_Dialog(object):
    def setupUi(self, Dialog):
        Dialog.setObjectName("Dialog")
        Dialog.resize(263, 364)
        self.verticalLayout = QtWidgets.QVBoxLayout(Dialog)
        self.verticalLayout.setObjectName("verticalLayout")
        self.groupBox_4 = QtWidgets.QGroupBox(Dialog)
        self.groupBox_4.setObjectName("groupBox_4")
        self.formLayout = QtWidgets.QFormLayout(self.groupBox_4)
        self.formLayout.setObjectName("formLayout")
        self.label_7 = QtWidgets.QLabel(self.groupBox_4)
        self.label_7.setObjectName("label_7")
        self.formLayout.setWidget(0, QtWidgets.QFormLayout.LabelRole, self.label_7)
        self.prop_color_material_color = QtWidgets.QPushButton(self.groupBox_4)
        self.prop_color_material_color.setText("")
        self.prop_color_material_color.setObjectName("prop_color_material_color")
        self.formLayout.setWidget(0, QtWidgets.QFormLayout.FieldRole, self.prop_color_material_color)
        self.label_8 = QtWidgets.QLabel(self.groupBox_4)
        self.label_8.setObjectName("label_8")
        self.formLayout.setWidget(1, QtWidgets.QFormLayout.LabelRole, self.label_8)
        self.prop_material_metalness = QtWidgets.QDoubleSpinBox(self.groupBox_4)
        self.prop_material_metalness.setObjectName("prop_material_metalness")
        self.formLayout.setWidget(1, QtWidgets.QFormLayout.FieldRole, self.prop_material_metalness)
        self.label_9 = QtWidgets.QLabel(self.groupBox_4)
        self.label_9.setObjectName("label_9")
        self.formLayout.setWidget(2, QtWidgets.QFormLayout.LabelRole, self.label_9)
        self.prop_material_roughness = QtWidgets.QDoubleSpinBox(self.groupBox_4)
        self.prop_material_roughness.setObjectName("prop_material_roughness")
        self.formLayout.setWidget(2, QtWidgets.QFormLayout.FieldRole, self.prop_material_roughness)
        self.prop_material_vertexColors = QtWidgets.QCheckBox(self.groupBox_4)
        self.prop_material_vertexColors.setObjectName("prop_material_vertexColors")
        self.formLayout.setWidget(3, QtWidgets.QFormLayout.SpanningRole, self.prop_material_vertexColors)
        self.prop_material_flatShading = QtWidgets.QCheckBox(self.groupBox_4)
        self.prop_material_flatShading.setObjectName("prop_material_flatShading")
        self.formLayout.setWidget(4, QtWidgets.QFormLayout.SpanningRole, self.prop_material_flatShading)
        self.prop_material_wireframe = QtWidgets.QCheckBox(self.groupBox_4)
        self.prop_material_wireframe.setObjectName("prop_material_wireframe")
        self.formLayout.setWidget(5, QtWidgets.QFormLayout.SpanningRole, self.prop_material_wireframe)
        self.verticalLayout.addWidget(self.groupBox_4)
        spacerItem = QtWidgets.QSpacerItem(20, 41, QtWidgets.QSizePolicy.Minimum, QtWidgets.QSizePolicy.Expanding)
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
        self.groupBox_4.raise_()

        self.retranslateUi(Dialog)
        self.ok_button.clicked.connect(Dialog.accept)
        self.cancel_button.clicked.connect(Dialog.reject)
        QtCore.QMetaObject.connectSlotsByName(Dialog)
        Dialog.setTabOrder(self.cancel_button, self.apply)
        Dialog.setTabOrder(self.apply, self.ok_button)

    def retranslateUi(self, Dialog):
        _translate = QtCore.QCoreApplication.translate
        Dialog.setWindowTitle(_translate("Dialog", "Mesh Properties"))
        self.groupBox_4.setTitle(_translate("Dialog", "Material"))
        self.label_7.setText(_translate("Dialog", "Color"))
        self.label_8.setText(_translate("Dialog", "Metalness"))
        self.label_9.setText(_translate("Dialog", "Roughness"))
        self.prop_material_vertexColors.setText(_translate("Dialog", "vertex colors"))
        self.prop_material_flatShading.setText(_translate("Dialog", "flat shading"))
        self.prop_material_wireframe.setText(_translate("Dialog", "wireframe"))
        self.ok_button.setText(_translate("Dialog", "OK"))
        self.cancel_button.setText(_translate("Dialog", "Cancel"))
        self.apply.setText(_translate("Dialog", "Apply"))