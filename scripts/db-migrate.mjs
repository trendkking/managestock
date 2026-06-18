/**
 * DB 마이그레이션 + 시드만 실행 (서버 기동 없음)
 *
 *   npm run db:migrate
 */
import { existsSync } from 'node:fs'
import { log, paths, run } from './lib.mjs'

if (!existsSync(paths.venvPython)) {
  console.error('가상환경이 없습니다. 먼저 npm run setup 을 실행하세요.')
  process.exit(1)
}

console.log('')
console.log('========================================')
console.log('  MANAGESTOCK - DB 마이그레이션')
console.log('========================================')
console.log('')

log('DB', 'Alembic upgrade head...')
run(`"${paths.venvPython}" -m alembic upgrade head`, paths.backend)

log('DB', '시드 데이터...')
run(`"${paths.venvPython}" -m scripts.seed`, paths.backend)

log('DB', '스키마 검증...')
run(`"${paths.venvPython}" -m scripts.verify_db`, paths.backend)

console.log('')
console.log('✓ 마이그레이션 완료 (backend/managestock.db)')
console.log('')
