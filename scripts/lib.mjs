import { execSync, spawn } from 'node:child_process'
import { copyFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

export const __dirname = dirname(fileURLToPath(import.meta.url))
export const root = join(__dirname, '..')
export const isWin = process.platform === 'win32'

export const paths = {
  backend: join(root, 'backend'),
  frontend: join(root, 'frontend'),
  venv: join(root, 'backend', 'venv'),
  venvPython: isWin
    ? join(root, 'backend', 'venv', 'Scripts', 'python.exe')
    : join(root, 'backend', 'venv', 'bin', 'python'),
}

export function log(section, message) {
  console.log(`[${section}] ${message}`)
}

export function run(command, cwd = root) {
  log('RUN', command)
  execSync(command, { cwd, stdio: 'inherit', shell: true, env: process.env })
}

export function getSystemPython() {
  try {
    execSync('python --version', { stdio: 'ignore', shell: true })
    return 'python'
  } catch {
    try {
      execSync('py -3 --version', { stdio: 'ignore', shell: true })
      return 'py -3'
    } catch {
      throw new Error(
        'Python 3.11+ 가 필요합니다.\n' +
        '  https://www.python.org/downloads/ 에서 설치 후 다시 npm start 를 실행하세요.',
      )
    }
  }
}

export function ensureNode() {
  try {
    execSync('node --version', { stdio: 'ignore', shell: true })
    execSync('npm --version', { stdio: 'ignore', shell: true })
  } catch {
    throw new Error(
      'Node.js 와 npm 이 필요합니다.\n' +
      '  https://nodejs.org 에서 LTS 버전을 설치 후 다시 npm start 를 실행하세요.',
    )
  }
}

export function killPort(port) {
  try {
    if (isWin) {
      const output = execSync(`netstat -ano | findstr ":${port}"`, { encoding: 'utf8', shell: true })
      const pids = new Set()
      for (const line of output.split('\n')) {
        if (!line.includes('LISTENING')) continue
        const pid = line.trim().split(/\s+/).at(-1)
        if (pid && /^\d+$/.test(pid) && pid !== '0') pids.add(pid)
      }
      for (const pid of pids) {
        try {
          execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore', shell: true })
          log('PORT', `${port} 포트 사용 프로세스(PID ${pid}) 종료`)
        } catch {
          // ignore
        }
      }
    } else {
      execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`, { stdio: 'ignore', shell: true })
    }
  } catch {
    // port not in use
  }
}

export function ensureEnvFile(examplePath, envPath, label) {
  if (!existsSync(envPath) && existsSync(examplePath)) {
    copyFileSync(examplePath, envPath)
    log(label, '.env 파일 생성 완료')
  }
}

export function spawnProcess(label, command, args, cwd, options = {}) {
  const useShell = options.shell ?? args.length === 0
  const child = spawn(command, args, {
    cwd,
    shell: useShell,
    stdio: 'inherit',
    env: process.env,
    ...options,
  })

  child.on('error', (err) => {
    console.error(`[${label}] 실행 오류:`, err.message)
  })

  return child
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function waitForUrl(url, timeoutMs = 30000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok) return true
    } catch {
      // retry
    }
    await sleep(500)
  }
  return false
}

export function openBrowser(url) {
  const cmd = isWin
    ? `start "" "${url}"`
    : process.platform === 'darwin'
      ? `open "${url}"`
      : `xdg-open "${url}"`
  try {
    spawn(cmd, { shell: true, stdio: 'ignore', detached: true })
  } catch {
    log('INFO', `브라우저를 자동으로 열 수 없습니다. 직접 접속: ${url}`)
  }
}

export function killProcessTree(child, label) {
  if (!child?.pid) return
  try {
    if (isWin) {
      execSync(`taskkill /PID ${child.pid} /T /F`, { stdio: 'ignore', shell: true })
    } else {
      child.kill('SIGTERM')
    }
  } catch {
    log(label, '프로세스 종료')
  }
}
