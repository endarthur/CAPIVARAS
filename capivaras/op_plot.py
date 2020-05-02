import matplotlib

matplotlib.use("Qt5Agg")  # noqa: E402

from PyQt5 import QtCore, QtGui, QtWidgets

from matplotlib.figure import Figure
from matplotlib.backends.backend_qt5agg import (
    FigureCanvasQTAgg as FigureCanvas,
    NavigationToolbar2QT,
)

import auttitude as at
from auttitude.plot import ProjectionPlot
import auttitude.plot as auplot


class NavigationToolbar(NavigationToolbar2QT):
    # only display the buttons we need
    toolitems = (
        ("Home", "Reset original view", "home", "home"),
        ("Pan", "Pan axes with left mouse, zoom with right", "move", "pan"),
        ("Zoom", "Zoom to rectangle", "zoom_to_rect", "zoom"),
        ("Save", "Save the figure", "filesave", "save_figure"),
        (None, None, None, None),
        (None, None, None, None),
    )


class PlotPanel(QtWidgets.QVBoxLayout):
    def __init__(self, parent: QtWidgets.QWidget = None):
        super(PlotPanel, self).__init__(parent)

        self.plotFigure = Figure(figsize=(4, 4), facecolor="white")

        self.plot_canvas_frame = QtWidgets.QWidget()
        self.plot_canvas = FigureCanvas(self.plotFigure)
        self.plot_canvas.setParent(self.plot_canvas_frame)
        self.addWidget(self.plot_canvas)
        self.build_toolbar()

    def build_toolbar(self) -> None:
        self.plot_toolbar = NavigationToolbar(
            self.plot_canvas, self.plot_canvas_frame
        )
        # thanks http://stackoverflow.com/a/33148049/1457481
        for a in self.plot_toolbar.findChildren(QtWidgets.QAction):
            if a.text() == "Customize":
                self.plot_toolbar.removeAction(a)
                break

        self.addWidget(self.plot_toolbar)

    # def plot_data(self, plot_item):
    #     pass

    # def draw_plot(self):
    #     pass


class StereoPanel(PlotPanel):
    def __init__(self, parent: QtWidgets.QWidget = None):
        super().__init__(parent)
        self.plotaxes = self.plotFigure.add_axes(
            [0.01, 0.01, 0.98, 0.98],
            clip_on="True",
            xlim=(-1.2, 1.2),
            ylim=(-1.2, 1.2),
            adjustable="box",
            autoscale_on="False",
            label="stereo",
        )
        self.plotaxes.set_aspect(aspect="equal", adjustable=None, anchor="W")
        self.plt = ProjectionPlot(self.plotaxes, auplot.EqualArea)
        # self.projection =
        # self.plotaxes.format_coord =


class SurfacePanel(PlotPanel):
    def __init__(self, parent: QtWidgets.QWidget = None):
        super().__init__(parent)
        self.plotaxes = self.plotFigure.add_axes(
            [0.01, 0.01, 0.98, 0.98],
            clip_on="True",
            xlim=(-1.2, 1.2),
            ylim=(-1.2, 1.2),
            adjustable="box",
            autoscale_on="False",
        )
        self.plotaxes.set_aspect(aspect="equal", adjustable=None, anchor="W")
        self.clear_diagram()

    def clear_diagram(self) -> None:
        self.plotaxes.cla()
        self.plotaxes.axis("equal")
        # self.axis.set_xlim(-1.1, 1.1)
        # self.axis.set_ylim(-1.1, 1.1)
        self.plotaxes.set_axis_off()
