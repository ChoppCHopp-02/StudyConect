import { useRef } from 'react';

export default function GroupDeadlines({
  group,
  user,
  deadlines,
  newDeadlineTitle,
  setNewDeadlineTitle,
  newDeadlineDueDate,
  setNewDeadlineDueDate,
  newDeadlineDesc,
  setNewDeadlineDesc,
  newDeadlineAssignee,
  setNewDeadlineAssignee,
  isSubmittingDeadline,
  editingDeadline,
  setEditingDeadline,
  editDeadlineTitle,
  setEditDeadlineTitle,
  editDeadlineDueDate,
  setEditDeadlineDueDate,
  editDeadlineDesc,
  setEditDeadlineDesc,
  editDeadlineAssignee,
  setEditDeadlineAssignee,
  openEditDeadline,
  handleUpdateDeadline,
  handleDeadlineSubmit,
  handleDeadlineDelete,
  submissions,
  showSubmitModal,
  setShowSubmitModal,
  submitNote,
  setSubmitNote,
  submitFile,
  setSubmitFile,
  isSubmitting,
  showSubmissionsFor,
  setShowSubmissionsFor,
  handleSubmitAssignment,
  handleRemindDeadline,
  remindingIds,
  membersDetails = [],
}) {
  const submitFileRef = useRef(null);
  const deadlineListRef = useRef(null);

  const isLeader = String(user?.id) === String(group?.creatorId) || String(user?.id) === String(group?.deputyId);

  const visibleDeadlines = deadlines.filter((d) => {
    if (isLeader) return true;
    if (!d.assigneeId || d.assigneeId === 'all') return true;
    return String(d.assigneeId) === String(user?.id);
  });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
      {isLeader && (
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            boxShadow: 'var(--shadow)',
          }}
        >
          <h3 style={{ marginBottom: '16px', fontSize: '18px', color: 'var(--text-primary)' }}>
            Thêm deadline mới
          </h3>
          <form onSubmit={handleDeadlineSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="grid-2col-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Deadline *</label>
                <div className="form-input-wrap">
                  <input
                    type="text"
                    className="form-input no-icon"
                    placeholder="Tên công việc cần hoàn thành"
                    value={newDeadlineTitle}
                    onChange={(e) => setNewDeadlineTitle(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Hạn chót *</label>
                <div className="form-input-wrap">
                  <input
                    type="datetime-local"
                    className="form-input no-icon"
                    value={newDeadlineDueDate}
                    min={new Date(new Date() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                    max={(() => { const d = new Date(); d.setDate(d.getDate() + 7); return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); })()}
                    onChange={(e) => setNewDeadlineDueDate(e.target.value)}
                    required
                  />
                </div>
                <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>Chỉ đặt deadline tối đa 7 ngày tới</p>
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Yêu cầu cụ thể</label>
              <textarea
                className="form-textarea"
                placeholder="Mô tả chi tiết yêu cầu, định dạng nộp bài, tiêu chí đánh giá..."
                value={newDeadlineDesc}
                onChange={(e) => setNewDeadlineDesc(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Giao cho</label>
              <div className="form-input-wrap">
                <select
                  className="form-input no-icon"
                  value={newDeadlineAssignee}
                  onChange={(e) => setNewDeadlineAssignee(e.target.value)}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="all">👥 Cả nhóm</option>
                  {group?.members.map((memberId) => {
                    const u = membersDetails.find((userObj) => String(userObj.id) === String(memberId));
                    const memberName = u ? u.fullName : memberId;
                    const memberIsLeader = String(memberId) === String(group.creatorId);
                    const memberIsDeputy = String(memberId) === String(group.deputyId);
                    const role = memberIsLeader ? ' (Trưởng nhóm)' : memberIsDeputy ? ' (Phó nhóm)' : '';
                    return (
                      <option key={memberId} value={memberId}>
                        👤 {memberName}
                        {role}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: 'max-content', alignSelf: 'flex-end', padding: '10px 24px' }}
              disabled={isSubmittingDeadline}
            >
              {isSubmittingDeadline ? 'Đang thêm...' : 'Thêm deadline'}
            </button>
          </form>
        </div>
      )}

      <div id="group-deadline-list" ref={deadlineListRef} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Danh sách Deadline ({visibleDeadlines.length})</h3>
        {visibleDeadlines.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '40px',
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
            }}
          >
            <p style={{ color: 'var(--text-muted)' }}>Chưa có deadline hay công việc nào được giao.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {visibleDeadlines.map((d) => {
              const canDelete = d.creatorId === user.id || group.creatorId === user.id;
              const dueSoon = d.dueSoon;
              const overdue = d.overdue;
              const subs = submissions[d.id] || [];
              const mySubmission = subs.find((s) => String(s.userId) === String(user.id));
              const hasSubmitted = !!mySubmission;

              return (
                <div
                  key={d.id}
                  className="deadline-file-row"
                  style={{
                    background: d.completed ? 'rgba(255,255,255,0.01)' : 'var(--bg-card)',
                    border: dueSoon
                      ? '1.5px solid var(--error)'
                      : overdue
                      ? '1.5px solid var(--text-muted)'
                      : '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    opacity: d.completed ? 0.7 : 1,
                    boxShadow: dueSoon ? '0 0 10px rgba(239, 68, 68, 0.1)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', overflow: 'hidden' }}>
                    <input
                      type="checkbox"
                      checked={hasSubmitted}
                      readOnly
                      title={overdue && !hasSubmitted ? 'Quá hạn - chưa nộp bài' : ''}
                      style={{
                        width: '20px',
                        height: '20px',
                        marginTop: '3px',
                        cursor: 'not-allowed',
                        accentColor: overdue && !hasSubmitted ? '#666' : 'var(--primary)',
                        opacity: overdue && !hasSubmitted ? 0.5 : 1,
                      }}
                    />
                    <div style={{ overflow: 'hidden' }}>
                      <h4
                        style={{
                          fontSize: '15px',
                          fontWeight: 600,
                          color: hasSubmitted ? 'var(--text-muted)' : 'var(--text-primary)',
                          margin: 0,
                          textDecoration: hasSubmitted ? 'line-through' : 'none',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {d.title}
                      </h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '4px 0 2px 0' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: d.assigneeId ? 'rgba(108,99,255,0.12)' : 'rgba(62,207,207,0.10)',
                            color: d.assigneeId ? 'var(--primary-light)' : 'var(--secondary)',
                            border: `1px solid ${
                              d.assigneeId ? 'rgba(108,99,255,0.25)' : 'rgba(62,207,207,0.25)'
                            }`,
                          }}
                        >
                          {d.assigneeId ? `👤 ${d.assigneeName || 'Cá nhân'}` : '👥 Cả nhóm'}
                        </span>
                      </div>
                      <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: 0 }}>
                        <span style={{ color: overdue ? 'var(--error)' : 'var(--text-muted)', fontWeight: overdue ? 600 : 400 }}>
                          Hạn chót: {new Date(d.dueDate).toLocaleString('vi-VN')}
                        </span>
                        {dueSoon && <span style={{ color: 'var(--error)', marginLeft: '8px', fontWeight: 700 }}>⚠️ Sắp hết hạn!</span>}
                        {overdue && !hasSubmitted && <span style={{ color: 'var(--text-muted)', marginLeft: '8px', fontWeight: 700 }}>🔒 Quá hạn</span>}
                      </p>
                      {d.description && (
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '6px 0 0 0', lineHeight: 1.4 }}>
                          {d.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                    {isLeader && !hasSubmitted && (
                      <button
                        onClick={() => handleRemindDeadline(d)}
                        disabled={remindingIds[d.id]}
                        style={{
                          background: remindingIds[d.id] ? 'rgba(255,255,255,0.05)' : 'rgba(245,158,11,0.12)',
                          border: `1.5px solid ${remindingIds[d.id] ? 'rgba(255,255,255,0.1)' : 'rgba(245,158,11,0.3)'}`,
                          color: remindingIds[d.id] ? 'var(--text-muted)' : '#f59e0b',
                          cursor: remindingIds[d.id] ? 'default' : 'pointer',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          fontSize: '13px',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {remindingIds[d.id] ? 'Đang nhắc...' : '🔔 Nhắc nhở'}
                      </button>
                    )}

                    {canDelete && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => openEditDeadline(d)}
                          style={{
                            background: 'rgba(108, 99, 255, 0.1)',
                            border: '1.5px solid rgba(108, 99, 255, 0.2)',
                            color: 'var(--primary-light)',
                            cursor: 'pointer',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            fontSize: '13px',
                            fontWeight: 600,
                          }}
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => handleDeadlineDelete(d.id)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1.5px solid rgba(239, 68, 68, 0.2)',
                            color: 'var(--error)',
                            cursor: 'pointer',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            fontSize: '13px',
                            fontWeight: 600,
                          }}
                        >
                          Xóa
                        </button>
                      </div>
                    )}

                    {(() => {
                      if (isLeader) {
                        return (
                          <button
                            onClick={() => setShowSubmissionsFor(d.id)}
                            style={{
                              background: 'rgba(62,207,207,0.12)',
                              border: '1.5px solid rgba(62,207,207,0.3)',
                              color: 'var(--secondary)',
                              cursor: 'pointer',
                              borderRadius: '8px',
                              padding: '8px 12px',
                              fontSize: '13px',
                              fontWeight: 600,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            📋 Bài nộp ({subs.length})
                          </button>
                        );
                      }
                      return (
                        <button
                          onClick={() => {
                            if (overdue && !mySubmission) return;
                            setShowSubmitModal(d.id);
                            setSubmitNote(mySubmission?.note || '');
                            setSubmitFile(null);
                          }}
                          disabled={overdue && !mySubmission}
                          title={overdue && !mySubmission ? 'Đã quá hạn, không thể nộp bài' : ''}
                          style={{
                            background: mySubmission
                              ? 'rgba(34,197,94,0.12)'
                              : overdue
                              ? 'rgba(255,255,255,0.04)'
                              : 'rgba(108,99,255,0.12)',
                            border: `1.5px solid ${
                              mySubmission
                                ? 'rgba(34,197,94,0.3)'
                                : overdue
                                ? 'rgba(255,255,255,0.1)'
                                : 'rgba(108,99,255,0.3)'
                            }`,
                            color: mySubmission ? '#22c55e' : overdue ? 'var(--text-muted)' : 'var(--primary-light)',
                            cursor: overdue && !mySubmission ? 'not-allowed' : 'pointer',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            fontSize: '13px',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            opacity: overdue && !mySubmission ? 0.5 : 1,
                          }}
                        >
                          {mySubmission ? '✅ Đã nộp' : overdue ? '🔒 Đã khóa' : '📤 Nộp bài'}
                        </button>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit deadline modal */}
      {editingDeadline && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setEditingDeadline(null)}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '28px',
              width: '100%',
              maxWidth: '480px',
              boxShadow: 'var(--shadow-lg)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: 700 }}>Sửa deadline</h3>
            <form onSubmit={handleUpdateDeadline} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Tên deadline *
                </label>
                <input
                  value={editDeadlineTitle}
                  onChange={(e) => setEditDeadlineTitle(e.target.value)}
                  placeholder="Nộp bài tập lớn"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Hạn chót *
                </label>
                <input
                  type="datetime-local"
                  value={editDeadlineDueDate}
                  onChange={(e) => setEditDeadlineDueDate(e.target.value)}
                  min={new Date(new Date() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                  max={(() => { const d = new Date(); d.setDate(d.getDate() + 7); return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); })()}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
                <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>Chỉ đặt deadline tối đa 7 ngày tới</p>
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Mô tả
                </label>
                <textarea
                  value={editDeadlineDesc}
                  onChange={(e) => setEditDeadlineDesc(e.target.value)}
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Giao cho
                </label>
                <select
                  value={editDeadlineAssignee}
                  onChange={(e) => setEditDeadlineAssignee(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="all">👥 Cả nhóm</option>
                  {group &&
                    group.members.map((memberId) => {
                      const u = membersDetails.find((userObj) => String(userObj.id) === String(memberId));
                      const memberName = u ? u.fullName : memberId;
                      const memberIsLeader = String(memberId) === String(group.creatorId);
                      const memberIsDeputy = String(memberId) === String(group.deputyId);
                      const role = memberIsLeader ? ' (Trưởng nhóm)' : memberIsDeputy ? ' (Phó nhóm)' : '';
                      return (
                        <option key={memberId} value={memberId}>
                          👤 {memberName}
                          {role}
                        </option>
                      );
                    })}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => setEditingDeadline(null)}
                  style={{
                    padding: '10px 20px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-secondary)',
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 600,
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDeadline}
                  style={{
                    padding: '10px 24px',
                    background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    color: 'white',
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 700,
                  }}
                >
                  {isSubmittingDeadline ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assignment Upload Modal */}
      {showSubmitModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSubmitModal(null);
              setSubmitFile(null);
              setSubmitNote('');
            }
          }}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '18px',
              padding: '28px',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
            }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
              📤 Nộp bài tập
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              {deadlines.find((d) => d.id === showSubmitModal)?.title}
            </p>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
                Tệp đính kèm (tuỳ chọn)
              </label>
              <div
                onClick={() => submitFileRef.current?.click()}
                style={{
                  border: '2px dashed var(--border)',
                  borderRadius: '12px',
                  padding: '20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s',
                  background: 'var(--bg-input)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                {submitFile ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>📄</span>
                    <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600 }}>
                      {submitFile.name}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSubmitFile(null);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                        fontSize: '16px',
                        lineHeight: 1,
                        padding: '0 4px',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '28px', marginBottom: '6px' }}>📁</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Nhấn để chọn tệp</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      PDF, Word, hình ảnh...
                    </div>
                  </div>
                )}
              </div>
              <input
                ref={submitFileRef}
                type="file"
                style={{ display: 'none' }}
                onChange={(e) => setSubmitFile(e.target.files[0] || null)}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
                Ghi chú
              </label>
              <textarea
                value={submitNote}
                onChange={(e) => setSubmitNote(e.target.value)}
                placeholder="Thêm ghi chú cho trưởng nhóm..."
                rows={3}
                style={{
                  width: '100%',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  setShowSubmitModal(null);
                  setSubmitFile(null);
                  setSubmitNote('');
                }}
                style={{
                  flex: 1,
                  padding: '11px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  color: 'var(--text-secondary)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: '14px',
                }}
              >
                Huỷ
              </button>
              <button
                onClick={handleSubmitAssignment}
                disabled={isSubmitting || (!submitFile && !submitNote.trim())}
                style={{
                  flex: 2,
                  padding: '11px',
                  background: !submitFile && !submitNote.trim() ? 'var(--bg-input)' : 'linear-gradient(135deg, var(--primary), #5b53e0)',
                  border: 'none',
                  borderRadius: '10px',
                  color: !submitFile && !submitNote.trim() ? 'var(--text-muted)' : 'white',
                  fontWeight: 700,
                  cursor: !submitFile && !submitNote.trim() ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  fontSize: '14px',
                  transition: 'all 0.2s',
                }}
              >
                {isSubmitting ? 'Đang nộp...' : '✅ Xác nhận nộp bài'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leader Submissions modal */}
      {showSubmissionsFor && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSubmissionsFor(null);
          }}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '18px',
              padding: '28px',
              width: '100%',
              maxWidth: '560px',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                📋 Danh sách bài nộp
              </h3>
              <button
                onClick={() => setShowSubmissionsFor(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  fontSize: '20px',
                  lineHeight: 1,
                  padding: '4px 8px',
                  borderRadius: '8px',
                }}
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              {deadlines.find((d) => d.id === showSubmissionsFor)?.title}
            </p>
            <div style={{ overflowY: 'auto', overscrollBehavior: 'contain', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(submissions[showSubmissionsFor] || []).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '36px', marginBottom: '10px' }}>📭</div>
                  <div>Chưa có thành viên nào nộp bài.</div>
                </div>
              ) : (
                (submissions[showSubmissionsFor] || []).map((s, idx) => (
                  <div
                    key={idx}
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 16px' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--primary), #5b53e0)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 700,
                            color: 'white',
                            flexShrink: 0,
                          }}
                        >
                          {s.userInitial}
                        </div>
                        <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                          {s.userName}
                        </span>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {new Date(s.submittedAt).toLocaleString('vi-VN')}
                      </span>
                    </div>
                    {s.note && (
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 6px', lineHeight: 1.5 }}>
                        {s.note}
                      </p>
                    )}
                    {s.fileName && (
                      <a
                        href={s.fileData}
                        download={s.fileName}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: 'rgba(108,99,255,0.1)',
                          border: '1px solid rgba(108,99,255,0.2)',
                          borderRadius: '8px',
                          padding: '5px 12px',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: 'var(--primary-light)',
                          textDecoration: 'none',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(108,99,255,0.18)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(108,99,255,0.1)')}
                      >
                        ⬇️ {s.fileName}
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}