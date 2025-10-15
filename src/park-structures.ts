import * as THREE from 'three'

export class ParkStructures {
  private scene: THREE.Scene
  private structures: THREE.Group
  private labSignCanvas: HTMLCanvasElement | null = null
  private labSignTexture: THREE.CanvasTexture | null = null
  private labSignMesh: THREE.Mesh | null = null

  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.structures = new THREE.Group()
    this.structures.name = 'ParkStructures'
    this.scene.add(this.structures)
  }

  public buildAll() {
    this.buildMainGate()
    this.buildBoundaryFence()
    this.buildEntrancePlaza()
    this.buildRangerStation()
    this.buildExperimentLab()
  }

  private buildMainGate() {
    const gateGroup = new THREE.Group()
    gateGroup.name = 'MainGate'

    // Gate pillars (two tall columns)
    const pillarGeometry = new THREE.BoxGeometry(2, 8, 2)
    const pillarMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b7355,
      roughness: 0.8,
      metalness: 0.2,
    })

    // Left pillar
    const leftPillar = new THREE.Mesh(pillarGeometry, pillarMaterial)
    leftPillar.position.set(-6, 4, 0)
    leftPillar.castShadow = true
    leftPillar.receiveShadow = true
    gateGroup.add(leftPillar)

    // Right pillar
    const rightPillar = new THREE.Mesh(pillarGeometry, pillarMaterial)
    rightPillar.position.set(6, 4, 0)
    rightPillar.castShadow = true
    rightPillar.receiveShadow = true
    gateGroup.add(rightPillar)

    // Pillar caps (decorative tops)
    const capGeometry = new THREE.CylinderGeometry(1.5, 1.2, 1, 8)
    const capMaterial = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.6,
      roughness: 0.3,
    })

    const leftCap = new THREE.Mesh(capGeometry, capMaterial)
    leftCap.position.set(-6, 8.5, 0)
    leftCap.castShadow = true
    gateGroup.add(leftCap)

    const rightCap = new THREE.Mesh(capGeometry, capMaterial)
    rightCap.position.set(6, 8.5, 0)
    rightCap.castShadow = true
    gateGroup.add(rightCap)

    // Arch connecting the pillars
    const archCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-6, 8, 0),
      new THREE.Vector3(0, 12, 0),
      new THREE.Vector3(6, 8, 0)
    )
    const archPoints = archCurve.getPoints(50)
    const archGeometry = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(archPoints),
      50,
      0.4,
      8,
      false
    )
    const archMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b7355,
      roughness: 0.7,
      metalness: 0.3,
    })
    const arch = new THREE.Mesh(archGeometry, archMaterial)
    arch.castShadow = true
    gateGroup.add(arch)

    // Welcome sign
    const signGeometry = new THREE.BoxGeometry(8, 2, 0.3)
    const signMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.5,
    })
    const sign = new THREE.Mesh(signGeometry, signMaterial)
    sign.position.set(0, 10, 0)
    sign.castShadow = true
    gateGroup.add(sign)

    // Sign text (using simple geometry)
    const textMaterial = new THREE.MeshStandardMaterial({
      color: 0x2c5f2d,
      emissive: 0x2c5f2d,
      emissiveIntensity: 0.2,
    })

    // Create "WILDLIFE PARK" using simple shapes
    const letterGeometry = new THREE.BoxGeometry(0.3, 0.8, 0.1)
    const letters = [
      { x: -3.5, y: 10, z: 0.2 }, // W
      { x: -2.8, y: 10, z: 0.2 }, // I
      { x: -2.1, y: 10, z: 0.2 }, // L
      { x: -1.4, y: 10, z: 0.2 }, // D
      { x: -0.5, y: 10, z: 0.2 }, // (space)
      { x: 0.2, y: 10, z: 0.2 }, // P
      { x: 0.9, y: 10, z: 0.2 }, // A
      { x: 1.6, y: 10, z: 0.2 }, // R
      { x: 2.3, y: 10, z: 0.2 }, // K
    ]

    letters.forEach((pos) => {
      const letter = new THREE.Mesh(letterGeometry, textMaterial)
      letter.position.set(pos.x, pos.y, pos.z)
      gateGroup.add(letter)
    })

    // Decorative lanterns on pillars
    const lanternGeometry = new THREE.SphereGeometry(0.5, 16, 16)
    const lanternMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xffa500,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.9,
    })

    const leftLantern = new THREE.Mesh(lanternGeometry, lanternMaterial)
    leftLantern.position.set(-6, 7, 0)
    gateGroup.add(leftLantern)

    // Add point light to lantern
    const leftLight = new THREE.PointLight(0xffa500, 1, 10)
    leftLight.position.copy(leftLantern.position)
    gateGroup.add(leftLight)

    const rightLantern = new THREE.Mesh(lanternGeometry, lanternMaterial)
    rightLantern.position.set(6, 7, 0)
    gateGroup.add(rightLantern)

    const rightLight = new THREE.PointLight(0xffa500, 1, 10)
    rightLight.position.copy(rightLantern.position)
    gateGroup.add(rightLight)

    // Position the gate at the park entrance (adjust based on your track)
    gateGroup.position.set(0, 0, 50)
    gateGroup.rotation.y = Math.PI // Face inward

    this.structures.add(gateGroup)
  }

  private buildBoundaryFence() {
    const fenceGroup = new THREE.Group()
    fenceGroup.name = 'BoundaryFence'

    // Fence parameters
    const fenceHeight = 3
    const parkRadius = 70 // Outer boundary
    const segments = 64 // Number of fence segments

    // Materials
    const postMaterial = new THREE.MeshStandardMaterial({
      color: 0x654321,
      roughness: 0.9,
    })

    const railMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b7355,
      roughness: 0.8,
    })

    // Create circular fence
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      const nextAngle = ((i + 1) / segments) * Math.PI * 2

      const x = Math.cos(angle) * parkRadius
      const z = Math.sin(angle) * parkRadius
      const nextX = Math.cos(nextAngle) * parkRadius
      const nextZ = Math.sin(nextAngle) * parkRadius

      // Fence post
      const postGeometry = new THREE.CylinderGeometry(0.15, 0.15, fenceHeight, 8)
      const post = new THREE.Mesh(postGeometry, postMaterial)
      post.position.set(x, fenceHeight / 2, z)
      post.castShadow = true
      post.receiveShadow = true
      fenceGroup.add(post)

      // Horizontal rails (3 rails per section)
      for (let rail = 0; rail < 3; rail++) {
        const railY = (rail + 1) * (fenceHeight / 4)
        const railLength = Math.sqrt(Math.pow(nextX - x, 2) + Math.pow(nextZ - z, 2))

        const railGeometry = new THREE.CylinderGeometry(0.08, 0.08, railLength, 8)
        const railMesh = new THREE.Mesh(railGeometry, railMaterial)

        // Position and rotate rail to connect posts
        railMesh.position.set((x + nextX) / 2, railY, (z + nextZ) / 2)
        railMesh.rotation.z = Math.PI / 2
        railMesh.rotation.y = -angle - Math.PI / 2
        railMesh.castShadow = true
        fenceGroup.add(railMesh)
      }

      // Add decorative elements every 4th post
      if (i % 4 === 0) {
        const decorGeometry = new THREE.SphereGeometry(0.3, 8, 8)
        const decorMaterial = new THREE.MeshStandardMaterial({
          color: 0xd4af37,
          metalness: 0.5,
          roughness: 0.4,
        })
        const decor = new THREE.Mesh(decorGeometry, decorMaterial)
        decor.position.set(x, fenceHeight + 0.3, z)
        decor.castShadow = true
        fenceGroup.add(decor)
      }
    }

    this.structures.add(fenceGroup)
  }

  private buildEntrancePlaza() {
    const plazaGroup = new THREE.Group()
    plazaGroup.name = 'EntrancePlaza'

    // Plaza floor (decorative paving)
    const plazaGeometry = new THREE.CircleGeometry(15, 32)
    const plazaMaterial = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.8,
      metalness: 0.1,
    })
    const plaza = new THREE.Mesh(plazaGeometry, plazaMaterial)
    plaza.rotation.x = -Math.PI / 2
    plaza.position.set(0, 0.1, 45)
    plaza.receiveShadow = true
    plazaGroup.add(plaza)

    // Decorative pattern on plaza (concentric circles)
    for (let i = 1; i <= 3; i++) {
      const ringGeometry = new THREE.RingGeometry(i * 4, i * 4 + 0.3, 32)
      const ringMaterial = new THREE.MeshStandardMaterial({
        color: 0x8b7355,
        roughness: 0.9,
      })
      const ring = new THREE.Mesh(ringGeometry, ringMaterial)
      ring.rotation.x = -Math.PI / 2
      ring.position.set(0, 0.15, 45)
      plazaGroup.add(ring)
    }

    // Central fountain
    const fountainBase = new THREE.CylinderGeometry(3, 3.5, 1, 16)
    const fountainMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888,
      roughness: 0.6,
      metalness: 0.3,
    })
    const base = new THREE.Mesh(fountainBase, fountainMaterial)
    base.position.set(0, 0.5, 45)
    base.castShadow = true
    base.receiveShadow = true
    plazaGroup.add(base)

    // Fountain bowl
    const bowlGeometry = new THREE.SphereGeometry(2, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2)
    const bowlMaterial = new THREE.MeshStandardMaterial({
      color: 0x6699cc,
      transparent: true,
      opacity: 0.7,
      roughness: 0.1,
      metalness: 0.8,
    })
    const bowl = new THREE.Mesh(bowlGeometry, bowlMaterial)
    bowl.position.set(0, 1, 45)
    plazaGroup.add(bowl)

    // Water effect (simple blue sphere)
    const waterGeometry = new THREE.SphereGeometry(1.8, 16, 16)
    const waterMaterial = new THREE.MeshStandardMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.6,
      roughness: 0.1,
    })
    const water = new THREE.Mesh(waterGeometry, waterMaterial)
    water.position.set(0, 1.2, 45)
    water.scale.y = 0.3
    plazaGroup.add(water)

    // Benches around plaza (4 benches)
    const benchPositions = [
      { x: 10, z: 45, rotation: Math.PI / 2 },
      { x: -10, z: 45, rotation: -Math.PI / 2 },
      { x: 0, z: 55, rotation: 0 },
      { x: 0, z: 35, rotation: Math.PI },
    ]

    benchPositions.forEach((pos) => {
      const bench = this.createBench()
      bench.position.set(pos.x, 0, pos.z)
      bench.rotation.y = pos.rotation
      plazaGroup.add(bench)
    })

    // Lamp posts (4 around plaza)
    const lampPositions = [
      { x: 12, z: 52 },
      { x: -12, z: 52 },
      { x: 12, z: 38 },
      { x: -12, z: 38 },
    ]

    lampPositions.forEach((pos) => {
      const lamp = this.createLampPost()
      lamp.position.set(pos.x, 0, pos.z)
      plazaGroup.add(lamp)
    })

    this.structures.add(plazaGroup)
  }

  private createBench(): THREE.Group {
    const benchGroup = new THREE.Group()

    const woodMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 0.8,
    })

    // Seat
    const seatGeometry = new THREE.BoxGeometry(2, 0.2, 0.6)
    const seat = new THREE.Mesh(seatGeometry, woodMaterial)
    seat.position.y = 0.5
    seat.castShadow = true
    benchGroup.add(seat)

    // Backrest
    const backGeometry = new THREE.BoxGeometry(2, 0.8, 0.1)
    const back = new THREE.Mesh(backGeometry, woodMaterial)
    back.position.set(0, 0.9, -0.25)
    back.castShadow = true
    benchGroup.add(back)

    // Legs (4)
    const legGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.5, 8)
    const legPositions = [
      { x: -0.8, z: 0.2 },
      { x: 0.8, z: 0.2 },
      { x: -0.8, z: -0.2 },
      { x: 0.8, z: -0.2 },
    ]

    legPositions.forEach((pos) => {
      const leg = new THREE.Mesh(legGeometry, woodMaterial)
      leg.position.set(pos.x, 0.25, pos.z)
      leg.castShadow = true
      benchGroup.add(leg)
    })

    return benchGroup
  }

  private createLampPost(): THREE.Group {
    const lampGroup = new THREE.Group()

    // Post
    const postGeometry = new THREE.CylinderGeometry(0.1, 0.15, 4, 8)
    const postMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.7,
      roughness: 0.3,
    })
    const post = new THREE.Mesh(postGeometry, postMaterial)
    post.position.y = 2
    post.castShadow = true
    lampGroup.add(post)

    // Lamp head
    const lampGeometry = new THREE.SphereGeometry(0.4, 16, 16)
    const lampMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffcc,
      emissive: 0xffff88,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.9,
    })
    const lamp = new THREE.Mesh(lampGeometry, lampMaterial)
    lamp.position.y = 4.3
    lampGroup.add(lamp)

    // Light source
    const light = new THREE.PointLight(0xffffcc, 1.5, 20)
    light.position.y = 4.3
    light.castShadow = true
    light.shadow.mapSize.width = 512
    light.shadow.mapSize.height = 512
    lampGroup.add(light)

    return lampGroup
  }

  private buildRangerStation() {
    const stationGroup = new THREE.Group()
    stationGroup.name = 'RangerStation'

    // Building base/foundation
    const foundationGeometry = new THREE.BoxGeometry(10, 0.3, 8)
    const foundationMaterial = new THREE.MeshStandardMaterial({
      color: 0x666666,
      roughness: 0.9,
    })
    const foundation = new THREE.Mesh(foundationGeometry, foundationMaterial)
    foundation.position.set(0, 0.15, 0)
    foundation.castShadow = true
    foundation.receiveShadow = true
    stationGroup.add(foundation)

    // Main building walls
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b7355,
      roughness: 0.8,
    })

    const mainWallGeometry = new THREE.BoxGeometry(10, 4, 8)
    const mainWall = new THREE.Mesh(mainWallGeometry, wallMaterial)
    mainWall.position.set(0, 2.3, 0)
    mainWall.castShadow = true
    mainWall.receiveShadow = true
    stationGroup.add(mainWall)

    // Roof
    const roofGeometry = new THREE.ConeGeometry(7, 2.5, 4)
    const roofMaterial = new THREE.MeshStandardMaterial({
      color: 0x654321,
      roughness: 0.9,
    })
    const roof = new THREE.Mesh(roofGeometry, roofMaterial)
    roof.position.set(0, 5.55, 0)
    roof.rotation.y = Math.PI / 4
    roof.castShadow = true
    stationGroup.add(roof)

    // Door
    const doorGeometry = new THREE.BoxGeometry(1.5, 2.5, 0.2)
    const doorMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a3728,
      roughness: 0.7,
    })
    const door = new THREE.Mesh(doorGeometry, doorMaterial)
    door.position.set(0, 1.55, 4.1)
    door.castShadow = true
    stationGroup.add(door)

    // Door handle
    const handleGeometry = new THREE.SphereGeometry(0.1, 8, 8)
    const handleMaterial = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.8,
      roughness: 0.2,
    })
    const handle = new THREE.Mesh(handleGeometry, handleMaterial)
    handle.position.set(0.5, 1.55, 4.2)
    stationGroup.add(handle)

    // Windows (4 windows)
    const windowGeometry = new THREE.BoxGeometry(1.2, 1.2, 0.15)
    const windowMaterial = new THREE.MeshStandardMaterial({
      color: 0x87ceeb,
      transparent: true,
      opacity: 0.6,
      roughness: 0.1,
      metalness: 0.5,
    })

    const windowPositions = [
      { x: -2.5, y: 2.5, z: 4.05 },
      { x: 2.5, y: 2.5, z: 4.05 },
      { x: -5.05, y: 2.5, z: 0, rotY: Math.PI / 2 },
      { x: 5.05, y: 2.5, z: 0, rotY: Math.PI / 2 },
    ]

    windowPositions.forEach((pos) => {
      const window = new THREE.Mesh(windowGeometry, windowMaterial)
      window.position.set(pos.x, pos.y, pos.z)
      if (pos.rotY) window.rotation.y = pos.rotY
      window.castShadow = true
      stationGroup.add(window)
    })

    // Chimney
    const chimneyGeometry = new THREE.CylinderGeometry(0.4, 0.5, 3, 8)
    const chimneyMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 0.9,
    })
    const chimney = new THREE.Mesh(chimneyGeometry, chimneyMaterial)
    chimney.position.set(3, 5.8, 2)
    chimney.castShadow = true
    stationGroup.add(chimney)

    // Porch
    const porchFloorGeometry = new THREE.BoxGeometry(10, 0.2, 2)
    const porchFloor = new THREE.Mesh(porchFloorGeometry, wallMaterial)
    porchFloor.position.set(0, 0.4, 5)
    porchFloor.castShadow = true
    porchFloor.receiveShadow = true
    stationGroup.add(porchFloor)

    // Porch posts
    const postGeometry = new THREE.CylinderGeometry(0.15, 0.15, 2, 8)
    const postMaterial = new THREE.MeshStandardMaterial({
      color: 0x654321,
      roughness: 0.8,
    })

    const porchPostPositions = [
      { x: -4.5, z: 5 },
      { x: 4.5, z: 5 },
    ]

    porchPostPositions.forEach((pos) => {
      const post = new THREE.Mesh(postGeometry, postMaterial)
      post.position.set(pos.x, 1.5, pos.z)
      post.castShadow = true
      stationGroup.add(post)
    })

    // Porch roof
    const porchRoofGeometry = new THREE.BoxGeometry(10, 0.2, 2.5)
    const porchRoof = new THREE.Mesh(porchRoofGeometry, roofMaterial)
    porchRoof.position.set(0, 2.6, 5.2)
    porchRoof.rotation.x = -0.2
    porchRoof.castShadow = true
    stationGroup.add(porchRoof)

    // Sign: "RANGER STATION"
    const signBoardGeometry = new THREE.BoxGeometry(4, 1, 0.2)
    const signBoardMaterial = new THREE.MeshStandardMaterial({
      color: 0x2c5f2d,
      roughness: 0.7,
    })
    const signBoard = new THREE.Mesh(signBoardGeometry, signBoardMaterial)
    signBoard.position.set(0, 3.5, 5.5)
    signBoard.castShadow = true
    stationGroup.add(signBoard)

    // Sign text (simplified)
    const signTextGeometry = new THREE.BoxGeometry(3, 0.4, 0.1)
    const signTextMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.3,
    })
    const signText = new THREE.Mesh(signTextGeometry, signTextMaterial)
    signText.position.set(0, 3.5, 5.6)
    stationGroup.add(signText)

    // Flag pole
    const poleGeometry = new THREE.CylinderGeometry(0.08, 0.08, 6, 8)
    const poleMaterial = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      metalness: 0.7,
      roughness: 0.3,
    })
    const pole = new THREE.Mesh(poleGeometry, poleMaterial)
    pole.position.set(-6, 3.5, 0)
    pole.castShadow = true
    stationGroup.add(pole)

    // Flag
    const flagGeometry = new THREE.PlaneGeometry(2, 1.2)
    const flagMaterial = new THREE.MeshStandardMaterial({
      color: 0x2c5f2d,
      side: THREE.DoubleSide,
      roughness: 0.8,
    })
    const flag = new THREE.Mesh(flagGeometry, flagMaterial)
    flag.position.set(-5, 5.5, 0)
    stationGroup.add(flag)

    // Position the ranger station near the entrance but off to the side
    stationGroup.position.set(25, 0, 40)
    stationGroup.rotation.y = -Math.PI / 6

    this.structures.add(stationGroup)
  }

  public update(time: number) {
    // Animate fountain water
    const water = this.structures
      .getObjectByName('EntrancePlaza')
      ?.children.find(
        (child) =>
          child instanceof THREE.Mesh && (child.material as any).color?.getHex() === 0x4488ff
      )
    if (water) {
      water.position.y = 1.2 + Math.sin(time * 2) * 0.1
    }

    // Pulse lanterns at gate
    const mainGate = this.structures.getObjectByName('MainGate')
    if (mainGate) {
      mainGate.children.forEach((child) => {
        if (child instanceof THREE.Mesh && (child.material as any).emissive) {
          const material = child.material as THREE.MeshStandardMaterial
          material.emissiveIntensity = 0.5 + Math.sin(time * 3) * 0.2
        }
      })
    }

    // Animate ranger station flag
    const rangerStation = this.structures.getObjectByName('RangerStation')
    if (rangerStation) {
      const flag = rangerStation.children.find(
        (child) => child instanceof THREE.Mesh && child.geometry instanceof THREE.PlaneGeometry
      )
      if (flag) {
        flag.rotation.y = Math.sin(time * 2) * 0.15
      }
    }
  }

  private buildExperimentLab() {
    const labGroup = new THREE.Group()
    labGroup.name = 'ExperimentLab'

    // Glass dome structure
    const domeGeometry = new THREE.SphereGeometry(8, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2)
    const domeMaterial = new THREE.MeshStandardMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.3,
      metalness: 0.5,
      roughness: 0.1,
      side: THREE.DoubleSide,
    })
    const dome = new THREE.Mesh(domeGeometry, domeMaterial)
    dome.position.y = 0.5
    labGroup.add(dome)

    // Floor platform
    const platformGeometry = new THREE.CylinderGeometry(8, 8, 0.5, 32)
    const platformMaterial = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      metalness: 0.6,
      roughness: 0.4,
    })
    const platform = new THREE.Mesh(platformGeometry, platformMaterial)
    platform.position.y = 0.25
    platform.castShadow = true
    platform.receiveShadow = true
    labGroup.add(platform)

    // Central pedestal for creature
    const pedestalGeometry = new THREE.CylinderGeometry(2, 2.5, 1, 16)
    const pedestalMaterial = new THREE.MeshStandardMaterial({
      color: 0x666666,
      metalness: 0.7,
      roughness: 0.3,
    })
    const pedestal = new THREE.Mesh(pedestalGeometry, pedestalMaterial)
    pedestal.position.y = 1
    pedestal.castShadow = true
    pedestal.receiveShadow = true
    labGroup.add(pedestal)

    // Glowing ring around pedestal
    const ringGeometry = new THREE.TorusGeometry(2.3, 0.1, 16, 32)
    const ringMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 0.8,
      metalness: 0.8,
      roughness: 0.2,
    })
    const ring = new THREE.Mesh(ringGeometry, ringMaterial)
    ring.position.y = 1.5
    ring.rotation.x = Math.PI / 2
    labGroup.add(ring)

    // Support pillars
    const pillarGeometry = new THREE.CylinderGeometry(0.3, 0.3, 8, 8)
    const pillarMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888,
      metalness: 0.7,
      roughness: 0.3,
    })

    const pillarCount = 6
    for (let i = 0; i < pillarCount; i++) {
      const angle = (i / pillarCount) * Math.PI * 2
      const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial)
      pillar.position.set(Math.cos(angle) * 7, 4, Math.sin(angle) * 7)
      pillar.castShadow = true
      labGroup.add(pillar)

      // Lights on pillars
      const lightGeometry = new THREE.SphereGeometry(0.3, 16, 16)
      const lightMaterial = new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        emissive: 0x00ffff,
        emissiveIntensity: 1,
      })
      const light = new THREE.Mesh(lightGeometry, lightMaterial)
      light.position.set(Math.cos(angle) * 7, 7.5, Math.sin(angle) * 7)
      labGroup.add(light)

      const pointLight = new THREE.PointLight(0x00ffff, 1, 15)
      pointLight.position.copy(light.position)
      labGroup.add(pointLight)
    }

    // Sign
    const signGeometry = new THREE.BoxGeometry(5, 1.5, 0.2)
    const signMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.5,
      roughness: 0.5,
    })
    const sign = new THREE.Mesh(signGeometry, signMaterial)
    sign.position.set(0, 2, 8.5)
    sign.castShadow = true
    labGroup.add(sign)

    // Create canvas texture for creature name text
    this.labSignCanvas = document.createElement('canvas')
    this.labSignCanvas.width = 512
    this.labSignCanvas.height = 128
    this.labSignTexture = new THREE.CanvasTexture(this.labSignCanvas)

    // Draw initial text
    this.updateLabSignCanvas('EXPERIMENT LAB')

    // Sign text plane with canvas texture
    const textGeometry = new THREE.PlaneGeometry(4.5, 1.2)
    const textMaterial = new THREE.MeshBasicMaterial({
      map: this.labSignTexture,
      transparent: true,
      side: THREE.DoubleSide,
    })
    this.labSignMesh = new THREE.Mesh(textGeometry, textMaterial)
    this.labSignMesh.position.set(0, 2.3, 8.61)
    labGroup.add(this.labSignMesh)

    // Position lab away from main path
    labGroup.position.set(-35, 0, -20)
    labGroup.userData.isExperimentLab = true

    this.structures.add(labGroup)
  }

  public getStructures(): THREE.Group {
    return this.structures
  }

  public getLabPosition(): THREE.Vector3 {
    const lab = this.structures.getObjectByName('ExperimentLab')
    // Position creature higher in the dome (Y=3.5 instead of 1.5)
    const basePos = lab ? lab.position.clone() : new THREE.Vector3(-35, 0, -20)
    basePos.y = 3.5
    return basePos
  }

  private updateLabSignCanvas(text: string) {
    if (!this.labSignCanvas) return

    const ctx = this.labSignCanvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, this.labSignCanvas.width, this.labSignCanvas.height)

    // Draw dark background for contrast
    ctx.fillStyle = '#1a1a1a'
    ctx.fillRect(0, 0, this.labSignCanvas.width, this.labSignCanvas.height)

    // Set text properties
    ctx.font = 'bold 48px "Courier New", monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // Draw glowing effect (multiple layers)
    ctx.shadowBlur = 20
    ctx.shadowColor = '#00ffff'

    // Outer glow
    ctx.fillStyle = '#00ffff'
    ctx.fillText(text, this.labSignCanvas.width / 2, this.labSignCanvas.height / 2)

    // Inner bright text
    ctx.shadowBlur = 10
    ctx.fillStyle = '#ffffff'
    ctx.fillText(text, this.labSignCanvas.width / 2, this.labSignCanvas.height / 2)

    // Update texture
    if (this.labSignTexture) {
      this.labSignTexture.needsUpdate = true
    }
  }

  public updateLabSign(creatureName: string) {
    this.updateLabSignCanvas(creatureName)
  }
}
