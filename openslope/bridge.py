from PyQt5 import QtWidgets, QtCore
# from PyQt5 import QtGui
from PyQt5.QtCore import pyqtSignal as Signal, pyqtSlot as Slot  # type: ignore


class Bridge(QtCore.QObject):
    def __init__(
        self, window: QtWidgets.QMainWindow, parent: QtWidgets.QWidget = None
    ) -> None:
        super().__init__(parent)
        self.window = window

    plotted_attitude = Signal(QtCore.QVariant)
    load_model = Signal(QtCore.QUrl, QtCore.QVariant)

    @Slot(str)
    def print_to_python(self, text: str) -> None:
        print(text)

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
