import './main.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import fragment from './shaders/fragment.glsl.js';
import vertex from './shaders/vertex.glsl.js';
import texture from './images/texture.jpg';
import GUI from 'lil-gui';

class Point {
  constructor(x, y) {
    this.position = new THREE.Vector2(x, y);
    this.originalPos = new THREE.Vector2(x, y);

    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    );
  }

  update(mouse) {
    let mouseForce = this.originalPos.clone().sub(mouse);
    let distance = mouseForce.length();

    this.mesh.position.x = this.position.x;
    this.mesh.position.y = this.position.y;
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

    // const frustrumSize = 0.75;
    // const aspect = this.width / this.height;
    // this.camera = new THREE.OrthographicCamera(
    //   (frustrumSize * aspect) / -2,
    //   (frustrumSize * aspect) / 2,
    //   frustrumSize / 2,
    //   frustrumSize / -2,
    //   -1000,
    //   1000
    // );

    this.camera.position.set(0, 0, 2);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.time = 0;

    this.screenSpaceWidth =
      Math.tan((this.camera.fov * Math.PI) / 180 / 2) *
      this.camera.position.z *
      this.camera.aspect;

    this.mouseEvents();
    this.setupPoints();
    this.addMesh();
    this.setupResize();
    this.resize();
    this.settings();
    this.render();
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

  setupPoints() {
    this.points = [];

    for (let i = 0; i < 5; i++) {
      let x = Math.random() * 2 - 1;
      let y = Math.random() * 2 - 1;
      let point = new Point(x, y);

      this.points.push(point);
      this.scene.add(point.mesh);
    }
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
    this.scene.add(this.plane);
  }

  updateGeo() {
    let posArray = this.geometry.attributes.position.array;

    for (let i = 0; i < posArray.length; i += 3) {
      let x = posArray[i];
      let y = posArray[i + 1];
      let z = posArray[i + 2];

      let noise = 0.1 * Math.sin(y * 2 + this.time) * 0.2;
      // posArray[i] = x + noise;
    }

    this.geometry.attributes.position.needsUpdate = true;

    // Points
    this.points.map((p) => {
      p.update(this.pointer);
    });
  }

  settings() {
    this.settings = {
      progress: 0,
    };
    this.gui = new GUI();
    this.gui.add(this.settings, 'progress', -1, 1, 0.001);
  }

  render() {
    this.time += 0.05;
    this.material.uniforms.uTime.value = this.time;
    this.material.uniforms.uProgress.value = this.settings.progress;
    this.plane.position.x = this.settings.progress * this.screenSpaceWidth;

    this.renderer.render(this.scene, this.camera);
    window.requestAnimationFrame(this.render.bind(this));
    this.updateGeo();
  }
}

new Sketch();
