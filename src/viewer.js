import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { catalog, colors, isTransparent } from './catalog.js'

const cache=new Map(), materials=new Map()
const fixedColors=new Map(Object.entries(colors).map(([key,[,,code]])=>[code,key]))
let assetsPromise
export function loadParts() {
  if(!assetsPromise) assetsPromise=Promise.all([
    fetch(import.meta.env.BASE_URL+'parts.json').then(r=>{if(!r.ok)throw new Error('Каталог недоступен');return r.json()}),
    fetch(import.meta.env.BASE_URL+'parts.bin').then(r=>{if(!r.ok)throw new Error('Геометрия недоступна');return r.arrayBuffer()})
  ]).then(([manifest,buffer])=>{
    for(const [id,meta] of Object.entries(manifest)) {
      const geometry=new THREE.BufferGeometry()
      geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(buffer,meta.offset,meta.count*3),3))
      geometry.setAttribute('normal',new THREE.BufferAttribute(new Float32Array(buffer,meta.offset+meta.count*12,meta.count*3),3))
      const spec=catalog[id]
      if(spec?.insertRotation) geometry.rotateY(spec.insertRotation*Math.PI/180)
      geometry.translate(spec?.originX??0,spec?.originY??0,spec?.originZ??0)
      geometry.computeBoundingSphere()
      if(meta.groups) {
        geometry.userData.faceColors=meta.groups.map(g=>g.color)
        meta.groups.forEach(({start,count},i)=>geometry.addGroup(start,count,i))
      }
      cache.set(id,geometry)
    }
  })
  return assetsPromise
}
function material(color,ghost=false) {
  const key=color+ghost
  if(!materials.has(key)) {
    const clear=isTransparent(color)&&!ghost
    materials.set(key,new THREE.MeshPhysicalMaterial({
      color:ghost?0xaab4bd:colors[color]?.[1]??color,roughness:clear?0.14:0.26,
      metalness:color==='gold'?0.24:0,clearcoat:clear?0.75:0.32,clearcoatRoughness:0.2,
      side:THREE.DoubleSide,transparent:clear,opacity:clear?(color==='glass'?0.25:0.49):1,
      depthWrite:!clear,envMapIntensity:0.68
    }))
  }
  return materials.get(key)
}

export function createViewer(element,onError,onPick) {
  let renderer
  try {renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true})}
  catch {
    onError('Включите аппаратное ускорение браузера для просмотра 3D.')
    return {show(){},reset(){},capture(){return ''},ready:Promise.resolve()}
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio,2))
  renderer.shadowMap.enabled=true
  renderer.shadowMap.type=THREE.PCFSoftShadowMap
  renderer.toneMapping=THREE.NeutralToneMapping
  renderer.toneMappingExposure=0.88
  renderer.setClearColor(0x000000,0)
  element.prepend(renderer.domElement)
  renderer.domElement.setAttribute('aria-label','3D-модель из деталей LDraw')
  const scene=new THREE.Scene()
  const pmrem=new THREE.PMREMGenerator(renderer)
  const room=new RoomEnvironment()
  const environment=pmrem.fromScene(room,0.04)
  scene.environment=environment.texture
  room.dispose()
  pmrem.dispose()
  const camera=new THREE.PerspectiveCamera(32,1,0.1,500)
  const controls=new OrbitControls(camera,renderer.domElement)
  controls.enableDamping=true
  controls.maxPolarAngle=Math.PI/2-0.02
  controls.minDistance=12
  controls.maxDistance=400
  scene.add(new THREE.HemisphereLight(0xffffff,0x909da5,0.65))
  const sun=new THREE.DirectionalLight(0xfffcf4,2.3)
  sun.position.set(-30,65,-35)
  sun.castShadow=true
  sun.shadow.mapSize.set(2048,2048)
  Object.assign(sun.shadow.camera,{left:-38,right:38,top:38,bottom:-38,far:180})
  sun.shadow.normalBias=0.04
  scene.add(sun)
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(300,300),new THREE.ShadowMaterial({opacity:0.17}))
  ground.rotation.x=-Math.PI/2
  ground.position.y=-0.02
  ground.receiveShadow=true
  scene.add(ground)
  let group=new THREE.Group(), model, mode='all',step=null,cutaway=false,house='',floorLevel=1,renderFrame=0, ready=false
  scene.add(group)
  function render() {
    if(renderFrame) return
    renderFrame=requestAnimationFrame(()=>{
      renderFrame=0
      controls.update()
      renderer.render(scene,camera)
    })
  }
  controls.addEventListener('change',render)
  let down=null
  renderer.domElement.addEventListener('pointerdown',event=>{
    down=event.button===0?{x:event.clientX,y:event.clientY}:null
  })
  renderer.domElement.addEventListener('pointerup',event=>{
    if(!onPick||step!==null||!down||Math.hypot(event.clientX-down.x,event.clientY-down.y)>5) return
    const rect=renderer.domElement.getBoundingClientRect()
    const ray=new THREE.Raycaster()
    ray.setFromCamera(new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,1-(event.clientY-rect.top)/rect.height*2),camera)
    scene.updateMatrixWorld()
    const [hit]=ray.intersectObjects(group.children,false)
    const part=hit&&model?.parts[hit.object.userData.parts[hit.instanceId]]
    if(part) onPick(part)
  })
  function visible(part,index,end) {
    if(index>=end) return false
    if(step!==null) return true
    if(mode==='plan'&&part.layer==='roof') return false
    if(mode==='plan'&&!(model.version>=5)) return (part.floor??0)===floorLevel
    if(model.version>=5&&(mode==='ground'||mode==='upper'||mode==='plan')) {
      if(house&&part.building!==house) return false
      if(part.role==='roof') return false
      const level=mode==='ground'?0:floorLevel
      if(part.floor!==level) {
        if(level===0||part.role!=='stair'||part.floor!==level-1) return false
        const source=model.houses.find(item=>item.id===part.building)
        if(source?.attic?.floor===level) return part.y+part.h>=source.attic.y+(source.elevation??0)-11
        if(!source?.stairs?.[level-1]?.entry) return false
        const elevation=source.elevation??0
        return part.y+part.h>=3+elevation+26*level-11
      }
      return !(mode!=='plan'&&cutaway&&part.cut)
    }
    if(mode==='ground'&&(part.floor??0)!==0) return false
    if(mode==='upper'&&(part.floor??0)!==floorLevel) return false
    if(cutaway&&(mode==='ground'||mode==='upper')&&part.role==='wall'&&model.bounds) {
      const {x1,z0}=model.bounds
      if(part.z<=z0||part.x+part.w>=x1) return false
    }
    return true
  }
  function reset(view=mode) {
    if(!model) return
    const stepEnd=step===null?model.parts.length:model.steps[step+1]?.start??model.parts.length
    const stepStart=step!==null&&stepEnd>model.steps[step].start?model.steps[step].start:0
    const shown=model.parts.filter((part,index)=>index>=stepStart&&visible(part,index,stepEnd))
    if(!shown.length) return
    const bounds=new THREE.Box3()
    for(const p of shown) {
      const lift=view==='exploded'?(p.floor??0)*8:0
      bounds.expandByPoint(new THREE.Vector3(p.x-model.options.width/2,p.y*0.4+lift,p.z-model.options.depth/2))
      bounds.expandByPoint(new THREE.Vector3(p.x+p.w-model.options.width/2,(p.y+p.h)*0.4+lift+0.2,p.z+p.d-model.options.depth/2))
    }
    const center=bounds.getCenter(new THREE.Vector3())
    const direction=view==='plan'
      ?new THREE.Vector3(0,1,-0.025)
      :new THREE.Vector3(0.63,view==='ground'||view==='upper'?2.3:0.72,-0.95).normalize()
    const corners=[]
    for(const x of [bounds.min.x,bounds.max.x]) for(const y of [bounds.min.y,bounds.max.y]) for(const z of [bounds.min.z,bounds.max.z]) corners.push(new THREE.Vector3(x,y,z))
    let distance=10
    for(let n=0;n<100;n++) {
      camera.position.copy(center).addScaledVector(direction,distance)
      camera.lookAt(center)
      camera.updateMatrixWorld()
      const fits=corners.every(point=>{
        const p=point.clone().project(camera)
        return Math.abs(p.x)<0.87&&p.y<0.76&&p.y> -0.87
      })
      if(fits) break
      distance*=1.045
    }
    controls.target.copy(center)
    controls.update()
    render()
  }
  const resize=()=>{
    const w=element.clientWidth,h=element.clientHeight
    if(!w||!h) return
    renderer.setSize(w,h,false)
    camera.aspect=w/h
    camera.updateProjectionMatrix()
    if(model) reset()
    render()
  }
  new ResizeObserver(resize).observe(element)
  const readyPromise=loadParts().then(()=>{ready=true;if(model)populate()}).catch(error=>{onError('Не удалось загрузить детали. Обновите страницу.');throw error})
  function populate() {
    scene.remove(group)
    for(const mesh of group.children) mesh.dispose()
    group=new THREE.Group()
    scene.add(group)
    const start=step===null?0:model.steps[step].start
    const end=step===null?model.parts.length:model.steps[step+1]?.start??model.parts.length
    const batches=new Map(), dummy=new THREE.Object3D()
    const {width,depth}=model.options
    for(let i=0;i<end;i++) {
      const part=model.parts[i]
      const {id,x,y,z,w,d,h,color,floor=0,rotation=0}=part
      if(!visible(part,i,end)) continue
      const geometry=cache.get(id)
      if(!geometry) continue
      let lift=step===null&&mode==='exploded'?floor*8:0
      const partModule=model.modules?.find(m=>m.id===part.module)
      const activeModule=model.modules?.find(m=>m.id===model.steps[step]?.module)
      if(step!==null&&activeModule&&partModule?.id===activeModule.id&&activeModule.id!=='ground') lift=5
      const ghost=step!==null&&i<start&&start<end
      const key=id+'/'+color+'/'+ghost
      if(!batches.has(key)) batches.set(key,{geometry,color,ghost,transforms:[],indices:[]})
      const ry=rotation*Math.PI/180
      // Explicit insertion anchors preserve the frame's local coordinate system.
      const centerY=(y+h)*0.4+lift
      batches.get(key).transforms.push([x+w/2-width/2,centerY,z+d/2-depth/2,ry])
      batches.get(key).indices.push(i)
    }
    for(const {geometry,color,ghost,transforms,indices} of batches.values()) {
      const paints=geometry.userData.faceColors
      const surface=paints?paints.map(paint=>material(paint===16?color:fixedColors.get(paint),ghost)):material(color,ghost)
      const mesh=new THREE.InstancedMesh(geometry,surface,transforms.length)
      mesh.userData.parts=indices
      transforms.forEach(([x,y,z,rotation],index)=>{
        dummy.position.set(x,y,z)
        dummy.rotation.set(0,rotation,0)
        dummy.scale.setScalar(0.9985)
        dummy.updateMatrix()
        mesh.setMatrixAt(index,dummy.matrix)
      })
      mesh.castShadow=!isTransparent(color)
      mesh.receiveShadow=true
      group.add(mesh)
    }
    render()
  }
  function show(next,settings={}) {
    const first=!model
    model=next
    mode=settings.view??(settings.interior?'ground':'all')
    step=settings.step??null
    cutaway=settings.cutaway??false
    house=settings.house??''
    floorLevel=settings.floor??1
    if(ready) populate()
    if(first) reset()
  }
  function capture(width=560,height=440) {
    renderer.render(scene,camera)
    const canvas=document.createElement('canvas')
    canvas.width=width
    canvas.height=height
    const context=canvas.getContext('2d')
    const source=renderer.domElement
    context.drawImage(source,0,0,source.width,source.height,0,0,width,height)
    return canvas.toDataURL('image/webp',0.82)
  }
  return {show,reset,capture,ready:readyPromise}
}
