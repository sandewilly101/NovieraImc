var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/*jshint esversion: 6 */
import * as THREE from 'three';

var EPSILON = 1e-5,
    COPLANAR = 0,
    FRONT = 1,
    BACK = 2,
    SPANNING = 3;

function bufferGeometryToPolygons(bufferGeometry, meshMatrix) {
    var pos = bufferGeometry.attributes.position;
    if (!pos) return [];
    var index = bufferGeometry.index;
    var polygons = [];
    var matrix = meshMatrix.clone();

    var addTriangle = function addTriangle(iA, iB, iC) {
        var va = new THREE.Vector3().fromBufferAttribute(pos, iA).applyMatrix4(matrix);
        var vb = new THREE.Vector3().fromBufferAttribute(pos, iB).applyMatrix4(matrix);
        var vc = new THREE.Vector3().fromBufferAttribute(pos, iC).applyMatrix4(matrix);
        var polygon = new Polygon([new Vertex(va.x, va.y, va.z, new THREE.Vector3(), new THREE.Vector2()), new Vertex(vb.x, vb.y, vb.z, new THREE.Vector3(), new THREE.Vector2()), new Vertex(vc.x, vc.y, vc.z, new THREE.Vector3(), new THREE.Vector2())]);
        polygon.calculateProperties();
        polygons.push(polygon);
    };

    if (index) {
        for (var i = 0; i < index.count; i += 3) {
            addTriangle(index.getX(i), index.getX(i + 1), index.getX(i + 2));
        }
    } else {
        for (var _i = 0; _i < pos.count; _i += 3) {
            addTriangle(_i, _i + 1, _i + 2);
        }
    }
    return polygons;
}

var ThreeBSP = function () {
    function ThreeBSP(geometry) {
        _classCallCheck(this, ThreeBSP);

        this.Polygon = Polygon;
        this.Vertex = Vertex;
        this.Node = Node;

        if (geometry instanceof THREE.Mesh) {
            geometry.updateMatrix();
            this.matrix = geometry.matrix.clone();
            var g = geometry.geometry;
            if (g instanceof THREE.BufferGeometry) {
                var polygons = bufferGeometryToPolygons(g, this.matrix);
                this.tree = new Node(polygons);
                return;
            }
            throw new Error('ThreeBSP: Mesh must use BufferGeometry');
        }
        if (geometry instanceof Node) {
            this.tree = geometry;
            this.matrix = new THREE.Matrix4();
            return;
        }
        throw new Error('ThreeBSP: Given geometry is unsupported');
    }

    _createClass(ThreeBSP, [{
        key: 'subtract',
        value: function subtract(other_tree) {
            var a = this.tree.clone(),
                b = other_tree.tree.clone();

            a.invert();
            a.clipTo(b);
            b.clipTo(a);
            b.invert();
            b.clipTo(a);
            b.invert();
            a.build(b.allPolygons());
            a.invert();
            a = new ThreeBSP(a);
            a.matrix = this.matrix;
            return a;
        }
    }, {
        key: 'union',
        value: function union(other_tree) {
            var a = this.tree.clone(),
                b = other_tree.tree.clone();

            a.clipTo(b);
            b.clipTo(a);
            b.invert();
            b.clipTo(a);
            b.invert();
            a.build(b.allPolygons());
            a = new ThreeBSP(a);
            a.matrix = this.matrix;
            return a;
        }
    }, {
        key: 'intersect',
        value: function intersect(other_tree) {
            var a = this.tree.clone(),
                b = other_tree.tree.clone();

            a.invert();
            b.clipTo(a);
            b.invert();
            a.clipTo(b);
            b.clipTo(a);
            a.build(b.allPolygons());
            a.invert();
            a = new ThreeBSP(a);
            a.matrix = this.matrix;
            return a;
        }
    }, {
        key: 'toBufferGeometry',
        value: function toBufferGeometry() {
            var i,
                j,
                matrix = new THREE.Matrix4().copy(this.matrix).invert(),
                polygons = this.tree.allPolygons(),
                polygon_count = polygons.length,
                polygon,
                polygon_vertice_count,
                positions = [];

            for (i = 0; i < polygon_count; i++) {
                polygon = polygons[i];
                polygon_vertice_count = polygon.vertices.length;

                for (j = 2; j < polygon_vertice_count; j++) {
                    var v0 = polygon.vertices[0];
                    var v1 = polygon.vertices[j - 1];
                    var v2 = polygon.vertices[j];
                    [v0, v1, v2].forEach(function (v) {
                        var p = new THREE.Vector3(v.x, v.y, v.z);
                        p.applyMatrix4(matrix);
                        positions.push(p.x, p.y, p.z);
                    });
                }
            }
            var buf = new THREE.BufferGeometry();
            buf.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            buf.computeVertexNormals();
            return buf;
        }
    }, {
        key: 'toMesh',
        value: function toMesh(material) {
            var geometry = this.toBufferGeometry(),
                mesh = new THREE.Mesh(geometry, material);

            mesh.position.setFromMatrixPosition(this.matrix);
            mesh.rotation.setFromRotationMatrix(this.matrix);

            return mesh;
        }
    }]);

    return ThreeBSP;
}();

export default ThreeBSP;

var Polygon = function () {
    function Polygon(vertices, normal, w) {
        _classCallCheck(this, Polygon);

        if (!(vertices instanceof Array)) {
            vertices = [];
        }

        this.vertices = vertices;
        if (vertices.length > 0) {
            this.calculateProperties();
        } else {
            this.normal = this.w = undefined;
        }
    }

    _createClass(Polygon, [{
        key: 'calculateProperties',
        value: function calculateProperties() {
            var a = this.vertices[0],
                b = this.vertices[1],
                c = this.vertices[2];

            this.normal = b.clone().subtract(a).cross(c.clone().subtract(a)).normalize();

            this.w = this.normal.clone().dot(a);

            return this;
        }
    }, {
        key: 'clone',
        value: function clone() {
            var i,
                vertice_count,
                polygon = new Polygon();

            for (i = 0, vertice_count = this.vertices.length; i < vertice_count; i++) {
                polygon.vertices.push(this.vertices[i].clone());
            }
            polygon.calculateProperties();

            return polygon;
        }
    }, {
        key: 'flip',
        value: function flip() {
            var i,
                vertices = [];

            this.normal.multiplyScalar(-1);
            this.w *= -1;

            for (i = this.vertices.length - 1; i >= 0; i--) {
                vertices.push(this.vertices[i]);
            }
            this.vertices = vertices;

            return this;
        }
    }, {
        key: 'classifyVertex',
        value: function classifyVertex(vertex) {
            var side_value = this.normal.dot(vertex) - this.w;

            if (side_value < -EPSILON) {
                return BACK;
            } else if (side_value > EPSILON) {
                return FRONT;
            } else {
                return COPLANAR;
            }
        }
    }, {
        key: 'classifySide',
        value: function classifySide(polygon) {
            var i,
                vertex,
                classification,
                num_positive = 0,
                num_negative = 0,
                vertice_count = polygon.vertices.length;

            for (i = 0; i < vertice_count; i++) {
                vertex = polygon.vertices[i];
                classification = this.classifyVertex(vertex);
                if (classification === FRONT) {
                    num_positive++;
                } else if (classification === BACK) {
                    num_negative++;
                }
            }

            if (num_positive > 0 && num_negative === 0) {
                return FRONT;
            } else if (num_positive === 0 && num_negative > 0) {
                return BACK;
            } else if (num_positive === 0 && num_negative === 0) {
                return COPLANAR;
            } else {
                return SPANNING;
            }
        }
    }, {
        key: 'splitPolygon',
        value: function splitPolygon(polygon, coplanar_front, coplanar_back, front, back) {
            var classification = this.classifySide(polygon);

            if (classification === COPLANAR) {

                (this.normal.dot(polygon.normal) > 0 ? coplanar_front : coplanar_back).push(polygon);
            } else if (classification === FRONT) {

                front.push(polygon);
            } else if (classification === BACK) {

                back.push(polygon);
            } else {

                var vertice_count,
                    i,
                    j,
                    ti,
                    tj,
                    vi,
                    vj,
                    t,
                    v,
                    f = [],
                    b = [];

                for (i = 0, vertice_count = polygon.vertices.length; i < vertice_count; i++) {

                    j = (i + 1) % vertice_count;
                    vi = polygon.vertices[i];
                    vj = polygon.vertices[j];
                    ti = this.classifyVertex(vi);
                    tj = this.classifyVertex(vj);

                    if (ti != BACK) f.push(vi);
                    if (ti != FRONT) b.push(vi);
                    if ((ti | tj) === SPANNING) {
                        t = (this.w - this.normal.dot(vi)) / this.normal.dot(vj.clone().subtract(vi));
                        v = vi.interpolate(vj, t);
                        f.push(v);
                        b.push(v);
                    }
                }

                if (f.length >= 3) front.push(new Polygon(f).calculateProperties());
                if (b.length >= 3) back.push(new Polygon(b).calculateProperties());
            }
        }
    }]);

    return Polygon;
}();

var Vertex = function () {
    function Vertex(x, y, z, normal, uv) {
        _classCallCheck(this, Vertex);

        this.x = x;
        this.y = y;
        this.z = z;
        this.normal = normal || new THREE.Vector3();
        this.uv = uv || new THREE.Vector2();
    }

    _createClass(Vertex, [{
        key: 'clone',
        value: function clone() {
            return new Vertex(this.x, this.y, this.z, this.normal.clone(), this.uv.clone());
        }
    }, {
        key: 'add',
        value: function add(vertex) {
            this.x += vertex.x;
            this.y += vertex.y;
            this.z += vertex.z;
            return this;
        }
    }, {
        key: 'subtract',
        value: function subtract(vertex) {
            this.x -= vertex.x;
            this.y -= vertex.y;
            this.z -= vertex.z;
            return this;
        }
    }, {
        key: 'multiplyScalar',
        value: function multiplyScalar(scalar) {
            this.x *= scalar;
            this.y *= scalar;
            this.z *= scalar;
            return this;
        }
    }, {
        key: 'cross',
        value: function cross(vertex) {
            var x = this.x,
                y = this.y,
                z = this.z;

            this.x = y * vertex.z - z * vertex.y;
            this.y = z * vertex.x - x * vertex.z;
            this.z = x * vertex.y - y * vertex.x;

            return this;
        }
    }, {
        key: 'normalize',
        value: function normalize() {
            var length = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);

            this.x /= length;
            this.y /= length;
            this.z /= length;

            return this;
        }
    }, {
        key: 'dot',
        value: function dot(vertex) {
            return this.x * vertex.x + this.y * vertex.y + this.z * vertex.z;
        }
    }, {
        key: 'lerp',
        value: function lerp(a, t) {
            this.add(a.clone().subtract(this).multiplyScalar(t));

            this.normal.add(a.normal.clone().sub(this.normal).multiplyScalar(t));

            this.uv.add(a.uv.clone().sub(this.uv).multiplyScalar(t));

            return this;
        }
    }, {
        key: 'interpolate',
        value: function interpolate(other, t) {
            return this.clone().lerp(other, t);
        }
    }, {
        key: 'applyMatrix4',
        value: function applyMatrix4(m) {

            // input: THREE.Matrix4 affine matrix

            var x = this.x,
                y = this.y,
                z = this.z;

            var e = m.elements;

            this.x = e[0] * x + e[4] * y + e[8] * z + e[12];
            this.y = e[1] * x + e[5] * y + e[9] * z + e[13];
            this.z = e[2] * x + e[6] * y + e[10] * z + e[14];

            return this;
        }
    }]);

    return Vertex;
}();

var Node = function () {
    function Node(polygons) {
        _classCallCheck(this, Node);

        var i,
            polygon_count,
            front = [],
            back = [];

        this.polygons = [];
        this.front = this.back = undefined;

        if (!(polygons instanceof Array) || polygons.length === 0) return;

        this.divider = polygons[0].clone();

        for (i = 0, polygon_count = polygons.length; i < polygon_count; i++) {
            this.divider.splitPolygon(polygons[i], this.polygons, this.polygons, front, back);
        }

        if (front.length > 0) {
            this.front = new Node(front);
        }

        if (back.length > 0) {
            this.back = new Node(back);
        }
    }

    _createClass(Node, [{
        key: 'isConvex',
        value: function isConvex(polygons) {
            var i, j;
            for (i = 0; i < polygons.length; i++) {
                for (j = 0; j < polygons.length; j++) {
                    if (i !== j && polygons[i].classifySide(polygons[j]) !== BACK) {
                        return false;
                    }
                }
            }
            return true;
        }
    }, {
        key: 'build',
        value: function build(polygons) {
            var i,
                polygon_count,
                front = [],
                back = [];

            if (!this.divider) {
                this.divider = polygons[0].clone();
            }

            for (i = 0, polygon_count = polygons.length; i < polygon_count; i++) {
                this.divider.splitPolygon(polygons[i], this.polygons, this.polygons, front, back);
            }

            if (front.length > 0) {
                if (!this.front) this.front = new Node();
                this.front.build(front);
            }

            if (back.length > 0) {
                if (!this.back) this.back = new Node();
                this.back.build(back);
            }
        }
    }, {
        key: 'allPolygons',
        value: function allPolygons() {
            var polygons = this.polygons.slice();
            if (this.front) polygons = polygons.concat(this.front.allPolygons());
            if (this.back) polygons = polygons.concat(this.back.allPolygons());
            return polygons;
        }
    }, {
        key: 'clone',
        value: function clone() {
            var node = new Node();

            node.divider = this.divider.clone();
            node.polygons = this.polygons.map(function (polygon) {
                return polygon.clone();
            });
            node.front = this.front && this.front.clone();
            node.back = this.back && this.back.clone();

            return node;
        }
    }, {
        key: 'invert',
        value: function invert() {
            var i, polygon_count, temp;

            for (i = 0, polygon_count = this.polygons.length; i < polygon_count; i++) {
                this.polygons[i].flip();
            }

            this.divider.flip();
            if (this.front) this.front.invert();
            if (this.back) this.back.invert();

            temp = this.front;
            this.front = this.back;
            this.back = temp;

            return this;
        }
    }, {
        key: 'clipPolygons',
        value: function clipPolygons(polygons) {
            var i, polygon_count, front, back;

            if (!this.divider) return polygons.slice();

            front = [];
            back = [];

            for (i = 0, polygon_count = polygons.length; i < polygon_count; i++) {
                this.divider.splitPolygon(polygons[i], front, back, front, back);
            }

            if (this.front) front = this.front.clipPolygons(front);
            if (this.back) back = this.back.clipPolygons(back);else back = [];

            return front.concat(back);
        }
    }, {
        key: 'clipTo',
        value: function clipTo(node) {
            this.polygons = node.clipPolygons(this.polygons);
            if (this.front) this.front.clipTo(node);
            if (this.back) this.back.clipTo(node);
        }
    }]);

    return Node;
}();

window.ThreeBSP = ThreeBSP;