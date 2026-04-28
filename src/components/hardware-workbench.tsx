"use client";

import {
  Activity,
  BadgeCheck,
  Blocks,
  Bot,
  Cable,
  ChevronRight,
  CircuitBoard,
  Code2,
  Cpu,
  Gauge,
  ListChecks,
  Loader2,
  Play,
  Power,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Wrench
} from "lucide-react";
import { useMemo, useState } from "react";
import { createLocalPlan } from "@/lib/sample-plan";
import { runSimulation, type SimulationResult } from "@/lib/simulation";
import type { CircuitNode, GenerateResponse, HardwarePlan } from "@/types/hardware";
import { GabimaruChat } from "@/components/gabimaru-chat";

const defaultRequest = {
  prompt: "Build an Arduino plant watering monitor with a soil moisture sensor and status LED",
  board: "Arduino Uno",
  experience: "beginner"
};

const tabs = [
  { id: "diagram", label: "Diagram", icon: CircuitBoard },
  { id: "wiring", label: "Wiring", icon: Cable },
  { id: "code", label: "Code", icon: Code2 },
  { id: "simulate", label: "Simulation", icon: Play },
  { id: "checklist", label: "Checklist", icon: ListChecks }
] as const;

type TabId = (typeof tabs)[number]["id"];

function nodeColor(kind: CircuitNode["kind"]) {
  switch (kind) {
    case "board":
      return "#0f766e";
    case "sensor":
      return "#2563eb";
    case "actuator":
      return "#f97316";
    case "power":
      return "#dc2626";
    case "passive":
      return "#7c3aed";
    default:
      return "#475569";
  }
}

function CircuitDiagram({ plan }: { plan: HardwarePlan }) {
  const nodes = useMemo(() => new Map(plan.circuit.nodes.map((node) => [node.id, node])), [plan.circuit.nodes]);

  return (
    <div className="diagram-frame" aria-label="Circuit diagram">
      <svg viewBox="0 0 100 100" role="img">
        <defs>
          <pattern id="grid" width="5" height="5" patternUnits="userSpaceOnUse">
            <path d="M 5 0 L 0 0 0 5" fill="none" stroke="rgba(15, 23, 42, 0.08)" strokeWidth="0.35" />
          </pattern>
          <filter id="nodeShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodOpacity="0.22" />
          </filter>
        </defs>
        <rect width="100" height="100" rx="3" fill="#f8fafc" />
        <rect width="100" height="100" fill="url(#grid)" />
        <rect x="6" y="8" width="18" height="84" rx="2" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.5" />
        <rect x="76" y="8" width="18" height="84" rx="2" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.5" />
        {[13, 21, 29, 37, 45, 53, 61, 69, 77, 85].map((y) => (
          <g key={y}>
            <circle cx="11" cy={y} r="0.9" fill="#64748b" />
            <circle cx="18" cy={y} r="0.9" fill="#64748b" />
            <circle cx="82" cy={y} r="0.9" fill="#64748b" />
            <circle cx="89" cy={y} r="0.9" fill="#64748b" />
          </g>
        ))}
        {plan.circuit.links.map((link) => {
          const from = nodes.get(link.from);
          const to = nodes.get(link.to);
          if (!from || !to) {
            return null;
          }

          const midX = (from.x + to.x) / 2;
          const midY = (from.y + to.y) / 2;

          return (
            <g key={`${link.from}-${link.to}-${link.label}`}>
              <path
                d={`M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`}
                fill="none"
                stroke={link.color}
                strokeLinecap="round"
                strokeWidth="1.3"
              />
              <text x={midX} y={midY - 1.8} textAnchor="middle" className="wire-label">
                {link.label}
              </text>
            </g>
          );
        })}
        {plan.circuit.nodes.map((node) => (
          <g key={node.id} filter="url(#nodeShadow)">
            <rect
              x={node.x - (node.kind === "board" ? 10 : 7)}
              y={node.y - (node.kind === "board" ? 6 : 4)}
              width={node.kind === "board" ? 20 : 14}
              height={node.kind === "board" ? 12 : 8}
              rx="2"
              fill={nodeColor(node.kind)}
            />
            <text x={node.x} y={node.y + 1.2} textAnchor="middle" className="node-label">
              {node.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function StatusPill({ source, warning }: { source: string; warning?: string }) {
  return (
    <div className={warning ? "status-pill muted" : "status-pill"}>
      <BadgeCheck size={16} />
      <span>{source === "openai" ? "AI generated" : "Local generator"}</span>
      {warning ? <span className="status-warning">{warning}</span> : null}
    </div>
  );
}

export function HardwareWorkbench() {
  const [prompt, setPrompt] = useState(defaultRequest.prompt);
  const [board, setBoard] = useState(defaultRequest.board);
  const [experience, setExperience] = useState(defaultRequest.experience);
  const [activeTab, setActiveTab] = useState<TabId>("diagram");
  const [plan, setPlan] = useState<HardwarePlan>(() => createLocalPlan(defaultRequest));
  const [source, setSource] = useState<GenerateResponse["source"]>("local");
  const [warning, setWarning] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [simulation, setSimulation] = useState<SimulationResult>(() => runSimulation(createLocalPlan(defaultRequest)));

  async function generatePlan() {
    setIsLoading(true);
    setWarning(undefined);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, board, experience })
      });
      const data = (await response.json()) as GenerateResponse;
      setPlan(data.plan);
      setSource(data.source);
      setWarning(data.warning);
      setSimulation(runSimulation(data.plan));
      setActiveTab("diagram");
    } catch (error) {
      const fallback = createLocalPlan({ prompt, board, experience });
      setPlan(fallback);
      setSource("local");
      setWarning(error instanceof Error ? error.message : "Could not reach the generator.");
      setSimulation(runSimulation(fallback));
    } finally {
      setIsLoading(false);
    }
  }

  const firmwareLines = plan.firmware.code.split("\n").length;

  return (
    <main className="app-shell">
      <aside className="control-panel">
        <div className="brand">
          <div className="brand-mark">
            <Bot size={24} />
          </div>
          <div>
            <p className="eyebrow">Re Zero</p>
            <h1>Hardware Agent</h1>
          </div>
        </div>

        <label className="field">
          <span>Project idea</span>
          <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={7} />
        </label>

        <div className="field-grid">
          <label className="field">
            <span>Board</span>
            <select value={board} onChange={(event) => setBoard(event.target.value)}>
              <option>Arduino Uno</option>
              <option>Arduino Nano</option>
              <option>ESP32 DevKit</option>
              <option>Raspberry Pi</option>
              <option>Raspberry Pi Pico</option>
            </select>
          </label>
          <label className="field">
            <span>Experience</span>
            <select value={experience} onChange={(event) => setExperience(event.target.value)}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </label>
        </div>

        <button className="primary-action" onClick={generatePlan} disabled={isLoading}>
          {isLoading ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
          Generate build
        </button>

        <div className="prompt-bank">
          {[
            "ESP32 weather station with OLED display",
            "Raspberry Pi camera doorbell",
            "Arduino robot car with ultrasonic sensor"
          ].map((sample) => (
            <button key={sample} onClick={() => setPrompt(sample)}>
              <ChevronRight size={15} />
              {sample}
            </button>
          ))}
        </div>

        <div className="side-note">
          <ShieldCheck size={18} />
          <span>Plans avoid mains voltage and flag power limits before you build.</span>
        </div>
      </aside>

      <section className="workspace">
        <header className="workspace-header">
          <div>
            <StatusPill source={source} warning={warning} />
            <h2>{plan.title}</h2>
            <p>{plan.overview}</p>
          </div>
          <div className="quick-stats">
            <div>
              <Cpu size={18} />
              <span>{plan.boards[0]}</span>
            </div>
            <div>
              <Gauge size={18} />
              <span>{plan.difficulty}</span>
            </div>
            <div>
              <Wrench size={18} />
              <span>{plan.estimatedTime}</span>
            </div>
          </div>
        </header>

        <GabimaruChat />

        <nav className="tabs" aria-label="Project views">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} className={activeTab === tab.id ? "active" : ""} onClick={() => setActiveTab(tab.id)}>
                <Icon size={17} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="content-grid">
          {activeTab === "diagram" ? (
            <>
              <CircuitDiagram plan={plan} />
              <section className="panel">
                <div className="panel-title">
                  <Blocks size={18} />
                  <h3>Bill of materials</h3>
                </div>
                <div className="bom-list">
                  {plan.bom.map((part) => (
                    <div key={part.name} className="bom-row">
                      <strong>{part.quantity}x {part.name}</strong>
                      <span>{part.notes}</span>
                    </div>
                  ))}
                </div>
              </section>
            </>
          ) : null}

          {activeTab === "wiring" ? (
            <section className="wide-panel">
              <div className="panel-title">
                <Cable size={18} />
                <h3>Connection map</h3>
              </div>
              <div className="wire-table">
                {plan.wiring.map((wire) => (
                  <div key={`${wire.from}-${wire.to}-${wire.signal}`} className="wire-row">
                    <span className="wire-swatch" style={{ background: wire.wireColor }} />
                    <strong>{wire.from}</strong>
                    <span>{wire.to}</span>
                    <em>{wire.signal}</em>
                    <p>{wire.notes}</p>
                  </div>
                ))}
              </div>
              <div className="power-note">
                <Power size={18} />
                <span>{plan.power}</span>
              </div>
            </section>
          ) : null}

          {activeTab === "code" ? (
            <section className="wide-panel code-panel">
              <div className="panel-title split">
                <div>
                  <Code2 size={18} />
                  <h3>{plan.firmware.filename}</h3>
                </div>
                <span>{plan.firmware.platform} / {plan.firmware.language} / {firmwareLines} lines</span>
              </div>
              <pre>
                <code>{plan.firmware.code}</code>
              </pre>
            </section>
          ) : null}

          {activeTab === "simulate" ? (
            <>
              <section className="panel">
                <div className="sim-score">
                  <div>
                    <span>{simulation.score}%</span>
                    <p>bench readiness</p>
                  </div>
                  <button onClick={() => setSimulation(runSimulation(plan))}>
                    <RefreshCcw size={16} />
                    Re-run
                  </button>
                </div>
                <div className="check-list">
                  {simulation.checks.map((check) => (
                    <div key={check.label} className={check.passed ? "pass" : "fail"}>
                      <BadgeCheck size={17} />
                      <span>{check.label}</span>
                    </div>
                  ))}
                </div>
              </section>
              <section className="panel terminal">
                <div className="panel-title">
                  <Activity size={18} />
                  <h3>Serial monitor</h3>
                </div>
                {simulation.output.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </section>
            </>
          ) : null}

          {activeTab === "checklist" ? (
            <>
              <section className="panel">
                <div className="panel-title">
                  <Wrench size={18} />
                  <h3>Build steps</h3>
                </div>
                <ol className="steps">
                  {plan.buildSteps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </section>
              <section className="panel">
                <div className="panel-title">
                  <ShieldCheck size={18} />
                  <h3>Safety checks</h3>
                </div>
                <div className="check-list">
                  {plan.safetyChecks.concat(plan.testPlan).map((item) => (
                    <div key={item} className="pass">
                      <BadgeCheck size={17} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </section>
            </>
          ) : null}
        </div>
      </section>
    </main>
  );
}
