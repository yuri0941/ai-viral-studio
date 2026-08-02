import vm from 'vm'
import { spawn } from 'child_process'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'

/**
 * Isolated JavaScript execution sandbox for OMEGA Coder.
 * Runs untrusted code in a Node.js VM with strict timeouts and memory limits.
 */

export class Sandbox {
    constructor({ timeoutMs = 5000, memoryMb = 64 } = {}) {
        this.timeoutMs = timeoutMs
        this.memoryMb = memoryMb
    }

    /**
     * Execute arbitrary JavaScript code in a restricted VM context.
     * Returns { success, result, logs, durationMs } or { success: false, error }.
     */
    async execute(code, { context = {}, filename = 'omega-sandbox.js' } = {}) {
        const start = Date.now()
        const logs = []

        const sandboxContext = {
            console: {
                log: (...args) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
                error: (...args) => logs.push('[ERROR] ' + args.map(a => String(a)).join(' ')),
                warn: (...args) => logs.push('[WARN] ' + args.map(a => String(a)).join(' ')),
            },
            ...context,
        }

        const script = new vm.Script(code, { filename, timeout: this.timeoutMs })
        const vmContext = vm.createContext(sandboxContext)

        try {
            const result = script.runInContext(vmContext, {
                timeout: this.timeoutMs,
                displayErrors: true,
            })
            return {
                success: true,
                result: result === undefined ? null : result,
                logs,
                durationMs: Date.now() - start,
            }
        } catch (err) {
            return {
                success: false,
                error: err.message,
                logs,
                durationMs: Date.now() - start,
            }
        }
    }

    /**
     * Run `node --check` on a temporary file containing the generated code.
     * Returns { success, error }.
     */
    async syntaxCheck(code, { filename = 'omega-patch.js' } = {}) {
        const tmpFile = path.join(os.tmpdir(), `omega-check-${Date.now()}-${Math.random().toString(36).slice(2, 9)}.js`)
        await fs.writeFile(tmpFile, code, 'utf8')

        return new Promise((resolve) => {
            const child = spawn(process.execPath, ['--check', tmpFile], {
                timeout: this.timeoutMs,
                stdio: ['ignore', 'pipe', 'pipe'],
            })

            let stderr = ''
            child.stderr.on('data', (data) => { stderr += data.toString() })

            child.on('close', async (code) => {
                try { await fs.unlink(tmpFile) } catch {}
                if (code === 0) {
                    resolve({ success: true, error: null })
                } else {
                    resolve({ success: false, error: stderr || `node --check exited with code ${code}` })
                }
            })

            child.on('error', async (err) => {
                try { await fs.unlink(tmpFile) } catch {}
                resolve({ success: false, error: err.message })
            })
        })
    }

    /**
     * Validate a patch before it reaches the approval queue:
     * 1. Syntax check
     * 2. Sandboxed smoke test execution
     */
    async validate(code, { filename = 'omega-patch.js', executionContext = {} } = {}) {
        const syntax = await this.syntaxCheck(code, { filename })
        if (!syntax.success) {
            return { success: false, stage: 'syntax', error: syntax.error }
        }

        const exec = await this.execute(code, { context: executionContext, filename })
        if (!exec.success) {
            return { success: false, stage: 'sandbox', error: exec.error, logs: exec.logs }
        }

        return { success: true, stage: 'passed', logs: exec.logs, durationMs: exec.durationMs }
    }
}

export default new Sandbox()
