"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion } from "framer-motion"

const TrafficLightApp = () => {
  // App states
  const [appState, setAppState] = useState("landing") // 'landing', 'map', 'light'
  const [lightState, setLightState] = useState("red")
  const [timer, setTimer] = useState(30)
  const [location, setLocation] = useState("แยกไฟแดงหน้า มฟล.")
  const [speed, setSpeed] = useState(0)
  const [notifications, setNotifications] = useState([])
  const [currentGreenIndex, setCurrentGreenIndex] = useState(1) // Start with direction 1 (ไปแม่สาย) as green
  const [redCountdown, setRedCountdown] = useState(30) // Shared countdown for all red lights
  const [nextGreenDirection, setNextGreenDirection] = useState(2) // Next direction to get green light
  const [fiveMinutePredictions, setFiveMinutePredictions] = useState([]) // Predictions for every 5 minutes

  // Use refs to track the current state without triggering re-renders
  const currentGreenIndexRef = useRef(1)
  const redCountdownRef = useRef(30)
  const trafficLightsRef = useRef(null)
  const isUpdatingRef = useRef(false)
  const greenTimeLeftRef = useRef(30) // เพิ่ม ref เพื่อเก็บเวลาที่เหลือของไฟเขียวปัจจุบัน

  // Direction sequence: 0: เข้ามอ, 1: ไปแม่สาย, 2: ลงเชียงราย, 3: ออกมอ
  const directionSequence = [1, 2, 3] // The sequence of directions to get green light

  // Direction names for display
  const directionNames = {
    1: "ไปแม่สาย",
    2: "ลงเชียงราย",
    3: "ออกมอ",
  }

  // Duration constants
  const GREEN_DURATION = 30 // 30 seconds for green light
  const YELLOW_DURATION = 5 // 5 seconds for yellow light
  const CYCLE_DURATION = GREEN_DURATION + YELLOW_DURATION // Total duration of one traffic light cycle

  // Mock traffic light data for the main intersection in front of MFU
  const [trafficLights, setTrafficLights] = useState([
    {
      id: 1,
      lat: 20.0472,
      lng: 99.8965,
      name: "แยกไฟแดงหน้า มฟล. (ทางเข้ามหาวิทยาลัย)",
      status: "red",
      timeLeft: 30,
      direction: 0, // เข้ามอ
    },
    {
      id: 2,
      lat: 20.047,
      lng: 99.8967,
      name: "แยกไฟแดงหน้า มฟล. (ทางไปแม่สาย)",
      status: "green",
      timeLeft: GREEN_DURATION,
      direction: 1, // ไปแม่สาย
    },
    {
      id: 3,
      lat: 20.0474,
      lng: 99.8963,
      name: "แยกไฟแดงหน้า มฟล. (ทางลงเชียงราย)",
      status: "red",
      timeLeft: 30,
      direction: 2, // ลงเชียงราย
    },
    {
      id: 4,
      lat: 20.0475,
      lng: 99.8964,
      name: "แยกไฟแดงหน้า มฟล. (ทางออกจากมหาวิทยาลัย)",
      status: "red",
      timeLeft: 30,
      direction: 3, // ออกมอ
    },
  ])

  // Selected traffic light (for detailed view)
  const [selectedLight, setSelectedLight] = useState(null)

  // Safe state update function to prevent race conditions
  const safeUpdateState = useCallback((updateFunction) => {
    if (isUpdatingRef.current) return
    isUpdatingRef.current = true

    setTimeout(() => {
      updateFunction()
      isUpdatingRef.current = false
    }, 0)
  }, [])

  // Initialize refs with initial state values
  useEffect(() => {
    // Initialize refs with initial state values
    currentGreenIndexRef.current = 1 // Start with direction 1 (ไปแม่สาย) as green
    redCountdownRef.current = 30
    trafficLightsRef.current = trafficLights
    greenTimeLeftRef.current = GREEN_DURATION // เริ่มต้นด้วยเวลาเต็ม
  }, []) // Empty dependency array means this runs once on mount

  // Update refs when state changes
  useEffect(() => {
    currentGreenIndexRef.current = currentGreenIndex
  }, [currentGreenIndex])

  useEffect(() => {
    redCountdownRef.current = redCountdown
  }, [redCountdown])

  useEffect(() => {
    trafficLightsRef.current = trafficLights

    // อัพเดท greenTimeLeftRef จากไฟเขียวปัจจุบัน
    const greenLight = trafficLights.find((light) => light.status === "green")
    if (greenLight) {
      greenTimeLeftRef.current = greenLight.timeLeft
    }
  }, [trafficLights])

  // Handler to navigate from landing to map
  const handleStartApp = () => {
    setAppState("map")
  }

  // Handler to view a specific traffic light
  const handleSelectLight = (light) => {
    if (!light) return

    setSelectedLight(light)
    setLightState(light.status)
    setTimer(light.timeLeft)
    setLocation(light.name)
    setAppState("light")
  }

  // Handler to go back to map
  const handleBackToMap = () => {
    setAppState("map")
  }

  // Calculate next green direction
  useEffect(() => {
    if (currentGreenIndex !== null) {
      const currentIndex = directionSequence.indexOf(currentGreenIndex)
      const nextIndex = (currentIndex + 1) % directionSequence.length
      setNextGreenDirection(directionSequence[nextIndex])
    }
  }, [currentGreenIndex, directionSequence])

  // Calculate 5-minute predictions - memoized to prevent recalculation on every render
  const calculatePredictions = useCallback(() => {
    if (currentGreenIndexRef.current === null) return []

    const predictions = []
    const totalCycleTime = directionSequence.length * CYCLE_DURATION // Total time for all directions to cycle
    const currentIndex = directionSequence.indexOf(currentGreenIndexRef.current)

    // ใช้เวลาที่เหลือจริงของไฟเขียวปัจจุบัน
    const currentGreenTimeLeft = greenTimeLeftRef.current

    // คำนวณเวลาที่ผ่านไปแล้วในรอบปัจจุบัน
    const elapsedTimeInCurrentCycle = GREEN_DURATION - currentGreenTimeLeft

    // คำนวณเวลาที่เหลือในรอบปัจจุบัน (ไฟเขียว + ไฟเหลือง)
    const remainingTimeInCurrentCycle = currentGreenTimeLeft + YELLOW_DURATION

    // คำนวณพยากรณ์สำหรับ 6 ช่วงเวลา (5 นาที, 10 นาที, 15 นาที, 20 นาที, 25 นาที, 30 นาที)
    for (let i = 1; i <= 6; i++) {
      const targetTime = i * 5 * 60 // 5 นาทีในหน่วยวินาที

      // คำนวณว่าจะผ่านไปกี่รอบเต็มหลังจากรอบปัจจุบัน
      let timeToTarget = targetTime

      // หักเวลาที่เหลือในรอบปัจจุบัน
      timeToTarget -= remainingTimeInCurrentCycle

      // คำนวณจำนวนรอบเต็มที่จะผ่านไป
      const completeCycles = Math.floor(timeToTarget / totalCycleTime)

      // คำนวณเวลาที่เหลือหลังจากรอบเต็ม
      const remainingTime = timeToTarget % totalCycleTime

      // คำนวณว่าไฟเขียวจะอยู่ที่ทิศทางไหน
      let nextGreenDirectionIndex = (currentIndex + 1) % directionSequence.length // เริ่มจากทิศทางถัดไป

      // บวกจำนวนรอบเต็ม
      nextGreenDirectionIndex = (nextGreenDirectionIndex + completeCycles) % directionSequence.length

      // ตรวจสอบว่าเวลาที่เหลือเพียงพอที่จะข้ามไปอีกทิศทางหรือไม่
      let tempTime = 0
      while (tempTime + CYCLE_DURATION <= remainingTime) {
        tempTime += CYCLE_DURATION
        nextGreenDirectionIndex = (nextGreenDirectionIndex + 1) % directionSequence.length
      }

      // ตรวจสอบว่าเวลาที่เหลือมากกว่าเวลาไฟเขียวหรือไม่
      if (remainingTime > 0 && tempTime + GREEN_DURATION <= remainingTime) {
        // ถ้าใช่ แสดงว่าไฟเขียวจะอยู่ที่ทิศทางถัดไป
        nextGreenDirectionIndex = (nextGreenDirectionIndex + 1) % directionSequence.length
      }

      const predictedGreenDirection = directionSequence[nextGreenDirectionIndex]

      predictions.push({
        timeLabel: `${i * 5} นาที`,
        direction: predictedGreenDirection,
        directionName: directionNames[predictedGreenDirection] || "ไม่ทราบ",
      })
    }

    return predictions
  }, [directionSequence, GREEN_DURATION, YELLOW_DURATION, CYCLE_DURATION, directionNames])

  // Update predictions when current green index or green time left changes
  useEffect(() => {
    // อัพเดทพยากรณ์เมื่อมีการเปลี่ยนแปลงทิศทางไฟเขียวหรือเวลาที่เหลือ
    const updatePredictions = () => {
      const predictions = calculatePredictions()
      if (JSON.stringify(predictions) !== JSON.stringify(fiveMinutePredictions)) {
        setFiveMinutePredictions(predictions)
      }
    }

    // อัพเดททันทีเมื่อมีการเปลี่ยนแปลง
    updatePredictions()

    // อัพเดททุก 1 วินาทีเพื่อให้พยากรณ์แม่นยำ
    const predictionInterval = setInterval(updatePredictions, 1000)

    return () => clearInterval(predictionInterval)
  }, [currentGreenIndex, calculatePredictions, fiveMinutePredictions])

  // Simulate getting updates about nearby traffic lights
  useEffect(() => {
    if (appState !== "light") return

    const notify = setTimeout(() => {
      // Find the next direction that will get a green light
      const currentIndex = directionSequence.indexOf(currentGreenIndexRef.current)
      const nextIndex = (currentIndex + 1) % directionSequence.length
      const nextDirection = directionSequence[nextIndex]

      // Find the traffic light for that direction
      const nextLight = trafficLightsRef.current?.find((light) => light.direction === nextDirection)

      if (nextLight) {
        const newNotification = {
          id: Date.now(),
          message: `ไฟจราจรที่แยกหน้า มฟล. ${nextLight.name.split("(")[1].replace(")", "")} จะเปลี่ยนเป็นสีเขียวในอีก ${redCountdownRef.current} วินาที`,
          time: new Date().toLocaleTimeString(),
        }
        setNotifications((prev) => [newNotification, ...prev].slice(0, 3))
      }
    }, 8000)

    return () => clearTimeout(notify)
  }, [appState, directionSequence])

  // Simulate speed changes
  useEffect(() => {
    if (appState !== "light") return

    const speedInterval = setInterval(() => {
      setSpeed(Math.floor(Math.random() * 10) + 25)
    }, 3000)

    return () => clearInterval(speedInterval)
  }, [appState])

  // Light color configurations
  const lightColors = {
    red: {
      active: "#FF0000",
      inactive: "#400000",
    },
    yellow: {
      active: "#FFFF00",
      inactive: "#404000",
    },
    green: {
      active: "#00FF00",
      inactive: "#004000",
    },
  }

  // Notification animation variants
  const notificationVariants = {
    initial: { opacity: 0, y: 50 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, x: -100 },
  }

  // Landing page slide-up animation
  const landingVariants = {
    initial: { opacity: 0, y: 100 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.8 } },
    exit: { opacity: 0, y: -100, transition: { duration: 0.5 } },
  }

  // Map marker animations
  const markerVariants = {
    initial: { scale: 0 },
    animate: { scale: 1, transition: { type: "spring", stiffness: 260, damping: 20 } },
  }

  // Countdown animation variants
  const countdownVariants = {
    initial: { scale: 0.8, opacity: 0.5 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.8, opacity: 0 },
  }

  // Simulate traffic light countdown with proper flow logic and synchronized red lights
  useEffect(() => {
    if (appState !== "map" && appState !== "light") return

    let isMounted = true

    // Store the current values in refs to avoid dependency issues
    const updateTrafficLights = () => {
      if (!isMounted) return

      setTrafficLights((prevLights) => {
        // สร้างสำเนาของไฟจราจรเพื่อแก้ไข
        const newLights = [...prevLights]

        // Find the current green light
        const greenLightIndex = newLights.findIndex((light) => light.status === "green")

        // Find the current yellow light
        const yellowLightIndex = newLights.findIndex((light) => light.status === "yellow")

        // Calculate the next red countdown
        let newRedCountdown = redCountdownRef.current

        // If there's a green light
        if (greenLightIndex !== -1) {
          // Decrease its timer
          newLights[greenLightIndex].timeLeft -= 1

          // If timer reaches 0, change to yellow
          if (newLights[greenLightIndex].timeLeft <= 0) {
            newLights[greenLightIndex].status = "yellow"
            newLights[greenLightIndex].timeLeft = YELLOW_DURATION // Yellow phase is 5 seconds

            // Calculate the new red countdown for all red lights
            newRedCountdown = YELLOW_DURATION + GREEN_DURATION

            // Update all red lights with the new countdown
            newLights.forEach((light, index) => {
              if (light.status === "red") {
                newLights[index].timeLeft = newRedCountdown
              }
            })
          }
        }
        // If there's a yellow light
        else if (yellowLightIndex !== -1) {
          // Decrease its timer
          newLights[yellowLightIndex].timeLeft -= 1

          // If timer reaches 0, change to red and make the next light green
          if (newLights[yellowLightIndex].timeLeft <= 0) {
            newLights[yellowLightIndex].status = "red"

            // Find the current direction in the sequence
            const currentDirection = newLights[yellowLightIndex].direction
            const currentIndex = directionSequence.indexOf(currentDirection)

            // Get the next direction in the sequence
            const nextIndex = (currentIndex + 1) % directionSequence.length
            const nextDirection = directionSequence[nextIndex]

            // Find the light for the next direction and make it green
            const nextLightIndex = newLights.findIndex((light) => light.direction === nextDirection)
            if (nextLightIndex !== -1) {
              newLights[nextLightIndex].status = "green"
              newLights[nextLightIndex].timeLeft = GREEN_DURATION // Green phase is 30 seconds

              // Update the next green direction (will be handled separately)
              const nextGreenDir = nextDirection

              // Set the red countdown for all red lights
              newRedCountdown = GREEN_DURATION

              // Update all red lights with the new countdown, including the one that just turned red
              newLights.forEach((light, index) => {
                if (light.status === "red") {
                  newLights[index].timeLeft = newRedCountdown
                }
              })

              // Explicitly set the countdown for the light that just turned red
              newLights[yellowLightIndex].timeLeft = newRedCountdown

              // Schedule the currentGreenIndex update outside this function
              setTimeout(() => {
                setCurrentGreenIndex(nextGreenDir)
              }, 0)
            }
          }
        }
        // If there's no green or yellow light, start the sequence
        else {
          // Make the first direction in the sequence green
          const firstDirection = directionSequence[0]
          const firstLightIndex = newLights.findIndex((light) => light.direction === firstDirection)
          if (firstLightIndex !== -1) {
            newLights[firstLightIndex].status = "green"
            newLights[firstLightIndex].timeLeft = GREEN_DURATION // Green phase is 30 seconds

            // Schedule the currentGreenIndex update outside this function
            setTimeout(() => {
              setCurrentGreenIndex(firstDirection)
            }, 0)

            // Set the red countdown for all red lights
            newRedCountdown = GREEN_DURATION

            // Update all red lights with the new countdown
            newLights.forEach((light, index) => {
              if (light.status === "red") {
                newLights[index].timeLeft = newRedCountdown
              }
            })
          }
        }

        // If there's no yellow light, decrease the red countdown
        if (yellowLightIndex === -1) {
          newRedCountdown = Math.max(0, redCountdownRef.current - 1)
        }

        // Schedule the red countdown update outside this function
        if (newRedCountdown !== redCountdownRef.current) {
          setTimeout(() => {
            setRedCountdown(newRedCountdown)
          }, 0)
        }

        return newLights
      })
    }

    const countdownInterval = setInterval(updateTrafficLights, 1000)

    return () => {
      isMounted = false
      clearInterval(countdownInterval)
    }
  }, [appState, directionSequence, GREEN_DURATION, YELLOW_DURATION])

  // อัพเดทสถานะไฟจราจรและตัวนับเวลาในหน้ารายละเอียดให้ซิงค์กับหน้าแผนที่
  useEffect(() => {
    if (appState !== "light" || !selectedLight) return

    // อัพเดทสถานะไฟจราจรและตัวนับเวลาตามค่าจริงในแผนที่
    const updateDetailView = () => {
      const currentLight = trafficLights.find((light) => light.id === selectedLight.id)
      if (currentLight) {
        // ตรวจสอบว่าค่าเปลี่ยนแปลงหรือไม่ก่อนที่จะอัพเดทสถานะ
        if (lightState !== currentLight.status) {
          setLightState(currentLight.status)
        }
        if (timer !== currentLight.timeLeft) {
          setTimer(currentLight.timeLeft)
        }
      }
    }

    // อัพเดททันทีเมื่อเข้าสู่หน้ารายละเอียด
    updateDetailView()

    // อัพเดททุก 500ms เพื่อลดการ re-render
    const syncInterval = setInterval(updateDetailView, 500)

    return () => clearInterval(syncInterval)
  }, [appState, selectedLight, trafficLights, lightState, timer])

  // Render Landing Page
  const renderLandingPage = () => (
    <motion.div
      className="flex flex-col items-center justify-center h-screen bg-gradient-to-b from-blue-900 to-black text-white p-6"
      variants={landingVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className="text-center">
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.8 }}
        >
          <div className="mb-6 flex justify-center">
            <div className="bg-gray-800 rounded-lg p-4 inline-block">
              <div className="w-16 h-16 rounded-full mb-2" style={{ backgroundColor: "#FF0000" }}></div>
              <div className="w-16 h-16 rounded-full mb-2" style={{ backgroundColor: "#FFFF00" }}></div>
              <div className="w-16 h-16 rounded-full" style={{ backgroundColor: "#00FF00" }}></div>
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-2">TrafficTimerMFU</h1>
          <p className="text-xl mb-8">ระบบแจ้งเตือนไฟจราจรแบบเรียลไทม์ที่แยกหน้ามหาวิทยาลัยแม่ฟ้าหลวง</p>
        </motion.div>

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.8, type: "spring", stiffness: 200 }}
        >
          <button
            onClick={handleStartApp}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-full text-xl shadow-lg"
          >
            เริ่มต้นใช้งาน
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 1 }}
          className="mt-12 text-sm text-gray-400"
        >
          <p>แอปพลิเคชันนี้ช่วยให้คุณทราบเวลาของสัญญาณไฟจราจรที่แยกหน้ามหาวิทยาลัยแม่ฟ้าหลวง</p>
          <p>โปรดใช้งานอย่างระมัดระวังและไม่ควรดูโทรศัพท์ขณะขับขี่</p>
        </motion.div>
      </div>
    </motion.div>
  )

  // Render Map with Traffic Lights
  const renderMap = () => (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Map Header */}
      <div className="p-4 bg-gray-800 flex justify-between items-center">
        <h2 className="text-xl font-bold">แผนที่ไฟจราจรแยกหน้า มฟล.</h2>
        <div className="text-sm">{new Date().toLocaleTimeString()}</div>
      </div>

      {/* Map Container - Simplified for this example */}
      <div className="flex-grow relative bg-gray-700 overflow-hidden">
        {/* Map of the intersection in front of MFU (simplified representation) */}
        <div className="absolute inset-2 bg-gray-800 rounded-lg">
          {/* SVG Map */}
          <svg viewBox="0 0 400 400" className="w-full h-full">
            {/* Background elements with lower opacity */}
            <g className="opacity-30">
              {/* Main road (vertical) - แม่สาย */}
              <path d="M200,50 L200,150" stroke="#ffffff" strokeWidth="8" />
              <path d="M200,250 L200,350" stroke="#ffffff" strokeWidth="8" />

              {/* Road to/from MFU (horizontal right) */}
              <path d="M250,200 L350,200" stroke="#ffffff" strokeWidth="8" />

              {/* School as a rectangular area (left) */}
              <rect x="50" y="150" width="100" height="100" fill="#555555" stroke="#ffffff" strokeWidth="2" rx="5" />

              {/* Intersection circle */}
              <circle cx="200" cy="200" r="20" fill="#333333" stroke="#ffffff" strokeWidth="2" />
            </g>

            {/* Direction labels with backgrounds */}
            <g>
              {/* Mae Sai label */}
              <rect x="180" y="30" width="40" height="20" fill="#333333" rx="3" />
              <text x="200" y="45" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="bold">
                แม่สาย ↑
              </text>

              {/* Chiang Rai label */}
              <rect x="180" y="360" width="40" height="20" fill="#333333" rx="3" />
              <text x="200" y="375" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="bold">
                ↓ เชียงราย
              </text>

              {/* MFU Enter label */}
              <rect x="270" y="165" width="110" height="20" fill="#333333" rx="3" />
              <text x="375" y="180" textAnchor="end" fill="#ffffff" fontSize="14" fontWeight="bold">
                เข้ามหาวิทยาลัย →
              </text>

              {/* MFU Exit label */}
              <rect x="270" y="215" width="110" height="20" fill="#333333" rx="3" />
              <text x="375" y="230" textAnchor="end" fill="#ffffff" fontSize="14" fontWeight="bold">
                ← ออกจากมหาวิทยาลัย
              </text>

              {/* School text with background */}
              <rect x="60" y="190" width="80" height="20" fill="#555555" />
              <text x="100" y="205" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">
                โรงเรียนห้วยพลูพิทยา
              </text>
            </g>

            {/* Traffic Light Markers */}
            {/* ไปแม่สาย (North) */}
            <circle
              cx="200"
              cy="120"
              r="22"
              fill={
                trafficLights[1]?.status === "red"
                  ? lightColors.red.active
                  : trafficLights[1]?.status === "yellow"
                    ? lightColors.yellow.active
                    : lightColors.green.active
              }
              stroke="#ffffff"
              strokeWidth="3"
              className="cursor-pointer"
              onClick={() => handleSelectLight(trafficLights[1])}
            />
            <circle
              cx="200"
              cy="120"
              r="30"
              fill="none"
              stroke={
                trafficLights[1]?.status === "red"
                  ? lightColors.red.active
                  : trafficLights[1]?.status === "yellow"
                    ? lightColors.yellow.active
                    : lightColors.green.active
              }
              strokeWidth="2"
              strokeOpacity="0.5"
              strokeDasharray="5,3"
            />
            <text x="200" y="125" textAnchor="middle" fill="#ffffff" fontSize="16" fontWeight="bold">
              {trafficLights[1]?.status !== "red" ? trafficLights[1]?.timeLeft : ""}
            </text>
            <text x="200" y="90" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">
              ไปแม่สาย
            </text>

            {/* ลงเชียงราย (South) */}
            <circle
              cx="200"
              cy="280"
              r="22"
              fill={
                trafficLights[2]?.status === "red"
                  ? lightColors.red.active
                  : trafficLights[2]?.status === "yellow"
                    ? lightColors.yellow.active
                    : lightColors.green.active
              }
              stroke="#ffffff"
              strokeWidth="3"
              className="cursor-pointer"
              onClick={() => handleSelectLight(trafficLights[2])}
            />
            <circle
              cx="200"
              cy="280"
              r="30"
              fill="none"
              stroke={
                trafficLights[2]?.status === "red"
                  ? lightColors.red.active
                  : trafficLights[2]?.status === "yellow"
                    ? lightColors.yellow.active
                    : lightColors.green.active
              }
              strokeWidth="2"
              strokeOpacity="0.5"
              strokeDasharray="5,3"
            />
            <text x="200" y="285" textAnchor="middle" fill="#ffffff" fontSize="16" fontWeight="bold">
              {trafficLights[2]?.status !== "red" ? trafficLights[2]?.timeLeft : ""}
            </text>
            <text x="200" y="320" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">
              ลงเชียงราย
            </text>

            {/* ออกมอ */}
            <circle
              cx="130"
              cy="230"
              r="22"
              fill={
                trafficLights[3]?.status === "red"
                  ? lightColors.red.active
                  : trafficLights[3]?.status === "yellow"
                    ? lightColors.yellow.active
                    : lightColors.green.active
              }
              stroke="#ffffff"
              strokeWidth="3"
              className="cursor-pointer"
              onClick={() => handleSelectLight(trafficLights[3])}
            />
            <circle
              cx="130"
              cy="230"
              r="30"
              fill="none"
              stroke={
                trafficLights[3]?.status === "red"
                  ? lightColors.red.active
                  : trafficLights[3]?.status === "yellow"
                    ? lightColors.yellow.active
                    : lightColors.green.active
              }
              strokeWidth="2"
              strokeOpacity="0.5"
              strokeDasharray="5,3"
            />
            <text x="130" y="235" textAnchor="middle" fill="#ffffff" fontSize="16" fontWeight="bold">
              {trafficLights[3]?.status !== "red" ? trafficLights[3]?.timeLeft : ""}
            </text>
            <rect x="115" y="260" width="30" height="15" fill="#333333" rx="3" />
            <text x="130" y="270" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">
              ออกมอ
            </text>

            {/* Next Green Light Prediction Box */}
            <rect x="20" y="20" width="150" height="60" fill="#1a1a1a" stroke="#333333" strokeWidth="2" rx="5" />
            <text x="95" y="40" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="bold">
              พยากรณ์ไฟจราจร
            </text>
            <text x="95" y="65" textAnchor="middle" fill="#ffffff" fontSize="12">
              ไฟเขียวถัดไป:{" "}
              <tspan fill="#00FF00" fontWeight="bold">
                {directionNames[nextGreenDirection] || ""}
              </tspan>
            </text>
          </svg>
        </div>

        {/* 5-Minute Prediction Panel */}
        <div className="absolute top-4 right-4 bg-gray-800 p-4 rounded-lg shadow-lg w-64">
          <h3 className="text-lg font-bold mb-3 text-center border-b border-gray-700 pb-2">พยากรณ์ไฟจราจรทุก 5 นาที</h3>
          <div className="space-y-2">
            {fiveMinutePredictions.map((prediction, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="font-medium">{prediction.timeLabel}</span>
                <span className="bg-gray-700 px-3 py-1 rounded text-green-400 font-bold">
                  {prediction.directionName}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom info bar with next green light prediction */}
      <div className="p-4 bg-gray-800">
        <div className="flex justify-between items-center">
          <p className="text-sm">แตะที่ไฟจราจรเพื่อดูรายละเอียด</p>
          <div className="bg-gray-700 px-4 py-2 rounded-lg">
            <p className="text-sm">
              อีก <span className="font-bold">{redCountdown}</span> วินาที ไฟเขียวจะเปลี่ยนไปทาง{" "}
              <span className="text-green-400 font-bold">{directionNames[nextGreenDirection] || ""}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )

  // Render Traffic Light Detail View
  const renderTrafficLightDetail = () => (
    <div className="flex flex-col items-center justify-between h-screen bg-gray-900 text-white p-4">
      {/* Header with back button */}
      <div className="w-full flex justify-between items-center mb-4">
        <button onClick={handleBackToMap} className="bg-gray-800 p-2 rounded-full">
          ←
        </button>
        <div className="text-lg font-bold">{location}</div>
        <div className="text-sm">{new Date().toLocaleTimeString()}</div>
      </div>

      {/* Main Traffic Light Display */}
      <div className="flex flex-col items-center justify-center flex-grow">
        <div className="bg-gray-800 rounded-lg p-6 shadow-xl flex flex-col items-center">
          {/* Traffic Light Housing */}
          <div className="bg-gray-700 rounded-lg p-4 mb-6 w-64 flex flex-col items-center">
            {/* Red Light */}
            <motion.div
              className="w-32 h-32 rounded-full mb-4 flex items-center justify-center relative"
              style={{ backgroundColor: lightState === "red" ? lightColors.red.active : lightColors.red.inactive }}
              animate={{
                scale: lightState === "red" ? [1, 1.05, 1] : 1,
                boxShadow: lightState === "red" ? "0 0 20px rgba(255, 0, 0, 0.7)" : "none",
              }}
              transition={{
                repeat: lightState === "red" ? Number.POSITIVE_INFINITY : 0,
                duration: 2,
              }}
            >
              {lightState === "red" ? null : <span className="text-5xl font-bold">{timer}</span>}
            </motion.div>

            {/* Yellow Light */}
            <motion.div
              className="w-32 h-32 rounded-full mb-4 flex items-center justify-center relative"
              style={{
                backgroundColor: lightState === "yellow" ? lightColors.yellow.active : lightColors.yellow.inactive,
              }}
              animate={{
                scale: lightState === "yellow" ? [1, 1.05, 1] : 1,
                boxShadow: lightState === "yellow" ? "0 0 20px rgba(255, 255, 0, 0.7)" : "none",
              }}
              transition={{
                repeat: lightState === "yellow" ? Number.POSITIVE_INFINITY : 0,
                duration: 0.5,
              }}
            >
              {lightState === "yellow" && <span className="text-5xl font-bold text-black">{timer}</span>}
            </motion.div>

            {/* Green Light */}
            <motion.div
              className="w-32 h-32 rounded-full flex items-center justify-center relative"
              style={{
                backgroundColor: lightState === "green" ? lightColors.green.active : lightColors.green.inactive,
              }}
              animate={{
                scale: lightState === "green" ? [1, 1.05, 1] : 1,
                boxShadow: lightState === "green" ? "0 0 20px rgba(0, 255, 0, 0.7)" : "none",
              }}
              transition={{
                repeat: lightState === "green" ? Number.POSITIVE_INFINITY : 0,
                duration: 2,
              }}
            >
              {lightState === "green" && <span className="text-5xl font-bold">{timer}</span>}
            </motion.div>
          </div>

          {/* Light Status and Countdown */}
          <div className="text-center mb-8 bg-gray-700 p-4 rounded-lg w-full">
            <div className="text-3xl font-bold mb-2">
              {lightState === "red" ? "หยุด" : lightState === "yellow" ? "ระวัง" : "ไป"}
            </div>
            <div className="text-xl">
              เปลี่ยนในอีก <span className="font-bold">{timer}</span> วินาที
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // App State Router
  const renderContent = () => {
    switch (appState) {
      case "landing":
        return renderLandingPage()
      case "map":
        return renderMap()
      case "light":
        return renderTrafficLightDetail()
      default:
        return renderLandingPage()
    }
  }

  return renderContent()
}

export default TrafficLightApp
