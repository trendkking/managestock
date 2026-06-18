import { PageHeader } from '@/components/ui/Common'
import { Badge } from '@/components/ui/Badge'
import { DataTable, Td, Th } from '@/components/ui/StatCard'
import { useDataStore } from '@/stores/dataStore'
import { useEffect } from 'react'

const statusLabels = { upcoming: '예정', active: '진행', ended: '종료' }

export default function AdminCompetitionsPage() {
  const competitions = useDataStore((s) => s.competitions)
  const hydrateFromApi = useDataStore((s) => s.hydrateFromApi)

  useEffect(() => {
    void hydrateFromApi().catch(() => undefined)
  }, [hydrateFromApi])

  return (
    <div>
      <PageHeader title="대회 관리" description="등록된 경연 대회 목록" />

      <DataTable>
        <thead>
          <tr>
            <Th>ID</Th><Th>이름</Th><Th>기간</Th><Th>상태</Th><Th>참가자</Th><Th>최소자본</Th>
          </tr>
        </thead>
        <tbody>
          {competitions.map((c) => (
            <tr key={c.id}>
              <Td>{c.id}</Td>
              <Td className="font-medium">{c.name}</Td>
              <Td>{c.startDate} ~ {c.endDate}</Td>
              <Td>
                <Badge variant={c.status === 'active' ? 'success' : 'secondary'}>
                  {statusLabels[c.status]}
                </Badge>
              </Td>
              <Td>{c.participantCount}</Td>
              <Td>{c.minInitialCapital?.toLocaleString() ?? '-'}</Td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </div>
  )
}
