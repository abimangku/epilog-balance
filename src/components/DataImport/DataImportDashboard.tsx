import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ImportCOA } from './ImportCOA'
import { ImportClients } from './ImportClients'
import { ImportOpeningBalances } from './ImportOpeningBalances'
import { ImportHistory } from './ImportHistory'
import { FileUp, Users, ListTree, DollarSign } from 'lucide-react'

export function DataImportDashboard() {
  const [activeTab, setActiveTab] = useState('coa')

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Data Migration from Mekari Jurnal</h1>
        <p className="text-muted-foreground mt-2">
          Import your accounting data from Mekari Jurnal Excel/CSV files
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="coa" className="flex items-center gap-2">
            <ListTree className="h-4 w-4" />
            Chart of Accounts
          </TabsTrigger>
          <TabsTrigger value="clients" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Clients
          </TabsTrigger>
          <TabsTrigger value="opening" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Opening Balances
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <FileUp className="h-4 w-4" />
            Import History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="coa" className="mt-6">
          <ImportCOA />
        </TabsContent>

        <TabsContent value="clients" className="mt-6">
          <ImportClients />
        </TabsContent>

        <TabsContent value="opening" className="mt-6">
          <ImportOpeningBalances />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <ImportHistory />
        </TabsContent>
      </Tabs>
    </div>
  )
}
