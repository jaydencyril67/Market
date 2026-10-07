import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

type GameState = 'ready' | 'playing' | 'paused' | 'over'

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<GameState>('ready')
  const [score, setScore] = useState(0)
  const [coins, setCoins] = useState(0)
  const stateRef = useRef<GameState>('ready')
  const keys = useRef({ left: false, right: false, jump: false })
  const restartRef = useRef<() => void>(() => {})

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x070b14)
    scene.fog = new THREE.Fog(0x070b14, 18, 75)

    const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 120)
    camera.position.set(0, 4.2, 8.5)

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    mount.appendChild(renderer.domElement)

    const hemi = new THREE.HemisphereLight(0x9db7ff, 0x11131a, 2.2)
    scene.add(hemi)
    const sun = new THREE.DirectionalLight(0xffffff, 2.8)
    sun.position.set(5, 12, 8)
    sun.castShadow = true
    scene.add(sun)

    const world = new THREE.Group()
    scene.add(world)

    const road = new THREE.Mesh(
      new THREE.BoxGeometry(11, 0.35, 120),
      new THREE.MeshStandardMaterial({ color: 0x151b28, roughness: 0.9 })
    )
    road.position.y = -0.25
    road.position.z = -45
    road.receiveShadow = true
    world.add(road)

    const laneLines: THREE.Mesh[] = []
    for (let z = 4; z > -110; z -= 5) {
      for (const x of [-1.85, 1.85]) {
        const line = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 0.025, 2.1),
          new THREE.MeshBasicMaterial({ color: 0x53617c })
        )
        line.position.set(x, -0.05, z)
        world.add(line)
        laneLines.push(line)
      }
    }

    const stars = new THREE.Group()
    const starGeo = new THREE.BufferGeometry()
    const positions = new Float32Array(360 * 3)
    for (let i = 0; i < 360; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 100
      positions[i * 3 + 1] = 5 + Math.random() * 35
      positions[i * 3 + 2] = -Math.random() * 100
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    stars.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x9fb8ff, size: 0.12 })))
    world.add(stars)

    const player = new THREE.Group()
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 1.35, 0.7),
      new THREE.MeshStandardMaterial({ color: 0x7c5cff, metalness: 0.35, roughness: 0.28 })
    )
    body.position.y = 0.8
    body.castShadow = true
    player.add(body)
    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.25, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x8ffcff, emissive: 0x167c8a, emissiveIntensity: 1.8 })
    )
    visor.position.set(0, 1.02, -0.38)
    player.add(visor)
    player.position.set(0, 0, 3)
    scene.add(player)

    const obstacleMat = new THREE.MeshStandardMaterial({ color: 0xff4f68, emissive: 0x5c0e20, emissiveIntensity: 0.45 })
    const coinMat = new THREE.MeshStandardMaterial({ color: 0xffd34e, metalness: 0.8, roughness: 0.18, emissive: 0x6b3d00, emissiveIntensity: 0.35 })

    type Item = { mesh: THREE.Mesh; lane: number; kind: 'obstacle' | 'coin'; hit: boolean }
    let items: Item[] = []
    let running = false
    let ended = false
    let distance = 0
    let currentScore = 0
    let currentCoins = 0
    let speed = 12
    let spawnTimer = 0
    let coinTimer = 0
    let last = performance.now()
    let playerY = 0
    let verticalVelocity = 0

    const laneX = [-3.2, 0, 3.2]

    const removeItem = (item: Item) => {
      world.remove(item.mesh)
      item.mesh.geometry.dispose()
      if (Array.isArray(item.mesh.material)) item.mesh.material.forEach(m => m.dispose())
      else item.mesh.material.dispose()
    }

    const clearItems = () => {
      items.forEach(removeItem)
      items = []
    }

    const setGameState = (next: GameState) => {
      stateRef.current = next
      setState(next)
    }

    const reset = () => {
      clearItems()
      player.position.set(0, 0, 3)
      player.rotation.set(0, 0, 0)
      playerY = 0
      verticalVelocity = 0
      distance = 0
      currentScore = 0
      currentCoins = 0
      speed = 12
      spawnTimer = 0
      coinTimer = 0
      ended = false
      setScore(0)
      setCoins(0)
      setGameState('ready')
    }

    const start = () => {
      if (ended) reset()
      running = true
      ended = false
      setGameState('playing')
    }

    const pause = () => {
      if (!running || ended) return
      running = false
      setGameState('paused')
    }

    const resume = () => {
      if (ended) return
      running = true
      setGameState('playing')
    }

    restartRef.current = reset

    const spawnObstacle = () => {
      const lane = Math.floor(Math.random() * 3)
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.55, 1.2, 1.2), obstacleMat.clone())
      mesh.position.set(laneX[lane], 0.58, -72)
      mesh.castShadow = true
      world.add(mesh)
      items.push({ mesh, lane, kind: 'obstacle', hit: false })
    }

    const spawnCoin = () => {
      const lane = Math.floor(Math.random() * 3)
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.12, 20), coinMat)
      mesh.rotation.x = Math.PI / 2
      mesh.position.set(laneX[lane], 1.05 + Math.random() * 1.3, -72)
      mesh.castShadow = true
      world.add(mesh)
      items.push({ mesh, lane, kind: 'coin', hit: false })
    }

    const collide = (item: Item) => {
      const dx = Math.abs(item.mesh.position.x - player.position.x)
      const dz = Math.abs(item.mesh.position.z - player.position.z)
      const dy = Math.abs(item.mesh.position.y - (player.position.y + 0.75))
      return dx < 1.25 && dz < 1.25 && dy < 1.35
    }

    const onKey = (down: boolean, key: string) => {
      if (key === 'ArrowLeft' || key.toLowerCase() === 'a') keys.current.left = down
      if (key === 'ArrowRight' || key.toLowerCase() === 'd') keys.current.right = down
      if ((key === 'ArrowUp' || key === ' ' || key.toLowerCase() === 'w') && down) keys.current.jump = true
      if (key.toLowerCase() === 'p' && down) {
        if (stateRef.current === 'playing') pause()
        else if (stateRef.current === 'paused') resume()
      }
    }

    const keyDown = (e: KeyboardEvent) => onKey(true, e.key)
    const keyUp = (e: KeyboardEvent) => onKey(false, e.key)
    window.addEventListener('keydown', keyDown)
    window.addEventListener('keyup', keyUp)

    const resize = () => {
      const w = Math.max(mount.clientWidth, 320)
      const h = Math.max(mount.clientHeight, 420)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h, false)
    }
    resize()
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(mount)

    const animate = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now

      if (running && !ended) {
        const steer = (keys.current.right ? 1 : 0) - (keys.current.left ? 1 : 0)
        player.position.x += steer * dt * 8
        player.position.x = THREE.MathUtils.clamp(player.position.x, -3.2, 3.2)
        player.rotation.z = THREE.MathUtils.lerp(player.rotation.z, -steer * 0.13, dt * 8)

        if (keys.current.jump && playerY <= 0.01) verticalVelocity = 8.5
        keys.current.jump = false
        verticalVelocity -= 20 * dt
        playerY += verticalVelocity * dt
        if (playerY < 0) {
          playerY = 0
          verticalVelocity = 0
        }
        player.position.y = playerY

        speed = Math.min(24, speed + dt * 0.22)
        distance += speed * dt
        currentScore = Math.floor(distance * 10) + currentCoins * 25
        setScore(currentScore)

        spawnTimer += dt
        coinTimer += dt
        if (spawnTimer > Math.max(0.52, 1.15 - distance / 700)) {
          spawnTimer = 0
          spawnObstacle()
          if (Math.random() < 0.35) spawnObstacle()
        }
        if (coinTimer > 0.55) {
          coinTimer = 0
          spawnCoin()
        }

        for (const line of laneLines) {
          line.position.z += speed * dt
          if (line.position.z > 7) line.position.z -= 115
        }

        for (let i = items.length - 1; i >= 0; i--) {
          const item = items[i]
          item.mesh.position.z += speed * dt
          if (item.kind === 'coin') item.mesh.rotation.z += dt * 7

          if (!item.hit && collide(item)) {
            item.hit = true
            if (item.kind === 'coin') {
              currentCoins += 1
              setCoins(currentCoins)
              currentScore = Math.floor(distance * 10) + currentCoins * 25
              setScore(currentScore)
              removeItem(item)
              items.splice(i, 1)
              continue
            } else {
              ended = true
              running = false
              setGameState('over')
            }
          }

          if (item.mesh.position.z > 8) {
            removeItem(item)
            items.splice(i, 1)
          }
        }
      }

      camera.position.x = THREE.MathUtils.lerp(camera.position.x, player.position.x * 0.16, dt * 4)
      camera.lookAt(player.position.x * 0.18, 1.2 + playerY * 0.12, -8)
      renderer.render(scene, camera)
      requestAnimationFrame(animate)
    }

    const frame = requestAnimationFrame(animate)

    ;(mount as HTMLDivElement & { __game?: { start: () => void; pause: () => void; resume: () => void } }).__game = { start, pause, resume }

    return () => {
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      window.removeEventListener('keydown', keyDown)
      window.removeEventListener('keyup', keyUp)
      clearItems()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  const action = () => {
    const game = mountRef.current as (HTMLDivElement & { __game?: { start: () => void; pause: () => void; resume: () => void } }) | null
    if (!game?.__game) return
    if (state === 'ready' || state === 'over') game.__game.start()
    else if (state === 'paused') game.__game.resume()
    else game.__game.pause()
  }

  const press = (name: 'left' | 'right' | 'jump') => {
    keys.current[name] = true
    setTimeout(() => { keys.current[name] = false }, name === 'jump' ? 80 : 180)
  }

  return (
    <div className="game-shell">
      <div ref={mountRef} className="game-canvas" />
      <div className="hud">
        <div className="brand"><span className="brand-mark">KH</span><span>NEON RUN</span></div>
        <div className="stats">
          <div><small>SCORE</small><strong>{score.toLocaleString()}</strong></div>
          <div><small>COINS</small><strong>🪙 {coins}</strong></div>
        </div>
      </div>

      {state !== 'playing' && (
        <div className="overlay">
          <div className="panel">
            <div className="eyebrow">{state === 'over' ? 'RUN COMPLETE' : state === 'paused' ? 'PAUSED' : 'FIRST RUN'}</div>
            <h1>{state === 'over' ? 'You crashed.' : 'NEON RUN'}</h1>
            <p>{state === 'over' ? 'The road got the better of you. Try again and beat your score.' : 'Dodge the blocks, grab the coins, and see how far you can go.'}</p>
            <button className="primary" onClick={action}>{state === 'over' ? 'RUN AGAIN' : state === 'paused' ? 'RESUME' : 'START GAME'}</button>
            {state === 'ready' && <div className="hint">← → move · ↑ jump · P pause</div>}
            {state === 'over' && <div className="result">Final score <b>{score.toLocaleString()}</b> · Coins <b>{coins}</b></div>}
          </div>
        </div>
      )}

      <div className="mobile-controls" aria-label="Game controls">
        <button onPointerDown={() => press('left')} aria-label="Move left">←</button>
        <button onPointerDown={() => press('jump')} aria-label="Jump">↑</button>
        <button onPointerDown={() => press('right')} aria-label="Move right">→</button>
      </div>
      <button className="pause-button" onClick={action} aria-label={state === 'playing' ? 'Pause game' : 'Resume game'}>{state === 'playing' ? 'Ⅱ' : '▶'}</button>
    </div>
  )
}
