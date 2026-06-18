import {
  ensureEnvFile,
  ensureNode,
  getSystemPython,
  log,
  paths,
  root,
  run,
} from './lib.mjs'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

console.log('')
console.log('========================================')
console.log('  MANAGESTOCK - 환경 설정')
console.log('========================================')
console.log('')

ensureNode()

const systemPython = getSystemPython()

if (!existsSync(paths.venv)) {
  log('Backend', 'Python 가상환경 생성 중...')
  run(`${systemPython} -m venv venv`, paths.backend)
}

if (!existsSync(paths.venvPython)) {
  throw new Error('가상환경 생성에 실패했습니다. Python 설치를 확인해주세요.')
}

log('Backend', 'Python 패키지 설치 중...')
run(`"${paths.venvPython}" -m pip install --upgrade pip`, paths.backend)
run(`"${paths.venvPython}" -m pip install -r requirements.txt`, paths.backend)

ensureEnvFile(
  join(paths.backend, '.env.example'),
  join(paths.backend, '.env'),
  'Backend',
)

log('Frontend', 'npm 패키지 설치 중...')
run('npm install', paths.frontend)

ensureEnvFile(
  join(paths.frontend, '.env.example'),
  join(paths.frontend, '.env'),
  'Frontend',
)

console.log('')
console.log('✓ 모든 패키지 설치 완료')
console.log('')
