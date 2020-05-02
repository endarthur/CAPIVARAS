from typing import Callable, List

from PyQt5 import QtCore, QtWidgets
# from PyQt5 import QtGui
from PyQt5.QtCore import pyqtSignal as Signal  # type: ignore
from PyQt5.QtCore import pyqtSlot as Slot


class Bridge(QtCore.QObject):
    def __init__(
        self, window: QtWidgets.QMainWindow, parent: QtWidgets.QWidget = None
    ) -> None:
        super().__init__(parent)
        self.window = window
        self.on_ready: List[Callable] = []

    plotted_attitude = Signal(QtCore.QVariant)
    load_model = Signal(QtCore.QUrl, QtCore.QVariant)
    update_capi_state = Signal(QtCore.QVariant)
    update_capi_settings = Signal(QtCore.QVariant)
    update_item_properties = Signal(QtCore.QVariant)

    @Slot(str)
    def print_to_python(self, text: str) -> None:
        print(text)

    @Slot()
    def ready(self) -> None:
        for callback in self.on_ready:
            callback()

    @Slot(QtCore.QVariant)
    def model_loaded(self, data: QtCore.QVariant) -> None:
        print(data)

    @Slot(QtCore.QVariant)
    def selected_data(self, data: QtCore.QVariant) -> None:
        pass

    @Slot(int)
    def set_progressbar(self, count: int) -> None:
        if count >= 0:
            self.window.progress.setValue(count)
        else:
            self.window.progress.reset()
            self.window.progress.setMaximum(100)

    @Slot()
    def set_progressbar_busy(self) -> None:
        self.window.progress.setMaximum(
            0
        )  # https://kokkachiprogramming.wordpress.com/2012/11/07/how-to-use-qt-qprogressbar-to-show-busyindefinite-status/ noqa

    @Slot(str)
    def set_statusbar(self, text: str) -> None:
        self.window.statusBar().showMessage(text)
