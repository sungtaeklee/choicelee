import React, { useEffect } from 'react'

/* 알림 패널 — 레일 벨에서 토글. 담당 배정·멘션·참조자 추가 피드.
   단일 사용자 데모라 '받은 알림'을 시간순으로 보여주고, 클릭하면 해당 티켓으로 이동. */
const ICON = { assign: '👤', mention: '@', watch: '👁', status: '🔄' }
const KIND = { assign: '담당 배정', mention: '멘션', watch: '참조자', status: '상태 변경' }

function timeAgo(ts) {
  try {
    const d = Date.now() - new Date(ts).getTime()
    const m = Math.floor(d / 60000)
    if (m < 1) return '방금'
    if (m < 60) return `${m}분 전`
    const h = Math.floor(m / 60); if (h < 24) return `${h}시간 전`
    return `${Math.floor(h / 24)}일 전`
  } catch { return '' }
}

function NotifPanel({ notifs = [], onOpen, onMarkAll, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const unread = notifs.reduce((n, x) => n + (x.read ? 0 : 1), 0)
  return (
    <div className="notif-overlay" onClick={onClose}>
      <div className="notif-pop" role="dialog" aria-label="알림" onClick={(e) => e.stopPropagation()}>
        <div className="notif-head">
          <b>알림 {unread > 0 && <span className="notif-cnt">{unread}</span>}</b>
          <div className="notif-head-act">
            {unread > 0 && <button className="notif-allread" onClick={onMarkAll}>모두 읽음</button>}
            <button className="modal-x" aria-label="닫기" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="notif-list">
          {notifs.length === 0 && <div className="notif-empty">새 알림이 없습니다.<br /><span className="muted">담당자 지정·@멘션·참조자 추가 시 여기에 표시됩니다.</span></div>}
          {notifs.map((n) => (
            <button key={n.id} className={'notif-item' + (n.read ? '' : ' unread')} onClick={() => onOpen(n)}>
              <span className={'notif-ic ni-' + n.type}>{ICON[n.type] || '•'}</span>
              <span className="notif-body">
                <span className="notif-text">{n.text}</span>
                <span className="notif-meta">{KIND[n.type] || '알림'} · {n.to ? `→ ${n.to.split(' ')[0]} ` : ''}· {timeAgo(n.ts)}</span>
              </span>
              {!n.read && <span className="notif-dot" aria-label="안 읽음" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default NotifPanel
