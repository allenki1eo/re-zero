import type { HardwarePlan } from "@/types/hardware";

export type SimulationResult = {
  score: number;
  checks: Array<{ label: string; passed: boolean }>;
  output: string[];
};

export function runSimulation(plan: HardwarePlan): SimulationResult {
  const code = plan.firmware.code;
  const isArduino = plan.firmware.platform === "Arduino" || plan.firmware.platform === "ESP32";
  const checks = isArduino
    ? [
        { label: "Includes setup()", passed: /void\s+setup\s*\(/.test(code) },
        { label: "Includes loop()", passed: /void\s+loop\s*\(/.test(code) },
        { label: "Starts serial output", passed: /Serial\.begin\s*\(/.test(code) },
        { label: "Reads an input", passed: /(analogRead|digitalRead)\s*\(/.test(code) },
        { label: "Controls an output", passed: /(digitalWrite|analogWrite)\s*\(/.test(code) },
        { label: "Wiring has common ground", passed: plan.wiring.some((wire) => wire.to.toLowerCase().includes("gnd") || wire.from.toLowerCase().includes("gnd")) }
      ]
    : [
        { label: "Imports GPIO library", passed: /(gpiozero|RPi\.GPIO|machine)/.test(code) },
        { label: "Declares an output", passed: /(LED|PWM|Pin\(.+OUT)/.test(code) },
        { label: "Declares an input or event", passed: /(Button|when_pressed|Pin\(.+IN)/.test(code) },
        { label: "Prints runtime status", passed: /print\s*\(/.test(code) },
        { label: "Keeps program alive", passed: /(pause\(\)|while\s+True|sleep)/.test(code) },
        { label: "Wiring has common ground", passed: plan.wiring.some((wire) => wire.to.toLowerCase().includes("gnd") || wire.from.toLowerCase().includes("gnd")) }
      ];

  const passed = checks.filter((check) => check.passed).length;

  return {
    score: Math.round((passed / checks.length) * 100),
    checks,
    output: plan.simulator.serialExpectation
  };
}
