#!/usr/bin/env python
# -*- coding: utf-8 -*-
from setuptools import setup, find_packages
import distutils.cmd
import distutils.log
from glob import glob
from os import path


class BuildUICommand(distutils.cmd.Command):
    """Runs pyuic5 on all .ui files on the ui folder"""

    description = "runs pyuic5 on .ui files inside ./ui/"
    user_options = []

    def initialize_options(self):
        pass

    def finalize_options(self):
        pass

    def run(self):
        """Run command."""
        from PyQt5.uic import compileUi

        for ui_file in glob("ui_files/*.ui"):
            basename = path.splitext(path.basename(ui_file))[0]
            py_file = path.join("capivaras", "ui", basename + "_ui.py")
            self.announce(
                "Compiling Qt Designer source: %s" % str(ui_file),
                level=distutils.log.INFO,
            )
            with open(py_file, "w") as fout:
                compileUi(ui_file, fout)
        # also run:
        # pyrcc5 .\ui_files\openstereo.qrc -o .\openstereo\ui\openstereo_rc.py
        # if resources changed
        # Thanks https://ralsina.me/stories/BBS49.html
        # for translation:
        # pylupdate5 -verbose ui_files/openstereo.pro
        # lrelease -verbose ui_files\i18n\openstereo_pt_BR.ts
        # rm .\openstereo\ui\openstereo_rc.py
        # pyrcc5 -verbose .\ui_files\openstereo.qrc -o .\openstereo\ui\openstereo_rc.py


setup(
    name="OpenSlope",
    version="0.2.0",
    packages=find_packages(),
    entry_points={
        "console_scripts": ["openslope = openslope.app:run"]
    },

    cmdclass={
        "buildui": BuildUICommand
    },
)
