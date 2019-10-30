# import os
import sys
import traceback
from types import TracebackType
from typing import Type

from PyQt5 import QtWidgets
# from PyQt5 import QtCore

from openslope import __version__
from openslope.main_window import Main


def run() -> None:
    def my_excepthook(
        exception_type: Type[BaseException],
        value: BaseException,
        tback: TracebackType,
    ) -> None:
        # log the exception here
        error_dialog = QtWidgets.QErrorMessage()
        error_dialog.showMessage(
            "".join(traceback.format_exception(exception_type, value, tback))
        )
        error_dialog.exec_()
        # then call the default handler
        sys.__excepthook__(exception_type, value, tback)

    # from https://stackoverflow.com/a/38020962/1457481
    sys.excepthook = my_excepthook  # type: ignore

    app = QtWidgets.QApplication(sys.argv)
    app.setApplicationName("OpenSlope")
    app.setApplicationVersion(__version__)

    main = Main()

    main.show()
    sys.exit(app.exec_())
