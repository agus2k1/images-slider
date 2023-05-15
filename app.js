import './main.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import fragment from './shaders/fragment.glsl.js';
import vertex from './shaders/vertex.glsl.js';
import texture from './images/texture2.jpg';
import GUI from 'lil-gui';
import { createNoise2D } from 'simplex-noise';

const noise2D = createNoise2D();

class Point {
  constructor(x, y, mesh, index) {
    this.position = new THREE.Vector2(x, y);
    this.originalPos = new THREE.Vector2(x, y);
    this.originalMesh = mesh;
    this.originalMeshX = mesh.position.x;
    this.index = index;

    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    );
  }

  update(mouse) {
    const mouseForce = this.originalPos.clone().sub(mouse);
    const distance = mouseForce.length();
    const forceFactor = 1 / Math.max(distance, 0.2);
    const finalPosition = this.originalPos
      .clone()
      .sub(
        mouseForce.normalize().multiplyScalar(-distance * 0.2 * forceFactor)
      );
    this.position.lerp(finalPosition, 0.1);

    this.mesh.position.x = this.position.x;
    this.mesh.position.y = this.position.y;

    const posArray = this.originalMesh.geometry.attributes.position.array;
    posArray[this.index * 3] = this.position.x - this.originalMeshX;
    posArray[this.index * 3 + 1] = this.position.y;
    this.originalMesh.geometry.attributes.position.needsUpdate = true;
  }
}

export default class Sketch {
  constructor() {
    this.scene = new THREE.Scene();
    this.container = document.getElementById('container');
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.width, this.height);
    // this.renderer.setClearColor(0xeeeeee, 1);
    this.renderer.useLegacyLights = true;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.001,
      1000
    );

    this.camera.position.set(0, 0, 2);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.time = 0;

    this.screenSpaceWidth =
      Math.tan((this.camera.fov * Math.PI) / 180 / 2) *
      this.camera.position.z *
      this.camera.aspect;

    this.setupResize();
    this.resize();
    this.mouseEvents();
    this.addMesh();
    this.setupPoints();
    this.settings();
    this.render();
  }

  setupResize() {
    window.addEventListener('resize', this.resize.bind(this));
  }

  resize() {
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;
    this.renderer.setSize(this.width, this.height);
    this.camera.aspect = this.width / this.height;

    this.camera.updateProjectionMatrix();
  }

  mouseEvents() {
    window.addEventListener('mousemove', (e) => {
      this.pointer.x = (e.clientX / this.width) * 2 - 1;
      this.pointer.y = -(e.clientY / this.height) * 2 + 1;

      this.raycaster.setFromCamera(this.pointer, this.camera);
      const intersects = this.raycaster.intersectObjects([this.plane]);

      if (intersects[0]) {
        this.pointer.x = intersects[0].point.x;
        this.pointer.y = intersects[0].point.y;
      }
    });
  }

  addMesh() {
    this.material = new THREE.ShaderMaterial({
      extensions: {
        derivatives: '#extension GL_OES_standard_derivatives : enable',
      },
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(this.width, this.height) },
        uAspectRatio: { value: this.width / this.height },
        uTexture: { value: new THREE.TextureLoader().load(texture) },
        uProgress: { value: 0 },
      },
      fragmentShader: fragment,
      vertexShader: vertex,
      side: THREE.DoubleSide,
      // wireframe: true,
    });
    this.geometry = new THREE.PlaneGeometry(1, 1, 1, 1);

    this.plane = new THREE.Mesh(this.geometry, this.material);
    // this.scene.add(this.plane);

    this.meshes = [];

    for (let i = -2; i < 3; i++) {
      const g = new THREE.PlaneGeometry(1, 1, 1, 1);
      const m = this.material.clone();
      m.uniforms.uTexture.value = this.material.uniforms.uTexture.value;
      m.uniforms.uProgress.value = i / 2;
      const mesh = new THREE.Mesh(g, m);

      mesh.userData.position = i;
      mesh.position.x = i;
      this.meshes.push(mesh);
      this.scene.add(mesh);
    }
  }

  setupPoints() {
    this.points = [];

    this.meshes.forEach((m) => {
      const posArray = m.geometry.attributes.position.array;

      for (let i = 0; i < posArray.length; i += 3) {
        const x = posArray[i] + m.position.x;
        const y = posArray[i + 1];
        const r1 = noise2D(x, y) * 0.1;
        const r2 = noise2D(x, y) * 0.1;
        const p = new Point(x + r1, y + r2, m, i / 3);

        this.points.push(p);
        this.scene.add(p.mesh);
      }
    });
  }

  settings() {
    this.settings = {
      progress: 0,
    };
    this.gui = new GUI();
    this.gui.add(this.settings, 'progress', -1, 1, 0.001);

    this.plane.position.x = this.settings.progress * this.screenSpaceWidth;
  }

  render() {
    this.time += 0.05;
    this.material.uniforms.uTime.value = this.time;
    this.material.uniforms.uProgress.value = this.settings.progress;

    this.renderer.render(this.scene, this.camera);
    window.requestAnimationFrame(this.render.bind(this));

    this.points.map((p) => {
      p.update(this.pointer);
    });

    this.meshes.forEach((m) => {
      m.position.x = m.userData.position + this.settings.progress * 10;
      m.material.uniforms.uProgress.value = m.position.x / 2;
    });
  }
}

new Sketch();
