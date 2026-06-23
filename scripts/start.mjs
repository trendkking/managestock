import { existsSync } from 'node:fs'
import { join } from 'node:path'
import {
  killPort,
  killProcessTree,
  log,
  openBrowser,
  paths,
  run,
  sleep,
  spawnProcess,
  waitForUrl,
} from './lib.mjs'

const FRONTEND_PORT = 5173
const BACKEND_PORT = 8000
const FRONTEND_URL = `http://localhost:${FRONTEND_PORT}`
const BACKEND_URL = `http://localhost:${BACKEND_PORT}`

function getViteBin() {
  const bin = join(paths.frontend, 'node_modules', 'vite', 'bin', 'vite.js')
  if (!existsSync(bin)) {
    throw new Error('Vite 가 설치되지 않았습니다. npm start 를 다시 실행해주세요.')
  }
  return bin
}

if (!existsSync(paths.venvPython)) {
  console.error('가상환경이 없습니다. npm start 가 setup 을 자동 실행합니다.')
  process.exit(1)
}

if (!existsSync(join(paths.frontend, 'node_modules'))) {
  console.error('프론트엔드 패키지가 없습니다. npm start 가 setup 을 자동 실행합니다.')
  process.exit(1)
}

console.log('')
console.log('========================================')
console.log('  BULLSLONG - 서버 시작')
console.log(`  Frontend: ${FRONTEND_URL}`)
console.log(`  Backend:  ${BACKEND_URL}`)
console.log('========================================')
console.log('')

log('DB', 'Alembic 마이그레이션 적용 (upgrade head)...')
run(`"${paths.venvPython}" -m alembic upgrade head`, paths.backend)
log('DB', '시드 데이터 확인...')
run(`"${paths.venvPython}" -m scripts.seed`, paths.backend)

log('PORT', '기존 서버 프로세스 정리 중...')
killPort(FRONTEND_PORT)
killPort(BACKEND_PORT)
await sleep(1000)

const backend = spawnProcess(
  'Backend',
  `"${paths.venvPython}" -m uvicorn app.main:app --reload --port ${BACKEND_PORT}`,
  [],
  paths.backend,
)

// Vite 를 node 로 직접 실행 (Windows npm 래퍼 조기 종료 방지)
const frontend = spawnProcess(
  'Frontend',
  process.execPath,
  [getViteBin(), '--port', String(FRONTEND_PORT), '--strictPort'],
  paths.frontend,
  { shell: false },
)

let shuttingDown = false

const shutdown = (signal) => {
  if (shuttingDown) return
  shuttingDown = true
  console.log('')
  log('INFO', `${signal ?? '종료'} - 서버를 중지합니다...`)
  killProcessTree(backend, 'Backend')
  killProcessTree(frontend, 'Frontend')
  setTimeout(() => process.exit(0), 500)
}

process.on('SIGINT', () => shutdown('Ctrl+C'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

backend.on('exit', (code) => {
  if (!shuttingDown) {
    if (code !== 0 && code !== null) console.error(`[Backend] 비정상 종료 (code ${code})`)
    shutdown('backend-exit')
  }
})

frontend.on('exit', (code) => {
  if (!shuttingDown) {
    if (code !== 0 && code !== null) console.error(`[Frontend] 비정상 종료 (code ${code})`)
    shutdown('frontend-exit')
  }
})

;(async () => {
  log('INFO', '서버 준비 대기 중...')
  const [backendReady, frontendReady] = await Promise.all([
    waitForUrl(`${BACKEND_URL}/health`, 45000),
    waitForUrl(FRONTEND_URL, 45000),
  ])

  if (backendReady) {
    log('Backend', `준비 완료 → ${BACKEND_URL}/docs`)
  } else {
    log('Backend', '시작 확인 실패 (백엔드 로그를 확인하세요)')
  }

  if (frontendReady) {
    log('Frontend', `준비 완료 → ${FRONTEND_URL}`)
    openBrowser(FRONTEND_URL)
  } else {
    log('Frontend', '시작 확인 실패 (프론트엔드 로그를 확인하세요)')
  }

  console.log('')
  log('INFO', '실행 중입니다. 종료하려면 Ctrl+C 를 누르세요.')
  console.log('')
})()
