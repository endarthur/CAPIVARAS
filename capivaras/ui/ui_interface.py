import re

from PyQt5 import QtWidgets, QtGui

props_re = re.compile("([^_]+)_(color_)?(.+)_([^_]+)")


class Settings:
    @property
    def item_settings(self) -> dict:
        all_settings = {}
        for name, settings in list(vars(self).items()):
            if name.endswith("_settings"):
                all_settings[name] = settings.copy()
        return all_settings

    @item_settings.setter
    def item_settings(self, data: dict) -> None:
        for name, settings in list(data.items()):
            setattr(self, name, settings)

    def get_item_props(self, item_name: str) -> dict:
        return getattr(self, item_name.replace(" ", "_") + "_settings")


def color_button_factory(button, button_name):
    def color_button_dialog():
        col = QtWidgets.QColorDialog.getColor()
        if col.isValid():
            button.setStyleSheet(
                "QWidget#%s { background-color: %s }"
                % (button_name, col.name())
            )
            # button.palette().color(QtWidgets.QPalette.Background).name()

    return color_button_dialog


def populate_properties_dialog(
    properties_ui, item, update_data_only=False, **kwargs
):
    dialog_widgets = vars(properties_ui)
    for widget_name in dialog_widgets:
        parsed_widget = props_re.match(widget_name)
        if parsed_widget is None:
            continue
        widget = dialog_widgets[widget_name]
        category, is_color, widget_item, prop_name = parsed_widget.groups()
        if category == "prop":
            item_props = item.get_item_props(widget_item)
            if is_color:
                if not update_data_only:
                    widget.clicked.connect(
                        color_button_factory(widget, widget_name)
                    )
                widget.setStyleSheet(
                    "QWidget#%s { background-color: %s }"
                    % (widget_name, QtGui.QColor.fromRgb(item_props[prop_name]).name())
                )
            # http://stackoverflow.com/a/22798753/1457481
            elif type(widget) == QtWidgets.QComboBox:  # TODO: change this in OS as well
                index = (
                    item_props[prop_name]
                    if prop_name in item_props
                    else 0
                )
                if index >= 0:
                    widget.setCurrentIndex(index)
            elif (
                type(widget) == QtWidgets.QCheckBox
                or type(widget) == QtWidgets.QRadioButton
            ):
                widget.setChecked(item_props[prop_name])
            elif (
                type(widget) == QtWidgets.QLineEdit
                or type(widget) == QtWidgets.QLabel
            ):
                widget.setText(item_props[prop_name])
            elif type(widget) == QtWidgets.QTextEdit:
                widget.clear()
                widget.insertPlainText(item_props[prop_name])
            else:
                widget.setValue(item_props[prop_name])
        if category == "show":
            if widget_item in kwargs:
                attribute = kwargs[widget_item][prop_name]
            else:
                item_data = getattr(item, widget_item)
                if not isinstance(item_data, dict):
                    attribute = getattr(item_data, prop_name)
                else:
                    attribute = item_data[prop_name]
            if type(widget) == QtWidgets.QTextEdit:
                widget.clear()
                widget.insertPlainText(attribute)
            elif (
                type(widget) == QtWidgets.QLineEdit
                or type(widget) == QtWidgets.QLabel
            ):
                widget.setText(attribute)
        if category == "do" and not update_data_only:
            if widget_item in kwargs:
                action = kwargs[widget_item][prop_name]
            else:
                item_data = getattr(item, widget_item)
                action = getattr(item_data, prop_name)
            if type(widget) == QtWidgets.QPushButton:
                widget.clicked.connect(action)


def parse_properties_dialog(properties_ui, item, post_hook=None):
    dialog_widgets = vars(properties_ui)
    for widget_name in dialog_widgets:
        parsed_widget = props_re.match(widget_name)
        if parsed_widget is None:
            continue
        widget = dialog_widgets[widget_name]
        category, is_color, widget_item, prop_name = parsed_widget.groups()
        if category == "prop":
            item_props = item.get_item_props(widget_item)
            if is_color:
                item_props[prop_name] = (
                    widget.palette().color(QtGui.QPalette.Background).rgb()
                )
            # http://stackoverflow.com/a/6062987/1457481
            elif type(widget) == QtWidgets.QComboBox:  # TODO: change this in OS
                item_props[prop_name] = widget.currentIndex()
            elif (
                type(widget) == QtWidgets.QCheckBox
                or type(widget) == QtWidgets.QRadioButton
            ):
                item_props[prop_name] = widget.isChecked()
            elif (
                type(widget) == QtWidgets.QLineEdit
                or type(widget) == QtWidgets.QLabel
            ):
                item_props[prop_name] = widget.text()
            elif type(widget) == QtWidgets.QTextEdit:
                item_props[prop_name] = widget.toPlainText()
            else:
                item_props[prop_name] = widget.value()
    if post_hook is not None:
        for f in post_hook:
            f()  # could pass self to post_hook?
