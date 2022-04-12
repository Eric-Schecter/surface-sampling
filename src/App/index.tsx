import React, { useRef, useEffect } from 'react';
import styles from './index.module.scss';
import {
  Mesh, Scene,  WebGLRenderer, Clock,Vector3, PerspectiveCamera, BufferGeometry, 
  PointsMaterial,Points,BufferAttribute,Group,
} from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls';
import {MeshSurfaceSampler} from 'three/examples/jsm/math/MeshSurfaceSampler';
import {OBJLoader} from 'three/examples/jsm/loaders/OBJLoader';

class Particle {
  private limit = 1;
  public pos = new Vector3();
  private dir = new Vector3();
  private speed = 0.08;
  private size =1000;
  private targets: {[mode:number]:Vector3} = {};
  constructor(){
    this.pos.x = (Math.random() - 0.5 ) * this.size;
    this.pos.y = (Math.random() - 0.5 ) * this.size;
    this.pos.z = (Math.random() - 0.5 ) * this.size;
  }
  public update = (mode:number) =>{
    if(this.targets[mode]===undefined){
      return;
    }
    if(this.pos.distanceToSquared(this.targets[mode]) > this.limit){
      this.dir.copy(this.targets[mode]).sub(this.pos).multiplyScalar(this.speed);
      this.pos.add(this.dir);
    }
  }
  public init = (mode:number,target:Vector3) =>{
    this.targets[mode] = target.clone();
  }
}

class ParticleSystem {
  private count =15000;
  private sampler:MeshSurfaceSampler[] = [];
  public positionAttr = new BufferAttribute(new Float32Array(this.count * 3),3);
  private particles = new Array(this.count).fill(0).map(()=>new Particle());
  private mode = 0;
  public update = () =>{
    if(!this.sampler.length){
      return;
    }
    this.particles.forEach((particle,i)=>{
      particle.update(this.mode);
      const {pos} = particle;
      this.positionAttr.setXYZ(i,pos.x,pos.y,pos.z);
    })
    this.positionAttr.needsUpdate = true;
  }
  public setSampler = (mesh:Mesh) =>{
    this.sampler.push(new MeshSurfaceSampler(mesh).build());
    const mode = this.sampler.length-1;
    const pos = new Vector3();
    for(let i =0;i<this.count;i++){
      this.sampler[mode].sample(pos);
      this.particles[i].init(mode,pos);
    }
  }
  public changeMode = () =>{
    this.mode = (this.mode + 1) % this.sampler.length;
  }
}

class World {
  private scene: Scene;
  private camera: PerspectiveCamera;
  private timer = 0;
  private renderer: WebGLRenderer;
  private clock = new Clock();
  private pre = 0;
  private objLoader = new OBJLoader();
  private ps = new ParticleSystem();
  constructor(container: HTMLDivElement) {
    const { offsetWidth: width, offsetHeight: height } = container;
    this.renderer = new WebGLRenderer({
      antialias:true,
    });
    this.renderer.setClearColor(0x222222);
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    this.renderer.setSize(width, height);
    container.append(this.renderer.domElement);

    this.camera = new PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.set(50,50,50);
    this.camera.lookAt(0, 0, 0);
    this.scene = new Scene();

    this.objLoader.load('Turtle_Model.obj',(model:Group)=>{
      const mesh = model.children[0] as Mesh;
      mesh.geometry.rotateX(-Math.PI/2);
      this.ps.setSampler(mesh);
    })
    this.objLoader.load('Whale_Model.obj',(model:Group)=>{
      const mesh = model.children[0] as Mesh;
      mesh.geometry.scale(3,3,3);
      this.ps.setSampler(mesh);
    })
    this.objLoader.load('Elephant_Model.obj',(model:Group)=>{
      const mesh = model.children[0] as Mesh;
      mesh.geometry.scale(0.5,0.5,0.5);
      this.ps.setSampler(mesh);
    })

    const geo = new BufferGeometry();
    geo.setAttribute('position',this.ps.positionAttr);
    const mat = new PointsMaterial({
      color:0xff61d5,
      size:0.3,
    });
    const points = new Points(geo,mat);
    this.scene.add(points);
    new OrbitControls(this.camera,this.renderer.domElement);
  }
  public draw = () => {
    const time = this.clock.getElapsedTime();
    if(time-this.pre>2){
      this.ps.changeMode();
      this.pre = time;
    }
    this.ps.update();
    this.renderer.render(this.scene, this.camera);

    this.timer = requestAnimationFrame(this.draw);
  }
  public dispose = () => {
    cancelAnimationFrame(this.timer);
  }
}

export const App = () => {
  const ref = useRef<HTMLDivElement>(null);
  const refWorld = useRef<World>();
  useEffect(() => {
    if (!ref.current) { return }
    const container = ref.current;
    refWorld.current = new World(container);
    refWorld.current.draw();
    return () => refWorld.current?.dispose();
  }, [ref])

  return <div
    ref={ref}
    className={styles.container}
  />
}