import React from 'react'

/* 어떤 화면 컴포넌트가 렌더 중 에러가 나도 앱 전체가 백지(white screen)가 되지 않도록 잡아낸다.
   잘못된 저장 데이터 등으로 한 화면이 죽어도 복구(다시 시도/홈)로 되돌릴 수 있게 한다. */
export default class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error, info) { try { console.error('[ErrorBoundary]', error, info) } catch { /* noop */ } }
  reset = () => this.setState({ error: null })
  reload = () => { try { window.location.reload() } catch { /* noop */ } }
  render() {
    if (this.state.error) {
      return (
        <div className="err-boundary">
          <div className="err-card">
            <div className="err-emoji">⚠️</div>
            <h2>화면을 표시하는 중 문제가 발생했어요</h2>
            <p>일시적인 오류이거나 저장된 데이터 형식 문제일 수 있습니다. 아래로 복구해 주세요.</p>
            <pre className="err-msg">{String(this.state.error && this.state.error.message || this.state.error)}</pre>
            <div className="err-actions">
              <button className="btn btn-primary" onClick={this.reset}>다시 시도</button>
              <button className="btn btn-ghost" onClick={this.reload}>새로고침</button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
