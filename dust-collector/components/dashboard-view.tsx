"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { RefreshCw, ArrowRight } from "lucide-react"
import WalletItem from "./wallet-item"
import DustBalanceItem from "./dust-balance-item"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"

interface DashboardViewProps {
  onContinue: () => void
}

const wallets = [
  { id: 1, name: "Ethereum Wallet", address: "0x1a2...3b4c", connected: true, type: "metamask" },
  { id: 2, name: "Solana Wallet", address: "ABCD...EFGH", connected: false, type: "solana" },
]

// Removed MATIC and AVAX from dust balances
const dustBalances = [
  { id: 1, token: "ETH", amount: "0.00021", value: 0.42, network: "Ethereum", selected: true },
  { id: 2, token: "USDT", amount: "0.54", value: 0.54, network: "Ethereum", selected: true },
  { id: 5, token: "LINK", amount: "0.028", value: 0.28, network: "Ethereum", selected: false },
]

// Removed MATIC and AVAX from chart data
const chartData = [
  { name: "ETH", value: 0.42, color: "#627EEA" },
  { name: "USDT", value: 0.54, color: "#26A17B" },
  { name: "LINK", value: 0.28, color: "#2A5ADA" },
]

// Updated colors array to match the reduced chart data
const COLORS = ["#627EEA", "#26A17B", "#2A5ADA"]

export default function DashboardView({ onContinue }: DashboardViewProps) {
  const [selectedDust, setSelectedDust] = useState(dustBalances)
  const [activeTab, setActiveTab] = useState("balances")

  const totalValue = selectedDust
    .filter((item) => item.selected)
    .reduce((sum, item) => sum + item.value, 0)
    .toFixed(2)

  return (
    <div>
      <div className="mb-8">
        <h3 className="text-xl font-medium mb-5">Connect Your Wallets</h3>
        <div className="space-y-3">
          {wallets.map((wallet) => (
            <WalletItem key={wallet.id} wallet={wallet} />
          ))}
        </div>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xl font-medium">Dust Balances</h3>
          <Button variant="ghost" size="sm" className="flex items-center gap-1 text-base">
            <RefreshCw className="h-5 w-5" />
            Refresh
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-5 mx-auto">
            <TabsTrigger value="balances" className="text-base px-6 py-2">
              Balances
            </TabsTrigger>
            <TabsTrigger value="charts" className="text-base px-6 py-2">
              Charts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="balances">
            <div className="space-y-3 mb-5">
              {selectedDust.map((dust) => (
                <DustBalanceItem
                  key={dust.id}
                  dust={dust}
                  onToggle={(id) => {
                    setSelectedDust(
                      selectedDust.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item)),
                    )
                  }}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="charts">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-5">
                  <h4 className="text-base font-medium mb-3">Dust Distribution</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`$${value}`, "Value"]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-5">
                  <h4 className="text-base font-medium mb-3">Dust Value by Token</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        margin={{
                          top: 5,
                          right: 30,
                          left: 20,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                        <XAxis dataKey="name" tick={{ fontSize: 14 }} />
                        <YAxis tick={{ fontSize: 14 }} />
                        <Tooltip formatter={(value) => [`$${value}`, "Value"]} />
                        <Bar dataKey="value" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-between p-5 bg-gray-800 rounded-lg">
          <div>
            <div className="text-base text-gray-400">Total Selected Dust Value</div>
            <div className="text-2xl font-bold">${totalValue}</div>
          </div>
          <Button onClick={onContinue} className="bg-blue-600 hover:bg-blue-700 text-base py-2 px-5">
            Continue to Processing
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-xl font-medium mb-3">Dust Settings</h3>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-5">
            <div className="mb-5">
              <label className="text-base font-medium mb-2 block">Define Dust Threshold</label>
              <div className="flex items-center gap-3">
                <input type="range" min="0.01" max="5" step="0.01" defaultValue="1" className="w-full" />
                <span className="text-base font-medium">$1.00</span>
              </div>
              <p className="text-sm text-gray-400 mt-2">Balances below this value will be considered as dust</p>
            </div>

            <div className="flex items-center space-x-3">
              <Checkbox id="auto-refresh" className="h-5 w-5" />
              <label
                htmlFor="auto-refresh"
                className="text-base font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Automatically refresh balances
              </label>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
