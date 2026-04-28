import type { GenerateRequest, HardwarePlan } from "@/types/hardware";

const arduinoStarterCode = `const int ledPin = 9;
const int sensorPin = A0;

void setup() {
  pinMode(ledPin, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int reading = analogRead(sensorPin);
  int brightness = map(reading, 0, 1023, 0, 255);
  analogWrite(ledPin, brightness);

  Serial.print("sensor=");
  Serial.print(reading);
  Serial.print(" brightness=");
  Serial.println(brightness);
  delay(250);
}`;

const piStarterCode = `from gpiozero import LED, Button
from signal import pause

led = LED(18)
button = Button(17, pull_up=True)

button.when_pressed = led.on
button.when_released = led.off

print("Ready: press the button to turn the LED on.")
pause()`;

export function createLocalPlan(request: GenerateRequest): HardwarePlan {
  const prompt = request.prompt.toLowerCase();
  const wantsPi = request.board.toLowerCase().includes("raspberry") || prompt.includes("raspberry");
  const wantsPlant = prompt.includes("plant") || prompt.includes("soil") || prompt.includes("moisture");
  const wantsMotion = prompt.includes("motion") || prompt.includes("alarm") || prompt.includes("pir");
  const wantsServo = prompt.includes("servo") || prompt.includes("gate") || prompt.includes("lock");

  if (wantsPi) {
    return {
      title: wantsServo ? "Raspberry Pi Smart Servo Lock" : "Raspberry Pi Button Controlled LED",
      overview:
        "A Raspberry Pi project that reads a digital input, drives an output, and prints runtime status so the build can be checked before hardware testing.",
      difficulty: request.experience === "advanced" ? "Intermediate" : "Beginner",
      estimatedTime: "35-60 minutes",
      boards: ["Raspberry Pi 4 or 5", "Breadboard"],
      bom: [
        { name: "Raspberry Pi", quantity: 1, notes: "Any 40-pin model works." },
        { name: "LED", quantity: 1, notes: "Use a standard 5 mm LED." },
        { name: "330 ohm resistor", quantity: 1, notes: "Current limiting for the LED." },
        { name: "Push button", quantity: 1, notes: "Momentary tactile switch." },
        { name: "Jumper wires", quantity: 8, notes: "Male-to-female and male-to-male." }
      ],
      wiring: [
        { from: "Raspberry Pi GPIO18", to: "LED anode", signal: "LED output", wireColor: "orange", notes: "GPIO18 drives the LED." },
        { from: "LED cathode", to: "330 ohm resistor", signal: "Current limit", wireColor: "blue", notes: "Keep the resistor in series." },
        { from: "330 ohm resistor", to: "Raspberry Pi GND", signal: "Ground", wireColor: "black", notes: "Common ground return." },
        { from: "Raspberry Pi GPIO17", to: "Button leg A", signal: "Button input", wireColor: "green", notes: "Uses internal pull-up." },
        { from: "Button leg B", to: "Raspberry Pi GND", signal: "Button ground", wireColor: "black", notes: "Press pulls GPIO17 low." }
      ],
      power: "Power the Raspberry Pi from its official USB-C supply. Do not power servos or motors from the 3.3 V GPIO rail.",
      buildSteps: [
        "Place the LED and button on separate breadboard rows.",
        "Wire GPIO18 through the LED and resistor to ground.",
        "Wire GPIO17 through the button to ground.",
        "Install gpiozero if needed, then run the Python file.",
        "Press the button and confirm the LED follows the input."
      ],
      safetyChecks: [
        "Never connect 5 V directly to a GPIO input.",
        "Use a resistor in series with every bare LED.",
        "Disconnect power before moving wires."
      ],
      firmware: {
        platform: "Raspberry Pi",
        language: "Python",
        filename: "main.py",
        code: piStarterCode
      },
      testPlan: [
        "Run python main.py and confirm the ready message appears.",
        "Press the button and check the LED turns on.",
        "Release the button and check the LED turns off."
      ],
      simulator: {
        serialExpectation: ["Ready: press the button to turn the LED on.", "button=pressed led=on", "button=released led=off"],
        validationNotes: ["Python syntax should import gpiozero.", "GPIO17 is input; GPIO18 is output.", "A shared ground is required."]
      },
      circuit: {
        nodes: [
          { id: "pi", label: "Raspberry Pi", kind: "board", x: 22, y: 48 },
          { id: "button", label: "Button", kind: "sensor", x: 62, y: 30 },
          { id: "led", label: "LED", kind: "actuator", x: 72, y: 63 },
          { id: "resistor", label: "330R", kind: "passive", x: 51, y: 70 },
          { id: "gnd", label: "GND Rail", kind: "power", x: 36, y: 82 }
        ],
        links: [
          { from: "pi", to: "button", label: "GPIO17", color: "#22c55e" },
          { from: "button", to: "gnd", label: "GND", color: "#111827" },
          { from: "pi", to: "led", label: "GPIO18", color: "#f97316" },
          { from: "led", to: "resistor", label: "series", color: "#2563eb" },
          { from: "resistor", to: "gnd", label: "GND", color: "#111827" }
        ]
      }
    };
  }

  return {
    title: wantsPlant ? "Arduino Soil Moisture LED Meter" : wantsMotion ? "Arduino Motion Alarm Indicator" : "Arduino Sensor Controlled LED",
    overview:
      "An Arduino project that reads a sensor value, maps it to an LED output, and streams readings over serial for quick bench validation.",
    difficulty: request.experience === "advanced" ? "Intermediate" : "Beginner",
    estimatedTime: "25-45 minutes",
    boards: ["Arduino Uno or Nano", "Breadboard"],
    bom: [
      { name: "Arduino Uno", quantity: 1, notes: "Nano also works with equivalent pins." },
      { name: wantsPlant ? "Soil moisture sensor" : wantsMotion ? "PIR motion sensor" : "10k potentiometer", quantity: 1, notes: "Provides an analog or digital input." },
      { name: "LED", quantity: 1, notes: "Visible project output." },
      { name: "220 ohm resistor", quantity: 1, notes: "Current limiting for the LED." },
      { name: "Jumper wires", quantity: 10, notes: "Use color coding where possible." }
    ],
    wiring: [
      { from: "Arduino 5V", to: "Sensor VCC", signal: "Power", wireColor: "red", notes: "Use 5 V for Uno-compatible modules." },
      { from: "Arduino GND", to: "Sensor GND", signal: "Ground", wireColor: "black", notes: "All modules need common ground." },
      { from: "Sensor OUT", to: "Arduino A0", signal: "Sensor read", wireColor: "green", notes: "Analog input for variable readings." },
      { from: "Arduino D9", to: "LED anode", signal: "PWM output", wireColor: "orange", notes: "D9 supports PWM on Uno." },
      { from: "LED cathode", to: "220 ohm resistor", signal: "Current limit", wireColor: "blue", notes: "Keep resistor in series." },
      { from: "220 ohm resistor", to: "Arduino GND", signal: "Ground", wireColor: "black", notes: "Completes the LED circuit." }
    ],
    power: "Power from USB while prototyping. Use a separate regulated supply for motors, pumps, or high-current LED strips.",
    buildSteps: [
      "Place the sensor and LED on the breadboard.",
      "Wire sensor VCC to 5 V and sensor GND to Arduino GND.",
      "Connect sensor OUT to A0.",
      "Connect D9 to the LED anode and the LED cathode through a resistor to GND.",
      "Upload the sketch and open Serial Monitor at 9600 baud."
    ],
    safetyChecks: [
      "Check LED polarity before powering.",
      "Confirm there is a resistor in series with the LED.",
      "Do not exceed the Arduino 5 V regulator current limit."
    ],
    firmware: {
      platform: "Arduino",
      language: "C++",
      filename: "sensor_led_meter.ino",
      code: arduinoStarterCode
    },
    testPlan: [
      "Upload the sketch with Arduino IDE or arduino-cli.",
      "Open Serial Monitor at 9600 baud.",
      "Change the sensor input and confirm brightness follows the reading."
    ],
    simulator: {
      serialExpectation: ["sensor=128 brightness=31", "sensor=512 brightness=127", "sensor=900 brightness=224"],
      validationNotes: ["setup() and loop() are required.", "D9 must be configured as an output.", "A0 should be read with analogRead()."]
    },
    circuit: {
      nodes: [
        { id: "arduino", label: "Arduino Uno", kind: "board", x: 21, y: 48 },
        { id: "sensor", label: wantsPlant ? "Moisture Sensor" : wantsMotion ? "PIR Sensor" : "Potentiometer", kind: "sensor", x: 67, y: 28 },
        { id: "led", label: "LED", kind: "actuator", x: 73, y: 62 },
        { id: "resistor", label: "220R", kind: "passive", x: 53, y: 72 },
        { id: "gnd", label: "GND Rail", kind: "power", x: 36, y: 84 },
        { id: "vcc", label: "5V Rail", kind: "power", x: 39, y: 16 }
      ],
      links: [
        { from: "arduino", to: "vcc", label: "5V", color: "#dc2626" },
        { from: "vcc", to: "sensor", label: "VCC", color: "#dc2626" },
        { from: "arduino", to: "sensor", label: "A0", color: "#16a34a" },
        { from: "sensor", to: "gnd", label: "GND", color: "#111827" },
        { from: "arduino", to: "led", label: "D9 PWM", color: "#f97316" },
        { from: "led", to: "resistor", label: "series", color: "#2563eb" },
        { from: "resistor", to: "gnd", label: "GND", color: "#111827" }
      ]
    }
  };
}
