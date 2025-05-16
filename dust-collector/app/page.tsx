"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import DashboardView from "@/components/dashboard-view"
import ProcessingView from "@/components/processing-view"
import SwapView from "@/components/swap-view"
import WalletConnectButton from "@/components/wallet-connect-button"
import ThemeSwitcher from "@/components/theme-switcher"
import { ThemeProvider } from "@/components/theme-provider"

export default function Home() {
  const [activeTab, setActiveTab] = useState("collect")

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-3xl mx-auto">
          <header className="flex items-center justify-between p-5 border-b border-gray-800">
            <h1 className="text-2xl font-bold">Dust Collector</h1>
            <div className="flex items-center gap-3">
              <ThemeSwitcher />
              <WalletConnectButton />
            </div>
          </header>

          <main className="p-5">
            <Card className="bg-gray-900 border-gray-800 shadow-xl">
              <CardContent className="p-8">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold mb-2">Cross-Chain Dust Collector</h2>
                  <p className="text-base text-gray-400">
                    Collect small, unusable balances from different wallets, batch process them to reduce gas fees, and
                    transfer to Base for aggregation.
                  </p>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <div className="flex justify-center mb-10">
                    <TabsList className="flex w-full max-w-3xl justify-between bg-transparent p-0 h-auto">
                      <TabsTrigger
                        value="collect"
                        className="data-[state=active]:bg-blue-600 text-base py-3 px-6 flex-1 mx-3 first:ml-0 last:mr-0 rounded-md h-auto"
                      >
                        1. Collect Dust
                      </TabsTrigger>
                      <TabsTrigger
                        value="process"
                        className="data-[state=active]:bg-blue-600 text-base py-3 px-6 flex-1 mx-3 first:ml-0 last:mr-0 rounded-md h-auto"
                      >
                        2. Process & Transfer
                      </TabsTrigger>
                      <TabsTrigger
                        value="swap"
                        className="data-[state=active]:bg-blue-600 text-base py-3 px-6 flex-1 mx-3 first:ml-0 last:mr-0 rounded-md h-auto"
                      >
                        3. Aggregate on Base
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="collect" className="pt-2">
                    <DashboardView onContinue={() => setActiveTab("process")} />
                  </TabsContent>

                  <TabsContent value="process" className="pt-2">
                    <ProcessingView onComplete={() => setActiveTab("swap")} />
                  </TabsContent>

                  <TabsContent value="swap" className="pt-2">
                    <SwapView />
                  </TabsContent>
                </Tabs>

                <div className="mt-10 border-t border-gray-800 pt-5">
                  <h3 className="text-lg font-medium mb-3">About Dust Collection</h3>
                  <p className="text-base text-gray-400">
                    Dust refers to tiny amounts of cryptocurrency that are too small to be transacted due to network
                    fees exceeding their value. This tool helps you reclaim value from these otherwise unusable assets
                    by batching them together and moving them to Base's low-fee environment.
                  </p>
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </ThemeProvider>
  )
}
