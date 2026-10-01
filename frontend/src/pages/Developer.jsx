import React, { useState } from "react";
import { Copy, Check, Terminal, Code2, Key, Send } from "lucide-react";
import { SectionHeader } from "../components/SectionHeader";
import { Card } from "../components/Card";

export function Developer() {
  const [copiedKey, setCopiedKey] = useState(false);
  const [activeTab, setActiveTab] = useState("curl");
  const [method, setMethod] = useState("UPI");
  const [amount, setAmount] = useState(500);
  const [testResult, setTestResult] = useState(null);
  const [isSending, setIsSending] = useState(false);

  const apiKey = "sriq_demo_test_key";

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleTestRequest = async () => {
    setIsSending(true);
    try {
      const resp = await fetch("http://localhost:8000/api/v1/orchestrator/route", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          merchant_id: "merch_demo_foodapp",
          amount: Number(amount),
          currency: "INR",
          payment_rail: method,
          idempotency_key: `order_dev_${Date.now()}`
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        setTestResult(data);
      } else {
        throw new Error("Local backend offline");
      }
    } catch {
      // Offline fallback demonstration
      setTestResult({
        status: "SUCCESS",
        final_gateway: "Gateway B",
        selected_gateway: "Gateway B",
        processor_reference: "Processor: Stripe-sim",
        observed_success_rate: 98.6,
        latency_p50_ms: 198,
        trace_id: `tr_route_${Math.random().toString(36).substring(2, 8)}`,
        guardrails_evaluated: ["SLA_500MS_PASSED", "IDEMPOTENCY_LOCKED", "CAPACITY_NOMINAL"],
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsSending(false);
    }
  };

  const snippets = {
    curl: `# Local Development Endpoint
curl -X POST http://localhost:8000/api/v1/orchestrator/route \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "merchant_id": "merch_demo_foodapp",
    "amount": ${amount},
    "currency": "INR",
    "payment_rail": "${method}",
    "idempotency_key": "order_demo_${Date.now()}"
  }'`,
    node: `// Local Development Endpoint
const axios = require('axios');

const response = await axios.post('http://localhost:8000/api/v1/orchestrator/route', {
  merchant_id: 'merch_demo_foodapp',
  amount: ${amount},
  currency: 'INR',
  payment_rail: '${method}',
  idempotency_key: 'order_demo_${Date.now()}'
}, {
  headers: {
    'Authorization': 'Bearer ${apiKey}',
    'Content-Type': 'application/json'
  }
});

console.log('Routed Gateway:', response.data.final_gateway || response.data.selected_gateway);`,
    python: `# Local Development Endpoint
import requests

url = "http://localhost:8000/api/v1/orchestrator/route"
headers = {
    "Authorization": "Bearer ${apiKey}",
    "Content-Type": "application/json"
}
payload = {
    "merchant_id": "merch_demo_foodapp",
    "amount": ${amount},
    "currency": "INR",
    "payment_rail": "${method}",
    "idempotency_key": "order_demo_${Date.now()}"
}

res = requests.post(url, json=payload, headers=headers)
print("Routed:", res.json())`
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Developer / API"
        sub="Integrate SwitchRouteIQ into your merchant backend: credentials, endpoints and sandbox request/response examples."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column: API Credentials & Endpoints */}
        <div className="space-y-6">
          <Card title="API Credentials (Sandbox / Demo)">
            <div className="space-y-4 font-mono text-xs">
              <div>
                <label className="text-[10px] uppercase text-muted-foreground block mb-1">
                  Public Merchant ID (Demo)
                </label>
                <input
                  type="text"
                  readOnly
                  value="merch_demo_foodapp_in"
                  className="w-full rounded border border-border bg-input px-3 py-2 text-foreground"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase text-muted-foreground block mb-1">
                  Secret API Key (Sandbox / Demo API Key)
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    readOnly
                    value={apiKey}
                    className="w-full rounded border border-border bg-input px-3 py-2 text-foreground"
                  />
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 rounded border border-border bg-secondary px-3 py-2 text-xs text-foreground hover:bg-secondary/80"
                  >
                    {copiedKey ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedKey ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase text-muted-foreground block mb-1">
                  Webhook Event Destination (Example Endpoint)
                </label>
                <input
                  type="text"
                  defaultValue="http://localhost:8000/api/v1/webhooks/demo"
                  className="w-full rounded border border-border bg-input px-3 py-2 text-foreground"
                />
              </div>
            </div>
          </Card>

          {/* Interactive Request Tester */}
          <Card title="Interactive Endpoint Console (Test Routing)">
            <div className="space-y-3 font-mono text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase text-muted-foreground block mb-1">
                    Payment Method
                  </label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="w-full rounded border border-border bg-input px-3 py-2 text-foreground focus:outline-none"
                  >
                    <option value="UPI">UPI</option>
                    <option value="CARD">CARD</option>
                    <option value="NETBANKING">NETBANKING</option>
                    <option value="WALLET">WALLET</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase text-muted-foreground block mb-1">
                    Amount (INR)
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded border border-border bg-input px-3 py-2 text-foreground focus:outline-none"
                  />
                </div>
              </div>

              <button
                onClick={handleTestRequest}
                disabled={isSending}
                className="flex items-center justify-center gap-2 w-full rounded bg-cyan/15 border border-cyan/60 py-2.5 font-mono text-xs uppercase tracking-wider text-cyan font-bold hover:bg-cyan/25 transition-colors disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                {isSending ? "Routing Payment…" : "Test Autonomous Route POST /api/v1/orchestrator/route"}
              </button>

              {testResult && (
                <div className="mt-4">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
                    Engine Response Payload
                  </span>
                  <pre className="max-h-56 overflow-y-auto rounded bg-background p-3 text-[11px] text-success border border-border">
                    {JSON.stringify(testResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Code Snippets */}
        <div className="space-y-4">
          <Card title="Integration Code Snippets">
            <div className="flex gap-2 border-b border-border pb-3 mb-4 font-mono text-xs">
              {["curl", "node", "python"].map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`rounded px-3 py-1 uppercase font-semibold transition-colors ${
                    activeTab === t
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <pre className="overflow-x-auto rounded bg-background/90 p-4 font-mono text-xs text-cyan border border-border">
              {snippets[activeTab]}
            </pre>
          </Card>
        </div>
      </div>
    </div>
  );
}
