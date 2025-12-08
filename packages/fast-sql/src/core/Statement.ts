/**
 * Statement
 *
 * PreparedStatementのラッパークラス。
 * sql.js互換APIを提供し、状態管理を行う。
 *
 * 状態遷移:
 * [未バインド] --bind()--> [バインド済み] --step()--> [実行中]
 *      ^                        |                      |
 *      |                        v                      v
 *      +------reset()----------[完了]<------step()----+
 *                               |
 *                               +--free()--> [解放済み]
 */

import type {
  StatementInterface,
  NativeStatement,
  BindParams,
  Row,
  RowObject
} from '../types.js'

/**
 * PreparedStatementの状態。
 */
type StatementState = 'unbound' | 'bound' | 'stepping' | 'done' | 'freed'

/**
 * PreparedStatementラッパークラス。
 */
export class Statement implements StatementInterface {
  private _state: StatementState = 'unbound'
  private _columnNames: string[] | null = null

  constructor(
    private readonly native: NativeStatement,
    public readonly sql: string
  ) {}

  /**
   * 現在の状態を取得。
   */
  get state(): StatementState {
    return this._state
  }

  /**
   * パラメータをバインドする。
   */
  bind(params?: BindParams): boolean {
    this.assertNotFreed('bind')

    const result = this.native.bind(params)
    this._state = 'bound'
    return result
  }

  /**
   * 次の結果行に進む。
   */
  step(): boolean {
    this.assertNotFreed('step')

    const hasRow = this.native.step()

    if (hasRow) {
      this._state = 'stepping'
    } else {
      this._state = 'done'
    }

    return hasRow
  }

  /**
   * 現在の行を配列形式で取得。
   */
  get(params?: BindParams): Row | undefined {
    this.assertNotFreed('get')

    if (params !== undefined) {
      this.bind(params)
    }

    if (this._state === 'unbound' || this._state === 'bound') {
      // まだstepしていない場合は自動的にstep
      if (!this.step()) {
        return undefined
      }
    }

    return this.native.get()
  }

  /**
   * 現在の行をオブジェクト形式で取得。
   */
  getAsObject(params?: BindParams): RowObject | undefined {
    this.assertNotFreed('getAsObject')

    if (params !== undefined) {
      this.bind(params)
    }

    if (this._state === 'unbound' || this._state === 'bound') {
      // まだstepしていない場合は自動的にstep
      if (!this.step()) {
        return undefined
      }
    }

    return this.native.getAsObject()
  }

  /**
   * SQLを実行（結果を返さない操作用）。
   */
  run(params?: BindParams): void {
    this.assertNotFreed('run')

    this.native.run(params)
    this._state = 'done'
  }

  /**
   * ステートメントをリセットして再利用可能にする。
   */
  reset(): void {
    this.assertNotFreed('reset')

    this.native.reset()
    this._state = 'unbound'
  }

  /**
   * ステートメントを解放する。
   */
  free(): void {
    if (this._state === 'freed') {
      return
    }

    this.native.free()
    this._state = 'freed'
  }

  /**
   * カラム名の配列を取得。
   */
  getColumnNames(): string[] {
    this.assertNotFreed('getColumnNames')

    if (this._columnNames === null) {
      this._columnNames = this.native.getColumnNames()
    }

    return this._columnNames
  }

  /**
   * 解放済みでないことを確認。
   */
  private assertNotFreed(methodName: string): void {
    if (this._state === 'freed') {
      throw new Error(`Statement is freed: cannot call ${methodName}()`)
    }
  }
}
