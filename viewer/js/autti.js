/*
Copyright (c) 2017 Arthur Endlein

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
var Auttitude = (function () {

    //from http://cwestblog.com/2012/11/12/javascript-degree-and-radian-conversion/
    // Converts from degrees to radians.
    var radians = function (degrees) {
        return degrees * Math.PI / 180;
    };

    // Converts from radians to degrees.
    var degrees = function (radians) {
        return radians * 180 / Math.PI;
    };

    //https://stackoverflow.com/a/17323608/1457481
    function mod(n, m) {
        return ((n % m) + m) % m;
    }

    var sqrt2 = Math.sqrt(2.);

    function Vector(x) {
        this.x = x;
    }

    Vector.prototype.dot = function (other) {
        return this.x[0] * other.x[0] + this.x[1] * other.x[1] + this.x[2] * other.x[2];
    }

    Vector.prototype.angle = function (other) {
        return Math.acos(this.dot(other) / (this.norm() * other.norm()));
    }

    Vector.prototype.cross = function (other) {
        var tx = this.x[0];
        var ty = this.x[1];
        var tz = this.x[2];
        var ox = other.x[0];
        var oy = other.x[1];
        var oz = other.x[2];
        return new Vector(
            [
                ty * oz - tz * oy,
                tz * ox - tx * oz,
                tx * oy - ty * ox
            ]
        );
    }

    Vector.prototype.norm = function () {
        return Math.sqrt(this.dot(this));
    }

    Vector.prototype.normalized = function () {
        var norm = this.norm();
        return this.over(norm);
    }

    Vector.prototype.plus = function (other) {
        return new Vector(
            [
                this.x[0] + other.x[0],
                this.x[1] + other.x[1],
                this.x[2] + other.x[2]
            ]
        );
    }

    Vector.prototype.minus = function (other) {
        return new Vector(
            [
                this.x[0] - other.x[0],
                this.x[1] - other.x[1],
                this.x[2] - other.x[2]
            ]
        );
    }

    Vector.prototype.times = function (a) {
        return new Vector(
            [
                this.x[0] * a,
                this.x[1] * a,
                this.x[2] * a
            ]
        );
    }

    Vector.prototype.over = function (a) {
        return this.times(1 / a);
    }

    Vector.prototype.direction_vector = function () {
        if (this.x[2] == 1.) {
            return Vector([1., 0., 0.]);
        }
        else {
            var x = this.x[0];
            var y = this.x[1];
            var direction_norm = Math.sqrt(x * x + y * y);
            return new Vector(
                [y / direction_norm, -x / direction_norm, 0]
            );
        }
    }

    Vector.prototype.dip_vector = function () {
        return this.cross(this.direction_vector());
    }

    Vector.prototype.great_circle = function (n, fullcircle) {
        if (typeof (n) === 'undefined') n = 180.;
        if (typeof (fullcircle) === 'undefined') fullcircle = false;
        var theta_range = fullcircle? 2*Math.PI : Math.PI;
        var result = [];
        var dip = this.dip_vector();
        var dir = this.direction_vector();
        for (var i = 0; i <= n; i++) {
            var theta = theta_range * i / n;
            result.push(
                dir.times(Math.cos(theta)).plus(
                    dip.times(Math.sin(theta))
                )
            );
        }
        return result;
    }

    Vector.prototype.arc_to = function(other, step){
        if (typeof (step) === 'undefined') step = 0.017453292519943295;
        let aux = this.cross(other).cross(this).normalized();
        var result = [];
        for (var t = 0; t <= this.angle(other); t += step){
            result.push(
                this.times(Math.cos(t)).plus(
                    aux.times(Math.sin(t))
                )
            );
        }
        return result;
    }

    function dcosPlane(attitude, invert_positive) {
        if (typeof (invert_positive) === 'undefined') invert_positive = true;
        var dd = radians(attitude[0]);
        var d = radians(attitude[1]);
        var dcos = [
            -Math.sin(d) * Math.sin(dd),
            -Math.sin(d) * Math.cos(dd),
            -Math.cos(d)
        ];
        if (invert_positive && dcos[2] > 0){
            dcos[0] = -dcos[0];
            dcos[1] = -dcos[1];
            dcos[2] = -dcos[2];
        }
        return new Vector(dcos);
    }

    //https://math.stackexchange.com/a/1637853/119393
    function dcosPlaneEuler(attitude, invert_positive) {
        if (typeof (invert_positive) === 'undefined') invert_positive = true;
        var yaw = radians(attitude[0]);
        var pitch = radians(attitude[1]);
        var roll = radians(attitude[2]);
        var dcos = [
            -Math.sin(roll) * Math.cos(yaw) - Math.cos(roll) * Math.sin(pitch) * Math.sin(yaw),
            -Math.sin(roll) * Math.sin(yaw) + Math.cos(roll) * Math.sin(pitch) * Math.cos(yaw),
            -Math.cos(roll) * Math.cos(pitch)
        ];
        if (invert_positive && dcos[2] > 0){
            dcos[0] = -dcos[0];
            dcos[1] = -dcos[1];
            dcos[2] = -dcos[2];
        }
        return new Vector(dcos);
    }

    function spherePlane(plane) {
        var x = plane.x[0];
        var y = plane.x[1];
        var z = plane.x[2];
        if (z < 0) {
            x = -x;
            y = -y;
            z = -z;
        }
        return [
            mod(degrees(Math.atan2(x, y)), 360.),
            degrees(Math.acos(z))
        ];
    }

    function dcosLine(attitude, invert_positive) {
        if (typeof (invert_positive) === 'undefined') invert_positive = true;
        var tr = radians(attitude[0]);
        var pl = radians(attitude[1]);
        var dcos = [
            Math.cos(pl) * Math.sin(tr),
            Math.cos(pl) * Math.cos(tr),
            -Math.sin(pl)
        ];
        if (invert_positive && dcos[2] > 0){
            dcos[0] = -dcos[0];
            dcos[1] = -dcos[1];
            dcos[2] = -dcos[2];
        }
        return new Vector(dcos);
    }

    function sphereLine(line) {
        var x = line.x[0];
        var y = line.x[1];
        var z = line.x[2];
        if (z > 0) {
            x = -x;
            y = -y;
        }
        else {
            z = -z;
        }
        return [
            mod(degrees(Math.atan2(x, y)), 360.),
            degrees(Math.asin(z))
        ];
    }

    function projectEqualArea(vector) {
        var x = vector.x[0];
        var y = vector.x[1];
        var z = vector.x[2];
        return [
            x * Math.sqrt(1 / (1 - z)),
            y * Math.sqrt(1 / (1 - z))
        ]
    }

    function readEqualArea(point) {
        var X = point[0] * sqrt2;
        var Y = point[0] * sqrt2;
        return [
            Math.sqrt(1 - (X * X + Y * Y) / 4.) * X,
            Math.sqrt(1 - (X * X + Y * Y) / 4.) * Y,
            -1. + (X * X + Y * Y) / 2
        ];
    }

    function orientationTensor(data){
        let a00 = 0.0, a01 = 0.0, a02 = 0.0, a11 = 0.0, a12 = 0.0, a22 = 0.0;
        const n = data.length;
        for (let i = 0; i < n; i++) {
            const x = data[i];
            a00 += x[0]*x[0]/n;
            a01 += x[0]*x[1]/n;
            a02 += x[0]*x[2]/n;
            a11 += x[1]*x[1]/n;
            a12 += x[1]*x[2]/n;
            a22 += x[2]*x[2]/n;
        }
        return [a00, a01, a02, a11, a12, a22];
    }

    function eig(A){
        // https://en.wikipedia.org/wiki/Eigenvalue_algorithm#3%C3%973_matrices
        const [a00, a01, a02, a11, a12, a22] = A;
        const p1 = a01*a01 + a02*a02 + a12*a12;
        let eig;
        if (p1 === 0.0) {
            eig = [a00, a11, a22];
        } else {
            const q = (a00 + a11 + a22)/3;
            const p2 = (a00 - q)*(a00 - q) + (a11 - q)*(a11 - q) + (a22 - q)*(a22 - q) + 2*p1;
            const p = Math.sqrt(p2/6);
            const b00 = (a00 - q)/p;
            const b11 = (a11 - q)/p;
            const b22 = (a22 - q)/p;
            const b01 = a01/p;
            const b02 = a02/p;
            const b12 = a12/p;
    
            const r = ((b00*b11*b22 + 2*b01*b12*b02) - (b02*b11*b02 + b00*b12*b12 + b01*b01*b22))/2;
    
            let phi;
    
            if (r <= -1) {
                phi = Math.PI/3;
            } else if (r >= 1) {
                phi = 0;
            } else {
                phi = Math.acos(r)/3;
            }
            const eig1 = q + 2 * p * Math.cos(phi);
            const eig3 = q + 2 * p * Math.cos(phi + (2*Math.PI/3));
            const eig2 = 3 * q - eig1 - eig3;
            eig = [
                eig1,
                eig2,
                eig3
            ];
        }

        return [
            eig,
            eig.map(
                e => new Vector([a00 - e, a01, a02]).cross(new Vector([a01, a11 - e, a12])).normalized()
            )
        ]
    }

    var Module = {};
    Module.degrees = degrees;
    Module.radians = radians;
    Module.Vector = Vector;
    Module.dcosPlane = dcosPlane;
    Module.dcosPlaneEuler = dcosPlaneEuler;
    Module.spherePlane = spherePlane;
    Module.dcosLine = dcosLine;
    Module.sphereLine = sphereLine;
    Module.projectEqualArea = projectEqualArea;
    Module.readEqualArea = readEqualArea;
    Module.orientationTensor = orientationTensor;
    Module.eig = eig;

    return Module;
})();
