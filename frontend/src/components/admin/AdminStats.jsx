// Admin Stats bar component
export default function AdminStats({ totalUsersCount, totalGroupsCount, totalAdminsCount }) {
  const stats = [
    { label: 'Người dùng',    value: totalUsersCount,  color: '#6c63ff', border: 'rgba(108,99,255,0.30)', bg: 'rgba(108,99,255,0.10)' },
    { label: 'Phòng học',     value: totalGroupsCount, color: '#3ecfcf', border: 'rgba(62,207,207,0.30)',  bg: 'rgba(62,207,207,0.10)' },
    { label: 'Quản trị viên', value: totalAdminsCount, color: '#ff6b9d', border: 'rgba(255,107,157,0.30)', bg: 'rgba(255,107,157,0.10)' },
  ];

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
      {stats.map((s) => (
        <div
          key={s.label}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            background: s.bg, border: `1px solid ${s.border}`,
            borderRadius: 20, padding: '4px 12px 4px 8px',
          }}
        >
          <span style={{
            fontSize: 14, fontWeight: 900, color: s.color,
            background: s.border.replace('0.30', '0.18'), borderRadius: 12,
            minWidth: 24, textAlign: 'center', padding: '0 4px',
          }}>
            {s.value}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
}
