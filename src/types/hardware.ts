export type Part = {
  name: string;
  quantity: number;
  notes: string;
};

export type Connection = {
  from: string;
  to: string;
  signal: string;
  wireColor: string;
  notes: string;
};

export type CircuitNode = {
  id: string;
  label: string;
  kind: "board" | "sensor" | "actuator" | "power" | "passive" | "module";
  x: number;
  y: number;
};

export type CircuitLink = {
  from: string;
  to: string;
  label: string;
  color: string;
};

export type Firmware = {
  platform: "Arduino" | "Raspberry Pi" | "ESP32" | "MicroPython";
  language: "C++" | "Python" | "MicroPython";
  filename: string;
  code: string;
};

export type HardwarePlan = {
  title: string;
  overview: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  estimatedTime: string;
  boards: string[];
  bom: Part[];
  wiring: Connection[];
  power: string;
  buildSteps: string[];
  safetyChecks: string[];
  firmware: Firmware;
  testPlan: string[];
  simulator: {
    serialExpectation: string[];
    validationNotes: string[];
  };
  circuit: {
    nodes: CircuitNode[];
    links: CircuitLink[];
  };
};

export type GenerateRequest = {
  prompt: string;
  board: string;
  experience: string;
};

export type GenerateResponse = {
  plan: HardwarePlan;
  source: "openai" | "local";
  warning?: string;
};
