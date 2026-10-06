import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="login-wrap">
        <div className="login-card">
          <div className="login-icon">⚠️</div>
          <h1>কিছু একটা সমস্যা হয়েছে</h1>
          <p className="login-sub">{String(this.state.error.message || this.state.error)}</p>
          <button className="btn btn-primary login-btn" onClick={() => window.location.reload()}>
            পেজ reload করুন
          </button>
        </div>
      </div>
    )
  }
}