import { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import './App.css';

/* ── Planet Database ── */
const PLANETS = [
  {
    name: 'Mercury', radius: 0.3, dist: 7, speed: 4.15, rot: 0.004,
    color: 0x9c8e7d, emissive: 0x1a1510, type: 'Terrestrial Planet',
    info: { Diameter: '4,879 km', 'From Sun': '57.9M km', Orbit: '88 days', Moons: '0', Temp: '-180 to 430°C', Gravity: '3.7 m/s²' },
    desc: 'Mercury is the smallest planet and closest to the Sun. Its cratered surface resembles our Moon. Despite its proximity to the Sun, it is not the hottest planet — that distinction belongs to Venus.'
  },
  {
    name: 'Venus', radius: 0.62, dist: 10.5, speed: 1.62, rot: 0.002,
    color: 0xe8cda0, emissive: 0x2a2010, type: 'Terrestrial Planet',
    info: { Diameter: '12,104 km', 'From Sun': '108.2M km', Orbit: '225 days', Moons: '0', Temp: '462°C avg', Gravity: '8.87 m/s²' },
    desc: 'Venus is the hottest planet due to its thick CO₂ atmosphere creating a runaway greenhouse effect. Uniquely, it rotates backwards compared to most planets, with a day longer than its year.'
  },
  {
    name: 'Earth', radius: 0.65, dist: 14, speed: 1.0, rot: 0.008,
    color: 0x4499cc, emissive: 0x0a1520, type: 'Terrestrial Planet', hasMoon: true,
    info: { Diameter: '12,756 km', 'From Sun': '149.6M km', Orbit: '365.25 days', Moons: '1', Temp: '15°C avg', Gravity: '9.81 m/s²' },
    desc: 'Earth is the only known planet harboring life. Liquid water covers 71% of its surface, and its protective magnetic field shields it from solar radiation, enabling an extraordinary diversity of ecosystems.'
  },
  {
    name: 'Mars', radius: 0.42, dist: 17.5, speed: 0.53, rot: 0.007,
    color: 0xc1440e, emissive: 0x1a0800, type: 'Terrestrial Planet',
    info: { Diameter: '6,792 km', 'From Sun': '227.9M km', Orbit: '687 days', Moons: '2', Temp: '-65°C avg', Gravity: '3.72 m/s²' },
    desc: 'Mars, the Red Planet, owes its color to iron oxide on its surface. It hosts Olympus Mons — the tallest volcano in the solar system at 21.9 km — and the vast Valles Marineris canyon system.'
  },
  {
    name: 'Jupiter', radius: 1.9, dist: 25, speed: 0.084, rot: 0.015,
    color: 0xd4a574, emissive: 0x1a1008, type: 'Gas Giant',
    info: { Diameter: '142,984 km', 'From Sun': '778.6M km', Orbit: '11.86 years', Moons: '95', Temp: '-110°C avg', Gravity: '24.79 m/s²' },
    desc: 'Jupiter is the largest planet — more than twice as massive as all other planets combined. Its Great Red Spot is a storm larger than Earth that has been raging for at least 350 years.'
  },
  {
    name: 'Saturn', radius: 1.6, dist: 33, speed: 0.034, rot: 0.013,
    color: 0xead6a6, emissive: 0x1a1508, type: 'Gas Giant', hasRings: true,
    info: { Diameter: '120,536 km', 'From Sun': '1.43B km', Orbit: '29.46 years', Moons: '146', Temp: '-140°C avg', Gravity: '10.44 m/s²' },
    desc: 'Saturn is renowned for its spectacular ring system of billions of ice and rock particles. Despite being the second-largest planet, it has the lowest density — it would float in water.'
  },
  {
    name: 'Uranus', radius: 1.05, dist: 41, speed: 0.012, rot: 0.009,
    color: 0x7ec8c8, emissive: 0x081a1a, type: 'Ice Giant',
    info: { Diameter: '51,118 km', 'From Sun': '2.87B km', Orbit: '84 years', Moons: '28', Temp: '-195°C avg', Gravity: '8.87 m/s²' },
    desc: 'Uranus rotates on its side with a 98° axial tilt, likely caused by an ancient collision. Its blue-green hue comes from atmospheric methane absorbing red light and reflecting blue-green wavelengths.'
  },
  {
    name: 'Neptune', radius: 1.0, dist: 49, speed: 0.006, rot: 0.008,
    color: 0x3355bb, emissive: 0x050a1a, type: 'Ice Giant',
    info: { Diameter: '49,528 km', 'From Sun': '4.50B km', Orbit: '165 years', Moons: '16', Temp: '-200°C avg', Gravity: '11.15 m/s²' },
    desc: 'Neptune is the windiest planet, with speeds reaching 2,100 km/h. It was the first planet discovered through mathematical prediction rather than direct observation, confirmed in 1846.'
  }
];

export default function App() {
  /* ── React State ── */
  const [speed, setSpeed] = useState(1);
  const [showOrbits, setShowOrbits] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [selectedPlanet, setSelectedPlanet] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  /* ── Refs ── */
  const containerRef = useRef(null);
  const labelBoxRef = useRef(null);

  // Bridge ref — lets React handlers talk to the Three.js animation loop
  const bridge = useRef({
    flyTo: null,
    clearSelection: null,
    orbitLines: [],
    labelEls: [],
  });

  // Refs that the animation loop reads (avoids stale closures)
  const speedRef = useRef(1);
  const showLabelsRef = useRef(true);

  // Keep refs in sync with state
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { showLabelsRef.current = showLabels; }, [showLabels]);

  /* ── Toast ── */
  const showToast = useCallback((msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2200);
  }, []);

  /* ── Close Panel ── */
  const closePanel = useCallback(() => {
    setPanelOpen(false);
    setSelectedPlanet(null);
    bridge.current.clearSelection?.();
  }, []);

  /* ── Reset View ── */
  const resetView = useCallback(() => {
    closePanel();
    bridge.current.flyTo?.(
      new THREE.Vector3(35, 30, 55),
      new THREE.Vector3(0, 0, 0)
    );
    showToast('View reset');
  }, [closePanel, showToast]);

  /* ── Sync orbit visibility from React state → Three.js ── */
  useEffect(() => {
    bridge.current.orbitLines.forEach(l => { l.visible = showOrbits; });
  }, [showOrbits]);

  /* ── Sync label visibility from React state → DOM ── */
  useEffect(() => {
    bridge.current.labelEls.forEach(l => { l.style.display = showLabels ? '' : 'none'; });
  }, [showLabels]);

  /* ── Speed handler ── */
  const handleSpeed = useCallback((e) => {
    const v = parseFloat(e.target.value);
    setSpeed(v);
  }, []);

  /* ── Main Three.js Setup ── */
  useEffect(() => {
    const container = containerRef.current;
    const labelBox = labelBoxRef.current;
    if (!container || !labelBox) return;

    /* ─ Scene, Camera, Renderer ─ */
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 2000);
    camera.position.set(80, 60, 100);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    /* ─ Controls ─ */
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 5;
    controls.maxDistance = 160;

    /* ─ Lights ─ */
    scene.add(new THREE.AmbientLight(0x181828, 0.4));
    scene.add(new THREE.PointLight(0xffdd88, 2.8, 250, 1.2));

    /* ─ Background Gradient ─ */
    const bgC = document.createElement('canvas');
    bgC.width = 2; bgC.height = 512;
    const bgCtx = bgC.getContext('2d');
    const bgG = bgCtx.createLinearGradient(0, 0, 0, 512);
    bgG.addColorStop(0, '#0a0510');
    bgG.addColorStop(0.5, '#030308');
    bgG.addColorStop(1, '#050210');
    bgCtx.fillStyle = bgG;
    bgCtx.fillRect(0, 0, 2, 512);
    const bgTex = new THREE.CanvasTexture(bgC);
    bgTex.mapping = THREE.EquirectangularReflectionMapping;
    scene.background = bgTex;

    /* ─ Starfield ─ */
    const starCount = 7000;
    const starPos = new Float32Array(starCount * 3);
    const starCol = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 350 + Math.random() * 450;
      starPos[i3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPos[i3 + 2] = r * Math.cos(phi);
      const t = Math.random();
      if (t > 0.88) { starCol[i3] = 0.7; starCol[i3 + 1] = 0.85; starCol[i3 + 2] = 1.0; }
      else if (t > 0.76) { starCol[i3] = 1.0; starCol[i3 + 1] = 0.92; starCol[i3 + 2] = 0.65; }
      else { const w = 0.82 + Math.random() * 0.18; starCol[i3] = w; starCol[i3 + 1] = w; starCol[i3 + 2] = w; }
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
      size: 1.2, vertexColors: true, transparent: true, opacity: 0.85,
      sizeAttenuation: true, blending: THREE.AdditiveBlending, depthWrite: false
    }));
    scene.add(stars);

    /* ─ Nebula Blobs ─ */
    [
      { pos: [-200, 80, -300], color: '#1a0520', scale: 180 },
      { pos: [250, -50, -350], color: '#0a1525', scale: 220 },
      { pos: [-100, -120, 200], color: '#150a08', scale: 160 },
    ].forEach(b => {
      const nc = document.createElement('canvas');
      nc.width = 256; nc.height = 256;
      const nctx = nc.getContext('2d');
      const ng = nctx.createRadialGradient(128, 128, 0, 128, 128, 128);
      ng.addColorStop(0, b.color);
      ng.addColorStop(1, 'rgba(0,0,0,0)');
      nctx.fillStyle = ng;
      nctx.fillRect(0, 0, 256, 256);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(nc), transparent: true, opacity: 0.35,
        blending: THREE.AdditiveBlending, depthWrite: false
      }));
      sprite.position.set(...b.pos);
      sprite.scale.set(b.scale, b.scale, 1);
      scene.add(sprite);
    });

    /* ─ Sun ─ */
    const sunGroup = new THREE.Group();

    const tc = document.createElement('canvas');
    tc.width = 512; tc.height = 256;
    const tctx = tc.getContext('2d');
    const tg = tctx.createLinearGradient(0, 0, 512, 256);
    tg.addColorStop(0, '#ffcc33');
    tg.addColorStop(0.3, '#ffaa11');
    tg.addColorStop(0.6, '#ff8822');
    tg.addColorStop(1, '#ffdd55');
    tctx.fillStyle = tg;
    tctx.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * 512, y = Math.random() * 256;
      const r = Math.max(0.5, Math.random() * 15 + 2);
      tctx.beginPath();
      tctx.arc(x, y, r, 0, Math.PI * 2);
      tctx.fillStyle = `rgba(255,180,50,${Math.random() * 0.3})`;
      tctx.fill();
    }
    const sunMesh = new THREE.Mesh(
      new THREE.SphereGeometry(Math.max(0.01, 3), 64, 64),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(tc) })
    );
    sunGroup.add(sunMesh);

    sunGroup.add(new THREE.Mesh(
      new THREE.SphereGeometry(Math.max(0.01, 3.4), 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0.2, side: THREE.BackSide })
    ));

    const gc = document.createElement('canvas');
    gc.width = 512; gc.height = 512;
    const gctx = gc.getContext('2d');
    const gg = gctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    gg.addColorStop(0, 'rgba(255,200,60,0.55)');
    gg.addColorStop(0.12, 'rgba(255,160,30,0.35)');
    gg.addColorStop(0.3, 'rgba(255,100,10,0.12)');
    gg.addColorStop(0.6, 'rgba(255,60,0,0.03)');
    gg.addColorStop(1, 'rgba(255,30,0,0.0)');
    gctx.fillStyle = gg;
    gctx.fillRect(0, 0, 512, 512);
    const glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(gc),
      blending: THREE.AdditiveBlending, transparent: true, depthWrite: false
    }));
    glowSprite.scale.set(22, 22, 1);
    sunGroup.add(glowSprite);
    scene.add(sunGroup);

    /* ─ Orbit Lines ─ */
    const orbitLines = [];
    function makeOrbit(dist) {
      const pts = [];
      for (let i = 0; i <= 128; i++) {
        const a = (i / 128) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * dist, 0, Math.sin(a) * dist));
      }
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.06, depthWrite: false })
      );
      scene.add(line);
      orbitLines.push(line);
    }

    /* ─ Planets ─ */
    const planetObjs = [];
    const clickTargets = [];
    const labelEls = [];

    function buildPlanet(d) {
      const group = new THREE.Group();

      const mat = new THREE.MeshStandardMaterial({
        color: d.color, emissive: d.emissive, roughness: 0.65, metalness: 0.08
      });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(Math.max(0.01, d.radius), 32, 32), mat);
      group.add(mesh);

      if (['Earth', 'Jupiter', 'Saturn', 'Neptune', 'Uranus', 'Venus'].includes(d.name)) {
        group.add(new THREE.Mesh(
          new THREE.SphereGeometry(Math.max(0.01, d.radius * 1.14), 32, 32),
          new THREE.MeshBasicMaterial({ color: d.color, transparent: true, opacity: 0.1, side: THREE.BackSide })
        ));
      }

      if (d.hasRings) {
        const ri = Math.max(0.01, d.radius * 1.35);
        const ro = Math.max(ri + 0.01, d.radius * 2.6);
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(ri, ro, 64),
          new THREE.MeshBasicMaterial({ color: 0xd4c088, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false })
        );
        ring.rotation.x = -Math.PI / 2.15;
        group.add(ring);

        const ri2 = Math.max(0.01, d.radius * 1.15);
        const ro2 = Math.max(ri2 + 0.01, d.radius * 1.35);
        const ring2 = new THREE.Mesh(
          new THREE.RingGeometry(ri2, ro2, 64),
          new THREE.MeshBasicMaterial({ color: 0xc8b878, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false })
        );
        ring2.rotation.x = -Math.PI / 2.15;
        group.add(ring2);
      }

      let moonMesh = null;
      if (d.hasMoon) {
        moonMesh = new THREE.Mesh(
          new THREE.SphereGeometry(Math.max(0.01, 0.15), 16, 16),
          new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.9 })
        );
        group.add(moonMesh);
      }

      makeOrbit(d.dist);

      const angle = Math.random() * Math.PI * 2;
      group.position.x = Math.cos(angle) * d.dist;
      group.position.z = Math.sin(angle) * d.dist;
      scene.add(group);

      // HTML label (imperative — updated 60fps in loop, no React re-renders)
      const lbl = document.createElement('div');
      lbl.className = 'p-label';
      lbl.textContent = d.name;
      labelBox.appendChild(lbl);
      labelEls.push(lbl);

      clickTargets.push(mesh);
      planetObjs.push({ data: d, group, mesh, angle, label: lbl, moonMesh });
    }

    PLANETS.forEach(d => buildPlanet(d));

    /* ─ Asteroid Belt ─ */
    const beltN = 2000;
    const beltPos = new Float32Array(beltN * 3);
    for (let i = 0; i < beltN; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 20.5 + Math.random() * 3.5;
      beltPos[i * 3] = Math.cos(a) * r;
      beltPos[i * 3 + 1] = (Math.random() - 0.5) * 0.8;
      beltPos[i * 3 + 2] = Math.sin(a) * r;
    }
    const beltGeo = new THREE.BufferGeometry();
    beltGeo.setAttribute('position', new THREE.BufferAttribute(beltPos, 3));
    const belt = new THREE.Points(beltGeo, new THREE.PointsMaterial({
      color: 0x887766, size: 0.12, transparent: true, opacity: 0.5,
      sizeAttenuation: true, depthWrite: false
    }));
    scene.add(belt);

    /* ─ Raycaster ─ */
    const ray = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let selected = null;
    let hovered = null;

    // Camera animation (local mutable state inside closure)
    let camGoal = new THREE.Vector3(35, 30, 55);
    let lookGoal = new THREE.Vector3(0, 0, 0);
    let camAnimating = true;

    /* ─ Bridge: expose controls to React handlers ─ */
    bridge.current.flyTo = (pos, look) => {
      camGoal.copy(pos);
      lookGoal.copy(look);
      camAnimating = true;
    };
    bridge.current.clearSelection = () => { selected = null; };
    bridge.current.orbitLines = orbitLines;
    bridge.current.labelEls = labelEls;

    /* ─ Click Handler ─ */
    const onClick = (e) => {
      mouse.x = (e.clientX / innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / innerHeight) * 2 + 1;
      ray.setFromCamera(mouse, camera);
      const hits = ray.intersectObjects(clickTargets);
      if (hits.length) {
        const p = planetObjs.find(o => o.mesh === hits[0].object);
        if (p) {
          selected = p;
          setSelectedPlanet(p.data);
          setPanelOpen(true);
          const wp = new THREE.Vector3();
          p.group.getWorldPosition(wp);
          const off = p.data.radius * 5 + 4;
          camGoal.set(wp.x + off * 0.7, wp.y + off * 0.45, wp.z + off * 0.7);
          lookGoal.copy(wp);
          camAnimating = true;
        }
      }
    };

    /* ─ Hover Handler ─ */
    const onMouseMove = (e) => {
      mouse.x = (e.clientX / innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / innerHeight) * 2 + 1;
      ray.setFromCamera(mouse, camera);
      const hits = ray.intersectObjects(clickTargets);
      if (hits.length) {
        renderer.domElement.style.cursor = 'pointer';
        const p = planetObjs.find(o => o.mesh === hits[0].object);
        if (p && hovered !== p) {
          if (hovered) {
            hovered.mesh.material.emissiveIntensity = 1;
            hovered.label.classList.remove('highlight');
          }
          hovered = p;
          hovered.mesh.material.emissiveIntensity = 4;
          hovered.label.classList.add('highlight');
        }
      } else {
        renderer.domElement.style.cursor = 'grab';
        if (hovered) {
          hovered.mesh.material.emissiveIntensity = 1;
          hovered.label.classList.remove('highlight');
          hovered = null;
        }
      }
    };

    renderer.domElement.addEventListener('click', onClick);
    renderer.domElement.addEventListener('mousemove', onMouseMove);

    /* ─ Animation Loop ─ */
    const clock = new THREE.Clock();
    const _v3 = new THREE.Vector3();
    let raf;

    const loop = () => {
      raf = requestAnimationFrame(loop);
      const dt = clock.getDelta();
      const t = clock.getElapsedTime();
      const spd = speedRef.current;
      const lblVisible = showLabelsRef.current;

      // Planet orbits & rotation
      planetObjs.forEach(p => {
        p.angle += p.data.speed * 0.005 * spd * dt * 60;
        p.group.position.x = Math.cos(p.angle) * p.data.dist;
        p.group.position.z = Math.sin(p.angle) * p.data.dist;
        p.mesh.rotation.y += p.data.rot * spd;

        if (p.moonMesh) {
          const ma = t * 2.5 * spd;
          const mr = p.data.radius + 0.7;
          p.moonMesh.position.x = Math.cos(ma) * mr;
          p.moonMesh.position.z = Math.sin(ma) * mr;
          p.moonMesh.position.y = Math.sin(ma * 0.5) * 0.15;
        }
      });

      // Sun pulse
      sunMesh.scale.setScalar(1 + Math.sin(t * 1.8) * 0.015);
      glowSprite.material.opacity = 0.65 + Math.sin(t * 2.2) * 0.12;

      // Stars slow rotation
      stars.rotation.y += 0.00004;
      stars.rotation.x += 0.00001;

      // Belt slow rotation
      belt.rotation.y += 0.00008;

      // Camera fly animation
      if (camAnimating && camGoal && lookGoal) {
        camera.position.lerp(camGoal, 0.035);
        controls.target.lerp(lookGoal, 0.035);
        if (camera.position.distanceTo(camGoal) < 0.3) camAnimating = false;
      }

      // Follow selected planet
      if (selected && !camAnimating) {
        const wp = new THREE.Vector3();
        selected.group.getWorldPosition(wp);
        controls.target.lerp(wp, 0.06);
        const off = selected.data.radius * 5 + 4;
        camera.position.lerp(
          new THREE.Vector3(wp.x + off * 0.7, wp.y + off * 0.45, wp.z + off * 0.7),
          0.025
        );
      }

      // Update label 2D projections
      planetObjs.forEach(p => {
        p.group.getWorldPosition(_v3);
        _v3.y += p.data.radius + 0.7;
        const proj = _v3.clone().project(camera);
        if (proj.z > 1 || !lblVisible) {
          p.label.style.opacity = '0';
          return;
        }
        p.label.style.opacity = '1';
        p.label.style.left = ((proj.x * 0.5 + 0.5) * innerWidth) + 'px';
        p.label.style.top = ((-proj.y * 0.5 + 0.5) * innerHeight) + 'px';
      });

      controls.update();
      renderer.render(scene, camera);
    };
    loop();

    /* ─ Resize ─ */
    const onResize = () => {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
    };
    window.addEventListener('resize', onResize);

    /* ─ Cleanup ─ */
    return () => {
      cancelAnimationFrame(raf);
      renderer.domElement.removeEventListener('click', onClick);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      labelEls.forEach(l => l.remove());
      scene.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
          else obj.material.dispose();
        }
      });
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Derived Values ── */
  const colorHex = selectedPlanet
    ? '#' + new THREE.Color(selectedPlanet.color).getHexString()
    : '#ffffff';

  /* ── Render ── */
  return (
    <>
      <div ref={containerRef} id="canvas-container" />

      {/* Title */}
      <div className="ui-layer title-area">
        <div className="title-main">SOLAR SYSTEM</div>
        <div className="title-sub">Designed &amp; Developed by Abdulah Nadeem</div>
        <div className="title-line" />
      </div>

      {/* Hints */}
      <div className="ui-layer hint-area">
        <div className="hint-text hint-anim">
          <i className="fas fa-hand-pointer" /> Click planet for info<br />
          <i className="fas fa-arrows-alt" /> Drag to rotate<br />
          <i className="fas fa-search-plus" /> Scroll to zoom
        </div>
      </div>

      {/* Controls */}
      <div className="ui-layer ctrl-bar">
        <div className="ctrl-group">
          <span className="ctrl-label">Speed</span>
          <input
            type="range"
            className="speed-slider"
            min="0" max="5" step="0.1"
            value={speed}
            onChange={handleSpeed}
          />
          <span className="speed-val">{speed.toFixed(1)}x</span>
        </div>
        <div className="divider" />
        <button
          className={`ctrl-btn ${showOrbits ? 'on' : ''}`}
          onClick={() => setShowOrbits(v => !v)}
        >
          <i className="fas fa-circle-notch" /> Orbits
        </button>
        <button
          className={`ctrl-btn ${showLabels ? 'on' : ''}`}
          onClick={() => setShowLabels(v => !v)}
        >
          <i className="fas fa-tag" /> Labels
        </button>
        <div className="divider" />
        <button className="ctrl-btn" onClick={resetView}>
          <i className="fas fa-undo" /> Reset
        </button>
      </div>

      {/* Info Panel */}
      <div className={`info-panel ${panelOpen ? 'open' : ''}`}>
        <button className="info-close" onClick={closePanel}>
          <i className="fas fa-times" />
        </button>
        {selectedPlanet && (
          <>
            <div className="info-planet-name">
              <span className="color-dot" style={{ background: colorHex }} />
              {selectedPlanet.name}
            </div>
            <div className="info-planet-type">{selectedPlanet.type}</div>
            <div className="info-desc">{selectedPlanet.desc}</div>
            <div className="info-stats">
              {Object.entries(selectedPlanet.info).map(([k, v]) => (
                <div className="stat-card" key={k}>
                  <div className="stat-label">{k}</div>
                  <div className="stat-value">{v}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Labels Container (imperative DOM from useEffect) */}
      <div
        ref={labelBoxRef}
        style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 5 }}
      />

      {/* Toast */}
      <div className={`toast ${toastMsg ? 'show' : ''}`}>
        {toastMsg}
      </div>
    </>
  );
}